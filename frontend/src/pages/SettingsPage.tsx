import { useMemo, useRef, useState } from 'react'
import { useAuthStore } from '../store/auth'
import { useTheme } from '../context/useTheme'
import { useToast } from '../components/ui/use-toast'
import { apiFetch } from '../lib/api'
import { UserAvatar } from '../components/ui/avatar'
import { DetailBackButton } from '../components/common/DetailBackButton'
import { ImageLightbox } from '../components/common/ImageLightbox'
import {
  type FeedDensityPreference,
  HOME_FEED_EXPERIMENT_ID,
  getDensityPreference,
  setDensityPreference,
} from '../lib/homeFeed'
import {
  type PerformanceModePreference,
  applyPerformanceMode,
  getPerformanceModePreference,
  setPerformanceModePreference,
} from '../lib/performanceMode'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
import { DeleteAccountModal } from '../components/common/DeleteAccountModal'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

const LOOKING_FOR_OPTIONS = ['Project Partner', 'Internship', 'Full-time Referral', 'Resume Review', 'Mock Interview', 'Study Group']
const POPULAR_SKILLS = ['DSA', 'React', 'Node.js', 'Python', 'ML/AI', 'Flutter', 'Java', 'C++', 'System Design', 'DBMS', 'OS', 'CN', 'Data Analysis', 'UI/UX', 'Product Management']
const POPULAR_EXPERIENCES = ['NCC', 'NSS', 'IEEE', 'ACM', 'GDG', 'TEDx', 'Aatmatrisha', 'Hackathon Club', 'Coding Club', 'Robotics Club', 'Music Club', 'Dance Club', 'Drama Club', 'Sports Team']

function normalizeUrlOrNull(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function normalizeGithubUsername(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  // Strip full URL if pasted: https://github.com/username → username
  const match = trimmed.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]?)\/?$/i)
  if (match?.[1]) return match[1]
  // Strip leading @ if typed
  return trimmed.replace(/^@+/, '')
}

