import { useEffect, useRef, useCallback } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { PYQCard, type PYQ } from './PYQCard'
import { PYQSkeleton } from '../ui/skeleton'
import { apiFetch } from '@/lib/api'
import { usePYQRealtime } from '@/hooks/usePYQRealtime'

interface FeedResponse {
  items: PYQ[]
  nextCursor: string | null
  hasMore: boolean
}

interface Filters {
  course?: string
  subject?: string
  exam_type?: string
  year?: string
  tag?: string
  sort?: 'recent' | 'upvotes'
}

interface Props {
  filters?: Filters
  canDeletePyq?: boolean
  onDeletePyq?: (pyqId: string) => void
  deletingPyqId?: string | null
}

function buildUrl(filters: Filters, cursor?: string) {
  const params = new URLSearchParams()
  if (filters.course) params.set('course', filters.course)
  if (filters.subject) params.set('subject', filters.subject)
  if (filters.exam_type) params.set('exam_type', filters.exam_type)
  if (filters.year) params.set('year', filters.year)
  if (filters.tag) params.set('tag', filters.tag)
  if (filters.sort) params.set('sort', filters.sort)
  if (cursor) params.set('cursor', cursor)
  const qs = params.toString()
  return `/api/pyqs${qs ? `?${qs}` : ''}`
}

export function PYQFeed({ filters = {}, canDeletePyq = false, onDeletePyq, deletingPyqId = null }: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  usePYQRealtime()

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useInfiniteQuery({
      queryKey: ['pyqs', filters],
      queryFn: ({ pageParam }) =>
        apiFetch<FeedResponse>(buildUrl(filters, pageParam as string | undefined)),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: last => last.nextCursor ?? undefined,
      staleTime: 5 * 60 * 1000,
    })

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  )

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(handleIntersect, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [handleIntersect])

  if (isLoading) {
    return (
      <div className="space-y-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <PYQSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <p className="py-10 text-center text-sm text-red-400">
        Failed to load PYQs. Please try again.
      </p>
    )
  }

  const allItems = data?.pages.flatMap(p => p.items) ?? []

  if (allItems.length === 0) {
    return (
      <p className="py-14 text-center text-sm text-white/60">
        No PYQs found. Be the first to upload!
      </p>
    )
  }

  return (
    <div className="max-w-[680px] space-y-0">
      {allItems.map(pyq => (
        <PYQCard
          key={pyq.id}
          pyq={pyq}
          canDelete={canDeletePyq}
          onDelete={onDeletePyq}
          isDeleting={deletingPyqId === pyq.id}
        />
      ))}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {isFetchingNextPage && (
        <div className="space-y-0 mt-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <PYQSkeleton key={i} />
          ))}
        </div>
      )}

      {!hasNextPage && allItems.length > 0 && (
        <p className="py-6 text-center text-xs text-white/35">
          You've reached the end
        </p>
      )}
    </div>
  )
}
