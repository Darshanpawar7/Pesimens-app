import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { setupVisibilityAwareChannel } from '../../../lib/realtimeVisibility'

interface ActivityEntry {
  id: string
  message: string
  created_at: string
}

const MAX_ENTRIES = 20

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function ActivityFeed() {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when entries change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries])

  useEffect(() => {
    // Fetch the most recent 20 entries on mount
    supabase
      .from('game_activity')
      .select('id, message, created_at')
      .order('created_at', { ascending: false })
      .limit(MAX_ENTRIES)
      .then(({ data, error }) => {
        if (error) {
          console.error('ActivityFeed fetch error:', error)
          return
        }
        if (data) {
          // Reverse so oldest is at top, newest at bottom
          setEntries([...data].reverse())
        }
      })

    // Subscribe to new inserts
    return setupVisibilityAwareChannel(() =>
      supabase
        .channel('game_activity_feed')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'game_activity' },
          (payload) => {
            const newEntry = payload.new as ActivityEntry
            setEntries((prev) => {
              const updated = [...prev, newEntry]
              // Keep max 20 displayed
              return updated.length > MAX_ENTRIES ? updated.slice(updated.length - MAX_ENTRIES) : updated
            })
          }
        )
        .subscribe()
    )
  }, [])

  return (
    <div style={styles.container}>
      <p style={styles.title}>📋 Activity Feed</p>
      <div style={styles.feed}>
        {entries.length === 0 ? (
          <p style={styles.emptyText}>No activity yet. Play a game to get started!</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} style={styles.entry}>
              <span style={styles.timestamp}>{formatTimestamp(entry.created_at)}</span>
              <span style={styles.message}>{entry.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#1a1a1a',
    borderRadius: 12,
    padding: '20px 24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    border: '1px solid #2a2a2a',
    width: '100%',
    maxWidth: 480,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: 13,
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  feed: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 240,
    overflowY: 'auto',
    paddingRight: 4,
  },
  entry: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 8,
    background: '#111',
  },
  timestamp: {
    fontSize: 11,
    color: '#6b7280',
    flexShrink: 0,
    paddingTop: 1,
  },
  message: {
    fontSize: 13,
    color: '#e5e7eb',
    lineHeight: 1.4,
  },
  emptyText: {
    margin: 0,
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    padding: '16px 0',
  },
}
