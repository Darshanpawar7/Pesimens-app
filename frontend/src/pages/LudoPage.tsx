import React, { useEffect } from 'react'
import { useLudoStore } from '../lib/ludo/store'
import { LudoBoardNew, LudoGameStatusBar } from '../components/games/ludo/LudoBoardNew'
import { LudoPlayerNew } from '../components/games/ludo/LudoPlayerNew'
import { BaseID } from '../lib/ludo/types'
import { getBaseHexColor } from '../lib/ludo/utils'
import { BOARD_DIMENSION } from '../lib/ludo/constants'

// Hook: returns the CSS scale factor to fit the board in the viewport
function useBoardScale(): number {
  const [scale, setScale] = React.useState(() => {
    // 24px total horizontal padding (12px each side)
    const available = Math.min(window.innerWidth - 24, 600)
    return Math.min(1, available / BOARD_DIMENSION)
  })

  useEffect(() => {
    const update = () => {
      const available = Math.min(window.innerWidth - 24, 600)
      setScale(Math.min(1, available / BOARD_DIMENSION))
    }
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return scale
}

export const BASE_NAMES: Record<BaseID, string> = {
  [BaseID.BASE_1]: 'Blue',
  [BaseID.BASE_2]: 'Green',
  [BaseID.BASE_3]: 'Red',
  [BaseID.BASE_4]: 'Yellow',
}

// ─── Setup screen ─────────────────────────────────────────────────────────────
function SetupScreen({ onStart }: { onStart: (n: 2 | 3 | 4) => void }) {
  const [selected, setSelected] = React.useState<2 | 3 | 4>(4)

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div
        style={{
          background: 'linear-gradient(135deg, #111118 0%, #16161f 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 24,
          padding: 40,
          maxWidth: 400,
          width: '100%',
        }}
      >
        <div className="text-center mb-8">
          <div style={{ fontSize: 56, marginBottom: 8 }}>🎲</div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.03em',
              marginBottom: 6,
            }}
          >
            Ludo
          </h1>
          <p style={{ color: '#8888a8', fontSize: 14 }}>Select number of players</p>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {([2, 3, 4] as const).map((count) => (
            <button
              key={count}
              onClick={() => setSelected(count)}
              style={{
                flex: 1,
                padding: '16px 0',
                borderRadius: 14,
                fontWeight: 700,
                fontSize: 20,
                border:
                  selected === count
                    ? '2px solid #7c6dfa'
                    : '2px solid rgba(255,255,255,0.08)',
                background:
                  selected === count
                    ? 'rgba(124,109,250,0.18)'
                    : 'rgba(255,255,255,0.03)',
                color: selected === count ? '#fff' : '#8888a8',
                cursor: 'pointer',
                transition: 'all 0.15s',
                transform: selected === count ? 'scale(1.04)' : 'scale(1)',
              }}
            >
              {count}
            </button>
          ))}
        </div>

        <button
          onClick={() => onStart(selected)}
          style={{
            width: '100%',
            padding: '16px 0',
            borderRadius: 14,
            fontWeight: 700,
            fontSize: 16,
            background: 'linear-gradient(135deg, #7c6dfa, #fa6d9a)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            letterSpacing: '0.02em',
          }}
        >
          Start Game
        </button>
      </div>
    </div>
  )
}

// ─── Winner overlay ───────────────────────────────────────────────────────────
function WinnerOverlay({ winner, onReset }: { winner: BaseID; onReset: () => void }) {
  const { bases } = useLudoStore()
  const base = bases[winner]
  const color = base ? getBaseHexColor(base.color) : '#7c6dfa'
  const name = BASE_NAMES[winner]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #111118, #16161f)',
          border: `2px solid ${color}44`,
          borderRadius: 24,
          padding: 40,
          maxWidth: 380,
          width: '100%',
          textAlign: 'center',
          boxShadow: `0 0 60px ${color}33`,
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 12 }}>🏆</div>
        <h2
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: '#fff',
            marginBottom: 8,
            letterSpacing: '-0.02em',
          }}
        >
          Winner!
        </h2>
        <p style={{ color: '#8888a8', marginBottom: 28, fontSize: 14 }}>
          {name} wins!
        </p>
        <button
          onClick={onReset}
          style={{
            width: '100%',
            padding: '14px 0',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 15,
            background: `linear-gradient(135deg, ${color}, ${color}aa)`,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Play Again
        </button>
      </div>
    </div>
  )
}

