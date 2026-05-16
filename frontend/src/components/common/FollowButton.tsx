import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'

interface FollowButtonProps {
  userId: string
  initialFollowing: boolean
  onFollowChange?: (nextFollowing: boolean) => void
  size?: 'sm' | 'md'
}

export function FollowButton({ userId, initialFollowing, onFollowChange, size = 'md' }: FollowButtonProps) {
  const { toast } = useToast()
  const currentUserId = useAuthStore(state => state.profile?.id)
  const [following, setFollowing] = useState(initialFollowing)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setFollowing(initialFollowing)
  }, [initialFollowing])

  async function toggleFollow() {
    if (busy) return

    // Avoid self-follow if identity is already known in the client store.
    if (currentUserId && currentUserId === userId) {
      toast({
        variant: 'error',
        title: 'Action not allowed',
        description: 'You cannot follow yourself',
      })
      return
    }

    const prev = following
    const next = !prev
    setFollowing(next)
    onFollowChange?.(next)
    setBusy(true)

    try {
      // apiFetch automatically adds CSRF token for POST requests
      await apiFetch(next ? `/api/profiles/${userId}/follow` : `/api/profiles/${userId}/unfollow`, {
        method: 'POST',
      })
    } catch (error) {
      setFollowing(prev)
      onFollowChange?.(prev)
      toast({
        variant: 'error',
        title: 'Failed to update follow status',
        description: error instanceof Error ? error.message : 'Please try again',
      })
    } finally {
      setBusy(false)
    }
  }

  const padding = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'

  if (!following) {
    return (
      <button
        type="button"
        onClick={() => void toggleFollow()}
        disabled={busy}
        className={`rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 font-semibold text-white transition hover:brightness-110 disabled:opacity-60 ${padding}`}
      >
        Follow
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => void toggleFollow()}
      disabled={busy}
      className={`group rounded-lg border border-indigo-500/50 bg-[#111111] font-semibold text-indigo-200 transition hover:border-red-500/50 hover:text-red-300 disabled:opacity-60 ${padding}`}
    >
      <span className="group-hover:hidden">Following ✓</span>
      <span className="hidden group-hover:inline">Unfollow</span>
    </button>
  )
}
