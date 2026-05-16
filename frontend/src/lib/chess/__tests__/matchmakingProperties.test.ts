import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  pairMatchmakingPlayers,
  getPlayerColour,
  type MatchmakingEntry,
} from '../../../components/games/chess/MultiplayerLobby'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generate a random ISO timestamp string offset by `offsetMs` from a base time */
function makeTimestamp(baseMs: number, offsetMs: number): string {
  return new Date(baseMs + offsetMs).toISOString()
}

const BASE_TIME = new Date('2024-01-01T00:00:00Z').getTime()

/** Arbitrary for a matchmaking entry with a unique user_id and a timestamp */
const entryArbitrary = fc
  .record({
    user_id: fc.uuid(),
    offsetMs: fc.integer({ min: 0, max: 1_000_000 }),
  })
  .map(({ user_id, offsetMs }): MatchmakingEntry => ({
    user_id,
    joined_at: makeTimestamp(BASE_TIME, offsetMs),
  }))

/** Two distinct matchmaking entries */
const twoDifferentEntriesArbitrary = fc
  .tuple(entryArbitrary, entryArbitrary)
  .filter(([p1, p2]) => p1.user_id !== p2.user_id)

// ── Property 18: Matchmaking pairs exactly two players ────────────────────────
// Feature: chess-game, Property 18: Matchmaking pairs exactly two players
// **Validates: Requirements 12.2, 12.3, 12.4, 12.5**
describe('Property 18: Matchmaking pairs exactly two players', () => {
  it('should produce a pairing that contains both P1 and P2', () => {
    fc.assert(
      fc.property(twoDifferentEntriesArbitrary, ([p1, p2]) => {
        const pairing = pairMatchmakingPlayers(p1, p2)

        // Both players must appear in the pairing
        const playerIds = new Set([pairing.firstPlayerId, pairing.secondPlayerId])
        expect(playerIds.has(p1.user_id)).toBe(true)
        expect(playerIds.has(p2.user_id)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  it('should produce exactly one pairing (no duplicates)', () => {
    fc.assert(
      fc.property(twoDifferentEntriesArbitrary, ([p1, p2]) => {
        const pairing = pairMatchmakingPlayers(p1, p2)

        // firstPlayerId and secondPlayerId must be distinct
        expect(pairing.firstPlayerId).not.toBe(pairing.secondPlayerId)
      }),
      { numRuns: 100 }
    )
  })

  it('should assign the player with the lower joined_at as firstPlayerId', () => {
    fc.assert(
      fc.property(twoDifferentEntriesArbitrary, ([p1, p2]) => {
        const pairing = pairMatchmakingPlayers(p1, p2)

        // The first player must be the one who joined earlier
        const expectedFirst = p1.joined_at <= p2.joined_at ? p1.user_id : p2.user_id
        expect(pairing.firstPlayerId).toBe(expectedFirst)
      }),
      { numRuns: 100 }
    )
  })

  it('should assign the player with the higher joined_at as secondPlayerId', () => {
    fc.assert(
      fc.property(twoDifferentEntriesArbitrary, ([p1, p2]) => {
        const pairing = pairMatchmakingPlayers(p1, p2)

        const expectedSecond = p1.joined_at <= p2.joined_at ? p2.user_id : p1.user_id
        expect(pairing.secondPlayerId).toBe(expectedSecond)
      }),
      { numRuns: 100 }
    )
  })

  it('should assign a valid colour (w or b) to the first player', () => {
    fc.assert(
      fc.property(twoDifferentEntriesArbitrary, ([p1, p2]) => {
        const pairing = pairMatchmakingPlayers(p1, p2)
        expect(['w', 'b']).toContain(pairing.firstPlayerColour)
      }),
      { numRuns: 100 }
    )
  })

  it('getPlayerColour should return opposite colours for the two players', () => {
    fc.assert(
      fc.property(twoDifferentEntriesArbitrary, ([p1, p2]) => {
        const pairing = pairMatchmakingPlayers(p1, p2)

        const colour1 = getPlayerColour(p1.user_id, pairing)
        const colour2 = getPlayerColour(p2.user_id, pairing)

        // Colours must be different
        expect(colour1).not.toBe(colour2)
        // Both must be valid
        expect(['w', 'b']).toContain(colour1)
        expect(['w', 'b']).toContain(colour2)
      }),
      { numRuns: 100 }
    )
  })
})

// ── Property 19: Colour assignment is random across matchmaking pairings ──────
// Feature: chess-game, Property 19: Colour assignment is random across matchmaking pairings
// **Validates: Requirements 12.5**
describe('Property 19: Colour assignment is random across matchmaking pairings', () => {
  it('should assign White to the first player no more than 65% of the time over 200 pairings', () => {
    // Use fixed player IDs so we can track colour distribution
    const p1: MatchmakingEntry = {
      user_id: 'player-1',
      joined_at: makeTimestamp(BASE_TIME, 0),
    }
    const p2: MatchmakingEntry = {
      user_id: 'player-2',
      joined_at: makeTimestamp(BASE_TIME, 1000), // p1 always joins first
    }

    const SAMPLE_SIZE = 200
    let p1WhiteCount = 0

    for (let i = 0; i < SAMPLE_SIZE; i++) {
      const pairing = pairMatchmakingPlayers(p1, p2)
      if (getPlayerColour(p1.user_id, pairing) === 'w') {
        p1WhiteCount++
      }
    }

    const p1WhiteRate = p1WhiteCount / SAMPLE_SIZE

    // Neither player should receive White more than 65% of the time
    expect(p1WhiteRate).toBeLessThanOrEqual(0.65)
    // And not less than 35% (symmetric bound)
    expect(p1WhiteRate).toBeGreaterThanOrEqual(0.35)
  })

  it('should assign White to the second player no more than 65% of the time over 200 pairings', () => {
    const p1: MatchmakingEntry = {
      user_id: 'player-a',
      joined_at: makeTimestamp(BASE_TIME, 0),
    }
    const p2: MatchmakingEntry = {
      user_id: 'player-b',
      joined_at: makeTimestamp(BASE_TIME, 500),
    }

    const SAMPLE_SIZE = 200
    let p2WhiteCount = 0

    for (let i = 0; i < SAMPLE_SIZE; i++) {
      const pairing = pairMatchmakingPlayers(p1, p2)
      if (getPlayerColour(p2.user_id, pairing) === 'w') {
        p2WhiteCount++
      }
    }

    const p2WhiteRate = p2WhiteCount / SAMPLE_SIZE
    expect(p2WhiteRate).toBeLessThanOrEqual(0.65)
    expect(p2WhiteRate).toBeGreaterThanOrEqual(0.35)
  })

  it('should produce both w and b assignments across many pairings (not always the same colour)', () => {
    // Property: over 100 pairings, both colours must appear at least once
    const p1: MatchmakingEntry = {
      user_id: 'fixed-p1',
      joined_at: makeTimestamp(BASE_TIME, 0),
    }
    const p2: MatchmakingEntry = {
      user_id: 'fixed-p2',
      joined_at: makeTimestamp(BASE_TIME, 100),
    }

    const colours = new Set<string>()
    for (let i = 0; i < 100; i++) {
      const pairing = pairMatchmakingPlayers(p1, p2)
      colours.add(pairing.firstPlayerColour)
    }

    // Both colours must appear — colour assignment is not deterministic
    expect(colours.has('w')).toBe(true)
    expect(colours.has('b')).toBe(true)
  })

  it('should always assign exactly one White and one Black per pairing', () => {
    fc.assert(
      fc.property(twoDifferentEntriesArbitrary, ([p1, p2]) => {
        const pairing = pairMatchmakingPlayers(p1, p2)
        const c1 = getPlayerColour(p1.user_id, pairing)
        const c2 = getPlayerColour(p2.user_id, pairing)

        const colours = [c1, c2].sort()
        expect(colours).toEqual(['b', 'w'])
      }),
      { numRuns: 100 }
    )
  })
})
