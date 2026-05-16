import React, { useState, useEffect, useRef } from 'react'
import { useGameSession } from '../../../hooks/useGameSession'
import { useChessStore } from '../../../lib/chess/store'
import { useAuthStore } from '../../../store/auth'
import { supabase } from '../../../lib/supabase'
import { setupVisibilityAwareChannel } from '../../../lib/realtimeVisibility'
import { ErrorBanner } from './ErrorBanner'
import { trackChessEvent } from '../../../lib/chess/analytics'
import type { ChessMoveRecord } from '../../../lib/chess/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

// RoomCode charset per design spec (5-6 chars from this set)
const ROOM_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateRoomCode(length: 5 | 6 = 6): string {
  return Array.from(
    { length },
    () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
  ).join('')
}

// ── Matchmaking pure logic (exported for testing) ─────────────────────────────

export interface MatchmakingEntry {
  user_id: string
  joined_at: string
}

/**
 * Given two matchmaking entries, determine which player creates the room
 * (the one with the lower joined_at timestamp) and assign colours randomly.
 * Returns { creatorId, joinerColour } where creatorId is the room creator.
 */
export function pairMatchmakingPlayers(
  p1: MatchmakingEntry,
  p2: MatchmakingEntry
): { firstPlayerId: string; secondPlayerId: string; firstPlayerColour: 'w' | 'b' } {
  // First player = lower joined_at (earlier timestamp)
  const [first, second] =
    p1.joined_at <= p2.joined_at ? [p1, p2] : [p2, p1]

  // Randomly assign colours
  const firstPlayerColour: 'w' | 'b' = Math.random() < 0.5 ? 'w' : 'b'

  return {
    firstPlayerId: first.user_id,
    secondPlayerId: second.user_id,
    firstPlayerColour,
  }
}

/**
 * Assign a colour to a specific player given the pairing result.
 */
export function getPlayerColour(
  userId: string,
  pairing: ReturnType<typeof pairMatchmakingPlayers>
): 'w' | 'b' {
  if (userId === pairing.firstPlayerId) return pairing.firstPlayerColour
  return pairing.firstPlayerColour === 'w' ? 'b' : 'w'
}

// Matchmaking timeout in milliseconds
const MATCHMAKING_TIMEOUT_MS = 60_000

