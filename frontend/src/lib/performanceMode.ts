export type PerformanceModePreference = 'auto' | 'on' | 'off'

const PERFORMANCE_MODE_KEY = 'pesimens.performanceMode'

function detectAutoLiteMode(): boolean {
  if (typeof window === 'undefined') return false

  const nav = navigator as Navigator & {
    deviceMemory?: number
    hardwareConcurrency?: number
    connection?: {
      saveData?: boolean
      effectiveType?: string
      downlink?: number
    }
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const lowCpu = (nav.hardwareConcurrency ?? 8) <= 4
  const lowMemory = typeof nav.deviceMemory === 'number' ? nav.deviceMemory <= 4 : false
  const saveData = Boolean(nav.connection?.saveData)
  const slowNetwork = /2g/.test((nav.connection?.effectiveType || '').toLowerCase()) ||
    (typeof nav.connection?.downlink === 'number' && nav.connection.downlink < 1.2)

  return prefersReducedMotion || lowCpu || lowMemory || saveData || slowNetwork
}

export function getPerformanceModePreference(): PerformanceModePreference {
  if (typeof window === 'undefined') return 'auto'

  const raw = window.localStorage.getItem(PERFORMANCE_MODE_KEY)
  if (raw === 'auto' || raw === 'on' || raw === 'off') return raw
  return 'auto'
}

export function setPerformanceModePreference(next: PerformanceModePreference): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PERFORMANCE_MODE_KEY, next)
}

export function resolvePerformanceLiteMode(preference: PerformanceModePreference): boolean {
  if (preference === 'on') return true
  if (preference === 'off') return false
  return detectAutoLiteMode()
}

export function applyPerformanceMode(preference: PerformanceModePreference): void {
  if (typeof window === 'undefined') return
  const root = document.documentElement
  const shouldUseLiteMode = resolvePerformanceLiteMode(preference)
  root.classList.toggle('performance-lite', shouldUseLiteMode)
}
