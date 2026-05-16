import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiFetch } from '@/lib/api'

const PACKAGE_BANDS = ['0-5L', '5-10L', '10-20L', '20L+'] as const
const ROUND_TYPES = ['Technical', 'HR', 'Managerial', 'Group Discussion', 'Aptitude', 'Coding', 'Other']
const BRANCHES = ['CSE', 'ECE', 'EEE', 'ME', 'Civil', 'ISE', 'AIML', 'DS', 'CY']
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i)

interface Round {
  round_type: string
  questions: string[]
  tips: string
  round_order: number
}

interface Props {
  onSuccess?: () => void
  onCancel?: () => void
}

export function PlacementReportForm({ onSuccess, onCancel }: Props) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    company: '', role: '', location: '',
    package_band: '' as typeof PACKAGE_BANDS[number] | '',
    year_of_placement: CURRENT_YEAR,
    branch: '', campus: '' as 'EC' | 'RR' | '',
    is_anonymous: false,
  })
  const [skillInput, setSkillInput] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [rounds, setRounds] = useState<Round[]>([{ round_type: 'Technical', questions: [''], tips: '', round_order: 1 }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addSkill() {
    const s = skillInput.trim()
    if (s && !skills.includes(s)) setSkills(prev => [...prev, s])
    setSkillInput('')
  }

  function updateRound(i: number, field: keyof Round, value: unknown) {
    setRounds(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }

  function addQuestion(roundIdx: number) {
    setRounds(prev => prev.map((r, i) => i === roundIdx ? { ...r, questions: [...r.questions, ''] } : r))
  }

  function updateQuestion(roundIdx: number, qIdx: number, val: string) {
    setRounds(prev => prev.map((r, i) => i === roundIdx
      ? { ...r, questions: r.questions.map((q, qi) => qi === qIdx ? val : q) }
      : r
    ))
  }

  function addRound() {
    setRounds(prev => [...prev, { round_type: 'Technical', questions: [''], tips: '', round_order: prev.length + 1 }])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await apiFetch('/api/placements', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          package_band: form.package_band || undefined,
          campus: form.campus || undefined,
          branch: form.branch || undefined,
          skills,
          rounds: rounds.map(r => ({ ...r, questions: r.questions.filter(Boolean) })),
        }),
      })
      onSuccess?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {/* Step indicator */}
      <div className="flex gap-2 text-xs">
        {['Company Info', 'Interview Rounds'].map((label, i) => (
          <span key={i} className={`px-3 py-1 rounded-full ${step === i + 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
            {label}
          </span>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="company">Company *</Label>
              <Input id="company" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="role">Role *</Label>
              <Input id="role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Package Band</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.package_band} onChange={e => setForm(f => ({ ...f, package_band: e.target.value as typeof form.package_band }))}>
                <option value="">Select band</option>
                {PACKAGE_BANDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Year</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.year_of_placement} onChange={e => setForm(f => ({ ...f, year_of_placement: parseInt(e.target.value, 10) }))}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Branch</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}>
                <option value="">Any</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Campus</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.campus} onChange={e => setForm(f => ({ ...f, campus: e.target.value as typeof form.campus }))}>
                <option value="">Any</option>
                <option value="EC">EC</option>
                <option value="RR">RR</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Skills</Label>
            <div className="flex gap-2">
              <Input placeholder="Add skill..." value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }} />
              <Button type="button" variant="outline" onClick={addSkill}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {skills.map(s => (
                <span key={s} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  {s} <button type="button" onClick={() => setSkills(p => p.filter(x => x !== s))}>×</button>
                </span>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_anonymous} onChange={e => setForm(f => ({ ...f, is_anonymous: e.target.checked }))} />
            Post anonymously
          </label>

          <Button type="button" onClick={() => { if (!form.company || !form.role) { setError('Company and role are required.'); return } setError(null); setStep(2) }}>
            Next: Interview Rounds →
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {rounds.map((round, ri) => (
            <div key={ri} className="border rounded-lg p-4 space-y-3 bg-slate-50">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm text-slate-700">Round {ri + 1}</p>
                {rounds.length > 1 && (
                  <button type="button" className="text-xs text-red-500 hover:underline" onClick={() => setRounds(p => p.filter((_, i) => i !== ri).map((r, i) => ({ ...r, round_order: i + 1 })))}>Remove</button>
                )}
              </div>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={round.round_type} onChange={e => updateRound(ri, 'round_type', e.target.value)}>
                {ROUND_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="space-y-1">
                <Label className="text-xs">Questions asked</Label>
                {round.questions.map((q, qi) => (
                  <Input key={qi} className="text-sm" placeholder={`Question ${qi + 1}...`} value={q} onChange={e => updateQuestion(ri, qi, e.target.value)} />
                ))}
                <button type="button" className="text-xs text-blue-500 hover:underline" onClick={() => addQuestion(ri)}>+ Add question</button>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tips for this round</Label>
                <textarea className="w-full border rounded-md px-3 py-2 text-sm resize-none bg-white" rows={2} value={round.tips} onChange={e => updateRound(ri, 'tips', e.target.value)} placeholder="Any advice for future candidates..." />
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addRound}>+ Add Round</Button>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>← Back</Button>
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Report'}</Button>
          </div>
        </div>
      )}
    </form>
  )
}
