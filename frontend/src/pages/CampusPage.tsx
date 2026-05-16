import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Calendar, Users, Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useEvents, type EventFilters } from '@/hooks/useEvents'
import { useClubs, type ClubFilters } from '@/hooks/useClubs'
import { EventCard } from '@/components/events/EventCard'
import { EventFiltersBar } from '@/components/events/EventFilters'
import { ClubCard } from '@/components/clubs/ClubCard'
import { CreateEventModal } from '@/components/events/CreateEventModal'
import { CreateClubModal } from '@/components/clubs/CreateClubModal'
import { SkeletonCard } from '@/components/ui/skeleton'

type CampusTab = 'events' | 'clubs'

const CLUB_CATEGORIES = ['all', 'academic', 'cultural', 'sports', 'technical', 'social', 'arts', 'other']

export default function CampusPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as CampusTab) || 'events'

  const [eventFilters, setEventFilters] = useState<EventFilters>({})
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const eventLoadMoreRef = useRef<HTMLDivElement>(null)

  const [clubFilters, setClubFilters] = useState<ClubFilters>({})
  const [clubSearch, setClubSearch] = useState('')
  const [showCreateClub, setShowCreateClub] = useState(false)
  const clubLoadMoreRef = useRef<HTMLDivElement>(null)

  const {
    data: eventsData,
    fetchNextPage: fetchMoreEvents,
    hasNextPage: hasMoreEvents,
    isFetchingNextPage: isFetchingMoreEvents,
    isLoading: isEventsLoading,
  } = useEvents(eventFilters)

  const {
    data: clubsData,
    fetchNextPage: fetchMoreClubs,
    hasNextPage: hasMoreClubs,
    isFetchingNextPage: isFetchingMoreClubs,
    isLoading: isClubsLoading,
  } = useClubs(clubFilters)

  const events = useMemo(() => eventsData?.pages.flatMap(page => page.items) ?? [], [eventsData])
  const clubs = useMemo(() => clubsData?.pages.flatMap(page => page.items) ?? [], [clubsData])

  useEffect(() => {
    const t = setTimeout(() => {
      setClubFilters(prev => ({ ...prev, search: clubSearch || undefined }))
    }, 300)
    return () => clearTimeout(t)
  }, [clubSearch])

  useEffect(() => {
    const el = eventLoadMoreRef.current
    if (!el || tab !== 'events') return

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreEvents && !isFetchingMoreEvents) {
        fetchMoreEvents()
      }
    }, { threshold: 0.1 })

    observer.observe(el)
    return () => observer.disconnect()
  }, [tab, hasMoreEvents, isFetchingMoreEvents, fetchMoreEvents])

  useEffect(() => {
    const el = clubLoadMoreRef.current
    if (!el || tab !== 'clubs') return

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreClubs && !isFetchingMoreClubs) {
        fetchMoreClubs()
      }
    }, { threshold: 0.1 })

    observer.observe(el)
    return () => observer.disconnect()
  }, [tab, hasMoreClubs, isFetchingMoreClubs, fetchMoreClubs])

  const setTab = (nextTab: CampusTab) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', nextTab)
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0f0f0f] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Campus</h1>
            <p className="mt-1 text-sm text-white/55">Events and clubs in one place</p>
          </div>
          <div className="flex w-fit gap-1 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-1">
            {(['events', 'clubs'] as const).map(item => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={[
                  'rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200',
                  tab === item
                    ? 'bg-[#6366f1]/15 text-white ring-1 ring-[#6366f1]/30'
                    : 'text-white/60 hover:bg-[#242424] hover:text-white/90',
                ].join(' ')}
              >
                {item === 'events' ? 'Events' : 'Clubs'}
              </button>
            ))}
          </div>
        </div>

        {tab === 'events' && (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-xl border border-[#2a2a2a] bg-[#171717] px-3 py-2 text-sm text-white/80">
                <Calendar className="h-4 w-4 text-indigo-300" />
                Event Feed
              </div>
              <button
                onClick={() => setShowCreateEvent(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Create Event
              </button>
            </div>

            <EventFiltersBar filters={eventFilters} onChange={setEventFilters} />

            {isEventsLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : events.length === 0 ? (
              <div className="py-16 text-center text-gray-500">
                <Calendar className="mx-auto mb-3 h-12 w-12 opacity-40" />
                <p className="text-lg font-medium">No events found</p>
                <p className="mt-1 text-sm">Try adjusting filters or create a new event</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {events.map(event => <EventCard key={event.id} event={event} />)}
              </div>
            )}

            <div ref={eventLoadMoreRef} className="h-4" />
            {isFetchingMoreEvents && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}
          </>
        )}

        {tab === 'clubs' && (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-xl border border-[#2a2a2a] bg-[#171717] px-3 py-2 text-sm text-white/80">
                <Users className="h-4 w-4 text-indigo-300" />
                Club Directory
              </div>
              <button
                onClick={() => setShowCreateClub(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Create Club
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                value={clubSearch}
                onChange={e => setClubSearch(e.target.value)}
                placeholder="Search clubs..."
                className="w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {CLUB_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setClubFilters(prev => ({ ...prev, category: cat === 'all' ? undefined : cat }))}
                  className={[
                    'rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
                    (cat === 'all' && !clubFilters.category) || clubFilters.category === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[#0f0f0f] text-gray-300 hover:bg-[#1a1a1a]',
                  ].join(' ')}
                >
                  {cat}
                </button>
              ))}
            </div>

            {isClubsLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : clubs.length === 0 ? (
              <div className="py-16 text-center text-gray-500">
                <Users className="mx-auto mb-3 h-12 w-12 opacity-40" />
                <p className="text-lg font-medium">No clubs found</p>
                <p className="mt-1 text-sm">Try another search or category</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {clubs.map(club => <ClubCard key={club.id} club={club} />)}
              </div>
            )}

            <div ref={clubLoadMoreRef} className="h-4" />
            {isFetchingMoreClubs && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}
          </>
        )}
      </div>

      {showCreateEvent && <CreateEventModal onClose={() => setShowCreateEvent(false)} />}
      {showCreateClub && <CreateClubModal onClose={() => setShowCreateClub(false)} />}
    </div>
  )
}