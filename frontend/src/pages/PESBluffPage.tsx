import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '@/lib/api'
import { useGameSession, type GameSession } from '@/hooks/useGameSession'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/use-toast'
import { BLUFF_QUESTIONS } from '@/data/bluffQuestions'

// ─── Types ────────────────────────────────────────────────────────────────────

type BluffPlayer = { id: string; name: string; score: number }

type LastReveal = {
  wasBluff: boolean
  answer: string
  question: string
  fooledMajority: boolean
  playerName: string
}

type RoundHistoryEntry = {
  round: number
  playerId: string
  question: string
  answer: string
  wasBluff: boolean
  votes: Record<string, boolean>
  fooledMajority: boolean
}

type BluffGameState = {
  phase: 'lobby' | 'playing' | 'finished'
  locked: boolean
  playerCount: number
  turnOrder: string[]
  players: Record<string, BluffPlayer>
  currentTurnIndex: number
  roundsPlayed: number
  currentQuestion: string | null
  currentAnswer: string | null
  wasBluff: boolean | null
  votes: Record<string, boolean>
  lastReveal: LastReveal | null
  roundHistory: RoundHistoryEntry[]
}

type PublicRoom = {
  id: string
  room_code: string
  game_type: string
  host_id: string
  player_count: number
  max_players: number
  created_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_PLAYERS = 3
const MAX_PLAYERS = 6
const ROUNDS_PER_PLAYER = 2
const QUESTIONS: string[] = BLUFF_QUESTIONS

const EMPTY_STATE: BluffGameState = {
  phase: 'lobby', locked: false, playerCount: 0, turnOrder: [], players: {},
  currentTurnIndex: 0, roundsPlayed: 0, currentQuestion: null, currentAnswer: null,
  wasBluff: null, votes: {}, lastReveal: null, roundHistory: [],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickQuestion(exclude?: string): string {
  const pool = exclude ? QUESTIONS.filter(q => q !== exclude) : QUESTIONS
  return pool[Math.floor(Math.random() * pool.length)] ?? QUESTIONS[0]
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-indigo-500 to-blue-700',
]

function avatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function buildStateFromSession(session: GameSession | null): BluffGameState {
  if (!session) return EMPTY_STATE
  const raw = (session.game_state || {}) as Partial<BluffGameState>
  const fallback = (session.players || []).map(p => ({ id: p.id, name: p.display_name || 'Anonymous', score: 0 }))
  const players = raw.players && typeof raw.players === 'object' && !Array.isArray(raw.players) && Object.keys(raw.players).length > 0
    ? raw.players
    : Object.fromEntries(fallback.map(p => [p.id, p]))
  const turnOrder = Array.isArray(raw.turnOrder) && raw.turnOrder.length > 0 ? raw.turnOrder : fallback.map(p => p.id)
  // Guard votes and roundHistory — they may arrive as strings if the DB stored them incorrectly
  const votes = raw.votes && typeof raw.votes === 'object' && !Array.isArray(raw.votes) ? raw.votes : {}
  const roundHistory = Array.isArray(raw.roundHistory) ? raw.roundHistory : []
  return {
    phase: raw.phase ?? (session.phase === 'finished' ? 'finished' : 'lobby'),
    locked: raw.locked ?? false,
    playerCount: raw.playerCount ?? fallback.length,
    turnOrder, players,
    currentTurnIndex: raw.currentTurnIndex ?? 0,
    roundsPlayed: raw.roundsPlayed ?? 0,
    currentQuestion: raw.currentQuestion ?? null,
    currentAnswer: raw.currentAnswer ?? null,
    wasBluff: raw.wasBluff ?? null,
    votes,
    lastReveal: raw.lastReveal ?? null,
    roundHistory,
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ name, id, size = 'md' }: { name: string; id: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'h-7 w-7 text-[10px]' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-9 w-9 text-xs'
  return (
    <div className={`${sz} shrink-0 rounded-full bg-gradient-to-br ${avatarColor(id)} flex items-center justify-center font-bold text-white shadow-lg`}>
      {getInitials(name)}
    </div>
  )
}

function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (score / max) * 100) : 0
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-[#2a2a2a]">
      <div className="h-full rounded-full bg-[#6366f1] transition-all duration-700" style={{ width: `${pct}%` }} />
    </div>
  )
}

function RevealBanner({ reveal, onDismiss }: { reveal: LastReveal; onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onDismiss}>
      <div
        className="w-full max-w-sm rounded-3xl border border-[#2a2a2a] bg-[#111111] p-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.8)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-5xl mb-3">{reveal.wasBluff ? '🎭' : '✅'}</div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#8888a8] mb-1">
          {reveal.playerName} revealed
        </p>
        <h2 className="text-xl font-bold text-white mb-1">
          {reveal.wasBluff ? 'It was a BLUFF!' : 'It was the TRUTH!'}
        </h2>
        <p className="text-sm text-[#8888a8] mb-4 italic">"{reveal.answer}"</p>
        <div className={`rounded-2xl border px-4 py-2 text-sm font-semibold mb-5 ${
          reveal.fooledMajority
            ? 'border-[#6366f1]/30 bg-[#6366f1]/10 text-indigo-300'
            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
        }`}>
          {reveal.fooledMajority
            ? `🃏 ${reveal.playerName} fooled the table! +2 pts`
            : `🎯 The table read it right! Correct voters get +1 pt`}
        </div>
        <button
          onClick={onDismiss}
          className="w-full rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] py-2.5 text-sm font-semibold text-white hover:bg-[#222] transition"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PESBluffPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { session, loading, error, createRoom, joinRoom, subscribeToGame, leaveRoom } = useGameSession()
  const [liveSession, setLiveSession] = useState<GameSession | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [answerText, setAnswerText] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [showReveal, setShowReveal] = useState<LastReveal | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()
  const [showHistory, setShowHistory] = useState(false)
  const [entryTab, setEntryTab] = useState<'join' | 'public'>('join')
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([])
  const [publicLoading, setPublicLoading] = useState(false)
  const [makePublic, setMakePublic] = useState(false)
  const initRef = useRef<string | null>(null)
  const lastRevealRef = useRef<string>('')

  useEffect(() => { if (session) setLiveSession(session) }, [session])

  // Fetch public rooms when that tab is active
  useEffect(() => {
    if (entryTab !== 'public' || liveSession) return
    setPublicLoading(true)
    apiFetch<{ ok: boolean; rooms: PublicRoom[] }>('/api/game/public-rooms?game_type=bluff')
      .then(res => { if (res.ok) setPublicRooms(res.rooms) })
      .catch(() => {})
      .finally(() => setPublicLoading(false))
  }, [entryTab, liveSession])

  const roomCode = liveSession?.room_code ?? ''
  const gameState = useMemo(() => buildStateFromSession(liveSession), [liveSession])

  useEffect(() => {
    if (!roomCode) return
    return subscribeToGame(roomCode, setLiveSession)
  }, [roomCode, subscribeToGame])

  // Reset answer input when turn changes
  useEffect(() => { setAnswerText('') }, [gameState.currentTurnIndex, gameState.roundsPlayed])

  // Host initialises lobby state
  useEffect(() => {
    if (!liveSession || !user) return
    if (liveSession.host_id !== user.id) return
    if (Object.keys(liveSession.game_state || {}).length > 0) return
    if (initRef.current === liveSession.id) return
    initRef.current = liveSession.id
    void rpcAction('init_lobby')
  }, [liveSession, user])

  // Show reveal banner when lastReveal changes
  useEffect(() => {
    if (!gameState.lastReveal) return
    const key = `${gameState.roundsPlayed}:${gameState.lastReveal.answer}`
    if (key === lastRevealRef.current) return
    lastRevealRef.current = key
    setShowReveal(gameState.lastReveal)
  }, [gameState.lastReveal, gameState.roundsPlayed])

  // ── Derived state ──────────────────────────────────────────────────────────
  const isHost = Boolean(liveSession && user && liveSession.host_id === user.id)
  const currentPlayerId = gameState.turnOrder[gameState.currentTurnIndex] ?? null
  const currentPlayer = currentPlayerId ? gameState.players[currentPlayerId] ?? null : null
  const isCurrentPlayer = Boolean(user && currentPlayerId && user.id === currentPlayerId)
  const otherPlayerIds = gameState.turnOrder.filter(id => id !== currentPlayerId)
  const votesCount = otherPlayerIds.filter(id => id in gameState.votes).length
  const allVoted = otherPlayerIds.length > 0 && votesCount === otherPlayerIds.length
  const hasAnswered = Boolean(gameState.currentAnswer)
  const myVote = user ? gameState.votes[user.id] : undefined
  const hasVoted = myVote !== undefined
  const canReveal = isCurrentPlayer && hasAnswered && allVoted
  const canStart = isHost && gameState.phase === 'lobby' && (liveSession?.players?.length ?? 0) >= MIN_PLAYERS
  const lobbyPlayers = liveSession?.players ?? []
  const participantIds = new Set(liveSession?.players.map(p => p.id) ?? [])
  const isParticipant = !user || participantIds.has(user.id) || isHost
  const maxScore = Math.max(0, ...Object.values(gameState.players).map(p => p.score))
  const totalRounds = gameState.turnOrder.length * ROUNDS_PER_PLAYER
  const progressPct = totalRounds > 0 ? (gameState.roundsPlayed / totalRounds) * 100 : 0

  // ── Actions ────────────────────────────────────────────────────────────────
  async function rpcAction(
    action: 'init_lobby' | 'set_lock' | 'kick_player' | 'start_game' | 'answer' | 'vote' | 'reveal' | 'reset_lobby',
    payload: Record<string, unknown> = {}
  ): Promise<boolean> {
    if (!liveSession || !user) return false
    setLocalError(null)
    try {
      const result = await apiFetch<{ ok: boolean; game_state?: Record<string, unknown>; error?: string }>(
        '/api/game/bluff-action',
        { method: 'POST', body: JSON.stringify({ session_id: liveSession.id, action, payload }) }
      )
      if (!result.ok) { setLocalError(result.error || 'Action failed'); return false }
      if (result.game_state) setLiveSession(cur => cur ? { ...cur, game_state: result.game_state as Record<string, unknown> } : cur)
      return true
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Action failed')
      return false
    }
  }

  async function handleCreateRoom(isPublic = false) {
    await createRoom('bluff', isPublic)
    setLocalError(null)
  }
  async function handleJoinRoom() {
    const code = joinCode.trim().toUpperCase()
    if (code.length < 4) return
    await joinRoom(code); setJoinCode('')
  }
  async function handleStartGame() {
    await rpcAction('start_game', { question: pickQuestion() })
  }
  async function handleSubmitAnswer() {
    if (!answerText.trim()) return
    await rpcAction('answer', { answer_text: answerText.trim() })
  }
  async function handleVote(thinksBluff: boolean) {
    if (isCurrentPlayer || hasVoted) return
    await rpcAction('vote', { thinks_bluff: thinksBluff })
  }
  async function handleReveal(wasBluff: boolean) {
    if (!canReveal) return
    await rpcAction('reveal', { was_bluff: wasBluff, next_question: pickQuestion(gameState.currentQuestion ?? undefined) })
  }
  async function handleLeaveRoom() {
    if (!liveSession) return
    await leaveRoom(liveSession.id); navigate('/games')
  }
  async function copyRoomCode() {
    if (!roomCode) return
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
      toast({ variant: 'success', title: 'Copied to clipboard! ✅' })
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast({ variant: 'error', title: 'Could not copy to clipboard' })
    }
  }
  // ══════════════════════════════════════════════════════════════════════════
  // SCREEN: Entry / No session
  // ══════════════════════════════════════════════════════════════════════════
  if (!liveSession) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] px-4 pt-6 pb-28">
        <div className="mx-auto w-full max-w-sm">
          <div className="rounded-3xl border border-[#2a2a2a] bg-[linear-gradient(180deg,#171717_0%,#131313_100%)] overflow-hidden">

            {/* Header */}
            <div className="px-5 pt-6 pb-4 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] text-2xl">
                🃏
              </div>
              <h1 className="text-xl font-bold text-white">PES Bluff</h1>
              <p className="mt-1 text-xs text-[#8888a8]">Answer questions. Lie convincingly. Win.</p>
            </div>

            {/* Tab bar */}
            <div className="mx-4 mb-4 flex rounded-xl border border-[#2a2a2a] bg-[#111111] p-1">
              {(['join', 'public'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setEntryTab(tab)}
                  className={[
                    'flex-1 rounded-lg py-2 text-xs font-semibold transition-all',
                    entryTab === tab ? 'bg-[#1e1e1e] text-white' : 'text-[#8888a8]',
                  ].join(' ')}
                >
                  {tab === 'join' ? '🔑 Join / Create' : '🌐 Public rooms'}
                </button>
              ))}
            </div>

            <div className="px-4 pb-5">
              {/* ── Join / Create tab ── */}
              {entryTab === 'join' && (
                <div className="space-y-3">
                  {/* Create room card */}
                  <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4 space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6366f1]">Create a room</p>

                    {/* Toggle row */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#cbd5e1]">Make it public</p>
                        <p className="text-[11px] text-[#8888a8]">Anyone can find and join</p>
                      </div>
                      {/* Simple accessible toggle */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={makePublic}
                        onClick={() => setMakePublic(v => !v)}
                        className={[
                          'relative shrink-0 h-6 w-11 rounded-full overflow-hidden transition-colors duration-200',
                          makePublic ? 'bg-[#6366f1]' : 'bg-[#3a3a3a]',
                        ].join(' ')}
                      >
                        <span className={[
                          'absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform duration-200',
                          makePublic ? 'translate-x-[21px]' : 'translate-x-[3px]',
                        ].join(' ')} />
                      </button>
                    </div>

                    <button
                      onClick={() => { void handleCreateRoom(makePublic) }}
                      disabled={loading}
                      className="w-full rounded-2xl bg-[#6366f1] py-3 text-sm font-bold text-white transition hover:bg-[#4f46e5] active:scale-[0.98] disabled:opacity-50"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Creating…
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <span className="text-base leading-none">{makePublic ? '🌐' : '🔒'}</span>
                          {makePublic ? 'Create public room' : 'Create private room'}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Join by code card */}
                  <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4 space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6366f1]">Join with a code</p>
                    {/* Stack input + button vertically so nothing gets cut off */}
                    <input
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      placeholder="X X X X"
                      maxLength={4}
                      className="w-full rounded-2xl border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-3 text-center text-xl font-bold tracking-[0.4em] text-white outline-none placeholder:text-[#444] focus:border-[#6366f1] transition"
                    />
                    <button
                      onClick={() => { void handleJoinRoom() }}
                      disabled={loading || joinCode.trim().length < 4}
                      className="w-full rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] py-3 text-sm font-semibold text-white transition hover:bg-[#222] active:scale-[0.98] disabled:opacity-40"
                    >
                      Join room
                    </button>
                  </div>
                </div>
              )}

              {/* ── Public rooms tab ── */}
              {entryTab === 'public' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[#8888a8]">Open lobbies</p>
                    <button
                      onClick={() => {
                        setPublicLoading(true)
                        apiFetch<{ ok: boolean; rooms: PublicRoom[] }>('/api/game/public-rooms?game_type=bluff')
                          .then(res => { if (res.ok) setPublicRooms(res.rooms) })
                          .catch(() => {})
                          .finally(() => setPublicLoading(false))
                      }}
                      className="text-[11px] text-[#8888a8] hover:text-[#cbd5e1] transition"
                    >
                      ↻ Refresh
                    </button>
                  </div>

                  {publicLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-14 animate-pulse rounded-2xl bg-[#1a1a1a]" />
                      ))}
                    </div>
                  ) : publicRooms.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#2a2a2a] py-8 text-center">
                      <p className="text-2xl mb-2">🌐</p>
                      <p className="text-sm text-[#8888a8]">No public rooms right now</p>
                      <p className="text-xs text-[#555] mt-1">Create one and let others find you!</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {publicRooms.map(room => (
                        <div key={room.id} className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-3">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-mono text-sm font-bold text-[#c7d2fe]">{room.room_code}</span>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: room.max_players }).map((_, i) => (
                                <div key={i} className={`h-1.5 w-1.5 rounded-full ${i < room.player_count ? 'bg-emerald-400' : 'bg-[#2a2a2a]'}`} />
                              ))}
                              <span className="text-[10px] text-[#555] ml-1">{room.player_count}/{room.max_players}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => { void joinRoom(room.room_code) }}
                            disabled={loading}
                            className="w-full rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] py-2 text-xs font-semibold text-[#cbd5e1] transition hover:border-[#6366f1]/50 hover:text-white disabled:opacity-40"
                          >
                            Join →
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(error || localError) && (
                <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-center text-xs text-red-400">{localError || error}</p>
              )}

              <button onClick={() => navigate('/games')} className="mt-4 w-full text-center text-xs text-[#555] hover:text-[#8888a8] transition">
                ← Back to games
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SCREEN: Kicked
  // ══════════════════════════════════════════════════════════════════════════
  if (!isParticipant && user) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-3xl border border-[#2a2a2a] bg-[#111111] p-8 text-center">
          <div className="text-5xl mb-4">🚪</div>
          <h2 className="text-xl font-bold text-white">You were removed</h2>
          <p className="mt-2 text-sm text-[#8888a8]">The host kicked you from this lobby.</p>
          <button onClick={() => navigate('/games')} className="mt-6 w-full rounded-2xl bg-[#6366f1] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4f46e5] transition">
            Back to games
          </button>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SCREEN: Lobby
  // ══════════════════════════════════════════════════════════════════════════
  if (gameState.phase === 'lobby') {
    return (
      <div className="min-h-screen bg-[#0f0f0f] p-4 md:p-6">
        <div className="relative mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] text-xl">🃏</div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#8888a8]">PES Bluff · Lobby</p>
                <h1 className="text-lg font-bold text-white">Room <span className="font-mono text-[#c7d2fe]">{roomCode}</span></h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { void copyRoomCode() }}
                className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5 text-xs font-medium text-[#cbd5e1] transition hover:bg-[#222] hover:text-white"
              >
                {copied ? '✓ Copied' : 'Copy code'}
              </button>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${gameState.locked ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
                {gameState.locked ? '🔒 Locked' : '🟢 Open'}
              </span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_280px]">
            {/* Players */}
            <div className="rounded-3xl border border-[#2a2a2a] bg-[linear-gradient(180deg,#171717_0%,#131313_100%)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Players</h3>
                <span className="text-xs text-[#8888a8]">{lobbyPlayers.length} / {MAX_PLAYERS}</span>
              </div>
              <div className="space-y-2">
                {lobbyPlayers.map((player, i) => (
                  <div key={player.id} className="flex items-center gap-3 rounded-2xl border border-[#2a2a2a] bg-[#111111] px-3 py-2.5">
                    <Avatar name={player.display_name || 'A'} id={player.id} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{player.display_name || 'Anonymous'}</p>
                      <p className="text-[10px] text-[#8888a8]">{player.id === liveSession.host_id ? '👑 Host' : `Player ${i + 1}`}</p>
                    </div>
                    {isHost && player.id !== liveSession.host_id && (
                      <button
                        onClick={() => { void rpcAction('kick_player', { player_id: player.id }) }}
                        className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-2.5 py-1 text-[10px] font-semibold text-[#8888a8] transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                      >
                        Kick
                      </button>
                    )}
                  </div>
                ))}
                {lobbyPlayers.length < MIN_PLAYERS && (
                  <div className="rounded-2xl border border-dashed border-[#2a2a2a] px-3 py-3 text-center text-xs text-[#555]">
                    Waiting for {MIN_PLAYERS - lobbyPlayers.length} more player{MIN_PLAYERS - lobbyPlayers.length !== 1 ? 's' : ''}…
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-3">
              <div className="rounded-3xl border border-[#2a2a2a] bg-[linear-gradient(180deg,#171717_0%,#131313_100%)] p-4">
                <h3 className="text-sm font-semibold text-white mb-2">How to play</h3>
                <ul className="space-y-1.5 text-xs text-[#8888a8]">
                  <li>🎯 You get a question each round</li>
                  <li>🤥 Answer truthfully — or lie</li>
                  <li>🗳️ Others vote: truth or bluff?</li>
                  <li>🎭 Fool the table → <span className="text-[#c7d2fe]">+2 pts</span></li>
                  <li>🎯 Guess right → <span className="text-emerald-400">+1 pt each</span></li>
                </ul>
              </div>

              <div className="rounded-3xl border border-[#2a2a2a] bg-[linear-gradient(180deg,#171717_0%,#131313_100%)] p-4 space-y-2">
                {isHost ? (
                  <>
                    <button
                      onClick={() => { void rpcAction('set_lock', { locked: !gameState.locked }) }}
                      className="w-full rounded-2xl border border-[#2a2a2a] bg-[#111111] py-2.5 text-sm font-medium text-[#cbd5e1] transition hover:bg-[#1a1a1a] hover:text-white"
                    >
                      {gameState.locked ? '🔓 Unlock lobby' : '🔒 Lock lobby'}
                    </button>
                    <button
                      onClick={() => { void handleStartGame() }}
                      disabled={!canStart}
                      className="w-full rounded-2xl bg-[#6366f1] py-3 text-sm font-bold text-white transition hover:bg-[#4f46e5] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {canStart ? '🚀 Start game' : `Need ${MIN_PLAYERS - lobbyPlayers.length} more player${MIN_PLAYERS - lobbyPlayers.length !== 1 ? 's' : ''}`}
                    </button>
                  </>
                ) : (
                  <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] px-3 py-3 text-center text-xs text-[#8888a8]">
                    ⏳ Waiting for host to start…
                  </div>
                )}
                <button
                  onClick={() => { void handleLeaveRoom() }}
                  className="w-full rounded-2xl border border-[#2a2a2a] bg-[#111111] py-2.5 text-sm font-medium text-[#8888a8] transition hover:text-[#cbd5e1]"
                >
                  Leave lobby
                </button>
              </div>
            </div>
          </div>

          {(error || localError) && (
            <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">{localError || error}</p>
          )}
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SCREEN: Playing
  // ══════════════════════════════════════════════════════════════════════════
  if (gameState.phase === 'playing') {
    const question = gameState.currentQuestion ?? '…'
    const answer = gameState.currentAnswer

    return (
      <div className="min-h-screen bg-[#0f0f0f] p-4 md:p-6">
        {/* Reveal overlay */}
        {showReveal && <RevealBanner reveal={showReveal} onDismiss={() => setShowReveal(null)} />}

        <div className="relative mx-auto max-w-3xl">
          {/* Top bar */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] text-base">🃏</div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#8888a8]">Round {gameState.roundsPlayed + 1} of {totalRounds}</p>
                <p className="text-xs font-medium text-[#8888a8]">Room <span className="font-mono text-[#c7d2fe]">{roomCode}</span></p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="flex-1 max-w-[160px]">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#2a2a2a]">
                <div className="h-full rounded-full bg-[#6366f1] transition-all duration-700" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
            <button
              onClick={() => setShowHistory(h => !h)}
              className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-2.5 py-1.5 text-[10px] font-medium text-[#8888a8] transition hover:text-[#cbd5e1]"
            >
              📜 History
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
            {/* ── Main game area ── */}
            <div className="space-y-3">

              {/* Current player banner */}
              <div className={`rounded-3xl border p-4 ${isCurrentPlayer ? 'border-[#6366f1]/40 bg-[#6366f1]/10' : 'border-[#2a2a2a] bg-[linear-gradient(180deg,#171717,#131313)]'}`}>
                <div className="flex items-center gap-3">
                  {currentPlayer && <Avatar name={currentPlayer.name} id={currentPlayerId!} size="lg" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base font-bold text-white">{currentPlayer?.name ?? '…'}</p>
                      {isCurrentPlayer && (
                        <span className="rounded-full border border-[#6366f1]/40 bg-[#6366f1]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#c7d2fe]">
                          Your turn
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#8888a8] mt-0.5">
                      {isCurrentPlayer ? 'Answer the question — truth or bluff, your call.' : `Waiting for ${currentPlayer?.name} to answer…`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Question card */}
              <div className="rounded-3xl border border-[#2a2a2a] bg-[linear-gradient(180deg,#171717,#131313)] p-5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#6366f1] mb-2">Question</p>
                <p className="text-lg font-semibold leading-snug text-white">{question}</p>
              </div>

              {/* Answer area */}
              {isCurrentPlayer && !answer ? (
                <div className="rounded-3xl border border-[#2a2a2a] bg-[linear-gradient(180deg,#171717,#131313)] p-4">
                  <p className="text-xs text-[#8888a8] mb-3">
                    Type your answer. You can tell the truth or make something up — others will try to guess.
                  </p>
                  <textarea
                    value={answerText}
                    onChange={e => setAnswerText(e.target.value)}
                    placeholder="Your answer…"
                    rows={3}
                    maxLength={280}
                    className="w-full resize-none rounded-2xl border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-3 text-sm text-white outline-none placeholder:text-[#444] focus:border-[#6366f1] transition"
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-[10px] text-[#555]">{answerText.length}/280</span>
                    <button
                      onClick={() => { void handleSubmitAnswer() }}
                      disabled={!answerText.trim()}
                      className="rounded-2xl bg-[#6366f1] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#4f46e5] disabled:opacity-40"
                    >
                      Submit answer →
                    </button>
                  </div>
                </div>
              ) : answer ? (
                <div className="rounded-3xl border border-[#2a2a2a] bg-[linear-gradient(180deg,#171717,#131313)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#6366f1] mb-1">Answer submitted</p>
                  <p className="text-base font-medium text-white italic">"{answer}"</p>
                  {isCurrentPlayer && (
                    <p className="mt-2 text-xs text-[#8888a8]">
                      {allVoted ? 'All votes are in — reveal when ready.' : `Waiting for ${otherPlayerIds.length - votesCount} more vote${otherPlayerIds.length - votesCount !== 1 ? 's' : ''}…`}
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-3xl border border-[#2a2a2a] bg-[#111111] p-4 text-center text-sm text-[#8888a8]">
                  ⏳ Waiting for {currentPlayer?.name} to answer…
                </div>
              )}

              {/* Voting area — for non-current players */}
              {!isCurrentPlayer && answer && (
                <div className="rounded-3xl border border-[#2a2a2a] bg-[linear-gradient(180deg,#171717,#131313)] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-white">What do you think?</p>
                    <span className="text-xs text-[#8888a8]">{votesCount}/{otherPlayerIds.length} voted</span>
                  </div>

                  {hasVoted ? (
                    <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold text-center ${myVote ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>
                      {myVote ? '🎭 You voted: Bluff' : '✅ You voted: Truth'}
                      <p className="text-xs font-normal opacity-60 mt-0.5">Waiting for others…</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => { void handleVote(false) }}
                        className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 py-4 text-center transition hover:bg-emerald-500/20"
                      >
                        <div className="text-2xl mb-1">✅</div>
                        <p className="text-sm font-bold text-emerald-300">Truth</p>
                        <p className="text-[10px] text-emerald-400/50">I believe it</p>
                      </button>
                      <button
                        onClick={() => { void handleVote(true) }}
                        className="rounded-2xl border border-red-500/30 bg-red-500/10 py-4 text-center transition hover:bg-red-500/20"
                      >
                        <div className="text-2xl mb-1">🎭</div>
                        <p className="text-sm font-bold text-red-300">Bluff</p>
                        <p className="text-[10px] text-red-400/50">They're lying</p>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Reveal buttons — only for current player after all voted */}
              {isCurrentPlayer && canReveal && (
                <div className="rounded-3xl border border-[#2a2a2a] bg-[linear-gradient(180deg,#171717,#131313)] p-4">
                  <p className="text-sm font-semibold text-white mb-1">Time to reveal!</p>
                  <p className="text-xs text-[#8888a8] mb-4">All votes are in. Was your answer the truth or a bluff?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { void handleReveal(false) }}
                      className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 py-4 text-center transition hover:bg-emerald-500/20"
                    >
                      <div className="text-2xl mb-1">✅</div>
                      <p className="text-sm font-bold text-emerald-300">It was Truth</p>
                    </button>
                    <button
                      onClick={() => { void handleReveal(true) }}
                      className="rounded-2xl border border-red-500/30 bg-red-500/10 py-4 text-center transition hover:bg-red-500/20"
                    >
                      <div className="text-2xl mb-1">🎭</div>
                      <p className="text-sm font-bold text-red-300">It was a Bluff</p>
                    </button>
                  </div>
                </div>
              )}

              {(error || localError) && (
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-center text-sm text-red-400">{localError || error}</p>
              )}
            </div>

            {/* ── Sidebar: Scores + votes ── */}
            <div className="space-y-3">
              {/* Scoreboard */}
              <div className="rounded-3xl border border-[#2a2a2a] bg-[linear-gradient(180deg,#171717,#131313)] p-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#8888a8] mb-3">Scoreboard</h3>
                <div className="space-y-2.5">
                  {[...gameState.turnOrder]
                    .sort((a, b) => (gameState.players[b]?.score ?? 0) - (gameState.players[a]?.score ?? 0))
                    .map((id, rank) => {
                      const p = gameState.players[id]
                      if (!p) return null
                      const isActive = id === currentPlayerId
                      return (
                        <div key={id} className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition ${isActive ? 'bg-[#6366f1]/10 border border-[#6366f1]/20' : ''}`}>
                          <span className="text-[10px] font-bold text-[#555] w-4">{rank + 1}</span>
                          <Avatar name={p.name} id={id} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white truncate">{p.name}</p>
                            <ScoreBar score={p.score} max={maxScore || 1} />
                          </div>
                          <span className="text-sm font-bold text-white tabular-nums">{p.score}</span>
                        </div>
                      )
                    })}
                </div>
              </div>

              {/* Vote tracker */}
              {answer && (
                <div className="rounded-3xl border border-[#2a2a2a] bg-[linear-gradient(180deg,#171717,#131313)] p-4">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#8888a8] mb-3">Votes</h3>
                  <div className="space-y-2">
                    {otherPlayerIds.map(id => {
                      const p = gameState.players[id]
                      if (!p) return null
                      const voted = id in gameState.votes
                      return (
                        <div key={id} className="flex items-center gap-2">
                          <Avatar name={p.name} id={id} size="sm" />
                          <p className="flex-1 text-xs text-[#8888a8] truncate">{p.name}</p>
                          <span className={`text-[10px] font-semibold ${voted ? 'text-emerald-400' : 'text-[#555]'}`}>
                            {voted ? '✓ Voted' : '…'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Room actions */}
              <div className="rounded-3xl border border-[#2a2a2a] bg-[linear-gradient(180deg,#171717,#131313)] p-3 space-y-2">
                <button
                  onClick={() => { void handleLeaveRoom() }}
                  className="w-full rounded-xl border border-[#2a2a2a] py-2 text-xs font-medium text-[#8888a8] transition hover:text-[#cbd5e1]"
                >
                  Leave room
                </button>
                {isHost && (
                  <button
                    onClick={() => { void rpcAction('reset_lobby') }}
                    className="w-full rounded-xl border border-[#2a2a2a] py-2 text-xs font-medium text-[#8888a8] transition hover:text-[#cbd5e1]"
                  >
                    Reset to lobby
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Round history drawer */}
          {showHistory && gameState.roundHistory.length > 0 && (
            <div className="mt-4 rounded-3xl border border-[#2a2a2a] bg-[linear-gradient(180deg,#171717,#131313)] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Round history</h3>
                <button onClick={() => setShowHistory(false)} className="text-xs text-[#8888a8] hover:text-[#cbd5e1]">Close</button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {[...gameState.roundHistory].reverse().map(entry => {
                  const p = gameState.players[entry.playerId]
                  return (
                    <div key={entry.round} className="rounded-xl border border-[#2a2a2a] bg-[#111111] px-3 py-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-[#555]">R{entry.round}</span>
                        <span className="text-xs font-medium text-[#cbd5e1]">{p?.name ?? 'Unknown'}</span>
                        <span className={`ml-auto text-[10px] font-bold ${entry.wasBluff ? 'text-red-300' : 'text-emerald-300'}`}>
                          {entry.wasBluff ? '🎭 Bluff' : '✅ Truth'}
                        </span>
                        {entry.fooledMajority && <span className="text-[10px] text-[#c7d2fe]">+2</span>}
                      </div>
                      <p className="text-[10px] text-[#555] italic truncate">Q: {entry.question}</p>
                      <p className="text-xs text-[#8888a8] italic truncate">"{entry.answer}"</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SCREEN: Finished
  // ══════════════════════════════════════════════════════════════════════════
  const sortedPlayers = [...gameState.turnOrder]
    .map(id => gameState.players[id])
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score) as BluffPlayer[]

  const winner = sortedPlayers[0]
  const isWinner = winner && user && winner.id === user.id

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-[#2a2a2a] bg-[linear-gradient(180deg,#171717_0%,#131313_100%)] p-8 shadow-[0_24px_55px_-48px_rgba(0,0,0,0.95)] text-center">
          <div className="text-6xl mb-2">{isWinner ? '🏆' : '🎭'}</div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#8888a8] mb-1">Game over</p>
          <h1 className="text-2xl font-bold text-white mb-1">
            {isWinner ? 'You won!' : `${winner?.name ?? '?'} wins!`}
          </h1>
          <p className="text-sm text-[#8888a8] mb-6">
            {sortedPlayers.length} players · {gameState.roundsPlayed} rounds played
          </p>

          {/* Podium */}
          <div className="space-y-2 mb-6 text-left">
            {sortedPlayers.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                  i === 0 ? 'border-amber-500/30 bg-amber-500/8' :
                  i === 1 ? 'border-[#2a2a2a] bg-[#111111]' :
                  i === 2 ? 'border-[#2a2a2a] bg-[#0f0f0f]' :
                  'border-[#1e1e1e] bg-transparent'
                }`}
              >
                <span className="text-lg w-6 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                <Avatar name={p.name} id={p.id} size="sm" />
                <p className="flex-1 text-sm font-medium text-white">{p.name}</p>
                <div className="text-right">
                  <p className="text-base font-bold text-white">{p.score}</p>
                  <p className="text-[10px] text-[#555]">pts</p>
                </div>
              </div>
            ))}
          </div>

          {/* Last round recap */}
          {gameState.lastReveal && (
            <div className="mb-6 rounded-2xl border border-[#2a2a2a] bg-[#111111] px-4 py-3 text-left">
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#6366f1] mb-1">Last round</p>
              <p className="text-xs text-[#8888a8] italic mb-0.5">"{gameState.lastReveal.question}"</p>
              <p className="text-sm text-white italic">"{gameState.lastReveal.answer}"</p>
              <p className={`mt-1 text-xs font-semibold ${gameState.lastReveal.wasBluff ? 'text-red-300' : 'text-emerald-300'}`}>
                {gameState.lastReveal.wasBluff ? '🎭 Was a bluff' : '✅ Was the truth'}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            {isHost && (
              <button
                onClick={() => { void rpcAction('reset_lobby') }}
                className="flex-1 rounded-2xl bg-[#6366f1] py-3 text-sm font-bold text-white transition hover:bg-[#4f46e5]"
              >
                Play again
              </button>
            )}
            <button
              onClick={() => navigate('/games')}
              className="flex-1 rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] py-3 text-sm font-medium text-[#8888a8] transition hover:text-white"
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
