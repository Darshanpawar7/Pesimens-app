import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type TouchEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, CheckCheck, Pencil, SendHorizontal } from 'lucide-react'
import { DetailBackButton } from '@/components/common/DetailBackButton'
import { apiFetch } from '@/lib/api'
import {
  adaptiveRefetchIntervalWhenActive,
  adaptiveRefetchOnReconnect,
  adaptiveRefetchOnWindowFocus,
  adaptiveStaleTime,
} from '@/lib/queryThrottle'
import { supabase } from '@/lib/supabase'
import { setupVisibilityAwareChannel } from '@/lib/realtimeVisibility'
import { UserAvatar } from '@/components/ui/avatar'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/use-toast'

interface MessageUser {
  id: string
  display_name: string | null
  avatar_url: string | null
  role: string
  campus: 'EC' | 'RR' | null
  branch: string | null
  is_online: boolean
  last_active_date?: string | null
  last_active_at?: string | null
}

interface ConversationItem {
  id: string
  last_message: string | null
  last_message_at: string | null
  unread_count: number
  other_participant: MessageUser | null
}

interface MessageItem {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_read: boolean
  read_at?: string | null
  created_at: string
}

interface ConversationDetail {
  conversation: ConversationItem
  messages: MessageItem[]
}

interface PresenceResponse {
  id: string
  last_active_date: string | null
  last_active_at: string | null
  is_online: boolean
}

type DeliveryState = 'sending' | 'sent' | 'seen'

