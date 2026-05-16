import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { setupVisibilityAwareChannel } from '@/lib/realtimeVisibility'

/**
 * Subscribes to confession inserts/updates so the feed refreshes in realtime.
 * - INSERT on confessions: new anonymous post appears.
 * - UPDATE on confessions: upvote_count changes stay in sync.
 */
export function useConfessionsRealtime() {
  const queryClient = useQueryClient()

  useEffect(() => {
    return setupVisibilityAwareChannel(() =>
      supabase
        .channel('confessions-feed')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'confessions',
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['confessions'] })
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'confessions',
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['confessions'] })
          }
        )
        .subscribe()
    )
  }, [queryClient])
}
