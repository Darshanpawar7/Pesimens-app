import { useState } from 'react'
import { User } from 'lucide-react'

interface BasicInfoStepProps {
  initialData?: { name?: string; profilePicture?: string }
  onNext: (data: { name: string; profilePicture?: string }) => void
  isSubmitting?: boolean
  isNamePrefilled?: boolean
}

export function BasicInfoStep({ initialData, onNext, isSubmitting = false, isNamePrefilled = false }: BasicInfoStepProps) {
  const [name, setName] = useState(initialData?.name || '')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Please enter your name'); return }
    onNext({ name: name.trim() })
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[#13131a] p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]">
      {/* Step header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
          <User size={18} className="text-slate-300" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">Basic information</h3>
          <p className="text-xs text-slate-400">Start with the name you want shown on PESimens.</p>
        </div>
      </div>

      {isNamePrefilled && (
        <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-400">
          Your name was pre-filled from Google. You can change it if needed.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-300">
            Full name <span className="text-rose-400">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            placeholder="Enter your full name"
            className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-base text-white placeholder:text-slate-500 outline-none transition-all focus:border-sky-500/50 focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)]"
            autoFocus
          />
          {error && <p className="mt-1.5 text-xs text-rose-400" role="alert">{error}</p>}
        </div>

        <div className="rounded-xl border border-white/6 bg-white/3 px-4 py-3">
          <p className="text-xs text-slate-500">Your name will be visible to other students.</p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-[#0a0a0f] transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0a0a0f]/30 border-t-[#0a0a0f]" />
              Saving…
            </>
          ) : 'Continue →'}
        </button>
      </form>
    </div>
  )
}
