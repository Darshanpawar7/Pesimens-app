// Feature: chess-game, Property 22: Spectator board is read-only
import { describe, it, expect, beforeEach } from 'vitest'
import { Chess } from 'chess.js'
import * as fc from 'fast-check'
import { useChessStore } from '../store'

// **Validates: Requirements 15.1, 15.3, 15.5**
describe('Property 22: Spectator board is read-only', () => {
  beforeEach(() => {
    useChessStore.getState().resetGame()
  })

  it('selectSquare must have no effect when mode === spectator', () => {
    const validFens = fc.constantFrom(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
      'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
      '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
      'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
      'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2',
      'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2',
      'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
      'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2'
    )

    const allSquares = fc.constantFrom(
      'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1',
      'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2',
      'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3',
      'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4',
      'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5',
      'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6',
      'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7',
      'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8'
    )

    fc.assert(
      fc.property(validFens, allSquares, (fen, square) => {
        // Enter spectator mode with the given FEN
        useChessStore.getState().startSpectating('session-123', 'ABCDE', fen)

        const before = useChessStore.getState()
        const fenBefore = before.fen

        // Attempt to select a square — must be a no-op
        useChessStore.getState().selectSquare(square)

        const after = useChessStore.getState()

        // selectedSquare must remain null
        expect(after.selectedSquare).toBeNull()
        // legalMoves must remain empty
        expect(after.legalMoves).toEqual([])
        // FEN must be unchanged
        expect(after.fen).toBe(fenBefore)
        // mode must still be spectator
        expect(after.mode).toBe('spectator')
      }),
      { numRuns: 100 }
    )
  })

  it('executeMove must have no effect when mode === spectator', () => {
    const positionAndMoveArbitrary = fc.constantFrom(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
      'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
      '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
      'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2'
    ).chain((fen) => {
      const chess = new Chess()
      chess.load(fen)
      const legalMoves = chess.moves({ verbose: true })
      if (legalMoves.length === 0) return fc.constant({ fen, from: 'e2', to: 'e4' })
      return fc.constantFrom(...legalMoves).map((m) => ({ fen, from: m.from, to: m.to }))
    })

    fc.assert(
      fc.property(positionAndMoveArbitrary, ({ fen, from, to }) => {
        // Enter spectator mode with the given FEN
        useChessStore.getState().startSpectating('session-456', 'XYZAB', fen)

        const before = useChessStore.getState()
        const fenBefore = before.fen
        const historyLenBefore = before.moveHistory.length

        // Attempt to execute a move — must be a no-op
        useChessStore.getState().executeMove(from, to)

        const after = useChessStore.getState()

        // FEN must be unchanged
        expect(after.fen).toBe(fenBefore)
        // Move history must not grow
        expect(after.moveHistory.length).toBe(historyLenBefore)
        // selectedSquare must remain null
        expect(after.selectedSquare).toBeNull()
        // legalMoves must remain empty
        expect(after.legalMoves).toEqual([])
        // mode must still be spectator
        expect(after.mode).toBe('spectator')
      }),
      { numRuns: 100 }
    )
  })

  it('both selectSquare and executeMove are no-ops for any board state in spectator mode', () => {
    // Combined property: interleave selectSquare and executeMove calls, none should change state
    const validFens = fc.constantFrom(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
      '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
      'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2'
    )

    const squareArb = fc.constantFrom(
      'e2', 'e4', 'e7', 'e5', 'd1', 'd8', 'a1', 'h8', 'c3', 'f6'
    )

    fc.assert(
      fc.property(
        validFens,
        fc.array(
          fc.oneof(
            fc.record({ type: fc.constant('select' as const), square: squareArb }),
            fc.record({
              type: fc.constant('move' as const),
              from: squareArb,
              to: squareArb,
            })
          ),
          { minLength: 1, maxLength: 10 }
        ),
        (fen, actions) => {
          useChessStore.getState().startSpectating('session-789', 'QQQQQ', fen)

          const fenBefore = useChessStore.getState().fen

          for (const action of actions) {
            if (action.type === 'select') {
              useChessStore.getState().selectSquare(action.square)
            } else {
              useChessStore.getState().executeMove(action.from, action.to)
            }
          }

          const after = useChessStore.getState()

          // After any number of interaction attempts, state must be unchanged
          expect(after.fen).toBe(fenBefore)
          expect(after.selectedSquare).toBeNull()
          expect(after.legalMoves).toEqual([])
          expect(after.mode).toBe('spectator')
        }
      ),
      { numRuns: 100 }
    )
  })
})
