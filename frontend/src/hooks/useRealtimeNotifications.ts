import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth'
import { useToast } from '../components/ui/use-toast'
import type { Notification } from './useNotifications'
import { setupVisibilityAwareChannel } from '../lib/realtimeVisibility'

export function useRealtimeNotifications() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const { toast } = useToast()

  useEffect(() => {
    if (!user?.id) return

    return setupVisibilityAwareChannel(() =>
      supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const n = payload.new as Notification
            // Invalidate queries so badge count and list update
            qc.invalidateQueries({ queryKey: ['notifications'] })
            // Show toast for new notification
            toast({
              variant: 'info',
              title: n.title,
              description: n.message,
            })
          }
        )
        .subscribe()
    )
  }, [user?.id, qc, toast])
}
