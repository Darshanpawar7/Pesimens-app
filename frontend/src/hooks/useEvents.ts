import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'

export interface Event {
  id: string
  title: string
  description?: string
  location: string
  start_time: string
  end_time: string
  max_capacity: number
  current_rsvp_count: number
  cover_image_url?: string
  category: string
  club_id?: string
  creator_id: string
  is_approved: boolean
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
  club?: { id: string; name: string; logo_url?: string }
  tags?: { tag: { id: number; name: string } }[]
  user_rsvp?: { status: string; checked_in: boolean } | null
}

export interface EventsResponse {
  items: Event[]
  nextCursor: string | null
  hasMore: boolean
}

export interface EventFilters {
  category?: string
  club_id?: string
  start_date?: string
  end_date?: string
  sort?: 'start_time' | 'rsvp_count'
  limit?: number
}

export function useEvents(filters: EventFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['events', filters],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams()
      if (pageParam) params.set('cursor', pageParam as string)
      if (filters.category) params.set('category', filters.category)
      if (filters.club_id) params.set('club_id', filters.club_id)
      if (filters.start_date) params.set('start_date', filters.start_date)
      if (filters.end_date) params.set('end_date', filters.end_date)
      if (filters.sort) params.set('sort', filters.sort)
      if (filters.limit) params.set('limit', String(filters.limit))
      return apiFetch<EventsResponse>(`/api/events?${params}`)
    },
    initialPageParam: null as string | null,
    getNextPageParam: page => page.hasMore ? page.nextCursor : undefined,
    staleTime: 5 * 60 * 1000,
  })
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: () => apiFetch<Event>(`/api/events/${id}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<{ event: Event }>('/api/events', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useUpdateEvent(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Event>) =>
      apiFetch<{ event: Event }>(`/api/events/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] })
      qc.invalidateQueries({ queryKey: ['events', id] })
    },
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: boolean }>(`/api/events/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useRSVP(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (status: 'going' | 'interested' | 'not_going') =>
      apiFetch<{ rsvp: unknown; event_full: boolean }>(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events', eventId] })
      qc.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useCancelRSVP(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch<{ success: boolean }>(`/api/events/${eventId}/rsvp`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events', eventId] })
      qc.invalidateQueries({ queryKey: ['events'] })
    },
  })
}
