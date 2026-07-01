import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, SendHorizontal, Smile, Trash2, X } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  adaptiveRefetchIntervalWhenActive,
  adaptiveRefetchOnReconnect,
  adaptiveRefetchOnWindowFocus,
  adaptiveStaleTime,
  isPathInRouteScope,
} from '@/lib/queryThrottle'
import { useAuthStore } from '@/store/auth'
import { UserAvatar } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/use-toast'

type StoryType = 'text' | 'image' | 'poll'
type PollChoice = 'a' | 'b'

interface StoryItem {
  id: string
  author_id: string
  content_type: StoryType
  text_content: string | null
  background_gradient: string | null
  gradient_index: number | null
  image_url: string | null
  poll_question: string | null
  poll_option_a: string | null
  poll_option_b: string | null
  poll_votes_a: number
  poll_votes_b: number
  view_count: number
  expires_at: string
  created_at: string
  has_viewed: boolean
  my_choice: PollChoice | null
  recent_viewers?: Array<{
    id: string
    display_name: string | null
    avatar_url: string | null
    viewed_at: string
  }>
  sticker_overlay?: string | null
}

interface StoryRing {
  author_id: string
  author: {
    display_name: string | null
    avatar_url: string | null
    campus: 'EC' | 'RR' | null
  } | null
  stories: StoryItem[]
  has_viewed: boolean
  is_own: boolean
  unique_viewer_count: number
  latest_created_at: string
}

interface StoriesResponse {
  rings: StoryRing[]
  my_stories: StoryItem[]
}

const storyGradients = [
  'linear-gradient(145deg, #7c3aed, #ec4899)',
  'linear-gradient(145deg, #2563eb, #7c3aed)',
  'linear-gradient(145deg, #f97316, #ec4899)',
  'linear-gradient(145deg, #10b981, #14b8a6)',
  'linear-gradient(145deg, #1e3a8a, #020617)',
  'linear-gradient(145deg, #ef4444, #f97316)',
]

const STORIES_VIEW_QUEUE_KEY = 'stories:view-queue:v1'
const MAX_VIEW_RETRY_ATTEMPTS = 6

function normalizeGradientIndex(index: number | null | undefined): number {
  if (typeof index !== 'number' || Number.isNaN(index)) return 0
  const safe = Math.floor(index)
  if (safe < 0) return 0
  return safe % storyGradients.length
}

function gradientByStory(story: StoryItem): string {
  if (typeof story.gradient_index === 'number') {
    return storyGradients[normalizeGradientIndex(story.gradient_index)]
  }

  const key = story.background_gradient || story.id
  let hash = 0
  for (let i = 0; i < key.length; i += 1) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0
  }
  return storyGradients[Math.abs(hash) % storyGradients.length]
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.max(1, Math.floor(diffMs / 60000))
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

function trimName(name: string | null | undefined): string {
  const clean = (name || 'Student').trim()
  if (!clean) return 'S'
  return clean.slice(0, 1).toUpperCase()
}

function resolveStoryPrefetchDepth(): number {
  const nav = navigator as Navigator & {
    connection?: {
      saveData?: boolean
      effectiveType?: string
      downlink?: number
    }
  }

  const connection = nav.connection
  if (!connection) return 2
  if (connection.saveData) return 1

  const effectiveType = (connection.effectiveType || '').toLowerCase()
  if (effectiveType.includes('2g')) return 1

  if (typeof connection.downlink === 'number') {
    if (connection.downlink < 1.2) return 1
    if (connection.downlink > 5) return 4
    if (connection.downlink > 2.5) return 3
  }

  if (effectiveType === '3g') return 2
  if (effectiveType === '4g') return 3
  return 2
}

