import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { apiFetch } from '@/lib/api'
import type { Mentor } from './MentorCard'

// Razorpay types
declare global {
  interface Window {
    Razorpay: new (opts: RazorpayOptions) => { open(): void }
  }
}
interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  order_id: string
  name: string
  description: string
  handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void
  prefill?: { name?: string; email?: string }
  theme?: { color?: string }
}

const DURATIONS = [30, 60, 90] as const

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

interface Props {
  mentor: Mentor
  onSuccess?: () => void
  onCancel?: () => void
}

export function BookingForm({ mentor, onSuccess, onCancel }: Props) {
  const [scheduledAt, setScheduledAt] = useState('')
  const [duration, setDuration] = useState<30 | 60 | 90>(60)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const price = Math.round((mentor.hourly_rate * duration) / 60)

  // Minimum datetime: 1 hour from now
  const minDateTime = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)

  async function handleBook(e: React.FormEvent) {
    e.preventDefault()
    if (!scheduledAt) { setError('Please select a date and time.'); return }

    setLoading(true)
    setError(null)

    try {
      // 1. Create booking
      const { booking } = await apiFetch<{ booking: { id: string } }>(`/api/mentors/${mentor.user_id}/bookings`, {
        method: 'POST',
        body: JSON.stringify({ scheduled_at: new Date(scheduledAt).toISOString(), duration_minutes: duration, student_note: note }),
      })

      // 2. Create Razorpay order
      const order = await apiFetch<{ order_id: string; amount: number; currency: string; razorpay_key: string }>(
        '/api/payments/create-order',
        { method: 'POST', body: JSON.stringify({ booking_id: booking.id }) }
      )

      // 3. Load Razorpay SDK and open checkout
      const loaded = await loadRazorpayScript()
      if (!loaded) throw new Error('Failed to load payment SDK.')

      const rzp = new window.Razorpay({
        key: order.razorpay_key,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: 'PESU Hub',
        description: `Session with ${mentor.profile.display_name ?? 'Mentor'} (${duration} min)`,
        handler: async (response) => {
          // 4. Verify payment
          await apiFetch('/api/payments/verify', {
            method: 'POST',
            body: JSON.stringify(response),
          })
          onSuccess?.()
        },
        theme: { color: '#2563eb' },
      })
      rzp.open()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Booking failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleBook} className="space-y-4">
      <div className="bg-[#0f0f0f] rounded-lg p-3 text-sm">
        <p className="font-semibold text-gray-200">{mentor.profile.display_name ?? 'Mentor'}</p>
        <p className="text-gray-500">₹{mentor.hourly_rate}/hr · {mentor.rating.toFixed(1)} ★</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="scheduled_at">Date & Time</Label>
        <input
          id="scheduled_at"
          type="datetime-local"
          className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
          min={minDateTime}
          value={scheduledAt}
          onChange={e => setScheduledAt(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1">
        <Label>Duration</Label>
        <div className="flex gap-2">
          {DURATIONS.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={`flex-1 py-2 rounded-md border text-sm transition-colors ${
                duration === d ? 'bg-blue-600 text-white border-blue-600' : 'border-[#2a2a2a] hover:bg-[#0f0f0f]'
              }`}
            >
              {d} min
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="note">Note for mentor (optional)</Label>
        <textarea
          id="note"
          className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none resize-none"
          rows={2}
          placeholder="Topics you want to cover, questions, etc."
          value={note}
          onChange={e => setNote(e.target.value)}
          maxLength={500}
        />
      </div>

      {/* Price summary */}
      <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-3 flex justify-between text-sm">
        <span className="text-gray-400">Total ({duration} min)</span>
        <span className="font-bold text-white">₹{price}</span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? 'Processing...' : `Pay ₹${price}`}
        </Button>
      </div>
    </form>
  )
}
