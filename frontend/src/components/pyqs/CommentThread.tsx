import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

export interface Comment {
  id: string
  author_id: string
  content: string
  is_anonymous: boolean
  upvote_count: number
  parent_comment_id: string | null
  created_at: string
  replies?: Comment[]
}

interface Props {
  pyqId: string
  comments: Comment[]
  onRefresh: () => void
}

interface CommentItemProps {
  comment: Comment
  pyqId: string
  depth?: number
  onRefresh: () => void
}

function CommentItem({ comment, pyqId, depth = 0, onRefresh }: CommentItemProps) {
  const { profile } = useAuthStore()
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [upvotes, setUpvotes] = useState(comment.upvote_count)

  async function handleUpvote() {
    setUpvotes(v => v + 1)
    try {
      await apiFetch(`/api/comments/${comment.id}/upvote`, { method: 'POST' })
    } catch {
      setUpvotes(v => v - 1)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this comment?')) return
    try {
      await apiFetch(`/api/comments/${comment.id}`, { method: 'DELETE' })
      onRefresh()
    } catch (error) {
      console.error('Failed to delete comment', error)
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!replyText.trim()) return
    try {
      await apiFetch(`/api/pyqs/${pyqId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: replyText, parent_comment_id: comment.id }),
      })
      setReplyText('')
      setReplying(false)
      onRefresh()
    } catch (error) {
      console.error('Failed to post reply', error)
    }
  }

  const isOwn = profile?.id === comment.author_id

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l-2 border-[#2a2a2a] pl-3' : ''}`}>
      <div className="py-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-gray-500 font-medium">
            {comment.is_anonymous ? 'Anonymous' : 'User'} · {new Date(comment.created_at).toLocaleDateString()}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUpvote}
              aria-label={`Upvote comment (${upvotes})`}
              className="text-xs text-gray-500 hover:text-blue-500 transition-colors"
            >
              ▲ {upvotes}
            </button>
            {isOwn && (
              <button
                onClick={handleDelete}
                aria-label="Delete comment"
                className="text-xs text-gray-500 hover:text-red-500 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-200 mt-1">{comment.content}</p>
        {depth < 2 && (
          <button
            onClick={() => setReplying(r => !r)}
            className="text-xs text-gray-500 hover:text-blue-500 mt-1 transition-colors"
          >
            Reply
          </button>
        )}
      </div>

      {replying && (
        <form onSubmit={handleReply} className="flex gap-2 mb-2">
          <input
            className="flex-1 bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            placeholder="Write a reply..."
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            autoFocus
          />
          <Button type="submit" size="sm">Post</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setReplying(false)}>Cancel</Button>
        </form>
      )}

      {comment.replies?.map(reply => (
        <CommentItem key={reply.id} comment={reply} pyqId={pyqId} depth={depth + 1} onRefresh={onRefresh} />
      ))}
    </div>
  )
}

export function CommentThread({ pyqId, comments, onRefresh }: Props) {
  const [text, setText] = useState('')
  const [isAnon, setIsAnon] = useState(false)
  const [posting, setPosting] = useState(false)

  // Build tree from flat list
  const roots: Comment[] = []
  const map = new Map<string, Comment>()
  for (const c of comments) map.set(c.id, { ...c, replies: [] })
  for (const c of map.values()) {
    if (c.parent_comment_id && map.has(c.parent_comment_id)) {
      map.get(c.parent_comment_id)!.replies!.push(c)
    } else {
      roots.push(c)
    }
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setPosting(true)
    try {
      await apiFetch(`/api/pyqs/${pyqId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: text, is_anonymous: isAnon }),
      })
      setText('')
      onRefresh()
    } catch (error) {
      console.error('Failed to post comment', error)
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-200">Discussion ({comments.length})</h3>

      <form onSubmit={handlePost} className="space-y-2">
        <textarea
          className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none resize-none"
          rows={2}
          placeholder="Add a comment..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={isAnon} onChange={e => setIsAnon(e.target.checked)} />
            Post anonymously
          </label>
          <Button type="submit" size="sm" disabled={posting || !text.trim()}>
            {posting ? 'Posting...' : 'Comment'}
          </Button>
        </div>
      </form>

      <div className="divide-y divide-[#2a2a2a]">
        {roots.map(c => (
          <CommentItem key={c.id} comment={c} pyqId={pyqId} onRefresh={onRefresh} />
        ))}
      </div>

      {roots.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">No comments yet. Start the discussion!</p>
      )}
    </div>
  )
}
