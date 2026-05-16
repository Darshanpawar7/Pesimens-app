import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiFetch } from '@/lib/api'

const SUBJECT_SUGGESTIONS = [
  'Data Structures', 'Algorithms', 'DBMS', 'Operating Systems',
  'Computer Networks', 'Machine Learning', 'Web Development',
  'System Design', 'Mathematics', 'Physics',
]

interface Props {
  onSuccess?: () => void
}

export function MentorApplicationForm({ onSuccess }: Props) {
  const [step, setStep] = useState(1)
  const [bio, setBio] = useState('')
  const [subjects, setSubjects] = useState<string[]>([])
  const [subjectInput, setSubjectInput] = useState('')
  const [hourlyRate, setHourlyRate] = useState(500)
  const [isAvailable, setIsAvailable] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const bioLength = bio.trim().length
  const canProceedStep1 = bioLength >= 20 && subjects.length > 0

  function addSubject(s: string) {
    const t = s.trim()
    if (t && !subjects.includes(t) && subjects.length < 10) {
      setSubjects(prev => [...prev, t])
    }
    setSubjectInput('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (subjects.length === 0) { setError('Add at least one subject.'); return }
    setSubmitting(true)
    setError(null)
    try {
      await apiFetch('/api/mentors/apply', {
        method: 'POST',
        body: JSON.stringify({ bio, subjects, hourly_rate: hourlyRate, is_available: isAvailable }),
      })
      setDone(true)
      onSuccess?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleNextStep() {
    const pendingSubject = subjectInput.trim()
    const willAddPendingSubject = pendingSubject.length > 0 && !subjects.includes(pendingSubject)
    const totalSubjects = subjects.length + (willAddPendingSubject ? 1 : 0)

    if (willAddPendingSubject) {
      addSubject(pendingSubject)
    }

    if (bio.trim().length < 20 || totalSubjects === 0) {
      setError('Please write at least 20 characters in bio and add at least one subject.')
      return
    }

    setError(null)
    setStep(2)
  }

  if (done) {
    return (
      <div className="text-center py-10 space-y-2">
        <p className="text-2xl">🎉</p>
        <p className="font-semibold text-slate-800">Application submitted!</p>
        <p className="text-sm text-slate-500">An admin will review your profile. You'll be notified once approved.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {/* Step indicator */}
      <div className="flex gap-2 text-xs text-slate-500">
        {[1, 2].map(s => (
          <span key={s} className={`px-2 py-0.5 rounded-full ${step === s ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>
            Step {s}
          </span>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="bio">About you (min 20 chars)</Label>
            <textarea
              id="bio"
              className="w-full border rounded-md px-3 py-2 text-sm resize-none"
              rows={4}
              placeholder="Tell students about your background, experience, and teaching style..."
              value={bio}
              onChange={e => {
                setBio(e.target.value)
                if (error) setError(null)
              }}
              minLength={20}
              required
            />
            <p className="text-xs text-slate-400">{bio.length}/1000</p>
            {bioLength > 0 && bioLength < 20 && (
              <p className="text-xs text-amber-500">Write at least {20 - bioLength} more characters.</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Subjects you can teach</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add subject..."
                value={subjectInput}
                onChange={e => {
                  setSubjectInput(e.target.value)
                  if (error) setError(null)
                }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubject(subjectInput) } }}
              />
              <Button type="button" variant="outline" onClick={() => addSubject(subjectInput)}>Add</Button>
            </div>
            {/* Suggestions */}
            <div className="flex flex-wrap gap-1 mt-1">
              {SUBJECT_SUGGESTIONS.filter(s => !subjects.includes(s)).slice(0, 6).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addSubject(s)}
                  className="text-xs border rounded-full px-2 py-0.5 hover:bg-slate-100 text-slate-600"
                >
                  + {s}
                </button>
              ))}
            </div>
            {subjects.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {subjects.map(s => (
                  <span key={s} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    {s}
                    <button type="button" onClick={() => setSubjects(prev => prev.filter(x => x !== s))} aria-label={`Remove ${s}`}>×</button>
                  </span>
                ))}
              </div>
            )}
            {subjects.length === 0 && (
              <p className="text-xs text-amber-500">Add at least one subject to continue.</p>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="button" onClick={handleNextStep} disabled={!canProceedStep1 && subjectInput.trim().length === 0}>
            Next →
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="rate">Hourly rate (₹100 – ₹5000)</Label>
            <div className="flex items-center gap-3">
              <Input
                id="rate"
                type="number"
                min={100}
                max={5000}
                value={hourlyRate}
                onChange={e => setHourlyRate(parseInt(e.target.value, 10))}
                className="w-32"
              />
              <span className="text-sm text-slate-500">₹/hour</span>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={isAvailable} onChange={e => setIsAvailable(e.target.checked)} />
            Available for bookings immediately after approval
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>← Back</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}
