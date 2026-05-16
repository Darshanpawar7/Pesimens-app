// Dev-only debug panel for Chess game — only rendered when NODE_ENV === 'development'
// Shows current FEN, turn, phase, selected square, legal moves, and provides
// a "Load FEN" input with preset positions and move history export (PGN / JSON).

import { useState, useCallback } from 'react'
import { useChessStore } from '../../../lib/chess/store'

// ─── Preset FEN positions ─────────────────────────────────────────────────────
const PRESET_FENS: { label: string; fen: string }[] = [
  {
    label: 'Starting position',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  },
  {
    label: 'Scholar\'s Mate (checkmate)',
    fen: 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4',
  },
  {
    label: 'Stalemate',
    fen: '5k2/5P2/5K2/8/8/8/8/8 b - - 0 1',
  },
  {
    label: 'Pawn promotion (White)',
    fen: '8/P7/8/8/8/8/8/4K1k1 w - - 0 1',
  },
  {
    label: 'King in check',
    fen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3',
  },
  {
    label: 'Endgame — K+Q vs K',
    fen: '8/8/8/8/8/2k5/8/2KQ4 w - - 0 1',
  },
]

// ─── PGN export helper ────────────────────────────────────────────────────────
function buildPgn(moveHistory: { san: string }[]): string {
  const pairs: string[] = []
  for (let i = 0; i < moveHistory.length; i += 2) {
    const moveNum = Math.floor(i / 2) + 1
    const white = moveHistory[i]?.san ?? ''
    const black = moveHistory[i + 1]?.san ?? ''
    pairs.push(black ? `${moveNum}. ${white} ${black}` : `${moveNum}. ${white}`)
  }
  return pairs.join(' ')
}

// ─── Copy-to-clipboard helper ─────────────────────────────────────────────────
async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Fallback for environments without clipboard API
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ChessDebugPanel() {
  // Only render in development
  if (import.meta.env.MODE !== 'development') return null

  return <ChessDebugPanelInner />
}

