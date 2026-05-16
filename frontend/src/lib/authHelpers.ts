import { supabase } from './supabase'
import { API_URL } from './api'
import { setPesimensAccessToken } from './accessToken'
import type { Profile } from '@/store/auth'

// Error message constants
export const AUTH_ERROR_MESSAGES = {
  RATE_LIMIT: 'Too many requests. Please wait 1 minute and try again.',
  OVERLOADED: 'Login is busy right now. Please wait a few seconds and try again.',
  GOOGLE_FAILED: 'Google sign-in failed. Please try again.',
  NETWORK_ERROR: 'Unable to connect. Check your internet and try again.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_SRN: 'Please enter a valid SRN (example: PES2UG24CS123).',
  INVALID_CREDENTIALS: 'Invalid SRN or PESU Academy password.',
  SRN_LOGIN_FAILED: 'SRN login failed. Please try again.',
  MAGIC_LINK_FAILED: 'Could not send magic link. Please try again.',
  GENERIC: 'Something went wrong. Please try again.',
} as const

// Email validation
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function isValidSRN(srn: string): boolean {
  return /^PES\d[A-Z]{2}\d{2}[A-Z]{2}\d{3,4}$/i.test(srn.trim())
}

type SrnLoginSuccess = {
  accessToken: string
  profile: Profile
}

type SrnLoginProfileHint = {
  name?: string | null
  campus?: 'EC' | 'RR' | null
  degree?: string | null
  branch?: string | null
  semester?: number | string | null
}

type AuthErrorShape = {
  message: string
}

type PesimensAccessTokenClaims = {
  sub?: string
  email?: string
  role?: Profile['role']
  onboarding_completed?: boolean
}

function normalizeSemester(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return null
  if (parsed < 1 || parsed > 12) return null
  return parsed
}

function decodeAccessTokenClaims(token: string): PesimensAccessTokenClaims | null {
  try {
    const payloadPart = token.split('.')[1]
    if (!payloadPart) return null

    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    return JSON.parse(atob(padded)) as PesimensAccessTokenClaims
  } catch {
    return null
  }
}


function buildFallbackProfileFromToken(
  token: string,
  srnValue: string,
  profileHint?: SrnLoginProfileHint,
  onboardingCompleted = true,
): Profile | null {
  const claims = decodeAccessTokenClaims(token)
  if (!claims?.sub || !claims.email) return null

  const role: Profile['role'] = claims.role && ['student', 'mentor', 'admin', 'moderator', 'suspended'].includes(claims.role)
    ? claims.role
    : 'student'

  return {
    id: claims.sub,
    email: claims.email,
    display_name: profileHint?.name ?? null,
    roll_no: srnValue.trim().toUpperCase(),
    year: null,
    course: profileHint?.degree ?? null,
    campus: profileHint?.campus ?? null,
    degree: profileHint?.degree ?? null,
    branch: profileHint?.branch ?? null,
    semester: normalizeSemester(profileHint?.semester),
    role,
    karma: 0,
    current_streak: null,
    last_active_date: null,
    longest_streak: null,
    bio: null,
    avatar_url: null,
    date_of_birth: null,
    show_birthday: null,
    linkedin_url: null,
    instagram_url: null,
    github_username: null,
    portfolio_url: null,
    resume_url: null,
    skills: [],
    experiences: [],
    looking_for: [],
    headline: null,
    open_to_work: false,
    github_stars: 0,
    github_repos: 0,
    followers_count: 0,
    following_count: 0,
    onboarding_completed: claims.onboarding_completed ?? onboardingCompleted,
    created_at: new Date().toISOString(),
  }
}

