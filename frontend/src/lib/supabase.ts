import { createClient } from '@supabase/supabase-js'

const isTest = import.meta.env.MODE === 'test'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (isTest ? 'https://mock.supabase.co' : '')
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (isTest ? 'mock-anon-key' : '')

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    autoRefreshToken: true,
  },
})

// Disconnect Realtime when the user signs out, reconnect when they sign in.
// This prevents WebSocket connection errors on unauthenticated page loads.
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    supabase.realtime.disconnect()
  } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    supabase.realtime.connect()
  }
})
