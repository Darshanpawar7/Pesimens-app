import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'

interface Props {
  bookingId: string
  onSuccess?: () => void
}

export function RatingForm({ bookingId, onSuccess }: Props) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) { setError('Please select a rating.'); return }
    setSubmitting(true)
    setError(null)
    try {
      await apiFetch(`/api/bookings/${bookingId}/rate`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment: comment || undefined }),
      })
      setDone(true)
      onSuccess?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) return <p className="text-sm text-green-600 font-medium">Thanks for your feedback!</p>

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHovered(i + 1)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setRating(i + 1)}
            aria-label={`Rate ${i + 1} star${i > 0 ? 's' : ''}`}
            className={`text-2xl transition-colors ${
              i < (hovered || rating) ? 'text-yellow-400' : 'text-slate-200'
            }`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        className="w-full border rounded-md px-3 py-2 text-sm resize-none"
        rows={2}
        placeholder="Leave a comment (optional)..."
        value={comment}
        onChange={e => setComment(e.target.value)}
        maxLength={1000}
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

      <Button type="submit" size="sm" disabled={submitting || rating === 0}>
        {submitting ? 'Submitting...' : 'Submit Rating'}
      </Button>
    </form>
  )
}
