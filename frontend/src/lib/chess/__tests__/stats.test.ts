import { describe, it, expect } from 'vitest'
import { applyGameOutcome, calculateWinRate, createInitialStats } from '../stats'
import type { ChessStats } from '../stats'

describe('Chess Stats', () => {
  const baseStats: ChessStats = {
    user_id: 'user-1',
    wins: 0,
    losses: 0,
    draws: 0,
    games_played: 0,
  }

  describe('applyGameOutcome', () => {
    it('increments wins and games_played on win', () => {
      const result = applyGameOutcome(baseStats, 'win')
      expect(result.wins).toBe(1)
      expect(result.losses).toBe(0)
      expect(result.draws).toBe(0)
      expect(result.games_played).toBe(1)
    })

    it('increments losses and games_played on loss', () => {
      const result = applyGameOutcome(baseStats, 'loss')
      expect(result.wins).toBe(0)
      expect(result.losses).toBe(1)
      expect(result.draws).toBe(0)
      expect(result.games_played).toBe(1)
    })

    it('increments draws and games_played on draw', () => {
      const result = applyGameOutcome(baseStats, 'draw')
      expect(result.wins).toBe(0)
      expect(result.losses).toBe(0)
      expect(result.draws).toBe(1)
      expect(result.games_played).toBe(1)
    })

    it('does not mutate the input stats', () => {
      const original = { ...baseStats }
      applyGameOutcome(baseStats, 'win')
      expect(baseStats).toEqual(original)
    })

    it('accumulates correctly over multiple games', () => {
      let stats = baseStats
      stats = applyGameOutcome(stats, 'win')
      stats = applyGameOutcome(stats, 'win')
      stats = applyGameOutcome(stats, 'loss')
      stats = applyGameOutcome(stats, 'draw')

      expect(stats.wins).toBe(2)
      expect(stats.losses).toBe(1)
      expect(stats.draws).toBe(1)
      expect(stats.games_played).toBe(4)
    })
  })

  describe('calculateWinRate', () => {
    it('returns 0 when no games played', () => {
      expect(calculateWinRate(baseStats)).toBe(0)
    })

    it('returns 100 when all games are wins', () => {
      const stats = { ...baseStats, wins: 5, games_played: 5 }
      expect(calculateWinRate(stats)).toBe(100)
    })

    it('returns 0 when no wins', () => {
      const stats = { ...baseStats, losses: 3, games_played: 3 }
      expect(calculateWinRate(stats)).toBe(0)
    })

    it('calculates correct win rate for mixed results', () => {
      const stats = { ...baseStats, wins: 3, losses: 1, games_played: 4 }
      expect(calculateWinRate(stats)).toBe(75)
    })

    it('win_rate = wins / games_played holds for any valid stats', () => {
      const stats = { ...baseStats, wins: 7, losses: 2, draws: 1, games_played: 10 }
      expect(calculateWinRate(stats)).toBe(70)
    })
  })

  describe('createInitialStats', () => {
    it('creates stats with all zeros for a new user', () => {
      const stats = createInitialStats('new-user-id')
      expect(stats.user_id).toBe('new-user-id')
      expect(stats.wins).toBe(0)
      expect(stats.losses).toBe(0)
      expect(stats.draws).toBe(0)
      expect(stats.games_played).toBe(0)
    })
  })
})