// SRN + password login through backend auth endpoint.
export async function signInWithSrnPassword(srn: string, password: string): Promise<{ data: SrnLoginSuccess | null; error: AuthErrorShape | null }> {
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        srn: srn.trim().toUpperCase(),
        password,
      }),
    })

    const payload = await response.json().catch(() => ({} as Record<string, unknown>)) as {
      accessToken?: string
      error?: string
      message?: string
      code?: string
      profile?: SrnLoginProfileHint
    }

    if (!response.ok) {
      if (response.status === 401 || payload.code === 'INVALID_CREDENTIALS') {
        return { data: null, error: { message: AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS } }
      }
      if (response.status === 429 || payload.code === 'RATE_LIMIT_EXCEEDED') {
        return { data: null, error: { message: AUTH_ERROR_MESSAGES.RATE_LIMIT } }
      }
      if (response.status === 503 || payload.code === 'PESU_OVERLOADED') {
        return { data: null, error: { message: AUTH_ERROR_MESSAGES.OVERLOADED } }
      }
      return { data: null, error: { message: payload.error || payload.message || AUTH_ERROR_MESSAGES.SRN_LOGIN_FAILED } }
    }

    if (!payload.accessToken) {
      return { data: null, error: { message: AUTH_ERROR_MESSAGES.SRN_LOGIN_FAILED } }
    }

    setPesimensAccessToken(payload.accessToken)

    // Kick off PESU sync explicitly after SRN login — fire and forget.
    void fetch(`${API_URL}/api/pesu-sync/trigger`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${payload.accessToken}`,
      },
      body: JSON.stringify({ password }),
    }).catch(() => {})

    // Build profile immediately from the login response — no extra /api/auth/me
    // round-trip needed. AuthContext will refresh the full profile in the background
    // once the user lands on the dashboard.
    const loginProfileHint = payload.profile
    const resolvedProfile = buildFallbackProfileFromToken(
      payload.accessToken,
      srn,
      loginProfileHint,
      true,
    )

    if (!resolvedProfile) {
      return { data: null, error: { message: AUTH_ERROR_MESSAGES.SRN_LOGIN_FAILED } }
    }

    const mergedProfile: Profile = {
      ...resolvedProfile,
      display_name: resolvedProfile.display_name || loginProfileHint?.name || null,
      campus: resolvedProfile.campus || loginProfileHint?.campus || null,
      degree: resolvedProfile.degree || loginProfileHint?.degree || resolvedProfile.degree,
      branch: resolvedProfile.branch || loginProfileHint?.branch || null,
      semester: normalizeSemester(resolvedProfile.semester) ?? normalizeSemester(loginProfileHint?.semester),
    }

    return {
      data: {
        accessToken: payload.accessToken,
        profile: mergedProfile,
      },
      error: null,
    }
  } catch {
    return { data: null, error: { message: AUTH_ERROR_MESSAGES.NETWORK_ERROR } }
  }
}

// Send magic link — routes through backend to enforce per-email rate limiting
export async function sendMagicLink(email: string) {
  try {
    const response = await fetch(`${API_URL}/api/auth/email-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    })

    const payload = await response.json().catch(() => ({} as Record<string, unknown>)) as {
      ok?: boolean
      error?: string
      code?: string
    }

    if (!response.ok) {
      if (response.status === 429) {
        return { data: null, error: { message: AUTH_ERROR_MESSAGES.RATE_LIMIT } }
      }
      if (response.status === 400 && payload.error) {
        return { data: null, error: { message: payload.error } }
      }
      return { data: null, error: { message: AUTH_ERROR_MESSAGES.MAGIC_LINK_FAILED } }
    }

    return { data: { ok: true }, error: null }
  } catch {
    return { data: null, error: { message: AUTH_ERROR_MESSAGES.NETWORK_ERROR } }
  }
}

// Google OAuth sign-in
export async function signInWithGoogle(redirectPath?: string) {
  // Persist redirect path for post-OAuth navigation
  if (redirectPath) {
    sessionStorage.setItem('redirectAfterAuth', redirectPath)
  }
  try {
    const res = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/callback',
      },
    })

    // Some SDK/envs return a redirect URL we must navigate to.
    // Prefer a full-page navigation to avoid sandboxed iframe/popup issues.
    const data = (res as any).data
    const error = (res as any).error

    if (data && typeof data.url === 'string' && data.url.length > 0) {
      try {
        // Use replace so the callback URL isn't saved in history.
        window.location.replace(data.url)
        // Return early; navigation should take over.
        return { data, error: null }
      } catch {
        // If navigation is blocked, attempt a popup fallback
        const popup = window.open(data.url, '_blank', 'noopener')
        if (!popup) {
          return { data: null, error: { message: 'Popup blocked' } }
        }
        return { data: null, error: null }
      }
    }

    return { data, error }
  } catch (err: unknown) {
    // Network or Cloudflare 5xx (Supabase outage) can manifest here.
    const message = err instanceof Error ? err.message : String(err)
    return { data: null, error: { message } }
  }
}

// Standardized error message mapping
export function getAuthErrorMessage(error: any): string {
  if (!error) return AUTH_ERROR_MESSAGES.GENERIC
  
  // Ensure message is a string before calling toLowerCase
  const messageRaw = error.message
  if (typeof messageRaw !== 'string') {
    return messageRaw || AUTH_ERROR_MESSAGES.GENERIC
  }
  
  const message = messageRaw.toLowerCase()
  
  if (message.includes('rate limit')) {
    return AUTH_ERROR_MESSAGES.RATE_LIMIT
  }
  if (message.includes('network') || message.includes('fetch')) {
    return AUTH_ERROR_MESSAGES.NETWORK_ERROR
  }
  
  return messageRaw || AUTH_ERROR_MESSAGES.GENERIC
}
