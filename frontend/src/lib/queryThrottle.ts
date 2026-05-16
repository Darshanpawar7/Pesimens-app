import { getPerformanceModePreference } from './performanceMode'

type PollProfile = 'default' | 'interactive'
type RouteScope = string
type ThrottleLevel = 'none' | 'mild' | 'aggressive'

let interactionTrackingAttached = false
let lastInteractionAt = 0

const INTERACTION_EVENTS = [
  'pointerdown',
  'touchstart',
  'wheel',
  'keydown',
  'scroll',
] as const

function markInteraction() {
  lastInteractionAt = Date.now()
}

function ensureInteractionTracking() {
  if (typeof window === 'undefined' || interactionTrackingAttached) return

  const options: AddEventListenerOptions = { passive: true, capture: true }
  for (const eventName of INTERACTION_EVENTS) {
    window.addEventListener(eventName, markInteraction, options)
  }

  interactionTrackingAttached = true
  markInteraction()
}

function getConnectionState() {
  if (typeof navigator === 'undefined') {
    return { saveData: false, effectiveType: '', downlink: undefined as number | undefined }
  }

  const nav = navigator as Navigator & {
    connection?: {
      saveData?: boolean
      effectiveType?: string
      downlink?: number
    }
  }

  return {
    saveData: Boolean(nav.connection?.saveData),
    effectiveType: (nav.connection?.effectiveType || '').toLowerCase(),
    downlink: nav.connection?.downlink,
  }
}

function getHardwareState() {
  if (typeof navigator === 'undefined') {
    return { lowCpu: false, lowMemory: false }
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number
    hardwareConcurrency?: number
  }

  const lowCpu = (nav.hardwareConcurrency ?? 8) <= 4
  const lowMemory = typeof nav.deviceMemory === 'number' ? nav.deviceMemory <= 4 : false
  return { lowCpu, lowMemory }
}

function resolveThrottleLevel(): ThrottleLevel {
  if (typeof window === 'undefined') return 'none'

  const pref = getPerformanceModePreference()
  if (pref === 'off') return 'none'
  if (pref === 'on') return 'mild'

  const { saveData, effectiveType, downlink } = getConnectionState()
  const { lowCpu, lowMemory } = getHardwareState()

  const verySlowNetwork = effectiveType.includes('2g') || (typeof downlink === 'number' && downlink < 1.2)
  const somewhatSlowNetwork = effectiveType === '3g' || (typeof downlink === 'number' && downlink < 2.5)

  if (saveData || verySlowNetwork || (lowCpu && lowMemory)) return 'aggressive'
  if (somewhatSlowNetwork || lowCpu || lowMemory) return 'mild'
  return 'none'
}

function isUserActivelyInteracting(windowMs: number): boolean {
  ensureInteractionTracking()
  if (lastInteractionAt <= 0) return false
  return Date.now() - lastInteractionAt < windowMs
}

export function adaptiveRefetchInterval(baseMs: number, profile: PollProfile = 'default'): number {
  const level = resolveThrottleLevel()
  const capMultiplier = profile === 'interactive' ? 2 : 3

  const multiplier = level === 'aggressive'
    ? capMultiplier
    : level === 'mild'
      ? 1.5
      : 1

  return Math.round(baseMs * multiplier)
}

export function adaptiveRefetchIntervalWhenActive(
  baseMs: number,
  profile: PollProfile = 'default',
  options?: {
    suspendDuringInteraction?: boolean
    interactionWindowMs?: number
  }
): number | false {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return false
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false
  }

  if (options?.suspendDuringInteraction) {
    const windowMs = Math.max(1000, options.interactionWindowMs ?? 7000)
    if (isUserActivelyInteracting(windowMs)) {
      return false
    }
  }

  return adaptiveRefetchInterval(baseMs, profile)
}

export function adaptiveStaleTime(baseMs: number, profile: PollProfile = 'default'): number {
  const level = resolveThrottleLevel()
  const maxMultiplier = profile === 'interactive' ? 2.5 : 4

  const multiplier = level === 'aggressive'
    ? maxMultiplier
    : level === 'mild'
      ? 1.5
      : 1

  return Math.round(baseMs * multiplier)
}

export function adaptiveRefetchOnWindowFocus(
  baseEnabled = true,
  profile: PollProfile = 'default'
): boolean {
  if (!baseEnabled) return false

  const level = resolveThrottleLevel()
  if (level === 'none') return true
  if (level === 'aggressive') return false

  // On mild throttling, keep focus refetch only for interactive surfaces.
  return profile === 'interactive'
}

export function adaptiveRefetchOnReconnect(
  baseEnabled = true,
  profile: PollProfile = 'default'
): boolean {
  if (!baseEnabled) return false

  const level = resolveThrottleLevel()
  if (level === 'none') return true
  if (level === 'aggressive') return profile === 'interactive'
  return true
}

export function isPathInRouteScope(pathname: string, scopes: RouteScope[]): boolean {
  return scopes.some(scope => {
    if (scope === '/') return pathname === '/'
    return pathname === scope || pathname.startsWith(`${scope}/`)
  })
}

export function adaptiveQueryDefaults(): {
  refetchOnWindowFocus: boolean
  refetchOnReconnect: boolean
  retry: number
} {
  const level = resolveThrottleLevel()

  if (level === 'aggressive') {
    return {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 0,
    }
  }

  if (level === 'mild') {
    return {
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    }
  }

  return {
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
  }
}
