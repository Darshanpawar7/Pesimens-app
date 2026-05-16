/**
 * Integration tests for the Chess game feature.
 * Covers: pass-and-play flow, multiplayer room/matchmaking, daily challenge streak,
 * spectator mode, and error-handling edge cases.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useChessStore } from '../store'
import {
  generateRoomCode,
  pairMatchmakingPlayers,
  getPlayerColour,
  type MatchmakingEntry,
} from '../../../components/games/chess/MultiplayerLobby'
import { calculateNewStreak, getPreviousDay } from '../streakLogic'

// ── Supabase mock ─────────────────────────────────────────────────────────────
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      send: vi.fn().mockResolvedValue(undefined),
      track: vi.fn().mockResolvedValue(undefined),
    }),
    removeChannel: vi.fn(),
  },
}))

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

// ─────────────────────────────────────────────────────────────────────────────
// 1. Pass-and-play game flow
// ─────────────────────────────────────────────────────────────────────────────
describe('Pass-and-play game flow', () => {
  beforeEach(() => {
    useChessStore.getState().resetGame()
  })

  it('initGame("passAndPlay") sets phase to "playing" with starting FEN', () => {
    useChessStore.getState().initGame('passAndPlay')
    const s = useChessStore.getState()

    expect(s.phase).toBe('playing')
    expect(s.mode).toBe('passAndPlay')
    expect(s.fen).toBe(STARTING_FEN)
    expect(s.turn).toBe('w')
    expect(s.moveHistory).toHaveLength(0)
    expect(s.isGameOver).toBe(false)
    expect(s.result).toBeNull()
  })

  it('players can make moves alternating turns', () => {
    useChessStore.getState().initGame('passAndPlay')

    useChessStore.getState().executeMove('e2', 'e4')
    expect(useChessStore.getState().turn).toBe('b')

    useChessStore.getState().executeMove('e7', 'e5')
    expect(useChessStore.getState().turn).toBe('w')

    useChessStore.getState().executeMove('g1', 'f3')
    expect(useChessStore.getState().turn).toBe('b')

    expect(useChessStore.getState().moveHistory).toHaveLength(3)
  })

  it("Scholar's Mate ends the game with result 'white'", () => {
    useChessStore.getState().initGame('passAndPlay')

    // Scholar's Mate sequence
    useChessStore.getState().executeMove('e2', 'e4')
    useChessStore.getState().executeMove('e7', 'e5')
    useChessStore.getState().executeMove('f1', 'c4')
    useChessStore.getState().executeMove('b8', 'c6')
    useChessStore.getState().executeMove('d1', 'h5')
    useChessStore.getState().executeMove('g8', 'f6')
    useChessStore.getState().executeMove('h5', 'f7') // Checkmate

    const s = useChessStore.getState()
    expect(s.isGameOver).toBe(true)
    expect(s.result).toBe('white')
    expect(s.phase).toBe('finished')
  })

  it('Play Again (resetGame) returns to home phase', () => {
    useChessStore.getState().initGame('passAndPlay')
    useChessStore.getState().executeMove('e2', 'e4')

    useChessStore.getState().resetGame()
    const s = useChessStore.getState()

    expect(s.phase).toBe('home')
    expect(s.fen).toBe(STARTING_FEN)
    expect(s.moveHistory).toHaveLength(0)
    expect(s.result).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. Multiplayer room creation and joining
// ─────────────────────────────────────────────────────────────────────────────
describe('Multiplayer room creation and joining', () => {
  it('generateRoomCode() produces valid 5-char codes from the correct charset', () => {
    const VALID_CHARS = new Set('ABCDEFGHJKMNPQRSTUVWXYZ23456789'.split(''))
    const code = generateRoomCode(5)

    expect(code).toHaveLength(5)
    for (const ch of code) {
      expect(VALID_CHARS.has(ch)).toBe(true)
    }
  })

  it('generateRoomCode() produces valid 6-char codes from the correct charset', () => {
    const VALID_CHARS = new Set('ABCDEFGHJKMNPQRSTUVWXYZ23456789'.split(''))
    const code = generateRoomCode(6)

    expect(code).toHaveLength(6)
    for (const ch of code) {
      expect(VALID_CHARS.has(ch)).toBe(true)
    }
  })

  it('generateRoomCode() produces different codes on repeated calls (probabilistic)', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateRoomCode()))
    // With 31^6 ≈ 887M possibilities, 20 calls should almost certainly be unique
    expect(codes.size).toBeGreaterThan(1)
  })

  it('pairMatchmakingPlayers() assigns the player with lower joined_at as firstPlayerId', () => {
    const p1: MatchmakingEntry = { user_id: 'user-a', joined_at: '2024-01-01T10:00:00Z' }
    const p2: MatchmakingEntry = { user_id: 'user-b', joined_at: '2024-01-01T10:00:05Z' }

    const pairing = pairMatchmakingPlayers(p1, p2)

    expect(pairing.firstPlayerId).toBe('user-a')
    expect(pairing.secondPlayerId).toBe('user-b')
  })

  it('pairMatchmakingPlayers() works regardless of argument order', () => {
    const p1: MatchmakingEntry = { user_id: 'user-a', joined_at: '2024-01-01T10:00:00Z' }
    const p2: MatchmakingEntry = { user_id: 'user-b', joined_at: '2024-01-01T10:00:05Z' }

    const pairingAB = pairMatchmakingPlayers(p1, p2)
    const pairingBA = pairMatchmakingPlayers(p2, p1)

    expect(pairingAB.firstPlayerId).toBe(pairingBA.firstPlayerId)
    expect(pairingAB.secondPlayerId).toBe(pairingBA.secondPlayerId)
  })

  it('getPlayerColour() returns correct colour for each player', () => {
    const p1: MatchmakingEntry = { user_id: 'user-a', joined_at: '2024-01-01T10:00:00Z' }
    const p2: MatchmakingEntry = { user_id: 'user-b', joined_at: '2024-01-01T10:00:05Z' }

    const pairing = pairMatchmakingPlayers(p1, p2)
    const c1 = getPlayerColour('user-a', pairing)
    const c2 = getPlayerColour('user-b', pairing)

    // Colours must be opposite
    expect(c1).not.toBe(c2)
    expect(['w', 'b']).toContain(c1)
    expect(['w', 'b']).toContain(c2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. Matchmaking flow
// ─────────────────────────────────────────────────────────────────────────────
describe('Matchmaking flow', () => {
  it('pairMatchmakingPlayers() with two entries produces deterministic first/second player', () => {
    const p1: MatchmakingEntry = { user_id: 'alpha', joined_at: '2024-06-01T08:00:00Z' }
    const p2: MatchmakingEntry = { user_id: 'beta', joined_at: '2024-06-01T08:00:10Z' }

    // Run multiple times — first/second must always be the same
    for (let i = 0; i < 10; i++) {
      const pairing = pairMatchmakingPlayers(p1, p2)
      expect(pairing.firstPlayerId).toBe('alpha')
      expect(pairing.secondPlayerId).toBe('beta')
    }
  })

  it('colour assignment is random — both colours appear over many iterations', () => {
    const p1: MatchmakingEntry = { user_id: 'alpha', joined_at: '2024-06-01T08:00:00Z' }
    const p2: MatchmakingEntry = { user_id: 'beta', joined_at: '2024-06-01T08:00:10Z' }

    const colours = new Set<string>()
    for (let i = 0; i < 100; i++) {
      const pairing = pairMatchmakingPlayers(p1, p2)
      colours.add(pairing.firstPlayerColour)
    }

    // Both 'w' and 'b' must appear
    expect(colours.has('w')).toBe(true)
    expect(colours.has('b')).toBe(true)
  })

  it('colour distribution is approximately uniform (35–65% white) over 200 pairings', () => {
    const p1: MatchmakingEntry = { user_id: 'alpha', joined_at: '2024-06-01T08:00:00Z' }
    const p2: MatchmakingEntry = { user_id: 'beta', joined_at: '2024-06-01T08:00:10Z' }

    let whiteCount = 0
    const SAMPLES = 200
    for (let i = 0; i < SAMPLES; i++) {
      const pairing = pairMatchmakingPlayers(p1, p2)
      if (pairing.firstPlayerColour === 'w') whiteCount++
    }

    const rate = whiteCount / SAMPLES
    expect(rate).toBeGreaterThanOrEqual(0.35)
    expect(rate).toBeLessThanOrEqual(0.65)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. Daily challenge completion (unit-level, no DB)
// ─────────────────────────────────────────────────────────────────────────────
describe('Daily challenge completion (streak logic)', () => {
  it('streak increments on consecutive days', () => {
    const today = '2024-03-15'
    const yesterday = getPreviousDay(today)

    const newStreak = calculateNewStreak(yesterday, 3, today)
    expect(newStreak).toBe(4)
  })

  it('streak resets to 1 when a day is missed', () => {
    const today = '2024-03-15'
    const twoDaysAgo = '2024-03-13'

    const newStreak = calculateNewStreak(twoDaysAgo, 5, today)
    expect(newStreak).toBe(1)
  })

  it('completing same day twice is idempotent (does not double-increment)', () => {
    const today = '2024-03-15'
    const yesterday = getPreviousDay(today)

    // First completion today
    const afterFirst = calculateNewStreak(yesterday, 3, today)
    expect(afterFirst).toBe(4)

    // Second completion same day — must not change streak
    const afterSecond = calculateNewStreak(today, afterFirst, today)
    expect(afterSecond).toBe(4)
  })

  it('first ever completion starts streak at 1', () => {
    const newStreak = calculateNewStreak(null, 0, '2024-03-15')
    expect(newStreak).toBe(1)
  })

  it('streak builds correctly over N consecutive days', () => {
    let streak = 0
    let lastDate: string | null = null
    const startDate = '2024-01-01'

    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate + 'T00:00:00Z')
      d.setUTCDate(d.getUTCDate() + i)
      const dateStr = d.toISOString().slice(0, 10)
      streak = calculateNewStreak(lastDate, streak, dateStr)
      lastDate = dateStr
    }

    expect(streak).toBe(7)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. Spectator mode
// ─────────────────────────────────────────────────────────────────────────────
describe('Spectator mode', () => {
  beforeEach(() => {
    useChessStore.getState().resetGame()
  })

  it('startSpectating() sets mode to "spectator" and phase to "playing"', () => {
    useChessStore.getState().startSpectating('session-1', 'ABCDE')
    const s = useChessStore.getState()

    expect(s.mode).toBe('spectator')
    expect(s.phase).toBe('playing')
    expect(s.multiplayer?.sessionId).toBe('session-1')
    expect(s.multiplayer?.roomCode).toBe('ABCDE')
  })

  it('startSpectating() loads the provided FEN', () => {
    // Use a FEN without en-passant so chess.js does not normalise it away
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3'
    useChessStore.getState().startSpectating('session-2', 'XYZAB', fen)

    expect(useChessStore.getState().fen).toBe(fen)
  })

  it('selectSquare() is a no-op in spectator mode', () => {
    useChessStore.getState().startSpectating('session-3', 'QQQQQ')
    const fenBefore = useChessStore.getState().fen

    useChessStore.getState().selectSquare('e2')

    const s = useChessStore.getState()
    expect(s.selectedSquare).toBeNull()
    expect(s.legalMoves).toEqual([])
    expect(s.fen).toBe(fenBefore)
  })

  it('executeMove() is a no-op in spectator mode', () => {
    useChessStore.getState().startSpectating('session-4', 'RRRRR')
    const fenBefore = useChessStore.getState().fen

    useChessStore.getState().executeMove('e2', 'e4')

    const s = useChessStore.getState()
    expect(s.fen).toBe(fenBefore)
    expect(s.moveHistory).toHaveLength(0)
  })

  it('loadFromFen() updates the board in spectator mode (for live updates)', () => {
    useChessStore.getState().startSpectating('session-5', 'LLLLL')

    // Use a FEN without en-passant so chess.js does not normalise it away
    const newFen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3'
    useChessStore.getState().loadFromFen(newFen)

    expect(useChessStore.getState().fen).toBe(newFen)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. Error handling integration
// ─────────────────────────────────────────────────────────────────────────────
describe('Error handling integration', () => {
  beforeEach(() => {
    useChessStore.getState().resetGame()
  })

  it('cancelPromotion() clears promotionPending and resets selection', () => {
    // Set up a promotion-pending state
    useChessStore.getState().loadFromFen('4k3/P7/8/8/8/8/8/4K3 w - - 0 1')
    useChessStore.setState({ phase: 'playing' })

    // Trigger promotion pending
    useChessStore.getState().executeMove('a7', 'a8')
    expect(useChessStore.getState().promotionPending).not.toBeNull()

    // Cancel it
    useChessStore.getState().cancelPromotion()
    const s = useChessStore.getState()

    expect(s.promotionPending).toBeNull()
    expect(s.selectedSquare).toBeNull()
    expect(s.legalMoves).toEqual([])
  })

  it('loadFromFen() with invalid FEN sets error state', () => {
    useChessStore.getState().loadFromFen('this-is-not-a-fen')
    const s = useChessStore.getState()

    expect(s.error).toBe('Invalid FEN string')
  })

  it('loadFromFen() with invalid FEN does not change the board position', () => {
    useChessStore.getState().initGame('passAndPlay')
    const fenBefore = useChessStore.getState().fen

    useChessStore.getState().loadFromFen('garbage-fen-!!!')
    // FEN should remain unchanged after a failed load
    expect(useChessStore.getState().fen).toBe(fenBefore)
  })

  it('applyRemoteGameState() with invalid FEN resets to starting position', () => {
    useChessStore.getState().initGame('passAndPlay')
    // Set multiplayer mode so applyRemoteGameState processes the fen+moveHistory path
    useChessStore.setState({
      mode: 'multiplayer',
      multiplayer: {
        sessionId: 'sess-1',
        roomCode: 'ABCDE',
        myColour: 'w',
        opponentName: 'Opponent',
      },
    })

    useChessStore.getState().applyRemoteGameState({
      fen: 'not-a-valid-fen',
      moveHistory: [],
    })

    const s = useChessStore.getState()
    expect(s.fen).toBe(STARTING_FEN)
    expect(s.error).toBeTruthy()
  })
})
