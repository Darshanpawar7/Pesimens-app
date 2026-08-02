/**
 * RetentionHooks — Enhancement 11
 *
 * Bundles four lightweight retention UI elements:
 *  1. Daily Play Reminder  — "Play 1 game today 🔥" / "Daily goal complete ✅"
 *  2. Win/Loss feedback    — celebratory or encouraging message + confetti on win
 *  3. Streak display       — win streak counter with personal-best highlight
 *  4. Come-back-tomorrow   — countdown to next daily challenge after game ends
 */

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChessStats {
  wins: number
  losses: number
  draws: number
  games_played: number
  win_streak: number
  best_streak: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns today's date as a UTC YYYY-MM-DD string */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Returns ms until next midnight UTC */
function msUntilMidnightUtc(): number {
  const now = new Date()
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  return midnight.getTime() - now.getTime()
}

/** Format ms as HH:MM:SS */
function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

const CONFETTI_STYLE = `
@keyframes confetti-fall {
  0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}
.confetti-piece {
  position: fixed;
  top: 0;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  animation: confetti-fall linear forwards;
  pointer-events: none;
  z-index: 9999;
}
`

const CONFETTI_COLORS = ['#6366f1', '#a5b4fc', '#f59e0b', '#10b981', '#ef4444', '#ec4899']

function ConfettiPiece({ left, delay, duration, color }: { left: number; delay: number; duration: number; color: string }) {
  return (
    <div
      className="confetti-piece"
      style={{
        left: `${left}%`,
        background: color,
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
      }}
    />
  )
}

function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 600,
    duration: 1800 + Math.random() * 1200,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  }))

  return (
    <>
      <style>{CONFETTI_STYLE}</style>
      {(pieces ?? []).map((p) => (
        <ConfettiPiece key={p.id} left={p.left} delay={p.delay} duration={p.duration} color={p.color} />
      ))}
    </>
  )
}

// ─── 1. DailyPlayReminder ─────────────────────────────────────────────────────

/**
 * Shows "Play 1 game today 🔥" on the home screen.
 * Switches to "Daily goal complete ✅" once the user has played at least one game today.
 * Tracks via localStorage key `chess-played-{YYYY-MM-DD}`.
 */
export function DailyPlayReminder() {
  const today = todayUtc()
  const storageKey = `chess-played-${today}`
  const [played, setPlayed] = useState(() => localStorage.getItem(storageKey) === '1')

  // Re-check on focus (user may have played in another tab)
  useEffect(() => {
    const onFocus = () => setPlayed(localStorage.getItem(storageKey) === '1')
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [storageKey])

  return (
    <div
      style={{
        width: '100%',
        padding: '12px 16px',
        borderRadius: 12,
        background: played
          ? 'rgba(16,185,129,0.1)'
          : 'rgba(99,102,241,0.1)',
        border: `1px solid ${played ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxSizing: 'border-box',
      }}
      role="status"
      aria-live="polite"
    >
      <span style={{ fontSize: 20 }}>{played ? '✅' : '🔥'}</span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: played ? '#6ee7b7' : '#a5b4fc',
        }}
      >
        {played ? 'Daily goal complete ✅' : 'Play 1 game today 🔥'}
      </span>
    </div>
  )
}

/** Call this after any game finishes to mark today's goal as done. */
export function markDailyGoalComplete() {
  localStorage.setItem(`chess-played-${todayUtc()}`, '1')
}

// ─── 2. WinLossFeedback ───────────────────────────────────────────────────────

interface WinLossFeedbackProps {
  result: 'white' | 'black' | 'draw'
  /** The colour the local player was playing as (null for pass-and-play) */
  myColour: 'w' | 'b' | null
  consecutiveWins: number
}

/**
 * Shown inside the result overlay.
 * Displays a personalised message and confetti on win.
 */
export function WinLossFeedback({ result, myColour, consecutiveWins }: WinLossFeedbackProps) {
  const isWin =
    myColour !== null &&
    ((result === 'white' && myColour === 'w') || (result === 'black' && myColour === 'b'))
  const isLoss =
    myColour !== null &&
    ((result === 'white' && myColour === 'b') || (result === 'black' && myColour === 'w'))
  const isDraw = result === 'draw'

  // Pass-and-play: just show the result without personal framing
  const isPassAndPlay = myColour === null

  let message: string
  let subMessage: string | null = null
  let emoji: string

  if (isPassAndPlay) {
    message = result === 'draw' ? 'Well played, both!' : `${result === 'white' ? 'White' : 'Black'} wins!`
    emoji = result === 'draw' ? '🤝' : '🏆'
  } else if (isWin) {
    message = 'You won! 🎉'
    emoji = '🎉'
    if (consecutiveWins >= 3) {
      subMessage = `🔥 ${consecutiveWins} wins in a row — you're on fire!`
    } else if (consecutiveWins === 2) {
      subMessage = '⚡ Two in a row — keep it up!'
    }
  } else if (isLoss) {
    const lossMessages = ['Try again 😏', 'So close! Give it another shot.', 'Almost had it — one more game?']
    message = lossMessages[Math.floor(Math.random() * lossMessages.length)]
    emoji = '😏'
  } else {
    // draw
    message = 'A hard-fought draw!'
    emoji = '🤝'
  }

  return (
    <>
      {isWin && <Confetti />}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 4 }}>{emoji}</div>
        <p
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: isWin ? '#a5b4fc' : isDraw ? '#9ca3af' : '#f87171',
            marginBottom: subMessage ? 6 : 0,
          }}
        >
          {message}
        </p>
        {subMessage && (
          <p style={{ fontSize: 13, color: '#f59e0b', fontWeight: 600 }}>{subMessage}</p>
        )}
      </div>
    </>
  )
}

// ─── 3. StreakDisplay ─────────────────────────────────────────────────────────

interface StreakDisplayProps {
  userId: string | null
  onViewStats?: () => void
}

/**
 * Fetches win_streak and best_streak from chess_stats and renders a compact
 * streak badge on the home screen.
 */
export function StreakDisplay({ userId, onViewStats }: StreakDisplayProps) {
  const [stats, setStats] = useState<ChessStats | null>(null)
  const [loading, setLoading] = useState(true)
  const prevBestRef = useRef<number | null>(null)

  useEffect(() => {
    if (!userId) { setLoading(false); return }

    supabase
      .from('chess_stats')
      .select('wins, losses, draws, games_played, win_streak, best_streak')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
      .catch(err => console.error(err))