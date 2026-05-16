import { useState, useCallback } from 'react'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/store/auth'

export interface GameSession {
  id: string
  game_type: 'bluff' | 'chess' | 'ludo' | 'drawl'
  room_code: string
  host_id: string
  players: { id: string; display_name: string }[]
  game_state: Record<string, unknown>
  phase: string
  phase_ends_at: string | null
  created_at: string
}

export interface UseGameSessionReturn {
  session: GameSession | null
  loading: boolean
  error: string | null
  createRoom: (gameType: GameSession['game_type'], isPublic?: boolean) => Promise<string | null>
  joinRoom: (roomCode: string) => Promise<void>
  updateGameState: (sessionId: string, newState: Record<string, unknown>) => Promise<void>
  subscribeToGame: (roomCode: string, callback: (session: GameSession) => void) => () => void
  leaveRoom: (sessionId: string) => Promise<void>
}

// Room code generation is handled server-side by `atomic_create_room`.

export function useGameSession(): UseGameSessionReturn {
  const [session, setSession] = useState<GameSession | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, profile } = useAuthStore()

  const createRoom = useCallback(async (gameType: GameSession['game_type'], isPublic = false): Promise<string | null> => {
    if (!user || !profile) {
      setError('User not authenticated')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const result = await apiFetch<{
        ok: boolean
        session_id?: string
        room_code?: string
        session?: GameSession
        error?: string
      }>('/api/game/create-room', {
        method: 'POST',
        body: JSON.stringify({
          game_type: gameType,
          display_name: profile.display_name || 'Anonymous',
          is_public: isPublic,
        }),
      })

      if (!result.ok || !result.room_code) {
        setError(result.error || 'Failed to create room')
        setLoading(false)
        return null
      }

      if (result.session) {
        setSession(result.session)
      }

      setLoading(false)
      return result.room_code
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message || 'Unknown error')
      setLoading(false)
      return null
    }
  }, [user, profile])

  /**
   * Joins an existing game room by room code.
   *
   * Uses the backend API which calls atomic_join_room via supabaseAdmin,
   * avoiding the Supabase auth.uid() issue for PESIMENS-authenticated users.
   */
  const joinRoom = useCallback(async (roomCode: string): Promise<void> => {
    if (!user || !profile) {
      setError('User not authenticated')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await apiFetch<{
        ok: boolean
        session?: GameSession
        error?: string
      }>('/api/game/join-room', {
        method: 'POST',
        body: JSON.stringify({
          room_code: roomCode,
          display_name: profile.display_name || 'Anonymous',
        }),
      })

      if (!result.ok || !result.session) {
        setError(result.error || 'Failed to join room')
        setLoading(false)
        return
      }

      setSession(result.session)
      setLoading(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message || 'Unknown error')
      setLoading(false)
    }
  }, [user, profile])

  const updateGameState = useCallback(async (sessionId: string, newState: Record<string, unknown>): Promise<void> => {
    if (!user) {
      setError('User not authenticated')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await apiFetch<{ ok: boolean; session?: GameSession; error?: string }>('/api/game/update-state', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId, game_state: newState }),
      })

      if (!result.ok) {
        setError(result.error || 'Failed to update game state')
      } else if (result.session) {
        setSession(result.session)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [user])

  const subscribeToGame = useCallback((roomCode: string, callback: (session: GameSession) => void): (() => void) => {
    // Poll the backend API every 2 seconds since the Supabase client has no
    // session (PESIMENS custom JWT auth) and cannot subscribe to RLS-protected
    // Realtime channels directly.
    let stopped = false
    let lastUpdatedAt: string | null = null

    const poll = async () => {
      if (stopped) return
      try {
        const result = await apiFetch<{ ok: boolean; session?: GameSession }>(`/api/game/session-by-code/${encodeURIComponent(roomCode)}`)
        if (result.ok && result.session) {
          // Only fire callback when something actually changed
          const updatedAt = result.session.created_at + JSON.stringify(result.session.game_state) + JSON.stringify(result.session.players) + result.session.phase
          if (updatedAt !== lastUpdatedAt) {
            lastUpdatedAt = updatedAt
            callback(result.session)
          }
        }
      } catch {
        // best-effort — ignore transient errors
      }
      if (!stopped) {
        window.setTimeout(poll, 2000)
      }
    }

    void poll()

    return () => { stopped = true }
  }, [])

  const leaveRoom = useCallback(async (sessionId: string): Promise<void> => {
    if (!user) {
      setError('User not authenticated')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await apiFetch<{ ok: boolean; error?: string }>('/api/game/leave-room', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId }),
      })

      if (!result.ok) {
        setError(result.error || 'Failed to leave room')
      } else {
        setSession(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [user])

  return {
    session,
    loading,
    error,
    createRoom,
    joinRoom,
    updateGameState,
    subscribeToGame,
    leaveRoom,
  }
}
