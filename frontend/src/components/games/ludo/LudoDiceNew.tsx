import React, { useState, useRef, useCallback } from 'react'
import { useLudoStore } from '../../../lib/ludo/store'
import { DICE_CONFIGURATIONS } from '../../../lib/ludo/constants'
import { getBaseHexColor } from '../../../lib/ludo/utils'

interface LudoDiceNewProps {
  baseColor?: string
  size?: number
}

const DICE_STYLES = `
  @keyframes ldFlip {
    0%   { transform: rotateY(0deg)   rotateX(0deg); }
    25%  { transform: rotateY(180deg) rotateX(90deg) scale(1.1); }
    50%  { transform: rotateY(360deg) rotateX(180deg) scale(0.9); }
    75%  { transform: rotateY(180deg) rotateX(270deg) scale(1.05); }
    100% { transform: rotateY(0deg)   rotateX(360deg); }
  }
  @keyframes ldBounce {
    0%   { transform: scale(1.25) rotate(-6deg); }
    35%  { transform: scale(0.88) rotate(4deg); }
    65%  { transform: scale(1.06) rotate(-2deg); }
    100% { transform: scale(1)    rotate(0deg); }
  }
  @keyframes ldPulse {
    0%, 100% { box-shadow: 0 0 8px var(--dc), 0 2px 8px rgba(0,0,0,0.5); }
    50%      { box-shadow: 0 0 20px var(--dc), 0 2px 12px rgba(0,0,0,0.5); }
  }
  .ld-flip   { animation: ldFlip   0.15s linear infinite; }
  .ld-bounce { animation: ldBounce 0.4s  cubic-bezier(.36,.07,.19,.97) forwards; }
  .ld-pulse  { animation: ldPulse  1.8s  ease-in-out infinite; }
`

export function LudoDiceNew({ baseColor, size = 80 }: LudoDiceNewProps) {
  const { diceRoll, isDiceRollAllowed, currentTurn, bases, rollDice } = useLudoStore()

  const currentBase = bases[currentTurn]
  const color = baseColor ?? (currentBase ? getBaseHexColor(currentBase.color) : '#7c6dfa')

  // Local animation state — independent of store
  const [animFace, setAnimFace]   = useState<number | null>(null)
  const [phase, setPhase]         = useState<'idle' | 'rolling' | 'landing'>('idle')
  const [animKey, setAnimKey]     = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }

  const handleClick = useCallback(() => {
    if (!isDiceRollAllowed || phase === 'rolling') return

    clearTimer()
    setPhase('rolling')
    setAnimKey(k => k + 1)

    // Cycle random faces for 700ms, then call rollDice and show result
    let elapsed = 0
    const delays = [100, 90, 80, 70, 60, 55, 50, 50, 50, 50, 50, 50]
    let step = 0

    const tick = () => {
      setAnimFace(Math.floor(Math.random() * 6) + 1)
      elapsed += delays[Math.min(step, delays.length - 1)]
      step++

      if (elapsed < 700) {
        timerRef.current = setTimeout(tick, delays[Math.min(step, delays.length - 1)])
      } else {
        // Call the store — result is now in diceRoll
        rollDice()
        // Show landing phase — read result from store after this tick
        timerRef.current = setTimeout(() => {
          setPhase('landing')
          setAnimFace(null)  // will fall back to store's diceRoll
          timerRef.current = setTimeout(() => setPhase('idle'), 400)
        }, 50)
      }
    }

    timerRef.current = setTimeout(tick, 0)
  }, [isDiceRollAllowed, phase, rollDice])

  // Which face to display
  const shownFace = phase === 'rolling'
    ? (animFace ?? 1)
    : (diceRoll ?? null)

  const config = shownFace !== null
    ? (DICE_CONFIGURATIONS[shownFace] ?? DICE_CONFIGURATIONS[1])
    : null

  const dotSize = Math.max(9, Math.floor(size * 0.14))
  const pad     = Math.floor(size * 0.12)
  const gap     = Math.floor(size * 0.05)

  const isRolling  = phase === 'rolling'
  const isLanding  = phase === 'landing'
  const canRoll    = isDiceRollAllowed && phase === 'idle'

  // Dice face background: dark while rolling, white/light when showing result
  const faceBg = isRolling
    ? 'linear-gradient(145deg, #23233a, #16161f)'
    : 'linear-gradient(145deg, #ffffff, #f0f0e8)'

  const dotColor = isRolling ? '#ffffff' : '#1a1a1a'
  const dotGlow  = isRolling ? `0 0 5px ${color}` : 'inset 0 1px 2px rgba(0,0,0,0.35)'

  return (
    <>
      <style>{DICE_STYLES}</style>

      <div style={{ perspective: 500, flexShrink: 0 }}>
        <button
          key={animKey}
          onClick={handleClick}
          disabled={!canRoll}
          title={canRoll ? 'Click to roll' : isRolling ? 'Rolling…' : 'Wait for your turn'}
          className={isRolling ? 'ld-flip' : isLanding ? 'ld-bounce' : canRoll ? 'ld-pulse' : ''}
          style={{
            '--dc': color,
            width: size,
            height: size,
            flexShrink: 0,
            border: `3px solid ${canRoll || isRolling ? color : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '20%',
            background: faceBg,
            boxShadow: canRoll
              ? `0 0 12px ${color}55, 0 2px 8px rgba(0,0,0,0.5)`
              : isRolling
              ? `0 0 20px ${color}88, 0 2px 8px rgba(0,0,0,0.5)`
              : '0 2px 6px rgba(0,0,0,0.4)',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(3, 1fr)',
            gap,
            padding: pad,
            cursor: canRoll ? 'pointer' : 'default',
            opacity: !isDiceRollAllowed && !isRolling ? 0.4 : 1,
            outline: 'none',
            transformStyle: 'preserve-3d',
            transition: 'border-color 0.2s, background 0.15s',
          } as React.CSSProperties}
        >
          {config
            ? config.map((visible, i) => (
                <div
                  key={i}
                  style={{
                    width: dotSize,
                    height: dotSize,
                    borderRadius: '50%',
                    margin: 'auto',
                    background: visible ? dotColor : 'transparent',
                    boxShadow: visible ? dotGlow : 'none',
                  }}
                />
              ))
            : /* No roll yet — show question mark */
              Array.from({ length: 9 }).map((_, i) =>
                i === 4 ? (
                  <div
                    key={i}
                    style={{
                      margin: 'auto',
                      fontSize: size * 0.28,
                      lineHeight: 1,
                      color: color,
                      fontWeight: 800,
                      userSelect: 'none',
                    }}
                  >
                    ?
                  </div>
                ) : (
                  <div key={i} />
                )
              )}
        </button>
      </div>
    </>
  )
}
