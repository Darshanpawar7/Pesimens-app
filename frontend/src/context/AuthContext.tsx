import { useEffect, useRef, useCallback, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { ApiError, apiFetch, API_URL } from '@/lib/api'
import {
  clearPesimensAccessToken,
  getPesimensAccessToken,
  hasValidPesimensAccessToken,
  setPesimensAccessToken,
} from '@/lib/accessToken'
import { useAuthStore, type Profile } from '@/store/auth'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setSession, setProfile, setLoading, setProfileLoading, clear } = useAuthStore()
  const profileFetchInFlight = useRef<Promise<void> | null>(null)
  const isMountedRef = useRef(true)

  /**
   * For Google OAuth users there is no PESU-login flow that stores
   * pesimens_access_token. We must exchange the Supabase JWT for a
   * PESIMENS token BEFORE calling /api/auth/me, otherwise the request
   * goes out with an empty Authorization header → 401.
   */
  const bootstrapPesimensTokenIfNeeded = useCallback(async (supabaseAccessToken: string) => {
    // Skip if a non-expired token already exists in memory/session scope.
    if (hasValidPesimensAccessToken()) {
      return
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${supabaseAccessToken}` },
      })
      if (!res.ok) return
      const json = await res.json() as { ok: boolean; accessToken?: string }
      if (json.accessToken) {
        setPesimensAccessToken(json.accessToken)
      }
    } catch {
      // Non-fatal: apiFetch will retry in getAuthHeaders()
    }
  }, [])

  const fetchProfile = useCallback(async (retryCount = 0) => {
    if (!isMountedRef.current) return
    setProfileLoading(true)
    try {
      const res = await apiFetch<{ profile: Profile }>('/api/auth/me')
      const profile = res.profile
      if (!isMountedRef.current) return
      // SRN/backend-token logins don't always have a Supabase browser session.
      // Keep route guards hydrated across refresh by restoring a minimal local session.
      if (!useAuthStore.getState().session) {
        setSession({ user: { id: profile.id, email: profile.email } } as any)
      }
      setProfile(profile)

      // Award daily login bonus (non-blocking)
      apiFetch('/api/karma/daily-login', { method: 'POST' }).catch(() => {
        // Silently fail - not critical
      })
    } catch (err) {
      if (!isMountedRef.current) return
      const message = err instanceof Error ? err.message : ''
      const isUnauthorized =
        (err instanceof ApiError && err.status === 401) ||
        /unauthorized|invalid or expired token/i.test(message)

      // On 401, always try to silently refresh before giving up.
      if (isUnauthorized && retryCount < 1) {
        try {
          const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
          })
          if (refreshRes.ok) {
            const refreshJson = await refreshRes.json() as { ok: boolean; accessToken?: string }
            if (refreshJson.accessToken) {
              setPesimensAccessToken(refreshJson.accessToken)
              return fetchProfile(retryCount + 1)
            }
          }
        } catch { /* fall through */ }
        await new Promise(r => setTimeout(r, 1000))
        return fetchProfile(retryCount + 1)
      }

      // Refresh also failed — only log out if there is truly no token left
      if (isUnauthorized) {
        const storedToken = getPesimensAccessToken()
        if (storedToken) {
          // Keep the user logged in with whatever profile we have
          if (!useAuthStore.getState().profile) setProfile(null)
          return
        }
        clearPesimensAccessToken()
        await supabase.auth.signOut()
        clear()
        return
      }

      // 404 = new user, profile not created yet — onboarding will handle it
      setProfile(null)
    } finally {
      if (!isMountedRef.current) return
      setProfileLoading(false)
      setLoading(false)
    }
  }, [setProfileLoading, setProfile, clear, setLoading, setSession])

  const ensureProfileLoaded = useCallback(async () => {
    if (profileFetchInFlight.current) {
      await profileFetchInFlight.current
      return
    }

    const task = fetchProfile()
    profileFetchInFlight.current = task
    try {
      await task
    } finally {
      profileFetchInFlight.current = null
    }
  }, [fetchProfile])

  useEffect(() => {
    isMountedRef.current = true

    // Keep the backend warm — ping /health every 8 min to prevent Render cold starts.
    // This runs only while the user has the app open (tab visible).
    const keepAlive = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetch(`${API_URL}/health`).catch(() => {})
      }
    }, 8 * 60 * 1000)

    // Restore session on mount
    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMountedRef.current) return
      setSession(data.session)
      if (data.session) {
        // Bootstrap PESIMENS token for Google OAuth users before profile fetch
        await bootstrapPesimensTokenIfNeeded(data.session.access_token)
        void ensureProfileLoaded()
      } else {
        // No Supabase session (common for SRN/backend-token auth):
        // still attempt backend profile bootstrap using access token or refresh cookie.
        if (hasValidPesimensAccessToken() || getPesimensAccessToken()) {
          void ensureProfileLoaded()
        } else {
          // No token in memory — try the refresh cookie before giving up
          try {
            const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
              method: 'POST',
              credentials: 'include',
            })
            if (refreshRes.ok) {
              const refreshJson = await refreshRes.json() as { ok: boolean; accessToken?: string }
              if (refreshJson.accessToken) {
                setPesimensAccessToken(refreshJson.accessToken)
                void ensureProfileLoaded()
                return
              }
            }
          } catch { /* no refresh cookie — user is genuinely logged out */ }
          setProfileLoading(false)
          setLoading(false)
        }
      }
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMountedRef.current) return
      setSession(session)
      if (session) {
        // Ensure PESIMENS token exists before profile fetch (critical for Google OAuth)
        await bootstrapPesimensTokenIfNeeded(session.access_token)
        // Skip profile fetch if AuthCallbackPage already loaded it — avoids duplicate /api/auth/me
        const alreadyLoaded = !!useAuthStore.getState().profile || useAuthStore.getState().isProfileLoading
        if (!alreadyLoaded) {
          void ensureProfileLoaded()
        }
      } else if (event === 'SIGNED_OUT') {
        // Only clear tokens on an explicit sign-out, not during a session swap
        clearPesimensAccessToken()
        clear()
      }
    })

    return () => {
      isMountedRef.current = false
      clearInterval(keepAlive)
      subscription.unsubscribe()
    }
  }, [bootstrapPesimensTokenIfNeeded, ensureProfileLoaded, setSession, setProfileLoading, setLoading, clear])

  // BUG FIX (Bug 1.5): Clear syncToken on logout
  // Requirements: 2.5, 3.5
  async function signOut() {
    await supabase.auth.signOut()
    clearPesimensAccessToken()
    clear()
  }

  async function refreshSyncToken(): Promise<boolean> {
    try {
      const accessToken = getPesimensAccessToken()
      if (!accessToken) {
        return false
      }

      const res = await fetch(`${API_URL}/api/auth/refresh-sync-token`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!res.ok) {
        return false
      }

      const json = await res.json() as { ok: boolean }
      return json.ok === true
    } catch {
      return false
    }
  }

  return (
    <AuthContext.Provider value={{ signOut, refreshProfile: fetchProfile, refreshSyncToken }}>
      {children}
    </AuthContext.Provider>
  )
}
