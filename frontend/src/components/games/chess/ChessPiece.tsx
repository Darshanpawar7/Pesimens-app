// Unicode chess symbols mapping
const PIECE_UNICODE: Record<string, string> = {
  wK: '♔',
  wQ: '♕',
  wR: '♖',
  wB: '♗',
  wN: '♘',
  wP: '♙',
  bK: '♚',
  bQ: '♛',
  bR: '♜',
  bB: '♝',
  bN: '♞',
  bP: '♟',
}

interface ChessPieceProps {
  piece: {
    type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
    color: 'w' | 'b'
  }
  size?: number
}

export function ChessPiece({ piece, size = 48 }: ChessPieceProps) {
  const key = `${piece.color}${piece.type.toUpperCase()}`
  const symbol = PIECE_UNICODE[key] ?? '?'

  const isWhite = piece.color === 'w'

  return (
    <div
      style={{
        fontSize: size,
        lineHeight: 1,
        userSelect: 'none',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // White pieces: cream/white fill with dark shadow for contrast on dark squares
        // Black pieces: near-black fill with white outline so they're visible on light squares
        color: isWhite ? '#f0f0f0' : '#1a1a1a',
        textShadow: isWhite
          ? '0 0 2px #000, 0 1px 3px rgba(0,0,0,0.8)'
          : '0 0 1px #fff, 0 0 2px #fff, 0 1px 3px rgba(0,0,0,0.4)',
        WebkitTextStroke: isWhite ? '0.5px rgba(0,0,0,0.6)' : '1px rgba(255,255,255,0.9)',
      }}
    >
      {symbol}
    </div>
  )
}
