export type SignupAuthMethod = 'srn' | 'google' | 'email'

interface SourcePayload {
  source: string
  ts: number
}

const SOURCE_KEY = 'pesimens_signup_attribution_source'
const METHOD_KEY = 'pesimens_signup_attribution_method'
const SOURCE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

function readSourcePayload(): SourcePayload | null {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(SOURCE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as SourcePayload
    if (!parsed?.source || typeof parsed.source !== 'string' || typeof parsed.ts !== 'number') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function setSignupAttributionSource(source: string): void {
  if (typeof window === 'undefined' || !source) return

  const payload: SourcePayload = { source, ts: Date.now() }
  window.localStorage.setItem(SOURCE_KEY, JSON.stringify(payload))
}

export function getSignupAttributionSource(): string | null {
  const payload = readSourcePayload()
  if (!payload) return null

  if (Date.now() - payload.ts > SOURCE_MAX_AGE_MS) {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SOURCE_KEY)
    }
    return null
  }

  return payload.source
}

export function setSignupAuthMethod(method: SignupAuthMethod): void {
  if (typeof window === 'undefined') return

  window.sessionStorage.setItem(METHOD_KEY, method)
  window.localStorage.setItem(METHOD_KEY, method)
}

export function getSignupAuthMethod(): SignupAuthMethod | null {
  if (typeof window === 'undefined') return null

  const sessionValue = window.sessionStorage.getItem(METHOD_KEY)
  if (sessionValue === 'srn' || sessionValue === 'google' || sessionValue === 'email') {
    return sessionValue
  }

  const localValue = window.localStorage.getItem(METHOD_KEY)
  if (localValue === 'srn' || localValue === 'google' || localValue === 'email') {
    return localValue
  }

  return null
}

export function hasTrackedSignupCompleted(userId: string): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(`pesimens_signup_completed_tracked:${userId}`) === '1'
}

export function markSignupCompletedTracked(userId: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(`pesimens_signup_completed_tracked:${userId}`, '1')
}

export function clearSignupAttribution(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(SOURCE_KEY)
  window.localStorage.removeItem(METHOD_KEY)
  window.sessionStorage.removeItem(METHOD_KEY)
}
