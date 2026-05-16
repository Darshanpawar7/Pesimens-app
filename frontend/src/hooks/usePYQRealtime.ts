import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { setupVisibilityAwareChannel } from '@/lib/realtimeVisibility'

/**
 * Subscribes to approved PYQ inserts via Supabase Realtime.
 * Invalidates the ['pyqs'] React Query cache so the feed refreshes automatically.
 */
export function usePYQRealtime() {
  const queryClient = useQueryClient()

  useEffect(() => {
    return setupVisibilityAwareChannel(() =>
      supabase
        .channel('pyqs-feed')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'pyqs',
            filter: 'status=eq.approved',
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['pyqs'] })
          }
        )
        .subscribe()
    )
  }, [queryClient])
}