// ── BottomSheet wrapper (mobile) / centered card (desktop) ───────────────────
function BottomSheetOrCard({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 479px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  if (!isMobile) {
    return <div style={styles.card}>{children}</div>
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        style={{
          background: '#1a1a1a',
          borderRadius: '16px 16px 0 0',
          paddingTop: 24,
          paddingLeft: 20,
          paddingRight: 20,
          // Respect iOS home indicator
          paddingBottom: 'max(40px, env(safe-area-inset-bottom, 40px))',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: '0 -4px 40px rgba(0,0,0,0.7)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
          boxSizing: 'border-box',
        }}
      >
        {/* drag handle */}
        <div style={{ width: 40, height: 4, background: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 4 }} />
        {children}
      </div>
    </div>
  )
}

interface MultiplayerLobbyProps {
  onGameStart?: (sessionId: string, myColour: 'w' | 'b', opponentName: string) => void
}

type LobbyView = 'menu' | 'waiting' | 'joining' | 'matchmaking' | 'matchmaking-timeout'

export function MultiplayerLobby({ onGameStart }: MultiplayerLobbyProps) {
  const [view, setView] = useState<LobbyView>('menu')
  const [roomCode, setRoomCode] = useState('')
  const [joinInput, setJoinInput] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)

  const { session, loading, error, createRoom, joinRoom, subscribeToGame, updateGameState } = useGameSession()
  const setMultiplayerInfo = useChessStore((s) => s.setMultiplayerInfo)
  const applyRemoteGameState = useChessStore((s) => s.applyRemoteGameState)
  const setOpponentDisconnected = useChessStore((s) => s.setOpponentDisconnected)
  const claimWinOnDisconnect = useChessStore((s) => s.claimWinOnDisconnect)
  const storeError = useChessStore((s) => s.error)
  const storeState = useChessStore()
  const { user, profile } = useAuthStore()

  // Matchmaking refs
  const matchmakingChannelRef = useRef<RealtimeChannel | null>(null)
  const matchmakingCleanupRef = useRef<(() => void) | null>(null)
  const matchmakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track the last synced move count to detect new local moves
  const lastSyncedMoveCount = useRef(0)
  // Track the active session id for move sync
  const activeSessionId = useRef<string | null>(null)
  // Track my colour for this session
  const myColourRef = useRef<'w' | 'b' | null>(null)

  // Subscribe to session updates once we have a session (waiting for 2nd player)
  useEffect(() => {
    if (!session || view !== 'waiting') return

    const unsubscribe = subscribeToGame(session.room_code, (updatedSession) => {
      if (updatedSession.players.length >= 2) {
        // Creator (host) is White; joiner is Black
        const myId = session.host_id // we are the host since we created the room
        const myColour: 'w' | 'b' = updatedSession.host_id === myId ? 'w' : 'b'
        const opponent = updatedSession.players.find(
          (p) => p.id !== updatedSession.host_id
        )
        const opponentName = opponent?.display_name ?? 'Opponent'

        activeSessionId.current = updatedSession.id
        myColourRef.current = myColour
        lastSyncedMoveCount.current = 0

        setMultiplayerInfo({
          sessionId: updatedSession.id,
          roomCode: updatedSession.room_code,
          myColour,
          opponentName,
        })

        onGameStart?.(updatedSession.id, myColour, opponentName)
      }
    })

    return unsubscribe
  }, [session, view, subscribeToGame, setMultiplayerInfo, onGameStart])

  // Subscribe to Realtime move sync once game is active (for receiving remote moves)
  useEffect(() => {
    const multiplayer = storeState.multiplayer
    if (!multiplayer || storeState.mode !== 'multiplayer') return

    activeSessionId.current = multiplayer.sessionId
    myColourRef.current = multiplayer.myColour

    const unsubscribe = subscribeToGame(multiplayer.roomCode, (updatedSession) => {
      const gameState = updatedSession.game_state as {
        fen?: string
        moveHistory?: ChessMoveRecord[]
        result?: any
        rematchRequested?: boolean
      } | null

      if (!gameState) return

      applyRemoteGameState(gameState)
    })

    return unsubscribe
  }, [storeState.multiplayer, storeState.mode, subscribeToGame, applyRemoteGameState])

  // When joiner gets a session (after joinRoom), set up their multiplayer info (Black)
  useEffect(() => {
    if (!session || view !== 'joining') return

    // The joiner is always Black; host is White
    const myColour: 'w' | 'b' = session.host_id === session.players[0]?.id &&
      session.players.length >= 2 &&
      session.players[session.players.length - 1]?.id !== session.host_id
      ? 'b'
      : 'b' // joiner is always Black

    const host = session.players.find((p) => p.id === session.host_id)
    const opponentName = host?.display_name ?? 'Opponent'

    activeSessionId.current = session.id
    myColourRef.current = myColour
    lastSyncedMoveCount.current = 0

    setMultiplayerInfo({
      sessionId: session.id,
      roomCode: session.room_code,
      myColour,
      opponentName,
    })

    onGameStart?.(session.id, myColour, opponentName)
  }, [session, view, setMultiplayerInfo, onGameStart])

  // Push local moves to Supabase when moveHistory grows in multiplayer mode
  useEffect(() => {
    const multiplayer = storeState.multiplayer
    if (!multiplayer || storeState.mode !== 'multiplayer') return
    if (storeState.phase !== 'playing' && storeState.phase !== 'finished') return

    const currentMoveCount = storeState.moveHistory.length
    if (currentMoveCount <= lastSyncedMoveCount.current) return

    // Only push if the last move was made by this player
    // After our move, the turn switches to the opponent — so if turn !== myColour, we just moved
    const weJustMoved = storeState.turn !== multiplayer.myColour || storeState.phase === 'finished'
    if (!weJustMoved) return

    lastSyncedMoveCount.current = currentMoveCount

    // Capture the FEN before the async call for potential rollback
    const fenBeforeSync = storeState.fen
    const moveHistoryBeforeSync = storeState.moveHistory

    const payload = {
      fen: storeState.fen,
      moveHistory: storeState.moveHistory,
      result: storeState.result ?? null,
      whitePlayerId: multiplayer.myColour === 'w' ? multiplayer.sessionId : '',
      blackPlayerId: multiplayer.myColour === 'b' ? multiplayer.sessionId : '',
    }

    updateGameState(multiplayer.sessionId, payload).catch((err) => {
      console.error('Failed to sync move to Supabase:', err)
      // Roll back to pre-sync state
      useChessStore.setState({
        fen: fenBeforeSync,
        moveHistory: moveHistoryBeforeSync,
        error: 'Failed to sync move — please try again',
      })
      lastSyncedMoveCount.current = moveHistoryBeforeSync.length - 1
    })
  }, [storeState.moveHistory, storeState.fen, storeState.turn, storeState.phase, storeState.multiplayer, storeState.mode, storeState.result, updateGameState])

  // Detect opponent disconnect via Realtime channel status in multiplayer mode
  useEffect(() => {
    const multiplayer = storeState.multiplayer
    if (!multiplayer || storeState.mode !== 'multiplayer' || storeState.phase !== 'playing') return

    return setupVisibilityAwareChannel(() =>
      supabase
        .channel(`disconnect-detect-${multiplayer.sessionId}`)
        .on('presence', { event: 'leave' }, () => {
          // Any presence leave in this channel means the opponent may have disconnected
          setOpponentDisconnected(true)
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setOpponentDisconnected(true)
          }
        })
    )
  }, [storeState.multiplayer, storeState.mode, storeState.phase, setOpponentDisconnected])

  const handleCreateRoom = async () => {
    setIsCreating(true)
    const code = await createRoom('chess')
    setIsCreating(false)
    if (code) {
      void trackChessEvent('multiplayer_joined', { method: 'room' })
      setRoomCode(code)
      setView('waiting')
    }
  }

  const handleJoinRoom = async () => {
    const code = joinInput.trim().toUpperCase()
    if (!code) {
      setJoinError('Please enter a room code')
      return
    }
    setJoinError(null)
    setIsJoining(true)
    setView('joining')
    await joinRoom(code)
    setIsJoining(false)

    if (error) {
      setJoinError(error)
      setView('menu')
      return
    }

    void trackChessEvent('multiplayer_joined', { method: 'room' })

    // After joining, subscribe to the session to detect when game starts
    // The joiner is always Black (host is White per design)
    // We'll get the session details via subscribeToGame
  }

  const handleBack = () => {
    setView('menu')
    setRoomCode('')
    setJoinInput('')
    setJoinError(null)
  }

  // ── Matchmaking cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      cleanupMatchmaking()
    }
  }, [])

  const cleanupMatchmaking = () => {
    if (matchmakingTimeoutRef.current) {
      clearTimeout(matchmakingTimeoutRef.current)
      matchmakingTimeoutRef.current = null
    }
    if (matchmakingCleanupRef.current) {
      matchmakingCleanupRef.current()
      matchmakingCleanupRef.current = null
    }
    if (matchmakingChannelRef.current) {
      supabase.removeChannel(matchmakingChannelRef.current)
      matchmakingChannelRef.current = null
    }
  }

  const removeFromMatchmakingQueue = async () => {
    if (!user) return
    await supabase.from('chess_matchmaking').delete().eq('user_id', user.id)
  }

  const handleQuickPlay = async () => {
    if (!user || !profile) return

    setView('matchmaking')
    setJoinError(null)

    // Insert into matchmaking queue
    const { error: insertError } = await supabase
      .from('chess_matchmaking')
      .upsert({ user_id: user.id, joined_at: new Date().toISOString() }, { onConflict: 'user_id' })

    if (insertError) {
      setJoinError('Failed to join matchmaking queue')
      setView('menu')
      return
    }

    void trackChessEvent('matchmaking_joined')
    void trackChessEvent('multiplayer_joined', { method: 'matchmaking' })

    // Set 60-second timeout
    matchmakingTimeoutRef.current = setTimeout(async () => {
      await removeFromMatchmakingQueue()
      cleanupMatchmaking()
      setView('matchmaking-timeout')
    }, MATCHMAKING_TIMEOUT_MS)

    // Subscribe to chess_matchmaking table to detect when a second player joins
    const cleanup = setupVisibilityAwareChannel(() =>
      supabase
        .channel('chess-matchmaking-queue')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'chess_matchmaking' },
          async (_payload) => {
            // Fetch current queue
            const { data: queue } = await supabase
              .from('chess_matchmaking')
              .select('user_id, joined_at')
              .order('joined_at', { ascending: true })

            if (!queue || queue.length < 2) return

            // Find our entry and another player
            const myEntry = queue.find((e) => e.user_id === user.id)
            const otherEntry = queue.find((e) => e.user_id !== user.id)

            if (!myEntry || !otherEntry) return

            const pairing = pairMatchmakingPlayers(myEntry, otherEntry)
            const amIFirst = pairing.firstPlayerId === user.id

            if (amIFirst) {
              // I'm the first player (lower joined_at) — I create the room
              cleanupMatchmaking()

              const newRoomCode = await createRoom('chess')
              if (!newRoomCode) {
                await removeFromMatchmakingQueue()
                setJoinError('Failed to create matchmaking room')
                setView('menu')
                return
              }

              // Delete both rows from matchmaking
              await supabase
                .from('chess_matchmaking')
                .delete()
                .in('user_id', [pairing.firstPlayerId, pairing.secondPlayerId])

              // Broadcast room code to the second player via a dedicated channel
              const broadcastChannel = supabase.channel(`chess-matchmaking-${pairing.secondPlayerId}`)
              broadcastChannel.subscribe()
              await broadcastChannel.send({
                type: 'broadcast',
                event: 'match-found',
                payload: {
                  roomCode: newRoomCode,
                  firstPlayerId: pairing.firstPlayerId,
                  secondPlayerId: pairing.secondPlayerId,
                  firstPlayerColour: pairing.firstPlayerColour,
                },
              })
              supabase.removeChannel(broadcastChannel)

              // My colour is assigned — room creator's colour from pairing
              setRoomCode(newRoomCode)
              setView('waiting')
              // The waiting view subscription will handle game start when opponent joins
            } else {
              // I'm the second player — wait for the broadcast with room code
              cleanupMatchmaking()

              const listenChannel = supabase
                .channel(`chess-matchmaking-${user.id}`)
                .on('broadcast', { event: 'match-found' }, async (event) => {
                  const { roomCode: matchedRoomCode } = event.payload as {
                    roomCode: string
                    firstPlayerColour: 'w' | 'b'
                    firstPlayerId: string
                    secondPlayerId: string
                  }

                  supabase.removeChannel(listenChannel)

                  // Join the room — colour is determined by session host_id comparison
                  await joinRoom(matchedRoomCode)

                  // Delete my row from matchmaking
                  await supabase.from('chess_matchmaking').delete().eq('user_id', user.id)
                })
                .subscribe()

              matchmakingChannelRef.current = listenChannel
            }
          }
        )
        .subscribe()
    )

      matchmakingCleanupRef.current = cleanup
  }

  const handleCancelMatchmaking = async () => {
    cleanupMatchmaking()
    await removeFromMatchmakingQueue()
    setView('menu')
  }

  return (
    <div style={styles.container}>
      {/* Store-level error banner (e.g. Supabase sync failure) */}
      {storeError && storeState.mode === 'multiplayer' && (
        <div style={{ width: '100%', maxWidth: 400, marginBottom: 8 }}>
          <ErrorBanner
            message={storeError}
            onClose={() => useChessStore.setState({ error: null })}
          />
        </div>
      )}

      {/* Opponent disconnected overlay */}
      {storeState.opponentDisconnected && storeState.phase === 'playing' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#1a1a1a',
              border: '2px solid rgba(239,68,68,0.4)',
              borderRadius: 16,
              padding: 32,
              maxWidth: 360,
              width: '100%',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ fontSize: 40 }}>📡</div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#fff' }}>
              Opponent Disconnected
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: '#888' }}>
              Your opponent has lost connection. You can claim the win or wait for them to reconnect.
            </p>
            <button
              style={styles.primaryButton}
              onClick={claimWinOnDisconnect}
              aria-label="Claim Win"
            >
              Claim Win
            </button>
            <button
              style={styles.ghostButton}
              onClick={() => setOpponentDisconnected(false)}
              aria-label="Wait for opponent"
            >
              Wait
            </button>
          </div>
        </div>
      )}
      {view === 'menu' && (
        <BottomSheetOrCard>
          <h2 style={styles.title}>Multiplayer</h2>
          <p style={styles.subtitle}>Play chess with a friend in real time</p>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Quick Play</h3>
            <p style={styles.hint}>Get matched with a random opponent instantly</p>
            <button
              style={styles.primaryButton}
              onClick={handleQuickPlay}
              disabled={loading || !user}
              aria-label="Quick Play"
            >
              Quick Play
            </button>
          </div>

          <div style={styles.divider} />

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Create a Room</h3>
            <p style={styles.hint}>Share the room code with your friend to start playing</p>
            <button
              style={styles.secondaryButton}
              onClick={handleCreateRoom}
              disabled={loading || isCreating}
              aria-label="Create Room"
            >
              {isCreating ? (
                <span style={styles.btnInner}>
                  <span style={styles.btnSpinner} />
                  Creating…
                </span>
              ) : 'Create Room'}
            </button>
          </div>

          <div style={styles.divider} />

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Join a Room</h3>
            <input
              style={styles.input}
              type="text"
              placeholder="Enter room code"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
              maxLength={6}
              aria-label="Room code input"
              onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
            />
            {joinError && (
              <ErrorBanner
                message={joinError}
                onClose={() => setJoinError(null)}
                action={
                  joinInput.trim()
                    ? {
                        label: 'Retry Join',
                        onClick: () => {
                          void trackChessEvent('error_retry', { action: 'join_room' })
                          void handleJoinRoom()
                        },
                      }
                    : undefined
                }
              />
            )}
            <button
              style={styles.ghostButton}
              onClick={handleJoinRoom}
              disabled={loading || isJoining || !joinInput.trim()}
              aria-label="Join Room"
            >
              {isJoining ? (
                <span style={styles.btnInner}>
                  <span style={styles.btnSpinner} />
                  Joining…
                </span>
              ) : 'Join Room'}
            </button>
          </div>

          {error && <p style={styles.errorText}>{error}</p>}
        </BottomSheetOrCard>
      )}

      {view === 'waiting' && (
        <div style={styles.card}>
          <h2 style={styles.title}>Waiting for opponent\u2026</h2>
          <p style={styles.subtitle}>Share this code with your friend</p>

          <div style={styles.roomCodeBox} aria-label="Room code display">
            <span style={styles.roomCodeText}>{session?.room_code ?? roomCode}</span>
          </div>

          <p style={styles.hint}>You will be playing as White</p>

          <div style={styles.spinner} aria-label="Waiting spinner" />

          <button style={styles.ghostButton} onClick={handleBack}>
            Cancel
          </button>
        </div>
      )}

      {view === 'joining' && (
        <div style={styles.card}>
          <h2 style={styles.title}>Joining room\u2026</h2>
          <div style={styles.spinner} aria-label="Joining spinner" />
          <button style={styles.ghostButton} onClick={handleBack}>
            Cancel
          </button>
        </div>
      )}

      {view === 'matchmaking' && (
        <div style={styles.card}>
          <h2 style={styles.title}>Finding opponent\u2026</h2>
          <p style={styles.subtitle}>Looking for a player to match you with</p>
          <div style={styles.spinner} aria-label="Matchmaking spinner" />
          <p style={styles.hint}>This may take up to 60 seconds</p>
          <button style={styles.ghostButton} onClick={handleCancelMatchmaking}>
            Cancel
          </button>
        </div>
      )}

      {view === 'matchmaking-timeout' && (
        <div style={styles.card}>
          <div style={{ fontSize: 40, textAlign: 'center' }}>😕</div>
            <h2 style={styles.title}>No opponent found</h2>
          <p style={styles.subtitle}>
            We couldn&apos;t find anyone in the queue right now. Try one of these instead:
          </p>
          <ErrorBanner
            message="Matchmaking timed out — no opponents found"
            onClose={() => setView('menu')}
            action={{
              label: 'Retry Matchmaking',
              onClick: () => {
                void trackChessEvent('error_retry', { action: 'matchmaking' })
                void handleQuickPlay()
              },
            }}
            autoDismissMs={0}
          />
          <button
            style={styles.primaryButton}
            onClick={handleQuickPlay}
            disabled={!user}
            aria-label="Try Again"
          >
            Try Again
          </button>
          <div style={styles.alternativesRow}>
            <button
              style={styles.altButton}
              onClick={() => {
                handleBack()
                // Signal parent to start AI game — propagate via a custom event
                window.dispatchEvent(new CustomEvent('chess:play-vs-ai'))
              }}
              aria-label="Try playing vs AI"
            >
              🤖 Play vs AI
            </button>
            <button
              style={styles.altButton}
              onClick={handleBack}
              aria-label="Invite a friend"
            >
              👥 Invite a Friend
            </button>
          </div>
          <button style={styles.ghostButton} onClick={handleBack}>
            Back to Menu
          </button>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px 16px',
  },
  card: {
    background: '#1a1a1a',
    borderRadius: 12,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    margin: 0,
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 600,
    color: '#ccc',
  },
  hint: {
    margin: 0,
    fontSize: 13,
    color: '#666',
  },
  divider: {
    height: 1,
    background: '#2a2a2a',
    margin: '4px 0',
  },
  input: {
    background: '#0a0a0f',
    border: '1px solid #333',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#fff',
    fontSize: 16,
    letterSpacing: 4,
    textTransform: 'uppercase',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  primaryButton: {
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px 24px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaryButton: {
    background: 'transparent',
    color: '#6366f1',
    border: '1.5px solid #6366f1',
    borderRadius: 8,
    padding: '11px 24px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  ghostButton: {
    background: 'transparent',
    color: '#666',
    border: '1px solid #333',
    borderRadius: 8,
    padding: '10px 24px',
    fontSize: 14,
    cursor: 'pointer',
    alignSelf: 'center',
  },
  roomCodeBox: {
    background: '#0a0a0f',
    border: '2px solid #6366f1',
    borderRadius: 10,
    padding: '20px 24px',
    textAlign: 'center',
  },
  roomCodeText: {
    fontSize: 32,
    fontWeight: 800,
    color: '#6366f1',
    letterSpacing: 8,
    fontFamily: 'monospace',
  },
  errorText: {
    margin: 0,
    fontSize: 13,
    color: '#ef4444',
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid #333',
    borderTop: '3px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    alignSelf: 'center',
  },
  alternativesRow: {
    display: 'flex',
    gap: 10,
  },
  altButton: {
    flex: 1,
    background: '#111',
    color: '#ccc',
    border: '1px solid #333',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'center' as const,
  },
  btnInner: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  btnSpinner: {
    width: 14,
    height: 14,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    flexShrink: 0,
  },
}
