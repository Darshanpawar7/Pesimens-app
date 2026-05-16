import { useEffect, useRef, useState } from 'react'
import { trackChessEvent } from '../lib/chess/analytics'
import { useChessStore } from '../lib/chess/store'
import {
  DailyPlayReminder,
  WinLossFeedback,
  StreakDisplay,
  ComeBackTomorrow,
  markDailyGoalComplete,
} from '../components/games/chess/RetentionHooks'
import { ChessBoard } from '../components/games/chess/ChessBoard'
import { MoveHistory } from '../components/games/chess/MoveHistory'
import { SpectatorList } from '../components/games/chess/SpectatorList'
import { InviteNotification } from '../components/games/chess/InviteNotification'
import { ChessNotificationToast } from '../components/games/chess/ChessNotificationToast'
import { FriendsList } from '../components/games/chess/FriendsList'
import { DailyChallenge } from '../components/games/chess/DailyChallenge'
import { Leaderboard } from '../components/games/chess/Leaderboard'
import { LeaderboardPreview } from '../components/games/chess/LeaderboardPreview'
import { ActivityFeed } from '../components/games/chess/ActivityFeed'
import { ErrorBanner } from '../components/games/chess/ErrorBanner'
import { AiDifficultyPicker } from '../components/games/chess/AiDifficultyPicker'
import { MultiplayerLobby } from '../components/games/chess/MultiplayerLobby'
import { ReactionBar } from '../components/games/chess/ReactionBar'
import { ChatBox } from '../components/games/chess/ChatBox'
import { useAuthStore } from '../store/auth'
import { recordGameResult } from '../lib/chess/statsService'
import { supabase } from '../lib/supabase'
import { setupVisibilityAwareChannel } from '../lib/realtimeVisibility'
import { useGameSession } from '../hooks/useGameSession'
import { CHESS_FEATURES } from '../lib/chess/featureFlags'
import { ChessDebugPanel } from '../components/games/chess/ChessDebugPanel'

