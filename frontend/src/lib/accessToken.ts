const ACCESS_TOKEN_KEY = 'pesimens_access_token'

let inMemoryAccessToken: string | null = null

function readFromLocalStorage(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY)
  } catch {
    return null
  }
}

function readFromSessionStorage(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const token = window.sessionStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) return null
    // One-time migration from sessionStorage to localStorage
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token)
    window.sessionStorage.removeItem(ACCESS_TOKEN_KEY)
    return token
  } catch {
    return null
  }
}

function writeToLocalStorage(token: string | null): void {
  if (typeof window === 'undefined') return
  try {
    if (token) {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, token)
    } else {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY)
    }
  } catch {
    // Best-effort cache persistence.
  }
}

function tokenExpiryMs(token: string): number | null {
  try {
    const payloadPart = token.split('.')[1]
    if (!payloadPart) return null

    // JWT payload uses base64url encoding, so normalize before decoding.
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const payload = JSON.parse(atob(padded)) as { exp?: number }
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

export function isPesimensAccessTokenExpired(token: string): boolean {
  const expMs = tokenExpiryMs(token)
  if (!expMs) return true
  return expMs <= Date.now()
}

export function getPesimensAccessToken(): string | null {
  if (inMemoryAccessToken) return inMemoryAccessToken
  const stored = readFromLocalStorage()
  if (stored) {
    inMemoryAccessToken = stored
    return stored
  }
  // Try to migrate from sessionStorage (legacy browsers or old sessions)
  const legacy = readFromSessionStorage()
  if (legacy) {
    inMemoryAccessToken = legacy
    writeToLocalStorage(legacy)
    return legacy
  }
  return null
}

export function setPesimensAccessToken(token: string): void {
  inMemoryAccessToken = token
  writeToLocalStorage(token)
}

export function clearPesimensAccessToken(): void {
  inMemoryAccessToken = null
  writeToLocalStorage(null)
}

export function hasValidPesimensAccessToken(): boolean {
  const token = getPesimensAccessToken()
  return !!token && !isPesimensAccessTokenExpired(token)
}