// ─── LudoPage ─────────────────────────────────────────────────────────────────
export default function LudoPage() {
  const {
    loadGameData,
    phase,
    startGame,
    winner,
    resetGame,
    currentTurn,
    bases,
    loadError,
  } = useLudoStore()

  // ⚠️ Must be called unconditionally — before any early returns
  const scale = useBoardScale()

  useEffect(() => {
    loadGameData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div
          style={{
            background: '#111118',
            border: '1px solid rgba(250,77,109,0.3)',
            borderRadius: 20,
            padding: 32,
            maxWidth: 360,
            width: '100%',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <p style={{ color: '#fa4d6d', fontWeight: 600, marginBottom: 16, fontSize: 14 }}>
            {loadError}
          </p>
          <button
            onClick={() => loadGameData()}
            style={{
              padding: '12px 28px',
              borderRadius: 10,
              background: '#7c6dfa',
              color: '#fff',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'setup') {
    return <SetupScreen onStart={startGame} />
  }

  const currentBase = bases[currentTurn]
  const currentName = BASE_NAMES[currentTurn]
  const currentColor = currentBase ? getBaseHexColor(currentBase.color) : '#7c6dfa'

  // The board renders at BOARD_DIMENSION px but we scale it down.
  // The scaled visual size is BOARD_DIMENSION * scale — use that for layout.
  const scaledBoardSize = BOARD_DIMENSION * scale

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 20,
        paddingBottom: 80,
        paddingLeft: 12,
        paddingRight: 12,
        overflowX: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.02em',
            marginBottom: 4,
          }}
        >
          🎲 Ludo
        </h1>
        {winner === null && currentBase && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: `${currentColor}18`,
              border: `1px solid ${currentColor}44`,
              borderRadius: 99,
              padding: '4px 12px',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: currentColor,
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: 12, color: currentColor, fontWeight: 600 }}>
              Current turn: {currentName}
            </span>
          </div>
        )}
      </div>

      {/* Top player panels (Blue + Green) — match scaled board width */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 8,
          width: scaledBoardSize,
          maxWidth: '100%',
        }}
      >
        <LudoPlayerNew baseID={BaseID.BASE_1} placement="top" />
        <LudoPlayerNew baseID={BaseID.BASE_2} placement="top" />
      </div>

      {/* Board — scale to fit viewport, no horizontal scroll */}
      <div
        style={{
          width: scaledBoardSize,
          height: scaledBoardSize,
          flexShrink: 0,
          overflow: 'hidden',
          // The board renders at full size then we scale it down
          position: 'relative',
        }}
      >
        <div
          style={{
            transformOrigin: 'top left',
            transform: `scale(${scale})`,
            width: BOARD_DIMENSION,
            height: BOARD_DIMENSION,
          }}
        >
          <LudoBoardNew />
        </div>
      </div>

      {/* Status bar — rendered at full size outside the scaled wrapper */}
      <LudoGameStatusBar />

      {/* Bottom player panels (Red + Yellow) — match scaled board width */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginTop: 8,
          width: scaledBoardSize,
          maxWidth: '100%',
        }}
      >
        <LudoPlayerNew baseID={BaseID.BASE_3} placement="bottom" />
        <LudoPlayerNew baseID={BaseID.BASE_4} placement="bottom" />
      </div>

      {/* Winner overlay */}
      {winner !== null && <WinnerOverlay winner={winner} onReset={resetGame} />}
    </div>
  )
}
