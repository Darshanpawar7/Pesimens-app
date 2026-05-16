import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

const EMOJIS = ['👍', '😂', '😈', '🔥'] as const
type Emoji = (typeof EMOJIS)[number]

interface ReactionPayload {
  fromPlayerId: string
  emoji: Emoji
  sentAt: string
}

export interface ReactionBarProps {
  sessionId: string
  myUserId: string
}

interface IncomingReaction {
  emoji: Emoji
  id: number
}

export function ReactionBar({ sessionId, myUserId }: ReactionBarProps) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [incomingReaction, setIncomingReaction] = useState<IncomingReaction | null>(null)
  const [visible, setVisible] = useState(false)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reactionIdRef = useRef(0)

  useEffect(() => {
    const channelName = `chess-reactions-${sessionId}`
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'reaction' }, (event) => {
        const payload = event.payload as ReactionPayload
        // Only show reactions from the opponent
        if (payload.fromPlayerId === myUserId) return

        const id = ++reactionIdRef.current
        setIncomingReaction({ emoji: payload.emoji, id })
        setVisible(true)

        if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
        fadeTimerRef.current = setTimeout(() => {
          setVisible(false)
        }, 2500)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
      supabase.removeChannel(channel)
    }
  }, [sessionId, myUserId])

  const handleReaction = async (emoji: Emoji) => {
    const channel = channelRef.current
    if (!channel) return

    const payload: ReactionPayload = {
      fromPlayerId: myUserId,
      emoji,
      sentAt: new Date().toISOString(),
    }

    await channel.send({
      type: 'broadcast',
      event: 'reaction',
      payload,
    })
  }

  return (
    <>
      {/* Reaction buttons */}
      <div style={styles.bar} role="toolbar" aria-label="Reaction bar">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            style={styles.button}
            onClick={() => handleReaction(emoji)}
            aria-label={`Send ${emoji} reaction`}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = '#2a2a3a'
              ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.15)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = '#1a1a2e'
              ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
            }}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Floating overlay — pointer-events: none so it never blocks the board */}
      {incomingReaction && (
        <div
          key={incomingReaction.id}
          style={{
            ...styles.overlay,
            opacity: visible ? 1 : 0,
          }}
          aria-live="polite"
          aria-label={`Opponent reacted with ${incomingReaction.emoji}`}
        >
          <span style={styles.overlayEmoji}>{incomingReaction.emoji}</span>
        </div>
      )}
    </>
  )
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    flexDirection: 'row',
    gap: '8px',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '8px 12px',
    background: '#1a1a2e',
    borderRadius: '24px',
    border: '1px solid #2a2a3a',
  },
  button: {
    background: '#1a1a2e',
    border: 'none',
    borderRadius: '50%',
    // 44px minimum touch target per accessibility guidelines
    width: '44px',
    height: '44px',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s ease, transform 0.15s ease',
    outline: 'none',
    touchAction: 'manipulation',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    // Below promotion picker (10000) but above most UI
    zIndex: 9000,
    transition: 'opacity 0.4s ease',
  },
  overlayEmoji: {
    fontSize: '80px',
    lineHeight: 1,
    filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.6))',
    userSelect: 'none',
  },
}