export function StoriesBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const storiesPollingActive = isPathInRouteScope(location.pathname, [
    '/',
    '/campus',
    '/confessions',
    '/study',
    '/people',
    '/notes',
    '/placements',
  ])

  const [createOpen, setCreateOpen] = useState(false)
  const [creatorStep, setCreatorStep] = useState<'choose' | 'photo' | 'text'>('choose')
  const [viewerAuthorId, setViewerAuthorId] = useState<string | null>(null)
  const [viewerStoryIndex, setViewerStoryIndex] = useState(0)
  const [viewerClosing, setViewerClosing] = useState(false)
  const [viewersSheetOpen, setViewersSheetOpen] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isReplyInputFocused, setIsReplyInputFocused] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [queueTick, setQueueTick] = useState(0)
  const [pendingViewQueue, setPendingViewQueue] = useState<Array<{ storyId: string; attempts: number; nextRetryAt: number }>>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem(STORIES_VIEW_QUEUE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw) as Array<{ storyId?: string; attempts?: number; nextRetryAt?: number }>
      return parsed
        .filter(item => typeof item.storyId === 'string' && item.storyId.trim().length > 0)
        .map(item => ({
          storyId: item.storyId as string,
          attempts: typeof item.attempts === 'number' ? item.attempts : 0,
          nextRetryAt: typeof item.nextRetryAt === 'number' ? item.nextRetryAt : Date.now(),
        }))
    } catch {
      return []
    }
  })

  const [textContent, setTextContent] = useState('')
  const [textGradientIndex, setTextGradientIndex] = useState(0)
  const [photoCaption, setPhotoCaption] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showPhotoCaption, setShowPhotoCaption] = useState(false)
  const [expiresIn, setExpiresIn] = useState<6 | 12 | 24>(24)
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null)
  const [showStickerPicker, setShowStickerPicker] = useState(false)

  const STICKERS = ['🔥', '💯', '💀', '😭', '❤️', '🎉', '👀', '🚀']

  const touchStartY = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const pressTimerRef = useRef<number | null>(null)
  const longPressActivatedRef = useRef(false)
  const queuedOrSentViewIdsRef = useRef<Set<string>>(new Set())
  const overlayHost = typeof document !== 'undefined' ? document.body : null
  const viewerOpen = Boolean(viewerAuthorId)
  const [hiddenOnScroll, setHiddenOnScroll] = useState(false)
  const lastScrollY = useRef<number>(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset || 0
      const delta = y - lastScrollY.current
      // Scroll down fast -> hide. Scroll up or near top -> show.
      if (delta > 12 && y > 80) {
        setHiddenOnScroll(true)
      } else if (delta < -12 || y < 80) {
        setHiddenOnScroll(false)
      }
      lastScrollY.current = y
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!createOpen && !viewerAuthorId) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [createOpen, viewerAuthorId])

  const storiesQuery = useQuery({
    queryKey: ['stories-bar'],
    queryFn: () => apiFetch<StoriesResponse>('/api/stories'),
    enabled: storiesPollingActive,
    staleTime: adaptiveStaleTime(viewerOpen ? 30 * 1000 : 10 * 60 * 1000, viewerOpen ? 'interactive' : 'default'), // 10 minutes when not viewing
    refetchInterval: () => (storiesPollingActive
      ? adaptiveRefetchIntervalWhenActive(viewerOpen ? 20 * 1000 : 10 * 60 * 1000, viewerOpen ? 'interactive' : 'default', { // 10 minutes instead of 5
          suspendDuringInteraction: true,
          interactionWindowMs: 7000,
        })
      : false),
    refetchOnWindowFocus: storiesPollingActive && adaptiveRefetchOnWindowFocus(true),
    refetchOnReconnect: storiesPollingActive && adaptiveRefetchOnReconnect(true),
  })

  const viewMutation = useMutation({
    mutationFn: (storyId: string) => apiFetch<{ ok: boolean }>(`/api/stories/${storyId}/view`, { method: 'POST', body: JSON.stringify({}) }),
  })

  const createMutation = useMutation({
    mutationFn: (payload: {
      content_type: 'text' | 'image'
      text_content?: string
      image_url?: string
      gradient_index?: number
      expires_in_hours?: number
      sticker_overlay?: string
    }) => apiFetch<{ story: StoryItem }>('/api/stories', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['stories-bar'] })
      setCreateOpen(false)
      setCreatorStep('choose')
      setTextContent('')
      setPhotoCaption('')
      setPhotoFile(null)
      setPhotoPreviewUrl('')
      setTextGradientIndex(0)
      setShowPhotoCaption(false)
      setUploadProgress(0)
      setExpiresIn(24)
      setSelectedSticker(null)
      setShowStickerPicker(false)
      toast({ variant: 'success', title: 'Story shared! 🎉' })
    },
    onError: error => {
      toast({
        variant: 'error',
        title: 'Failed to share story',
        description: error instanceof Error ? error.message : 'Please try again',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (storyId: string) => apiFetch<{ ok: boolean }>(`/api/stories/${storyId}`, { method: 'DELETE' }),
    onSuccess: () => {
      setViewerAuthorId(null)
      setViewerStoryIndex(0)
      void queryClient.invalidateQueries({ queryKey: ['stories-bar'] })
      toast({ variant: 'success', title: 'Story deleted' })
    },
    onError: error => {
      toast({
        variant: 'error',
        title: 'Failed to delete story',
        description: error instanceof Error ? error.message : 'Please try again',
      })
    },
  })

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return apiFetch<{ url: string }>('/api/stories/upload-image', {
        method: 'POST',
        body: formData,
      })
    },
  })

  const replyMutation = useMutation({
    mutationFn: ({ storyId, message }: { storyId: string; message: string }) =>
      apiFetch<{ ok: boolean; conversation_id: string }>(`/api/stories/${storyId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),
  })

  const rings = useMemo(() => storiesQuery.data?.rings ?? [], [storiesQuery.data?.rings])

  const myRing = useMemo(() => {
    if (!profile?.id) return null
    return rings.find(ring => ring.author_id === profile.id) ?? null
  }, [rings, profile?.id])

  const otherRings = useMemo(() => {
    if (!profile?.id) return rings
    return rings.filter(ring => ring.author_id !== profile.id)
  }, [rings, profile?.id])

  const activeRing = useMemo(
    () => rings.find(ring => ring.author_id === viewerAuthorId) ?? null,
    [rings, viewerAuthorId]
  )

  const activeStory = useMemo(() => {
    if (!activeRing) return null
    return activeRing.stories[viewerStoryIndex] ?? null
  }, [activeRing, viewerStoryIndex])

  const isAuthorViewing = Boolean(activeStory && profile?.id && activeStory.author_id === profile.id)

  const openRing = useCallback((authorId: string, index = 0) => {
    setViewerAuthorId(authorId)
    setViewerStoryIndex(index)
    setViewerClosing(false)
    setViewersSheetOpen(false)
    setIsPaused(false)
    setIsReplyInputFocused(false)
    setReplyText('')
  }, [])

  const closeViewer = useCallback(() => {
    setViewerClosing(true)
    window.setTimeout(() => {
      setViewerAuthorId(null)
      setViewerStoryIndex(0)
      setViewerClosing(false)
      setViewersSheetOpen(false)
      setIsPaused(false)
      setIsReplyInputFocused(false)
      setReplyText('')
    }, 180)
  }, [])

  const goNext = useCallback(() => {
    if (!activeRing) return
    if (viewerStoryIndex < activeRing.stories.length - 1) {
      setViewerStoryIndex(prev => prev + 1)
      return
    }
    closeViewer()
  }, [activeRing, closeViewer, viewerStoryIndex])

  const goPrev = useCallback(() => {
    if (!activeRing) return
    if (viewerStoryIndex > 0) {
      setViewerStoryIndex(prev => prev - 1)
      return
    }
    closeViewer()
  }, [activeRing, closeViewer, viewerStoryIndex])

  function markStoryViewedOptimistically(storyId: string, authorId: string) {
    queryClient.setQueryData<StoriesResponse>(['stories-bar'], current => {
      if (!current) return current
      const nextRings = current.rings.map(ring => {
        if (ring.author_id !== authorId) return ring
        const nextStories = ring.stories.map(story =>
          story.id === storyId
            ? {
              ...story,
              has_viewed: true,
              view_count: story.has_viewed ? story.view_count : story.view_count + 1,
            }
            : story
        )
        return {
          ...ring,
          stories: nextStories,
          has_viewed: nextStories.every(story => story.has_viewed),
        }
      })
      const nextMine = current.my_stories.map(story =>
        story.id === storyId
          ? {
            ...story,
            has_viewed: true,
            view_count: story.has_viewed ? story.view_count : story.view_count + 1,
          }
          : story
      )
      return { rings: nextRings, my_stories: nextMine }
    })
  }

  function enqueueStoryView(storyId: string) {
    setPendingViewQueue(prev => {
      if (prev.some(item => item.storyId === storyId)) return prev
      return [...prev, { storyId, attempts: 0, nextRetryAt: Date.now() }]
    })
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORIES_VIEW_QUEUE_KEY, JSON.stringify(pendingViewQueue))
  }, [pendingViewQueue])

  useEffect(() => {
    if (!pendingViewQueue.length) return
    const timer = window.setInterval(() => {
      setQueueTick(prev => prev + 1)
    }, 2000)
    return () => window.clearInterval(timer)
  }, [pendingViewQueue.length])

  useEffect(() => {
    const triggerFlush = () => setQueueTick(prev => prev + 1)
    window.addEventListener('online', triggerFlush)
    window.addEventListener('focus', triggerFlush)
    document.addEventListener('visibilitychange', triggerFlush)
    return () => {
      window.removeEventListener('online', triggerFlush)
      window.removeEventListener('focus', triggerFlush)
      document.removeEventListener('visibilitychange', triggerFlush)
    }
  }, [])

  useEffect(() => {
    if (!pendingViewQueue.length || viewMutation.isPending) return
    const now = Date.now()
    const nextItem = pendingViewQueue.find(item => item.nextRetryAt <= now)
    if (!nextItem) return

    viewMutation.mutate(nextItem.storyId, {
      onSuccess: () => {
        setPendingViewQueue(prev => prev.filter(item => item.storyId !== nextItem.storyId))
      },
      onError: error => {
        const errorMessage = error instanceof Error ? error.message.toLowerCase() : ''
        const shouldDrop = errorMessage.includes('not found') || errorMessage.includes('404')

        setPendingViewQueue(prev => prev.flatMap(item => {
          if (item.storyId !== nextItem.storyId) return [item]
          if (shouldDrop || item.attempts >= MAX_VIEW_RETRY_ATTEMPTS) return []
          const nextAttempts = item.attempts + 1
          const delayMs = Math.min(30_000, 1_500 * 2 ** nextAttempts)
          return [{
            ...item,
            attempts: nextAttempts,
            nextRetryAt: Date.now() + delayMs,
          }]
        }))
      },
    })
  }, [pendingViewQueue, queueTick, viewMutation])

  useEffect(() => {
    if (!activeStory) return

    if (isAuthorViewing || activeStory.has_viewed) return
    if (queuedOrSentViewIdsRef.current.has(activeStory.id)) return

    if (pendingViewQueue.some(item => item.storyId === activeStory.id)) {
      queuedOrSentViewIdsRef.current.add(activeStory.id)
      return
    }

    queuedOrSentViewIdsRef.current.add(activeStory.id)
    markStoryViewedOptimistically(activeStory.id, activeStory.author_id)
    enqueueStoryView(activeStory.id)
  }, [activeStory, isAuthorViewing, queryClient, pendingViewQueue])

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartY.current = event.touches[0]?.clientY ?? null
    handlePressStart()
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (touchStartY.current == null) return
    const endY = event.changedTouches[0]?.clientY ?? touchStartY.current
    const deltaY = endY - touchStartY.current

    if (isAuthorViewing && deltaY < -70) {
      setViewersSheetOpen(true)
      touchStartY.current = null
      setIsPaused(true)
      return
    }

    if (viewersSheetOpen && deltaY > 70) {
      setViewersSheetOpen(false)
      touchStartY.current = null
      setIsPaused(false)
      return
    }

    if (deltaY > 90) {
      closeViewer()
    }
    touchStartY.current = null
    handlePressEnd()
  }

  function handlePressStart() {
    longPressActivatedRef.current = false
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current)
    }
    pressTimerRef.current = window.setTimeout(() => {
      longPressActivatedRef.current = true
      setIsPaused(true)
    }, 110)
  }

  function handlePressEnd() {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }

    // Long press pauses while held; release resumes playback.
    if (longPressActivatedRef.current) {
      setIsPaused(false)
      return
    }
  }

  function togglePauseFromTap() {
    // Ignore the synthetic click that follows a long press.
    if (longPressActivatedRef.current) {
      longPressActivatedRef.current = false
      return
    }

    setIsPaused(prev => !prev)
  }

  function openCreatorAsPhoto() {
    setCreateOpen(true)
    setCreatorStep('photo')
    window.setTimeout(() => fileInputRef.current?.click(), 10)
  }

  async function sharePhotoStory() {
    if (!photoFile) {
      toast({ variant: 'error', title: 'Select a photo first' })
      return
    }

    setUploadProgress(8)
    const progressTimer = window.setInterval(() => {
      setUploadProgress(prev => (prev >= 92 ? prev : prev + 7))
    }, 150)

    try {
      const upload = await uploadImageMutation.mutateAsync(photoFile)
      await createMutation.mutateAsync({
        content_type: 'image',
        image_url: upload.url,
        text_content: photoCaption.trim() || undefined,
        gradient_index: textGradientIndex,
        expires_in_hours: expiresIn,
        sticker_overlay: selectedSticker ?? undefined,
      })
      setUploadProgress(100)
    } catch (error) {
      toast({
        variant: 'error',
        title: 'Failed to share story',
        description: error instanceof Error ? error.message : 'Please try again',
      })
    } finally {
      window.clearInterval(progressTimer)
      window.setTimeout(() => setUploadProgress(0), 220)
    }
  }

  async function shareTextStory() {
    if (!textContent.trim()) {
      toast({ variant: 'error', title: 'Enter text for your story' })
      return
    }

    await createMutation.mutateAsync({
      content_type: 'text',
      text_content: textContent.trim(),
      gradient_index: textGradientIndex,
      expires_in_hours: expiresIn,
      sticker_overlay: selectedSticker ?? undefined,
    })
  }

  function sendReply() {
    if (!activeRing || !activeStory) return
    const message = replyText.trim()
    if (!message) {
      toast({ variant: 'error', title: 'Type a reply first' })
      return
    }

    replyMutation.mutate(
      { storyId: activeStory.id, message },
      {
        onSuccess: result => {
          toast({
            variant: 'success',
            title: 'Reply sent',
            description: `Sent to ${activeRing.author?.display_name || 'student'}`,
          })
          setReplyText('')
          navigate(`/messages?conversation=${result.conversation_id}`)
        },
        onError: error => {
          toast({
            variant: 'error',
            title: 'Failed to send reply',
            description: error instanceof Error ? error.message : 'Please try again',
          })
        },
      }
    )
  }

  function sendReaction(emoji: string) {
    if (!activeRing || !activeStory) return
    replyMutation.mutate(
      { storyId: activeStory.id, message: emoji },
      {
        onSuccess: () => {
          toast({
            variant: 'success',
            title: `${emoji} reaction sent`,
            description: `Sent to ${activeRing.author?.display_name || 'student'}`,
          })
        },
        onError: error => {
          toast({
            variant: 'error',
            title: 'Failed to send reaction',
            description: error instanceof Error ? error.message : 'Please try again',
          })
        },
      }
    )
  }

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl)
      }
    }
  }, [photoPreviewUrl])

  useEffect(() => {
    if (!createOpen) {
      setCreatorStep('choose')
      setPhotoCaption('')
      setTextContent('')
      setTextGradientIndex(0)
      setPhotoFile(null)
      setPhotoPreviewUrl('')
      setShowPhotoCaption(false)
      setExpiresIn(24)
      setSelectedSticker(null)
      setShowStickerPicker(false)
    }
  }, [createOpen])

  useEffect(() => {
    if (!activeRing) return

    const prefetchDepth = resolveStoryPrefetchDepth()

    const upcoming = activeRing.stories
      .slice(viewerStoryIndex + 1, viewerStoryIndex + 1 + prefetchDepth)
      .filter(story => story.content_type === 'image' && Boolean(story.image_url))

    for (const story of upcoming) {
      const img = new Image()
      img.decoding = 'async'
      img.src = story.image_url as string
    }
  }, [activeRing, viewerStoryIndex])

  useEffect(() => {
    setIsPaused(viewersSheetOpen || isReplyInputFocused)
  }, [viewersSheetOpen, isReplyInputFocused])

  return (
    <>
      <section className={`border-b border-[#2a2a2a] bg-[#111111] px-4 py-3 transition-all duration-200 ${hiddenOnScroll ? 'stories-hidden' : ''}`}>
        <div
          className="hide-scrollbar flex snap-x snap-mandatory items-start gap-4 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div
            role="button"
            tabIndex={0}
            className="group snap-start shrink-0 cursor-pointer"
            onClick={() => {
              if (myRing && myRing.stories.length > 0) {
                openRing(myRing.author_id, 0)
                return
              }
              setCreateOpen(true)
            }}
            onKeyDown={event => {
              if (event.key !== 'Enter' && event.key !== ' ') return
              event.preventDefault()
              if (myRing && myRing.stories.length > 0) {
                openRing(myRing.author_id, 0)
                return
              }
              setCreateOpen(true)
            }}
          >
            <div className={`relative mx-auto h-16 w-16 rounded-full p-[2px] ${myRing ? 'bg-[linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)]' : 'bg-[#4b5563]'}`}>
              <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-[#0a0a0f] bg-[#111111]">
                <UserAvatar
                  name={profile?.display_name ?? 'You'}
                  avatarUrl={profile?.avatar_url ?? null}
                  size="xl"
                />
              </div>
              <button
                type="button"
                aria-label="Add story"
                onClick={event => {
                  event.stopPropagation()
                  setCreateOpen(true)
                }}
                className="absolute bottom-0 right-0 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#0a0a0f] bg-indigo-600 text-white shadow-[0_0_0_2px_rgba(10,10,15,0.65)] transition hover:bg-indigo-500 sm:h-5 sm:w-5"
              >
                <Plus className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
              </button>
            </div>
            <p className="mt-1 max-w-16 truncate text-xs font-medium text-white">Your Story</p>
          </div>

          {otherRings.map(ring => (
            <button
              key={ring.author_id}
              type="button"
              className="snap-start shrink-0"
              onClick={() => openRing(ring.author_id, 0)}
            >
              <div className={`mx-auto h-16 w-16 rounded-full p-[2px] ${ring.has_viewed ? 'bg-[#4b5563]' : 'bg-[linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)]'}`}>
                <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-[#0a0a0f] bg-[#111111]">
                  <UserAvatar
                    name={ring.author?.display_name ?? 'Student'}
                    avatarUrl={ring.author?.avatar_url ?? null}
                    size="xl"
                  />
                </div>
              </div>
              <p className="mt-1 max-w-16 truncate text-xs font-medium text-white">{trimName(ring.author?.display_name)}</p>
            </button>
          ))}

          {otherRings.length === 0 && !myRing && (
            <p className="self-center text-xs text-gray-400">No stories yet. Post your first one.</p>
          )}

        </div>
      </section>

      {createOpen && overlayHost && createPortal(
        <div className="fixed inset-0 z-[12000] bg-black text-white">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={event => {
              const file = event.target.files?.[0]
              if (!file) return

              if (!file.type.startsWith('image/')) {
                toast({ variant: 'error', title: 'Please choose an image file' })
                return
              }

              if (file.size > 10 * 1024 * 1024) {
                toast({ variant: 'error', title: 'Image must be 10MB or smaller' })
                return
              }

              setPhotoFile(file)
              if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
              setPhotoPreviewUrl(URL.createObjectURL(file))
              setCreatorStep('photo')
            }}
          />

          {creatorStep === 'choose' && (
            <div className="mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col items-center justify-center gap-4 px-6">
              <button
                type="button"
                onClick={openCreatorAsPhoto}
                className="w-full rounded-2xl border border-white/20 bg-white/10 px-6 py-8 text-left transition hover:bg-white/15"
              >
                <p className="text-2xl font-bold">📷 Photo Story</p>
                <p className="mt-2 text-sm text-white/70">Capture or upload an image</p>
              </button>
              <button
                type="button"
                onClick={() => setCreatorStep('text')}
                className="w-full rounded-2xl border border-white/20 bg-white/10 px-6 py-8 text-left transition hover:bg-white/15"
              >
                <p className="text-2xl font-bold">✏️ Text Story</p>
                <p className="mt-2 text-sm text-white/70">Create a gradient text story</p>
              </button>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="mt-2 text-sm text-white/70 transition hover:text-white"
              >
                Cancel
              </button>
            </div>
          )}

          {creatorStep === 'photo' && (
            <div className="relative mx-auto h-[100dvh] w-full max-w-[480px] overflow-hidden bg-black">
              {photoPreviewUrl ? (
                <img src={photoPreviewUrl} alt="Story preview" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm"
                  >
                    Choose Photo
                  </button>
                </div>
              )}

              <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-50">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowStickerPicker(p => !p)}
                    className="rounded-full bg-black/45 px-3 py-1.5 text-sm text-white hover:bg-black/60"
                  >
                    Stickers
                  </button>
                  <select
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(Number(e.target.value) as 6 | 12 | 24)}
                    className="rounded-full bg-black/45 px-2 py-1.5 text-sm text-white outline-none cursor-pointer"
                  >
                    <option value={6}>6h Expiry</option>
                    <option value={12}>12h Expiry</option>
                    <option value={24}>24h Expiry</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-full bg-black/45 p-2 text-white hover:bg-black/60"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {showStickerPicker && (
                <div className="absolute top-16 left-4 right-4 bg-black/80 backdrop-blur-sm rounded-2xl p-4 flex flex-wrap gap-3 justify-center z-50 border border-white/10">
                  {STICKERS.map(s => (
                    <button key={s} type="button" onClick={() => { setSelectedSticker(s); setShowStickerPicker(false) }} className="text-3xl hover:scale-110 transition-transform">{s}</button>
                  ))}
                  <button type="button" onClick={() => { setSelectedSticker(null); setShowStickerPicker(false) }} className="text-sm bg-white/20 hover:bg-white/30 rounded-full px-4 py-1 text-white">Clear</button>
                </div>
              )}

              {selectedSticker && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <span className="text-8xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">{selectedSticker}</span>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPhotoCaption(prev => !prev)}
                    className="rounded-full border border-white/30 bg-black/35 px-4 py-2 text-sm"
                  >
                    Add text
                  </button>
                  <button
                    type="button"
                    disabled={createMutation.isPending || uploadImageMutation.isPending}
                    onClick={() => { void sharePhotoStory() }}
                    className="relative inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-65"
                  >
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/70 text-[10px]">
                        {Math.round(uploadProgress / 10)}
                      </span>
                    )}
                    Share →
                  </button>
                </div>

                {showPhotoCaption && (
                  <input
                    value={photoCaption}
                    onChange={event => setPhotoCaption(event.target.value.slice(0, 200))}
                    placeholder="Add a caption..."
                    className="mt-3 h-11 w-full rounded-full border border-white/20 bg-black/45 px-4 text-sm text-white outline-none"
                  />
                )}
              </div>
            </div>
          )}

          {creatorStep === 'text' && (
            <div
              className="relative mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col"
              style={{ background: storyGradients[textGradientIndex] }}
            >
              <div className="flex items-center justify-between p-4 relative z-50">
                <button
                  type="button"
                  onClick={() => setCreatorStep('choose')}
                  className="rounded-full bg-black/35 px-3 py-1.5 text-sm hover:bg-black/50"
                >
                  Back
                </button>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowStickerPicker(p => !p)}
                    className="rounded-full bg-black/35 px-3 py-1.5 text-sm hover:bg-black/50"
                  >
                    Stickers
                  </button>
                  <select
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(Number(e.target.value) as 6 | 12 | 24)}
                    className="rounded-full bg-black/35 px-2 py-1.5 text-sm text-white outline-none cursor-pointer"
                  >
                    <option value={6} className="bg-black text-white">6h</option>
                    <option value={12} className="bg-black text-white">12h</option>
                    <option value={24} className="bg-black text-white">24h</option>
                  </select>
                  <button
                    type="button"
                    disabled={createMutation.isPending}
                    onClick={() => { void shareTextStory() }}
                    className="rounded-full bg-violet-600 px-4 py-1.5 text-sm font-semibold disabled:opacity-60 hover:bg-violet-500 transition-colors"
                  >
                    Share →
                  </button>
                </div>
              </div>

              {showStickerPicker && (
                <div className="absolute top-16 left-4 right-4 bg-black/80 backdrop-blur-sm rounded-2xl p-4 flex flex-wrap gap-3 justify-center z-50 border border-white/10">
                  {STICKERS.map(s => (
                    <button key={s} type="button" onClick={() => { setSelectedSticker(s); setShowStickerPicker(false) }} className="text-3xl hover:scale-110 transition-transform">{s}</button>
                  ))}
                  <button type="button" onClick={() => { setSelectedSticker(null); setShowStickerPicker(false) }} className="text-sm bg-white/20 hover:bg-white/30 rounded-full px-4 py-1 text-white">Clear</button>
                </div>
              )}

              {selectedSticker && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <span className="text-8xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">{selectedSticker}</span>
                </div>
              )}

              <div className="flex flex-1 items-center justify-center px-6">
                <textarea
                  value={textContent}
                  onChange={event => setTextContent(event.target.value.slice(0, 200))}
                  placeholder="What's on your mind?"
                  className="h-48 w-full resize-none bg-transparent text-center text-2xl font-bold text-white placeholder:text-white/70 outline-none"
                />
              </div>

              <div className="p-4">
                <div className="flex items-center justify-center gap-2">
                  {storyGradients.map((gradient, index) => (
                    <button
                      key={gradient}
                      type="button"
                      onClick={() => setTextGradientIndex(index)}
                      className={`h-8 w-8 rounded-full border-2 ${textGradientIndex === index ? 'border-white' : 'border-white/40'}`}
                      style={{ background: gradient }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>,
        overlayHost
      )}

      {activeRing && activeStory && overlayHost && createPortal(
        <div
          className={`fixed inset-0 z-[13000] bg-black text-white transition-all duration-200 ${viewerClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
        >
          <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden">
            <div
              className="px-3"
              style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}
            >
              <div className="mb-3 flex gap-1.5">
                {activeRing.stories.map((story, index) => (
                  <div key={story.id} className="h-1 flex-1 overflow-hidden rounded bg-white/20">
                    {index < viewerStoryIndex && <div className="h-full w-full bg-white" />}
                    {index > viewerStoryIndex && <div className="h-full w-0 bg-white/30" />}
                    {index === viewerStoryIndex && (
                      <div
                        key={`${activeStory.id}-${viewerStoryIndex}`}
                        className="story-progress-active h-full bg-white"
                        style={{ animationPlayState: isPaused ? 'paused' : 'running' }}
                        onAnimationEnd={goNext}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => navigate(`/profile/${activeStory.author_id}`)}
                  className="group flex items-center gap-2 text-left transition-opacity hover:opacity-85"
                >
                  <UserAvatar
                    name={activeRing.author?.display_name ?? 'Student'}
                    avatarUrl={activeRing.author?.avatar_url ?? null}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-semibold group-hover:underline group-hover:decoration-white/80 group-hover:underline-offset-4">
                      {activeRing.author?.display_name || 'Student'}
                    </p>
                    <p className="text-xs text-white/65">{timeAgo(activeStory.created_at)} ago</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={closeViewer}
                  className="rounded-md p-2 text-gray-300 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="relative flex-1 overflow-hidden">
              <button
                type="button"
                aria-label="Previous story"
                onClick={goPrev}
                className="absolute inset-y-0 left-0 z-20 w-1/3"
              />
              <button
                type="button"
                aria-label="Next story"
                onClick={goNext}
                className="absolute inset-y-0 right-0 z-20 w-1/3"
              />
              <button
                type="button"
                aria-label={isPaused ? 'Resume story' : 'Pause story'}
                onClick={togglePauseFromTap}
                className="absolute inset-y-0 left-1/3 z-20 w-1/3"
              />

              <div className="relative z-10 h-full w-full transition-all duration-300">
                {activeStory.content_type === 'text' && (
                  <div
                    className="flex h-full w-full items-center justify-center px-8 text-center text-2xl font-bold"
                    style={{ background: gradientByStory(activeStory) }}
                  >
                    {activeStory.text_content || 'Story'}
                  </div>
                )}

                {activeStory.content_type === 'image' && (
                  <div className="relative h-full w-full overflow-hidden bg-[#111111]">
                    {activeStory.image_url ? (
                      <img
                        src={activeStory.image_url}
                        alt="Story"
                        loading="eager"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-gray-400">Image unavailable</div>
                    )}
                    {activeStory.text_content && (
                      <div className="absolute inset-x-0 bottom-0 bg-black/50 p-4 text-sm">{activeStory.text_content}</div>
                    )}
                  </div>
                )}

                {activeStory.content_type === 'poll' && (
                  <div className="grid h-full place-items-center bg-[#101010] px-8 text-center">
                    <div>
                      <p className="text-2xl font-bold">{activeStory.poll_question || 'Poll Story'}</p>
                      <p className="mt-3 text-sm text-white/80">This poll can be voted from the default poll feed UI.</p>
                    </div>
                  </div>
                )}

                {activeStory.sticker_overlay && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <span className="text-8xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">{activeStory.sticker_overlay}</span>
                  </div>
                )}
              </div>
            </div>

            <div
              className="border-t border-white/10 px-3 pt-3"
              style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReplyText(prev => `${prev}👍`) }
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
                >
                  <Smile className="h-4 w-4" />
                </button>
                <input
                  value={replyText}
                  onChange={event => setReplyText(event.target.value)}
                  onFocus={() => setIsReplyInputFocused(true)}
                  onBlur={() => setIsReplyInputFocused(false)}
                  placeholder={`Reply to ${activeRing.author?.display_name || 'student'}...`}
                  className="h-10 flex-1 rounded-full border border-white/20 bg-[#121212] px-4 text-sm text-white outline-none"
                />
                <button
                  type="button"
                  onClick={sendReply}
                  disabled={replyMutation.isPending}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
                >
                  <SendHorizontal className="h-4 w-4" />
                </button>
              </div>

              <div
                className={cn(
                  'mt-2 flex items-center gap-2 overflow-hidden transition-all duration-200',
                  isReplyInputFocused ? 'max-h-0 opacity-0 sm:max-h-9 sm:opacity-100' : 'max-h-9 opacity-100'
                )}
                aria-hidden={isReplyInputFocused}
              >
                {['❤️', '😂', '😮', '🔥'].map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => sendReaction(emoji)}
                    className="rounded-full bg-white/10 px-3 py-1 text-sm transition hover:bg-white/15"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <div className="mt-2 flex items-center justify-between">
                {isAuthorViewing && (
                  <div className="flex items-center gap-2">
                    {(activeStory.recent_viewers?.length ?? 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => setViewersSheetOpen(true)}
                        className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-1 py-1 hover:bg-white/15"
                        aria-label="Open viewers list"
                      >
                        {activeStory.recent_viewers?.slice(0, 3).map((viewer, index) => (
                          <span
                            key={`${activeStory.id}-seen-preview-${viewer.id}-${index}`}
                            className={`inline-flex rounded-full bg-[linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)] p-[1px] ${index > 0 ? '-ml-2' : ''}`}
                          >
                            <span className="inline-flex rounded-full border border-[#0d0d0f] bg-[#0d0d0f]">
                              <UserAvatar
                                name={viewer.display_name}
                                avatarUrl={viewer.avatar_url}
                                size="sm"
                              />
                            </span>
                          </span>
                        ))}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setViewersSheetOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs text-white/80 hover:bg-white/15"
                    >
                      <span>👁 {activeStory.view_count}</span>
                      {activeRing.unique_viewer_count > 0 && (
                        <span className="text-white/65">• {activeRing.unique_viewer_count} unique</span>
                      )}
                      <span className="text-[10px] uppercase tracking-wide">Swipe up</span>
                    </button>
                  </div>
                )}

                {isAuthorViewing && (
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(activeStory.id)}
                    disabled={deleteMutation.isPending}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-200 hover:bg-red-500/20 disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                )}
              </div>
            </div>

            {isAuthorViewing && viewersSheetOpen && (
              <button
                type="button"
                aria-label="Close viewers sheet"
                onClick={() => setViewersSheetOpen(false)}
                className="absolute inset-0 z-30 bg-black/30"
              />
            )}

            {isAuthorViewing && (
              <div
                className={`absolute inset-x-0 bottom-0 z-40 rounded-t-2xl border-t border-white/15 bg-[#0d0d0f] transition-transform duration-200 ${
                  viewersSheetOpen ? 'translate-y-0' : 'translate-y-full'
                }`}
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
              >
                <div className="mx-auto my-2 h-1.5 w-12 rounded-full bg-white/25" />
                <div className="px-4 pb-2">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">Viewers</p>
                    <button
                      type="button"
                      onClick={() => setViewersSheetOpen(false)}
                      className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mb-1 text-xs text-white/60">{activeStory.view_count} total views on this story</p>
                  {activeRing.unique_viewer_count > 0 && (
                    <p className="mb-3 text-[11px] text-white/50">{activeRing.unique_viewer_count} unique viewers across your active stories</p>
                  )}

                  <div className="max-h-72 space-y-1 overflow-y-auto pb-3">
                    {(activeStory.recent_viewers?.length ?? 0) === 0 && (
                      <p className="py-8 text-center text-sm text-white/55">No viewers yet</p>
                    )}

                    {activeStory.recent_viewers?.map(viewer => (
                      <div
                        key={`${activeStory.id}-${viewer.id}-${viewer.viewed_at}`}
                        className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5"
                      >
                        <UserAvatar name={viewer.display_name} avatarUrl={viewer.avatar_url} size="sm" />
                        <button
                          type="button"
                          onClick={() => navigate(`/profile/${viewer.id}`)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-sm text-white">{viewer.display_name || 'Student'}</p>
                          <p className="text-xs text-white/55">Viewed {timeAgo(viewer.viewed_at)} ago</p>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        overlayHost
      )}
    </>
  )
}
