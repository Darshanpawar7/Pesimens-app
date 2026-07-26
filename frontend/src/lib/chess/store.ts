import { create } from 'zustand'
import { Chess } from 'chess.js'
import { supabase } from '../supabase'
import { ApiError, apiFetch } from '../api'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type {
  ChessGameState,
  IChessStore,
  GameMode,
  ChessMoveRecord,
  MultiplayerInfo,
  FriendEntry,
  ChessNotificationType,
} from './types'

// ─── Activity event helper ────────────────────────────────────────────────────
export async function insertActivityEvent(message: string): Promise<void> {
  const { error } = await supabase.from('game_activity').insert({ message })
  if (error) {
    if (import.meta.env.DEV) {
      console.error('insertActivityEvent error:', error)
    }
  }
}

// ─── Chess stats helper ───────────────────────────────────────────────────────
export async function recordChessStats(outcome: 'win' | 'loss' | 'draw'): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Fetch existing stats row
  const { data: existing } = await supabase
    .from('chess_stats')
    .select('wins, losses, draws, games_played, win_streak, best_streak')
    .eq('user_id', user.id)
    .single()

  const prev = existing ?? { wins: 0, losses: 0, draws: 0, games_played: 0, win_streak: 0, best_streak: 0 }

  let wins = prev.wins
  let losses = prev.losses
  let draws = prev.draws
  let win_streak = prev.win_streak
  let best_streak = prev.best_streak

  if (outcome === 'win') {
    wins += 1
    win_streak += 1
    if (win_streak > best_streak) best_streak = win_streak
  } else if (outcome === 'loss') {
    losses += 1
    win_streak = 0
  } else {
    draws += 1
    win_streak = 0
  }

  const { error } = await supabase
    .from('chess_stats')
    .upsert(
      {
        user_id: user.id,
        wins,
        losses,
        draws,
        games_played: prev.games_played + 1,
        win_streak,
        best_streak,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    if (import.meta.env.DEV) {
      console.error('recordChessStats error:', error)
    }
  }
}

// ─── Initial State ────────────────────────────────────────────────────────────
const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
}

const CLOUD_EVAL_RATE_LIMIT_COOLDOWN_MS = 2 * 60 * 1000
const CLOUD_EVAL_NOT_FOUND_COOLDOWN_MS = 10 * 60 * 1000

// Shared runtime guards so we don't spam cloud-eval when backend route is
// unavailable or rate-limited.
let cloudEvalBackoffUntil = 0

function evaluateBoardForBlack(chess: Chess): number {
  const board = chess.board()
  let score = 0

  for (const row of board) {
    for (const piece of row) {
      if (!piece) continue
      const value = PIECE_VALUES[piece.type] ?? 0
      score += piece.color === 'b' ? value : -value
    }
  }

  return score
}

function pickBestFallbackMove(chess: Chess, difficulty: 'easy' | 'medium' | 'hard') {
  const legalMoves = chess.moves({ verbose: true }) as Array<{
    from: string
    to: string
    promotion?: string
    captured?: string
  }>

  if (legalMoves.length === 0) return null
  if (difficulty === 'easy') {
    return legalMoves[Math.floor(Math.random() * legalMoves.length)]
  }

  let bestMove = legalMoves[0]
  let bestScore = Number.NEGATIVE_INFINITY

  for (const move of legalMoves) {
    chess.move(move as any)

    let score = evaluateBoardForBlack(chess)

    if (chess.isCheckmate()) {
      score += 100000
    } else {
      if (chess.isCheck()) score += 25
      if (move.captured) score += (PIECE_VALUES[move.captured] ?? 0) * 0.35

      // On hard mode, add a cheap one-ply lookahead (opponent best reply).
      if (difficulty === 'hard') {
        const opponentMoves = chess.moves({ verbose: true }) as Array<{ from: string; to: string }>
        if (opponentMoves.length > 0) {
          let worstReplyScore = Number.POSITIVE_INFINITY
          for (const reply of opponentMoves) {
            chess.move(reply as any)
            const replyScore = chess.isCheckmate() ? -100000 : evaluateBoardForBlack(chess)
            if (replyScore < worstReplyScore) worstReplyScore = replyScore
            chess.undo()
          }
          score = worstReplyScore
        }
      }
    }

    chess.undo()

    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
  }

  return bestMove
}