function formatTimeAgo(iso: string | null): string {
  if (!iso) return ''
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.max(1, Math.floor(diffMs / 60000))
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

function showTimestamp(current: MessageItem, previous: MessageItem | null): boolean {
  if (!previous) return true
  const diffMs = new Date(current.created_at).getTime() - new Date(previous.created_at).getTime()
  return diffMs >= 15 * 60 * 1000
}

function isTemporaryMessageId(id: string): boolean {
  return id.startsWith('temp-')
}

function formatLastActive(lastActiveAt: string | null | undefined, lastActiveDate: string | null | undefined, isOnline: boolean): string {
  if (isOnline) return 'Active now'

  if (lastActiveAt) {
    const diffMs = Date.now() - new Date(lastActiveAt).getTime()
    const mins = Math.max(1, Math.floor(diffMs / 60000))
    if (mins < 60) return `Active ${mins}m ago`

    const hours = Math.floor(mins / 60)
    if (hours < 24) return `Active ${hours}h ago`
  }

  if (lastActiveDate) {
    return `Active ${new Date(lastActiveDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
  }

  return 'Offline'
}

function formatSeenTime(readAt: string | null | undefined): string {
  if (!readAt) return 'Seen'
  return `Seen ${new Date(readAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`
}

export default function MessagesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { profile } = useAuthStore()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [draftByThread, setDraftByThread] = useState<Record<string, string>>({})
  const [marketplaceRecipients, setMarketplaceRecipients] = useState<Record<string, true>>({})
  const [activeConversationId, setActiveConversationId] = useState<string | null>(searchParams.get('conversation'))
  const [pendingRecipientId, setPendingRecipientId] = useState<string | null>(searchParams.get('user'))
  const [mobileMode, setMobileMode] = useState<'list' | 'chat'>('list')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024)
  const [keyboardInset, setKeyboardInset] = useState(0)

  const swipeRootRef = useRef<HTMLDivElement | null>(null)
  const messagesScrollRef = useRef<HTMLDivElement | null>(null)
  const composerRef = useRef<HTMLDivElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const isSwipingRef = useRef(false)
  const swipeRafRef = useRef<number | null>(null)
  const swipeOffsetRef = useRef(0)
  const swipeArmedRef = useRef(false)

  const SWIPE_ARM_PX = 90
  const SWIPE_MAX_OFFSET = 104

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

  function getSwipeEdgeZonePx(viewportWidth: number): number {
    if (viewportWidth <= 390) return 24
    if (viewportWidth <= 768) return 32
    return 36
  }

  const conversationsQuery = useQuery({
    queryKey: ['messages-conversations'],
    queryFn: () => apiFetch<{ items: ConversationItem[] }>('/api/messages/conversations'),
    staleTime: adaptiveStaleTime(3 * 60 * 1000, 'interactive'), // 3 minutes
    refetchInterval: () => adaptiveRefetchIntervalWhenActive(3 * 60 * 1000, 'interactive'), // 3 minutes instead of 30 seconds
    refetchOnWindowFocus: adaptiveRefetchOnWindowFocus(true, 'interactive'),
    refetchOnReconnect: adaptiveRefetchOnReconnect(true, 'interactive'),
  })

  const userSearchQuery = useQuery({
    queryKey: ['messages-user-search', search],
    enabled: search.trim().length >= 2,
    queryFn: () =>
      apiFetch<{ items: MessageUser[] }>(
        `/api/messages/users/search?q=${encodeURIComponent(search.trim())}&limit=8`
      ),
  })

  const pendingRecipientQuery = useQuery({
    queryKey: ['messages-pending-recipient', pendingRecipientId],
    enabled: Boolean(pendingRecipientId),
    queryFn: () => apiFetch<{ profile: { id: string; display_name: string | null; avatar_url: string | null; role: string; campus: 'EC' | 'RR' | null; branch: string | null } }>(`/api/profiles/${pendingRecipientId}`),
  })

  const conversationDetailQuery = useQuery({
    queryKey: ['messages-conversation-detail', activeConversationId],
    enabled: Boolean(activeConversationId),
    queryFn: () => apiFetch<ConversationDetail>(`/api/messages/conversations/${activeConversationId}`),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const activeThreadKey = useMemo(() => {
    if (activeConversationId) return `conversation:${activeConversationId}`
    if (pendingRecipientId) return `pending:${pendingRecipientId}`
    return null
  }, [activeConversationId, pendingRecipientId])

  const conversationFromUrl = useMemo(() => {
    const raw = searchParams.get('conversation')
    return raw && raw.trim().length > 0 ? raw : null
  }, [searchParams])

  const userFromUrl = useMemo(() => {
    const raw = searchParams.get('user')
    return raw && raw.trim().length > 0 ? raw : null
  }, [searchParams])

  const sourceFromUrl = useMemo(() => {
    const raw = searchParams.get('source')
    return raw && raw.trim().length > 0 ? raw : null
  }, [searchParams])

  const prefillFromUrl = useMemo(() => {
    const raw = searchParams.get('prefill')
    if (!raw) return null
    const normalized = raw.trim().slice(0, 1000)
    return normalized.length > 0 ? normalized : null
  }, [searchParams])

  const messages = useMemo(() => {
    return conversationDetailQuery.data?.messages ?? []
  }, [conversationDetailQuery.data?.messages])

  const sendMutation = useMutation({
    mutationFn: async (variables: { content: string; tempId: string }) => {
      const trimmed = variables.content.trim()
      if (!trimmed) throw new Error('Message cannot be empty')

      if (activeConversationId) {
        const res = await apiFetch<{ message: MessageItem }>(
          `/api/messages/conversations/${activeConversationId}/send`,
          {
            method: 'POST',
            body: JSON.stringify({ content: trimmed }),
          }
        )
        return { mode: 'existing' as const, message: res.message, conversationId: activeConversationId, tempId: variables.tempId }
      }

      if (!pendingRecipientId) {
        throw new Error('Select a user to start chatting')
      }

      const res = await apiFetch<{ conversation_id: string; message: MessageItem }>(
        '/api/messages/conversations',
        {
          method: 'POST',
          body: JSON.stringify({ recipient_id: pendingRecipientId, message: trimmed }),
        }
      )

      return {
        mode: 'created' as const,
        message: res.message,
        conversationId: res.conversation_id,
        tempId: variables.tempId,
      }
    },
    onMutate: async variables => {
      if (!activeConversationId || !profile?.id) {
        return null
      }

      await queryClient.cancelQueries({ queryKey: ['messages-conversation-detail', activeConversationId] })
      const previous = queryClient.getQueryData<ConversationDetail>(['messages-conversation-detail', activeConversationId])

      const optimisticMessage: MessageItem = {
        id: variables.tempId,
        conversation_id: activeConversationId,
        sender_id: profile.id,
        content: variables.content.trim(),
        is_read: false,
        created_at: new Date().toISOString(),
      }

      queryClient.setQueryData<ConversationDetail | undefined>(
        ['messages-conversation-detail', activeConversationId],
        current => ({
          conversation:
            current?.conversation ?? {
              id: activeConversationId,
              last_message: optimisticMessage.content,
              last_message_at: optimisticMessage.created_at,
              unread_count: 0,
              other_participant: activeUser,
            },
          messages: [...(current?.messages ?? []), optimisticMessage],
        })
      )

      return {
        previous,
        conversationId: activeConversationId,
        tempId: variables.tempId,
      }
    },
    onSuccess: result => {
      setDraft('')
      if (activeThreadKey) {
        setDraftByThread(prev => ({
          ...prev,
          [activeThreadKey]: '',
        }))
      }

      queryClient.setQueryData<ConversationDetail | undefined>(
        ['messages-conversation-detail', result.conversationId],
        current => {
          const currentMessages = current?.messages ?? []

          const withoutTemp = currentMessages.filter(item => item.id !== result.tempId)
          if (withoutTemp.some(item => item.id === result.message.id)) return current

          return {
            conversation:
              current?.conversation ?? {
                id: result.conversationId,
                last_message: result.message.content,
                last_message_at: result.message.created_at,
                unread_count: 0,
                other_participant: activeUser,
              },
            messages: [...withoutTemp, result.message],
          }
        }
      )

      if (result.mode === 'created') {
        setActiveConversationId(result.conversationId)
        setPendingRecipientId(null)
        setSearchParams(prev => {
          const next = new URLSearchParams(prev)
          next.delete('user')
          return next
        })
      }

      void queryClient.invalidateQueries({ queryKey: ['messages-conversations'] })
      void queryClient.invalidateQueries({ queryKey: ['messages-unread-count'] })
      void queryClient.invalidateQueries({ queryKey: ['messages-conversation-detail', result.conversationId] })
    },
    onError: (_error, _variables, context) => {
      // Restore the previous snapshot for this specific conversation only,
      // so other in-flight optimistic messages are not wiped.
      if (context?.conversationId && context?.previous !== undefined) {
        queryClient.setQueryData(
          ['messages-conversation-detail', context.conversationId],
          context.previous
        )
      } else if (activeConversationId) {
        // Fallback: no snapshot — remove only the temp message that failed
        queryClient.setQueryData<ConversationDetail | undefined>(
          ['messages-conversation-detail', activeConversationId],
          current => {
            if (!current) return current
            return {
              ...current,
              messages: current.messages.filter(item => item.id !== _variables.tempId),
            }
          }
        )
      }

      toast({
        variant: 'error',
        title: 'Failed to send message',
        description: _error instanceof Error ? _error.message : 'Please try again',
      })
    },
  })

  const activeConversation = useMemo(() => {
    return (conversationsQuery.data?.items ?? []).find(item => item.id === activeConversationId) ?? null
  }, [conversationsQuery.data?.items, activeConversationId])

  const activeUser = useMemo(() => {
    if (activeConversation?.other_participant) return activeConversation.other_participant
    if (pendingRecipientId && pendingRecipientQuery.data?.profile) {
      const p = pendingRecipientQuery.data.profile
      return {
        id: p.id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        role: p.role,
        campus: p.campus,
        branch: p.branch,
        is_online: false,
      } as MessageUser
    }
    return null
  }, [activeConversation?.other_participant, pendingRecipientId, pendingRecipientQuery.data?.profile])

  const activePresenceQuery = useQuery({
    queryKey: ['messages-presence', activeConversation?.other_participant?.id],
    enabled: Boolean(activeConversation?.other_participant?.id),
    queryFn: () => apiFetch<PresenceResponse>(`/api/messages/presence/${activeConversation?.other_participant?.id}`),
    staleTime: adaptiveStaleTime(2 * 60 * 1000, 'interactive'), // 2 minutes
    refetchInterval: () => adaptiveRefetchIntervalWhenActive(2 * 60 * 1000, 'interactive'), // 2 minutes instead of 1 minute
    refetchOnWindowFocus: adaptiveRefetchOnWindowFocus(true, 'interactive'),
    refetchOnReconnect: adaptiveRefetchOnReconnect(true, 'interactive'),
  })

  const displayActiveUser = useMemo(() => {
    if (!activeUser) return null

    if (!activeConversationId || !activePresenceQuery.data) {
      return activeUser
    }

    return {
      ...activeUser,
      is_online: activePresenceQuery.data.is_online,
      last_active_at: activePresenceQuery.data.last_active_at,
      last_active_date: activePresenceQuery.data.last_active_date,
    }
  }, [activeUser, activeConversationId, activePresenceQuery.data])

  const latestMyMessageId = useMemo(() => {
    if (!profile?.id) return null

    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].sender_id === profile.id) {
        return messages[i].id
      }
    }

    return null
  }, [messages, profile?.id])

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    return () => {
      if (swipeRafRef.current !== null) {
        window.cancelAnimationFrame(swipeRafRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isMobile || !window.visualViewport) {
      setKeyboardInset(0)
      return
    }

    const viewport = window.visualViewport
    let rafId: number | null = null

    const updateInset = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }

      rafId = window.requestAnimationFrame(() => {
        const nextInset = Math.max(0, window.innerHeight - (viewport.height + viewport.offsetTop))
        setKeyboardInset(prev => (Math.abs(prev - nextInset) < 1 ? prev : nextInset))
      })
    }

    updateInset()
    viewport.addEventListener('resize', updateInset)
    viewport.addEventListener('scroll', updateInset)

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
      viewport.removeEventListener('resize', updateInset)
      viewport.removeEventListener('scroll', updateInset)
    }
  }, [isMobile])

  useEffect(() => {
    if (!messagesEndRef.current) return
    messagesEndRef.current.scrollIntoView({ behavior: isMobile ? 'auto' : 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!profile?.id) return

    const sendHeartbeat = () => {
      if (document.visibilityState !== 'visible') return

      void apiFetch<{ ok: boolean; last_active_at: string }>('/api/messages/presence/heartbeat', {
        method: 'POST',
      }).catch(() => {
        // Presence refresh should not block chat UX.
      })
    }

    sendHeartbeat()
    const interval = window.setInterval(sendHeartbeat, 60 * 1000)
    window.addEventListener('focus', sendHeartbeat)
    document.addEventListener('visibilitychange', sendHeartbeat)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', sendHeartbeat)
      document.removeEventListener('visibilitychange', sendHeartbeat)
    }
  }, [profile?.id])

  useEffect(() => {
    if (!activeThreadKey) {
      setDraft('')
      return
    }

    setDraft(draftByThread[activeThreadKey] ?? '')
  }, [activeThreadKey, draftByThread])

  useEffect(() => {
    const fromMarketplace = sourceFromUrl === 'marketplace'
    if (fromMarketplace && userFromUrl) {
      setMarketplaceRecipients(prev => {
        if (prev[userFromUrl]) return prev
        return {
          ...prev,
          [userFromUrl]: true,
        }
      })
    }

    if (!prefillFromUrl || !activeThreadKey) {
      if (fromMarketplace) {
        setSearchParams(prev => {
          if (!prev.has('source')) return prev
          const next = new URLSearchParams(prev)
          next.delete('source')
          return next
        })
      }
      return
    }

    setDraftByThread(prev => {
      const existing = prev[activeThreadKey] ?? ''
      if (existing.trim().length > 0 || existing === prefillFromUrl) return prev
      return {
        ...prev,
        [activeThreadKey]: prefillFromUrl,
      }
    })

    setDraft(current => (current.trim().length > 0 ? current : prefillFromUrl))

    setSearchParams(prev => {
      if (!prev.has('prefill') && !prev.has('source')) return prev
      const next = new URLSearchParams(prev)
      next.delete('prefill')
      next.delete('source')
      return next
    })
  }, [prefillFromUrl, activeThreadKey, setSearchParams, sourceFromUrl, userFromUrl])

  useEffect(() => {
    if (conversationFromUrl && conversationFromUrl !== activeConversationId) {
      setActiveConversationId(prev => (prev === conversationFromUrl ? prev : conversationFromUrl))
    }

    // If a conversation is selected in URL, it takes precedence over pending user intent.
    if (conversationFromUrl) {
      setPendingRecipientId(prev => (prev === null ? prev : null))
      return
    }

    if (!activeConversationId && userFromUrl !== pendingRecipientId) {
      setPendingRecipientId(prev => (prev === userFromUrl ? prev : userFromUrl))
    }
  }, [conversationFromUrl, userFromUrl, activeConversationId, pendingRecipientId])

  useEffect(() => {
    if (!pendingRecipientId || !conversationsQuery.data?.items) return
    const existing = conversationsQuery.data.items.find(item => item.other_participant?.id === pendingRecipientId)
    if (existing) {
      if (activeConversationId !== existing.id) {
        setActiveConversationId(existing.id)
      }
      if (isMobile) setMobileMode('chat')
      setSearchParams(prev => {
        const currentConversation = prev.get('conversation')
        const currentUser = prev.get('user')
        if (currentConversation === existing.id && !currentUser) {
          return prev
        }

        const next = new URLSearchParams(prev)
        next.set('conversation', existing.id)
        next.delete('user')
        return next
      })
    } else {
      // No existing conversation — show the compose panel on mobile
      if (isMobile) setMobileMode('chat')
    }
  }, [pendingRecipientId, conversationsQuery.data?.items, isMobile, setSearchParams, activeConversationId])

  // Switch to chat panel immediately on mobile when a pending recipient is set,
  // even before conversations have finished loading (covers the DM Mentor flow).
  useEffect(() => {
    if (pendingRecipientId && isMobile) setMobileMode('chat')
  }, [pendingRecipientId, isMobile])

  useEffect(() => {
    if (!activeConversationId || !conversationsQuery.data?.items) return
    const exists = conversationsQuery.data.items.some(item => item.id === activeConversationId)
    if (exists) return

    setActiveConversationId(null)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('conversation')
      return next
    })
  }, [activeConversationId, conversationsQuery.data?.items, setSearchParams])

  useEffect(() => {
    if (activeConversationId || pendingRecipientId) return
    const firstConversation = conversationsQuery.data?.items?.[0]
    if (!firstConversation) return
    if (!isMobile) {
      setActiveConversationId(firstConversation.id)
      setMobileMode('chat')
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        next.set('conversation', firstConversation.id)
        next.delete('user')
        return next
      })
    }
  }, [activeConversationId, pendingRecipientId, conversationsQuery.data?.items, isMobile, setSearchParams])

  useEffect(() => {
    if (!activeConversationId) return

    const currentOtherParticipant = activeConversation?.other_participant ?? null

    void queryClient.invalidateQueries({ queryKey: ['messages-conversation-detail', activeConversationId] })

    queryClient.setQueryData<{ items: ConversationItem[] } | undefined>(['messages-conversations'], current => {
      if (!current) return current
      return {
        items: current.items.map(item => {
          if (item.id !== activeConversationId) return item
          if (item.unread_count === 0) return item
          return { ...item, unread_count: 0 }
        }),
      }
    })

    void queryClient.invalidateQueries({ queryKey: ['messages-unread-count'] })

    return setupVisibilityAwareChannel(() =>
      supabase
        .channel(`messages-${activeConversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${activeConversationId}`,
          },
          payload => {
            const incoming = payload.new as MessageItem

            queryClient.setQueryData<ConversationDetail | undefined>(
              ['messages-conversation-detail', activeConversationId],
              current => {
                const currentMessages = current?.messages ?? []
                if (currentMessages.some(item => item.id === incoming.id)) return current

                return {
                  conversation:
                    current?.conversation ?? {
                      id: activeConversationId,
                      last_message: incoming.content,
                      last_message_at: incoming.created_at,
                      unread_count: 0,
                      other_participant: currentOtherParticipant,
                    },
                  messages: [...currentMessages, incoming],
                }
              }
            )

            void queryClient.invalidateQueries({ queryKey: ['messages-conversations'] })
            void queryClient.invalidateQueries({ queryKey: ['messages-unread-count'] })
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${activeConversationId}`,
          },
          payload => {
            const updated = payload.new as MessageItem

            queryClient.setQueryData<ConversationDetail | undefined>(
              ['messages-conversation-detail', activeConversationId],
              current => {
                if (!current) return current

                const hasMessage = current.messages.some(item => item.id === updated.id)
                if (!hasMessage) return current

                return {
                  ...current,
                  messages: current.messages.map(item => (item.id === updated.id ? { ...item, ...updated } : item)),
                }
              }
            )
          }
        )
        .subscribe()
    )
  }, [activeConversationId, queryClient])

  useEffect(() => {
    const targetUserId = activeConversation?.other_participant?.id
    if (!targetUserId) return

    return setupVisibilityAwareChannel(() =>
      supabase
        .channel(`presence-${targetUserId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${targetUserId}`,
          },
          payload => {
            const updated = payload.new as { id: string; last_active_at: string | null; last_active_date: string | null }
            const isOnlineNow = updated.last_active_at
              ? Date.now() - new Date(updated.last_active_at).getTime() <= 2 * 60 * 1000
              : false

            queryClient.setQueryData<PresenceResponse>(['messages-presence', targetUserId], {
              id: updated.id,
              last_active_at: updated.last_active_at,
              last_active_date: updated.last_active_date,
              is_online: isOnlineNow,
            })
          }
        )
        .subscribe()
    )
  }, [activeConversation?.other_participant?.id, queryClient])

  function handleSelectConversation(conversationId: string) {
    setActiveConversationId(conversationId)
    setPendingRecipientId(null)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('conversation', conversationId)
      next.delete('user')
      return next
    })
    if (isMobile) setMobileMode('chat')
  }

  function handleStartChat(user: MessageUser) {
    const existing = (conversationsQuery.data?.items ?? []).find(item => item.other_participant?.id === user.id)
    if (existing) {
      handleSelectConversation(existing.id)
      return
    }
    setPendingRecipientId(user.id)
    setActiveConversationId(null)
    setSearch('')
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('conversation')
      next.set('user', user.id)
      return next
    })
    if (isMobile) setMobileMode('chat')
  }

  function handleSend() {
    if (sendMutation.isPending) return
    void sendMutation.mutate({
      content: draft,
      tempId: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    })
  }

  function onDraftChange(nextValue: string) {
    const normalized = nextValue.slice(0, 1000)
    setDraft(normalized)
    if (!activeThreadKey) return
    setDraftByThread(prev => ({
      ...prev,
      [activeThreadKey]: normalized,
    }))
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  function getDeliveryState(message: MessageItem): DeliveryState | null {
    if (message.sender_id !== profile?.id) return null
    if (isTemporaryMessageId(message.id)) return 'sending'
    if (message.is_read) return 'seen'
    if (message.id !== latestMyMessageId) return null
    return message.is_read ? 'seen' : 'sent'
  }

  const conversationItems = conversationsQuery.data?.items ?? []
  const filteredConversations = conversationItems.filter(item => {
    if (!search.trim()) return true
    return (item.other_participant?.display_name ?? '').toLowerCase().includes(search.trim().toLowerCase())
  })
  const showMarketplaceQuickReplies = Boolean(displayActiveUser?.id && marketplaceRecipients[displayActiveUser.id])
  const marketplaceQuickReplies = [
    'Is the price negotiable?',
    'Can we meet on campus?',
    'Can you share more photos?',
  ]

  const showList = !isMobile || mobileMode === 'list'
  const showChat = !isMobile || mobileMode === 'chat'

  function renderDeliveryIndicator(message: MessageItem) {
    const state = getDeliveryState(message)
    if (!state) return null

    if (state === 'sending') {
      return (
        <p className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-white/45">
          <span>Sending</span>
        </p>
      )
    }

    if (state === 'seen') {
      return (
        <p className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-sky-300">
          <CheckCheck className="h-3 w-3" />
          <span>{formatSeenTime(message.read_at)}</span>
        </p>
      )
    }

    return (
      <p className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-white/45">
        <Check className="h-3 w-3" />
        <span>Sent</span>
      </p>
    )
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0]
    if (!touch) return

    const viewportWidth = window.innerWidth || document.documentElement.clientWidth
    const edgeZonePx = getSwipeEdgeZonePx(viewportWidth)
    const startsFromLeftEdge = touch.clientX <= edgeZonePx
    if (!startsFromLeftEdge) {
      touchStartRef.current = null
      isSwipingRef.current = false
      swipeArmedRef.current = false
      return
    }

    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    isSwipingRef.current = false
    swipeArmedRef.current = false
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current
    const touch = event.touches[0]
    if (!start || !touch) return

    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    const horizontalIntent = Math.abs(deltaX) > Math.abs(deltaY) + 12

    if (!horizontalIntent || deltaX <= 0) {
      if (isSwipingRef.current) {
        resetSwipeVisual()
        swipeArmedRef.current = false
      }
      return
    }

    isSwipingRef.current = true
    const nextOffset = Math.min(deltaX * 0.6, SWIPE_MAX_OFFSET)
    scheduleSwipeVisual(nextOffset)
    swipeArmedRef.current = nextOffset >= SWIPE_ARM_PX
  }

  function handleTouchEnd() {
    const shouldGoHome = swipeArmedRef.current
    touchStartRef.current = null
    isSwipingRef.current = false
    swipeArmedRef.current = false
    resetSwipeVisual()

    if (!shouldGoHome) return

    void apiFetch('/api/analytics/events', {
      method: 'POST',
      body: JSON.stringify({
        event_name: 'messages_swipe_to_home',
        properties: {
          mobile_mode: mobileMode,
        },
      }),
    }).catch(() => undefined)

    navigate('/')
  }

  function handleComposerFocus() {
    window.setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
    }, 80)
  }

  return (
    <div
      ref={swipeRootRef}
      className="relative h-full min-h-0 overflow-hidden bg-[#0f0f0f] text-white"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-20 w-24 bg-gradient-to-r from-indigo-500/25 via-indigo-500/10 to-transparent"
        style={{ opacity: 'calc(0.2 + var(--swipe-progress, 0) * 0.8)' }}
      />

      <div
        className="flex h-full min-h-0 transform-gpu bg-[#111111] transition-transform duration-200 perf-lite-swipe-track lg:mx-auto lg:max-w-7xl lg:rounded-xl lg:border lg:border-[#2a2a2a]"
        style={{ transform: 'translateX(var(--swipe-offset, 0px))' }}
      >
        {showList && (
          <aside className="flex w-full flex-col lg:w-[300px] lg:border-r lg:border-[#2a2a2a]">
            <div className="border-b border-[#2a2a2a] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DetailBackButton fallbackTo="/" forceFallback className="border-[#2a2a2a] bg-[#0f0f0f] px-2 py-1 text-[11px] text-white/85" />
                  <h1 className="text-lg font-semibold">Messages</h1>
                </div>
                <button type="button" className="rounded-lg p-2 text-white/70 hover:bg-[#1a1a1a] hover:text-white">
                  <Pencil className="h-4 w-4" />
                </button>
              </div>

              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search users to DM"
                className="h-10 w-full rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] px-3 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {search.trim().length >= 2 && (
                <div className="border-b border-[#2a2a2a] p-2">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white/45">Start a conversation</p>
                  {(userSearchQuery.data?.items ?? []).map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleStartChat(user)}
                      className="mt-1 flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-[#1a1a1a]"
                    >
                      <UserAvatar name={user.display_name} avatarUrl={user.avatar_url} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{user.display_name || 'Student'}</p>
                        <p className="text-xs text-white/50">{user.branch || 'Student'} · {user.campus || '--'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {filteredConversations.map(item => {
                const active = item.id === activeConversationId
                const otherUser = item.other_participant
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectConversation(item.id)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        handleSelectConversation(item.id)
                      }
                    }}
                    className={`relative flex w-full items-center gap-3 px-3 py-3 text-left transition perf-conversation-row hover:bg-[#1a1a1a] ${active ? 'bg-[#1a1a1a]' : ''}`}
                  >
                    {active && <span className="absolute left-0 top-0 h-full w-1 bg-indigo-500" />}
                    <button
                      type="button"
                      disabled={!otherUser?.id}
                      onClick={event => {
                        event.stopPropagation()
                        if (!otherUser?.id) return
                        navigate(`/profile/${otherUser.id}`)
                      }}
                      className="relative cursor-pointer rounded-full transition-opacity hover:opacity-80 disabled:cursor-default disabled:hover:opacity-100"
                    >
                      <UserAvatar
                        name={item.other_participant?.display_name}
                        avatarUrl={item.other_participant?.avatar_url}
                        size="md"
                      />
                      {item.other_participant?.is_online && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#111111] bg-emerald-400" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          disabled={!otherUser?.id}
                          onClick={event => {
                            event.stopPropagation()
                            if (!otherUser?.id) return
                            navigate(`/profile/${otherUser.id}`)
                          }}
                          className="truncate text-left text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:cursor-default disabled:hover:opacity-100"
                        >
                          {item.other_participant?.display_name || 'Unknown user'}
                        </button>
                        <span className="shrink-0 text-xs text-white/45">{formatTimeAgo(item.last_message_at)}</span>
                      </div>
                      <p className="truncate text-xs text-white/55">{item.last_message || 'Start conversation'}</p>
                    </div>
                    {item.unread_count > 0 && (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {item.unread_count}
                      </span>
                    )}
                  </div>
                )
              })}

              {conversationItems.length === 0 && !search.trim() && (
                <div className="px-5 py-14 text-center">
                  <p className="text-sm font-semibold text-white">No messages yet</p>
                  <p className="mt-1 text-xs text-white/55">DM a mentor or batchmate to get started</p>
                  <Link to="/mentors" className="mt-4 inline-block text-sm font-semibold text-indigo-300 hover:text-indigo-200">
                    Browse Mentors {'->'}
                  </Link>
                </div>
              )}
            </div>
          </aside>
        )}

        {showChat && (
          <section className="flex min-w-0 flex-1 flex-col" style={isMobile ? { paddingBottom: `${keyboardInset}px` } : undefined}>
            {displayActiveUser ? (
              <>
                <header className="flex items-center justify-between border-b border-[#2a2a2a] px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {isMobile && (
                      <button
                        type="button"
                        onClick={() => setMobileMode('list')}
                        className="rounded-md p-1 text-white/70 hover:bg-[#1a1a1a] hover:text-white"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(`/profile/${displayActiveUser.id}`)}
                      className="flex min-w-0 items-center gap-3 rounded-md transition-opacity hover:opacity-80"
                    >
                      <div className="relative">
                        <UserAvatar name={displayActiveUser.display_name} avatarUrl={displayActiveUser.avatar_url} size="sm" />
                        <span
                          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#111111] ${
                            displayActiveUser.is_online ? 'bg-emerald-400' : 'bg-zinc-500'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{displayActiveUser.display_name || 'Student'}</p>
                        <p className="text-xs text-white/50">
                          {formatLastActive(displayActiveUser.last_active_at, displayActiveUser.last_active_date, displayActiveUser.is_online)}
                        </p>
                      </div>
                    </button>
                  </div>
                  {displayActiveUser.role === 'mentor' && (
                    <button
                      type="button"
                      onClick={() => navigate('/mentors')}
                      className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5 text-xs font-semibold text-indigo-200 hover:border-indigo-400/50"
                    >
                      Book Session
                    </button>
                  )}
                </header>

                <div ref={messagesScrollRef} className="flex-1 overflow-y-auto bg-[#0f0f0f] px-4 py-4">
                  {messages.map((message, index) => {
                    const mine = message.sender_id === profile?.id
                    const prev = index > 0 ? messages[index - 1] : null
                    return (
                      <div key={message.id} className="mb-2 perf-message-row">
                        {showTimestamp(message, prev) && (
                          <p className="mb-2 text-center text-[11px] text-white/40">
                            {new Date(message.created_at).toLocaleString('en-IN')}
                          </p>
                        )}
                        <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                            <div
                              className={`whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                                mine ? 'bg-indigo-600 text-white' : 'bg-[#2a2a2a] text-white/95'
                              }`}
                            >
                              {message.content}
                            </div>
                            {mine && renderDeliveryIndicator(message)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div ref={composerRef} className="border-t border-[#2a2a2a] bg-[#111111] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
                  {showMarketplaceQuickReplies && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {marketplaceQuickReplies.map(reply => (
                        <button
                          key={reply}
                          type="button"
                          onClick={() => {
                            const combined = draft.trim().length > 0 ? `${draft.trim()} ${reply}` : reply
                            onDraftChange(combined)
                          }}
                          className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-200 hover:border-indigo-400/70 hover:bg-indigo-500/20"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <textarea
                      value={draft}
                      onChange={event => onDraftChange(event.target.value)}
                      onKeyDown={onInputKeyDown}
                      onFocus={handleComposerFocus}
                      placeholder="Type a message..."
                      rows={1}
                      className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      disabled={sendMutation.isPending || !draft.trim()}
                      onClick={handleSend}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white hover:brightness-110 disabled:opacity-55"
                    >
                      <SendHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid flex-1 place-items-center bg-[#0f0f0f] px-4 text-center">
                <div>
                  <p className="text-base font-semibold text-white">Select a conversation</p>
                  <p className="mt-1 text-sm text-white/55">Choose someone from the list to start chatting.</p>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