// ─── Result overlay ───────────────────────────────────────────────────────────
function ResultOverlay({
  result,
  isMultiplayer,
  myColour,
  consecutiveWins,
  rematchRequestedByOpponent,
  onPlayAgain,
  onRequestRematch,
  onAcceptRematch,
  onLeave,
  onBackToHome,
}: {
  result: 'white' | 'black' | 'draw'
  isMultiplayer: boolean
  myColour: 'w' | 'b' | null
  consecutiveWins: number
  rematchRequestedByOpponent: boolean
  onPlayAgain: () => void
  onRequestRematch: () => void
  onAcceptRematch: () => void
  onLeave: () => void
  onBackToHome: () => void
}) {
  const resultLabel =
    result === 'white' ? 'White Wins!' : result === 'black' ? 'Black Wins!' : 'Draw!'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Above disconnect overlay (100) and multiplayer lobby (200)
        zIndex: 300,
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #111118, #16161f)',
          border: '2px solid rgba(99,102,241,0.4)',
          borderRadius: 24,
          padding: 40,
          maxWidth: 380,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 0 60px rgba(99,102,241,0.2)',
        }}
      >
        {/* Win/loss personalised feedback (38.2) */}
        <WinLossFeedback result={result} myColour={myColour} consecutiveWins={consecutiveWins} />

        <h2
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: '#fff',
            marginBottom: 8,
            marginTop: 12,
            letterSpacing: '-0.02em',
          }}
        >
          {resultLabel}
        </h2>
        <p style={{ color: '#8888a8', marginBottom: 20, fontSize: 14 }}>
          {result === 'draw'
            ? 'The game ended in a draw.'
            : `Congratulations — ${result === 'white' ? 'White' : 'Black'} wins the match!`}
        </p>

        {/* Come back tomorrow countdown (38.4) */}
        <div style={{ marginBottom: 20 }}>
          <ComeBackTomorrow />
        </div>
        {isMultiplayer ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rematchRequestedByOpponent ? (
              // Opponent requested rematch — show Accept / Decline
              <>
                <p style={{ color: '#a5b4fc', fontSize: 14, marginBottom: 4 }}>
                  Opponent wants a rematch!
                </p>
                <button
                  onClick={onAcceptRematch}
                  style={{
                    width: '100%',
                    padding: '14px 0',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 15,
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Accept Rematch
                </button>
                <button
                  onClick={onLeave}
                  style={{
                    width: '100%',
                    padding: '14px 0',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 15,
                    background: 'transparent',
                    color: '#8888a8',
                    border: '1px solid rgba(255,255,255,0.12)',
                    cursor: 'pointer',
                  }}
                >
                  Decline
                </button>
              </>
            ) : (
              // Normal finished state — show Rematch / Leave
              <>
                <button
                  onClick={onRequestRematch}
                  style={{
                    width: '100%',
                    padding: '14px 0',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 15,
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Rematch
                </button>
                <button
                  onClick={onLeave}
                  style={{
                    width: '100%',
                    padding: '14px 0',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 15,
                    background: 'transparent',
                    color: '#8888a8',
                    border: '1px solid rgba(255,255,255,0.12)',
                    cursor: 'pointer',
                  }}
                >
                  Leave
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={onPlayAgain}
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 15,
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Play Again
            </button>
            <button
              onClick={onBackToHome}
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 15,
                background: 'transparent',
                color: '#8888a8',
                border: '1px solid rgba(255,255,255,0.12)',
                cursor: 'pointer',
              }}
            >
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ChessPage ────────────────────────────────────────────────────────────────
export default function ChessPage() {
  const { phase, turn, result, mode, multiplayer, initGame, resetGame, requestRematch, acceptRematch, rematchRequestedByOpponent, startSpectating, loadFromFen, sendGameInvite, initPresence, cleanupPresence, onlineUsers, error: storeError, aiDifficulty, rematchCountdown } = useChessStore()
  const user = useAuthStore(s => s.user)
  const statsRecordedRef = useRef(false)
  const gameStartTimeRef = useRef<number | null>(null)
  const analyticsGameStartedRef = useRef(false)
  const { createRoom } = useGameSession()
  const [showAiPicker, setShowAiPicker] = useState(false)
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false)
  const [showMultiplayerLobby, setShowMultiplayerLobby] = useState(false)
  // Consecutive wins counter for win/loss feedback (38.2)
  const [consecutiveWins, setConsecutiveWins] = useState(0)

  useEffect(() => {
    if (phase !== 'finished' || mode !== 'multiplayer' || !result || !user || !multiplayer) return
    if (statsRecordedRef.current) return
    statsRecordedRef.current = true

    let outcome: 'win' | 'loss' | 'draw'
    if (result === 'draw') {
      outcome = 'draw'
    } else if (
      (result === 'white' && multiplayer.myColour === 'w') ||
      (result === 'black' && multiplayer.myColour === 'b')
    ) {
      outcome = 'win'
    } else {
      outcome = 'loss'
    }

    recordGameResult(user.id, outcome)
  }, [phase, mode, result, user, multiplayer])

  // Reset the recorded flag when a new game starts
  useEffect(() => {
    if (phase === 'playing') {
      statsRecordedRef.current = false
    }
  }, [phase])

  // Track game_started when phase transitions to playing
  useEffect(() => {
    if (phase === 'playing' && !analyticsGameStartedRef.current) {
      analyticsGameStartedRef.current = true
      gameStartTimeRef.current = Date.now()
      void trackChessEvent('game_started', { mode })
    }
    if (phase === 'home' || phase === 'setup') {
      analyticsGameStartedRef.current = false
      gameStartTimeRef.current = null
    }
  }, [phase, mode])

  // Track game_finished when phase transitions to finished
  useEffect(() => {
    if (phase !== 'finished' || !result) return
    const duration = gameStartTimeRef.current
      ? Math.round((Date.now() - gameStartTimeRef.current) / 1000)
      : null
    void trackChessEvent('game_finished', { result, mode, ...(duration !== null && { duration }) })
    // Mark daily goal as complete (38.1)
    markDailyGoalComplete()
    // Track consecutive wins for feedback (38.2)
    const isWin =
      multiplayer
        ? (result === 'white' && multiplayer.myColour === 'w') ||
          (result === 'black' && multiplayer.myColour === 'b')
        : false
    setConsecutiveWins((prev) => (isWin ? prev + 1 : 0))
  }, [phase, result, mode])

  // Initialize Presence when user is authenticated (feature-gated)
  useEffect(() => {
    if (!CHESS_FEATURES.presence || !user) return
    initPresence(user.id)
    return () => {
      cleanupPresence()
    }
  }, [user?.id])

  // Realtime subscription for spectator mode
  useEffect(() => {
    if (mode !== 'spectator' || !multiplayer?.sessionId) return

    return setupVisibilityAwareChannel(() =>
      supabase
        .channel(`spectator-${multiplayer.sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'game_sessions',
            filter: `id=eq.${multiplayer.sessionId}`,
          },
          (payload) => {
            const gameState = payload.new?.game_state
            if (gameState?.fen) {
              loadFromFen(gameState.fen)
            }
          }
        )
        .subscribe()
    )
  }, [mode, multiplayer?.sessionId, loadFromFen])

  // Home / setup screen
  if (phase === 'home' || phase === 'setup') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0a0a0f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
          boxSizing: 'border-box',
          overflowX: 'hidden',
        }}
      >
        <InviteNotification onAccept={(roomCode) => {
          // Navigate user to multiplayer lobby with the room code pre-filled
          // We store it in sessionStorage so MultiplayerLobby can pick it up
          sessionStorage.setItem('chess-invite-room-code', roomCode)
          window.location.reload()
        }} />
        <ChessNotificationToast />
        <div
          style={{
            background: 'linear-gradient(135deg, #111118 0%, #16161f 100%)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 24,
            padding: '32px 20px',
            maxWidth: 400,
            width: '100%',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 4 }}>♟️</div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.03em',
              marginBottom: 4,
            }}
          >
            Chess
          </h1>
          <p style={{ color: '#8888a8', fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
            Pass &amp; Play — take turns on the same device. No accounts or internet needed.
          </p>

          {/* Daily play reminder (38.1) */}
          <DailyPlayReminder />

          {/* Win streak display (38.3) */}
          <StreakDisplay
            userId={user?.id ?? null}
            onViewStats={() => setShowFullLeaderboard(true)}
          />

          {/* AI Difficulty Picker or Play Now / Start Game buttons */}
          {showAiPicker ? (
            <AiDifficultyPicker
              onSelect={(diff) => {
                void trackChessEvent('ai_difficulty_selected', { difficulty: diff })
                initGame('ai', diff)
                setShowAiPicker(false)
              }}
            />
          ) : showMultiplayerLobby ? (
            <MultiplayerLobby
              onGameStart={() => {
                setShowMultiplayerLobby(false)
              }}
            />
          ) : (
            /* Mode selection buttons — stacked vertically, full-width */
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Play Now button */}
              <div style={{ width: '100%' }}>
                <button
                  onClick={() => {
                    void trackChessEvent('quick_play_clicked')
                    if (CHESS_FEATURES.ai) {
                      setShowAiPicker(true)
                    } else {
                      initGame('passAndPlay')
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '16px 0',
                    borderRadius: 14,
                    fontWeight: 700,
                    fontSize: 16,
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    letterSpacing: '0.02em',
                    boxSizing: 'border-box',
                  }}
                >
                  ⚡ Play Now
                </button>
                <p style={{ color: '#8888a8', fontSize: 12, margin: '6px 0 0', textAlign: 'center' }}>
                  vs AI — no waiting needed
                </p>
              </div>

              {/* Start Game (pass-and-play) button */}
              <button
                onClick={() => initGame('passAndPlay')}
                style={{
                  width: '100%',
                  padding: '16px 0',
                  borderRadius: 14,
                  fontWeight: 700,
                  fontSize: 16,
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                  boxSizing: 'border-box',
                }}
              >
                Start Game →
              </button>

              {/* Multiplayer button (Phase 2) */}
              {CHESS_FEATURES.multiplayer && (
                <button
                  onClick={() => setShowMultiplayerLobby(true)}
                  style={{
                    width: '100%',
                    padding: '16px 0',
                    borderRadius: 14,
                    fontWeight: 700,
                    fontSize: 16,
                    background: 'transparent',
                    color: '#6366f1',
                    border: '1.5px solid #6366f1',
                    cursor: 'pointer',
                    letterSpacing: '0.02em',
                    boxSizing: 'border-box',
                  }}
                >
                  🌐 Play Online
                </button>
              )}
            </div>
          )}

          {/* Spectator list */}
          {CHESS_FEATURES.spectator && (
            <SpectatorList
              onSelectGame={async (sessionId, roomCode) => {
                const { data } = await supabase
                  .from('game_sessions')
                  .select('game_state')
                  .eq('id', sessionId)
                  .single()
                const fen = data?.game_state?.fen
                startSpectating(sessionId, roomCode, fen)
              }}
            />
          )}

          {/* Friends list with invite */}
          {CHESS_FEATURES.friends && CHESS_FEATURES.invites && (
            <FriendsList
              onInvite={async (friendId) => {
                const roomCode = await createRoom('chess')
                if (!roomCode) return
                await sendGameInvite(friendId, roomCode)
              }}
              onFindFriends={() => {
                // Navigate to the profiles/social section of the app
                window.location.href = '/explore'
              }}
            />
          )}

          {/* Daily challenge */}
          {CHESS_FEATURES.dailyChallenge && <DailyChallenge />}

          {/* Leaderboard */}
          {CHESS_FEATURES.leaderboard && (
            showFullLeaderboard
              ? <Leaderboard onPlayNow={() => initGame('passAndPlay')} />
              : <LeaderboardPreview onViewFull={() => setShowFullLeaderboard(true)} />
          )}

          {/* Activity feed */}
          {CHESS_FEATURES.activityFeed && <ActivityFeed />}
        </div>

        {/* Dev debug panel — bottom-right corner, dev only */}
        <ChessDebugPanel />
      </div>
    )
  }

  const turnLabel = turn === 'w' ? 'White' : 'Black'
  const turnColor = turn === 'w' ? '#e5e7eb' : '#9ca3af'
  const isSpectator = mode === 'spectator'

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 24,
        paddingLeft: 8,
        paddingRight: 8,
        overflowX: 'hidden',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      <InviteNotification onAccept={(roomCode) => {
        sessionStorage.setItem('chess-invite-room-code', roomCode)
        window.location.reload()
      }} />
      <ChessNotificationToast />
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.02em',
            marginBottom: 4,
          }}
        >
          ♟️ Chess
        </h1>

        {/* Spectator badge */}
        {isSpectator && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(99,102,241,0.12)',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: 99,
              padding: '4px 12px',
              marginTop: 4,
            }}
          >
            <span style={{ fontSize: 12, color: '#8888a8', fontWeight: 600 }}>
              👁 Spectating
            </span>
          </div>
        )}

        {/* Turn indicator */}
        {phase === 'playing' && !isSpectator && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(99,102,241,0.12)',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: 99,
              padding: '4px 12px',
              marginTop: 4,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: turnColor,
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: 12, color: turnColor, fontWeight: 600 }}>
              {turnLabel}&apos;s turn
            </span>
          </div>
        )}

        {/* Opponent online/offline badge (multiplayer only) */}
        {CHESS_FEATURES.multiplayer && CHESS_FEATURES.presence && mode === 'multiplayer' && multiplayer && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 6,
            }}
          >
            {(() => {
              const opponentOnline = user
                ? onlineUsers.some((id) => id !== user.id)
                : false
              return (
                <>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: opponentOnline ? '#22c55e' : '#6b7280',
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                    aria-label={opponentOnline ? 'Opponent online' : 'Opponent offline'}
                  />
                  <span style={{ fontSize: 12, color: '#8888a8' }}>
                    {multiplayer.opponentName}
                    <span
                      style={{
                        marginLeft: 4,
                        fontSize: 11,
                        color: opponentOnline ? '#22c55e' : '#6b7280',
                      }}
                    >
                      {opponentOnline ? 'Online' : 'Offline'}
                    </span>
                  </span>
                </>
              )
            })()}
          </div>
        )}
      </div>

      {/* Board + History — column on mobile, row on desktop */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          width: '100%',
          maxWidth: 800,
        }}
      >
        {/* Board */}
        <div
          style={{
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.4)',
            width: '100%',
            maxWidth: '100%',
          }}
        >
          <ChessBoard readOnly={isSpectator || phase === 'finished'} />
        </div>
        {/* Move history — compact horizontal strip below board */}
        {phase === 'playing' && (
          <div style={{ width: '100%', maxWidth: 480 }}>
            <MoveHistory />
          </div>
        )}

        {/* Reaction bar (Phase 3) — multiplayer games only */}
        {CHESS_FEATURES.reactions && mode === 'multiplayer' && multiplayer && user && phase === 'playing' && (
          <div style={{ width: '100%', maxWidth: 480, display: 'flex', justifyContent: 'center' }}>
            <ReactionBar sessionId={multiplayer.sessionId} myUserId={user.id} />
          </div>
        )}

        {/* Chat box (Phase 4) — multiplayer games only */}
        {CHESS_FEATURES.chat && mode === 'multiplayer' && multiplayer && phase === 'playing' && (
          <div style={{ width: '100%', maxWidth: 480 }}>
            <ChatBox sessionId={multiplayer.sessionId} />
          </div>
        )}
      </div>

      {/* Store-level error banner */}
      {storeError && (
        <div style={{ width: '100%', maxWidth: 480, marginTop: 12 }}>
          <ErrorBanner
            message={storeError}
            onClose={() => useChessStore.setState({ error: null })}
          />
        </div>
      )}

      {/* Back to home button for spectators */}
      {isSpectator && (
        <button
          onClick={resetGame}
          style={{
            marginTop: 20,
            padding: '10px 24px',
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            background: 'transparent',
            color: '#8888a8',
            border: '1px solid rgba(255,255,255,0.12)',
            cursor: 'pointer',
          }}
        >
          ← Back to Games
        </button>
      )}

      {/* Result overlay */}
      {phase === 'finished' && result && (
        <ResultOverlay
          result={result}
          isMultiplayer={mode === 'multiplayer'}
          myColour={multiplayer?.myColour ?? null}
          consecutiveWins={consecutiveWins}
          rematchRequestedByOpponent={rematchRequestedByOpponent}
          onPlayAgain={() => initGame(mode, aiDifficulty ?? 'medium')}
          onRequestRematch={() => { void trackChessEvent('rematch_clicked'); requestRematch() }}
          onAcceptRematch={() => { void trackChessEvent('rematch_accepted'); acceptRematch() }}
          onLeave={resetGame}
          onBackToHome={resetGame}
        />
      )}

      {/* Dev debug panel — bottom-right corner, dev only */}
      <ChessDebugPanel />

      {/* Rematch countdown overlay (multiplayer only) */}
      {rematchCountdown !== null && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // Above result overlay (300) and promotion picker (10000 — but countdown only shows post-game)
            zIndex: 400,
          }}
        >
          <div
            style={{
              textAlign: 'center',
              maxWidth: 320,
              width: '100%',
              padding: '0 16px',
            }}
          >
            <div
              style={{
                fontSize: 96,
                fontWeight: 900,
                color: '#6366f1',
                lineHeight: 1,
                letterSpacing: '-0.04em',
                textShadow: '0 0 40px rgba(99,102,241,0.6)',
              }}
            >
              {rematchCountdown === 0 ? 'Go!' : rematchCountdown}
            </div>
            <p style={{ color: '#8888a8', fontSize: 16, marginTop: 16 }}>
              Rematch starting…
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
