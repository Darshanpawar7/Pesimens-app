import { useEffect, useMemo, useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Flag, MessageCircle, Pencil, Share2, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ApiError, apiFetch } from '@/lib/api'
import { cn, formatDistanceToNow } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { useConfessionsRealtime } from '@/hooks/useConfessionsRealtime'
import { useAuthStore } from '@/store/auth'

type Category = 'rant' | 'confession' | 'question' | 'hot_take'
type CategoryFilter = 'all' | Category

interface Confession {
  id: string
  content: string
  category: Category
  upvote_count: number
  comment_count?: number
  created_at: string
  user_has_upvoted: boolean
  user_has_downvoted?: boolean
  persona_emoji?: string | null
  persona_name?: string | null
}

interface ConfessionsResponse {
  items: Confession[]
  nextCursor: string | null
  hasMore: boolean
}

interface Persona {
  emoji: string
  name: string
}

interface ConfessionComment {
  id: string
  confession_id: string
  persona_emoji: string
  persona_name: string
  content: string
  created_at: string
}

interface ConfessionCommentsResponse {
  comments: ConfessionComment[]
  data?: {
    comments?: ConfessionComment[]
  }
}

interface CreateConfessionResponse {
  ok?: boolean
  confession: Confession
  delete_token?: string
}

interface CreateCommentResponse {
  ok?: boolean
  comment?: ConfessionComment
  delete_token?: string
  data?: { comment?: ConfessionComment }
}

type FeedSort = 'new' | 'top' | 'hot'

const DEFAULT_PERSONA: Persona = {
  emoji: '🤫',
  name: 'Anonymous',
}

const TOKEN_KEY = 'pesimens_delete_tokens'

const CATEGORY_FILTERS: Array<{ value: CategoryFilter; label: string }> = [
  { value: 'hot_take', label: '🔥 Hot' },
  { value: 'rant', label: '😤 Rant' },
  { value: 'all', label: '💀 Dark' },
  { value: 'confession', label: '💕 Crush' },
  { value: 'question', label: '📚 Academic' },
  { value: 'all', label: 'All' },
]

const CATEGORY_META: Record<Category, { label: string; emoji: string; badge: string; option: string }> = {
  rant: {
    label: 'Rant',
    emoji: '😤',
    badge: 'border-red-500/35 bg-red-500/15 text-red-200',
    option: 'border-red-500/35 bg-red-500/10 text-red-200',
  },
  confession: {
    label: 'Confession',
    emoji: '🤫',
    badge: 'border-purple-500/35 bg-purple-500/15 text-purple-200',
    option: 'border-purple-500/35 bg-purple-500/10 text-purple-200',
  },
  question: {
    label: 'Question',
    emoji: '🤔',
    badge: 'border-blue-500/35 bg-blue-500/15 text-blue-200',
    option: 'border-blue-500/35 bg-blue-500/10 text-blue-200',
  },
  hot_take: {
    label: 'Hot Take',
    emoji: '🔥',
    badge: 'border-orange-500/35 bg-orange-500/15 text-orange-200',
    option: 'border-orange-500/35 bg-orange-500/10 text-orange-200',
  },
}

const CATEGORY_BADGE_STYLES: Record<Category, string> = {
  rant: 'bg-[#fee2e2] text-[#dc2626]',
  confession: 'bg-[#ede9fe] text-[#7c3aed]',
  question: 'bg-[#dbeafe] text-[#1d4ed8]',
  hot_take: 'bg-[#fef3c7] text-[#d97706]',
}

function getResetCountdownLabel(now: Date) {
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  const diffMs = Math.max(0, midnight.getTime() - now.getTime())
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

function readDeleteTokens(): Record<string, string> {
  if (typeof window === 'undefined') return {}

  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    if (!raw) return {}

    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>
    }
  } catch {
    return {}
  }

  return {}
}

function saveDeleteToken(id: string, token: string) {
  const tokens = readDeleteTokens()
  tokens[id] = token
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens))
}

function getDeleteToken(id: string): string | null {
  const tokens = readDeleteTokens()
  return tokens[id] || null
}

function removeDeleteToken(id: string) {
  const tokens = readDeleteTokens()
  delete tokens[id]
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens))
}

function updateConfessionsCache(
  prev: InfiniteData<ConfessionsResponse> | undefined,
  confessionId: string,
  updater: (item: Confession) => Confession
): InfiniteData<ConfessionsResponse> | undefined {
  if (!prev) return prev
  return {
    ...prev,
    pages: safeArray(prev.pages).map(page => ({
      ...page,
      items: safeArray(page.items).map(item => (item.id === confessionId ? updater(item) : item)),
    })),
  }
}

