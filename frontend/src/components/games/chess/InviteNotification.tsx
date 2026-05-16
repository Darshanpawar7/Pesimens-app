import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { setupVisibilityAwareChannel } from '../../../lib/realtimeVisibility'
import { useAuthStore } from '../../../store/auth'
import type { GameInvitePayload } from '../../../lib/chess/types'

interface InviteNotificationProps {
  /** Called when the user accepts an invite — passes the room code to join */
  onAccept: (roomCode: string) => void
}

/**
 * Listens on the `game-invites:{userId}` Realtime broadcast channel and
 * displays a toast notification when a chess game invite arrives.
 * Auto-dismisses after 15 seconds if not acted on.
 */
export function InviteNotification({ onAccept }: InviteNotificationProps) {
  const user = useAuthStore((s) => s.user)
  const [invite, setInvite] = useState<GameInvitePayload | null>(null)
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!user) return

    return setupVisibilityAwareChannel(() =>
      supabase
        .channel(`game-invites:${user.id}`)
        .on('broadcast', { event: 'game-invite' }, (event) => {
          const payload = event.payload as GameInvitePayload
          setInvite(payload)

          // Auto-dismiss after 15 seconds
          if (dismissTimer.current) clearTimeout(dismissTimer.current)
          dismissTimer.current = setTimeout(() => setInvite(null), 15_000)
        })
        .subscribe()
    )
  }, [user])

  if (!invite) return null

  const handleAccept = () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    setInvite(null)
    onAccept(invite.roomCode)
  }

  const handleDecline = () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    setInvite(null)
  }

  return (
    <div style={styles.toast} role="alert" aria-live="assertive">
      <div style={styles.icon}>♟️</div>
      <div style={styles.body}>
        <p style={styles.title}>Game Invite</p>
        <p style={styles.message}>
          <strong style={{ color: '#e0e0e0' }}>{invite.fromUserName}</strong> invited you to a chess match
        </p>
        <div style={styles.actions}>
          <button style={styles.acceptButton} onClick={handleAccept} aria-label="Accept game invite">
            Accept
          </button>
          <button style={styles.declineButton} onClick={handleDecline} aria-label="Decline game invite">
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  toast: {
    position: 'fixed',
    bottom: 24,
    right: 24,
    zIndex: 9999,
    background: '#1a1a2e',
    border: '1px solid rgba(99,102,241,0.4)',
    borderRadius: 14,
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    maxWidth: 320,
    boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
    animation: 'slideUp 0.25s ease',
  },
  icon: {
    fontSize: 28,
    lineHeight: 1,
    flexShrink: 0,
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  title: {
    margin: 0,
    fontSize: 13,
    fontWeight: 700,
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  message: {
    margin: 0,
    fontSize: 14,
    color: '#aaa',
    lineHeight: 1.4,
  },
  actions: {
    display: 'flex',
    gap: 8,
    marginTop: 4,
  },
  acceptButton: {
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 7,
    padding: '7px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  declineButton: {
    background: 'transparent',
    color: '#666',
    border: '1px solid #333',
    borderRadius: 7,
    padding: '6px 14px',
    fontSize: 13,
    cursor: 'pointer',
  },
}
