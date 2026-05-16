import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'

export function setupVisibilityAwareChannel(createChannel: () => RealtimeChannel): () => void {
  if (typeof document === 'undefined') {
    return () => {}
  }

  let channel: RealtimeChannel | null = null

  const subscribe = () => {
    if (document.visibilityState !== 'visible') return
    if (channel) return
    channel = createChannel()
  }

  const unsubscribe = () => {
    if (!channel) return
    supabase.removeChannel(channel)
    channel = null
  }

  const handleVisibility = () => {
    if (document.visibilityState !== 'visible') {
      unsubscribe()
    } else {
      subscribe()
    }
  }

  subscribe()
  document.addEventListener('visibilitychange', handleVisibility)

  return () => {
    document.removeEventListener('visibilitychange', handleVisibility)
    unsubscribe()
  }
}
