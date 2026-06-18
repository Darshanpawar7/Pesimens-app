import { supabase } from './supabase'
import {
  clearPesimensAccessToken,
  getPesimensAccessToken,
  isPesimensAccessTokenExpired,
  setPesimensAccessToken,
} from './accessToken'

function resolveApiUrl() {
  const configured = import.meta.env.VITE_API_URL?.trim()
  if (configured) return configured.replace(/\/+$/, '')

  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    if (!isLocal) {
      return 'https://pesimens-backend.onrender.com'
    }
  }

  return 'http://localhost:4000'
}

export const API_URL = resolveApiUrl()

// CSRF token cache (Bug #1 fix)
let csrfToken: string | null = null
let csrfTokenExpiry: number = 0
let csrfTokenInFlight: Promise<string> | null = null

const CSRF_SERVER_MAX_AGE_MS = 24 * 60 * 60 * 1000
const CSRF_CLIENT_CACHE_TTL_MS = 60 * 60 * 1000
const CSRF_REFRESH_BUFFER_MS = 30 * 60 * 1000

function resetCsrfCache() {
  csrfToken = null
  csrfTokenExpiry = 0
  csrfTokenInFlight = null
}

function getCsrfTokenTimestampMs(token: string): number | null {
  const parts = token.split(':')
  if (parts.length !== 3) return null
  const timestampMs = Number.parseInt(parts[1], 10)
  return Number.isFinite(timestampMs) ? timestampMs : null
}

/**
 * Fetch CSRF token from backend
 * SECURITY FIX (Bug #1): CSRF secret moved to backend-only
 * Requirements: 2.1, 3.1
 */
async function getCsrfToken(): Promise<string> {
  const now = Date.now()

  // Return cached token while outside the refresh buffer.
  if (csrfToken && csrfTokenExpiry > now) {
    return csrfToken
  }

  if (csrfTokenInFlight) {
    return csrfTokenInFlight
  }

  csrfTokenInFlight = (async () => {
    let authHeaders = await getAuthHeaders()
    let response = await fetch(`${API_URL}/api/auth/csrf-token`, {
      headers: authHeaders,
      credentials: 'include',
    })

    if (response.status === 401 || response.status === 403) {
      authHeaders = await getAuthHeaders(true)
      response = await fetch(`${API_URL}/api/auth/csrf-token`, {
        headers: authHeaders,
        credentials: 'include',
      })
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch CSRF token (${response.status})`)
    }

    const data = await response.json() as { ok: boolean; token: string }
    csrfToken = data.token

    const tokenIssuedAtMs = getCsrfTokenTimestampMs(data.token)
    const serverExpiryMs = tokenIssuedAtMs ? tokenIssuedAtMs + CSRF_SERVER_MAX_AGE_MS : now + CSRF_SERVER_MAX_AGE_MS
    const cacheTargetMs = now + CSRF_CLIENT_CACHE_TTL_MS
    csrfTokenExpiry = Math.min(cacheTargetMs, serverExpiryMs - CSRF_REFRESH_BUFFER_MS)

    if (csrfTokenExpiry <= now) {
      csrfTokenExpiry = now + 5 * 60 * 1000
    }

    return csrfToken
  })().finally(() => {
    csrfTokenInFlight = null
  })

  return csrfTokenInFlight
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

let tokenRefreshInFlight: Promise<string | null> | null = null
let tokenRefreshBlockedUntil = 0
let tokenRefreshCooldownLoggedUntil = 0

function parseRetryAfterSeconds(value: string | null): number | null {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

async function refreshPesimensToken(): Promise<string | null> {
  if (Date.now() < tokenRefreshBlockedUntil) {
    if (Date.now() >= tokenRefreshCooldownLoggedUntil) {
      const remainingSeconds = Math.max(1, Math.ceil((tokenRefreshBlockedUntil - Date.now()) / 1000))
      console.warn(`[auth] refresh cooldown active for ${remainingSeconds}s; skipping /api/auth/refresh`)
      tokenRefreshCooldownLoggedUntil = Date.now() + 15 * 1000
    }
    return null
  }

  if (tokenRefreshInFlight) return tokenRefreshInFlight

  tokenRefreshInFlight = (async () => {
    try {
      const { data } = await supabase.auth.getSession()
      const supabaseToken = data.session?.access_token

      if (supabaseToken) {
        const res = await fetch(`${API_URL}/api/auth/token`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${supabaseToken}` },
        })
        if (res.ok) {
          const json = await res.json() as { ok: boolean; accessToken?: string }
          if (json.accessToken) {
            setPesimensAccessToken(json.accessToken)
            return json.accessToken
          }
        }
      }

      // Fallback for PESU-login sessions that rely on refresh_token cookie rotation.
      const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!refreshRes.ok) {
        if (refreshRes.status === 429) {
          const retryAfterSeconds = parseRetryAfterSeconds(refreshRes.headers.get('retry-after'))
            ?? parseRetryAfterSeconds(refreshRes.headers.get('x-ratelimit-reset'))
            ?? 30
          tokenRefreshBlockedUntil = Date.now() + (retryAfterSeconds * 1000)
          tokenRefreshCooldownLoggedUntil = 0
          console.warn(`[auth] refresh rate-limited by server; backing off for ${retryAfterSeconds}s`)
        }
        return null
      }

      const refreshJson = await refreshRes.json() as { ok: boolean; accessToken?: string }
      if (refreshJson.accessToken) {
        setPesimensAccessToken(refreshJson.accessToken)
        tokenRefreshBlockedUntil = 0
        tokenRefreshCooldownLoggedUntil = 0
        return refreshJson.accessToken
      }

      return null
    } catch {
      tokenRefreshBlockedUntil = Date.now() + 30 * 1000
      tokenRefreshCooldownLoggedUntil = 0
      clearPesimensAccessToken()
      return null
    } finally {
      tokenRefreshInFlight = null
    }
  })()

  return tokenRefreshInFlight
}

