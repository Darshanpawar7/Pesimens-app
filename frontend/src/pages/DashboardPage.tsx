import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { UploadPYQModal } from '@/components/pyqs/UploadPYQModal'
import { KarmaBadge } from '@/components/common/KarmaBadge'
import { StreakBadge } from '@/components/common/StreakBadge'
import { FollowButton } from '@/components/common/FollowButton'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { UserAvatar } from '@/components/ui/avatar'

interface DashboardPYQ {
  id: string
  subject: string
  course: string
  exam_type: string
  year: number
  question_text?: string
  upvote_count: number
  view_count: number
  created_at: string
  status: string
  uploader_id?: string
}

interface PyqFeedResponse {
  items: DashboardPYQ[]
  nextCursor: string | null
  hasMore: boolean
}

interface EventItem {
  id: string
  title: string
  location: string
  start_time: string
  category: string
}

interface EventsResponse {
  items: EventItem[]
  nextCursor: string | null
  hasMore: boolean
}

interface SuggestedProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
  degree: string | null
  branch: string | null
  campus: 'EC' | 'RR' | null
  karma: number
  is_following: boolean
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatCard({ icon, value, label, accent }: { icon: string; value: number | string; label: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
      <div className="flex items-center justify-between">
        <span className="text-xl" aria-hidden>{icon}</span>
        <span className={`text-xs font-semibold ${accent}`}>{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  )
}

function MiniPyqCard({ pyq }: { pyq: DashboardPYQ }) {
  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#141414] p-3">
      <p className="truncate text-sm font-semibold text-white">{pyq.subject}</p>
      <p className="mt-1 text-xs text-white/55">
        {pyq.course} · {pyq.exam_type} · {pyq.year}
      </p>
      <p className="mt-2 text-xs text-white/40">{formatWhen(pyq.created_at)}</p>
    </div>
  )
}

function MiniEventCard({ event }: { event: EventItem }) {
  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#141414] p-3">
      <p className="truncate text-sm font-semibold text-white">{event.title}</p>
      <p className="mt-1 text-xs text-white/55">
        {event.category} · {event.location}
      </p>
      <p className="mt-2 text-xs text-[#a5b4fc]">{formatWhen(event.start_time)}</p>
    </div>
  )
}

