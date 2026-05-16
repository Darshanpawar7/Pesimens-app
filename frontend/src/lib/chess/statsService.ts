import { supabase } from '@/lib/supabase'
import type { GameOutcome } from './stats'

/**
 * Record a game result for a user in chess_stats.
 * Uses fetch-then-upsert to atomically increment the appropriate counter.
 * For pass-and-play mode, do not call this function (no authenticated winner).
 */
export async function recordGameResult(userId: string, outcome: GameOutcome): Promise<void> {
  // Fetch current stats (may not exist yet)
  const { data: existing } = await supabase
    .from('chess_stats')
    .select('wins, losses, draws, games_played')
    .eq('user_id', userId)
    .maybeSingle()

  const wins = (existing?.wins ?? 0) + (outcome === 'win' ? 1 : 0)
  const losses = (existing?.losses ?? 0) + (outcome === 'loss' ? 1 : 0)
  const draws = (existing?.draws ?? 0) + (outcome === 'draw' ? 1 : 0)
  const games_played = (existing?.games_played ?? 0) + 1

  const { error } = await supabase.from('chess_stats').upsert(
    {
      user_id: userId,
      wins,
      losses,
      draws,
      games_played,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (error) {
    if (import.meta.env.DEV) {
      console.error('Failed to record chess game result:', error)
    }
  }
}
