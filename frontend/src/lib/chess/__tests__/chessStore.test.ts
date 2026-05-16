import { describe, it, expect, beforeEach } from 'vitest'
import { useChessStore } from '../store'

describe('ChessStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useChessStore.getState().resetGame()
  })

  describe('initGame', () => {
    it('should initialize game with starting position', () => {
      useChessStore.getState().initGame('passAndPlay')
      const store = useChessStore.getState()

      expect(store.phase).toBe('playing')
      expect(store.mode).toBe('passAndPlay')
      expect(store.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
      expect(store.turn).toBe('w')
      expect(store.inCheck).toBe(false)
      expect(store.isGameOver).toBe(false)
      expect(store.moveHistory).toEqual([])
    })
  })

  describe('selectSquare', () => {
    it('should select a square with a white piece on white turn', () => {
      useChessStore.getState().initGame('passAndPlay')
      useChessStore.getState().selectSquare('e2')
      const store = useChessStore.getState()

      expect(store.selectedSquare).toBe('e2')
      expect(store.legalMoves).toContain('e3')
      expect(store.legalMoves).toContain('e4')
    })

    it('should not select a square with a black piece on white turn', () => {
      useChessStore.getState().initGame('passAndPlay')
      useChessStore.getState().selectSquare('e7')
      const store = useChessStore.getState()

      expect(store.selectedSquare).toBe(null)
      expect(store.legalMoves).toEqual([])
    })

    it('should deselect when clicking the same square', () => {
      useChessStore.getState().initGame('passAndPlay')
      useChessStore.getState().selectSquare('e2')
      let store = useChessStore.getState()
      expect(store.selectedSquare).toBe('e2')

      useChessStore.getState().selectSquare('e2')
      store = useChessStore.getState()
      expect(store.selectedSquare).toBe(null)
      expect(store.legalMoves).toEqual([])
    })

    it('should switch selection when clicking another own piece', () => {
      useChessStore.getState().initGame('passAndPlay')
      useChessStore.getState().selectSquare('e2')
      let store = useChessStore.getState()
      expect(store.selectedSquare).toBe('e2')

      useChessStore.getState().selectSquare('d2')
      store = useChessStore.getState()
      expect(store.selectedSquare).toBe('d2')
      expect(store.legalMoves).toContain('d3')
      expect(store.legalMoves).toContain('d4')
    })
  })

  describe('executeMove', () => {
    it('should execute a valid move', () => {
      useChessStore.getState().initGame('passAndPlay')
      useChessStore.getState().executeMove('e2', 'e4')
      const store = useChessStore.getState()

      expect(store.turn).toBe('b')
      expect(store.lastMove).toEqual({ from: 'e2', to: 'e4' })
      expect(store.moveHistory).toHaveLength(1)
      expect(store.moveHistory[0].san).toBe('e4')
    })

    it('should not execute an invalid move', () => {
      useChessStore.getState().initGame('passAndPlay')
      const initialFen = useChessStore.getState().fen

      useChessStore.getState().executeMove('e2', 'e5') // Invalid move
      const store = useChessStore.getState()

      expect(store.fen).toBe(initialFen)
      expect(store.moveHistory).toHaveLength(0)
    })

    it('should alternate turns after each move', () => {
      useChessStore.getState().initGame('passAndPlay')

      useChessStore.getState().executeMove('e2', 'e4')
      let store = useChessStore.getState()
      expect(store.turn).toBe('b')

      useChessStore.getState().executeMove('e7', 'e5')
      store = useChessStore.getState()
      expect(store.turn).toBe('w')
    })

    it('should detect check', () => {
      useChessStore.getState().initGame('passAndPlay')

      // Set up a position where white can check black
      useChessStore.getState().loadFromFen('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2')
      useChessStore.getState().executeMove('f1', 'c4') // Bishop to c4
      useChessStore.getState().executeMove('b8', 'c6') // Black knight
      useChessStore.getState().executeMove('d1', 'h5') // Queen to h5
      useChessStore.getState().executeMove('g8', 'f6') // Black knight blocks
      useChessStore.getState().executeMove('h5', 'f7') // Check!
      const store = useChessStore.getState()

      expect(store.inCheck).toBe(true)
    })

    it('should detect checkmate (Scholar\'s Mate)', () => {
      useChessStore.getState().initGame('passAndPlay')

      useChessStore.getState().executeMove('e2', 'e4')
      useChessStore.getState().executeMove('e7', 'e5')
      useChessStore.getState().executeMove('f1', 'c4')
      useChessStore.getState().executeMove('b8', 'c6')
      useChessStore.getState().executeMove('d1', 'h5')
      useChessStore.getState().executeMove('g8', 'f6')
      useChessStore.getState().executeMove('h5', 'f7') // Checkmate
      const store = useChessStore.getState()

      expect(store.isGameOver).toBe(true)
      expect(store.result).toBe('white')
      expect(store.phase).toBe('finished')
    })
  })

  describe('loadFromFen', () => {
    it('should load a valid FEN string', () => {
      const testFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

      useChessStore.getState().loadFromFen(testFen)
      const store = useChessStore.getState()

      expect(store.fen).toBe(testFen)
      expect(store.turn).toBe('b')
      expect(store.moveHistory).toEqual([])
    })

    it('should handle invalid FEN gracefully', () => {
      const initialFen = useChessStore.getState().fen

      useChessStore.getState().loadFromFen('invalid-fen-string')
      const store = useChessStore.getState()

      expect(store.error).toBe('Invalid FEN string')
      // FEN should remain unchanged
      expect(store.fen).toBe(initialFen)
    })
  })

  describe('resetGame', () => {
    it('should reset to initial position', () => {
      useChessStore.getState().initGame('passAndPlay')

      // Make some moves
      useChessStore.getState().executeMove('e2', 'e4')
      useChessStore.getState().executeMove('e7', 'e5')

      // Reset
      useChessStore.getState().resetGame()
      const store = useChessStore.getState()

      expect(store.phase).toBe('home')
      expect(store.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
      expect(store.turn).toBe('w')
      expect(store.moveHistory).toEqual([])
      expect(store.lastMove).toBe(null)
    })
  })

  describe('promotion', () => {
    it('should set promotionPending when pawn reaches back rank', () => {
      // Set up a position where white pawn can promote
      useChessStore.getState().loadFromFen('4k3/P7/8/8/8/8/8/4K3 w - - 0 1')
      // Set phase to playing so executeMove works
      useChessStore.setState({ phase: 'playing' })

      useChessStore.getState().executeMove('a7', 'a8') // Pawn promotion without specifying piece
      const store = useChessStore.getState()

      expect(store.promotionPending).toEqual({ from: 'a7', to: 'a8' })
    })

    it('should execute promotion when piece is specified', () => {
      useChessStore.getState().loadFromFen('4k3/P7/8/8/8/8/8/4K3 w - - 0 1')
      // Set phase to playing so executeMove works
      useChessStore.setState({ phase: 'playing' })

      useChessStore.getState().executeMove('a7', 'a8', 'q') // Promote to queen
      const store = useChessStore.getState()

      expect(store.promotionPending).toBe(null)
      expect(store.moveHistory).toHaveLength(1)
      expect(store.moveHistory[0].promotion).toBe('q')
    })
  })
})
