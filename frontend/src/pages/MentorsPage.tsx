import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MentorCard, type Mentor } from '@/components/mentors/MentorCard'
import { MentorApplicationForm } from '@/components/mentors/MentorApplicationForm'
import { BookingForm } from '@/components/mentors/BookingForm'
import { RatingForm } from '@/components/mentors/RatingForm'
import { AvailabilityManager } from '@/components/mentors/AvailabilityManager'
import { apiFetch, ApiError } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useEffect, useRef, useCallback } from 'react'

interface MentorsResponse {
  items: Mentor[]
  nextCursor: string | null
  hasMore: boolean
}

interface Booking {
  id: string
  mentor_id: string
  student_id: string
  scheduled_at: string
  duration_minutes: number
  status: string
  amount: number
  student_note?: string
  mentor?: { profile: { display_name: string | null } }
  student?: { display_name: string | null }
}

export function MentorsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { profile } = useAuthStore()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator'
  
  const [subjectFilter, setSubjectFilter] = useState('')
  const [applyOpen, setApplyOpen] = useState(false)
  const [bookingMentor, setBookingMentor] = useState<Mentor | null>(null)
  const [deleteMentor, setDeleteMentor] = useState<Mentor | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const isMentor = profile?.role === 'mentor'
  const [tab, setTab] = useState<'browse' | 'bookings' | 'manage-availability'>('browse')
  const sentinelRef = useRef<HTMLDivElement>(null)

  const mentorsQuery = useInfiniteQuery({
    queryKey: ['mentors', subjectFilter],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams()
      if (subjectFilter) params.set('subject', subjectFilter)
      if (pageParam) params.set('cursor', pageParam as string)
      const qs = params.toString()
      return apiFetch<MentorsResponse>(`/api/mentors${qs ? `?${qs}` : ''}`)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: last => last.nextCursor ?? undefined,
    staleTime: 5 * 60 * 1000,
  })

  const bookingsQuery = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => apiFetch<{ bookings: Booking[] }>('/api/mentors/me/bookings'),
    enabled: tab === 'bookings',
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/api/bookings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
    },
  })

  const handleDeleteMentor = async () => {
    if (!deleteMentor) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await apiFetch(`/api/admin/mentors/${deleteMentor.user_id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: deleteReason || undefined }),
      })
      // Invalidate mentors list and close dialog
      await queryClient.invalidateQueries({ queryKey: ['mentors'] })
      setDeleteMentor(null)
      setDeleteReason('')
    } catch (err) {
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to delete mentor'
      setDeleteError(message)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0].isIntersecting && mentorsQuery.hasNextPage && !mentorsQuery.isFetchingNextPage) {
      mentorsQuery.fetchNextPage()
    }
  }, [mentorsQuery])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(handleIntersect, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [handleIntersect])

  const allMentors = mentorsQuery.data?.pages.flatMap(p => p.items) ?? []

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-500/15 text-yellow-300',
    confirmed: 'bg-green-500/15 text-green-300',
    cancelled: 'bg-red-500/15 text-red-300',
    completed: 'bg-blue-500/15 text-blue-300',
    failed: 'bg-[#1a1a1a] text-gray-500',
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {/* Become a Mentor banner */}
        <div className="rounded-2xl border border-[#2a2a2a] bg-gradient-to-r from-[#6366f1]/25 via-white/5 to-[#7c3aed]/20 p-5 shadow-[0_22px_80px_-52px_rgba(99,102,241,0.55)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/55">Marketplace</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">Mentors</h1>
              <p className="mt-1 text-sm text-white/70">
                Book 1-on-1 sessions with PESU seniors. Get help with subjects and career prep.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-[#2a2a2a] bg-[#1a1a1a]/10 text-white hover:bg-[#1a1a1a]/15 hover:text-white"
              onClick={() => setApplyOpen(true)}
            >
              Become a Mentor
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex w-full gap-1 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-1 sm:w-fit overflow-x-auto">
          {(isMentor ? ['browse', 'bookings', 'manage-availability'] as const : ['browse', 'bookings'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 whitespace-nowrap',
                tab === t
                  ? 'bg-[#6366f1]/15 text-white ring-1 ring-[#6366f1]/30'
                  : 'text-white/60 hover:bg-[#1a1a1a]/5 hover:text-white/80',
              ].join(' ')}
            >
              {t === 'browse' ? 'Browse Mentors' : t === 'bookings' ? 'My Bookings' : 'Manage Availability'}
            </button>
          ))}
        </div>

        {tab === 'browse' && (
          <>
            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
              {/* Filter sidebar */}
              <aside className="lg:sticky lg:top-4 lg:self-start">
                <div className="rounded-2xl border border-[#2a2a2a] bg-gradient-to-br from-[#1a1a1a] to-[#141414] p-4 shadow-[0_14px_44px_-30px_rgba(0,0,0,1)]">
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/45">Filters</p>
                  <h2 className="mt-2 text-sm font-semibold text-white">Find your mentor</h2>

                  <div className="mt-4 space-y-2">
                    <label className="text-xs font-medium text-white/55">Subject</label>
                    <Input
                      className="h-11 border-[#2a2a2a] bg-[#0f0f0f] text-white placeholder:text-white/30 focus-visible:ring-[#6366f1] focus-visible:ring-offset-0"
                      placeholder="e.g., DSA, DBMS, OS..."
                      value={subjectFilter}
                      onChange={e => setSubjectFilter(e.target.value)}
                    />
                    {subjectFilter && (
                      <Button
                        variant="outline"
                        className="w-full border-[#2a2a2a] bg-transparent text-white hover:bg-[#1a1a1a]/5 hover:text-white"
                        onClick={() => setSubjectFilter('')}
                      >
                        Clear
                      </Button>
                    )}
                  </div>

                  <div className="mt-5 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a]/3 p-3">
                    <p className="text-xs font-semibold text-white/60">Tips</p>
                    <ul className="mt-2 space-y-1 text-xs text-white/55">
                      <li>- Try “DSA”, “CN”, “DBMS”, “OS”</li>
                      <li>- Pick mentors with higher ratings for interview prep</li>
                      <li>- Book early for weekend slots</li>
                    </ul>
                  </div>
                </div>
              </aside>

              {/* Mentor grid */}
              <div>
                {mentorsQuery.isLoading && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-64 rounded-2xl border border-[#2a2a2a] bg-gradient-to-br from-[#1a1a1a] to-[#141414] animate-pulse"
                      />
                    ))}
                  </div>
                )}

                {!mentorsQuery.isLoading && allMentors.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-[#2a2a2a] bg-gradient-to-br from-[#1a1a1a] to-[#141414] py-16 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a]/5 text-[#6366f1]">
                      <span className="text-xl">✦</span>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-white">No mentors found</p>
                    <p className="mt-1 text-sm text-white/60">Try a different subject keyword.</p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {allMentors.map(m => (
                    <MentorCard
                      key={m.user_id}
                      mentor={m}
                      onBook={setBookingMentor}
                      onDelete={isAdmin ? setDeleteMentor : undefined}
                      isAdmin={isAdmin}
                      onMessage={mentor => {
                        const recipientId = mentor.profile?.id || mentor.user_id
                        if (!recipientId) return
                        const name = mentor.profile?.display_name ?? 'there'
                        const subjects = mentor.subjects.slice(0, 2).join(', ')
                        const prefill = `Hi ${name}! I came across your profile on PESImen and would love to connect.${subjects ? ` I'm interested in getting guidance on ${subjects}.` : ''} Would you be open to a quick chat?`
                        navigate(`/messages?user=${recipientId}&prefill=${encodeURIComponent(prefill)}`)
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div ref={sentinelRef} className="h-4" />
            {mentorsQuery.isFetchingNextPage && (
              <p className="text-center text-xs text-white/40">Loading more...</p>
            )}
          </>
        )}

        {tab === 'bookings' && (
          <div className="space-y-3">
            {bookingsQuery.isLoading && (
              <div className="h-32 rounded-2xl border border-[#2a2a2a] bg-gradient-to-br from-[#1a1a1a] to-[#141414] animate-pulse" />
            )}
            {bookingsQuery.data?.bookings.length === 0 && (
              <p className="py-14 text-center text-sm text-white/60">No bookings yet.</p>
            )}
            {bookingsQuery.data?.bookings.map(b => (
              <div key={b.id} className="rounded-2xl border border-[#2a2a2a] bg-gradient-to-br from-[#1a1a1a] to-[#141414] p-4 shadow-[0_14px_44px_-30px_rgba(0,0,0,1)]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-white">
                      {b.mentor?.profile.display_name ?? b.student?.display_name ?? 'Session'}
                    </p>
                    <p className="text-xs text-white/55">
                      {new Date(b.scheduled_at).toLocaleString('en-IN')} · {b.duration_minutes} min
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[b.status] ?? 'bg-[#1a1a1a]'}`}>
                    {b.status}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-white">₹{b.amount}</p>
                {b.student_note && <p className="mt-1 text-xs text-white/55 italic">"{b.student_note}"</p>}
                {b.status === 'completed' && (
                  <RatingForm bookingId={b.id} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['my-bookings'] })} />
                )}
                
                <div className="mt-3 flex gap-2">
                  {b.mentor_id === profile?.id ? (
                    // User is the mentor for this booking
                    b.status === 'pending' && (
                      <>
                        <Button 
                          size="sm" 
                          className="bg-green-600 text-white hover:bg-green-700"
                          onClick={() => updateStatusMutation.mutate({ id: b.id, status: 'confirmed' })}
                          disabled={updateStatusMutation.isPending}
                        >
                          Accept
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                          onClick={() => updateStatusMutation.mutate({ id: b.id, status: 'cancelled' })}
                          disabled={updateStatusMutation.isPending}
                        >
                          Decline
                        </Button>
                      </>
                    )
                  ) : (
                    // User is the student
                    (b.status === 'pending' || b.status === 'confirmed') && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        onClick={() => updateStatusMutation.mutate({ id: b.id, status: 'cancelled' })}
                        disabled={updateStatusMutation.isPending}
                      >
                        Cancel Booking
                      </Button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'manage-availability' && (
          <div className="pt-2">
            <AvailabilityManager />
          </div>
        )}

      </div>

      {/* Apply modal */}
      <Dialog open={applyOpen} onOpenChange={v => !v && setApplyOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Apply to be a Mentor</DialogTitle></DialogHeader>
          <MentorApplicationForm onSuccess={() => setApplyOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Booking modal */}
      <Dialog open={!!bookingMentor} onOpenChange={v => !v && setBookingMentor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book a Session</DialogTitle>
          </DialogHeader>
          {bookingMentor && (
            <BookingForm
              mentor={bookingMentor}
              onCancel={() => setBookingMentor(null)}
              onSuccess={() => {
                setBookingMentor(null)
                queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete mentor modal (Admin only) */}
      <Dialog open={!!deleteMentor} onOpenChange={v => !v && (setDeleteMentor(null), setDeleteReason(''), setDeleteError(null))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete Mentor</DialogTitle>
          </DialogHeader>
          {deleteMentor && (
            <div className="space-y-4">
              <p className="text-sm text-white/70">
                Are you sure you want to delete <span className="font-semibold text-white">{deleteMentor.profile.display_name ?? 'this mentor'}</span>?
              </p>
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <p className="text-xs text-red-400">
                  ⚠ This action cannot be undone. All mentor profiles and ratings will be permanently removed.
                </p>
              </div>
              
              {deleteError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <p className="text-sm text-red-400">{deleteError}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-white/55">Reason (optional)</label>
                <Input
                  className="h-11 border-[#2a2a2a] bg-[#0f0f0f] text-white placeholder:text-white/30 focus-visible:ring-red-500 focus-visible:ring-offset-0"
                  placeholder="Reason for deletion..."
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  maxLength={500}
                />
                <p className="text-xs text-white/40">{deleteReason.length}/500</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 border-[#2a2a2a] bg-[#1a1a1a] text-white hover:bg-[#222222]"
                  onClick={() => (setDeleteMentor(null), setDeleteReason(''), setDeleteError(null))}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  onClick={handleDeleteMentor}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Mentor'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}

export default MentorsPage
