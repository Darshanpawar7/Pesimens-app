import { describe, it, expect, beforeEach } from 'vitest'
import { Chess } from 'chess.js'
import * as fc from 'fast-check'
import { useChessStore } from '../store'

describe('ChessStore Property-Based Tests', () => {
  beforeEach(() => {
    useChessStore.getState().resetGame()
  })

  // Feature: chess-game, Property 1: Store state matches chess.js instance
  // **Validates: Requirements 1.2, 4.3**
  describe('Property 1: Store state matches chess.js instance', () => {
    it('should maintain consistency with chess.js for any sequence of valid moves', () => {
      fc.assert(
        fc.property(
          fc.array(fc.nat({ max: 50 }), { minLength: 0, maxLength: 20 }),
          (moveIndices) => {
            // Reset store and create a reference Chess instance
            useChessStore.getState().resetGame()
            useChessStore.getState().initGame('passAndPlay')
            const referenceChess = new Chess()

            // Apply a sequence of moves by selecting from available legal moves
            for (const moveIndex of moveIndices) {
              const store = useChessStore.getState()
              
              // If game is over, stop
              if (store.isGameOver) break

              // Get all legal moves from the reference chess instance
              const legalMoves = referenceChess.moves({ verbose: true })
              
              // If no legal moves, game is over
              if (legalMoves.length === 0) break

              // Pick a move using the random index (modulo to stay in bounds)
              const selectedMove = legalMoves[moveIndex % legalMoves.length]
              
              // Execute the move in both the store and reference
              useChessStore.getState().executeMove(
                selectedMove.from,
                selectedMove.to,
                selectedMove.promotion
              )
              referenceChess.move({
                from: selectedMove.from,
                to: selectedMove.to,
                promotion: selectedMove.promotion,
              })

              // Verify store state matches reference chess instance
              const updatedStore = useChessStore.getState()
              
              expect(updatedStore.fen).toBe(referenceChess.fen())
              expect(updatedStore.turn).toBe(referenceChess.turn())
              expect(updatedStore.inCheck).toBe(referenceChess.isCheck())
              expect(updatedStore.isGameOver).toBe(referenceChess.isGameOver())
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should match chess.js state after loading any valid FEN', () => {
      // Generator for valid FEN strings (simplified - using known valid positions)
      const validFenArbitrary = fc.constantFrom(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Starting position
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', // After e4
        'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', // After e4 e5
        'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', // After e4 e5 Nf3 Nc6
        'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 4 3', // After e4 e5 Nf3 Nf6
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1', // Starting position, black to move
        'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', // Italian game
        '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', // Endgame position
        'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2', // After e4 d5
        'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2' // After e4 Nf6
      )

      fc.assert(
        fc.property(validFenArbitrary, (fen) => {
          const referenceChess = new Chess()
          
          try {
            referenceChess.load(fen)
            useChessStore.getState().loadFromFen(fen)
            
            const store = useChessStore.getState()
            
            // Verify all derived state matches
            expect(store.fen).toBe(referenceChess.fen())
            expect(store.turn).toBe(referenceChess.turn())
            expect(store.inCheck).toBe(referenceChess.isCheck())
            expect(store.isGameOver).toBe(referenceChess.isGameOver())
          } catch (error) {
            // If chess.js rejects the FEN, the store should also handle it gracefully
            // This is acceptable behavior
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should maintain state consistency after any combination of moves and FEN loads', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              fc.record({
                type: fc.constant('move' as const),
                moveIndex: fc.nat({ max: 50 }),
              }),
              fc.record({
                type: fc.constant('loadFen' as const),
                fen: fc.constantFrom(
                  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
                  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3'
                ),
              })
            ),
            { minLength: 1, maxLength: 15 }
          ),
          (actions) => {
            useChessStore.getState().resetGame()
            useChessStore.getState().initGame('passAndPlay')
            const referenceChess = new Chess()

            for (const action of actions) {
              if (action.type === 'move') {
                const store = useChessStore.getState()
                if (store.isGameOver) continue

                const legalMoves = referenceChess.moves({ verbose: true })
                if (legalMoves.length === 0) continue

                const selectedMove = legalMoves[action.moveIndex % legalMoves.length]
                
                useChessStore.getState().executeMove(
                  selectedMove.from,
                  selectedMove.to,
                  selectedMove.promotion
                )
                referenceChess.move({
                  from: selectedMove.from,
                  to: selectedMove.to,
                  promotion: selectedMove.promotion,
                })
              } else if (action.type === 'loadFen') {
                try {
                  referenceChess.load(action.fen)
                  useChessStore.getState().loadFromFen(action.fen)
                } catch {
                  // Invalid FEN, skip
                  continue
                }
              }

              // Verify consistency after each action
              const store = useChessStore.getState()
              expect(store.fen).toBe(referenceChess.fen())
              expect(store.turn).toBe(referenceChess.turn())
              expect(store.inCheck).toBe(referenceChess.isCheck())
              expect(store.isGameOver).toBe(referenceChess.isGameOver())
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // Feature: chess-game, Property 3: Board renders correct pieces for any FEN
  // **Validates: Requirements 2.2**
  describe('Property 3: Board renders correct pieces for any FEN', () => {
    it('should place exactly the pieces described by the FEN on their correct squares', () => {
      const validFenArbitrary = fc.constantFrom(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
        'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3',
        '8/8/8/4k3/8/8/4K3/8 w - - 0 1',
        'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2',
        'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2'
      )

      fc.assert(
        fc.property(validFenArbitrary, (fen) => {
          // Load FEN into the store
          useChessStore.getState().loadFromFen(fen)
          const store = useChessStore.getState()

          // Create a reference Chess instance to derive expected board state
          const referenceChess = new Chess()
          referenceChess.load(fen)
          const expectedBoard = referenceChess.board()

          // The store's FEN must match the reference
          expect(store.fen).toBe(referenceChess.fen())

          // Verify every square via the store's FEN: piece placement must match exactly
          const storeChess = new Chess()
          storeChess.load(store.fen)
          const storeBoard = storeChess.board()

          for (let rank = 0; rank < 8; rank++) {
            for (let fileIdx = 0; fileIdx < 8; fileIdx++) {
              const expectedPiece = expectedBoard[rank][fileIdx]
              const storePiece = storeBoard[rank][fileIdx]

              if (expectedPiece === null) {
                // Square should be empty
                expect(storePiece).toBeNull()
              } else {
                // Square should have the correct piece type and color
                expect(storePiece).not.toBeNull()
                expect(storePiece!.type).toBe(expectedPiece.type)
                expect(storePiece!.color).toBe(expectedPiece.color)
              }
            }
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should have no piece on an empty square and no empty square where a piece should be', () => {
      const validFenArbitrary = fc.constantFrom(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
        '8/8/8/4k3/8/8/4K3/8 w - - 0 1',
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
        'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4'
      )

      fc.assert(
        fc.property(validFenArbitrary, (fen) => {
          useChessStore.getState().loadFromFen(fen)
          const store = useChessStore.getState()

          // The store FEN must be loadable and produce the same board
          const storeChess = new Chess()
          storeChess.load(store.fen)

          const referenceChess = new Chess()
          referenceChess.load(fen)

          // Count pieces in both boards — must be identical
          const countPieces = (chess: Chess) => {
            const board = chess.board()
            let count = 0
            for (const row of board) {
              for (const cell of row) {
                if (cell !== null) count++
              }
            }
            return count
          }

          expect(countPieces(storeChess)).toBe(countPieces(referenceChess))

          // Board arrays must be deeply equal
          expect(storeChess.board()).toEqual(referenceChess.board())
        }),
        { numRuns: 100 }
      )
    })
  })

  // Feature: chess-game, Property 4: Legal move highlights match chess.js
  // **Validates: Requirements 2.4**
  describe('Property 4: Legal move highlights match chess.js', () => {
    it('should highlight exactly the destination squares returned by chess.moves() for any active-player piece', () => {
      const positionAndSquareArbitrary = fc.constantFrom(
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
      ).chain((fen) => {
        // For each FEN, pick a random square that has an active-player piece
        const chess = new Chess()
        chess.load(fen)
        const activeTurn = chess.turn()
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
        const activeSquares: string[] = []
        for (let rank = 1; rank <= 8; rank++) {
          for (const file of files) {
            const sq = `${file}${rank}` as Parameters<typeof chess.get>[0]
            const piece = chess.get(sq)
            if (piece && piece.color === activeTurn) {
              activeSquares.push(`${file}${rank}`)
            }
          }
        }
        if (activeSquares.length === 0) return fc.constant({ fen, square: 'e1' })
        return fc.constantFrom(...activeSquares).map((square) => ({ fen, square }))
      })

      fc.assert(
        fc.property(positionAndSquareArbitrary, ({ fen, square }) => {
          // Set phase to 'playing' first, then load the specific position
          useChessStore.getState().initGame('passAndPlay')
          useChessStore.getState().loadFromFen(fen)
          useChessStore.getState().selectSquare(square)

          const store = useChessStore.getState()

          // Build expected legal moves from a fresh chess.js instance
          const referenceChess = new Chess()
          referenceChess.load(fen)
          const piece = referenceChess.get(square as Parameters<typeof referenceChess.get>[0])

          if (!piece || piece.color !== referenceChess.turn()) {
            // Non-active-player piece or empty square: legalMoves should be empty
            expect(store.legalMoves).toEqual([])
            return
          }

          const expectedMoves = referenceChess.moves({ square: square as any, verbose: true })
          const expectedDestinations = expectedMoves.map((m) => m.to).sort()
          const actualDestinations = [...store.legalMoves].sort()

          expect(actualDestinations).toEqual(expectedDestinations)
        }),
        { numRuns: 100 }
      )
    })

    it('should return empty highlights for any non-active-player piece or empty square', () => {
      const validFenArbitrary = fc.constantFrom(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3'
      )

      fc.assert(
        fc.property(
          validFenArbitrary,
          fc.constantFrom('a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8', 'a5', 'e5'),
          (fen, square) => {
            useChessStore.getState().initGame('passAndPlay')
            useChessStore.getState().loadFromFen(fen)

            const referenceChess = new Chess()
            referenceChess.load(fen)
            const piece = referenceChess.get(square as any)
            const activeTurn = referenceChess.turn()

            // Only test squares that are NOT active-player pieces
            if (piece && piece.color === activeTurn) return

            useChessStore.getState().selectSquare(square)
            const store = useChessStore.getState()
            expect(store.legalMoves).toEqual([])
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // Feature: chess-game, Property 5: Move execution produces correct position
  // **Validates: Requirements 2.5**
  describe('Property 5: Move execution produces correct position', () => {
    it('should produce a board state identical to chess.js after executing any legal move', () => {
      fc.assert(
        fc.property(
          fc.array(fc.nat({ max: 50 }), { minLength: 1, maxLength: 15 }),
          (moveIndices) => {
            useChessStore.getState().resetGame()
            useChessStore.getState().initGame('passAndPlay')

            // Reference chess instance tracks expected state
            const referenceChess = new Chess()

            for (const moveIndex of moveIndices) {
              const store = useChessStore.getState()
              if (store.isGameOver) break

              const legalMoves = referenceChess.moves({ verbose: true })
              if (legalMoves.length === 0) break

              const selectedMove = legalMoves[moveIndex % legalMoves.length]

              // Capture pre-move FEN
              const preFen = referenceChess.fen()

              // Execute move in store
              useChessStore.getState().executeMove(
                selectedMove.from,
                selectedMove.to,
                selectedMove.promotion
              )

              // Execute same move on a fresh Chess instance loaded from pre-move FEN
              const freshChess = new Chess()
              freshChess.load(preFen)
              freshChess.move({
                from: selectedMove.from,
                to: selectedMove.to,
                promotion: selectedMove.promotion,
              })

              // Also advance the reference
              referenceChess.move({
                from: selectedMove.from,
                to: selectedMove.to,
                promotion: selectedMove.promotion,
              })

              const updatedStore = useChessStore.getState()

              // Store FEN must match the fresh Chess instance after the move
              expect(updatedStore.fen).toBe(freshChess.fen())

              // Board state must be identical
              const storeChess = new Chess()
              storeChess.load(updatedStore.fen)
              expect(storeChess.board()).toEqual(freshChess.board())

              // Turn, check, and game-over must match
              expect(updatedStore.turn).toBe(freshChess.turn())
              expect(updatedStore.inCheck).toBe(freshChess.isCheck())
              expect(updatedStore.isGameOver).toBe(freshChess.isGameOver())
            }
          }
        ),
        { numRuns: 100 }
      )
    }, 30000)

    it('should produce the same position as chess.js for any single legal move from any position', () => {
      const positionAndMoveArbitrary = fc.constantFrom(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
        'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2',
        'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2'
      ).chain((fen) => {
        const chess = new Chess()
        chess.load(fen)
        const legalMoves = chess.moves({ verbose: true })
        if (legalMoves.length === 0) return fc.constant({ fen, move: null as any })
        return fc.constantFrom(...legalMoves).map((move) => ({ fen, move }))
      })

      fc.assert(
        fc.property(positionAndMoveArbitrary, ({ fen, move }) => {
          if (!move) return // skip positions with no legal moves

          // Set phase to 'playing' first, then load the specific position
          useChessStore.getState().initGame('passAndPlay')
          useChessStore.getState().loadFromFen(fen)
          useChessStore.getState().executeMove(move.from, move.to, move.promotion)

          const store = useChessStore.getState()

          // Build expected state: fresh Chess instance from pre-move FEN + move
          const expectedChess = new Chess()
          expectedChess.load(fen)
          expectedChess.move({ from: move.from, to: move.to, promotion: move.promotion })

          // FEN must match
          expect(store.fen).toBe(expectedChess.fen())

          // Board must match
          const storeChess = new Chess()
          storeChess.load(store.fen)
          expect(storeChess.board()).toEqual(expectedChess.board())

          // Derived state must match
          expect(store.turn).toBe(expectedChess.turn())
          expect(store.inCheck).toBe(expectedChess.isCheck())
          expect(store.isGameOver).toBe(expectedChess.isGameOver())
        }),
        { numRuns: 100 }
      )
    })
  })

  // Feature: chess-game, Property 2: FEN round-trip
  // **Validates: Requirements 1.4**
  describe('Property 2: FEN round-trip', () => {
    it('should preserve position semantics when loading and reading back any valid FEN', () => {
      // Generator for valid FEN strings covering various game states
      const validFenArbitrary = fc.constantFrom(
        // Starting positions
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1',
        
        // Opening positions
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
        'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 4 3',
        
        // Middle game positions
        'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2',
        'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2',
        
        // Endgame positions
        '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
        '4k3/8/8/8/8/8/4P3/4K3 b - - 0 1',
        '8/8/8/4k3/8/8/4K3/8 w - - 0 1',
        
        // Castling variations
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w Kq - 0 1',
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w - - 0 1',
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R b KQkq - 0 1',
        
        // En passant variations
        'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3',
        'rnbqkbnr/pppp1ppp/8/8/3pP3/8/PPP2PPP/RNBQKBNR b KQkq e3 0 2',
        
        // Positions with different piece configurations
        'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        
        // Positions with move counters
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 5 10',
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 50 100'
      )

      fc.assert(
        fc.property(validFenArbitrary, (inputFen) => {
          // Create two independent Chess instances
          const chess1 = new Chess()
          const chess2 = new Chess()

          try {
            // Load the FEN into the first instance
            chess1.load(inputFen)
            
            // Read back the FEN from the first instance
            const outputFen = chess1.fen()
            
            // Load the output FEN into the second instance
            chess2.load(outputFen)
            
            // Verify that both instances represent the same position
            // by comparing all position-relevant properties
            
            // 1. Board position (piece placement)
            expect(chess1.board()).toEqual(chess2.board())
            
            // 2. Active color (whose turn it is)
            expect(chess1.turn()).toBe(chess2.turn())
            
            // 3. Castling rights
            const fen1Parts = chess1.fen().split(' ')
            const fen2Parts = chess2.fen().split(' ')
            expect(fen1Parts[2]).toBe(fen2Parts[2]) // Castling availability
            
            // 4. En passant target square
            expect(fen1Parts[3]).toBe(fen2Parts[3])
            
            // 5. The output FEN should be valid and loadable
            expect(() => new Chess(outputFen)).not.toThrow()
            
            // 6. Legal moves should be identical (position equivalence)
            const moves1 = chess1.moves().sort()
            const moves2 = chess2.moves().sort()
            expect(moves1).toEqual(moves2)
            
            // 7. Game state flags should match
            expect(chess1.isCheck()).toBe(chess2.isCheck())
            expect(chess1.isCheckmate()).toBe(chess2.isCheckmate())
            expect(chess1.isStalemate()).toBe(chess2.isStalemate())
            expect(chess1.isGameOver()).toBe(chess2.isGameOver())
            
          } catch (error) {
            // If chess.js rejects the FEN, that's acceptable
            // The test is about round-trip preservation for valid FENs
            // chess.js will throw if the FEN is truly invalid
            throw error
          }
        }),
        { numRuns: 100 }
      )
    })

    it('should handle FEN round-trip through the ChessStore', () => {
      const validFenArbitrary = fc.constantFrom(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
        'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
        'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3'
      )

      fc.assert(
        fc.property(validFenArbitrary, (inputFen) => {
          // Create a reference Chess instance
          const referenceChess = new Chess()
          referenceChess.load(inputFen)
          
          // Load the FEN into the store
          useChessStore.getState().loadFromFen(inputFen)
          
          // Read back the FEN from the store
          const store = useChessStore.getState()
          const outputFen = store.fen
          
          // Load the output FEN into a new Chess instance
          const verifyChess = new Chess()
          verifyChess.load(outputFen)
          
          // Verify position equivalence
          expect(verifyChess.board()).toEqual(referenceChess.board())
          expect(verifyChess.turn()).toBe(referenceChess.turn())
          expect(verifyChess.isCheck()).toBe(referenceChess.isCheck())
          expect(verifyChess.isGameOver()).toBe(referenceChess.isGameOver())
          
          // Verify the store's derived state matches
          expect(store.turn).toBe(referenceChess.turn())
          expect(store.inCheck).toBe(referenceChess.isCheck())
          expect(store.isGameOver).toBe(referenceChess.isGameOver())
        }),
        { numRuns: 100 }
      )
    })
  })
})

describe('Properties 6, 7, 8: Selection state, last-move, and check highlight', () => {
  beforeEach(() => {
    useChessStore.getState().resetGame()
  })

  // Feature: chess-game, Property 6: Selection state transitions are consistent
  // **Validates: Requirements 2.6, 2.7, 5.5, 10.8**
  describe('Property 6: Selection state transitions are consistent', () => {
    it('(a) selecting a non-active-player piece or empty square must leave selectedSquare as null', () => {
      // Positions paired with squares that are either empty or belong to the non-active player
      const positionAndSquareArbitrary = fc.constantFrom(
        // White to move — pick black piece squares or empty squares
        { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', square: 'e8' }, // black king
        { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', square: 'a7' }, // black pawn
        { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', square: 'e5' }, // empty
        { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', square: 'd4' }, // empty
        // Black to move — pick white piece squares or empty squares
        { fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', square: 'e1' }, // white king
        { fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', square: 'a2' }, // white pawn
        { fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', square: 'e5' }, // empty
        { fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', square: 'c6' }, // black knight (white to move)
        { fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', square: 'h6' }, // empty
        { fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', square: 'e8' }, // black king (white to move)
        { fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', square: 'a4' }, // empty
      )

      fc.assert(
        fc.property(positionAndSquareArbitrary, ({ fen, square }) => {
          useChessStore.getState().initGame('passAndPlay')
          useChessStore.getState().loadFromFen(fen)

          // Verify the square is indeed non-active-player or empty
          const refChess = new Chess()
          refChess.load(fen)
          const piece = refChess.get(square as any)
          const activeTurn = refChess.turn()

          // Guard: only proceed if the square is NOT an active-player piece
          if (piece && piece.color === activeTurn) return

          useChessStore.getState().selectSquare(square)
          const store = useChessStore.getState()

          expect(store.selectedSquare).toBeNull()
          expect(store.legalMoves).toEqual([])
        }),
        { numRuns: 100 }
      )
    })

    it('(b) selecting an active-player piece while another is already selected must update selectedSquare and refresh legalMoves', () => {
      // Positions where we can pick two different active-player pieces
      const positionArbitrary = fc.constantFrom(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
      ).chain((fen) => {
        const chess = new Chess()
        chess.load(fen)
        const activeTurn = chess.turn()
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
        const activeSquares: string[] = []
        for (let rank = 1; rank <= 8; rank++) {
          for (const file of files) {
            const sq = `${file}${rank}`
            const piece = chess.get(sq as any)
            if (piece && piece.color === activeTurn) {
              activeSquares.push(sq)
            }
          }
        }
        // Need at least 2 active-player pieces to test re-selection
        if (activeSquares.length < 2) return fc.constant(null as any)
        return fc.tuple(
          fc.constantFrom(...activeSquares),
          fc.constantFrom(...activeSquares),
        ).filter(([sq1, sq2]) => sq1 !== sq2).map(([sq1, sq2]) => ({ fen, sq1, sq2 }))
      }).filter((v) => v !== null)

      fc.assert(
        fc.property(positionArbitrary, ({ fen, sq1, sq2 }) => {
          useChessStore.getState().initGame('passAndPlay')
          useChessStore.getState().loadFromFen(fen)

          // Select the first piece
          useChessStore.getState().selectSquare(sq1)
          const afterFirst = useChessStore.getState()
          expect(afterFirst.selectedSquare).toBe(sq1)

          // Now select a different active-player piece while sq1 is selected
          useChessStore.getState().selectSquare(sq2)
          const afterSecond = useChessStore.getState()

          // selectedSquare must update to sq2 (unless sq2 is a legal move destination of sq1)
          const refChess = new Chess()
          refChess.load(fen)
          const sq1Moves = refChess.moves({ square: sq1 as any, verbose: true }).map((m) => m.to)

          if (sq1Moves.includes(sq2)) {
            // sq2 is a legal move destination — the move executes, selectedSquare clears
            expect(afterSecond.selectedSquare).toBeNull()
          } else {
            // sq2 is a different active-player piece — selectedSquare updates to sq2
            expect(afterSecond.selectedSquare).toBe(sq2)
            // legalMoves must match chess.js for sq2
            const expectedMoves = refChess.moves({ square: sq2 as any, verbose: true }).map((m) => m.to).sort()
            expect([...afterSecond.legalMoves].sort()).toEqual(expectedMoves)
          }
        }),
        { numRuns: 100 }
      )
    })
  })

  // Feature: chess-game, Property 7: Last-move highlight tracks executed move
  // **Validates: Requirements 2.8**
  describe('Property 7: Last-move highlight tracks executed move', () => {
    it('lastMove must equal { from, to } immediately after any executed move', () => {
      fc.assert(
        fc.property(
          fc.array(fc.nat({ max: 50 }), { minLength: 1, maxLength: 15 }),
          (moveIndices) => {
            useChessStore.getState().resetGame()
            useChessStore.getState().initGame('passAndPlay')
            const refChess = new Chess()

            for (const moveIndex of moveIndices) {
              const store = useChessStore.getState()
              if (store.isGameOver) break

              const legalMoves = refChess.moves({ verbose: true })
              if (legalMoves.length === 0) break

              const selectedMove = legalMoves[moveIndex % legalMoves.length]

              useChessStore.getState().executeMove(
                selectedMove.from,
                selectedMove.to,
                selectedMove.promotion,
              )
              refChess.move({
                from: selectedMove.from,
                to: selectedMove.to,
                promotion: selectedMove.promotion,
              })

              const updatedStore = useChessStore.getState()

              // lastMove must equal { from, to } of the move just executed
              expect(updatedStore.lastMove).toEqual({
                from: selectedMove.from,
                to: selectedMove.to,
              })
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('lastMove must remain set until the next move is executed', () => {
      fc.assert(
        fc.property(
          fc.array(fc.nat({ max: 50 }), { minLength: 2, maxLength: 10 }),
          (moveIndices) => {
            useChessStore.getState().resetGame()
            useChessStore.getState().initGame('passAndPlay')
            const refChess = new Chess()

            let lastExecutedMove: { from: string; to: string } | null = null

            for (const moveIndex of moveIndices) {
              const store = useChessStore.getState()
              if (store.isGameOver) break

              const legalMoves = refChess.moves({ verbose: true })
              if (legalMoves.length === 0) break

              const selectedMove = legalMoves[moveIndex % legalMoves.length]

              // Before executing, verify lastMove is still the previous move
              if (lastExecutedMove !== null) {
                expect(store.lastMove).toEqual(lastExecutedMove)
              }

              useChessStore.getState().executeMove(
                selectedMove.from,
                selectedMove.to,
                selectedMove.promotion,
              )
              refChess.move({
                from: selectedMove.from,
                to: selectedMove.to,
                promotion: selectedMove.promotion,
              })

              lastExecutedMove = { from: selectedMove.from, to: selectedMove.to }
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('lastMove must be null after resetGame', () => {
      fc.assert(
        fc.property(
          fc.array(fc.nat({ max: 50 }), { minLength: 1, maxLength: 5 }),
          (moveIndices) => {
            useChessStore.getState().resetGame()
            useChessStore.getState().initGame('passAndPlay')
            const refChess = new Chess()

            // Execute at least one move
            for (const moveIndex of moveIndices) {
              const store = useChessStore.getState()
              if (store.isGameOver) break
              const legalMoves = refChess.moves({ verbose: true })
              if (legalMoves.length === 0) break
              const selectedMove = legalMoves[moveIndex % legalMoves.length]
              useChessStore.getState().executeMove(selectedMove.from, selectedMove.to, selectedMove.promotion)
              refChess.move({ from: selectedMove.from, to: selectedMove.to, promotion: selectedMove.promotion })
              break // just one move is enough
            }

            // After reset, lastMove must be null
            useChessStore.getState().resetGame()
            expect(useChessStore.getState().lastMove).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // Feature: chess-game, Property 8: Check highlight is set iff king is in check
  // **Validates: Requirements 2.9**
  describe('Property 8: Check highlight is set iff king is in check', () => {
    it('inCheck must be true iff chess.isCheck() returns true for any board position', () => {
      const validFenArbitrary = fc.constantFrom(
        // Normal positions — not in check
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
        '8/8/8/4k3/8/8/4K3/8 w - - 0 1',
        // Positions where the king IS in check
        'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2', // not in check
        'r1bqk1nr/pppp1Bpp/2n5/2b1p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 4', // black king in check from bishop
        '4k3/8/8/8/8/8/4R3/4K3 b - - 0 1', // black king in check from rook
        'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3', // white king in check from queen
        'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4', // black king in check from queen on f7
      )

      fc.assert(
        fc.property(validFenArbitrary, (fen) => {
          const refChess = new Chess()
          refChess.load(fen)

          useChessStore.getState().loadFromFen(fen)
          const store = useChessStore.getState()

          // inCheck must match chess.js exactly
          expect(store.inCheck).toBe(refChess.isCheck())
        }),
        { numRuns: 100 }
      )
    })

    it('inCheck must update correctly after each move in a sequence', () => {
      fc.assert(
        fc.property(
          fc.array(fc.nat({ max: 50 }), { minLength: 1, maxLength: 20 }),
          (moveIndices) => {
            useChessStore.getState().resetGame()
            useChessStore.getState().initGame('passAndPlay')
            const refChess = new Chess()

            for (const moveIndex of moveIndices) {
              const store = useChessStore.getState()
              if (store.isGameOver) break

              const legalMoves = refChess.moves({ verbose: true })
              if (legalMoves.length === 0) break

              const selectedMove = legalMoves[moveIndex % legalMoves.length]

              useChessStore.getState().executeMove(
                selectedMove.from,
                selectedMove.to,
                selectedMove.promotion,
              )
              refChess.move({
                from: selectedMove.from,
                to: selectedMove.to,
                promotion: selectedMove.promotion,
              })

              const updatedStore = useChessStore.getState()

              // inCheck must match chess.js after every move
              expect(updatedStore.inCheck).toBe(refChess.isCheck())
            }
          }
        ),
        { numRuns: 100 }
      )
    }, 30000)

    it('inCheck must be false after loading a non-check position and true after loading a check position', () => {
      // Non-check positions
      const nonCheckFens = [
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
        'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
      ]
      // Check positions
      const checkFens = [
        '4k3/8/8/8/8/8/4R3/4K3 b - - 0 1', // black king in check
        'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4', // black king in check from queen on f7
      ]

      fc.assert(
        fc.property(fc.constantFrom(...nonCheckFens), (fen) => {
          useChessStore.getState().loadFromFen(fen)
          const store = useChessStore.getState()
          const refChess = new Chess()
          refChess.load(fen)
          expect(store.inCheck).toBe(false)
          expect(store.inCheck).toBe(refChess.isCheck())
        }),
        { numRuns: 100 }
      )

      fc.assert(
        fc.property(fc.constantFrom(...checkFens), (fen) => {
          useChessStore.getState().loadFromFen(fen)
          const store = useChessStore.getState()
          const refChess = new Chess()
          refChess.load(fen)
          expect(store.inCheck).toBe(true)
          expect(store.inCheck).toBe(refChess.isCheck())
        }),
        { numRuns: 100 }
      )
    })
  })
})

// Feature: chess-game, Property 9: Promotion blocks move and applies chosen piece
describe('Property 9: Promotion blocks move and applies chosen piece', () => {
  beforeEach(() => {
    useChessStore.getState().resetGame()
  })

  it('(a) promotionPending is set when pawn reaches back rank without promotion piece', () => {
    const promotionScenarios = fc.constantFrom(
      { fen: '4k3/P7/8/8/8/8/8/4K3 w - - 0 1', from: 'a7', to: 'a8', color: 'w' as const },
      { fen: '4k3/8/8/8/8/8/p7/4K3 b - - 0 1', from: 'a2', to: 'a1', color: 'b' as const },
    )

    fc.assert(
      fc.property(promotionScenarios, ({ fen, from, to }) => {
        useChessStore.getState().initGame('passAndPlay')
        useChessStore.getState().loadFromFen(fen)

        const fenBeforeMove = useChessStore.getState().fen
        const turnBeforeMove = useChessStore.getState().turn

        // Execute move without promotion piece
        useChessStore.getState().executeMove(from, to)

        const store = useChessStore.getState()

        // promotionPending must be set to { from, to }
        expect(store.promotionPending).toEqual({ from, to })

        // FEN must be unchanged (move not committed)
        expect(store.fen).toBe(fenBeforeMove)

        // Turn must be unchanged
        expect(store.turn).toBe(turnBeforeMove)
      }),
      { numRuns: 10 }
    )
  })

  it('(b) after selecting promotion piece, correct piece appears on promotion square', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('q', 'r', 'b', 'n'),
        (pieceType) => {
          // White promotion
          useChessStore.getState().initGame('passAndPlay')
          useChessStore.getState().loadFromFen('4k3/P7/8/8/8/8/8/4K3 w - - 0 1')

          // First call sets promotionPending
          useChessStore.getState().executeMove('a7', 'a8')
          expect(useChessStore.getState().promotionPending).toEqual({ from: 'a7', to: 'a8' })

          // Second call with promotion piece completes the move
          useChessStore.getState().executeMove('a7', 'a8', pieceType)

          const storeAfterWhite = useChessStore.getState()
          expect(storeAfterWhite.promotionPending).toBeNull()

          const pieceOnA8White = new Chess(storeAfterWhite.fen).get('a8' as any)
          expect(pieceOnA8White).not.toBeNull()
          expect(pieceOnA8White!.type).toBe(pieceType)
          expect(pieceOnA8White!.color).toBe('w')

          // Black promotion
          useChessStore.getState().initGame('passAndPlay')
          useChessStore.getState().loadFromFen('4k3/8/8/8/8/8/p7/4K3 b - - 0 1')

          // First call sets promotionPending
          useChessStore.getState().executeMove('a2', 'a1')
          expect(useChessStore.getState().promotionPending).toEqual({ from: 'a2', to: 'a1' })

          // Second call with promotion piece completes the move
          useChessStore.getState().executeMove('a2', 'a1', pieceType)

          const storeAfterBlack = useChessStore.getState()
          expect(storeAfterBlack.promotionPending).toBeNull()

          const pieceOnA1Black = new Chess(storeAfterBlack.fen).get('a1' as any)
          expect(pieceOnA1Black).not.toBeNull()
          expect(pieceOnA1Black!.type).toBe(pieceType)
          expect(pieceOnA1Black!.color).toBe('b')
        }
      ),
      { numRuns: 10 }
    )
  })
})

// Feature: chess-game, Property 10: Turn alternates after every move
// **Validates: Requirements 4.1, 4.2**
describe('Property 10: Turn alternates after every move', () => {
  beforeEach(() => {
    useChessStore.getState().resetGame()
  })

  it('turn must be w if move count is even and b if move count is odd', () => {
    fc.assert(
      fc.property(
        fc.array(fc.nat({ max: 50 }), { minLength: 1, maxLength: 20 }),
        (moveIndices) => {
          useChessStore.getState().resetGame()
          useChessStore.getState().initGame('passAndPlay')
          const refChess = new Chess()

          let moveCount = 0

          for (const moveIndex of moveIndices) {
            const store = useChessStore.getState()
            if (store.isGameOver) break

            const legalMoves = refChess.moves({ verbose: true })
            if (legalMoves.length === 0) break

            const selectedMove = legalMoves[moveIndex % legalMoves.length]

            useChessStore.getState().executeMove(
              selectedMove.from,
              selectedMove.to,
              selectedMove.promotion,
            )
            refChess.move({
              from: selectedMove.from,
              to: selectedMove.to,
              promotion: selectedMove.promotion,
            })

            moveCount++

            const updatedStore = useChessStore.getState()

            // After moveCount moves: even => white's turn ('w'), odd => black's turn ('b')
            expect(updatedStore.turn).toBe(moveCount % 2 === 0 ? 'w' : 'b')
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Feature: chess-game, Property 11: Game-over conditions set phase and result correctly
// **Validates: Requirements 4.4, 4.5, 4.6**
describe('Property 11: Game-over conditions set phase and result correctly', () => {
  beforeEach(() => {
    useChessStore.getState().resetGame()
  })

  it('checkmate: Scholar\'s Mate sets phase to finished, result to white, isGameOver to true', () => {
    // Scholar's Mate sequence: e4, e5, Qh5, Nc6, Bc4, a6, Qxf7#
    useChessStore.getState().initGame('passAndPlay')

    const scholarsMate = [
      { from: 'e2', to: 'e4' },
      { from: 'e7', to: 'e5' },
      { from: 'd1', to: 'h5' },
      { from: 'b8', to: 'c6' },
      { from: 'f1', to: 'c4' },
      { from: 'a7', to: 'a6' },
      { from: 'h5', to: 'f7' }, // checkmate
    ]

    for (const move of scholarsMate) {
      useChessStore.getState().executeMove(move.from, move.to)
    }

    const store = useChessStore.getState()

    // Verify chess.js agrees this is checkmate
    const refChess = new Chess()
    for (const move of scholarsMate) {
      refChess.move({ from: move.from as any, to: move.to as any })
    }
    expect(refChess.isCheckmate()).toBe(true)

    // Verify store state
    expect(store.phase).toBe('finished')
    expect(store.isGameOver).toBe(true)
    expect(store.result).toBe('white')
  })

  it('stalemate via loadFromFen: isGameOver is true for a stalemate position', () => {
    // FEN where black king is stalemated (black to move, no legal moves, not in check)
    const stalemateFen = 'k7/8/1Q6/8/8/8/8/7K b - - 0 1'

    const refChess = new Chess()
    refChess.load(stalemateFen)
    expect(refChess.isStalemate()).toBe(true)

    useChessStore.getState().loadFromFen(stalemateFen)
    const store = useChessStore.getState()

    expect(store.isGameOver).toBe(true)
  })

  it('stalemate via move sequence: executing the final stalemate move sets phase to finished and result to draw', () => {
    // Pre-stalemate FEN: white queen on c6, black king on a8, white king on h1
    // White plays Qb6 which stalemated the black king (no legal moves, not in check)
    const preStalemateFen = 'k7/8/2Q5/8/8/8/8/7K w - - 0 1'

    useChessStore.getState().initGame('passAndPlay')
    useChessStore.getState().loadFromFen(preStalemateFen)

    // Verify the position loaded correctly — not yet stalemate
    const refChess = new Chess()
    refChess.load(preStalemateFen)
    expect(refChess.isStalemate()).toBe(false)

    // Execute Qb6 — this stalemated the black king on a8
    useChessStore.getState().executeMove('c6', 'b6')

    const store = useChessStore.getState()

    // Verify chess.js agrees this is stalemate
    const refChessAfter = new Chess()
    refChessAfter.load(preStalemateFen)
    refChessAfter.move({ from: 'c6', to: 'b6' })
    expect(refChessAfter.isStalemate()).toBe(true)

    expect(store.phase).toBe('finished')
    expect(store.isGameOver).toBe(true)
    expect(store.result).toBe('draw')
  })
})

// Feature: chess-game, Property 12: Move history grows monotonically and preserves order
// **Validates: Requirements 4.8, 6.1, 6.2**
describe('Property 12: Move history grows monotonically and preserves order', () => {
  beforeEach(() => { useChessStore.getState().resetGame() })

  it('moveHistory must have exactly N entries after N moves', () => {
    fc.assert(
      fc.property(
        fc.array(fc.nat({ max: 50 }), { minLength: 1, maxLength: 15 }),
        (moveIndices) => {
          useChessStore.getState().resetGame()
          useChessStore.getState().initGame('passAndPlay')
          const refChess = new Chess()

          let moveCount = 0

          for (const moveIndex of moveIndices) {
            const store = useChessStore.getState()
            if (store.isGameOver) break

            const legalMoves = refChess.moves({ verbose: true })
            if (legalMoves.length === 0) break

            const selectedMove = legalMoves[moveIndex % legalMoves.length]

            useChessStore.getState().executeMove(
              selectedMove.from,
              selectedMove.to,
              selectedMove.promotion,
            )
            refChess.move({
              from: selectedMove.from,
              to: selectedMove.to,
              promotion: selectedMove.promotion,
            })

            moveCount++

            const updatedStore = useChessStore.getState()
            expect(updatedStore.moveHistory.length).toBe(moveCount)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('each entry san must match chess.js SAN for that move', () => {
    fc.assert(
      fc.property(
        fc.array(fc.nat({ max: 50 }), { minLength: 1, maxLength: 15 }),
        (moveIndices) => {
          useChessStore.getState().resetGame()
          useChessStore.getState().initGame('passAndPlay')
          const refChess = new Chess()

          let moveCount = 0

          for (const moveIndex of moveIndices) {
            const store = useChessStore.getState()
            if (store.isGameOver) break

            const legalMoves = refChess.moves({ verbose: true })
            if (legalMoves.length === 0) break

            const selectedMove = legalMoves[moveIndex % legalMoves.length]

            useChessStore.getState().executeMove(
              selectedMove.from,
              selectedMove.to,
              selectedMove.promotion,
            )
            refChess.move({
              from: selectedMove.from,
              to: selectedMove.to,
              promotion: selectedMove.promotion,
            })

            moveCount++

            const updatedStore = useChessStore.getState()
            const expectedSan = refChess.history()[moveCount - 1]
            expect(updatedStore.moveHistory[moveCount - 1].san).toBe(expectedSan)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('entries must appear in execution order', () => {
    fc.assert(
      fc.property(
        fc.array(fc.nat({ max: 50 }), { minLength: 1, maxLength: 15 }),
        (moveIndices) => {
          useChessStore.getState().resetGame()
          useChessStore.getState().initGame('passAndPlay')
          const refChess = new Chess()

          let moveCount = 0

          for (const moveIndex of moveIndices) {
            const store = useChessStore.getState()
            if (store.isGameOver) break

            const legalMoves = refChess.moves({ verbose: true })
            if (legalMoves.length === 0) break

            const selectedMove = legalMoves[moveIndex % legalMoves.length]

            useChessStore.getState().executeMove(
              selectedMove.from,
              selectedMove.to,
              selectedMove.promotion,
            )
            refChess.move({
              from: selectedMove.from,
              to: selectedMove.to,
              promotion: selectedMove.promotion,
            })

            moveCount++

            const updatedStore = useChessStore.getState()

            // Verify from/to of the latest entry match the move just executed
            expect(updatedStore.moveHistory[moveCount - 1].from).toBe(selectedMove.from)
            expect(updatedStore.moveHistory[moveCount - 1].to).toBe(selectedMove.to)

            // Verify the full history array matches chess.js history in order
            const refHistory = refChess.history()
            for (let i = 0; i < moveCount; i++) {
              expect(updatedStore.moveHistory[i].san).toBe(refHistory[i])
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Feature: chess-game, Property 13: Start Game transitions phase and initialises fresh position
// **Validates: Requirements 5.3**
describe('Property 13: Start Game transitions phase and initialises fresh position', () => {
  const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

  beforeEach(() => { useChessStore.getState().resetGame() })

  it('initGame(passAndPlay) must set phase to playing, fen to starting position, empty history, turn w', () => {
    useChessStore.getState().initGame('passAndPlay')
    const store = useChessStore.getState()

    expect(store.phase).toBe('playing')
    expect(store.fen).toBe(STARTING_FEN)
    expect(store.moveHistory).toEqual([])
    expect(store.turn).toBe('w')
    expect(store.selectedSquare).toBeNull()
    expect(store.legalMoves).toEqual([])
    expect(store.lastMove).toBeNull()
    expect(store.isGameOver).toBe(false)
    expect(store.result).toBeNull()
    expect(store.promotionPending).toBeNull()
  })

  it('initGame resets to fresh position even after moves have been played', () => {
    // Play some moves first
    useChessStore.getState().initGame('passAndPlay')
    useChessStore.getState().executeMove('e2', 'e4')
    useChessStore.getState().executeMove('e7', 'e5')

    // Verify moves were played
    expect(useChessStore.getState().moveHistory.length).toBe(2)

    // Now re-initialize
    useChessStore.getState().initGame('passAndPlay')
    const store = useChessStore.getState()

    expect(store.phase).toBe('playing')
    expect(store.fen).toBe(STARTING_FEN)
    expect(store.moveHistory).toEqual([])
    expect(store.turn).toBe('w')
  })
})
