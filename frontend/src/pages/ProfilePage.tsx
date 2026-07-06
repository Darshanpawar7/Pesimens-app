import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImageLightbox } from '@/components/common/ImageLightbox'
import { ExternalLink, Github, Globe, Instagram, Link2, Plus, Star, Trash2, Upload } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PersonSkeleton } from '@/components/ui/skeleton'
import { DetailBackButton } from '@/components/common/DetailBackButton'
import { KarmaBadge } from '@/components/common/KarmaBadge'
import { StreakBadge } from '@/components/common/StreakBadge'
import { FollowButton } from '@/components/common/FollowButton'
import { PYQCard, type PYQ } from '@/components/pyqs/PYQCard'
import { apiFetch } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { UserAvatar } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/use-toast'
import { useGitHub } from '@/hooks/useGitHub'

interface Project {
  id: string
  title: string
  description: string
  tech_stack: string[]
  github_url: string | null
  live_url: string | null
  stars: number
  is_featured: boolean
}

interface EndorsementGroup {
  skill: string
  count: number
  endorsers: Array<{
    id: string
    note: string | null
    created_at: string
    profile: { id: string; display_name: string | null; avatar_url: string | null } | null
  }>
}

interface PublicProfile {
  id: string
  display_name: string | null
  roll_no: string | null
  year: number | null
  course: string | null
  campus: 'EC' | 'RR' | null
  role: 'student' | 'mentor' | 'admin' | 'moderator' | 'suspended'
  karma: number
  current_streak: number | null
  longest_streak: number | null
  last_active_date: string | null
  bio: string | null
  avatar_url: string | null
  degree: string | null
  branch: string | null
  semester: number | null
  followers_count: number
  following_count: number
  is_following: boolean
  linkedin_url: string | null
  instagram_url: string | null
  github_username: string | null
  github_stars: number
  github_repos: number
  portfolio_url: string | null
  resume_url: string | null
  skills: string[]
  experiences: string[]
  looking_for: string[]
  headline: string | null
  open_to_work: boolean
  projects: Project[]
  endorsements: EndorsementGroup[]
}

interface FeedItem extends PYQ {
  uploader_id?: string
}

interface FeedResponse {
  items: FeedItem[]
}

interface KarmaEventItem {
  id: string
  points: number
  description: string
  created_at: string
}

const LOOKING_FOR_OPTIONS = ['Project Partner', 'Internship', 'Full-time Referral', 'Resume Review', 'Mock Interview', 'Study Group']
const SKILL_SUGGESTIONS = ['DSA', 'React', 'Node.js', 'Python', 'ML/AI', 'Flutter', 'Java', 'C++', 'System Design', 'DBMS', 'OS', 'CN', 'Data Analysis', 'UI/UX', 'Product Management']

const techColor = (tech: string) => {
  const lower = tech.toLowerCase()
  if (lower.includes('react')) return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
  if (lower.includes('node')) return 'bg-green-500/15 text-green-300 border-green-500/40'
  if (lower.includes('python')) return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40'
  if (lower.includes('ml')) return 'bg-purple-500/15 text-purple-300 border-purple-500/40'
  return 'bg-[#1a1a1a] text-gray-300 border-[#2a2a2a]'
}

function formatAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.max(1, Math.floor(diffMs / 60000))
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { id: routeProfileId } = useParams<{ id: string }>()
  const { profile, setProfile, updateAvatar } = useAuthStore()

  const viewedProfileId = routeProfileId ?? profile?.id ?? ''
  const isOwnProfile = !routeProfileId || routeProfileId === profile?.id

  const [activeTab, setActiveTab] = useState<'projects' | 'pyqs' | 'bookmarks' | 'activity'>('projects')
  const [followersModal, setFollowersModal] = useState(false)
  const [followingModal, setFollowingModal] = useState(false)
  const [addProjectOpen, setAddProjectOpen] = useState(false)
  const [avatarLightboxOpen, setAvatarLightboxOpen] = useState(false)
  const [endorseModal, setEndorseModal] = useState<{ open: boolean; skill: string } | null>(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewMessage, setReviewMessage] = useState('')
  const [reviewResumeUrl, setReviewResumeUrl] = useState('')
  const [projectForm, setProjectForm] = useState({ title: '', description: '', tech_stack: '', github_url: '', live_url: '' })

  const viewedProfileQuery = useQuery({
    queryKey: ['profile-enhanced', viewedProfileId],
    enabled: Boolean(viewedProfileId),
    queryFn: () => apiFetch<{ profile: PublicProfile }>(`/api/profiles/${viewedProfileId}`),
  })

  const followersQuery = useQuery({
    queryKey: ['profile-followers', viewedProfileId],
    enabled: followersModal,
    queryFn: () => apiFetch<{ items: Array<{ id: string; display_name: string | null; avatar_url: string | null; branch: string | null }> }>(`/api/profiles/${viewedProfileId}/followers`),
  })

  const followingQuery = useQuery({
    queryKey: ['profile-following', viewedProfileId],
    enabled: followingModal,
    queryFn: () => apiFetch<{ items: Array<{ id: string; display_name: string | null; avatar_url: string | null; branch: string | null }> }>(`/api/profiles/${viewedProfileId}/following`),
  })

  const { data: profilePyqsData } = useQuery({
    queryKey: ['profile-pyqs', viewedProfileId, isOwnProfile],
    enabled: Boolean(viewedProfileId),
    queryFn: () => apiFetch<FeedResponse>(isOwnProfile ? '/api/pyqs?limit=100&sort=recent&uploader_id=me' : `/api/pyqs?limit=100&sort=recent&uploader_id=${viewedProfileId}`),
  })

  const { data: bookmarksData } = useQuery({
    queryKey: ['profile-bookmarks'],
    enabled: isOwnProfile,
    queryFn: () => apiFetch<{ items: PYQ[] }>('/api/bookmarks'),
  })

  const { data: karmaEventsData } = useQuery({
    queryKey: ['profile-karma-events'],
    enabled: isOwnProfile,
    queryFn: () => apiFetch<{ items: KarmaEventItem[] }>('/api/profiles/me/karma-events'),
  })

  const viewEndorsementsQuery = useQuery({
    queryKey: ['endorsements-user', viewedProfileId],
    enabled: Boolean(viewedProfileId),
    queryFn: () => apiFetch<{ items: EndorsementGroup[] }>(`/api/endorsements/${viewedProfileId}`),
  })

  const viewedProfile = useMemo(() => {
    if (isOwnProfile && profile) {
      const serverProfile = viewedProfileQuery.data?.profile
      return {
        ...profile,
        ...(serverProfile ?? {}),
        is_following: false,
        projects: serverProfile?.projects ?? [],
        endorsements: viewEndorsementsQuery.data?.items ?? serverProfile?.endorsements ?? [],
      } as PublicProfile
    }
    return viewedProfileQuery.data?.profile ?? null
  }, [isOwnProfile, profile, viewedProfileQuery.data?.profile, viewEndorsementsQuery.data?.items])

  const addProjectMutation = useMutation({
    mutationFn: () => apiFetch<{ project: Project }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        title: projectForm.title,
        description: projectForm.description,
        tech_stack: projectForm.tech_stack.split(',').map(item => item.trim()).filter(Boolean),
        github_url: projectForm.github_url || undefined,
        live_url: projectForm.live_url || undefined,
      }),
    }),
    onSuccess: async () => {
      setAddProjectOpen(false)
      setProjectForm({ title: '', description: '', tech_stack: '', github_url: '', live_url: '' })
      await queryClient.invalidateQueries({ queryKey: ['profile-enhanced', viewedProfileId] })
      toast({ variant: 'success', title: 'Project added' })
    },
  })

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => apiFetch<{ ok: boolean }>(`/api/projects/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile-enhanced', viewedProfileId] })
      toast({ variant: 'success', title: 'Project removed' })
    },
  })

  const toggleProjectFeaturedMutation = useMutation({
    mutationFn: ({ id, isFeatured }: { id: string; isFeatured: boolean }) => apiFetch<{ project: Project }>(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_featured: !isFeatured }),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile-enhanced', viewedProfileId] })
    },
  })

  const endorseMutation = useMutation({
    mutationFn: (payload: { skill: string; note?: string }) => apiFetch('/api/endorsements', {
      method: 'POST',
      body: JSON.stringify({ endorsed_id: viewedProfileId, skill: payload.skill, note: payload.note }),
    }),
    onSuccess: async () => {
      setEndorseModal(null)
      await queryClient.invalidateQueries({ queryKey: ['endorsements-user', viewedProfileId] })
      await queryClient.invalidateQueries({ queryKey: ['profile-enhanced', viewedProfileId] })
      toast({ variant: 'success', title: 'Skill endorsed' })
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiFetch<{ profile: PublicProfile }>('/api/profiles/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
    onSuccess: result => {
      if (isOwnProfile && profile) setProfile({ ...profile, ...result.profile })
      void queryClient.invalidateQueries({ queryKey: ['profile-enhanced', viewedProfileId] })
      toast({ variant: 'success', title: 'Profile updated' })
    },
  })

  const reviewMutation = useMutation({
    mutationFn: () => apiFetch('/api/resume-reviews', {
      method: 'POST',
      body: JSON.stringify({ mentor_id: viewedProfileId, resume_url: reviewResumeUrl, message: reviewMessage || undefined }),
    }),
    onSuccess: () => {
      setReviewModalOpen(false)
      setReviewMessage('')
      toast({ variant: 'success', title: `Request sent to ${viewedProfile?.display_name || 'mentor'}` })
    },
  })

  async function uploadResume(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await apiFetch<{ resume_url: string }>('/api/profiles/me/resume', { method: 'POST', body: formData })
    setReviewResumeUrl(res.resume_url)
    if (profile) setProfile({ ...profile, resume_url: res.resume_url })
  }

  async function uploadAvatar(file: File) {
    const previousAvatar = profile?.avatar_url ?? null
    const preview = URL.createObjectURL(file)
    updateAvatar(preview)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await apiFetch<{ avatar_url: string }>('/api/profiles/me/avatar', { method: 'POST', body: formData })
      updateAvatar(res.avatar_url)
      toast({ variant: 'success', title: 'Profile photo updated!' })
      void queryClient.invalidateQueries({ queryKey: ['profile-enhanced', viewedProfileId] })
    } catch (error) {
      updateAvatar(previousAvatar)
      toast({ variant: 'error', title: 'Avatar upload failed', description: error instanceof Error ? error.message : 'Try again' })
    } finally {
      URL.revokeObjectURL(preview)
    }
  }

  const handleSignOut = async () => {
    if (!confirm('Are you sure you want to sign out?')) {
      return
    }

    await supabase.auth.signOut()

    useAuthStore.getState().setUser(null)
    useAuthStore.getState().setProfile(null)

    navigate('/login')
  }

  const endorsementsBySkill = viewedProfile?.endorsements ?? []
  const bookmarks = bookmarksData?.items ?? []
  const myPyqs = (profilePyqsData?.items ?? []).filter(item => !isOwnProfile || item.uploader_id === profile?.id)
  const profileDisplayName = viewedProfile?.display_name || (isOwnProfile ? profile?.email?.split('@')[0] : undefined) || 'Student'
  const githubUsername = (viewedProfileQuery.data?.profile?.github_username ?? (isOwnProfile ? profile?.github_username : null) ?? '').trim()
  const githubQuery = useGitHub(githubUsername)

  function handleViewedProfileFollowChange(nextFollowing: boolean) {
    queryClient.setQueryData<{ profile: PublicProfile } | undefined>(['profile-enhanced', viewedProfileId], current => {
      if (!current?.profile) return current

      const followerDelta = current.profile.is_following === nextFollowing ? 0 : (nextFollowing ? 1 : -1)
      return {
        profile: {
          ...current.profile,
          is_following: nextFollowing,
          followers_count: Math.max(0, current.profile.followers_count + followerDelta),
        },
      }
    })

    void queryClient.invalidateQueries({ queryKey: ['profile-followers', viewedProfileId] })
    void queryClient.invalidateQueries({ queryKey: ['profile-following', viewedProfileId] })
  }
  if (!viewedProfile) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-3 h-8 w-24 rounded-lg bg-[#2a2a2a] animate-pulse" />
      <PersonSkeleton />
      <PersonSkeleton />
      <PersonSkeleton />
    </div>
  )
}
  
  const links = {
    linkedin: viewedProfile.linkedin_url,
    instagram: viewedProfile.instagram_url,
    github: viewedProfile.github_username ? `https://github.com/${viewedProfile.github_username}` : null,
    portfolio: viewedProfile.portfolio_url,
    resume: viewedProfile.resume_url,
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#0f0f0f] px-3 pb-24 pt-4 text-white sm:px-4 sm:py-6 md:px-6">
      {!isOwnProfile && (
        <div className="mx-auto mb-4 max-w-7xl">
          <DetailBackButton fallbackTo="/people" />
        </div>
      )}
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[300px_1fr] lg:gap-6">
        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#151515] p-4 sm:p-5">
            {/* Avatar */}
            <div className="relative mx-auto w-fit">
              <button
                type="button"
                onClick={() => {
                  if (viewedProfile.avatar_url) {
                    setAvatarLightboxOpen(true)
                    return
                  }
                  if (isOwnProfile) fileInputRef.current?.click()
                }}
                className="group relative"
              >
                <UserAvatar name={viewedProfile.display_name} avatarUrl={viewedProfile.avatar_url} size="xl" className="h-20 w-20 ring-2 ring-[#2a2a2a]" />
                {isOwnProfile && (
                  <span className="absolute inset-0 grid place-items-center rounded-full bg-black/0 text-xs opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100">
                    <span className="rounded-full bg-[#1a1a1a] p-2"><Upload className="h-4 w-4" /></span>
                  </span>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={event => {
                  const file = event.target.files?.[0]
                  if (file) void uploadAvatar(file)
                }}
              />
            </div>

            {/* Name & info */}
            <h1 className="mt-3 text-center text-xl font-bold leading-tight text-white">{profileDisplayName}</h1>
            <p className="mt-1 line-clamp-2 text-center text-sm italic text-white/55">{viewedProfile.headline || viewedProfile.bio || 'Building cool things at PESU'}</p>
            <p className="mt-1.5 text-center text-xs leading-relaxed text-white/50">
              {[viewedProfile.degree, viewedProfile.branch, viewedProfile.semester ? `Sem ${viewedProfile.semester}` : null, viewedProfile.campus].filter(Boolean).join(' · ') || 'PESU Student'}
            </p>

            {/* Stats */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <button onClick={() => setActiveTab('pyqs')} className="rounded-xl bg-[#111111] px-1 py-2.5 transition hover:bg-[#1a1a1a]">
                <p className="text-[11px] text-white/50">PYQs</p>
                <p className="mt-0.5 text-base font-bold">{myPyqs.length}</p>
              </button>
              <button onClick={() => setFollowersModal(true)} className="rounded-xl bg-[#111111] px-1 py-2.5 transition hover:bg-[#1a1a1a]">
                <p className="text-[11px] text-white/50">Followers</p>
                <p className="mt-0.5 text-base font-bold">{viewedProfile.followers_count}</p>
              </button>
              <button onClick={() => setFollowingModal(true)} className="rounded-xl bg-[#111111] px-1 py-2.5 transition hover:bg-[#1a1a1a]">
                <p className="text-[11px] text-white/50">Following</p>
                <p className="mt-0.5 text-base font-bold">{viewedProfile.following_count}</p>
              </button>
            </div>

            {/* Badges */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <KarmaBadge karma={viewedProfile.karma} />
              <StreakBadge streak={viewedProfile.current_streak ?? 0} />
            </div>

            {viewedProfile.open_to_work && (
              <div className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Open to Work
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 space-y-2">
              {isOwnProfile ? (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/settings')}
                    className="w-full rounded-xl border border-[#2a2a2a] bg-[#111111] py-2.5 text-sm font-semibold transition hover:bg-[#1f1f1f]"
                  >
                    Edit Profile
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#3f3f3f] bg-transparent py-2.5 text-sm font-semibold text-red-400 transition hover:border-red-500/60 hover:bg-red-500/8"
                  >
                    🚪 Sign Out
                  </button>
                </>
              ) : (
                <>
                  <div className="flex gap-2">
                    <FollowButton userId={viewedProfile.id} initialFollowing={viewedProfile.is_following} onFollowChange={handleViewedProfileFollowChange} />
                    <button
                      type="button"
                      onClick={() => navigate(`/messages?user=${viewedProfile.id}`)}
                      className="flex-1 rounded-xl border border-[#2a2a2a] bg-[#111111] px-3 py-2.5 text-sm font-semibold transition hover:bg-[#1f1f1f]"
                    >
                      Message
                    </button>
                  </div>
                  {viewedProfile.role === 'mentor' && (
                    <button
                      type="button"
                      onClick={() => {
                        setReviewResumeUrl(profile?.resume_url ?? '')
                        setReviewModalOpen(true)
                      }}
                      className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2 text-sm font-semibold"
                    >
                      Request Resume Review
                    </button>
                  )}
                </>
              )}
            </div>

            <ImageLightbox
              isOpen={avatarLightboxOpen}
              src={viewedProfile.avatar_url}
              alt={profileDisplayName}
              onClose={() => setAvatarLightboxOpen(false)}
            />
          </div>

          <div className="rounded-2xl border border-[#2a2a2a] bg-[#151515] p-4">
            <h3 className="mb-3 text-sm font-semibold">Links</h3>            <div className="space-y-2 text-sm">
              <a href={links.linkedin || '#'} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg bg-[#111111] px-3 py-2 hover:bg-[#1a1a1a]">
                <span className="inline-flex items-center gap-2"><Link2 className="h-4 w-4 text-sky-400" />{links.linkedin ? 'linkedin.com profile' : (isOwnProfile ? 'Add LinkedIn ->' : 'Not set')}</span>
                {links.linkedin && <ExternalLink className="h-3.5 w-3.5 text-white/60" />}
              </a>
              <a href={links.instagram || '#'} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg bg-[#111111] px-3 py-2 hover:bg-[#1a1a1a]">
                <span className="inline-flex items-center gap-2"><Instagram className="h-4 w-4 text-pink-300" />{links.instagram ? 'instagram profile' : (isOwnProfile ? 'Add Instagram ->' : 'Not set')}</span>
                {links.instagram && <ExternalLink className="h-3.5 w-3.5 text-white/60" />}
              </a>
              <a href={links.github || '#'} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg bg-[#111111] px-3 py-2 hover:bg-[#1a1a1a]">
                <span className="inline-flex items-center gap-2"><Github className="h-4 w-4" />{viewedProfile.github_username ? `@${viewedProfile.github_username}` : (isOwnProfile ? 'Add GitHub ->' : 'Not set')}</span>
                {viewedProfile.github_username && (
                  <span className="text-xs text-amber-300">
                    {githubQuery.data?.profile.public_repos ?? viewedProfile.github_repos} repos
                  </span>
                )}
              </a>
              <a href={links.portfolio || '#'} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg bg-[#111111] px-3 py-2 hover:bg-[#1a1a1a]">
                <span className="inline-flex items-center gap-2"><Globe className="h-4 w-4" />{links.portfolio ? new URL(links.portfolio).hostname : (isOwnProfile ? 'Add Portfolio ->' : 'Not set')}</span>
                {links.portfolio && <ExternalLink className="h-3.5 w-3.5 text-white/60" />}
              </a>
              <div className="flex items-center justify-between rounded-lg bg-[#111111] px-3 py-2">
                <span>{links.resume ? 'View Resume PDF' : (isOwnProfile ? 'Upload resume' : 'No resume')}</span>
                <div className="flex gap-2">
                  {links.resume && <a href={links.resume} target="_blank" rel="noreferrer" className="text-indigo-300 hover:text-indigo-200">Open</a>}
                  {isOwnProfile && (
                    <label className="cursor-pointer text-indigo-300 hover:text-indigo-200">
                      Update
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={event => {
                          const file = event.target.files?.[0]
                          if (file) void uploadResume(file)
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#2a2a2a] bg-[#151515] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Skills</h3>
              {isOwnProfile && (
                <button
                  type="button"
                  onClick={() => updateProfileMutation.mutate({ skills: Array.from(new Set([...(viewedProfile.skills ?? []), SKILL_SUGGESTIONS[(viewedProfile.skills?.length ?? 0) % SKILL_SUGGESTIONS.length]])) })}
                  className="text-xs text-indigo-300 hover:text-indigo-200"
                >
                  Add Skills
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {(viewedProfile.skills ?? []).map(skill => {
                const count = endorsementsBySkill.find(item => item.skill === skill)?.count ?? 0
                return (
                  <button
                    key={skill}
                    type="button"
                    disabled={isOwnProfile}
                    onClick={() => setEndorseModal({ open: true, skill })}
                    className="rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1 text-xs text-white/90 disabled:cursor-default"
                  >
                    {skill} {count > 0 ? `⭐${count}` : ''}
                  </button>
                )
              })}
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-white/60">Endorsed by</p>
              <div className="mt-2 space-y-2">
                {endorsementsBySkill.slice(0, 3).map(group => (
                  <div key={group.skill} className="rounded-lg bg-[#111111] px-2 py-2">
                    <p className="text-xs text-white/70">{group.skill} · {group.count}</p>
                    <div className="mt-1 flex -space-x-2">
                      {group.endorsers.slice(0, 3).map(endorser => (
                        <UserAvatar
                          key={`${group.skill}-${endorser.id}`}
                          size="xs"
                          name={endorser.profile?.display_name}
                          avatarUrl={endorser.profile?.avatar_url}
                          className="ring-2 ring-[#111111]"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#2a2a2a] bg-[#151515] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Live GitHub Snapshot</h3>
              {viewedProfile.github_username && (
                <a
                  href={`https://github.com/${viewedProfile.github_username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-300 hover:text-indigo-200"
                >
                  Open
                </a>
              )}
            </div>

            {!viewedProfile.github_username && (
              <p className="text-xs text-white/55">{isOwnProfile ? 'Add your GitHub username in Settings to enable live repo cards.' : 'GitHub username not set.'}</p>
            )}

            {viewedProfile.github_username && githubQuery.isLoading && (
              <p className="text-xs text-white/55">Fetching latest GitHub data...</p>
            )}

            {viewedProfile.github_username && githubQuery.error && (
              <p className="text-xs text-amber-300">Unable to fetch live GitHub data right now.</p>
            )}

            {viewedProfile.github_username && githubQuery.data && (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-[#111111] px-2 py-2">
                    <p className="text-[11px] text-white/50">Repos</p>
                    <p className="text-sm font-bold">{githubQuery.data.profile.public_repos}</p>
                  </div>
                  <div className="rounded-lg bg-[#111111] px-2 py-2">
                    <p className="text-[11px] text-white/50">Followers</p>
                    <p className="text-sm font-bold">{githubQuery.data.profile.followers}</p>
                  </div>
                  <div className="rounded-lg bg-[#111111] px-2 py-2">
                    <p className="text-[11px] text-white/50">Top-10 Stars</p>
                    <p className="text-sm font-bold">{githubQuery.data.repos.reduce((sum, repo) => sum + repo.stargazers_count, 0)}</p>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {githubQuery.data.repos.slice(0, 3).map(repo => (
                    <a
                      key={repo.html_url}
                      href={repo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-lg bg-[#111111] px-3 py-2 hover:bg-[#1a1a1a]"
                    >
                      <p className="line-clamp-1 text-xs font-semibold text-white">{repo.name}</p>
                      <p className="mt-0.5 text-[11px] text-white/55">★ {repo.stargazers_count} · {repo.language || 'N/A'} · {formatAgo(repo.pushed_at)}</p>
                    </a>
                  ))}

                  {githubQuery.data.repos.length === 0 && (
                    <p className="text-xs text-white/55">No recent public repositories found.</p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-[#2a2a2a] bg-[#151515] p-4">
            <h3 className="mb-2 text-sm font-semibold">Experience [Clubs]</h3>
            <div className="flex flex-wrap gap-2">
              {(viewedProfile.experiences ?? []).length > 0 ? (
                (viewedProfile.experiences ?? []).map(exp => (
                  <span key={exp} className="rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1 text-xs text-white/90">
                    {exp}
                  </span>
                ))
              ) : (
                <p className="text-xs text-white/55">{isOwnProfile ? 'Add clubs in Settings -> Professional Profile.' : 'No experience added yet.'}</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#2a2a2a] bg-[#151515] p-4">
            <h3 className="mb-2 text-sm font-semibold">Looking For</h3>
            <div className="flex flex-wrap gap-2">
              {LOOKING_FOR_OPTIONS.map(option => {
                const selected = (viewedProfile.looking_for ?? []).includes(option)
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={!isOwnProfile}
                    onClick={() => {
                      if (!isOwnProfile) return
                      const base = viewedProfile.looking_for ?? []
                      const next = selected ? base.filter(item => item !== option) : [...base, option]
                      updateProfileMutation.mutate({ looking_for: next })
                    }}
                    className={`rounded-full border px-3 py-1 text-xs ${selected ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-200' : 'border-[#2a2a2a] bg-[#1a1a1a] text-gray-300'}`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        <section className="min-w-0 rounded-2xl border border-[#2a2a2a] bg-[#151515] p-3 sm:p-4">
          <Tabs defaultValue="projects" value={activeTab} onValueChange={value => setActiveTab(value as typeof activeTab)}>
            <TabsList className="mb-4 w-full overflow-x-auto bg-[#1b1b2a]">
              <TabsTrigger value="projects" className="flex-1">Projects</TabsTrigger>
              <TabsTrigger value="pyqs" className="flex-1">PYQs</TabsTrigger>
              {isOwnProfile && <TabsTrigger value="bookmarks" className="flex-1">Bookmarks</TabsTrigger>}
              {isOwnProfile && <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>}
            </TabsList>

            <TabsContent value="projects">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {(viewedProfile.projects ?? []).map(project => (
                  <div key={project.id} className="group relative rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 transition hover:-translate-y-0.5 hover:border-indigo-500/45">
                    {project.is_featured && <span className="absolute right-3 top-3 text-amber-300">⭐</span>}
                    <div className="mb-2 flex flex-wrap gap-1">
                      {project.tech_stack.slice(0, 4).map(tech => (
                        <span key={tech} className={`rounded-full border px-2 py-0.5 text-[11px] ${techColor(tech)}`}>{tech}</span>
                      ))}
                    </div>
                    <h3 className="text-base font-semibold text-white">{project.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-white/60">{project.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-white/70">
                        {project.github_url && <a href={project.github_url} target="_blank" rel="noreferrer"><Github className="h-4 w-4" /></a>}
                        {project.live_url && <a href={project.live_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>}
                        <span className="inline-flex items-center gap-1 text-xs"><Star className="h-3.5 w-3.5" />{project.stars}</span>
                      </div>
                      {isOwnProfile && (
                        <div className="invisible flex items-center gap-2 group-hover:visible">
                          <button 
                            type="button" 
                            onClick={() => toggleProjectFeaturedMutation.mutate({ id: project.id, isFeatured: project.is_featured })}
                            disabled={toggleProjectFeaturedMutation.isPending}
                            className={toggleProjectFeaturedMutation.isPending ? 'opacity-50 cursor-wait' : ''}
                          >
                            <Star className="h-4 w-4 text-amber-300" />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => deleteProjectMutation.mutate(project.id)}
                            disabled={deleteProjectMutation.isPending}
                            className={deleteProjectMutation.isPending ? 'opacity-50 cursor-wait' : ''}
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => setAddProjectOpen(true)}
                    className="grid min-h-[170px] place-items-center rounded-xl border border-dashed border-indigo-500/45 bg-indigo-500/8 text-indigo-200 hover:bg-indigo-500/12"
                  >
                    <span className="inline-flex items-center gap-2 text-sm font-semibold"><Plus className="h-4 w-4" />Add Project</span>
                  </button>
                )}
              </div>
            </TabsContent>

            <TabsContent value="pyqs" className="space-y-3">
              {myPyqs.length === 0 && <p className="text-sm text-white/55">No PYQs uploaded yet.</p>}
              {myPyqs.map(item => <PYQCard key={item.id} pyq={item} />)}
            </TabsContent>

            <TabsContent value="bookmarks" className="space-y-3">
              {bookmarks.length === 0 && <p className="text-sm text-white/55">No bookmarks yet.</p>}
              {bookmarks.map(item => <PYQCard key={item.id} pyq={item} />)}
            </TabsContent>

            <TabsContent value="activity" className="space-y-2">
              {(karmaEventsData?.items ?? []).map(item => (
                <div key={item.id} className="rounded-xl border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-white/85">
                  <p>{item.description}</p>
                  <p className="mt-1 text-xs text-white/45">{formatAgo(item.created_at)}</p>
                </div>
              ))}
              {(karmaEventsData?.items ?? []).length === 0 && <p className="text-sm text-white/55">No recent activity.</p>}
            </TabsContent>
          </Tabs>
        </section>
      </div>

      {(followersModal || followingModal) && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-xl border border-[#2a2a2a] bg-[#111111] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">{followersModal ? 'Followers' : 'Following'}</h2>
              <button type="button" onClick={() => { setFollowersModal(false); setFollowingModal(false) }}>✕</button>
            </div>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto">
              {(followersModal ? followersQuery.data?.items : followingQuery.data?.items)?.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setFollowersModal(false)
                    setFollowingModal(false)
                    navigate(`/profile/${item.id}`)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg bg-[#1a1a1a] p-2 text-left hover:bg-[#202020]"
                >
                  <UserAvatar size="sm" name={item.display_name} avatarUrl={item.avatar_url} />
                  <div>
                    <p className="text-sm font-semibold">{item.display_name || 'Student'}</p>
                    <p className="text-xs text-white/55">{item.branch || 'PESU'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {addProjectOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#2a2a2a] bg-[#111111] p-4">
            <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Add Project</h3><button type="button" onClick={() => setAddProjectOpen(false)}>✕</button></div>
            <div className="space-y-2">
              <input value={projectForm.title} onChange={e => setProjectForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Title" className="w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2" />
              <textarea value={projectForm.description} onChange={e => setProjectForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Description" rows={3} className="w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2" />
              <input value={projectForm.tech_stack} onChange={e => setProjectForm(prev => ({ ...prev, tech_stack: e.target.value }))} placeholder="Tech stack (comma separated)" className="w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2" />
              <input value={projectForm.github_url} onChange={e => setProjectForm(prev => ({ ...prev, github_url: e.target.value }))} placeholder="GitHub URL" className="w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2" />
              <input value={projectForm.live_url} onChange={e => setProjectForm(prev => ({ ...prev, live_url: e.target.value }))} placeholder="Live URL" className="w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2" />
            </div>
            <button 
              type="button" 
              onClick={() => addProjectMutation.mutate()} 
              disabled={addProjectMutation.isPending}
              className="mt-3 w-full rounded-lg bg-indigo-600 py-2 font-semibold disabled:opacity-50 disabled:cursor-wait"
            >
              {addProjectMutation.isPending ? 'Adding...' : 'Add Project'}
            </button>
          </div>
        </div>
      )}

      {endorseModal?.open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#2a2a2a] bg-[#111111] p-4">
            <h3 className="font-semibold">Endorse {viewedProfile.display_name || 'this user'} for {endorseModal.skill}?</h3>
            <textarea id="endorse-note" rows={3} placeholder="Optional note" className="mt-3 w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2" />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setEndorseModal(null)} className="flex-1 rounded-lg border border-[#2a2a2a] py-2">Cancel</button>
              <button
                type="button"
                onClick={() => {
                  const note = (document.getElementById('endorse-note') as HTMLTextAreaElement | null)?.value
                  endorseMutation.mutate({ skill: endorseModal.skill, note: note?.trim() || undefined })
                }}
                className="flex-1 rounded-lg bg-indigo-600 py-2 font-semibold"
              >
                Endorse
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#2a2a2a] bg-[#111111] p-5">
            <h3 className="text-lg font-semibold">Request Resume Review</h3>
            <p className="mt-1 text-sm text-white/65">From: {profile?.display_name || 'Student'} · To: {viewedProfile.display_name || 'Mentor'}</p>

            <div className="mt-3 space-y-2">
              <label className="block text-sm text-white/80">Your resume</label>
              <div className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-2 text-sm">
                {reviewResumeUrl ? (
                  <a href={reviewResumeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-300">
                    Resume uploaded <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <label className="cursor-pointer text-indigo-300">
                    Upload your resume (PDF, max 5MB)
                    <input type="file" accept="application/pdf" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) void uploadResume(file) }} />
                  </label>
                )}
              </div>
              <textarea
                value={reviewMessage}
                onChange={e => setReviewMessage(e.target.value)}
                rows={4}
                placeholder="What would you like feedback on?"
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2"
              />
              <p className="text-sm text-emerald-300">Price: {viewedProfile.role === 'mentor' ? 'Check mentor rate at submit' : 'Free ✓'}</p>
            </div>

            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setReviewModalOpen(false)} className="flex-1 rounded-lg border border-[#2a2a2a] py-2">Cancel</button>
              <button type="button" disabled={!reviewResumeUrl || reviewMutation.isPending} onClick={() => reviewMutation.mutate()} className="flex-1 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 py-2 font-semibold disabled:opacity-60">Send Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
