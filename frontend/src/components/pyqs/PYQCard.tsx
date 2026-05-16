import { useState } from 'react'
import { apiFetch } from '@/lib/api'

export interface PYQTag {
  tag: { id: string; name: string }
}

export interface PYQ {
  id: string
  course: string
  subject: string
  exam_type: string
  year: number
  question_text?: string
  file_url?: string
  comment_count?: number
  upvote_count: number
  view_count: number
  is_anonymous: boolean
  status: string
  created_at: string
  tags?: PYQTag[]
  uploader?: { display_name?: string | null; karma?: number | null } | null
  user_has_upvoted?: boolean
  user_has_downvoted?: boolean
}

interface Props {
  pyq: PYQ
  canDelete?: boolean
  onDelete?: (pyqId: string) => void
  isDeleting?: boolean
}

function getExamTypeClass(examType: string) {
  const key = examType.toUpperCase()
  if (key === 'MIDSEM' || key === 'ISA1') return 'bg-[#3b82f6]/20 border-[#3b82f6]/40 text-[#93c5fd]'
  if (key === 'ISA2') return 'bg-[#8b5cf6]/20 border-[#8b5cf6]/40 text-[#c4b5fd]'
  if (key === 'ENDSEM' || key === 'ESA') return 'bg-[#ef4444]/20 border-[#ef4444]/40 text-[#fca5a5]'
  if (key === 'QUIZ' || key === 'LAB') return 'bg-[#10b981]/20 border-[#10b981]/40 text-[#6ee7b7]'
  return 'bg-[#222222] border-[#444444] text-gray-300'
}

function getRelativeTime(timestamp: string) {
  const then = new Date(timestamp).getTime()
  const now = Date.now()
  const diffSec = Math.max(1, Math.floor((now - then) / 1000))
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? 'S').toUpperCase()
}

