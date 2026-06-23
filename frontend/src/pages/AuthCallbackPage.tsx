import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { useExploreUIStore } from '@/store/exploreUI'
import { setSignupAuthMethod } from '@/lib/signupAttribution'
import { API_URL } from '@/lib/api'
import { setPesimensAccessToken, hasValidPesimensAccessToken } from '@/lib/accessToken'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const profile = useAuthStore(s => s.profile)
  const isProfileLoading = useAuthStore(s => s.isProfileLoading)
  const setProfile = useAuthStore(s => s.setProfile)
  const setSession = useAuthStore(s => s.setSession)
  const setProfileLoading = useAuthStore(s => s.setProfileLoading)
  const redirectAfterAuth = useExploreUIStore(s => s.redirectAfterAuth)
  const clearRedirectAfterAuth = useExploreUIStore(s => s.clearRedirectAfterAuth)
  const [error, setError] = useState<{ message: string; isExpiredToken?: boolean } | null>(null)
  const [callbackComplete, setCallbackComplete] = useState(false)
  const [transitionLabel, setTransitionLabel] = useState('Signing you in...')
  const callbackExecutedRef = useRef(false)

  const handleCallback = useCallback(async () => {
    if (callbackExecutedRef.current) return
    callbackExecutedRef.current = true

    try {
      const params = new URLSearchParams(window.location.search)
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const code = params.get('code')
      const errorDescription = params.get('error_description') || params.get('error') ||
        hashParams.get('error_description') || hashParams.get('error')

      if (errorDescription) {
        const isExpired = errorDescription.toLowerCase().includes('expired') || errorDescription.toLowerCase().includes('invalid')
        setError({
          message: isExpired ? 'This login link has expired or is invalid.' : `Authentication failed. ${errorDescription}`,
          isExpiredToken: isExpired
        })
        setCallbackComplete(true)
        return
      }

      let session = null

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        const { data: { session: s } } = await supabase.auth.getSession()
        session = s
        if (!session) {
          console.error('Code exchange failed and no session present:', exchangeError?.message)
          setError({ message: 'Authentication failed. Please try again.' })
          setCallbackComplete(true)
          return
        }
        try {
          const cleanUrl = window.location.origin + window.location.pathname
          window.history.replaceState(null, document.title, cleanUrl)
        } catch { /* non-fatal */ }
      } else {
        const hashAccessToken = hashParams.get('access_token')
        const hashRefreshToken = hashParams.get('refresh_token')

        if (hashAccessToken && hashRefreshToken) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          })
          if (setSessionError) {
            setError({ message: 'Authentication failed. Please try again.' })
            setCallbackComplete(true)
            return
          }
        }

        let s = (await supabase.auth.getSession()).data.session
        if (!s) {
          for (let attempt = 0; attempt < 4; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 350))
            s = (await supabase.auth.getSession()).data.session
            if (s) break
          }
        }

        if (!s) {
          setError({ message: 'Authentication failed. No authorization code found.' })
          setCallbackComplete(true)
          return
        }
        session = s
      }

      // We have a session — hydrate the store immediately without waiting for
      // onAuthStateChange to fire asynchronously. This lets the redirect logic
      // run as soon as the profile fetch completes rather than waiting an extra
      // 200-500ms for the auth state listener.
      setSession(session)

      const provider = (session.user?.app_metadata?.provider as string | undefined)?.toLowerCase()
      if (provider === 'google' || provider === 'email') {
        setSignupAuthMethod(provider)
      }

      // Bootstrap PESIMENS token and fetch profile in parallel where possible.
      // For new users /api/auth/me returns 404 — that's fine, onboarding handles it.
      if (!hasValidPesimensAccessToken()) {
        try {
          const tokenRes = await fetch(`${API_URL}/api/auth/token`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
          if (tokenRes.ok) {
            const tokenJson = await tokenRes.json() as { ok: boolean; accessToken?: string }
            if (tokenJson.accessToken) setPesimensAccessToken(tokenJson.accessToken)
          }
        } catch { /* non-fatal */ }
      }

      // Fetch profile now — we have the PESIMENS token so the request will succeed.
      // AuthContext will also try this via onAuthStateChange but we race it here
      // so the callback page can redirect without waiting for the listener.
      const pesimensToken = hasValidPesimensAccessToken()
        ? (window as any).__pesimens_token ?? localStorage.getItem('pesimens_access_token')
        : null

      if (pesimensToken) {
        setProfileLoading(true)
        try {
          const meRes = await fetch(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${pesimensToken}` },
            credentials: 'include',
          })
          if (meRes.ok) {
            const meJson = await meRes.json() as { profile: any }
            setProfile(meJson.profile)
          } else if (meRes.status === 404) {
            // New user — no profile yet, onboarding will create it
            setProfile(null)
          }
        } catch { /* AuthContext will retry */ } finally {
          setProfileLoading(false)
        }
      }

      setCallbackComplete(true)
    } catch (err) {
      console.error('Callback error:', err)
      setError({ message: 'Something went wrong. Please try again.' })
      setCallbackComplete(true)
    }
  }, [setSession, setProfile, setProfileLoading])

  useEffect(() => {
    void handleCallback()
  }, [handleCallback])

  const [userWaitTimedOut, setUserWaitTimedOut] = useState(false)

  // Safety timeout: if user hasn't populated after 8s post-callback, proceed anyway
  useEffect(() => {
    if (!callbackComplete || user) return
    const t = window.setTimeout(() => setUserWaitTimedOut(true), 8000)
    return () => window.clearTimeout(t)
  }, [callbackComplete, user])

  // Redirect once we have enough info — profile loading done or timed out
  useEffect(() => {
    if (error) return
    if (!callbackComplete) return
    if (isProfileLoading) return
    if (!user && !userWaitTimedOut) return

    const provider = (user?.app_metadata?.provider as string | undefined)?.toLowerCase()
    const isOnboardingProvider = provider === 'google' || provider === 'email'

    if (profile === null) {
      if (isOnboardingProvider) {
        setTransitionLabel('Creating your profile...')
        const timer = window.setTimeout(() => {
          navigate('/onboard', { replace: true })
        }, 450)
        return () => window.clearTimeout(timer)
      }
      navigate('/', { replace: true })
    } else if (!profile.onboarding_completed && isOnboardingProvider) {
      navigate('/onboard', { replace: true })
    } else {
      const dest = redirectAfterAuth || sessionStorage.getItem('redirectAfterAuth')
      sessionStorage.removeItem('redirectAfterAuth')
      clearRedirectAfterAuth()
      navigate(dest || '/', { replace: true })
    }
  }, [isProfileLoading, profile, error, callbackComplete, navigate, redirectAfterAuth, clearRedirectAfterAuth, user, userWaitTimedOut])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="max-w-sm w-full rounded-2xl border border-slate-700 bg-slate-900 px-6 py-8 text-center shadow-[0_18px_42px_-34px_rgba(0,0,0,0.55)]">
          <div className="mb-4 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10">
            <span className="text-xl text-rose-500">⚠️</span>
          </div>
          <h2 className="mb-2 text-lg font-semibold text-white">Login Failed</h2>
          <p className="font-medium text-slate-400 mb-6">{error.message}</p>
          
          {error.isExpiredToken ? (
            <button
              onClick={() => navigate('/login')}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Resend magic link
            </button>
          ) : (
            <a href="/login" className="inline-block text-sm text-sky-400 hover:text-sky-300 transition-colors">
              Back to login
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 px-6 py-5 shadow-[0_18px_42px_-34px_rgba(0,0,0,0.55)]">
        <div className="h-8 w-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
        <p className="text-sm text-slate-400">{transitionLabel}</p>
      </div>
    </div>
  )
}
