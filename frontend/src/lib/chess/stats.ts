// Chess stats calculation utilities

export interface ChessStats {
  user_id: string
  wins: number
  losses: number
  draws: number
  games_played: number
}

export type GameOutcome = 'win' | 'loss' | 'draw'

/**
 * Calculate updated stats after a game outcome.
 * Returns the new stats object (does not mutate input).
 */
export function applyGameOutcome(stats: ChessStats, outcome: GameOutcome): ChessStats {
  const updated = { ...stats, games_played: stats.games_played + 1 }
  if (outcome === 'win') updated.wins = stats.wins + 1
  else if (outcome === 'loss') updated.losses = stats.losses + 1
  else updated.draws = stats.draws + 1
  return updated
}

/**
 * Calculate win rate as a percentage (0-100).
 * Returns 0 if no games played.
 */
export function calculateWinRate(stats: ChessStats): number {
  if (stats.games_played === 0) return 0
  return (stats.wins / stats.games_played) * 100
}

/**
 * Create initial stats for a new user.
 */
export function createInitialStats(userId: string): ChessStats {
  return {
    user_id: userId,
    wins: 0,
    losses: 0,
    draws: 0,
    games_played: 0,
  }
}