export function PYQCard({ pyq, canDelete = false, onDelete, isDeleting = false }: Props) {
  const [upvotes, setUpvotes] = useState(pyq.upvote_count)
  const [upvoted, setUpvoted] = useState(Boolean(pyq.user_has_upvoted))
  const [downvoted, setDownvoted] = useState(Boolean(pyq.user_has_downvoted))
  const [bookmarked, setBookmarked] = useState(false)
  const [voting, setVoting] = useState(false)
  const [bookmarking, setBookmarking] = useState(false)
  const [openingFile, setOpeningFile] = useState(false)
  const authorName = pyq.is_anonymous ? 'Anonymous' : (pyq.uploader?.display_name || 'Student')
  const visibleTags = pyq.tags?.slice(0, 3) ?? []
  const moreTags = Math.max(0, (pyq.tags?.length ?? 0) - visibleTags.length)
  const commentCount = pyq.comment_count ?? 0

  async function handleUpvote() {
    if (voting) return
    setVoting(true)

    try {
      const res = await apiFetch<{ upvoted: boolean; downvoted?: boolean; upvote_count?: number }>(`/api/pyqs/${pyq.id}/upvote`, { method: 'POST' })
      setUpvoted(res.upvoted)
      setDownvoted(Boolean(res.downvoted))
      if (typeof res.upvote_count === 'number') {
        setUpvotes(res.upvote_count)
      }
    } catch {
    } finally {
      setVoting(false)
    }
  }

  async function handleDownvote() {
    if (voting) return
    setVoting(true)

    try {
      const res = await apiFetch<{ downvoted: boolean; upvoted?: boolean; upvote_count?: number }>(`/api/pyqs/${pyq.id}/downvote`, { method: 'POST' })
      setDownvoted(res.downvoted)
      setUpvoted(Boolean(res.upvoted))
      if (typeof res.upvote_count === 'number') {
        setUpvotes(res.upvote_count)
      }
    } catch {
    } finally {
      setVoting(false)
    }
  }

  async function handleBookmark() {
    if (bookmarking) return // Prevent duplicate clicks
    
    setBookmarking(true)
    try {
      const res = await apiFetch<{ bookmarked: boolean }>(`/api/pyqs/${pyq.id}/bookmark`, { method: 'POST' })
      setBookmarked(res.bookmarked)
    } catch (error) {
      console.error('Failed to update bookmark', error)
    } finally {
      setBookmarking(false)
    }
  }

  async function handleOpenFile() {
    if (openingFile) return
    setOpeningFile(true)

    try {
      const { url } = await apiFetch<{ url: string }>(`/api/pyqs/${pyq.id}/download`)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      if (pyq.file_url) {
        window.open(pyq.file_url, '_blank', 'noopener,noreferrer')
      } else {
        console.error('Failed to open PYQ file', error)
      }
    } finally {
      setOpeningFile(false)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open PYQ ${pyq.subject} ${pyq.exam_type} ${pyq.year}`}
      onClick={handleOpenFile}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          void handleOpenFile()
        }
      }}
      className="group mb-2 block cursor-pointer overflow-hidden rounded-[12px] border border-[#2a2a2a] transition-all duration-150 hover:border-[#3a3a3a] hover:-translate-y-[1px]"
    >
      <div className="flex">
        <div className="w-[40px] shrink-0 rounded-l-[12px] border-r border-[#2a2a2a] bg-[#111111]">
          <div className="flex h-full min-h-[124px] flex-col items-center justify-center gap-1.5 py-2">
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); handleUpvote() }}
              disabled={voting}
              aria-label={`Upvote — ${upvotes} votes`}
              className={[
                'text-sm leading-none transition-colors',
                upvoted
                  ? 'text-[#6366f1] drop-shadow-[0_0_8px_rgba(99,102,241,0.65)]'
                  : 'text-gray-500 hover:text-[#6366f1]',
                voting ? 'opacity-50 cursor-wait' : '',
              ].join(' ')}
            >
              ▲
            </button>
            <span className="text-xs font-bold text-white">{upvotes}</span>
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); handleDownvote() }}
              disabled={voting}
              aria-label={`Downvote — ${upvotes} votes`}
              className={[
                'text-[10px] leading-none transition-colors',
                downvoted
                  ? 'text-[#ef4444] drop-shadow-[0_0_8px_rgba(239,68,68,0.65)]'
                  : 'text-gray-500 hover:text-[#ef4444]',
                voting ? 'opacity-50 cursor-wait' : '',
              ].join(' ')}
            >
              ▼
            </button>
          </div>
        </div>

        <div className="min-w-0 flex-1 rounded-r-[12px] bg-[#1a1a1a] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#6366f1]/40 bg-[#6366f1]/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#c7d2fe]">
              {pyq.subject}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getExamTypeClass(pyq.exam_type)}`}>
              {pyq.exam_type}
            </span>
            <span className="text-xs text-gray-500">{pyq.year}</span>
          </div>

          <div className="mt-2">
            {pyq.question_text ? (
              <p className="line-clamp-2 text-sm text-gray-200">{pyq.question_text}</p>
            ) : (
              <p className="text-sm italic text-gray-500">📎 File attachment</p>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {visibleTags.map(t => (
              <span
                key={t.tag.id}
                className="rounded-full border border-[#444444] bg-[#222222] px-2 py-0.5 text-[10px] text-gray-300"
              >
                {t.tag.name}
              </span>
            ))}
            {moreTags > 0 && (
              <span className="rounded-full border border-[#444444] bg-[#222222] px-2 py-0.5 text-[10px] text-gray-300">
                +{moreTags} more
              </span>
            )}
          </div>

          <div className="my-2 h-px bg-[#2a2a2a]" />

          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="text-gray-500 transition-colors group-hover:text-[#6366f1]">💬 {commentCount} comments</span>
              {pyq.file_url && <span className="text-[#10b981]">📎 {openingFile ? 'Opening...' : 'PDF'}</span>}
              <span className="text-gray-500">⏱ {getRelativeTime(pyq.created_at)}</span>
            </div>

            <div className="flex items-center gap-2">
              {canDelete && onDelete && (
                <button
                  onClick={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    onDelete(pyq.id)
                  }}
                  disabled={isDeleting}
                  aria-label="Delete PYQ"
                  className={[
                    'rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors',
                    'border-red-500/40 text-red-300 hover:bg-red-500/10',
                    isDeleting ? 'cursor-wait opacity-60' : '',
                  ].join(' ')}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              )}

              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#111111] text-[10px] font-semibold text-gray-300">
                {getInitials(authorName)}
              </span>
              <span className="text-[12px] text-gray-400">{authorName}</span>
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); handleBookmark() }}
                disabled={bookmarking}
                aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
                className={[
                  'text-sm transition-colors',
                  bookmarked ? 'text-[#fbbf24]' : 'text-gray-500 hover:text-gray-300',
                  bookmarking ? 'opacity-50 cursor-wait' : '',
                ].join(' ')}
              >
                🔖
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
