// @ts-nocheck
import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Plus, Calendar, List } from 'lucide-react'
import { useEvents, type EventFilters } from '../hooks/useEvents'
import { EventCard } from '../components/events/EventCard'
import { EventCalendar } from '../components/events/EventCalendar'
import { EventFiltersBar } from '../components/events/EventFilters'
import { CreateEventModal } from '../components/events/CreateEventModal'
import { SkeletonCard } from '../components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
import { apiFetch } from '../lib/api'
import { useToast } from '../components/ui/use-toast'

interface BirthdayItem {
  id: string
  display_name: string | null
  avatar_url: string | null
  birthday_mmdd: string
  branch: string | null
}

const PERSONA_WORDS = ['midnight coder', 'campus legend', 'mystery topper', 'silent hustler']

export default function EventsPage() {
  const { toast } = useToast()
  const [filters, setFilters] = useState<EventFilters>({})
  const [showCreate, setShowCreate] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [birthdayDraft, setBirthdayDraft] = useState('')
  const [birthdayModalOpen, setBirthdayModalOpen] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useEvents(filters)

  const events = data?.pages.flatMap(p => p.items) ?? []

  // Filter out known seeded/mock event IDs used during development
  const visibleEvents = events.filter(ev => {
    if (!ev || !ev.id) return false
    const id = String(ev.id)
    if (id.startsWith('event-')) return false
    if (id.startsWith('seed-')) return false
    if (id === 'preview') return false
    // Titles sometimes used in seeded examples
    if (typeof ev.title === 'string' && /test|sample|mock|seed/i.test(ev.title)) return false
    return true
  })

  // For calendar: fetch all events for the month without pagination limit
  const { data: calendarData } = useEvents({ ...filters, limit: 200 })
  const calendarEvents = calendarData?.pages.flatMap(p => p.items) ?? []

  const birthdaysQuery = useQuery({
    queryKey: ['events', 'birthdays'],
    queryFn: () => apiFetch<BirthdayItem[]>('/api/profiles/birthdays'),
  })

  const postBirthdayWishMutation = useMutation({
    mutationFn: () =>
      apiFetch('/api/confessions', {
        method: 'POST',
        body: JSON.stringify({ content: birthdayDraft, category: 'confession' }),
      }),
    onSuccess: () => {
      toast({ variant: 'success', title: 'Birthday wish posted anonymously' })
      setBirthdayModalOpen(false)
      setBirthdayDraft('')
    },
    onError: () => toast({ variant: 'error', title: 'Failed to post birthday wish' }),
  })

  // Events for selected date
  const selectedDateEvents = selectedDate
    ? calendarEvents.filter(ev => {
        const d = new Date(ev.start_time)
        return d.getFullYear() === selectedDate.getFullYear() &&
          d.getMonth() === selectedDate.getMonth() &&
          d.getDate() === selectedDate.getDate()
      })
    : []

  const selectedDateBirthdays = selectedDate
    ? (birthdaysQuery.data ?? []).filter(item =>
      item.birthday_mmdd === `${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    )
    : []

  // Infinite scroll
  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    }, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white dark:text-gray-100 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-indigo-600" />
            Events
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">Discover campus events and activities</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Event
        </button>
      </div>

      {/* Filters */}
      <EventFiltersBar filters={filters} onChange={setFilters} />

      {/* Tabs: Feed / Calendar */}
      <Tabs defaultValue="feed">
        <TabsList className="mb-4">
          <TabsTrigger value="feed">
            <span className="flex items-center gap-1.5"><List className="h-4 w-4" />Feed</span>
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />Calendar</span>
          </TabsTrigger>
        </TabsList>

        {/* Feed view */}
        <TabsContent value="feed">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-16 text-gray-500 dark:text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">No events found</p>
              <p className="text-sm mt-1">Try adjusting your filters or create a new event</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}

          {/* Load more sentinel */}
          <div ref={loadMoreRef} className="h-4" />
          {isFetchingNextPage && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}
        </TabsContent>

        {/* Calendar view */}
        <TabsContent value="calendar">
          <EventCalendar
            events={calendarEvents}
            birthdays={birthdaysQuery.data ?? []}
            onDateSelect={setSelectedDate}
            onBirthdayClick={(dateStr) => {
              const parts = dateStr.split('-')
              const month = parts[1]
              const day = parts[2]
              const target = new Date()
              target.setMonth(Number(month) - 1)
              target.setDate(Number(day))
              setSelectedDate(target)
            }}
          />

          {/* Day events list */}
          {selectedDate && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-200 dark:text-gray-300 mb-3">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              {selectedDateEvents.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-500">No events on this day.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedDateEvents.map(event => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}

              {selectedDateBirthdays.length > 0 && (
                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <h4 className="text-sm font-semibold text-amber-200 mb-2">🎂 Birthdays Today</h4>
                  <div className="space-y-2">
                    {selectedDateBirthdays.map(item => (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2">
                        <p className="text-sm text-gray-100">Happy Birthday {item.display_name || 'friend'}!</p>
                        <button
                          className="rounded-lg border border-amber-400/40 bg-amber-500/20 px-2 py-1 text-xs font-semibold text-amber-200"
                          onClick={() => {
                            const persona = PERSONA_WORDS[Math.floor(Math.random() * PERSONA_WORDS.length)]
                            setBirthdayDraft(`Happy Birthday 🎂 to the ${persona} in ${item.branch || 'campus'}!`)
                            setBirthdayModalOpen(true)
                          }}
                        >
                          🎉 Wish them!
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {showCreate && (
        <CreateEventModal onClose={() => setShowCreate(false)} />
      )}

      {birthdayModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
            <h3 className="text-base font-semibold text-white mb-2">Anonymous Birthday Wish</h3>
            <textarea
              value={birthdayDraft}
              onChange={e => setBirthdayDraft(e.target.value.slice(0, 500))}
              rows={4}
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-sm text-white"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setBirthdayModalOpen(false)}
                className="flex-1 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-sm text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => postBirthdayWishMutation.mutate()}
                disabled={!birthdayDraft.trim()}
                className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Post Wish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
