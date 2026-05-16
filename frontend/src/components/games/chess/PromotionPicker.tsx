import React, { useEffect, useState } from 'react'
import { ChessPiece } from './ChessPiece'

interface PromotionPickerProps {
  colour: 'w' | 'b'
  onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void
  onCancel?: () => void
}

export function PromotionPicker({ colour, onSelect, onCancel }: PromotionPickerProps) {
  const pieces: Array<{ type: 'q' | 'r' | 'b' | 'n'; label: string }> = [
    { type: 'q', label: 'Queen' },
    { type: 'r', label: 'Rook' },
    { type: 'b', label: 'Bishop' },
    { type: 'n', label: 'Knight' },
  ]

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 479px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Dismiss on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: isMobile ? 'flex-end' : 'center',
    justifyContent: 'center',
    // Above toasts (9998/9999) so promotion can't be blocked
    zIndex: 10000,
    pointerEvents: 'auto',
  }

  const modalStyle: React.CSSProperties = isMobile
    ? {
        background: '#1a1a1a',
        borderRadius: '20px 20px 0 0',
        // Use safe-area-inset-bottom so content isn't hidden behind home indicator
        paddingTop: 24,
        paddingLeft: 16,
        paddingRight: 16,
        paddingBottom: 'max(32px, env(safe-area-inset-bottom, 32px))',
        boxShadow: '0 -4px 40px rgba(0,0,0,0.7)',
        border: '2px solid #6366f1',
        borderBottom: 'none',
        width: '100%',
        boxSizing: 'border-box' as const,
      }
    : {
        background: '#1a1a1a',
        borderRadius: 12,
        padding: 24,
        boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.4)',
        border: '2px solid #6366f1',
        maxWidth: 360,
        width: '90%',
        boxSizing: 'border-box' as const,
      }

  return (
    <div
      style={backdropStyle}
      onClick={() => onCancel?.()}
    >
      <div
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            color: '#ffffff',
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          Choose Promotion
        </h2>
        <p
          style={{
            color: '#9ca3af',
            fontSize: 14,
            marginBottom: 24,
            textAlign: 'center',
          }}
        >
          Select a piece to promote your pawn
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: isMobile ? 16 : 12,
          }}
        >
          {pieces.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              style={{
                background: '#2a2a2a',
                border: '2px solid #444',
                borderRadius: 10,
                padding: isMobile ? '18px 8px' : 16,
                minHeight: isMobile ? 80 : 72,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s ease',
                // Ensure 44px minimum touch target
                touchAction: 'manipulation',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#333'
                e.currentTarget.style.borderColor = '#6366f1'
                e.currentTarget.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#2a2a2a'
                e.currentTarget.style.borderColor = '#444'
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              <ChessPiece piece={{ type, color: colour }} size={isMobile ? 48 : 56} />
              <span
                style={{
                  color: '#ffffff',
                  fontSize: isMobile ? 15 : 14,
                  fontWeight: 500,
                }}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
