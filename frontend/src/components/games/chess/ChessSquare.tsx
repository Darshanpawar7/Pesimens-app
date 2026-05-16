import { useRef, useState } from 'react'
import { ChessPiece } from './ChessPiece'

interface ChessSquareProps {
  square: string // e.g. 'e4' — kept for key/aria purposes
  piece: {
    type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
    color: 'w' | 'b'
  } | null
  isLight: boolean
  isSelected: boolean
  isLegalMove: boolean
  isLastMoveFrom: boolean
  isLastMoveTo: boolean
  isCheck: boolean
  onClick: () => void
  size?: number
}

// Minimum touch target size per accessibility guidelines (44x44px)
const MIN_TOUCH_TARGET = 44

export function ChessSquare({
  square,
  piece,
  isLight,
  isSelected,
  isLegalMove,
  isLastMoveFrom,
  isLastMoveTo,
  isCheck,
  onClick,
  size = 60,
}: ChessSquareProps) {
  const [tapped, setTapped] = useState(false)
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Base colors from design spec
  const lightSquare = '#f0d9b5'
  const darkSquare = '#b58863'
  const baseColor = isLight ? lightSquare : darkSquare

  // Highlight overlays
  const selectedOverlay = 'rgba(99, 102, 241, 0.4)' // indigo with transparency
  const legalMoveOverlay = 'rgba(99, 102, 241, 0.25)'
  const lastMoveOverlay = 'rgba(255, 255, 100, 0.3)' // yellow tint
  const checkOverlay = 'rgba(239, 68, 68, 0.5)' // red for check

  // Determine overlay color (priority: check > selected > last-move > legal-move)
  let overlayColor: string | null = null
  if (isCheck) {
    overlayColor = checkOverlay
  } else if (isSelected) {
    overlayColor = selectedOverlay
  } else if (isLastMoveFrom || isLastMoveTo) {
    overlayColor = lastMoveOverlay
  } else if (isLegalMove) {
    overlayColor = legalMoveOverlay
  }

  // Ensure the rendered size meets the minimum touch target
  const renderSize = Math.max(size, MIN_TOUCH_TARGET)

  const handleTouchStart = () => {
    // Haptic feedback on piece selection
    if (piece && 'vibrate' in navigator) {
      navigator.vibrate(10)
    }
    // Clear any pending reset to avoid jank on rapid taps
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current)
    setTapped(true)
  }

  const handleTouchEnd = () => {
    // Delay reset slightly so the animation is visible even on fast taps
    tapTimerRef.current = setTimeout(() => setTapped(false), 120)
  }

  const handleClick = () => {
    // Haptic feedback for non-touch clicks on piece squares (fallback)
    if (piece && 'vibrate' in navigator) {
      navigator.vibrate(10)
    }
    onClick()
  }

  return (
    <div
      role="button"
      aria-label={`${square}${piece ? ` ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ''}`}
      tabIndex={0}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        width: renderSize,
        height: renderSize,
        backgroundColor: baseColor,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxSizing: 'border-box',
        border: isSelected ? '3px solid #6366f1' : 'none', // indigo ring for selected
        // Scale animation on tap for visual feedback
        transform: tapped ? 'scale(0.93)' : 'scale(1)',
        transition: tapped ? 'transform 0.08s ease-out' : 'transform 0.15s ease-out',
        // Prevent double-tap zoom on this element
        touchAction: 'manipulation',
      }}
    >
      {/* Overlay for highlights */}
      {overlayColor && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: overlayColor,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Legal move dot indicator */}
      {isLegalMove && !piece && (
        <div
          style={{
            width: renderSize * 0.25,
            height: renderSize * 0.25,
            borderRadius: '50%',
            backgroundColor: 'rgba(99, 102, 241, 0.6)',
            position: 'absolute',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Piece */}
      {piece && <ChessPiece piece={piece} size={renderSize * 0.8} />}
    </div>
  )
}