const initialState: ChessGameState & { friends: FriendEntry[] } = {
  phase: 'home',
  mode: 'passAndPlay',
  fen: STARTING_FEN,
  turn: 'w',
  selectedSquare: null,
  legalMoves: [],
  lastMove: null,
  inCheck: false,
  isGameOver: false,
  result: null,
  moveHistory: [],
  promotionPending: null,
  multiplayer: null,
  error: null,
  rematchRequestedByOpponent: false,
  onlineUsers: [],
  opponentDisconnected: false,
  aiDifficulty: null,
  rematchCountdown: null,
  rematchIntervalId: null,
  friends: [],
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useChessStore = create<IChessStore>((set, get) => {
  // Create the Chess instance as the single source of truth
  let chess = new Chess()

  // Presence channel reference for cleanup
  let presenceChannel: RealtimeChannel | null = null

  return {
    ...initialState,

    // ── Initialize game ───────────────────────────────────────────────────────
    initGame: (mode: GameMode, aiDifficulty: 'easy' | 'medium' | 'hard' = 'medium') => {
      chess = new Chess() // Reset to starting position
      set({
        ...initialState,
        mode,
        phase: 'playing',
        fen: chess.fen(),
        turn: chess.turn(),
        inCheck: chess.isCheck(),
        isGameOver: chess.isGameOver(),
        aiDifficulty: mode === 'ai' ? aiDifficulty : null,
      })
    },

    // ── Select square ─────────────────────────────────────────────────────────
    selectSquare: (square: string) => {
      const state = get()
      const { selectedSquare, turn, phase, mode } = state
      
      if (phase !== 'playing') return
      if (mode === 'spectator') return
      if (state.promotionPending) return
      // Block human interaction when it's AI's turn (AI plays Black)
      if (mode === 'ai' && turn === 'b') return

      // Get the piece on the clicked square
      const piece = chess.get(square as any)

      // If clicking the same square, deselect
      if (selectedSquare === square) {
        set({ selectedSquare: null, legalMoves: [] })
        return
      }

      // If there's a selected square and this is a legal move destination
      if (selectedSquare && state.legalMoves.includes(square)) {
        state.executeMove(selectedSquare, square)
        return
      }

      // If clicking a piece of the active player, select it
      if (piece && piece.color === turn) {
        const moves = chess.moves({ square: square as any, verbose: true })
        const legalMoves = moves.map((m) => m.to)
        set({ selectedSquare: square, legalMoves })
      } else {
        // Clicking empty square or opponent piece - deselect
        set({ selectedSquare: null, legalMoves: [] })
      }
    },

    // ── Execute move ──────────────────────────────────────────────────────────
    executeMove: (from: string, to: string, promotion?: string, isAi: boolean = false) => {
      const state = get()
      
      if (state.phase !== 'playing') return
      if (state.mode === 'spectator') return

      // In multiplayer mode, block moves when it's not this player's turn
      if (state.mode === 'multiplayer' && state.multiplayer) {
        if (state.multiplayer.myColour !== state.turn) return
      }

      // In AI mode, block human from moving when it's AI's turn (AI plays Black).
      // Allow programmatic AI moves by passing `isAi = true`.
      if (state.mode === 'ai' && state.turn === 'b' && !isAi) return

      // Check if this is a pawn promotion move
      const piece = chess.get(from as any)
      const isPromotion =
        piece &&
        piece.type === 'p' &&
        ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'))

      // If promotion is needed but not provided, set promotionPending
      if (isPromotion && !promotion) {
        set({ promotionPending: { from, to }, selectedSquare: null, legalMoves: [] })
        return
      }

      // Capture pre-move FEN for potential rollback on Supabase failure
      const preMovefen = chess.fen()

      // Attempt the move
      try {
        const moveResult = chess.move({
          from: from as any,
          to: to as any,
          promotion: promotion as any,
        })

        if (!moveResult) {
          // Invalid move - do nothing (no-op per design spec)
          return
        }

        // Move succeeded - update state
        const moveRecord: ChessMoveRecord = {
          from,
          to,
          san: moveResult.san,
          promotion,
        }

        const newMoveHistory = [...state.moveHistory, moveRecord]
        const isGameOver = chess.isGameOver()
        let result = null

        if (isGameOver) {
          if (chess.isCheckmate()) {
            // The player who just moved wins
            result = chess.turn() === 'w' ? 'black' : 'white'
            const winnerName = result === 'white' ? 'White' : 'Black'
            void insertActivityEvent(`♟️ ${winnerName} wins by checkmate!`)
          } else {
            // Stalemate or draw
            result = 'draw'
            void insertActivityEvent('🤝 Game ended in a draw!')
          }

          // Record stats for multiplayer games
          if (state.mode === 'multiplayer' && state.multiplayer) {
            const myColour = state.multiplayer.myColour
            let outcome: 'win' | 'loss' | 'draw'
            if (result === 'draw') {
              outcome = 'draw'
            } else if (
              (result === 'white' && myColour === 'w') ||
              (result === 'black' && myColour === 'b')
            ) {
              outcome = 'win'
            } else {
              outcome = 'loss'
            }
            void recordChessStats(outcome)
          }
        }

        const newFen = chess.fen()

        set({
          fen: newFen,
          turn: chess.turn(),
          selectedSquare: null,
          legalMoves: [],
          lastMove: { from, to },
          inCheck: chess.isCheck(),
          isGameOver,
          result: result as any,
          moveHistory: newMoveHistory,
          promotionPending: null,
          phase: isGameOver ? 'finished' : 'playing',
          error: null,
        })

        // In AI mode, trigger AI response after human move (AI plays Black)
        if (state.mode === 'ai' && !isGameOver && chess.turn() === 'b') {
          setTimeout(() => get().triggerAiMove(), 100)
        }

        // In multiplayer mode, sync to Supabase — roll back on failure
        // (MultiplayerLobby handles the actual sync; this path is for direct store callers)
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Move execution error:', error)
        }
        // Roll back chess instance to pre-move state
        try { chess.load(preMovefen) } catch { /* ignore */ }
        set({ error: 'Invalid move' })
      }
    },

    // ── Cancel promotion ──────────────────────────────────────────────────────
    // Called when the promotion UI is dismissed without a selection (Escape / backdrop click)
    cancelPromotion: () => {
      set({ promotionPending: null, selectedSquare: null, legalMoves: [] })
    },

    // ── Trigger AI move ───────────────────────────────────────────────────────
    triggerAiMove: async () => {
      const state = get()
      if (state.mode !== 'ai' || state.phase !== 'playing' || state.turn !== 'b') return

      const difficulty = state.aiDifficulty ?? 'medium'
      const fen = state.fen

      // Add a small delay to feel natural
      await new Promise((r) => setTimeout(r, 500))

      // Re-check state after delay (game may have ended or mode changed)
      const currentState = get()
      if (currentState.mode !== 'ai' || currentState.phase !== 'playing' || currentState.turn !== 'b') return

      const moves = chess.moves({ verbose: true })
      if (moves.length === 0) return

      // Keep a local non-random fallback for medium/hard so play quality does
      // not collapse when cloud-eval is unavailable.
      const fallbackMove = pickBestFallbackMove(chess, difficulty)
  ?? moves[Math.floor(Math.random() * moves.length)]

let from: string = fallbackMove.from
let to: string = fallbackMove.to
let promotion: string | undefined = fallbackMove.promotion

// Map difficulty to Stockfish search depth
const depthMap: Record<string, number> = { easy: 3, medium: 8, hard: 15 }
const searchDepth = depthMap[difficulty] ?? 8

// Try Stockfish WASM worker first
const stockfishMoveResult = await new Promise<string | null>((resolve) => {
  try {
    const worker = new Worker(
      new URL('../workers/stockfish.worker.ts', import.meta.url),
      { type: 'module' }
    )
    const timeout = setTimeout(() => {
      worker.terminate()
      resolve(null)
    }, 5000)

    worker.postMessage({ type: 'init' })
    worker.postMessage({ type: 'getMove', fen, depth: searchDepth })

    worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'move') {
        clearTimeout(timeout)
        worker.terminate()
        resolve(e.data.move)
      } else if (e.data.type === 'error') {
        clearTimeout(timeout)
        worker.terminate()
        resolve(null)
      }
    }

    worker.onerror = () => {
      clearTimeout(timeout)
      worker.terminate()
      resolve(null)
    }
  } catch {
    resolve(null)
  }
})

if (stockfishMoveResult && stockfishMoveResult.length >= 4) {
  from = stockfishMoveResult.slice(0, 2)
  to = stockfishMoveResult.slice(2, 4)
  promotion = stockfishMoveResult[4] || undefined
} else {
  // Stockfish failed — try Lichess cloud eval on medium/hard
  const useApi =
    difficulty === 'hard' ||
    (difficulty === 'medium' && Math.random() < 0.6)

  const now = Date.now()
  const canUseApiNow = now >= cloudEvalBackoffUntil

  if (useApi && canUseApiNow) {
    try {
      const response = await apiFetch<{ ok: boolean; data?: any }>(
        `/api/chess/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=1`
      )
      const data = response?.data
      if (data) {
        const movesStr: string | undefined = data?.pvs?.[0]?.moves
        if (movesStr) {
          const firstMove = movesStr.split(' ')[0]
          if (firstMove && firstMove.length >= 4) {
            from = firstMove.slice(0, 2)
            to = firstMove.slice(2, 4)
            promotion = firstMove[4] || undefined
          }
        }
      }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 429) {
          cloudEvalBackoffUntil = Date.now() + CLOUD_EVAL_RATE_LIMIT_COOLDOWN_MS
        } else if (error.status === 404) {
          cloudEvalBackoffUntil = Date.now() + CLOUD_EVAL_NOT_FOUND_COOLDOWN_MS
        }
      }
    }
  }
}

