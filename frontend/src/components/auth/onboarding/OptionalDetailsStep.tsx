import { useState } from 'react'
import { Sparkles, ChevronLeft } from 'lucide-react'

interface OptionalDetailsStepProps {
  initialData?: { bio?: string; instagram_url?: string; linkedin_url?: string }
  onComplete: (data: { bio?: string; instagram_url?: string; linkedin_url?: string }) => void
  onSkip: () => void
  onBack: () => void
  isSubmitting: boolean
}

export function OptionalDetailsStep({ initialData, onComplete, onSkip, onBack, isSubmitting }: OptionalDetailsStepProps) {
  const [bio, setBio] = useState(initialData?.bio || '')
  const [instagram, setInstagram] = useState(initialData?.instagram_url || '')
  const [linkedin, setLinkedin] = useState(initialData?.linkedin_url || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onComplete({
      bio: bio.trim() || undefined,
      instagram_url: instagram.trim() || undefined,
      linkedin_url: linkedin.trim() || undefined,
    })
  }

  const hasData = bio.trim() || instagram.trim() || linkedin.trim()

  const inputClass = 'h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-base text-white placeholder:text-slate-500 outline-none transition-all focus:border-sky-500/50 focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)]'

  return (
    <div className="rounded-2xl border border-white/8 bg-[#13131a] p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
          <Sparkles size={18} className="text-slate-300" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">Optional details</h3>
          <p className="text-xs text-slate-400">Add a few details so people can find you.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="bio" className="mb-1.5 block text-sm font-medium text-slate-300">Bio</label>
          <textarea
            id="bio"
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell us a bit about yourself…"
            rows={3}
            maxLength={200}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder:text-slate-500 outline-none transition-all focus:border-sky-500/50 focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)] resize-none"
          />
          <p className="mt-1 text-xs text-slate-600">{bio.length}/200</p>
        </div>

        <div>
          <label htmlFor="instagram" className="mb-1.5 block text-sm font-medium text-slate-300">Instagram</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">@</span>
            <input
              id="instagram"
              type="text"
              value={instagram}
              onChange={e => setInstagram(e.target.value.replace('@', ''))}
              placeholder="username"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="linkedin" className="mb-1.5 block text-sm font-medium text-slate-300">LinkedIn</label>
          <input
            id="linkedin"
            type="url"
            value={linkedin}
            onChange={e => setLinkedin(e.target.value)}
            placeholder="https://linkedin.com/in/username"
            className={inputClass}
          />
        </div>

        <div className="rounded-xl border border-white/6 bg-white/3 px-4 py-3">
          <p className="text-xs text-slate-500">You can update these anytime from profile settings.</p>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-[#0a0a0f] transition-all hover:bg-slate-100 disabled:opacity-50"
          >
            {isSubmitting ? (
              <><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0a0a0f]/30 border-t-[#0a0a0f]" />Completing setup…</>
            ) : 'Complete setup →'}
          </button>

          {!hasData && (
            <button
              type="button"
              onClick={onSkip}
              disabled={isSubmitting}
              className="flex h-12 w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-slate-300 transition-all hover:bg-white/10 disabled:opacity-50"
            >
              Skip for now
            </button>
          )}

          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="flex h-10 items-center justify-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300 disabled:opacity-50"
          >
            <ChevronLeft size={14} /> Back
          </button>
        </div>
      </form>
    </div>
  )
}
