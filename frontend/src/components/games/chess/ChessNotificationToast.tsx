import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { setupVisibilityAwareChannel } from '../../../lib/realtimeVisibility'
import { useAuthStore } from '../../../store/auth'
import type { ChessNotification } from '../../../lib/chess/types'

const NOTIFICATION_ICONS: Record<string, string> = {
  game_invite: '♟️',
  match_found: '⚔️',
  game_result: '🏆',
  rematch_request: '🔄',
  daily_challenge: '📅',
}

const AUTO_DISMISS_MS = 8_000

/**
 * Subscribes to the `chess-notifications:{userId}` Realtime broadcast channel
 * and displays toast notifications for chess events:
 * - game invites
 * - match found
 * - game results
 * - rematch requests
 * - daily challenge reminders
 *
 * Toasts auto-dismiss after 8 seconds. Multiple toasts stack vertically.
 */
export function ChessNotificationToast() {
  const user = useAuthStore((s) => s.user)
  const [notifications, setNotifications] = useState<ChessNotification[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = (id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  useEffect(() => {
    if (!user) return

    return setupVisibilityAwareChannel(() =>
      supabase
        .channel(`chess-notifications:${user.id}`)
        .on('broadcast', { event: 'chess-notification' }, (event) => {
          const notification = event.payload as ChessNotification
          setNotifications((prev) => [...prev, notification])

          // Auto-dismiss
          const timer = setTimeout(() => dismiss(notification.id), AUTO_DISMISS_MS)
          timersRef.current.set(notification.id, timer)
        })
        .subscribe()
    )
  }, [user])

  if (notifications.length === 0) return null

  return (
    <div style={styles.container} aria-live="polite" aria-label="Chess notifications">
      {notifications.map((notification) => (
        <ToastItem
          key={notification.id}
          notification={notification}
          onDismiss={() => dismiss(notification.id)}
        />
      ))}
    </div>
  )
}

interface ToastItemProps {
  notification: ChessNotification
  onDismiss: () => void
}

function ToastItem({ notification, onDismiss }: ToastItemProps) {
  const icon = NOTIFICATION_ICONS[notification.type] ?? '🔔'

  return (
    <div style={styles.toast} role="alert">
      <div style={styles.icon}>{icon}</div>
      <div style={styles.body}>
        <p style={styles.title}>{notification.title}</p>
        <p style={styles.message}>{notification.message}</p>
      </div>
      <button
        style={styles.closeButton}
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: 24,
    right: 24,
    zIndex: 9998,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    maxWidth: 320,
    pointerEvents: 'none',
  },
  toast: {
    background: '#1a1a2e',
    border: '1px solid rgba(99,102,241,0.35)',
    borderRadius: 14,
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
    animation: 'slideUp 0.25s ease',
    pointerEvents: 'auto',
  },
  icon: {
    fontSize: 24,
    lineHeight: 1,
    flexShrink: 0,
    marginTop: 1,
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  title: {
    margin: 0,
    fontSize: 13,
    fontWeight: 700,
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  message: {
    margin: 0,
    fontSize: 13,
    color: '#aaa',
    lineHeight: 1.4,
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: '#555',
    fontSize: 20,
    lineHeight: 1,
    cursor: 'pointer',
    padding: '0 2px',
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
}