function ChessDebugPanelInner() {
  const {
    fen,
    turn,
    phase,
    selectedSquare,
    legalMoves,
    moveHistory,
    loadFromFen,
  } = useChessStore()

  const [open, setOpen] = useState(false)
  const [fenInput, setFenInput] = useState('')
  const [fenError, setFenError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const handleCopy = useCallback(async (text: string, label: string) => {
    await copyText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }, [])

  const handleLoadFen = useCallback(() => {
    const trimmed = fenInput.trim()
    if (!trimmed) {
      setFenError('FEN cannot be empty')
      return
    }
    try {
      loadFromFen(trimmed)
      setFenError(null)
      setFenInput('')
    } catch {
      setFenError('Invalid FEN string')
    }
  }, [fenInput, loadFromFen])

  const handlePreset = useCallback((presetFen: string) => {
    loadFromFen(presetFen)
    setFenError(null)
    setFenInput('')
  }, [loadFromFen])

  // ── Toggle button ─────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 9999,
        fontFamily: 'monospace',
        fontSize: 12,
      }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Toggle debug panel"
        style={{
          display: 'block',
          marginLeft: 'auto',
          padding: '6px 12px',
          borderRadius: 8,
          background: open ? '#4f46e5' : '#1e1e2e',
          color: open ? '#fff' : '#8888a8',
          border: '1px solid rgba(99,102,241,0.4)',
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.05em',
        }}
      >
        {open ? '✕ Debug' : '🛠 Debug'}
      </button>

      {/* Panel */}
      {open && (
        <div
          style={{
            marginTop: 8,
            background: '#0d0d1a',
            border: '1px solid rgba(99,102,241,0.35)',
            borderRadius: 12,
            padding: 16,
            width: 320,
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {/* ── Section: State ─────────────────────────────────────────── */}
          <Section title="Game State">
            <Row label="Phase" value={phase} />
            <Row label="Turn" value={turn === 'w' ? 'White (w)' : 'Black (b)'} />
            <Row label="Selected" value={selectedSquare ?? '—'} />
            <Row
              label="Legal moves"
              value={legalMoves.length > 0 ? legalMoves.join(', ') : '—'}
            />
          </Section>

          {/* ── Section: FEN ───────────────────────────────────────────── */}
          <Section title="FEN">
            <div
              style={{
                background: '#111122',
                borderRadius: 6,
                padding: '6px 8px',
                color: '#a5b4fc',
                wordBreak: 'break-all',
                lineHeight: 1.5,
                fontSize: 11,
              }}
            >
              {fen}
            </div>
            <button
              onClick={() => handleCopy(fen, 'fen')}
              style={copyBtnStyle}
            >
              {copied === 'fen' ? '✓ Copied!' : 'Copy FEN'}
            </button>
          </Section>

          {/* ── Section: Load FEN ──────────────────────────────────────── */}
          <Section title="Load FEN">
            <textarea
              value={fenInput}
              onChange={(e) => { setFenInput(e.target.value); setFenError(null) }}
              placeholder="Paste FEN string here…"
              rows={2}
              style={{
                width: '100%',
                background: '#111122',
                border: fenError
                  ? '1px solid #ef4444'
                  : '1px solid rgba(99,102,241,0.25)',
                borderRadius: 6,
                color: '#e2e8f0',
                padding: '6px 8px',
                fontFamily: 'monospace',
                fontSize: 11,
                resize: 'vertical',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            {fenError && (
              <span style={{ color: '#ef4444', fontSize: 11 }}>{fenError}</span>
            )}
            <button onClick={handleLoadFen} style={primaryBtnStyle}>
              Load FEN
            </button>

            {/* Preset buttons */}
            <div style={{ marginTop: 6 }}>
              <span style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>
                Presets:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {PRESET_FENS.map(({ label, fen: presetFen }) => (
                  <button
                    key={label}
                    onClick={() => handlePreset(presetFen)}
                    title={presetFen}
                    style={presetBtnStyle}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* ── Section: Move History Export ───────────────────────────── */}
          <Section title={`Move History (${moveHistory.length} moves)`}>
            {moveHistory.length === 0 ? (
              <span style={{ color: '#6b7280', fontSize: 11 }}>No moves yet.</span>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleCopy(buildPgn(moveHistory), 'pgn')}
                    style={copyBtnStyle}
                  >
                    {copied === 'pgn' ? '✓ Copied!' : 'Copy as PGN'}
                  </button>
                  <button
                    onClick={() => handleCopy(JSON.stringify(moveHistory, null, 2), 'json')}
                    style={copyBtnStyle}
                  >
                    {copied === 'json' ? '✓ Copied!' : 'Copy as JSON'}
                  </button>
                </div>
                <div
                  style={{
                    background: '#111122',
                    borderRadius: 6,
                    padding: '6px 8px',
                    color: '#a5b4fc',
                    fontSize: 11,
                    lineHeight: 1.6,
                    maxHeight: 80,
                    overflowY: 'auto',
                  }}
                >
                  {buildPgn(moveHistory) || '—'}
                </div>
              </>
            )}
          </Section>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          color: '#6366f1',
          fontWeight: 700,
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 6,
          borderBottom: '1px solid rgba(99,102,241,0.2)',
          paddingBottom: 4,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ color: '#6b7280', flexShrink: 0 }}>{label}:</span>
      <span style={{ color: '#e2e8f0', textAlign: 'right', wordBreak: 'break-all' }}>
        {value}
      </span>
    </div>
  )
}

// ─── Shared button styles ─────────────────────────────────────────────────────
const copyBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 6,
  background: 'rgba(99,102,241,0.15)',
  color: '#a5b4fc',
  border: '1px solid rgba(99,102,241,0.3)',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: 11,
  fontWeight: 600,
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 6,
  background: '#4f46e5',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: 12,
  fontWeight: 700,
}

const presetBtnStyle: React.CSSProperties = {
  padding: '3px 8px',
  borderRadius: 5,
  background: '#1e1e2e',
  color: '#8888a8',
  border: '1px solid rgba(255,255,255,0.08)',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: 10,
  whiteSpace: 'nowrap',
}
