import React, { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { setupVisibilityAwareChannel } from '../../../lib/realtimeVisibility'
import { useAuthStore } from '../../../store/auth'

export interface ChatBoxProps {
  sessionId: string
}

interface ChatMessage {
  id: string
  user_id: string
  message: string
  created_at: string
  senderName: string
}

const MAX_MESSAGES = 50
const RATE_LIMIT_MS = 1000

export function ChatBox({ sessionId }: ChatBoxProps) {
  const user = useAuthStore((s) => s.user)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [lastSentAt, setLastSentAt] = useState<number>(0)
  const [rateLimited, setRateLimited] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  // Fetch sender display names for a list of user ids
  const fetchNames = useCallback(async (userIds: string[]): Promise<Record<string, string>> => {
    if (userIds.length === 0) return {}
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds)
    const map: Record<string, string> = {}
    if (data) {
      for (const p of data) {
        map[p.id] = p.display_name ?? 'Unknown'
      }
    }
    return map
  }, [])

  // Fetch initial messages on mount
  useEffect(() => {
    let cancelled = false

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('chess_chat')
        .select('id, user_id, message, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(MAX_MESSAGES)

      if (error || !data || cancelled) return

      // Reverse so oldest is first
      const rows = [...data].reverse()
      const uniqueIds = [...new Set(rows.map((r) => r.user_id))]
      const nameMap = await fetchNames(uniqueIds)

      if (cancelled) return

      setMessages(
        rows.map((r) => ({
          id: r.id,
          user_id: r.user_id,
          message: r.message,
          created_at: r.created_at,
          senderName: nameMap[r.user_id] ?? 'Unknown',
        }))
      )
    }

    void loadMessages()
    return () => {
      cancelled = true
    }
  }, [sessionId, fetchNames])

  // Subscribe to realtime inserts
  useEffect(() => {
    return setupVisibilityAwareChannel(() =>
      supabase
        .channel(`chess-chat-${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chess_chat',
            filter: `session_id=eq.${sessionId}`,
          },
          async (payload) => {
            const row = payload.new as { id: string; user_id: string; message: string; created_at: string }
            const nameMap = await fetchNames([row.user_id])
            const newMsg: ChatMessage = {
              id: row.id,
              user_id: row.user_id,
              message: row.message,
              created_at: row.created_at,
              senderName: nameMap[row.user_id] ?? 'Unknown',
            }
            setMessages((prev) => {
              const updated = [...prev, newMsg]
              return updated.length > MAX_MESSAGES ? updated.slice(-MAX_MESSAGES) : updated
            })
          }
        )
        .subscribe()
    )
  }, [sessionId, fetchNames])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = useCallback(async () => {
    if (!user || !input.trim()) return

    const now = Date.now()
    if (now - lastSentAt < RATE_LIMIT_MS) {
      setRateLimited(true)
      setTimeout(() => setRateLimited(false), RATE_LIMIT_MS)
      return
    }

    const text = input.trim().slice(0, 120)
    setInput('')
    setLastSentAt(now)

    const { error } = await supabase.from('chess_chat').insert({
      session_id: sessionId,
      user_id: user.id,
      message: text,
    })
    if (error) {
      console.error('ChatBox send error:', error)
    }
  }, [user, input, lastSentAt, sessionId])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      void sendMessage()
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>💬 Chat</h3>

      {/* Message list */}
      <div ref={listRef} style={styles.messageList} aria-live="polite" aria-label="Chat messages">
        {messages.length === 0 ? (
          <p style={styles.emptyText}>No messages yet. Say hello!</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                ...styles.messageRow,
                ...(msg.user_id === user?.id ? styles.myMessageRow : {}),
              }}
            >
              <span style={styles.senderName}>{msg.user_id === user?.id ? 'You' : msg.senderName}</span>
              <span style={styles.messageText}>{msg.message}</span>
              <span style={styles.timestamp}>{formatTime(msg.created_at)}</span>
            </div>
          ))
        )}
      </div>

      {/* Input row */}
      <div style={styles.inputRow}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            style={{
              ...styles.input,
              borderColor: rateLimited ? 'rgba(239,68,68,0.5)' : '#333',
            }}
            type="text"
            value={input}
            maxLength={120}
            placeholder={rateLimited ? 'Slow down…' : 'Type a message…'}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Chat message input"
          />
          {input.length > 90 && (
            <span
              style={{
                position: 'absolute',
                right: 8,
                bottom: 6,
                fontSize: 10,
                color: input.length >= 120 ? '#ef4444' : '#6b7280',
                pointerEvents: 'none',
              }}
            >
              {120 - input.length}
            </span>
          )}
        </div>
        <button
          style={{
            ...styles.sendButton,
            opacity: rateLimited || !input.trim() ? 0.5 : 1,
          }}
          onClick={() => void sendMessage()}
          disabled={rateLimited || !input.trim()}
          aria-label="Send message"
        >
          Send
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#1a1a1a',
    borderRadius: 12,
    padding: '16px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    border: '1px solid #2a2a2a',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    boxSizing: 'border-box',
  },
  heading: {
    margin: 0,
    fontSize: 15,
    fontWeight: 700,
    color: '#ffffff',
  },
  messageList: {
    flex: 1,
    minHeight: 120,
    maxHeight: 'min(260px, 25vh)',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    paddingRight: 4,
    WebkitOverflowScrolling: 'touch',
  },
  emptyText: {
    margin: 0,
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    paddingTop: 16,
  },
  messageRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '6px 10px',
    borderRadius: 8,
    background: '#111',
    alignSelf: 'flex-start',
    maxWidth: '90%',
  },
  myMessageRow: {
    alignSelf: 'flex-end',
    background: '#1e1e3a',
  },
  senderName: {
    fontSize: 11,
    fontWeight: 600,
    color: '#6366f1',
  },
  messageText: {
    fontSize: 13,
    color: '#e0e0e0',
    wordBreak: 'break-word',
  },
  timestamp: {
    fontSize: 10,
    color: '#555',
    alignSelf: 'flex-end',
  },
  inputRow: {
    display: 'flex',
    gap: 8,
  },
  input: {
    width: '100%',
    background: '#111',
    border: '1px solid #333',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 13,
    color: '#e0e0e0',
    outline: 'none',
    boxSizing: 'border-box',
  },
  sendButton: {
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
  },
}
