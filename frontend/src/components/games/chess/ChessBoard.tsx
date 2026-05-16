import { useEffect, useMemo, useState } from 'react'
import { useChessStore } from '../../../lib/chess/store'
import { ChessSquare } from './ChessSquare'
import { PromotionPicker } from './PromotionPicker'
import { Chess } from 'chess.js'

interface ChessBoardProps {
  readOnly?: boolean
}

// Debounce helper — avoids thrashing on rapid resize events
function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

// Compute the square size that fits the viewport.
// Accounts for horizontal padding (8px each side) and board border (2px each side).
// Min 36px (288px board on 320px screen), max 72px.
function calcSquareSize(): number {
  const availableWidth = window.innerWidth - 16 - 4 // 8px padding × 2 + 2px border × 2
  return Math.max(36, Math.min(72, Math.floor(availableWidth / 8)))
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] // top → bottom

export function ChessBoard({ readOnly = false }: ChessBoardProps) {
  const {
    fen,
    selectedSquare,
    legalMoves,
    lastMove,
    inCheck,
    turn,
    promotionPending,
    selectSquare,
    executeMove,
    cancelPromotion,
  } = useChessStore()

  // Parse the current position once per FEN change — NOT on every render
  const chess = useMemo(() => new Chess(fen), [fen])

  // Responsive square size with debounced resize listener
  const [rawSize, setRawSize] = useState(() => calcSquareSize())
  const squareSize = useDebounce(rawSize, 80)

  useEffect(() => {
    const update = () => setRawSize(calcSquareSize())
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Find the king square that is in check (memoised)
  const checkSquare = useMemo<string | null>(() => {
    if (!inCheck) return null
    const board = chess.board()
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col]
        if (piece && piece.type === 'k' && piece.color === turn) {
          return `${FILES[col]}${RANKS[row]}`
        }
      }
    }
    return null
  }, [inCheck, chess, turn])

  // All 64 squares in render order
  const squares = useMemo<string[]>(() => {
    const result: string[] = []
    for (const rank of RANKS) {
      for (const file of FILES) {
        result.push(`${file}${rank}`)
      }
    }
    return result
  }, [])

  const handleSquareClick = (square: string) => {
    if (readOnly) return
    selectSquare(square)
  }

  const handlePromotionSelect = (piece: 'q' | 'r' | 'b' | 'n') => {
    if (promotionPending) {
      executeMove(promotionPending.from, promotionPending.to, piece)
    }
  }

  return (
    <div
      style={{
        display: 'inline-block',
        background: '#1a1a1a',
        padding: 6,
        borderRadius: 8,
        boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.4)',
        position: 'relative',
        // Block board interaction while promotion picker is open
        pointerEvents: promotionPending ? 'none' : 'auto',
        // Prevent double-tap zoom on the whole board container
        touchAction: 'manipulation',
        // Respect iOS safe areas
        paddingBottom: 'max(6px, env(safe-area-inset-bottom, 6px))',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(8, ${squareSize}px)`,
          gridTemplateRows: `repeat(8, ${squareSize}px)`,
          gap: 0,
          border: '2px solid #555',
          boxSizing: 'content-box',
          touchAction: 'manipulation',
        }}
      >
        {squares.map((square) => {
          const file = square[0]
          const rank = square[1]
          const fileIndex = FILES.indexOf(file)
          const rankIndex = parseInt(rank)

          const isLight = (fileIndex + rankIndex) % 2 === 0
          const piece = chess.get(square as any) ?? null

          return (
            <ChessSquare
              key={square}
              square={square}
              piece={piece}
              isLight={isLight}
              isSelected={selectedSquare === square}
              isLegalMove={legalMoves.includes(square)}
              isLastMoveFrom={lastMove?.from === square}
              isLastMoveTo={lastMove?.to === square}
              isCheck={checkSquare === square}
              onClick={() => handleSquareClick(square)}
              size={squareSize}
            />
          )
        })}
      </div>

      {/* Promotion picker renders as a fixed overlay — z-index 500 */}
      {promotionPending && (
        <PromotionPicker colour={turn} onSelect={handlePromotionSelect} onCancel={cancelPromotion} />
      )}
    </div>
  )
}