async function getAuthHeaders(forceRefresh = false): Promise<Record<string, string>> {
  let pesimensToken = getPesimensAccessToken()

  // Refresh if token is expired/missing or when caller explicitly requests refresh.
  if (forceRefresh || !pesimensToken || isPesimensAccessTokenExpired(pesimensToken)) {
    pesimensToken = await refreshPesimensToken()
  }

  if (pesimensToken && !isPesimensAccessTokenExpired(pesimensToken)) {
    return { Authorization: `Bearer ${pesimensToken}` }
  }

  // No valid PESIMENS token — return empty headers so the caller gets a 401
  // and handles re-auth. Do NOT fall back to the Supabase JWT; the backend
  // authenticate middleware expects a PESIMENS HS256 token, not a Supabase JWT.
  return {}
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const method = options.method?.toUpperCase() ?? 'GET'
  const requiresCsrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

  async function doRequest(forceAuthRefresh = false): Promise<Response> {
    const authHeaders = await getAuthHeaders(forceAuthRefresh)
    const isFormData = options.body instanceof FormData
    const hasBody = options.body !== undefined && options.body !== null
    const contentTypeHeader: Record<string, string> =
      isFormData || !hasBody ? {} : { 'Content-Type': 'application/json' }

    const csrfHeader: Record<string, string> = {}
    if (requiresCsrf) {
      const token = await getCsrfToken().catch((error) => {
        throw new ApiError(503, `Unable to prepare secure request: ${error instanceof Error ? error.message : 'CSRF unavailable'}`)
      })
      csrfHeader['X-CSRF-Token'] = token
    }

    return fetch(`${API_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        ...contentTypeHeader,
        ...authHeaders,
        ...csrfHeader,
        ...(options.headers as Record<string, string> | undefined),
      },
    })
  }

  let res = await doRequest(false)

  if (!res.ok && requiresCsrf && res.status === 403) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    const message = String(err.error || err.message || '')
    if (message.toLowerCase().includes('csrf')) {
      resetCsrfCache()
      res = await doRequest(true)
    } else {
      throw new ApiError(res.status, message || `Request failed: ${res.status}`)
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    const message = err.error || err.message || `Request failed: ${res.status}`
    throw new ApiError(res.status, message)
  }

  return res.json() as Promise<T>
}
