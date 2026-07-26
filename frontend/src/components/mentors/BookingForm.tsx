import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { apiFetch } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'
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

interface TimeSlot {
  id: string
  date: string
  start_time: string
  end_time: string
}

interface Props {
  mentor: Mentor
  onSuccess?: () => void
  onCancel?: () => void
}

export function BookingForm({ mentor, onSuccess, onCancel }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [duration, setDuration] = useState<30 | 60 | 90>(60)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const price = Math.round((mentor.hourly_rate * duration) / 60)

  const { data: availData, isLoading: isLoadingAvail } = useQuery({
    queryKey: ['mentor-availability', mentor.user_id],
    queryFn: () => apiFetch<{ slots: TimeSlot[] }>(`/api/mentors/${mentor.user_id}/availability`).catch(() => ({ slots: [] })),
  })

  // Calculate available start times for the selected date and duration
  const availableTimes = useMemo(() => {
    if (!selectedDate || !availData?.slots) return []
    const dateStr = selectedDate.toLocaleDateString('en-CA')
    const dateSlots = availData.slots.filter(s => s.date === dateStr)
    const times: string[] = []

    for (const slot of dateSlots) {
      const start = new Date(`${dateStr}T${slot.start_time}`)
      const end = new Date(`${dateStr}T${slot.end_time}`)
      
      let current = start
      while (current.getTime() + duration * 60000 <= end.getTime()) {
        // Skip past times if the date is today
        if (current.getTime() > Date.now() + 60 * 60 * 1000) {
          const timeStr = current.toTimeString().slice(0, 5)
          if (!times.includes(timeStr)) times.push(timeStr)
        }
        current = new Date(current.getTime() + 30 * 60000)
      }
    }
    return times.sort()
  }, [selectedDate, availData, duration])

  // Deselect time if it's no longer available when duration changes
  if (selectedTime && !availableTimes.includes(selectedTime)) {
    setSelectedTime('')
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDate || !selectedTime) { setError('Please select a date and time.'); return }

    setLoading(true)
    setError(null)

    const dateStr = selectedDate.toLocaleDateString('en-CA')
    const scheduledAt = new Date(`${dateStr}T${selectedTime}`).toISOString()

    try {
      // 1. Create booking
      const { booking } = await apiFetch<{ booking: { id: string } }>(`/api/mentors/${mentor.user_id}/bookings`, {
        method: 'POST',
        body: JSON.stringify({ scheduled_at: scheduledAt, duration_minutes: duration, student_note: note }),
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
          toast({
            title: 'Booking Confirmed!',
            description: 'A confirmation email has been sent to you and the mentor.',
            variant: 'default',
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

  // Find dates that have at least one slot
  const availableDateStrings = useMemo(() => {
    return new Set(availData?.slots?.map(s => s.date) ?? [])
  }, [availData])

  return (
    <form onSubmit={handleBook} className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
      <div className="bg-[#0f0f0f] rounded-lg p-3 text-sm flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-200">{mentor.profile.display_name ?? 'Mentor'}</p>
          <p className="text-gray-500">₹{mentor.hourly_rate}/hr · {mentor.rating.toFixed(1)} ★</p>
        </div>
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
                duration === d ? 'bg-indigo-600 text-white border-indigo-600' : 'border-[#2a2a2a] bg-[#111111] hover:bg-[#1a1a1a] text-white/80'
              }`}
            >
              {d} min
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label>Select Date & Time</Label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex justify-center rounded-xl border border-[#2a2a2a] bg-[#111111] p-2">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => {
                const dateStr = date.toLocaleDateString('en-CA')
                return date < new Date(new Date().setHours(0,0,0,0)) || !availableDateStrings.has(dateStr)
              }}
              className="bg-transparent"
            />
          </div>
          
          <div className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-3">
            <h4 className="text-sm font-medium mb-3 text-white/80">Available Slots</h4>
            {!selectedDate ? (
              <p className="text-xs text-white/40 text-center py-8">Select a date to see time slots</p>
            ) : isLoadingAvail ? (
              <div className="grid grid-cols-2 gap-2">
                {[1,2,3,4].map(i => <div key={i} className="h-9 rounded animate-pulse bg-[#2a2a2a]" />)}
              </div>
            ) : availableTimes.length === 0 ? (
              <p className="text-xs text-white/40 text-center py-8">No {duration}-min slots available on this date</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                {availableTimes.map(time => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setSelectedTime(time)}
                    className={`py-2 rounded-md border text-xs font-medium transition-colors ${
                      selectedTime === time 
                        ? 'bg-indigo-600 text-white border-indigo-600' 
                        : 'border-[#2a2a2a] bg-[#1a1a1a] text-white/80 hover:bg-[#222] hover:border-[#3a3a3a]'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            )}
          </div>
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
      <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-3 flex items-center justify-between text-sm">
        <span className="text-gray-400">Total ({duration} min)</span>
        <span className="font-bold text-white text-lg">₹{price}</span>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-500/10 p-2 rounded border border-red-500/20">{error}</p>}

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="border-[#2a2a2a] bg-[#111111] hover:bg-[#1a1a1a]">Cancel</Button>
        <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700" disabled={loading || !selectedDate || !selectedTime}>
          {loading ? 'Processing...' : `Pay ₹${price}`}
        </Button>
      </div>
    </form>
  )
}