export default function ConfessionsPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const { profile } = useAuthStore()
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const confessionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  useConfessionsRealtime()
  const canModerateConfessions = profile?.role === 'admin' || profile?.role === 'moderator'

  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all')
  const [feedSort, setFeedSort] = useState<FeedSort>('new')
  const [postOpen, setPostOpen] = useState(false)
  const [content, setContent] = useState('')
  const [postCategory, setPostCategory] = useState<Category>('confession')
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [commentsByConfession, setCommentsByConfession] = useState<Record<string, ConfessionComment[]>>({})
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({})
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [postingCommentId, setPostingCommentId] = useState<string | null>(null)
  const [focusedCommentId, setFocusedCommentId] = useState<string | null>(null)
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [resetCountdown, setResetCountdown] = useState(() => getResetCountdownLabel(new Date()))
  const [confirmDeleteConfessionId, setConfirmDeleteConfessionId] = useState<string | null>(null)
  const [deletingConfessionId, setDeletingConfessionId] = useState<string | null>(null)
  const [confirmDeleteCommentKey, setConfirmDeleteCommentKey] = useState<string | null>(null)
  const [deletingCommentKey, setDeletingCommentKey] = useState<string | null>(null)
  const [highlightCommentId, setHighlightCommentId] = useState<string | null>(null)

  useEffect(() => {
    const dismissed = localStorage.getItem('pesimens_confession_banner_dismissed')
    setBannerDismissed(dismissed === '1')
  }, [])

  useEffect(() => {
    const tick = () => setResetCountdown(getResetCountdownLabel(new Date()))
    tick()
    const interval = setInterval(tick, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const myPersonaQuery = useQuery({
    queryKey: ['confessions', 'my-persona'],
    queryFn: () => apiFetch<Persona>('/api/confessions/my-persona'),
    staleTime: 60 * 1000,
    retry: false,
  })

  const myPersona = myPersonaQuery.data ?? DEFAULT_PERSONA

  function dismissBanner() {
    localStorage.setItem('pesimens_confession_banner_dismissed', '1')
    setBannerDismissed(true)
  }

  const confessionsQuery = useInfiniteQuery({
    queryKey: ['confessions', selectedCategory],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams()
      params.set('limit', '20')
      if (selectedCategory !== 'all') params.set('category', selectedCategory)
      if (pageParam) params.set('cursor', pageParam as string)
      return apiFetch<ConfessionsResponse>(`/api/confessions?${params.toString()}`)
    },
    initialPageParam: null as string | null,
    getNextPageParam: page => (page.hasMore ? page.nextCursor : undefined),
    staleTime: 30 * 1000,
  })

  const fetchedConfessions = useMemo(
    () => confessionsQuery.data?.pages.flatMap(page => page.items) ?? [],
    [confessionsQuery.data]
  )

  const confessions = useMemo(() => {
    const items = [...fetchedConfessions]

    if (feedSort === 'new') {
      return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    if (feedSort === 'top') {
      return items.sort((a, b) => b.upvote_count - a.upvote_count)
    }

    return items.sort(
      (a, b) =>
        b.upvote_count * 2 + (b.comment_count ?? 0) - (a.upvote_count * 2 + (a.comment_count ?? 0))
    )
  }, [feedSort, fetchedConfessions])

  const totalConfessions = confessions.length

  const focusConfessionId = searchParams.get('focusConfession')
  const focusCommentId = searchParams.get('focusComment')

  const trendingConfessions = useMemo(
    () => [...fetchedConfessions].sort((a, b) => b.upvote_count - a.upvote_count).slice(0, 3),
    [fetchedConfessions]
  )

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      entries => {
        const first = entries[0]
        if (first.isIntersecting && confessionsQuery.hasNextPage && !confessionsQuery.isFetchingNextPage) {
          confessionsQuery.fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [confessionsQuery])

  useEffect(() => {
    if (!focusConfessionId) return

    const target = confessions.find(item => item.id === focusConfessionId)
    if (!target) {
      if (confessionsQuery.hasNextPage && !confessionsQuery.isFetchingNextPage) {
        void confessionsQuery.fetchNextPage()
      }
      return
    }

    if (expandedId !== focusConfessionId) {
      setExpandedId(focusConfessionId)
    }

    if (!commentsByConfession[focusConfessionId] && !loadingComments[focusConfessionId]) {
      void fetchComments(focusConfessionId)
    }

    const confessionEl = confessionRefs.current[focusConfessionId]
    if (confessionEl) {
      confessionEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    if (!focusCommentId) {
      const next = new URLSearchParams(searchParams)
      next.delete('focusConfession')
      setSearchParams(next, { replace: true })
      return
    }

    const comments = commentsByConfession[focusConfessionId] ?? []
    const targetComment = comments.find(comment => comment.id === focusCommentId)
    if (!targetComment) return

    setHighlightCommentId(focusCommentId)
    setTimeout(() => setHighlightCommentId(prev => (prev === focusCommentId ? null : prev)), 2500)

    setTimeout(() => {
      const commentEl = document.getElementById(`comment-${focusCommentId}`)
      if (commentEl) {
        commentEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 120)

    const next = new URLSearchParams(searchParams)
    next.delete('focusConfession')
    next.delete('focusComment')
    setSearchParams(next, { replace: true })
  }, [
    commentsByConfession,
    confessions,
    confessionsQuery,
    expandedId,
    focusCommentId,
    focusConfessionId,
    loadingComments,
    searchParams,
    setSearchParams,
  ])

  const createMutation = useMutation({
    mutationFn: (payload: { content: string; category: Category }) =>
      apiFetch<CreateConfessionResponse>('/api/confessions', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: response => {
      if (response?.confession?.id && response?.delete_token) {
        saveDeleteToken(response.confession.id, response.delete_token)
      }

      setPostOpen(false)
      setContent('')
      setPostCategory('confession')
      queryClient.invalidateQueries({ queryKey: ['confessions'] })
      toast({ variant: 'success', title: 'Posted anonymously' })
    },
    onError: (error: unknown) => {
      toast({
        variant: 'error',
        title: 'Failed to post confession',
        description: error instanceof Error ? error.message : 'Please try again',
      })
    },
  })

  const upvoteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiFetch<{ upvoted: boolean; downvoted?: boolean; upvote_count: number }>(`/api/confessions/${id}/upvote`, { method: 'POST' }),
  })

  const downvoteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      apiFetch<{ downvoted: boolean; upvoted?: boolean; upvote_count: number }>(`/api/confessions/${id}/downvote`, { method: 'POST' }),
  })

  const commentMutation = useMutation({
    mutationFn: ({ confessionId, content: commentContent }: { confessionId: string; content: string }) =>
      apiFetch<CreateCommentResponse>(`/api/confessions/${confessionId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: commentContent }),
      }),
  })

  async function handleToggleUpvote(confession: Confession) {
    const currentlyUpvoted = confession.user_has_upvoted
    const currentlyDownvoted = Boolean(confession.user_has_downvoted)

    const nextUpvoted = !currentlyUpvoted
    const nextDownvoted = false
    const countDelta = currentlyUpvoted ? -1 : currentlyDownvoted ? 2 : 1
    const nextCount = confession.upvote_count + countDelta

    queryClient.setQueriesData<InfiniteData<ConfessionsResponse>>(
      { queryKey: ['confessions'] },
      prev => updateConfessionsCache(prev, confession.id, item => ({
        ...item,
        user_has_upvoted: nextUpvoted,
        user_has_downvoted: nextDownvoted,
        upvote_count: nextCount,
      }))
    )

    try {
      const res = await upvoteMutation.mutateAsync({ id: confession.id })
      queryClient.setQueriesData<InfiniteData<ConfessionsResponse>>(
        { queryKey: ['confessions'] },
        prev => updateConfessionsCache(prev, confession.id, item => ({
          ...item,
          user_has_upvoted: res.upvoted,
          user_has_downvoted: res.downvoted ?? false,
          upvote_count: res.upvote_count,
        }))
      )
    } catch (error) {
      queryClient.invalidateQueries({ queryKey: ['confessions'] })
      toast({
        variant: 'error',
        title: 'Could not update upvote',
        description: error instanceof Error ? error.message : 'Please try again',
      })
    }
  }

  async function handleDownvote(confessionId: string, event: React.MouseEvent) {
    event.stopPropagation()

    const target = confessions.find(item => item.id === confessionId)
    if (!target) return

    const currentlyDownvoted = Boolean(target.user_has_downvoted)
    const currentlyUpvoted = target.user_has_upvoted
    const nextDownvoted = !currentlyDownvoted
    const nextUpvoted = false
    const countDelta = currentlyDownvoted ? 1 : currentlyUpvoted ? -2 : -1
    const nextCount = target.upvote_count + countDelta

    queryClient.setQueriesData<InfiniteData<ConfessionsResponse>>(
      { queryKey: ['confessions'] },
      prev =>
        updateConfessionsCache(prev, confessionId, item => ({
          ...item,
          user_has_downvoted: nextDownvoted,
          user_has_upvoted: nextUpvoted,
          upvote_count: nextCount,
        }))
    )

    try {
      const result = await downvoteMutation.mutateAsync({ id: confessionId })

      queryClient.setQueriesData<InfiniteData<ConfessionsResponse>>(
        { queryKey: ['confessions'] },
        prev =>
          updateConfessionsCache(prev, confessionId, item => ({
            ...item,
            upvote_count: result.upvote_count ?? item.upvote_count,
            user_has_downvoted: result.downvoted,
            user_has_upvoted: result.upvoted ?? false,
          }))
      )
    } catch (error) {
      console.error('[downvote] error:', error)
      queryClient.invalidateQueries({ queryKey: ['confessions'] })
      toast({
        variant: 'error',
        title: 'Could not update downvote',
        description: error instanceof Error ? error.message : 'Please try again',
      })
    }
  }

  async function fetchComments(confessionId: string) {
    setLoadingComments(prev => ({ ...prev, [confessionId]: true }))
    try {
      const res = await apiFetch<ConfessionCommentsResponse>(`/api/confessions/${confessionId}/comments`)
      const comments = res?.comments || res?.data?.comments || []
      setCommentsByConfession(prev => ({
        ...prev,
        [confessionId]: Array.isArray(comments) ? comments : [],
      }))
    } catch (error) {
      console.error('Failed to load comments:', error)
      setCommentsByConfession(prev => ({
        ...prev,
        [confessionId]: [],
      }))
      toast({
        variant: 'error',
        title: 'Failed to load comments',
        description: error instanceof Error ? error.message : 'Please try again',
      })
    } finally {
      setLoadingComments(prev => ({ ...prev, [confessionId]: false }))
    }
  }

  function handleExpandComments(confessionId: string) {
    if (expandedId === confessionId) {
      setExpandedId(null)
      return
    }

    setExpandedId(confessionId)
    fetchComments(confessionId)
  }

  async function handleShare(confessionId: string, confessionText: string) {
    try {
      await navigator.clipboard.writeText(confessionText)
      setCopiedShareId(confessionId)
      setTimeout(() => setCopiedShareId(prev => (prev === confessionId ? null : prev)), 1500)
    } catch {
      toast({ variant: 'error', title: 'Could not copy to clipboard' })
    }
  }

  async function handleReport(confessionId: string) {
    try {
      await apiFetch(`/api/confessions/${confessionId}/flag`, { method: 'POST' })
      toast({ variant: 'success', title: 'Thanks for reporting' })
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        toast({ variant: 'success', title: 'Already reported' })
        return
      }

      const message = error instanceof Error ? error.message : 'Please try again in a moment.'
      toast({ variant: 'error', title: 'Could not submit report', description: message })
    }
  }

  function updateConfessionCommentCount(confessionId: string, delta: number) {
    queryClient.setQueriesData<InfiniteData<ConfessionsResponse>>(
      { queryKey: ['confessions'] },
      prev =>
        updateConfessionsCache(prev, confessionId, item => ({
          ...item,
          comment_count: Math.max(0, (item.comment_count ?? 0) + delta),
        }))
    )
  }

  function canDeleteConfession(confession: Confession) {
    if (canModerateConfessions) return true
    if (getDeleteToken(confession.id)) return true
    // owner_hash is verified server-side — always show delete button for own posts
    // The backend will confirm ownership; we just need to attempt the request
    // PERSONA_MATCH fallback: only within 1 hour (for old posts without owner_hash)
    const ONE_HOUR_MS = 60 * 60 * 1000
    const isWithinHour = Date.now() - new Date(confession.created_at).getTime() < ONE_HOUR_MS
    const samePersona =
      Boolean(myPersona) &&
      confession.persona_name === myPersona.name &&
      confession.persona_emoji === myPersona.emoji
    return isWithinHour && samePersona
  }

  function canDeleteComment(commentId: string) {
    return canModerateConfessions || Boolean(getDeleteToken(commentId))
  }

  async function handleSubmitComment(confessionId: string) {
    if (postingCommentId === confessionId) return

    const draft = (commentDrafts[confessionId] ?? '').trim()
    if (!draft) return

    setPostingCommentId(confessionId)

    try {
      const response = await commentMutation.mutateAsync({ confessionId, content: draft })

      const newComment = response?.comment || response?.data?.comment

      if (newComment) {
        if (response?.delete_token) {
          saveDeleteToken(newComment.id, response.delete_token)
        }
        setCommentsByConfession(prev => {
          const existing = prev[confessionId] ?? []
          if (existing.find(comment => comment.id === newComment.id)) {
            return prev
          }

          return {
            ...prev,
            [confessionId]: [...existing, newComment],
          }
        })
        updateConfessionCommentCount(confessionId, 1)
        setCommentDrafts(prev => ({ ...prev, [confessionId]: '' }))
        setFocusedCommentId(null)
      }
    } catch (error) {
      console.error('Failed to post comment:', error)
      toast({
        variant: 'error',
        title: 'Failed to post comment',
        description: error instanceof Error ? error.message : 'Please try again',
      })
    } finally {
      setPostingCommentId(null)
    }
  }

  function handleSubmitPost() {
    const trimmed = content.trim()
    if (!trimmed) return
    createMutation.mutate({ content: trimmed, category: postCategory })
  }

  function getCommentDeleteKey(confessionId: string, commentId: string) {
    return `${confessionId}:${commentId}`
  }

  async function handleDeleteConfession(confessionId: string) {
    // Priority: admin override → localStorage token → owner_hash (server verifies) → PERSONA_MATCH legacy
    const token = canModerateConfessions
      ? 'ADMIN_OVERRIDE'
      : (getDeleteToken(confessionId) ?? 'OWNER_HASH')

    setDeletingConfessionId(confessionId)

    try {
      await apiFetch<{ ok: boolean; deleted: boolean }>(`/api/confessions/${confessionId}`, {
        method: 'DELETE',
        body: JSON.stringify({ delete_token: token }),
      })

      removeDeleteToken(confessionId)
      setCommentsByConfession(prev => {
        const next = { ...prev }
        delete next[confessionId]
        return next
      })

      queryClient.setQueriesData<InfiniteData<ConfessionsResponse>>({ queryKey: ['confessions'] }, prev => {
        if (!prev) return prev
        return {
          ...prev,
          pages: safeArray(prev.pages).map(page => ({
            ...page,
            items: safeArray(page.items).filter(item => item.id !== confessionId),
          })),
        }
      })

      if (expandedId === confessionId) {
        setExpandedId(null)
      }

      setConfirmDeleteConfessionId(null)
      toast({ variant: 'success', title: 'Confession deleted' })
    } catch (error) {
      toast({
        variant: 'error',
        title: 'Failed to delete confession',
        description: error instanceof Error ? error.message : 'Please try again',
      })
    } finally {
      setDeletingConfessionId(null)
    }
  }

  async function handleDeleteComment(confessionId: string, commentId: string) {
    const token = canModerateConfessions ? 'ADMIN_OVERRIDE' : getDeleteToken(commentId)
    if (!token) {
      toast({ variant: 'error', title: 'Delete token missing for this comment' })
      return
    }

    const deleteKey = getCommentDeleteKey(confessionId, commentId)
    setDeletingCommentKey(deleteKey)

    try {
      await apiFetch<{ ok: boolean; deleted: boolean }>(`/api/confessions/${confessionId}/comments/${commentId}`, {
        method: 'DELETE',
        body: JSON.stringify({ delete_token: token }),
      })

      removeDeleteToken(commentId)
      setCommentsByConfession(prev => ({
        ...prev,
        [confessionId]: safeArray(prev[confessionId]).filter(comment => comment.id !== commentId),
      }))
      updateConfessionCommentCount(confessionId, -1)
      setConfirmDeleteCommentKey(null)
      toast({ variant: 'success', title: 'Comment deleted' })
    } catch (error) {
      toast({
        variant: 'error',
        title: 'Failed to delete comment',
        description: error instanceof Error ? error.message : 'Please try again',
      })
    } finally {
      setDeletingCommentKey(null)
    }
  }

  function scrollToConfession(confessionId: string) {
    const element = confessionRefs.current[confessionId]
    if (!element) return
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="w-full min-h-full overflow-x-clip bg-[#0f0f0f] text-white">
      <style>{`
        @keyframes persona-float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(1deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes conf-shimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
        .persona-float {
          animation: persona-float 3.2s ease-in-out infinite;
        }
        .conf-comment-shimmer {
          background: linear-gradient(90deg, #171717 25%, #242424 37%, #171717 63%);
          background-size: 200% 100%;
          animation: conf-shimmer 1.2s linear infinite;
        }
      `}</style>

      <div className="mx-auto w-full max-w-6xl px-3 py-6 pb-32 sm:px-4 sm:pb-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#f8fafc]">Confessions 🤫</h1>
            <p className="mt-1 text-sm text-[#cbd5e1]">Anonymous thoughts from PESU students</p>
          </div>
          <Button
            onClick={() => setPostOpen(true)}
            size="icon"
            className="hidden sm:inline-flex rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-500/90 hover:to-indigo-600/90"
            aria-label="Post a Confession"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,680px)_300px] lg:items-start">
          <div className="min-w-0">
            {!bannerDismissed && (
              <section
                className="relative mb-6 rounded-2xl border p-5"
                style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.05))',
                  border: '1px solid rgba(16,185,129,0.2)',
                  borderRadius: '1rem',
                  padding: '1.25rem 1.5rem',
                  marginBottom: '1.5rem',
                }}
              >
                <button
                  onClick={dismissBanner}
                  className="absolute right-4 top-4 rounded-md px-2 py-1 text-sm text-white/70 hover:bg-white/10 hover:text-white"
                  aria-label="Dismiss anonymity info"
                >
                  ✕
                </button>

                <h2 className="text-base font-semibold text-white">🔒 Your identity is protected</h2>

                <div className="mt-3 space-y-1.5 text-sm text-gray-300">
                  <p><span className="mr-2 text-emerald-400">✓</span>We never store who posted what</p>
                  <p><span className="mr-2 text-emerald-400">✓</span>Your SRN is never linked to confessions</p>
                  <p><span className="mr-2 text-emerald-400">✓</span>Your persona changes every 24 hours</p>
                  <p><span className="mr-2 text-emerald-400">✓</span>Even admins cannot see who posted</p>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-300">Today you are:</p>
                  <span className="mt-1 inline-flex rounded-full border border-indigo-400/30 bg-indigo-500/20 px-3 py-1 text-sm font-semibold text-white">
                    {myPersona.emoji} {myPersona.name}
                  </span>
                  <p className="mt-1 text-xs text-gray-400">(Changes tomorrow at midnight)</p>
                </div>
              </section>
            )}

            <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
              {safeArray(CATEGORY_FILTERS).map(option => (
                <button
                  key={`${option.value}-${option.label}`}
                  onClick={() => setSelectedCategory(option.value)}
                  className={cn(
                    'whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-[0.03em] transition-colors',
                    selectedCategory === option.value
                      ? 'border-[#565fc8] bg-[#1a1f35] text-[#e8ebff]'
                      : 'border-[#262626] bg-[#141414] text-[#8f97a8] hover:border-[#333333] hover:text-[#c8cedb]'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="mb-3 inline-flex items-center gap-1 rounded-full border border-[#262626] bg-[#131313] p-1">
              {safeArray<FeedSort>(['new', 'top', 'hot']).map(sort => {
                const active = feedSort === sort
                return (
                  <button
                    key={sort}
                    onClick={() => setFeedSort(sort)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
                      active
                        ? 'bg-[#20263f] text-[#e2e8f0]'
                        : 'text-[#7c8596] hover:text-[#d1d5db]'
                    )}
                  >
                    {sort}
                  </button>
                )
              })}
            </div>

            <p className="mb-4 text-xs font-medium uppercase tracking-[0.08em] text-[#8c94a8]">{totalConfessions} confessions</p>

            <div>
              {confessionsQuery.isLoading && (
                <div className="space-y-2">
                  {safeArray(Array.from({ length: 3 })).map((_, idx) => (
                    <div key={idx} className="overflow-hidden rounded-[12px] border border-[#2a2a2a]">
                      <div className="flex h-[140px]">
                        <div className="w-[44px] border-r border-[#2a2a2a] bg-[#111111]" />
                        <div className="flex-1 animate-pulse bg-[#1a1a1a]" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!confessionsQuery.isLoading && confessions.length === 0 && (
                <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-8 text-center">
                  <p className="text-sm text-white/70">No posts in this category yet.</p>
                  <p className="mt-1 text-xs text-white/45">Start the conversation anonymously.</p>
                </div>
              )}

              {safeArray(confessions).map(confession => {
                const meta = CATEGORY_META[confession.category]
                const personaEmoji = confession.persona_emoji ?? DEFAULT_PERSONA.emoji
                const personaName = confession.persona_name ?? DEFAULT_PERSONA.name
                const commentCount = confession.comment_count ?? 0
                const draft = commentDrafts[confession.id] ?? ''
                const isExpanded = expandedId === confession.id
                const isCommentFocused = focusedCommentId === confession.id
                const canDeleteThisConfession = canDeleteConfession(confession)
                const isConfessionDeleteConfirmOpen = confirmDeleteConfessionId === confession.id

                return (
                  <div
                    key={confession.id}
                    className="mb-4 min-w-0"
                    ref={el => {
                      confessionRefs.current[confession.id] = el
                    }}
                  >
                    <article
                      className={cn(
                        'overflow-hidden border bg-[#121212] transition-colors',
                        isExpanded
                          ? 'rounded-t-2xl rounded-b-none border-[#4f5bb8]'
                          : 'rounded-2xl border-[#242424] hover:border-[#353535]'
                      )}
                    >
                      <div className="flex min-w-0">
                        <div className="w-[42px] shrink-0 border-r border-[#232323] bg-[#101010]">
                          <div className="flex min-h-[128px] flex-col items-center gap-1.5 py-2.5">
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                handleToggleUpvote(confession)
                              }}
                              disabled={upvoteMutation.isPending}
                              aria-label={`Upvote — ${confession.upvote_count}`}
                              className={cn(
                                'rounded-md p-1 text-[18px] leading-none transition-all duration-150',
                                confession.user_has_upvoted
                                  ? 'text-[#6366f1]'
                                  : 'text-[#6b7280] hover:bg-[#1a1f35] hover:text-[#7d84ff]'
                              )}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>

                            <span
                              className="min-w-[20px] text-center text-[13px] font-bold"
                              style={{
                                color:
                                  confession.upvote_count > 0
                                    ? '#6366f1'
                                    : confession.upvote_count < 0
                                      ? '#ef4444'
                                      : '#9ca3af',
                                fontWeight: 700,
                                fontSize: '13px',
                              }}
                            >
                              {confession.upvote_count}
                            </span>

                            <button
                              onClick={e => {
                                void handleDownvote(confession.id, e)
                              }}
                              disabled={downvoteMutation.isPending}
                              aria-label="Downvote"
                              className={cn(
                                'rounded-md p-1 text-[18px] leading-none transition-all duration-150 hover:bg-[#2b1414] hover:text-[#ef4444]',
                                confession.user_has_downvoted
                                  ? 'bg-[#2b1414] text-[#ef4444]'
                                  : 'text-[#6b7280]'
                              )}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div
                          onClick={() => handleExpandComments(confession.id)}
                          className="min-w-0 flex-1 cursor-pointer rounded-r-2xl border border-l-0 border-[#242424] bg-[linear-gradient(180deg,#171717_0%,#141414_100%)] px-4 py-3.5 transition-colors hover:border-[#3d3d3d]"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span
                              className={cn(
                                'rounded-full px-2 py-[2px] text-[10px] font-semibold uppercase tracking-[0.08em] opacity-90',
                                CATEGORY_BADGE_STYLES[confession.category]
                              )}
                            >
                              {meta.label}
                            </span>
                            <span className="text-[12px] text-[#c4c9d4]">
                              {personaEmoji} {personaName}
                            </span>
                            <span className="text-gray-600">•</span>
                            <span className="text-[11px] text-[#8f97a8]">{formatDistanceToNow(confession.created_at)}</span>
                          </div>

                          <p className={cn('mt-2.5 break-words text-[18px] font-normal leading-[1.7] tracking-[0.005em] text-[#f5f7fb]', !isExpanded && 'line-clamp-4')}>
                            {confession.content}
                          </p>

                          <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-[#242424] pt-2.5 sm:gap-2.5">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation()
                                handleExpandComments(confession.id)
                              }}
                              className={cn(
                                'flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-all duration-150 hover:bg-[#202020] hover:text-[#e5e7eb]',
                                isExpanded ? 'text-[#8c92ff]' : 'text-[#8d94a5]'
                              )}
                            >
                              <MessageCircle className="h-3.5 w-3.5" /> {commentCount}
                            </button>

                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation()
                                handleShare(confession.id, confession.content)
                              }}
                              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-[#8d94a5] transition-all duration-150 hover:bg-[#202020] hover:text-[#e5e7eb]"
                            >
                              <Share2 className="h-3.5 w-3.5" /> {copiedShareId === confession.id ? 'Copied!' : 'Share'}
                            </button>

                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation()
                                void handleReport(confession.id)
                              }}
                              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-[#8d94a5] transition-all duration-150 hover:bg-[#202020] hover:text-[#e5e7eb]"
                            >
                              <Flag className="h-3.5 w-3.5" /> Report
                            </button>

                            {canDeleteThisConfession && (
                              isConfessionDeleteConfirmOpen ? (
                                <div className="flex items-center gap-1.5 rounded-md border border-red-500/20 bg-red-500/5 px-1.5 py-1 text-xs text-gray-300">
                                  <span>Sure?</span>
                                  <button
                                    type="button"
                                    disabled={deletingConfessionId === confession.id}
                                    onClick={e => {
                                      e.stopPropagation()
                                      void handleDeleteConfession(confession.id)
                                    }}
                                    className="rounded-md px-2 py-1 font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                                  >
                                    Yes, delete
                                  </button>
                                  <button
                                    type="button"
                                    disabled={deletingConfessionId === confession.id}
                                    onClick={e => {
                                      e.stopPropagation()
                                      setConfirmDeleteConfessionId(null)
                                    }}
                                    className="rounded-md px-2 py-1 font-semibold text-gray-400 transition-colors hover:bg-[#2a2a2a]"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation()
                                    setConfirmDeleteConfessionId(confession.id)
                                  }}
                                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[#6b7280] transition-all duration-150 hover:bg-red-500/10 hover:text-[#ef4444]"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Delete
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </article>

                    {isExpanded && (
                      <section className="mb-2 rounded-b-2xl border border-t-0 border-[#4f5bb8] bg-[#101010]">
                        <div className="border-b border-[#1f1f1f] px-4 py-3.5">
                          <div className="flex items-start gap-3">
                            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-indigo-500/20 text-sm">
                              {myPersona.emoji}
                            </div>

                            <div className="min-w-0 flex-1">
                              <textarea
                                value={draft}
                                onFocus={() => setFocusedCommentId(confession.id)}
                                onChange={e =>
                                  setCommentDrafts(prev => ({
                                    ...prev,
                                    [confession.id]: e.target.value.slice(0, 300),
                                  }))
                                }
                                rows={1}
                                placeholder={`Write a reply as ${myPersona.emoji} ${myPersona.name}...`}
                                className={cn(
                                  'w-full resize-none rounded-xl border border-[#2a2a2a] bg-[#161616] px-3 py-2.5 text-sm text-white outline-none transition-all duration-200 placeholder:text-gray-500 focus:border-[#6366f1]',
                                  isCommentFocused ? 'min-h-[80px]' : 'min-h-[36px]'
                                )}
                              />

                              {isCommentFocused && (
                                <div className="mt-2 flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCommentDrafts(prev => ({ ...prev, [confession.id]: '' }))
                                      setFocusedCommentId(null)
                                    }}
                                    className="rounded-md px-3 py-1.5 text-xs font-semibold text-gray-400 transition-colors hover:bg-[#1f1f1f] hover:text-gray-300"
                                  >
                                    Cancel
                                  </button>

                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">{draft.length}/300</span>
                                    <button
                                      type="button"
                                      disabled={postingCommentId === confession.id || draft.trim().length === 0}
                                      onClick={() => void handleSubmitComment(confession.id)}
                                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {postingCommentId === confession.id ? 'Posting...' : 'Post Comment'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="px-0 py-2">
                        {loadingComments[confession.id] ? (
                          <div className="space-y-2 py-1">
                            {safeArray(Array.from({ length: 3 })).map((_, idx) => (
                              <div key={idx} className="mx-4 h-[60px] rounded-lg conf-comment-shimmer" />
                            ))}
                          </div>
                        ) : (commentsByConfession[confession.id] || []).length === 0 ? (
                          <div className="px-4 py-6 text-center">
                            <p className="text-sm text-gray-500">No replies yet</p>
                            <p className="mt-1 text-xs text-gray-500">Start the conversation.</p>
                          </div>
                        ) : (
                          <div className="py-1">
                            {(commentsByConfession[confession.id] || []).map((comment, idx) => (
                              <div
                                key={comment.id}
                                id={`comment-${comment.id}`}
                                className={cn(
                                  'group/comment px-4 py-[10px] transition-colors duration-300',
                                  highlightCommentId === comment.id ? 'bg-indigo-500/10 ring-1 ring-indigo-400/40' : '',
                                  idx < (commentsByConfession[confession.id] || []).length - 1 ? 'border-b border-[#1a1a1a]' : ''
                                )}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span
                                    className="inline-flex items-center rounded-full border border-indigo-400/20 bg-indigo-500/10 px-2 py-[2px] text-[11px] font-semibold text-[#a5b4fc]"
                                  >
                                    {comment.persona_emoji} {comment.persona_name}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-gray-500">{formatDistanceToNow(comment.created_at)}</span>
                                    {canDeleteComment(comment.id) && (
                                      (() => {
                                        const deleteKey = getCommentDeleteKey(confession.id, comment.id)
                                        const isDeleteConfirmOpen = confirmDeleteCommentKey === deleteKey
                                        return isDeleteConfirmOpen ? (
                                          <div className="flex items-center gap-1 text-[11px]">
                                            <button
                                              type="button"
                                              disabled={deletingCommentKey === deleteKey}
                                              onClick={() => void handleDeleteComment(confession.id, comment.id)}
                                              className="rounded px-1.5 py-0.5 font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                                            >
                                              Yes
                                            </button>
                                            <button
                                              type="button"
                                              disabled={deletingCommentKey === deleteKey}
                                              onClick={() => setConfirmDeleteCommentKey(null)}
                                              className="rounded px-1.5 py-0.5 font-semibold text-gray-400 transition-colors hover:bg-[#1f1f1f]"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setConfirmDeleteCommentKey(deleteKey)}
                                            className="rounded p-1 text-[11px] text-gray-500 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover/comment:opacity-100"
                                            aria-label="Delete comment"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        )
                                      })()
                                    )}
                                  </div>
                                </div>
                                <p className="mt-1 break-words text-[14px] leading-[1.5] text-[#d1d5db]">{comment.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        </div>
                      </section>
                    )}
                  </div>
                )
              })}

              <div ref={loadMoreRef} className="h-4" />

              {confessionsQuery.isFetchingNextPage && (
                <div className="space-y-2">
                  {safeArray(Array.from({ length: 2 })).map((_, idx) => (
                    <div key={idx} className="h-24 animate-pulse rounded-xl border border-[#2a2a2a] bg-[#1a1a1a]" />
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="hidden space-y-4 lg:sticky lg:top-6 lg:block">
            <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
              <p className="text-lg leading-none">🔬</p>
              <h3 className="mt-2 text-base font-semibold text-white">PESimens Confessions</h3>
              <p className="mt-2 text-sm text-gray-400">
                A safe space for PESU students to share thoughts, rants, and hot takes anonymously.
              </p>
              <p className="mt-3 text-xs text-gray-400">🔒 100% anonymous · No logs kept</p>
              <p className="mt-1 text-xs text-gray-500">{totalConfessions} posts · Anonymous forever</p>
              <Button
                onClick={() => setPostOpen(true)}
                size="icon"
                className="mt-4 mx-auto rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-500/90 hover:to-indigo-600/90"
                aria-label="Post a Confession"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-xl border border-indigo-500/30 bg-[#1a1a1a] p-4 text-center">
              <div className="persona-float text-[3rem] leading-none">{myPersona.emoji}</div>
              <p className="mt-2 text-base font-bold text-white">{myPersona.name}</p>
              <p className="mt-1 text-xs text-gray-400">Resets in {resetCountdown}</p>
            </div>

            <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
              <h3 className="text-base font-semibold text-white">🔥 Hot Right Now</h3>
              <div className="mt-3 space-y-2">
                {trendingConfessions.length === 0 ? (
                  <p className="text-xs text-gray-500">No trending confessions yet.</p>
                ) : (
                  safeArray(trendingConfessions).map(item => (
                    <button
                      key={item.id}
                      onClick={() => scrollToConfession(item.id)}
                      className="w-full rounded-lg bg-[#1a1a1a] px-3 py-2 text-left transition-colors hover:bg-[#222222]"
                    >
                      <p className="truncate text-xs text-gray-300">{item.content}</p>
                      <p className="mt-1 text-[11px] text-gray-500">▲ {item.upvote_count}</p>
                    </button>
                  ))
                )}
              </div>

              <button
                onClick={() => setRulesOpen(prev => !prev)}
                className="mt-4 w-full text-left text-sm font-semibold text-gray-300"
              >
                📋 Community Rules
              </button>

              {rulesOpen && (
                <ul className="mt-2 space-y-1.5 text-sm text-gray-400">
                  <li>1. Be anonymous, stay kind</li>
                  <li>2. No revealing others&apos; identities</li>
                  <li>3. No hate speech or harassment</li>
                  <li>4. Keep it PESU-relevant</li>
                  <li>5. Have fun 🎉</li>
                </ul>
              )}
            </div>
          </aside>
        </div>
      </div>

      {postOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setPostOpen(false)} />
          <div className="relative w-full max-w-xl rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-5 shadow-[0_30px_80px_-45px_rgba(0,0,0,1)]">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Post anonymously</h2>
                <p className="mt-0.5 text-xs text-white/50">Posting as {myPersona.emoji} {myPersona.name}</p>
              </div>
              <button
                onClick={() => setPostOpen(false)}
                className="rounded-full border border-[#2a2a2a] px-2.5 py-1 text-xs text-white/60 hover:bg-white/5"
              >
                Close
              </button>
            </div>

            <textarea
              value={content}
              onChange={e => setContent(e.target.value.slice(0, 500))}
              placeholder="What's on your mind? This stays anonymous."
              rows={4}
              className="w-full rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm text-white outline-none focus:border-[#6366f1]"
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <select
                value={postCategory}
                onChange={e => setPostCategory(e.target.value as Category)}
                aria-label="Category"
                className="rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-2.5 py-2 text-xs text-white/80"
              >
                {safeArray(Object.keys(CATEGORY_META) as Category[]).map(category => {
                  const meta = CATEGORY_META[category]
                  return (
                    <option key={category} value={category}>
                      {meta.emoji} {meta.label}
                    </option>
                  )
                })}
              </select>
              <span className="text-xs text-white/45">{content.length}/500</span>
            </div>

            <Button
              className="mt-4 w-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-500/90 hover:to-indigo-600/90"
              disabled={createMutation.isPending || content.trim().length === 0}
              onClick={handleSubmitPost}
            >
              {createMutation.isPending ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setPostOpen(true)}
        className="fixed right-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-[#2d3658] bg-[linear-gradient(180deg,#1a1f35_0%,#14192b_100%)] text-[#f8fafc] shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition-transform active:scale-[0.97] hover:border-[#3b4670] sm:hidden"
        style={{ bottom: 'calc(5.8rem + env(safe-area-inset-bottom, 0px))' }}
        aria-label="Compose confession"
      >
        <Pencil className="h-4 w-4" />
      </button>
    </div>
  )
}