function normalizeInstagramOrNull(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  if (/^https?:\/\//i.test(trimmed)) return trimmed

  const withoutAt = trimmed.replace(/^@+/, '')
  const username = withoutAt
    .replace(/^instagram\.com\//i, '')
    .replace(/^www\.instagram\.com\//i, '')
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/\/+$/, '')

  return `https://instagram.com/${username}`
}

export default function SettingsPage() {
  const { profile, setProfile, clear } = useAuthStore()
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const [bio, setBio] = useState(profile?.bio ?? '')
  const [headline, setHeadline] = useState(profile?.headline ?? '')
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedin_url ?? '')
  const [instagramUrl, setInstagramUrl] = useState(profile?.instagram_url ?? '')
  const [githubUsername, setGithubUsername] = useState(profile?.github_username ?? '')
  const [portfolioUrl, setPortfolioUrl] = useState(profile?.portfolio_url ?? '')
  const [openToWork, setOpenToWork] = useState(profile?.open_to_work ?? false)
  const [skills, setSkills] = useState<string[]>(profile?.skills ?? [])
  const [skillInput, setSkillInput] = useState('')
  const [experiences, setExperiences] = useState<string[]>(profile?.experiences ?? [])
  const [experienceInput, setExperienceInput] = useState('')
  const [lookingFor, setLookingFor] = useState<string[]>(profile?.looking_for ?? [])
  const [feedDensityPreference, setFeedDensityPreference] = useState<FeedDensityPreference>(() => getDensityPreference())
  const [performanceModePreference, setPerformanceMode] = useState<PerformanceModePreference>(() => getPerformanceModePreference())
  const [saving, setSaving] = useState(false)
  const [isAvatarLightboxOpen, setIsAvatarLightboxOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)

  const resumeFileName = useMemo(() => {
    if (!profile?.resume_url) return null
    try {
      const url = new URL(profile.resume_url)
      return decodeURIComponent(url.pathname.split('/').pop() || 'resume.pdf')
    } catch {
      return 'resume.pdf'
    }
  }, [profile?.resume_url])

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const payload = {
        bio,
        headline: headline || null,
        linkedin_url: normalizeUrlOrNull(linkedinUrl),
        instagram_url: normalizeInstagramOrNull(instagramUrl),
        github_username: normalizeGithubUsername(githubUsername) || null,
        portfolio_url: normalizeUrlOrNull(portfolioUrl),
        skills,
        experiences,
        looking_for: lookingFor,
        open_to_work: openToWork,
      }

      const res = await apiFetch<{ profile: NonNullable<typeof profile> }>('/api/profiles/me', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      setProfile({ ...(profile ?? {}), ...res.profile } as NonNullable<typeof profile>)
      toast({ variant: 'success', title: 'Professional profile updated' })
    } catch (error) {
      toast({ variant: 'error', title: 'Failed to save profile', description: error instanceof Error ? error.message : 'Try again' })
    } finally {
      setSaving(false)
    }
  }

  const handleUploadResume = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await apiFetch<{ resume_url: string }>('/api/profiles/me/resume', { method: 'POST', body: formData })
      setProfile(profile ? { ...profile, resume_url: res.resume_url } : profile)
      toast({ variant: 'success', title: 'Resume uploaded' })
    } catch (error) {
      toast({ variant: 'error', title: 'Resume upload failed', description: error instanceof Error ? error.message : 'Try again' })
    }
  }

  const removeResume = async () => {
    try {
      const res = await apiFetch<{ profile: NonNullable<typeof profile> }>('/api/profiles/me', {
        method: 'PATCH',
        body: JSON.stringify({ resume_url: null }),
      })
      setProfile({ ...(profile ?? {}), ...res.profile } as NonNullable<typeof profile>)
      toast({ variant: 'success', title: 'Resume removed' })
    } catch {
      toast({ variant: 'error', title: 'Failed to remove resume' })
    }
  }

  const handleUploadAvatar = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await apiFetch<{ avatar_url: string }>('/api/profiles/me/avatar', { method: 'POST', body: formData })
      setProfile(profile ? { ...profile, avatar_url: res.avatar_url } : profile)
      toast({ variant: 'success', title: 'Profile photo updated' })
    } catch (error) {
      toast({ variant: 'error', title: 'Avatar upload failed', description: error instanceof Error ? error.message : 'Try again' })
    }
  }

  const removeAvatar = async () => {
    try {
      await apiFetch<{ ok: boolean }>('/api/profiles/me/avatar', { method: 'DELETE' })
      setProfile(profile ? { ...profile, avatar_url: null } : profile)
      toast({ variant: 'success', title: 'Profile photo removed' })
    } catch (error) {
      toast({ variant: 'error', title: 'Failed to remove photo', description: error instanceof Error ? error.message : 'Try again' })
    }
  }

  const updateFeedDensityPreference = (next: FeedDensityPreference) => {
    setFeedDensityPreference(next)
    setDensityPreference(next)
    toast({
      variant: 'success',
      title: 'Feed density updated',
      description: next === 'auto' ? 'Using A/B assigned density.' : `Using ${next} density.`,
    })

    void apiFetch('/api/analytics/events', {
      method: 'POST',
      body: JSON.stringify({
        event_name: 'home_feed_density_preference_changed',
        experiment_id: HOME_FEED_EXPERIMENT_ID,
        variant: next,
        properties: {
          preference: next,
        },
      }),
    }).catch(() => undefined)
  }

  const updatePerformanceModePreference = (next: PerformanceModePreference) => {
    setPerformanceMode(next)
    setPerformanceModePreference(next)
    applyPerformanceMode(next)

    const description = next === 'auto'
      ? 'Using automatic detection based on device and network.'
      : next === 'on'
        ? 'Performance-lite mode is now forced ON.'
        : 'Performance-lite mode is now forced OFF.'

    toast({
      variant: 'success',
      title: 'Performance mode updated',
      description,
    })
  }

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true)
    try {
      await apiFetch<{ ok: boolean }>('/api/profiles/me', { method: 'DELETE' })
      toast({ variant: 'success', title: 'Account deleted', description: 'Your data has been removed.' })
      await signOut()
      clear()
      navigate('/login', { replace: true })
    } catch (error) {
      toast({
        variant: 'error',
        title: 'Failed to delete account',
        description: error instanceof Error ? error.message : 'Try again later or contact support.',
      })
    } finally {
      setIsDeletingAccount(false)
      setIsDeleteModalOpen(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-3">
        <DetailBackButton fallbackTo="/profile" />
      </div>
      <h1 className="mb-6 text-2xl font-bold text-white">Settings</h1>

      <Tabs defaultValue="professional">
        <TabsList className="mb-6">
          <TabsTrigger value="professional">Professional Profile</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="contact">Reach Out</TabsTrigger>
          <TabsTrigger value="privacy">Privacy &amp; Account</TabsTrigger>
        </TabsList>

        <TabsContent value="professional" className="space-y-6">
          <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-6 space-y-5">
            <h2 className="text-base font-semibold text-white">Professional Profile</h2>

            <div className="rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-3">
              <p className="text-sm font-medium text-white">Profile Photo</p>
              <p className="mt-1 text-xs text-white/55">Shown in stories, messages, comments, and your public profile.</p>

              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (profile?.avatar_url) setIsAvatarLightboxOpen(true)
                  }}
                  className="rounded-full transition hover:opacity-90 disabled:cursor-default"
                  disabled={!profile?.avatar_url}
                  aria-label="View profile photo"
                >
                  <UserAvatar name={profile?.display_name} avatarUrl={profile?.avatar_url} size="xl" className="h-14 w-14" />
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:border-indigo-400/40"
                  >
                    {profile?.avatar_url ? 'Change Photo' : 'Upload Photo'}
                  </button>

                  {profile?.avatar_url && (
                    <button
                      type="button"
                      onClick={() => void removeAvatar()}
                      className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) void handleUploadAvatar(file)
                  }}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-200">Headline ({headline.length}/100)</label>
              <input
                value={headline}
                onChange={e => setHeadline(e.target.value.slice(0, 100))}
                placeholder="CSE @ PESU EC · ML enthusiast"
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-200">Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={e => setBio(e.target.value.slice(0, 500))}
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-200">LinkedIn URL</label>
              <input
                value={linkedinUrl}
                onChange={e => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/your-handle"
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-200">Instagram URL / Username</label>
              <input
                value={instagramUrl}
                onChange={e => setInstagramUrl(e.target.value)}
                placeholder="your-handle or https://instagram.com/your-handle"
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-200">GitHub Username</label>
              <div className="flex overflow-hidden rounded-lg border border-[#2a2a2a]">
                <span className="bg-[#111111] px-3 py-2 text-xs text-gray-400">github.com/</span>
                <input value={githubUsername} onChange={e => setGithubUsername(e.target.value)} onBlur={e => setGithubUsername(normalizeGithubUsername(e.target.value))} placeholder="your-username" className="flex-1 bg-[#0f0f0f] px-3 py-2 text-sm text-white outline-none" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-200">Portfolio URL</label>
              <input
                value={portfolioUrl}
                onChange={e => setPortfolioUrl(e.target.value)}
                placeholder="https://"
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-200">Skills</label>
              <input
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && skillInput.trim()) {
                    e.preventDefault()
                    if (!skills.includes(skillInput.trim())) setSkills(prev => [...prev, skillInput.trim()])
                    setSkillInput('')
                  }
                }}
                placeholder="Type skill and press Enter"
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {skills.map(skill => (
                  <button key={skill} type="button" onClick={() => setSkills(prev => prev.filter(s => s !== skill))} className="rounded-full border border-[#2a2a2a] bg-[#111111] px-3 py-1 text-xs text-white/85">
                    {skill} ×
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {POPULAR_SKILLS.map(skill => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => !skills.includes(skill) && setSkills(prev => [...prev, skill])}
                    className="rounded-full border border-[#2a2a2a] bg-[#151515] px-2 py-0.5 text-[11px] text-gray-300"
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-200">Experience [Clubs]</label>
              <p className="mb-2 text-xs text-white/55">Add clubs/communities you are part of (LinkedIn-style).</p>
              <input
                value={experienceInput}
                onChange={e => setExperienceInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && experienceInput.trim()) {
                    e.preventDefault()
                    if (!experiences.includes(experienceInput.trim())) setExperiences(prev => [...prev, experienceInput.trim()])
                    setExperienceInput('')
                  }
                }}
                placeholder="Type club name and press Enter"
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {experiences.map(exp => (
                  <button key={exp} type="button" onClick={() => setExperiences(prev => prev.filter(item => item !== exp))} className="rounded-full border border-[#2a2a2a] bg-[#111111] px-3 py-1 text-xs text-white/85">
                    {exp} ×
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {POPULAR_EXPERIENCES.map(exp => (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => !experiences.includes(exp) && setExperiences(prev => [...prev, exp])}
                    className="rounded-full border border-[#2a2a2a] bg-[#151515] px-2 py-0.5 text-[11px] text-gray-300"
                  >
                    {exp}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-200">Looking For</label>
              <div className="grid grid-cols-2 gap-2">
                {LOOKING_FOR_OPTIONS.map(option => (
                  <label key={option} className="flex items-center gap-2 rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={lookingFor.includes(option)}
                      onChange={e => {
                        if (e.target.checked) setLookingFor(prev => [...prev, option])
                        else setLookingFor(prev => prev.filter(item => item !== option))
                      }}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-3">
              <div>
                <p className="text-sm font-medium text-white">Open to Work</p>
                <p className="text-xs text-white/55">Show green "Open to Work" badge on your profile</p>
              </div>
              <input type="checkbox" checked={openToWork} onChange={e => setOpenToWork(e.target.checked)} />
            </label>

            <div className="rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-3">
              <p className="text-sm font-medium text-white">Resume</p>
              <p className="mt-1 text-xs text-white/55">{resumeFileName || 'No resume uploaded yet'}</p>
              <div className="mt-2 flex items-center gap-3">
                <label className="cursor-pointer rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5 text-xs font-semibold text-indigo-300">
                  Upload New Resume
                  <input type="file" accept="application/pdf" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) void handleUploadResume(file) }} />
                </label>
                {profile?.resume_url && (
                  <button type="button" onClick={() => void removeResume()} className="text-xs text-red-400 hover:text-red-300">Remove Resume</button>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 -mx-6 -mb-6 rounded-b-xl border-t border-[#2a2a2a] bg-[#1a1a1a] px-6 py-4">
              <button
                onClick={() => void handleSaveProfile()}
                disabled={saving}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60 sm:w-auto"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Theme</h2>
            <div className="grid grid-cols-3 gap-3">
              {(['dark'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`rounded-xl border-2 p-4 ${theme === t ? 'border-indigo-500 bg-indigo-500/10' : 'border-[#2a2a2a]'}`}
                >
                  <span className="text-sm capitalize text-white">{t}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-[#2a2a2a] bg-[#111111] p-4">
              <h3 className="text-sm font-semibold text-white">Home Feed Density</h3>
              <p className="mt-1 text-xs text-white/60">Choose a manual density or keep automatic A/B assignment.</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {([
                  { key: 'auto', label: 'Automatic (A/B)', description: 'Uses your experiment assignment' },
                  { key: 'compact', label: 'Compact', description: 'Tighter spacing, faster scan' },
                  { key: 'immersive', label: 'Immersive', description: 'More breathing room and context' },
                ] as const).map(option => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => updateFeedDensityPreference(option.key)}
                    className={`rounded-lg border px-3 py-2 text-left transition ${
                      feedDensityPreference === option.key
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-[#2a2a2a] bg-[#151515] hover:border-[#3a3a3a]'
                    }`}
                  >
                    <p className="text-xs font-semibold text-white">{option.label}</p>
                    <p className="mt-1 text-[11px] text-white/55">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-[#2a2a2a] bg-[#111111] p-4">
              <h3 className="text-sm font-semibold text-white">Performance Mode</h3>
              <p className="mt-1 text-xs text-white/60">Force performance-lite mode on or off, or keep automatic detection.</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {([
                  { key: 'auto', label: 'Automatic', description: 'Detect device and network quality' },
                  { key: 'on', label: 'Force Lite ON', description: 'Lower blur/shadow for smoothness' },
                  { key: 'off', label: 'Force Lite OFF', description: 'Always keep full visual effects' },
                ] as const).map(option => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => updatePerformanceModePreference(option.key)}
                    className={`rounded-lg border px-3 py-2 text-left transition ${
                      performanceModePreference === option.key
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-[#2a2a2a] bg-[#151515] hover:border-[#3a3a3a]'
                    }`}
                  >
                    <p className="text-xs font-semibold text-white">{option.label}</p>
                    <p className="mt-1 text-[11px] text-white/55">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">We&apos;re listening</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Reach out to us</h2>
            <p className="mt-1 text-sm text-white/55">Bug reports, feature ideas, feedback, or just a hello &mdash; we read everything.</p>
          </div>

          <a
            href="mailto:pesimens.app@gmail.com?subject=Feedback%20from%20PESimens"
            className="group flex items-center gap-4 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-5 transition hover:border-indigo-500/40 hover:bg-[#1e1e2e]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-xl">✉️</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Email us</p>
              <p className="mt-0.5 truncate text-sm text-indigo-300">pesimens.app@gmail.com</p>
              <p className="mt-1 text-xs text-white/40">Tap to open your mail app</p>
            </div>
            <span className="text-white/25 transition group-hover:text-white/60">→</span>
          </a>

          <a
            href="https://instagram.com/pesimens.app"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-5 transition hover:border-pink-500/40 hover:bg-[#1e1a1e]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-500/10 text-xl">📸</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Follow us on Instagram</p>
              <p className="mt-0.5 text-sm text-pink-300">@pesimens.app</p>
              <p className="mt-1 text-xs text-white/40">Updates, announcements &amp; behind the scenes</p>
            </div>
            <span className="text-white/25 transition group-hover:text-white/60">→</span>
          </a>

          <div className="rounded-xl border border-dashed border-[#2a2a2a] p-4 text-center">
            <p className="text-xs text-white/35">Response time is usually within 24&ndash;48 hours.</p>
          </div>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Privacy &amp; Data</h2>
            <p className="text-sm text-white/55">
              Manage your data and account on PESiMENs. Deleting your account is permanent
              and removes your profile, resume, social links, and academic details.
            </p>
          </div>

          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 space-y-3">
            <h2 className="text-base font-semibold text-red-300">Danger Zone</h2>
            <p className="text-sm text-white/55">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20"
            >
              Delete Account
            </button>
          </div>
        </TabsContent>
      </Tabs>

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        isDeleting={isDeletingAccount}
        onConfirm={() => void handleDeleteAccount()}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      <ImageLightbox
        isOpen={isAvatarLightboxOpen}
        src={profile?.avatar_url}
        alt="Profile"
        onClose={() => setIsAvatarLightboxOpen(false)}
      />
    </div>
  )
}