get().executeMove(from, to, promotion, true)
    },

    // ── Reset game ────────────────────────────────────────────────────────────
    resetGame: () => {
      chess = new Chess()
      set({
        ...initialState,
        fen: chess.fen(),
        turn: chess.turn(),
        inCheck: chess.isCheck(),
        isGameOver: chess.isGameOver(),
      })
    },

    // ── Rematch (multiplayer) ─────────────────────────────────────────────────
    // Resets the board but preserves multiplayer info (same players, same colors)
    rematch: () => {
      chess = new Chess()
      const { multiplayer, mode } = get()
      set({
        ...initialState,
        mode,
        multiplayer,
        phase: 'playing',
        fen: chess.fen(),
        turn: chess.turn(),
        inCheck: chess.isCheck(),
        isGameOver: chess.isGameOver(),
      })
    },

    // ── Request rematch (multiplayer) ─────────────────────────────────────────
    // Sets rematchRequested flag in Supabase game_state; opponent sees the prompt
    requestRematch: async () => {
      const { mode, multiplayer, fen, moveHistory, result } = get()
      if (mode !== 'multiplayer' || !multiplayer) return

      try {
        await supabase
          .from('game_sessions')
          .update({
            game_state: {
              fen,
              moveHistory,
              result: result ?? null,
              rematchRequested: true,
            },
          })
          .eq('id', multiplayer.sessionId)
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('requestRematch error:', err)
        }
        set({ error: 'Failed to request rematch' })
      }
    },

    // ── Accept rematch (multiplayer) ──────────────────────────────────────────
    // Resets game_state in Supabase to starting position; both players restart
    acceptRematch: async () => {
      const { mode, multiplayer } = get()
      if (mode !== 'multiplayer' || !multiplayer) return

      chess = new Chess()
      const startingFen = chess.fen()

      try {
        await supabase
          .from('game_sessions')
          .update({
            game_state: {
              fen: startingFen,
              moveHistory: [],
              result: null,
              rematchRequested: false,
            },
          })
          .eq('id', multiplayer.sessionId)

        // Reset local state immediately for the accepting player — countdown will start
        set({
          phase: 'finished',
          fen: startingFen,
          turn: chess.turn(),
          inCheck: chess.isCheck(),
          isGameOver: chess.isGameOver(),
          result: null,
          moveHistory: [],
          lastMove: null,
          selectedSquare: null,
          legalMoves: [],
          promotionPending: null,
          error: null,
          rematchRequestedByOpponent: false,
        })
        get().startRematchCountdown()
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('acceptRematch error:', err)
        }
        set({ error: 'Failed to accept rematch' })
      }
    },

    // ── Start rematch countdown ───────────────────────────────────────────────
    // Counts down 3-2-1-0 ("Go!") then calls rematch() to start the game
    startRematchCountdown: () => {
      // Clear any existing countdown interval to prevent memory leaks
      const state = get()
      if (state.rematchIntervalId) {
        clearInterval(state.rematchIntervalId)
      }
      
      set({ rematchCountdown: 3 })
      let count = 3
      const interval = setInterval(() => {
        count -= 1
        if (count >= 0) {
          set({ rematchCountdown: count })
        } else {
          clearInterval(interval)
          set({ rematchCountdown: null, rematchIntervalId: null })
          get().rematch()
        }
      }, 1000)
      
      // Store interval ID for cleanup
      set({ rematchIntervalId: interval })
    },

    // ── Cancel rematch countdown ──────────────────────────────────────────────
    // Cleanup method to cancel countdown and prevent memory leaks
    cancelRematchCountdown: () => {
      const state = get()
      if (state.rematchIntervalId) {
        clearInterval(state.rematchIntervalId)
        set({ rematchCountdown: null, rematchIntervalId: null })
      }
    },

    // ── Load from FEN ─────────────────────────────────────────────────────────
    loadFromFen: (fen: string) => {
      try {
        chess.load(fen)
        set({
          fen: chess.fen(),
          turn: chess.turn(),
          inCheck: chess.isCheck(),
          isGameOver: chess.isGameOver(),
          selectedSquare: null,
          legalMoves: [],
          lastMove: null,
          moveHistory: [],
          result: null,
          error: null,
        })
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to load FEN:', error)
        }
        set({ error: 'Invalid FEN string' })
      }
    },

    // ── Set multiplayer info ──────────────────────────────────────────────────
    setMultiplayerInfo: (info: MultiplayerInfo) => {
      set({ multiplayer: info })
    },

    // ── Apply remote move ─────────────────────────────────────────────────────
    applyRemoteMove: (fen: string, move: ChessMoveRecord) => {
      try {
        chess.load(fen)
        const state = get()
        const newMoveHistory = [...state.moveHistory, move]
        const isGameOver = chess.isGameOver()
        let result = null

        if (isGameOver) {
          if (chess.isCheckmate()) {
            result = chess.turn() === 'w' ? 'black' : 'white'
            const winnerName = result === 'white' ? 'White' : 'Black'
            void insertActivityEvent(`♟️ ${winnerName} wins by checkmate!`)
          } else {
            result = 'draw'
            void insertActivityEvent('🤝 Game ended in a draw!')
          }

          // Record stats for the local player
          if (state.mode === 'multiplayer' && state.multiplayer) {
            const myColour = state.multiplayer.myColour
            let outcome: 'win' | 'loss' | 'draw'
            if (result === 'draw') {
              outcome = 'draw'
            } else if (
              (result === 'white' && myColour === 'w') ||
              (result === 'black' && myColour === 'b')
            ) {
              outcome = 'win'
            } else {
              outcome = 'loss'
            }
            void recordChessStats(outcome)
          }
        }

        set({
          fen: chess.fen(),
          turn: chess.turn(),
          lastMove: { from: move.from, to: move.to },
          inCheck: chess.isCheck(),
          isGameOver,
          result: result as any,
          moveHistory: newMoveHistory,
          phase: isGameOver ? 'finished' : 'playing',
          selectedSquare: null,
          legalMoves: [],
        })
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to apply remote move:', error)
        }
        set({ error: 'Failed to sync game state' })
      }
    },

    // ── Apply remote game state (rematch detection) ───────────────────────────
    applyRemoteGameState: (gameState: { fen?: string; moveHistory?: ChessMoveRecord[]; result?: any; rematchRequested?: boolean }) => {
      const state = get()

      // Detect rematch request from opponent
      if (gameState.rematchRequested === true) {
        set({ rematchRequestedByOpponent: true })
        return
      }

      // Detect rematch accepted: rematchRequested cleared + starting FEN + empty history
      if (
        gameState.rematchRequested === false &&
        gameState.fen === STARTING_FEN &&
        Array.isArray(gameState.moveHistory) &&
        gameState.moveHistory.length === 0 &&
        state.phase === 'finished'
      ) {
        chess = new Chess()
        set({
          phase: 'finished',
          fen: chess.fen(),
          turn: chess.turn(),
          inCheck: chess.isCheck(),
          isGameOver: chess.isGameOver(),
          result: null,
          moveHistory: [],
          lastMove: null,
          selectedSquare: null,
          legalMoves: [],
          promotionPending: null,
          error: null,
          rematchRequestedByOpponent: false,
        })
        get().startRematchCountdown()
        return
      }

      // Normal move sync — validate FEN before applying
      if (gameState.fen && gameState.moveHistory) {
        // Validate the incoming FEN; reset to starting position if invalid
        try {
          const testChess = new Chess()
          testChess.load(gameState.fen)
        } catch (fenErr) {
          if (import.meta.env.DEV) {
            console.error('Invalid FEN in game_state, resetting to starting position:', fenErr)
          }
          chess = new Chess()
          set({
            fen: chess.fen(),
            turn: chess.turn(),
            inCheck: chess.isCheck(),
            isGameOver: chess.isGameOver(),
            moveHistory: [],
            lastMove: null,
            selectedSquare: null,
            legalMoves: [],
            error: 'Invalid game state received — board reset to starting position',
          })
          return
        }

        const remoteHistory = gameState.moveHistory
        const localHistory = state.moveHistory
        if (remoteHistory.length > localHistory.length) {
          const latestMove = remoteHistory[remoteHistory.length - 1]
          get().applyRemoteMove(gameState.fen, latestMove)
        }
      }
    },

    // ── Start spectating ──────────────────────────────────────────────────────
    startSpectating: (sessionId: string, roomCode: string, fen?: string) => {
      const startFen = fen ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      try {
        chess.load(startFen)
      } catch {
        chess = new Chess()
      }
      set({
        ...initialState,
        mode: 'spectator',
        phase: 'playing',
        fen: chess.fen(),
        turn: chess.turn(),
        inCheck: chess.isCheck(),
        isGameOver: chess.isGameOver(),
        multiplayer: {
          sessionId,
          roomCode,
          myColour: 'w', // spectators don't have a colour; use 'w' as placeholder
          opponentName: '',
        },
      })
    },

    // ── Friends ───────────────────────────────────────────────────────────────
    loadFriends: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('friends')
        .select('user_id, friend_id')
        .eq('status', 'accepted')

      if (error || !data) return

      const friendIds = data.map((row) =>
        row.user_id === user.id ? row.friend_id : row.user_id
      )

      if (friendIds.length === 0) {
        set({ friends: [] })
        return
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', friendIds)

      const nameMap: Record<string, string> = {}
      if (profiles) {
        for (const p of profiles) {
          nameMap[p.id] = p.display_name ?? 'Unknown'
        }
      }

      const friends: FriendEntry[] = friendIds.map((id) => ({
        id,
        name: nameMap[id] ?? 'Unknown',
        isOnline: false,
      }))

      set({ friends })
    },

    sendFriendRequest: async (friendId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('friends')
        .insert({ user_id: user.id, friend_id: friendId, status: 'pending' })

      if (error) {
        if (import.meta.env.DEV) {
          console.error('sendFriendRequest error:', error)
        }
        set({ error: 'Failed to send friend request' })
      }
    },

    // ── Send game invite ──────────────────────────────────────────────────────
    sendGameInvite: async (friendId: string, roomCode: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch sender's display name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

      const fromUserName = profile?.display_name ?? 'Someone'

      // Broadcast invite to the friend's personal channel
      const channel = supabase.channel(`game-invites:${friendId}`)
      await channel.subscribe()
      await channel.send({
        type: 'broadcast',
        event: 'game-invite',
        payload: {
          roomCode,
          fromUserId: user.id,
          fromUserName,
          gameType: 'chess',
          createdAt: new Date().toISOString(),
        },
      })
      supabase.removeChannel(channel)
    },

    acceptFriendRequest: async (friendId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('user_id', friendId)
        .eq('friend_id', user.id)

      if (error) {
        if (import.meta.env.DEV) {
          console.error('acceptFriendRequest error:', error)
        }
        set({ error: 'Failed to accept friend request' })
        return
      }

      // Reload friends list after accepting
      await get().loadFriends()
    },

    // ── Presence ──────────────────────────────────────────────────────────────
    initPresence: (userId: string) => {
      // Clean up any existing presence channel first
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel)
        presenceChannel = null
      }

      presenceChannel = supabase.channel('online-users', {
        config: { presence: { key: userId } },
      })

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          if (!presenceChannel) return
          const state = presenceChannel.presenceState()
          const ids = Object.keys(state)
          set({ onlineUsers: ids })
        })
        .on('presence', { event: 'join' }, ({ key }) => {
          set((s) => ({
            onlineUsers: s.onlineUsers.includes(key)
              ? s.onlineUsers
              : [...s.onlineUsers, key],
          }))
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          set((s) => ({ onlineUsers: s.onlineUsers.filter((id) => id !== key) }))
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && presenceChannel) {
            await presenceChannel.track({
              user_id: userId,
              last_seen: new Date().toISOString(),
            })
          }
        })
    },

    cleanupPresence: () => {
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel)
        presenceChannel = null
      }
      set({ onlineUsers: [] })
    },

    // ── Opponent disconnect handling ──────────────────────────────────────────
    setOpponentDisconnected: (value: boolean) => {
      set({ opponentDisconnected: value })
    },

    // Claim win when opponent disconnects mid-game
    claimWinOnDisconnect: () => {
      const { multiplayer } = get()
      if (!multiplayer) return
      const myColour = multiplayer.myColour
      const result = myColour === 'w' ? 'white' : 'black'
      set({
        phase: 'finished',
        isGameOver: true,
        result: result as any,
        opponentDisconnected: false,
      })
    },

    // ── Send notification ─────────────────────────────────────────────────────
    // Broadcasts a chess notification to a specific user via their personal channel
    sendNotification: async (userId: string, type: ChessNotificationType, title: string, message: string, roomCode?: string) => {
      const channel = supabase.channel(`chess-notifications:${userId}`)
      // Must await subscribe() before send() — sending while SUBSCRIBING silently fails
      await channel.subscribe()
      await channel.send({
        type: 'broadcast',
        event: 'chess-notification',
        payload: {
          id: crypto.randomUUID(),
          type,
          title,
          message,
          roomCode,
          createdAt: new Date().toISOString(),
        },
      })
      supabase.removeChannel(channel)
    },
  }
})
