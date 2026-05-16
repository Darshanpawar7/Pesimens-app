import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { setupVisibilityAwareChannel } from '../lib/realtimeVisibility'

/**
 * Subscribes to event table changes and invalidates the React Query cache
 * so lists and detail views stay fresh without manual refresh.
 */
export function useRealtimeEvents() {
  const qc = useQueryClient()

  useEffect(() => {
    return setupVisibilityAwareChannel(() =>
      supabase
        .channel('events-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'events' },
          (payload) => {
            // Invalidate list
            qc.invalidateQueries({ queryKey: ['events'] })
            // Invalidate specific event if we have the id
            const id = (payload.new as { id?: string })?.id ?? (payload.old as { id?: string })?.id
            if (id) qc.invalidateQueries({ queryKey: ['events', id] })
          }
        )
        .subscribe()
    )
  }, [qc])
}
