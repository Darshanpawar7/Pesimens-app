export type FeedDensityVariant = 'compact' | 'immersive'
export type FeedDensityPreference = 'auto' | FeedDensityVariant

export type FeedInteractionHistory = {
  event: number
  confession: number
  placement: number
  lastUpdatedAt: number
}

export const HOME_FEED_EXPERIMENT_ID = 'home-feed-density-v1'
export const FEED_INTERACTION_KEY = 'pesimens_home_feed_interactions_v1'
export const FEED_DENSITY_ASSIGNMENT_KEY = 'pesimens_home_feed_density_assigned_v1'
export const FEED_DENSITY_OVERRIDE_KEY = 'pesimens_home_feed_density_override_v1'

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

export function defaultInteractionHistory(): FeedInteractionHistory {
  return {
    event: 1,
    confession: 1,
    placement: 1,
    lastUpdatedAt: Date.now(),
  }
}

export function readInteractionHistory(): FeedInteractionHistory {
  try {
    const raw = localStorage.getItem(FEED_INTERACTION_KEY)
    if (!raw) return defaultInteractionHistory()
    const parsed = JSON.parse(raw) as Partial<FeedInteractionHistory>
    return {
      event: Math.max(1, Number(parsed.event ?? 1)),
      confession: Math.max(1, Number(parsed.confession ?? 1)),
      placement: Math.max(1, Number(parsed.placement ?? 1)),
      lastUpdatedAt: Number(parsed.lastUpdatedAt ?? Date.now()),
    }
  } catch {
    return defaultInteractionHistory()
  }
}

export function mergeInteractionHistory(
  localHistory: FeedInteractionHistory,
  remoteHistory?: Partial<FeedInteractionHistory> | null
): FeedInteractionHistory {
  if (!remoteHistory) return localHistory
  return {
    event: Math.max(1, Math.max(localHistory.event, Number(remoteHistory.event ?? 1))),
    confession: Math.max(1, Math.max(localHistory.confession, Number(remoteHistory.confession ?? 1))),
    placement: Math.max(1, Math.max(localHistory.placement, Number(remoteHistory.placement ?? 1))),
    lastUpdatedAt: Math.max(localHistory.lastUpdatedAt, Number(remoteHistory.lastUpdatedAt ?? 0), Date.now()),
  }
}

export function getDensityPreference(): FeedDensityPreference {
  try {
    const raw = localStorage.getItem(FEED_DENSITY_OVERRIDE_KEY)
    if (raw === 'compact' || raw === 'immersive' || raw === 'auto') return raw
    return 'auto'
  } catch {
    return 'auto'
  }
}

export function setDensityPreference(preference: FeedDensityPreference) {
  localStorage.setItem(FEED_DENSITY_OVERRIDE_KEY, preference)
}

export function getAssignedDensityVariant(userId?: string | null): FeedDensityVariant {
  try {
    const existing = localStorage.getItem(FEED_DENSITY_ASSIGNMENT_KEY)
    if (existing === 'compact' || existing === 'immersive') return existing

    const legacy = localStorage.getItem('pesimens_home_feed_density_v1')
    if (legacy === 'compact' || legacy === 'immersive') {
      localStorage.setItem(FEED_DENSITY_ASSIGNMENT_KEY, legacy)
      return legacy
    }

    const seed = userId ?? 'anonymous'
    const variant: FeedDensityVariant = hashString(seed) % 2 === 0 ? 'compact' : 'immersive'
    localStorage.setItem(FEED_DENSITY_ASSIGNMENT_KEY, variant)
    return variant
  } catch {
    return 'immersive'
  }
}

export function resolveDensityVariant(userId?: string | null): {
  variant: FeedDensityVariant
  preference: FeedDensityPreference
  experimentId: string
} {
  const preference = getDensityPreference()
  if (preference === 'compact' || preference === 'immersive') {
    return {
      variant: preference,
      preference,
      experimentId: HOME_FEED_EXPERIMENT_ID,
    }
  }

  return {
    variant: getAssignedDensityVariant(userId),
    preference,
    experimentId: HOME_FEED_EXPERIMENT_ID,
  }
}
