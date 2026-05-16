import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'

export interface Club {
  id: string
  name: string
  description?: string
  category: string
  logo_url?: string
  cover_image_url?: string
  instagram?: string
  linkedin?: string
  website?: string
  member_count: number
  is_approved: boolean
  created_at: string
  updated_at: string
  members?: ClubMember[]
  user_membership?: { role: string } | null
  upcoming_events?: unknown[]
}

export interface ClubMember {
  user_id: string
  role: 'member' | 'moderator' | 'admin'
  joined_at: string
  profile?: { id: string; display_name: string; avatar_url?: string }
}

export interface ClubsResponse {
  items: Club[]
  nextCursor: string | null
  hasMore: boolean
}

export interface ClubFilters {
  category?: string
  search?: string
}

export function useClubs(filters: ClubFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['clubs', filters],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams()
      if (pageParam) params.set('cursor', pageParam as string)
      if (filters.category) params.set('category', filters.category)
      if (filters.search) params.set('search', filters.search)
      return apiFetch<ClubsResponse>(`/api/clubs?${params}`)
    },
    initialPageParam: null as string | null,
    getNextPageParam: page => page.hasMore ? page.nextCursor : undefined,
    staleTime: 10 * 60 * 1000,
  })
}

export function useClub(id: string) {
  return useQuery({
    queryKey: ['clubs', id],
    queryFn: () => apiFetch<Club>(`/api/clubs/${id}`),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  })
}

export function useCreateClub() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Club>) =>
      apiFetch<{ club: Club }>('/api/clubs', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clubs'] }),
  })
}

export function useUpdateClub(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Club>) =>
      apiFetch<{ club: Club }>(`/api/clubs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clubs'] })
      qc.invalidateQueries({ queryKey: ['clubs', id] })
    },
  })
}

export function useJoinClub() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (clubId: string) =>
      apiFetch<{ membership: ClubMember }>(`/api/clubs/${clubId}/join`, { method: 'POST' }),
    onSuccess: (_data, clubId) => {
      qc.invalidateQueries({ queryKey: ['clubs', clubId] })
      qc.invalidateQueries({ queryKey: ['clubs'] })
    },
  })
}

export function useLeaveClub() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (clubId: string) =>
      apiFetch<{ success: boolean }>(`/api/clubs/${clubId}/leave`, { method: 'DELETE' }),
    onSuccess: (_data, clubId) => {
      qc.invalidateQueries({ queryKey: ['clubs', clubId] })
      qc.invalidateQueries({ queryKey: ['clubs'] })
    },
  })
}

export function useUpdateMemberRole(clubId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      apiFetch<{ membership: ClubMember }>(`/api/clubs/${clubId}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clubs', clubId] }),
  })
}

export function useRemoveMember(clubId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<{ success: boolean }>(`/api/clubs/${clubId}/members/${userId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clubs', clubId] }),
  })
}