export default function DashboardPage() {
  const { profile } = useAuthStore()
  const [uploadOpen, setUploadOpen] = useState(false)

  const { data: pyqFeed, refetch: refetchPyqs } = useQuery({
    queryKey: ['dashboard-pyqs'],
    queryFn: () => apiFetch<PyqFeedResponse>('/api/pyqs?limit=100&sort=recent&uploader_id=me'),
  })

  const { data: bookmarksData } = useQuery({
    queryKey: ['dashboard-bookmarks'],
    queryFn: () => apiFetch<{ items: DashboardPYQ[] }>('/api/bookmarks'),
  })

  const { data: eventsData } = useQuery({
    queryKey: ['dashboard-events'],
    queryFn: () => apiFetch<EventsResponse>('/api/events?limit=20'),
  })

  const suggestionsQuery = useQuery({
    queryKey: ['dashboard-profile-suggestions'],
    queryFn: () => apiFetch<{ items: SuggestedProfile[] }>('/api/profiles/suggestions'),
  })

  const myUploads = useMemo(() => {
    const all = pyqFeed?.items ?? []
    if (!profile?.id) return []
    return all.filter(item => item.uploader_id === profile.id)
  }, [pyqFeed?.items, profile?.id])

  const bookmarks = bookmarksData?.items ?? []

  const upcomingEvents = useMemo(() => {
    const now = Date.now()
    return (eventsData?.items ?? [])
      .filter(e => new Date(e.start_time).getTime() > now)
      .slice(0, 2)
  }, [eventsData?.items])

  const streak = profile?.current_streak ?? 0

  const subtitleParts = [
    profile?.degree || 'Degree',
    profile?.branch || 'Branch',
    profile?.semester ? `Sem ${profile.semester}` : 'Sem --',
    profile?.campus ? `${profile.campus} Campus` : 'Campus --',
  ]

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0f0f0f] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border border-[#2a2a2a] bg-gradient-to-br from-[#1a1a1a] to-[#141414] p-5 md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">
                Welcome back, {profile?.display_name || 'Student'} 👋
              </h1>
              <p className="mt-1 text-sm text-white/60">{subtitleParts.join(' · ')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <KarmaBadge karma={profile?.karma ?? 0} />
              <StreakBadge streak={streak} />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard icon="📚" value={myUploads.length} label="PYQs Uploaded" accent="text-indigo-300" />
          <StatCard icon="🔖" value={bookmarks.length} label="Bookmarks" accent="text-sky-300" />
          <StatCard icon="📊" value={streak > 2 ? `🔥 ${streak}` : streak} label="Streak" accent="text-orange-300" />
          <StatCard icon="⭐" value={profile?.karma ?? 0} label="Karma" accent="text-amber-300" />
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <button
            onClick={() => setUploadOpen(true)}
            className="rounded-xl border border-[#6366f1]/40 bg-[#6366f1] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            + Upload PYQ
          </button>
          <Link to="/analytics" className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3 text-sm font-semibold text-white/90 hover:bg-[#222222]">
            📊 View Analytics
          </Link>
          <Link to="/confessions" className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3 text-sm font-semibold text-white/90 hover:bg-[#222222]">
            🤫 Confess
          </Link>
          <Link to="/placements" className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-3 text-sm font-semibold text-white/90 hover:bg-[#222222]">
            💼 Share Placement
          </Link>
        </section>

        <section className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
          <h2 className="text-sm font-semibold text-white">👥 People You May Know</h2>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {(suggestionsQuery.data?.items ?? []).map(person => (
              <div key={person.id} className="w-[120px] shrink-0 rounded-xl border border-[#2a2a2a] bg-[#111111] p-3 text-center">
                <Link to={`/profile/${person.id}`} className="inline-flex">
                  <UserAvatar name={person.display_name} avatarUrl={person.avatar_url} size="xl" />
                </Link>
                <Link to={`/profile/${person.id}`} className="mt-2 block truncate text-sm font-semibold text-white hover:text-indigo-300">
                  {person.display_name || 'Student'}
                </Link>
                <span className="mt-1 inline-flex rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-2 py-0.5 text-[10px] text-gray-300">
                  {person.branch || 'Branch'}
                </span>
                <div className="mt-1 text-[11px] text-amber-300">⚡ {person.karma}</div>
                <div className="mt-2">
                  <FollowButton userId={person.id} initialFollowing={person.is_following} size="sm" />
                </div>
              </div>
            ))}
            {(suggestionsQuery.data?.items ?? []).length === 0 && (
              <p className="text-xs text-white/50">No suggestions available yet.</p>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
            <h2 className="text-sm font-semibold text-white">Your Recent PYQs</h2>
            <div className="mt-3 space-y-2">
              {myUploads.slice(0, 3).map(item => <MiniPyqCard key={item.id} pyq={item} />)}
              {myUploads.length === 0 && <p className="text-xs text-white/50">No uploads yet.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
            <h2 className="text-sm font-semibold text-white">Bookmarked PYQs</h2>
            <div className="mt-3 space-y-2">
              {bookmarks.slice(0, 3).map(item => <MiniPyqCard key={item.id} pyq={item} />)}
              {bookmarks.length === 0 && <p className="text-xs text-white/50">No bookmarks yet.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
            <h2 className="text-sm font-semibold text-white">Upcoming Events</h2>
            <div className="mt-3 space-y-2">
              {upcomingEvents.map(item => <MiniEventCard key={item.id} event={item} />)}
              {upcomingEvents.length === 0 && <p className="text-xs text-white/50">No upcoming events.</p>}
            </div>
          </div>
        </section>
      </div>

      <UploadPYQModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        initialCourse={profile?.course ?? profile?.degree ?? ''}
        onSuccess={() => {
          setUploadOpen(false)
          void refetchPyqs()
        }}
      />
    </div>
  )
}
