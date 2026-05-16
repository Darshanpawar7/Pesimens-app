import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import {
  adaptiveRefetchIntervalWhenActive,
  adaptiveRefetchOnReconnect,
  adaptiveRefetchOnWindowFocus,
  adaptiveStaleTime,
} from '../lib/queryThrottle'

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  link?: string
  is_read: boolean
  created_at: string
}

export interface NotificationsResponse {
  items: Notification[]
  unread_count: number
  nextCursor: string | null
  hasMore: boolean
}

function extractMessageNotificationKey(notification: Notification): string {
  if (notification.type !== 'new_message') return `id:${notification.id}`

  if (notification.link) {
    try {
      const parsed = new URL(notification.link, 'https://pesimens.app')
      const conversationId = parsed.searchParams.get('conversation')
      if (conversationId) return `new_message:conversation:${conversationId}`
    } catch {
      // Ignore malformed links and fallback to title-based key.
    }
  }

  const normalizedTitle = notification.title
    .replace(/^new message from\s+/i, '')
    .trim()
    .toLowerCase()

  return normalizedTitle
    ? `new_message:title:${normalizedTitle}`
    : `new_message:id:${notification.id}`
}

export function dedupeNotifications(notifications: Notification[]): Notification[] {
  const sorted = [...notifications].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const latestByKey = new Map<string, Notification>()
  const hasUnreadByKey = new Map<string, boolean>()

  for (const notification of sorted) {
    const key = extractMessageNotificationKey(notification)
    if (!latestByKey.has(key)) {
      latestByKey.set(key, notification)
    }
    if (!notification.is_read) {
      hasUnreadByKey.set(key, true)
    }
  }

  return Array.from(latestByKey.entries()).map(([key, notification]) => ({
    ...notification,
    is_read: !hasUnreadByKey.get(key),
  }))
}

export function useNotifications(unreadOnly = false, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['notifications', { unreadOnly }],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams()
      if (pageParam) params.set('cursor', pageParam as string)
      if (unreadOnly) params.set('unread_only', 'true')
      return apiFetch<NotificationsResponse>(`/api/notifications?${params}`)
    },
    enabled,
    initialPageParam: null as string | null,
    getNextPageParam: page => page.hasMore ? page.nextCursor : undefined,
    staleTime: 30 * 1000, // 30s — notifications should be fairly fresh
  })
}

export function useUnreadCount(active = true) {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await apiFetch<NotificationsResponse>('/api/notifications?limit=1')
      return res.unread_count
    },
    enabled: active,
    staleTime: adaptiveStaleTime(5 * 60 * 1000), // 5 minutes
    refetchInterval: () => (active ? adaptiveRefetchIntervalWhenActive(5 * 60 * 1000, 'interactive') : false), // 5 minutes instead of 1 minute
    refetchOnWindowFocus: active && adaptiveRefetchOnWindowFocus(true, 'interactive'),
    refetchOnReconnect: active && adaptiveRefetchOnReconnect(true, 'interactive'),
  })
}

export function useMarkAsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ notification: Notification }>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useMarkAllAsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch<{ updated_count: number }>('/api/notifications/read-all', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useDeleteNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: boolean }>(`/api/notifications/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
