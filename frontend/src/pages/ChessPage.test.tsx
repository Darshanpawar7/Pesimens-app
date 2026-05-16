import { describe, it, expect, beforeEach } from 'vitest'
import { useChessStore } from '../lib/chess/store'
import type { MultiplayerInfo } from '../lib/chess/types'

// Tests for ChessPage rematch functionality (task 10.5)
// These tests validate the store-level behavior that ChessPage relies on.

const MULTIPLAYER_INFO: MultiplayerInfo = {
  sessionId: 'session-123',
  roomCode: 'ABC12',
  myColour: 'w',
  opponentName: 'Opponent',
}

describe('ChessPage – rematch functionality (Requirement 10.10)', () => {
  beforeEach(() => {
    useChessStore.getState().resetGame()
  })

  describe('rematch action', () => {
    it('resets the board to the starting position', () => {
      const store = useChessStore.getState()
      store.initGame('multiplayer')
      store.setMultiplayerInfo(MULTIPLAYER_INFO)
      // Make a move to dirty the state
      store.selectSquare('e2')
      store.executeMove('e2', 'e4')

      store.rematch()

      const s = useChessStore.getState()
      expect(s.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
      expect(s.turn).toBe('w')
      expect(s.moveHistory).toEqual([])
      expect(s.phase).toBe('playing')
    })

    it('preserves multiplayer info after rematch', () => {
      const store = useChessStore.getState()
      store.initGame('multiplayer')
      store.setMultiplayerInfo(MULTIPLAYER_INFO)

      store.rematch()

      const s = useChessStore.getState()
      expect(s.multiplayer).toEqual(MULTIPLAYER_INFO)
    })

    it('preserves the multiplayer mode after rematch', () => {
      const store = useChessStore.getState()
      store.initGame('multiplayer')
      store.setMultiplayerInfo(MULTIPLAYER_INFO)

      store.rematch()

      expect(useChessStore.getState().mode).toBe('multiplayer')
    })

    it('clears result and game-over state', () => {
      const store = useChessStore.getState()
      store.initGame('multiplayer')
      store.setMultiplayerInfo(MULTIPLAYER_INFO)

      store.rematch()

      const s = useChessStore.getState()
      expect(s.result).toBeNull()
      expect(s.isGameOver).toBe(false)
    })

    it('clears selection and legal moves', () => {
      const store = useChessStore.getState()
      store.initGame('multiplayer')
      store.setMultiplayerInfo(MULTIPLAYER_INFO)
      store.selectSquare('e2')

      store.rematch()

      const s = useChessStore.getState()
      expect(s.selectedSquare).toBeNull()
      expect(s.legalMoves).toEqual([])
    })
  })

  describe('resetGame vs rematch distinction', () => {
    it('resetGame clears multiplayer info', () => {
      const store = useChessStore.getState()
      store.initGame('multiplayer')
      store.setMultiplayerInfo(MULTIPLAYER_INFO)

      store.resetGame()

      expect(useChessStore.getState().multiplayer).toBeNull()
    })

    it('rematch preserves multiplayer info while resetGame does not', () => {
      const store = useChessStore.getState()
      store.initGame('multiplayer')
      store.setMultiplayerInfo(MULTIPLAYER_INFO)

      store.rematch()
      expect(useChessStore.getState().multiplayer).toEqual(MULTIPLAYER_INFO)

      store.resetGame()
      expect(useChessStore.getState().multiplayer).toBeNull()
    })
  })
})
