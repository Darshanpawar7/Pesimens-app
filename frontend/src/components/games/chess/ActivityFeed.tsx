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
      .catch(err => console.error(err))