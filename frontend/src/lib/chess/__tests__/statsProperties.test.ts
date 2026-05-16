// Feature: chess-game, Property 16: Stats accurately reflect game outcomes
// Feature: chess-game, Property 17: Leaderboard ordering invariant

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  applyGameOutcome,
  calculateWinRate,
  createInitialStats,
  type ChessStats,
  type GameOutcome,
} from '../stats'

// ─── Leaderboard sort helper (mirrors what the DB query does) ─────────────────

function sortLeaderboard(rows: ChessStats[]): ChessStats[] {
  return [...rows].sort((a, b) => b.wins - a.wins)
}

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const outcomeArb = fc.constantFrom<GameOutcome>('win', 'loss', 'draw')

const consistentStatsArb = fc
  .record({
    wins: fc.nat({ max: 500 }),
    losses: fc.nat({ max: 500 }),
    draws: fc.nat({ max: 500 }),
  })
  .map(({ wins, losses, draws }) => ({
    user_id: 'user-prop',
    wins,
    losses,
    draws,
    games_played: wins + losses + draws,
  }))

const statsArrayArb = fc.array(
  fc
    .record({
      userId: fc.uuid(),
      wins: fc.nat({ max: 200 }),
      losses: fc.nat({ max: 200 }),
      draws: fc.nat({ max: 200 }),
    })
    .map(({ userId, wins, losses, draws }) => ({
      user_id: userId,
      wins,
      losses,
      draws,
      games_played: wins + losses + draws,
    })),
  { minLength: 0, maxLength: 50 },
)

// ─── Property 16: Stats accurately reflect game outcomes ──────────────────────
// **Validates: Requirements 11.2, 11.5**

describe('Property 16: Stats accurately reflect game outcomes', () => {
  it('games_played increments by exactly 1 for any outcome', () => {
    fc.assert(
      fc.property(consistentStatsArb, outcomeArb, (stats, outcome) => {
        const updated = applyGameOutcome(stats, outcome)
        expect(updated.games_played).toBe(stats.games_played + 1)
      }),
      { numRuns: 100 },
    )
  })

  it('exactly one of wins/losses/draws increments by 1 according to outcome', () => {
    fc.assert(
      fc.property(consistentStatsArb, outcomeArb, (stats, outcome) => {
        const updated = applyGameOutcome(stats, outcome)

        if (outcome === 'win') {
          expect(updated.wins).toBe(stats.wins + 1)
          expect(updated.losses).toBe(stats.losses)
          expect(updated.draws).toBe(stats.draws)
        } else if (outcome === 'loss') {
          expect(updated.wins).toBe(stats.wins)
          expect(updated.losses).toBe(stats.losses + 1)
          expect(updated.draws).toBe(stats.draws)
        } else {
          expect(updated.wins).toBe(stats.wins)
          expect(updated.losses).toBe(stats.losses)
          expect(updated.draws).toBe(stats.draws + 1)
        }
      }),
      { numRuns: 100 },
    )
  })

  it('win_rate = wins / games_played holds for any player with games_played > 0', () => {
    fc.assert(
      fc.property(consistentStatsArb, outcomeArb, (stats, outcome) => {
        const updated = applyGameOutcome(stats, outcome)
        expect(updated.games_played).toBeGreaterThan(0)

        const winRate = calculateWinRate(updated)
        const expected = (updated.wins / updated.games_played) * 100
        expect(winRate).toBeCloseTo(expected, 10)
      }),
      { numRuns: 100 },
    )
  })

  it('win_rate is 0 for a brand-new player with no games', () => {
    fc.assert(
      fc.property(fc.uuid(), (userId) => {
        const stats = createInitialStats(userId)
        expect(calculateWinRate(stats)).toBe(0)
      }),
      { numRuns: 100 },
    )
  })

  it('games_played always equals wins + losses + draws after any sequence of outcomes', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(outcomeArb, { minLength: 1, maxLength: 50 }),
        (userId, outcomes) => {
          let stats = createInitialStats(userId)
          for (const outcome of outcomes) {
            stats = applyGameOutcome(stats, outcome)
          }
          expect(stats.games_played).toBe(stats.wins + stats.losses + stats.draws)
          expect(stats.games_played).toBe(outcomes.length)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('applyGameOutcome does not mutate the input stats object', () => {
    fc.assert(
      fc.property(consistentStatsArb, outcomeArb, (stats, outcome) => {
        const snapshot = { ...stats }
        applyGameOutcome(stats, outcome)
        expect(stats).toEqual(snapshot)
      }),
      { numRuns: 100 },
    )
  })
})

// ─── Property 17: Leaderboard ordering invariant ──────────────────────────────
// **Validates: Requirements 11.1**

describe('Property 17: Leaderboard ordering invariant', () => {
  it('sorted leaderboard has no row with fewer wins appearing before a row with more wins', () => {
    fc.assert(
      fc.property(statsArrayArb, (rows) => {
        const leaderboard = sortLeaderboard(rows)

        for (let i = 0; i < leaderboard.length - 1; i++) {
          expect(leaderboard[i].wins).toBeGreaterThanOrEqual(leaderboard[i + 1].wins)
        }
      }),
      { numRuns: 100 },
    )
  })

  it('leaderboard preserves all rows (no rows dropped or duplicated)', () => {
    fc.assert(
      fc.property(statsArrayArb, (rows) => {
        const leaderboard = sortLeaderboard(rows)
        expect(leaderboard).toHaveLength(rows.length)

        const originalIds = rows.map((r) => r.user_id).sort()
        const sortedIds = leaderboard.map((r) => r.user_id).sort()
        expect(sortedIds).toEqual(originalIds)
      }),
      { numRuns: 100 },
    )
  })

  it('leaderboard is idempotent: sorting an already-sorted result produces the same order', () => {
    fc.assert(
      fc.property(statsArrayArb, (rows) => {
        const once = sortLeaderboard(rows)
        const twice = sortLeaderboard(once)

        expect(twice.map((r) => r.user_id)).toEqual(once.map((r) => r.user_id))
        expect(twice.map((r) => r.wins)).toEqual(once.map((r) => r.wins))
      }),
      { numRuns: 100 },
    )
  })

  it('a single-row leaderboard is trivially ordered', () => {
    fc.assert(
      fc.property(consistentStatsArb, (stats) => {
        const leaderboard = sortLeaderboard([stats])
        expect(leaderboard).toHaveLength(1)
        expect(leaderboard[0]).toEqual(stats)
      }),
      { numRuns: 100 },
    )
  })

  it('empty leaderboard returns empty array', () => {
    const leaderboard = sortLeaderboard([])
    expect(leaderboard).toEqual([])
  })
})
