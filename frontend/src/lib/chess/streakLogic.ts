/**
 * Pure streak calculation logic for daily chess challenges.
 * No side effects — safe to test with property-based tests.
 */

/**
 * Calculate the new streak count after completing today's challenge.
 *
 * Rules:
 * - null lastCompletionDate → first ever completion → streak = 1
 * - lastCompletionDate === todayDate → already completed today (idempotent) → unchanged
 * - lastCompletionDate is yesterday → consecutive day → streak + 1
 * - anything else (gap) → reset → streak = 1
 */
export function calculateNewStreak(
  lastCompletionDate: string | null, // ISO date 'YYYY-MM-DD' or null
  currentStreak: number,
  todayDate: string // 'YYYY-MM-DD'
): number {
  // First ever completion
  if (lastCompletionDate === null) {
    return 1
  }

  // Already completed today — idempotent, no change
  if (lastCompletionDate === todayDate) {
    return currentStreak
  }

  // Check if lastCompletionDate is exactly yesterday
  const yesterday = getPreviousDay(todayDate)
  if (lastCompletionDate === yesterday) {
    return currentStreak + 1
  }

  // Gap — reset streak
  return 1
}

/**
 * Returns the ISO date string for the day before the given date.
 * e.g. '2024-03-15' → '2024-03-14'
 */
export function getPreviousDay(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00Z')
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

/**
 * Returns today's UTC date as 'YYYY-MM-DD'.
 */
export function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}
