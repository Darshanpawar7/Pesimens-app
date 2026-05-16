import { useEffect, useRef } from 'react'
import { useChessStore } from '../../../lib/chess/store'

export function MoveHistory() {
  const moveHistory = useChessStore((s) => s.moveHistory)
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to the latest move — scroll within the container only, never the page
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [moveHistory.length])

  // Group into pairs: [[white, black?], ...]
  const movePairs: Array<[string, string?]> = []
  for (let i = 0; i < moveHistory.length; i += 2) {
    movePairs.push([moveHistory[i].san, moveHistory[i + 1]?.san])
  }

  return (
    <div
      ref={containerRef}
      style={{
        background: '#1a1a1a',
        borderRadius: 8,
        padding: 12,
        width: '100%',
        // Cap at 30vh so it never dominates the screen on small devices
        maxHeight: 'min(220px, 30vh)',
        overflowY: 'auto',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        boxSizing: 'border-box',
        // Allow native vertical scroll — don't fight the browser
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch',
      }}
      aria-label="Move history"
    >
      <div
        style={{
          color: '#9ca3af',
          fontSize: 12,
          marginBottom: 8,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Move History
      </div>
      {movePairs.length === 0 ? (
        <div style={{ color: '#6b7280', fontSize: 13, textAlign: 'center', padding: '8px 0' }}>
          No moves yet
        </div>
      ) : (
        movePairs.map(([white, black], index) => (
          <div
            key={index}
            style={{
              display: 'grid',
              gridTemplateColumns: '28px 1fr 1fr',
              gap: 4,
              padding: '4px 0',
              borderBottom: '1px solid #2a2a2a',
              fontSize: 13,
            }}
            aria-label={`Move ${index + 1}: ${white}${black ? ` ${black}` : ''}`}
          >
            <span style={{ color: '#6b7280' }}>{index + 1}.</span>
            <span style={{ color: '#ffffff', fontFamily: 'monospace' }}>{white}</span>
            <span style={{ color: '#d1d5db', fontFamily: 'monospace' }}>{black ?? ''}</span>
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  )
}
