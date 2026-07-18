import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameSession, type GameSession } from '@/hooks/useGameSession'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/use-toast'
import { DrawCanvas } from '@/components/games/drawl/DrawCanvas'
import { GuessChat } from '@/components/games/drawl/GuessChat'
import { PlayerList } from '@/components/games/drawl/PlayerList'
import { RoundTimer } from '@/components/games/drawl/RoundTimer'
import { WordPicker } from '@/components/games/drawl/WordPicker'
import { pickWordChoices } from '@/data/drawlWords'
import {
  MIN_PLAYERS,
  MAX_PLAYERS,
  ROUND_DURATION_SECONDS,
  WORD_PICK_TIMEOUT_SECONDS,
  ROUND_END_PAUSE_SECONDS,
  HINT_REVEAL_INTERVAL_SECONDS,
} from '@/lib/drawl/constants'
import type {
  DrawlGameState,
  DrawlPlayer,
  Stroke,
  ChatMessage,
} from '@/lib/drawl/types'
 
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
 
function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}
 
function Avatar({ name, id, size = 'md' }: { name: string; id: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'h-7 w-7 text-[10px]' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-9 w-9 text-xs'
  return (
    <div className={`${sz} shrink-0 rounded-full bg-gradient-to-br ${avatarColor(id)} flex items-center justify-center font-bold text-white shadow-lg`}>
      {getInitials(name)}
    </div>
  )
}
 
const EMPTY_STATE: DrawlGameState = {
  phase: 'lobby',
  locked: false,
  turnOrder: [],
  currentDrawerIndex: 0,
  players: {},
  currentWord: null,
  wordChoices: null,
  strokes: [],
  roundStartedAt: null,
  roundDuration: ROUND_DURATION_SECONDS,
  correctGuessers: [],
  chatMessages: [],
  roundHistory: [],
}
 
function buildStateFromSession(session: GameSession | null): DrawlGameState {
  if (!session) return EMPTY_STATE
  const raw = (session.game_state || {}) as Partial<DrawlGameState>
  const fallback = (session.players || []).map((p) => ({
    id: p.id,
    name: p.display_name || 'Anonymous',
    score: 0,
    hasGuessedThisRound: false,
  }))
  const players =
    raw.players && typeof raw.players === 'object' && !Array.isArray(raw.players) && Object.keys(raw.players).length > 0
      ? raw.players
      : Object.fromEntries(fallback.map((p) => [p.id, p]))
  const turnOrder = Array.isArray(raw.turnOrder) && raw.turnOrder.length > 0 ? raw.turnOrder : fallback.map((p) => p.id)
  const strokes = Array.isArray(raw.strokes) ? raw.strokes : []
  const chatMessages = Array.isArray(raw.chatMessages) ? raw.chatMessages : []
  const roundHistory = Array.isArray(raw.roundHistory) ? raw.roundHistory : []
  const correctGuessers = Array.isArray(raw.correctGuessers) ? raw.correctGuessers : []
  return {
    phase: raw.phase ?? 'lobby',
    locked: raw.locked ?? false,
    turnOrder,
    currentDrawerIndex: raw.currentDrawerIndex ?? 0,
    players,
    currentWord: raw.currentWord ?? null,
    wordChoices: raw.wordChoices ?? null,
    strokes,
    roundStartedAt: raw.roundStartedAt ?? null,
    roundDuration: raw.roundDuration ?? ROUND_DURATION_SECONDS,
    correctGuessers,
    chatMessages,
    roundHistory,
  }
}
 
function buildWordHint(word: string, revealedIndices: number[]): string {
  return word
    .split('')
    .map((char, i) => {
      if (char === ' ') return ' '
      if (revealedIndices.includes(i)) return char
      return '_'
    })
    .join(' ')
}
 
function getRevealedIndices(word: string, elapsed: number): number[] {
  const revealed: number[] = []
  const letterIndices = word.split('').map((c, i) => (c !== ' ' ? i : -1)).filter((i) => i !== -1)
  const hints = Math.floor(elapsed / HINT_REVEAL_INTERVAL_SECONDS)
  for (let h = 0; h < hints && h < letterIndices.length; h++) {
    revealed.push(letterIndices[h])
  }
  return revealed
}
 
export default function PESDrawlPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { session, loading, error, createRoom, joinRoom, subscribeToGame, updateGameState, leaveRoom } = useGameSession()
 
  const [liveSession, setLiveSession] = useState<GameSession | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()
  const [elapsed, setElapsed] = useState(0)
  const [roundEndCountdown, setRoundEndCountdown] = useState<number | null>(null)
  const initRef = useRef<string | null>(null)
  const elapsedRef = useRef(0)
 
  useEffect(() => { if (session) setLiveSession(session) }, [session])
 
  const roomCode = liveSession?.room_code ?? ''
  const gameState = useMemo(() => buildStateFromSession(liveSession), [liveSession])
 
  useEffect(() => {
    if (!roomCode) return
    return subscribeToGame(roomCode, setLiveSession)
  }, [roomCode, subscribeToGame])
 
  useEffect(() => {
    if (!liveSession || !user) return
    if (liveSession.host_id !== user.id) return
    if (Object.keys(liveSession.game_state || {}).length > 0) return
    if (initRef.current === liveSession.id) return
    initRef.current = liveSession.id
    void pushState({ ...EMPTY_STATE, players: buildStateFromSession(liveSession).players })
  }, [liveSession, user])
 
  useEffect(() => {
    if (gameState.phase !== 'drawing' || !gameState.roundStartedAt) {
      setElapsed(0)
      elapsedRef.current = 0
      return
    }
    const interval = setInterval(() => {
      const e = Math.floor((Date.now() - gameState.roundStartedAt!) / 1000)
      setElapsed(e)
      elapsedRef.current = e
    }, 1000)
    return () => clearInterval(interval)
  }, [gameState.phase, gameState.roundStartedAt])
 
  useEffect(() => {
    if (gameState.phase !== 'word_select' || !isHost) return
    const timeout = setTimeout(() => {
      const choices = gameState.wordChoices ?? pickWordChoices()
      void handleWordPicked(choices[Math.floor(Math.random() * choices.length)])
    }, WORD_PICK_TIMEOUT_SECONDS * 1000)
    return () => clearTimeout(timeout)
  }, [gameState.phase, gameState.wordChoices])
 
  useEffect(() => {
    if (gameState.phase !== 'round_end') {
      setRoundEndCountdown(null)
      return
    }
    setRoundEndCountdown(ROUND_END_PAUSE_SECONDS)
    const interval = setInterval(() => {
      setRoundEndCountdown((c) => {
        if (c === null || c <= 1) {
          clearInterval(interval)
          return null
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [gameState.phase])
 
  useEffect(() => {
    if (gameState.phase !== 'round_end' || !isHost || roundEndCountdown !== null) return
    void advanceRound()
  }, [roundEndCountdown, gameState.phase])
 
  const isHost = Boolean(liveSession && user && liveSession.host_id === user.id)
  const currentDrawerId = gameState.turnOrder[gameState.currentDrawerIndex] ?? null
  const isDrawer = Boolean(user && user.id === currentDrawerId)
  const currentDrawer = currentDrawerId ? gameState.players[currentDrawerId] : null
  const lobbyPlayers = liveSession?.players ?? []
  const canStart = isHost && gameState.phase === 'lobby' && lobbyPlayers.length >= MIN_PLAYERS
 
  async function pushState(newState: DrawlGameState) {
    if (!liveSession) return
    setLocalError(null)
    try {
      await updateGameState(liveSession.id, newState as unknown as Record<string, unknown>)
      setLiveSession((cur) => cur ? { ...cur, game_state: newState as unknown as Record<string, unknown> } : cur)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Update failed')
    }
  }
 
  async function handleCreateRoom() {
    setLocalError(null)
    await createRoom('drawl', false)
  }
 
  async function handleJoinRoom() {
    const code = joinCode.trim().toUpperCase()
    if (code.length < 4) return
    await joinRoom(code)
    setJoinCode('')
  }
 
  async function handleStartGame() {
    const shuffled = [...lobbyPlayers].sort(() => Math.random() - 0.5).map((p) => p.id)
    const playersMap: Record<string, DrawlPlayer> = {}
    for (const p of lobbyPlayers) {
      playersMap[p.id] = { id: p.id, name: p.display_name || 'Anonymous', score: 0, hasGuessedThisRound: false }
    }
    const choices = pickWordChoices()
    await pushState({
      ...EMPTY_STATE,
      phase: 'word_select',
      turnOrder: shuffled,
      currentDrawerIndex: 0,
      players: playersMap,
      wordChoices: choices,
    })
  }
 
  async function handleWordPicked(word: string) {
    await pushState({
      ...gameState,
      phase: 'drawing',
      currentWord: word,
      wordChoices: null,
      roundStartedAt: Date.now(),
      roundDuration: ROUND_DURATION_SECONDS,
      strokes: [],
      correctGuessers: [],
    })
  }
 
  async function handleStrokeComplete(stroke: Stroke) {
    await pushState({ ...gameState, strokes: [...gameState.strokes, stroke] })
  }
 
  async function handleClear() {
    await pushState({ ...gameState, strokes: [] })
  }
 
  async function handleGuess(text: string) {
    if (!user || !liveSession) return
    const player = gameState.players[user.id]
    if (!player) return
    if (gameState.correctGuessers.includes(user.id)) return
 
    const isCorrect = gameState.currentWord
      ? text.trim().toLowerCase() === gameState.currentWord.toLowerCase()
      : false
 
    const message: ChatMessage = {
      playerId: user.id,
      playerName: player.name,
      text,
      isCorrectGuess: isCorrect,
      timestamp: Date.now(),
    }
 
    let newState = {
      ...gameState,
      chatMessages: [...gameState.chatMessages, message],
    }
 
    if (isCorrect) {
      const timeMs = gameState.roundStartedAt ? Date.now() - gameState.roundStartedAt : 0
      const points = Math.max(10, 100 - Math.floor((timeMs / 1000 / gameState.roundDuration) * 100))
      newState = {
        ...newState,
        correctGuessers: [...gameState.correctGuessers, user.id],
        players: {
          ...newState.players,
          [user.id]: { ...player, score: player.score + points, hasGuessedThisRound: true },
        },
      }
 
      const allGuessers = gameState.turnOrder.filter((id) => id !== currentDrawerId)
      const allGuessed = allGuessers.every((id) => newState.correctGuessers.includes(id))
      if (allGuessed) {
        newState = await buildRoundEndState(newState)
      }
    }
 
    await pushState(newState)
  }
 
  async function handleTimerEnd() {
    if (!isHost || gameState.phase !== 'drawing') return
    const ended = await buildRoundEndState(gameState)
    await pushState(ended)
  }
 
  async function buildRoundEndState(state: DrawlGameState): Promise<DrawlGameState> {
    const drawer = currentDrawerId ? state.players[currentDrawerId] : null
    const drawerBonus = 10 * state.correctGuessers.length
    const guessers = state.turnOrder.filter((id) => id !== currentDrawerId)
    const updatedPlayers = { ...state.players }
 
    if (drawer && currentDrawerId) {
      updatedPlayers[currentDrawerId] = { ...drawer, score: drawer.score + drawerBonus }
    }
 
    if (state.correctGuessers.length === 0) {
      for (const id of guessers) {
        const p = updatedPlayers[id]
        if (p) updatedPlayers[id] = { ...p, score: Math.max(0, p.score - 5) }
      }
    }
 
    return {
      ...state,
      phase: 'round_end',
      players: updatedPlayers,
    }
  }
 
  async function advanceRound() {
    const nextIndex = gameState.currentDrawerIndex + 1
    const isFinished = nextIndex >= gameState.turnOrder.length
 
    if (isFinished) {
      await pushState({ ...gameState, phase: 'finished' })
      return
    }
 
    const resetPlayers: Record<string, DrawlPlayer> = {}
    for (const [id, p] of Object.entries(gameState.players)) {
      resetPlayers[id] = { ...p, hasGuessedThisRound: false }
    }
 
    await pushState({
      ...gameState,
      phase: 'word_select',
      currentDrawerIndex: nextIndex,
      players: resetPlayers,
      wordChoices: pickWordChoices(),
      strokes: [],
      correctGuessers: [],
      currentWord: null,
      roundStartedAt: null,
    })
  }
 
  async function handleLeave() {
    if (!liveSession) return
    await leaveRoom(liveSession.id)
    navigate('/games')
  }
 
  async function handlePlayAgain() {
    await pushState({ ...EMPTY_STATE, players: gameState.players })
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
 
  const revealedIndices = gameState.currentWord && gameState.roundStartedAt
    ? getRevealedIndices(gameState.currentWord, elapsed)
    : []
 
  const wordHint = gameState.currentWord
    ? buildWordHint(gameState.currentWord, revealedIndices)
    : ''
 
  if (!liveSession) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] px-4 pt-6 pb-28">
        <div className="mx-auto w-full max-w-sm">
          <div className="rounded-3xl border border-[#2a2a2a] bg-[linear-gradient(180deg,#171717_0%,#131313_100%)] overflow-hidden">
            <div className="px-5 pt-6 pb-4 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] text-2xl">
                🎨
              </div>
              <h1 className="text-xl font-bold text-white">PES Drawl</h1>
              <p className="mt-1 text-xs text-[#8888a8]">Draw. Guess. Laugh. PESU-style.</p>
            </div>
 
            <div className="px-4 pb-5 space-y-3">
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4 space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6366f1]">Create a room</p>
                <button
                  onClick={() => { void handleCreateRoom() }}
                  disabled={loading}
                  className="w-full rounded-2xl bg-[#6366f1] py-3 text-sm font-bold text-white transition hover:bg-[#4f46e5] active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Creating…
                    </span>
                  ) : '🎨 Create room'}
                </button>
              </div>
 
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4 space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#6366f1]">Join with a code</p>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="X X X X"
                  maxLength={6}
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
 
              {(error || localError) && (
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-center text-xs text-red-400">
                  {localError || error}
                </p>
              )}
 
              <button
                onClick={() => navigate('/games')}
                className="mt-2 w-full text-center text-xs text-[#555] hover:text-[#8888a8] transition"
              >
                ← Back to games
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
 
  if (gameState.phase === 'lobby') {
    return (
      <div className="min-h-screen bg-[#0f0f0f] p-4 md:p-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] text-xl">🎨</div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#8888a8]">PES Drawl · Lobby</p>
                <h1 className="text-lg font-bold text-white">
                  Room <span className="font-mono text-[#c7d2fe]">{roomCode}</span>
                </h1>
              </div>
            </div>
            <button
              onClick={() => { void copyRoomCode() }}
              className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5 text-xs font-medium text-[#cbd5e1] transition hover:bg-[#222] hover:text-white"
            >
              {copied ? '✓ Copied' : 'Copy code'}
            </button>
          </div>
 
          <div className="grid gap-4 md:grid-cols-[1fr_280px]">
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
                      <p className="text-[10px] text-[#8888a8]">
                        {player.id === liveSession.host_id ? '👑 Host' : `Player ${i + 1}`}
                      </p>
                    </div>
                  </div>
                ))}
                {lobbyPlayers.length < MIN_PLAYERS && (
                  <div className="rounded-2xl border border-dashed border-[#2a2a2a] px-3 py-3 text-center text-xs text-[#555]">
                    Waiting for {MIN_PLAYERS - lobbyPlayers.length} more player{MIN_PLAYERS - lobbyPlayers.length !== 1 ? 's' : ''}…
                  </div>
                )}
              </div>
            </div>
 
            <div className="space-y-3">
              <div className="rounded-3xl border border-[#2a2a2a] bg-[linear-gradient(180deg,#171717_0%,#131313_100%)] p-4">
                <h3 className="text-sm font-semibold text-white mb-2">How to play</h3>
                <ul className="space-y-1.5 text-xs text-[#8888a8]">
                  <li>🎨 One player draws each round</li>
                  <li>💬 Others type guesses in chat</li>
                  <li>⚡ Faster guesses = more points</li>
                  <li>🔤 Letter hints reveal over time</li>
                  <li>🏆 Most points after all rounds wins</li>
                </ul>
              </div>
 
              <div className="rounded-3xl border border-[#2a2a2a] bg-[linear-gradient(180deg,#171717_0%,#131313_100%)] p-4 space-y-2">
                {isHost ? (
                  <button
                    onClick={() => { void handleStartGame() }}
                    disabled={!canStart}
                    className="w-full rounded-2xl bg-[#6366f1] py-3 text-sm font-bold text-white transition hover:bg-[#4f46e5] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {canStart
                      ? '🚀 Start game'
                      : `Need ${MIN_PLAYERS - lobbyPlayers.length} more player${MIN_PLAYERS - lobbyPlayers.length !== 1 ? 's' : ''}`}
                  </button>
                ) : (
                  <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] px-3 py-3 text-center text-xs text-[#8888a8]">
                    ⏳ Waiting for host to start…
                  </div>
                )}
                <button
                  onClick={() => { void handleLeave() }}
                  className="w-full rounded-2xl border border-[#2a2a2a] bg-[#111111] py-2.5 text-sm font-medium text-[#8888a8] transition hover:text-[#cbd5e1]"
                >
                  Leave lobby
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
 
  if (gameState.phase === 'word_select') {
    const drawerName = currentDrawer?.name ?? '…'
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
        {isDrawer && gameState.wordChoices ? (
          <WordPicker
            open
            words={gameState.wordChoices as [string, string, string]}
            onPick={(word) => { void handleWordPicked(word) }}
          />
        ) : (
          <div className="text-center space-y-3">
            <div className="text-5xl animate-bounce">🎨</div>
            <p className="text-white text-lg font-semibold">{drawerName} is choosing a word…</p>
            <p className="text-[#8888a8] text-sm">Get ready to guess!</p>
          </div>
        )}
      </div>
    )
  }
 
  if (gameState.phase === 'drawing') {
    const guessMessages = gameState.chatMessages.map((m) => ({
      id: `${m.playerId}-${m.timestamp}`,
      player: m.playerName,
      text: m.text,
      correct: m.isCorrectGuess,
    }))
 
    const sortedPlayers = gameState.turnOrder.map((id) => gameState.players[id]).filter(Boolean).map((p) => ({
      id: p!.id,
      name: p!.name,
      score: p!.score,
      isDrawer: p!.id === currentDrawerId,
      isYou: p!.id === user?.id,
    }))
 
    const hasAlreadyGuessed = user ? gameState.correctGuessers.includes(user.id) : false
 
    return (
      <div className="min-h-screen bg-[#0f0f0f] p-3 md:p-5">
        <div className="mx-auto max-w-6xl space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎨</span>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#8888a8]">PES Drawl</p>
                <p className="text-xs text-white font-medium">
                  {isDrawer ? (
                    <span className="text-indigo-400">Draw: <span className="font-bold text-white">{gameState.currentWord}</span></span>
                  ) : (
                    <span className="font-mono tracking-widest text-white/80">{wordHint}</span>
                  )}
                </p>
              </div>
            </div>
            <RoundTimer
              duration={gameState.roundDuration}
              startedAt={gameState.roundStartedAt ?? Date.now()}
              onEnd={() => { void handleTimerEnd() }}
            />
          </div>
 
          <div className="grid gap-3 md:grid-cols-[200px_1fr_240px]">
            <PlayerList players={sortedPlayers} />
 
            <DrawCanvas
              readOnly={!isDrawer}
              strokes={gameState.strokes}
              onStrokeComplete={(stroke) => { void handleStrokeComplete(stroke) }}
              onClear={() => { void handleClear() }}
            />
 
            <GuessChat
              messages={guessMessages}
              onSend={(!isDrawer && !hasAlreadyGuessed) ? (text) => { void handleGuess(text) } : undefined}
              placeholder={
                isDrawer
                  ? 'You are drawing…'
                  : hasAlreadyGuessed
                  ? '✓ You guessed it!'
                  : 'Type your guess…'
              }
            />
          </div>
        </div>
      </div>
    )
  }
 
  if (gameState.phase === 'round_end') {
    const word = gameState.currentWord ?? '?'
    const drawer = currentDrawer
    const correctCount = gameState.correctGuessers.length
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-[#2a2a2a] bg-[linear-gradient(180deg,#171717_0%,#131313_100%)] p-8 text-center space-y-4">
          <div className="text-5xl">🎨</div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#8888a8]">Round over</p>
            <h2 className="text-2xl font-bold text-white mt-1">The word was</h2>
            <p className="text-3xl font-bold text-indigo-400 mt-1">{word}</p>
          </div>
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4 text-sm text-[#8888a8] space-y-1">
            <p>Drawn by <span className="text-white font-semibold">{drawer?.name ?? '?'}</span></p>
            <p><span className="text-emerald-400 font-semibold">{correctCount}</span> player{correctCount !== 1 ? 's' : ''} guessed correctly</p>
          </div>
          {roundEndCountdown !== null && (
            <p className="text-xs text-[#555]">Next round in {roundEndCountdown}s…</p>
          )}
        </div>
      </div>
    )
  }
 
  const sortedFinal = [...gameState.turnOrder]
    .map((id) => gameState.players[id])
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score) as DrawlPlayer[]
 
  const winner = sortedFinal[0]
  const isWinner = winner && user && winner.id === user.id
 
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-[#2a2a2a] bg-[linear-gradient(180deg,#171717_0%,#131313_100%)] p-8 text-center">
          <div className="text-6xl mb-2">{isWinner ? '🏆' : '🎨'}</div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#8888a8] mb-1">Game over</p>
          <h1 className="text-2xl font-bold text-white mb-1">
            {isWinner ? 'You won!' : `${winner?.name ?? '?'} wins!`}
          </h1>
          <p className="text-sm text-[#8888a8] mb-6">{sortedFinal.length} players</p>
 
          <div className="space-y-2 mb-6 text-left">
            {sortedFinal.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                  i === 0 ? 'border-amber-500/30 bg-amber-500/8' :
                  i === 1 ? 'border-[#2a2a2a] bg-[#111111]' :
                  i === 2 ? 'border-[#2a2a2a] bg-[#0f0f0f]' :
                  'border-[#1e1e1e] bg-transparent'
                }`}
              >
                <span className="text-lg w-6 text-center">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </span>
                <Avatar name={p.name} id={p.id} size="sm" />
                <p className="flex-1 text-sm font-medium text-white">{p.name}</p>
                <div className="text-right">
                  <p className="text-base font-bold text-white">{p.score}</p>
                  <p className="text-[10px] text-[#555]">pts</p>
                </div>
              </div>
            ))}
          </div>
 
          <div className="flex gap-2">
            {isHost && (
              <button
                onClick={() => { void handlePlayAgain() }}
                className="flex-1 rounded-2xl bg-[#6366f1] py-3 text-sm font-bold text-white transition hover:bg-[#4f46e5]"
              >
                Play again
              </button>
            )}
            <button
              onClick={() => { void handleLeave() }}
              className="flex-1 rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] py-3 text-sm font-medium text-[#8888a8] transition hover:text-white"
            >
              Leave
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
 
