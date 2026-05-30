import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BellRing, BrainCircuit, Briefcase, CalendarClock, ChevronLeft, Clock3, Compass, FileText, GraduationCap, MessageCircle, ShoppingBag, Sparkles, Users } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import {
  FEED_INTERACTION_KEY,
  type FeedDensityVariant,
  type FeedInteractionHistory,
  HOME_FEED_EXPERIMENT_ID,
  mergeInteractionHistory,
  readInteractionHistory,
  resolveDensityVariant,
} from '@/lib/homeFeed'
import { useAuthStore } from '@/store/auth'
import { UserAvatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { AIChatPanel } from '@/components/ai/AIChatPanel'
import { addRecentModule, getRecentModules, type RecentModule } from '@/lib/recentModules'

interface EventItem {
  id: string
  title: string
  start_time: string
  location: string
  category: string
}

interface ConfessionItem {
  id: string
  content: string
  upvote_count: number
  created_at: string
  category?: string
}

interface PlacementItem {
  id: string
  company: string
  role: string
  package_band: string | null
  year_of_placement: number
  created_at?: string
  branch?: string | null
}

interface PesuAttendance {
  id: string
  subject_name: string
  percentage: number
  attended?: number
  conducted?: number
}

interface MarketplaceHomeItem {
  id: string
  title: string
  price: number
  category: string
  created_at: string
}

type FeedItem = {
  id: string
  type: 'event' | 'confession' | 'placement'
  title: string
  subtitle: string
  meta: string
  ts: number
  score: number
  to: string
}

function scoreFeedItem(
  item: Omit<FeedItem, 'score'>,
  history: FeedInteractionHistory,
  profileContext: { branch: string; semester: number | null; year: number | null }
) {
  const now = Date.now()
  const ageHours = Math.max(0, (now - item.ts) / (1000 * 60 * 60))
  const recencyScore = Math.max(0, 24 - ageHours / 2)

  const branchTokens = profileContext.branch
    .toLowerCase()
    .split(/\s+/)
    .filter(token => token.length > 2)
  const combinedText = `${item.title} ${item.subtitle}`.toLowerCase()
  const branchMatchScore = branchTokens.some(token => combinedText.includes(token)) ? 14 : 0

  const totalInteractions = history.event + history.confession + history.placement
  const typeAffinity = totalInteractions > 0
    ? (history[item.type] / totalInteractions)
    : 0
  const affinityScore = typeAffinity * 30

  let stageScore = 0
  const sem = profileContext.semester
  if (item.type === 'placement') {
    if (sem !== null && sem >= 6) stageScore += 16
    if (sem !== null && sem <= 3) stageScore -= 6
  }
  if (item.type === 'event' && sem !== null && sem <= 4) stageScore += 8
  if (item.type === 'confession' && sem !== null && sem <= 2) stageScore += 5

  if (item.type === 'placement' && profileContext.year) {
    const graduationProximity = Math.max(0, 4 - Math.abs(profileContext.year - new Date().getFullYear()))
    stageScore += graduationProximity
  }

  return recencyScore + branchMatchScore + affinityScore + stageScore
}

function HomePageSkeleton() {
  return (
    <div className="min-h-full bg-[var(--bg-base)] px-4 py-4 md:px-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <Skeleton variant="text" className="h-5 w-40 bg-white/10" />
          <Skeleton variant="text" className="mt-2 h-4 w-52 bg-white/10" />
        </section>

        <section className="flex gap-2 overflow-hidden">
          <Skeleton className="h-9 w-36 rounded-full bg-white/10" />
          <Skeleton className="h-9 w-36 rounded-full bg-white/10" />
          <Skeleton className="h-9 w-36 rounded-full bg-white/10" />
        </section>

        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-2xl bg-white/10" />
          ))}
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-2">
          <Skeleton variant="text" className="h-4 w-40 bg-white/10" />
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-2xl bg-white/10" />
          ))}
        </section>
      </div>
    </div>
  )
}

function formatEventTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function greetingByHour() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function HomePage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const displayName = profile?.display_name || profile?.email?.split('@')[0] || 'Student'
  const [densityVariant, setDensityVariant] = useState<FeedDensityVariant>('immersive')
  const [densitySource, setDensitySource] = useState<'manual' | 'ab'>('ab')
  const [impressionSent, setImpressionSent] = useState(false)
  const [interactionHistory, setInteractionHistory] = useState<FeedInteractionHistory>(() => readInteractionHistory())
  const [isSwipeDragging, setIsSwipeDragging] = useState(false)
  const swipeRootRef = useRef<HTMLDivElement | null>(null)
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const isSwipingRef = useRef(false)
  const swipeRafRef = useRef<number | null>(null)
  const swipeNavigateTimeoutRef = useRef<number | null>(null)
  const swipeOffsetRef = useRef(0)
  const swipeArmedRef = useRef(false)
  const swipeDistanceRef = useRef(0)
  const swipeVelocityRef = useRef(0)
  const lastTouchXRef = useRef(0)
  const lastTouchTRef = useRef(0)
  const isSwipeNavigatingRef = useRef(false)
  const [showAthenaAI, setShowAthenaAI] = useState(false)
  const [recentModules, setRecentModules] = useState<RecentModule[]>(() => getRecentModules())
  const SWIPE_ARM_PX = 64
  const SWIPE_MIN_DISTANCE_PX = 34
  const SWIPE_MIN_VELOCITY = 0.34
  const SWIPE_MAX_OFFSET = 142

  const branch =
    profile?.branch?.trim() ||
    profile?.course?.trim() ||
    profile?.degree?.trim() ||
    (profile?.campus ? `${profile.campus} Campus` : 'PESU Student')

  useEffect(() => {
    const resolved = resolveDensityVariant(profile?.id)
    setDensityVariant(resolved.variant)
    setDensitySource(resolved.preference === 'auto' ? 'ab' : 'manual')
  }, [profile?.id])

  useEffect(() => {
    localStorage.setItem(FEED_INTERACTION_KEY, JSON.stringify(interactionHistory))
  }, [interactionHistory])

  const attendanceQuery = useQuery({
    queryKey: ['home-attendance-summary'],
    queryFn: () => apiFetch<{ items: PesuAttendance[] }>('/api/pesu-sync/attendance'),
    retry: false,
  })

  const eventsQuery = useQuery({
    queryKey: ['home-events-clean'],
    queryFn: () => apiFetch<{ items: EventItem[] }>('/api/events?limit=12'),
  })

  const confessionsQuery = useQuery({
    queryKey: ['home-confessions-clean'],
    queryFn: () => apiFetch<{ items: ConfessionItem[] }>('/api/confessions?limit=12'),
  })

  const placementsQuery = useQuery({
    queryKey: ['home-placements-clean'],
    queryFn: () => apiFetch<{ items: PlacementItem[] }>('/api/placements?limit=12'),
  })

  const marketplaceQuery = useQuery({
    queryKey: ['home-marketplace-preview'],
    queryFn: () => apiFetch<{ listings: MarketplaceHomeItem[] }>('/api/marketplace?limit=2&sort=newest&status=active'),
  })

  const interactionSyncQuery = useQuery({
    queryKey: ['home-feed-interactions-sync'],
    queryFn: () => apiFetch<{ history: FeedInteractionHistory }>('/api/analytics/home-feed/interactions'),
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!interactionSyncQuery.data?.history) return
    setInteractionHistory(prev => mergeInteractionHistory(prev, interactionSyncQuery.data?.history))
  }, [interactionSyncQuery.data?.history])

  const upcomingEvents = (eventsQuery.data?.items ?? [])
    .filter(item => new Date(item.start_time).getTime() > Date.now())
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  const hotConfessions = (confessionsQuery.data?.items ?? []).slice(0, 2)
  const allPlacements = placementsQuery.data?.items ?? []
  const topPlacement = allPlacements.find(item => Boolean(item.package_band)) ?? allPlacements[0]

  const isFirstPaintLoading =
    !attendanceQuery.data &&
    !eventsQuery.data &&
    !confessionsQuery.data &&
    !placementsQuery.data &&
    (attendanceQuery.isLoading || eventsQuery.isLoading || confessionsQuery.isLoading || placementsQuery.isLoading)

  const trackFeedInteraction = (type: FeedItem['type']) => {
    const now = Date.now()
    setInteractionHistory(prev => ({
      ...prev,
      [type]: prev[type] + 1,
      lastUpdatedAt: now,
    }))

    void apiFetch('/api/analytics/events', {
      method: 'POST',
      body: JSON.stringify({
        event_name: 'home_feed_interaction',
        experiment_id: HOME_FEED_EXPERIMENT_ID,
        variant: densityVariant,
        properties: {
          item_type: type,
          density_source: densitySource,
          ts: now,
        },
      }),
    }).catch(() => undefined)
  }

  const liveFeed = useMemo<FeedItem[]>(() => {
    const profileContext = {
      branch,
      semester: profile?.semester ?? null,
      year: profile?.year ?? null,
    }

    const eventFeed: Array<Omit<FeedItem, 'score'>> = upcomingEvents.slice(0, 4).map(item => ({
      id: item.id,
      type: 'event',
      title: item.title,
      subtitle: `${item.category} · ${item.location}`,
      meta: formatEventTime(item.start_time),
      ts: new Date(item.start_time).getTime(),
      to: '/campus',
    }))

    const confessionFeed: Array<Omit<FeedItem, 'score'>> = (confessionsQuery.data?.items ?? []).slice(0, 4).map(item => ({
      id: item.id,
      type: 'confession',
      title: item.content,
      subtitle: `${item.category ?? 'General'} · Anonymous`,
      meta: `❤️ ${item.upvote_count} · ${timeAgo(item.created_at)}`,
      ts: new Date(item.created_at).getTime(),
      to: '/confessions',
    }))

    const placementFeed: Array<Omit<FeedItem, 'score'>> = (placementsQuery.data?.items ?? []).slice(0, 4).map(item => ({
      id: item.id,
      type: 'placement',
      title: `${item.company} · ${item.role}`,
      subtitle: `${item.branch ?? branch} · Batch ${item.year_of_placement}`,
      meta: item.package_band ?? 'Compensation not disclosed',
      ts: item.created_at
        ? new Date(item.created_at).getTime()
        : new Date(item.year_of_placement, 0, 1).getTime(),
      to: '/placements',
    }))

    return [...eventFeed, ...confessionFeed, ...placementFeed]
      .map(item => ({
        ...item,
        score: scoreFeedItem(item, interactionHistory, profileContext),
      }))
      .sort((a, b) => (b.score - a.score) || (b.ts - a.ts))
      .slice(0, 6)
  }, [upcomingEvents, confessionsQuery.data?.items, placementsQuery.data?.items, branch, interactionHistory, profile?.semester, profile?.year])

  const quickActions = [
    { label: 'Notes', to: '/notes', icon: FileText },
    { label: 'People', to: '/people', icon: Users },
    { label: 'Marketplace', to: '/marketplace', icon: ShoppingBag },
    { label: 'Campus', to: '/campus', icon: Compass },
    { label: 'Placements', to: '/placements', icon: Sparkles },
    { label: 'Mentors', to: '/mentors', icon: GraduationCap },
  ]

  const compact = densityVariant === 'compact'
  const pageGapClass = compact ? 'space-y-3.5' : 'space-y-4.5'
  const blockPaddingClass = compact ? 'p-3.5 sm:p-4' : 'p-4 sm:p-4.5'
  const feedCardPaddingClass = compact ? 'p-3 sm:p-3.5' : 'p-3.5 sm:p-4'
  const athenaContext = [branch, profile?.semester ? `Semester ${profile.semester}` : null].filter(Boolean).join(' • ')

  function commitSwipeVisual(offsetPx: number) {
    const root = swipeRootRef.current
    if (!root) return

    const progress = Math.min(1, offsetPx / SWIPE_ARM_PX)
    root.style.setProperty('--swipe-offset', `${offsetPx}px`)
    root.style.setProperty('--swipe-progress', `${progress}`)
  }

  function scheduleSwipeVisual(offsetPx: number) {
    swipeOffsetRef.current = offsetPx
    if (swipeRafRef.current !== null) return

    swipeRafRef.current = window.requestAnimationFrame(() => {
      swipeRafRef.current = null
      commitSwipeVisual(swipeOffsetRef.current)
    })
  }

  function resetSwipeVisual() {
    swipeOffsetRef.current = 0
    scheduleSwipeVisual(0)
  }

  useEffect(() => {
    return () => {
      if (swipeRafRef.current !== null) {
        window.cancelAnimationFrame(swipeRafRef.current)
      }
      if (swipeNavigateTimeoutRef.current !== null) {
        window.clearTimeout(swipeNavigateTimeoutRef.current)
      }
    }
  }, [])

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (isSwipeNavigatingRef.current) return
    const touch = event.touches[0]
    if (!touch) return

    const now = performance.now()
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, t: now }
    lastTouchXRef.current = touch.clientX
    lastTouchTRef.current = now
    isSwipingRef.current = false
    swipeArmedRef.current = false
    swipeDistanceRef.current = 0
    swipeVelocityRef.current = 0
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (isSwipeNavigatingRef.current) return
    const start = touchStartRef.current
    const touch = event.touches[0]
    if (!start || !touch) return

    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    const leftDistance = Math.max(0, start.x - touch.clientX)
    const horizontalIntent = leftDistance > Math.abs(deltaY) + 6

    if (!horizontalIntent || deltaX >= 0) {
      if (isSwipingRef.current) {
        resetSwipeVisual()
        swipeArmedRef.current = false
        swipeDistanceRef.current = 0
        swipeVelocityRef.current = 0
        setIsSwipeDragging(false)
      }
      return
    }

    isSwipingRef.current = true
    setIsSwipeDragging(true)
    if (event.cancelable) {
      event.preventDefault()
    }
    const now = performance.now()
    const dt = Math.max(1, now - lastTouchTRef.current)
    const dx = Math.max(0, lastTouchXRef.current - touch.clientX)
    swipeVelocityRef.current = dx / dt
    lastTouchXRef.current = touch.clientX
    lastTouchTRef.current = now

    swipeDistanceRef.current = leftDistance
    const progressPx = Math.min(leftDistance, SWIPE_MAX_OFFSET)
    scheduleSwipeVisual(progressPx)
    swipeArmedRef.current = leftDistance >= SWIPE_ARM_PX || swipeVelocityRef.current >= SWIPE_MIN_VELOCITY
  }

  function handleTouchEnd() {
    if (isSwipeNavigatingRef.current) return
    const shouldOpenMessages =
      swipeArmedRef.current ||
      (swipeDistanceRef.current >= SWIPE_MIN_DISTANCE_PX && swipeVelocityRef.current >= SWIPE_MIN_VELOCITY)

    touchStartRef.current = null
    isSwipingRef.current = false
    swipeArmedRef.current = false
    swipeDistanceRef.current = 0
    swipeVelocityRef.current = 0
    setIsSwipeDragging(false)

    if (!shouldOpenMessages) {
      resetSwipeVisual()
      return
    }

    isSwipeNavigatingRef.current = true
    scheduleSwipeVisual(SWIPE_MAX_OFFSET)

    void apiFetch('/api/analytics/events', {
      method: 'POST',
      body: JSON.stringify({
        event_name: 'home_feed_swipe_to_messages',
        experiment_id: HOME_FEED_EXPERIMENT_ID,
        variant: densityVariant,
        properties: {
          density_source: densitySource,
        },
      }),
    }).catch(() => undefined)

    swipeNavigateTimeoutRef.current = window.setTimeout(() => {
      navigate('/messages')
      isSwipeNavigatingRef.current = false
      resetSwipeVisual()
    }, 110)
  }

  useEffect(() => {
    if (impressionSent) return
    if (liveFeed.length === 0) return

    setImpressionSent(true)
    void apiFetch('/api/analytics/events', {
      method: 'POST',
      body: JSON.stringify({
        event_name: 'home_feed_impression',
        experiment_id: HOME_FEED_EXPERIMENT_ID,
        variant: densityVariant,
        properties: {
          density_source: densitySource,
          items_rendered: liveFeed.length,
        },
      }),
    }).catch(() => undefined)
  }, [impressionSent, liveFeed.length, densitySource, densityVariant])

  if (isFirstPaintLoading) {
    return <HomePageSkeleton />
  }

  return (
    <div
      ref={swipeRootRef}
      className="relative min-h-full overflow-hidden perf-lite-home-bg bg-[var(--bg-base)] px-3 py-3.5 text-[var(--text-primary)] sm:px-4 sm:py-4 md:px-6"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div
        className={`pointer-events-none absolute right-2 top-1/2 z-30 -translate-y-1/2 transition-all duration-150 ${
          isSwipeDragging ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          transform: 'translateY(-50%) translateX(calc((1 - var(--swipe-progress, 0)) * 10px))',
        }}
        aria-hidden="true"
      >
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-600 bg-gray-800 backdrop-blur-sm">
          <ChevronLeft className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      <div
        className={`mx-auto max-w-3xl transform-gpu transition-transform perf-lite-swipe-track ${isSwipeDragging ? 'duration-0' : 'duration-200'} ${pageGapClass}`}
        style={{ transform: 'translateX(calc(var(--swipe-offset, 0px) * -1))' }}
      >
        <section className="sticky top-0 z-20 -mx-4 border-b border-[var(--border)] bg-[rgba(11,15,20,0.9)] px-4 pb-3 pt-2 backdrop-blur-md mobile-glass-panel md:mx-0 md:rounded-2xl md:border md:bg-[var(--bg-card)] md:backdrop-blur-xl md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold tracking-tight text-[var(--text-primary)]">{greetingByHour()}, {displayName}</p>
              <p className="text-xs text-[var(--text-secondary)]">{branch} • Build momentum today</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/messages')}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] transition hover:bg-[#202833]"
                aria-label="Messages"
              >
                <MessageCircle className="h-4 w-4 text-[var(--text-primary)]" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/campus')}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] transition hover:bg-[#202833]"
                aria-label="Campus updates"
              >
                <BellRing className="h-4 w-4 text-[var(--text-primary)]" />
              </button>
              <button type="button" onClick={() => navigate('/profile')} aria-label="Open profile">
                <UserAvatar name={profile?.display_name} avatarUrl={profile?.avatar_url} size="sm" />
              </button>
            </div>
          </div>

        </section>

        <section className="grid grid-cols-3 gap-2 sm:grid-cols-6 perf-lazy-section">
          {quickActions.map(action => {
            const Icon = action.icon
            return (
              <button
                key={action.label}
                type="button"
                onClick={() => {
                  addRecentModule(action.label, action.to)
                  setRecentModules(getRecentModules())
                  navigate(action.to)
                }}
                className="group flex min-h-[74px] flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] py-3 text-center shadow-[0_4px_20px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:border-gray-500/35 hover:bg-[var(--bg-elevated)]"
              >
                <Icon className="h-5 w-5 text-gray-300 transition group-hover:scale-105 group-hover:text-white" />
                <p className="text-[11px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">{action.label}</p>
              </button>
            )
          })}
        </section>

        <section className={`rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_4px_20px_rgba(0,0,0,0.22)] ${blockPaddingClass}`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Recently Visited
            </h2>
          </div>

          {recentModules.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">
              No recently visited modules yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {recentModules.map((module) => (
                <button
                  key={module.path}
                  type="button"
                  onClick={() => navigate(module.path)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] transition hover:bg-gray-800"
                >
                  {module.name}
                </button>
              ))}
            </div>
          )}
        </section>

        <section
          className={`relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] ${blockPaddingClass}`}
        >
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/5 home-blob-glow" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full border border-gray-700 bg-gray-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                <BrainCircuit className="h-3 w-3" />
                Athena AI
              </p>
              <h2 className="mt-3 text-base font-semibold text-[var(--text-primary)]">Your exam-focused AI, not a generic chatbot</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">Ask concepts, PYQ trends, and numericals in exam format with cleaner, faster answers.</p>
            </div>
            <img
              src="/athena-ai-logo-v2.jpeg"
              alt="Athena AI Logo"
              className="h-14 w-14 shrink-0 rounded-2xl border border-[var(--border)] object-cover shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
            />
          </div>

          <div className="relative mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAthenaAI(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-white bg-white px-3 py-2 text-sm font-semibold text-black transition hover:bg-gray-100"
            >
              <BrainCircuit className="h-4 w-4" />
              Ask Athena AI
            </button>
            <span className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">2-Mark / 4-Mark / Detailed</span>
          </div>
        </section>

        <section className={`rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_4px_20px_rgba(0,0,0,0.22)] perf-lazy-section ${blockPaddingClass}`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Campus Marketplace</h2>
            <Link to="/marketplace" className="text-xs text-gray-400 hover:text-white transition">Browse all →</Link>
          </div>
          <div className="space-y-2">
            {(marketplaceQuery.data?.listings ?? []).slice(0, 2).map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(`/marketplace/${item.id}`)}
                className={`w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] ${feedCardPaddingClass} text-left shadow-[0_4px_18px_rgba(0,0,0,0.18)] transition hover:border-gray-500/35 hover:bg-gray-800`}
              >
                <p className="line-clamp-1 text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.category} • {timeAgo(item.created_at)}</p>
                <p className="mt-2 text-xs font-semibold text-white">₹{Number(item.price).toLocaleString('en-IN')}</p>
              </button>
            ))}
            {(marketplaceQuery.data?.listings ?? []).length === 0 && (
              <p className="text-sm text-[var(--text-secondary)]">No active listings yet.</p>
            )}
          </div>
        </section>

        <section className={`rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_4px_20px_rgba(0,0,0,0.22)] perf-lazy-section ${blockPaddingClass}`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Opportunity Spotlight</h2>
            <Link to="/placements" className="text-xs text-gray-400 hover:text-white transition">Explore →</Link>
          </div>
          <div className="space-y-2">
            {topPlacement ? (
              <article className={`rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] ${feedCardPaddingClass} shadow-[0_4px_18px_rgba(0,0,0,0.18)]`}>
                <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">Top update</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{topPlacement.company}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{topPlacement.role} • {topPlacement.branch ?? branch}</p>
                <p className="mt-2 text-xs text-gray-300">{topPlacement.package_band ?? `Batch ${topPlacement.year_of_placement}`}</p>
              </article>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">No placement updates yet.</p>
            )}
          </div>
        </section>

        <section className={`rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_4px_20px_rgba(0,0,0,0.22)] perf-lazy-section ${blockPaddingClass}`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Live Campus Feed</h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">
              <CalendarClock className="h-3 w-3" />
              Fresh
            </span>
          </div>
          <div className="space-y-2">
            {liveFeed.length === 0 && <p className="text-sm text-[var(--text-secondary)]">No feed updates yet.</p>}
            {liveFeed.map(item => (
              <button
                key={`${item.type}-${item.id}`}
                type="button"
                onClick={() => {
                  trackFeedInteraction(item.type)
                  navigate(item.to)
                }}
                className={`w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] ${feedCardPaddingClass} text-left shadow-[0_4px_18px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:border-gray-500/35 hover:bg-gray-800`}
              >
                <div className="mb-2 flex items-center gap-2 text-[10px]">
                  <span className="rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-2 py-0.5 text-[var(--text-secondary)]">
                    {item.type}
                  </span>
                  <span className="text-[var(--text-secondary)]">{item.subtitle}</span>
                </div>
                <p className={`${compact ? 'line-clamp-1' : 'line-clamp-2'} text-sm font-medium text-[var(--text-primary)]`}>{item.title}</p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-[var(--text-secondary)]">{item.meta}</p>
                  {item.type === 'placement' && <Briefcase className="h-3.5 w-3.5 text-gray-500" />}
                  {item.type === 'event' && <Clock3 className="h-3.5 w-3.5 text-gray-500" />}
                  {item.type === 'confession' && <MessageCircle className="h-3.5 w-3.5 text-gray-500" />}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className={`rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[0_4px_20px_rgba(0,0,0,0.22)] perf-lazy-section ${blockPaddingClass}`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Next Up</h2>
            <Link to="/campus" className="text-xs text-gray-400 hover:text-white transition">See calendar →</Link>
          </div>
          {upcomingEvents[0] ? (
            <article className={`rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] ${feedCardPaddingClass} shadow-[0_4px_18px_rgba(0,0,0,0.18)]`}>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{upcomingEvents[0].title}</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{upcomingEvents[0].category} • {upcomingEvents[0].location}</p>
              <p className="mt-2 text-xs text-gray-400">{formatEventTime(upcomingEvents[0].start_time)}</p>
            </article>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">No events yet.</p>
          )}

          {hotConfessions[0] && (
            <button
              type="button"
              onClick={() => navigate('/confessions')}
              className={`mt-3 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] ${feedCardPaddingClass} text-left shadow-[0_4px_18px_rgba(0,0,0,0.18)] transition hover:border-gray-500/35 hover:bg-gray-800`}
            >
              <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">Campus Buzz</p>
              <p className="mt-1 line-clamp-2 text-sm text-[var(--text-primary)]">{hotConfessions[0].content}</p>
            </button>
          )}
        </section>
      </div>

      {showAthenaAI && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setShowAthenaAI(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 p-0 md:bottom-24 md:right-6 md:left-auto md:w-96 md:p-0">
            <AIChatPanel
              taskType="study_chat"
              context={athenaContext || undefined}
              onClose={() => setShowAthenaAI(false)}
            />
          </div>
        </>
      )}
    </div>
  )
}
