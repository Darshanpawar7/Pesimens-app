import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/auth'
import { ChessBoard } from './ChessBoard'
import { useChessStore } from '../../../lib/chess/store'
import { insertActivityEvent } from '../../../lib/chess/store'
import { calculateNewStreak, getTodayUTC } from '../../../lib/chess/streakLogic'
import { Skeleton } from './Skeleton'
import { ErrorBanner } from './ErrorBanner'
import { trackChessEvent } from '../../../lib/chess/analytics'

interface DailyChallenge {
  id: string
  challenge_date: string
  fen: string
  solution_moves: string[]
  description: string
}

interface ChallengeCompletion {
  challenge_date: string
  streak_count: number
}

export function DailyChallenge() {
  const user = useAuthStore((s) => s.user)

  const [challenge, setChallenge] = useState<DailyChallenge | null>(null)
  const [completion, setCompletion] = useState<ChallengeCompletion | null>(null)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFromFen = useChessStore((s) => s.loadFromFen)
  const todayDate = getTodayUTC()

  const fetchChallenge = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: challengeData, error: challengeErr } = await supabase
        .from('chess_daily_challenges')
        .select('id, challenge_date, fen, solution_moves, description')
        .eq('challenge_date', todayDate)
        .single()

      // PGRST116 = no rows found — not an error, just no challenge today
      if (challengeErr && challengeErr.code !== 'PGRST116') throw challengeErr

      setChallenge(challengeData ?? null)
      if (challengeData) loadFromFen(challengeData.fen)

      if (user) {
        const { data: todayCompletion } = await supabase
          .from('chess_challenge_completions')
          .select('challenge_date, streak_count')
          .eq('user_id', user.id)
          .eq('challenge_date', todayDate)
          .single()

        setCompletion(todayCompletion ?? null)

        const { data: latestCompletion } = await supabase
          .from('chess_challenge_completions')
          .select('streak_count')
          .eq('user_id', user.id)
          .order('challenge_date', { ascending: false })
          .limit(1)
          .single()

        setStreak(latestCompletion?.streak_count ?? 0)
      }
    } catch (err) {
      console.error('DailyChallenge fetch error:', err)
      setError('Failed to load challenge')
    } finally {
      setLoading(false)
    }
  }, [user, todayDate, loadFromFen])

  useEffect(() => {
    void fetchChallenge()
  }, [fetchChallenge])

  const handleComplete = useCallback(async () => {
    if (!user || !challenge || completing || completion) return
    setCompleting(true)
    try {
      const { data: prevCompletion } = await supabase
        .from('chess_challenge_completions')
        .select('challenge_date, streak_count')
        .eq('user_id', user.id)
        .order('challenge_date', { ascending: false })
        .limit(1)
        .single()

      const lastDate = prevCompletion?.challenge_date ?? null
      const currentStreak = prevCompletion?.streak_count ?? 0
      const newStreak = calculateNewStreak(lastDate, currentStreak, todayDate)

      const { error: upsertErr } = await supabase
        .from('chess_challenge_completions')
        .upsert(
          { user_id: user.id, challenge_date: todayDate, streak_count: newStreak },
          { onConflict: 'user_id,challenge_date' }
        )

      if (upsertErr) throw upsertErr

      setCompletion({ challenge_date: todayDate, streak_count: newStreak })
      setStreak(newStreak)

      // Fire activity events
      void insertActivityEvent('🎯 A player completed today\'s daily challenge!')
      if (newStreak >= 3) {
        void insertActivityEvent('🔥 A player is on a win streak!')
      }
    } catch (err) {
      console.error('Complete challenge error:', err)
    } finally {
      setCompleting(false)
    }
  }, [user, challenge, completion, completing, todayDate])

  if (loading) {
    return (
      <div style={styles.container}>
        <h2 style={styles.heading}>📅 Daily Challenge</h2>
        <div style={styles.card}>
          <Skeleton height={20} />
          <Skeleton height={200} style={{ marginTop: 12 }} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.container}>
        <h2 style={styles.heading}>📅 Daily Challenge</h2>
        <div style={styles.card}>
          <ErrorBanner
            message={error}
            onClose={() => setError(null)}
            action={{
              label: 'Reload Challenge',
              onClick: () => {
                void trackChessEvent('error_retry', { action: 'daily_challenge' })
                void fetchChallenge()
              },
            }}
            autoDismissMs={0}
          />
        </div>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div style={styles.container}>
        <h2 style={styles.heading}>📅 Daily Challenge</h2>
        <div style={styles.card}>
          <p style={styles.emptyText}>No challenge today. Check back tomorrow!</p>
        </div>
      </div>
    )
  }

  const isCompleted = completion !== null

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h2 style={styles.heading}>📅 Daily Challenge</h2>
        {user && streak > 0 && (
          <div style={styles.streakBadge}>🔥 {streak} day streak</div>
        )}
      </div>
      <div style={styles.card}>
        <p style={styles.description}>{challenge.description}</p>
        <div style={styles.boardWrapper}>
          <ChessBoard readOnly />
        </div>
        {user && (
          <div style={styles.actionRow}>
            {isCompleted ? (
              <div style={styles.completedBadge}>✅ Completed today!</div>
            ) : (
              <button
                style={styles.completeBtn}
                onClick={() => void handleComplete()}
                disabled={completing}
              >
                {completing ? 'Saving…' : 'Mark as Completed'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    width: '100%',
    maxWidth: 480,
    margin: '0 auto',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: '#ffffff',
  },
  streakBadge: {
    background: 'rgba(251,146,60,0.15)',
    border: '1px solid rgba(251,146,60,0.4)',
    borderRadius: 20,
    padding: '4px 12px',
    fontSize: 13,
    fontWeight: 600,
    color: '#fb923c',
  },
  card: {
    background: '#1a1a1a',
    borderRadius: 12,
    padding: '20px 24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    border: '1px solid #2a2a2a',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    alignItems: 'center',
  },
  description: {
    margin: 0,
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 1.5,
  },
  boardWrapper: {
    transform: 'scale(0.65)',
    transformOrigin: 'top center',
    marginBottom: -120,
  },
  actionRow: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
  },
  completeBtn: {
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  completedBadge: {
    background: 'rgba(34,197,94,0.15)',
    border: '1px solid rgba(34,197,94,0.4)',
    borderRadius: 8,
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    color: '#22c55e',
    textAlign: 'center',
  },
  skeleton: {
    width: '100%',
    height: 20,
    borderRadius: 6,
    background: 'linear-gradient(90deg, #1f1f1f 25%, #2a2a2a 50%, #1f1f1f 75%)',
    backgroundSize: '200% 100%',
  },
  errorText: {
    margin: 0,
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
  retryBtn: {
    background: 'transparent',
    color: '#6366f1',
    border: '1px solid #6366f1',
    borderRadius: 8,
    padding: '8px 20px',
    fontSize: 13,
    cursor: 'pointer',
  },
  emptyText: {
    margin: 0,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
}
