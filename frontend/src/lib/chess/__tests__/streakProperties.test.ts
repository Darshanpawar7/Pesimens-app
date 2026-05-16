// Feature: chess-game, Property 20
// Feature: chess-game, Property 21

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { calculateNewStreak, getPreviousDay } from '../streakLogic'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a valid ISO date string 'YYYY-MM-DD' within a reasonable range. */
const dateArb = fc
  .integer({ min: 0, max: 3650 }) // up to ~10 years of offsets
  .map((offset) => {
    const base = new Date('2020-01-01T00:00:00Z')
    base.setUTCDate(base.getUTCDate() + offset)
    return base.toISOString().slice(0, 10)
  })

/** Generate a positive streak count. */
const streakArb = fc.integer({ min: 1, max: 365 })

// ─── Property 20: Daily challenge completion is idempotent ────────────────────
// Calling complete-challenge more than once on the same day must not increment
// the streak more than once.
// **Validates: Requirements 14.3**

describe('Property 20: Daily challenge completion is idempotent', () => {
  it('completing on the same day twice returns the same streak both times', () => {
    fc.assert(
      fc.property(dateArb, streakArb, (todayDate, _currentStreak) => {
        // First completion: lastCompletionDate is null (fresh user) or yesterday
        const firstResult = calculateNewStreak(null, 0, todayDate)

        // Second completion: lastCompletionDate is now todayDate (already completed)
        const secondResult = calculateNewStreak(todayDate, firstResult, todayDate)

        // Idempotent: second call must not change the streak
        expect(secondResult).toBe(firstResult)
      }),
      { numRuns: 100 }
    )
  })

  it('completing on the same day N times always returns the same streak', () => {
    fc.assert(
      fc.property(
        dateArb,
        streakArb,
        fc.integer({ min: 2, max: 10 }),
        (todayDate, initialStreak, repetitions) => {
          // Simulate: user already completed today with some streak
          let streak = initialStreak
          for (let i = 0; i < repetitions; i++) {
            streak = calculateNewStreak(todayDate, streak, todayDate)
          }
          // After any number of same-day calls, streak must equal initialStreak
          expect(streak).toBe(initialStreak)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('completing on the same day after a consecutive day does not double-increment', () => {
    fc.assert(
      fc.property(dateArb, streakArb, (todayDate, currentStreak) => {
        const yesterday = getPreviousDay(todayDate)

        // First completion today (consecutive from yesterday)
        const afterFirst = calculateNewStreak(yesterday, currentStreak, todayDate)
        expect(afterFirst).toBe(currentStreak + 1)

        // Second completion today (same day — idempotent)
        const afterSecond = calculateNewStreak(todayDate, afterFirst, todayDate)
        expect(afterSecond).toBe(afterFirst)
      }),
      { numRuns: 100 }
    )
  })
})

// ─── Property 21: Streak increments on consecutive days and resets on gap ─────
// After completing on day D:
//   - streak = (streak on D-1) + 1  if user also completed on D-1
//   - streak = 1                     if user did NOT complete on D-1
// **Validates: Requirements 14.4**

describe('Property 21: Streak increments on consecutive days and resets on gap', () => {
  it('consecutive day completion increments streak by exactly 1', () => {
    fc.assert(
      fc.property(dateArb, streakArb, (todayDate, currentStreak) => {
        const yesterday = getPreviousDay(todayDate)

        const newStreak = calculateNewStreak(yesterday, currentStreak, todayDate)

        expect(newStreak).toBe(currentStreak + 1)
      }),
      { numRuns: 100 }
    )
  })

  it('missing a day resets streak to 1 regardless of previous streak', () => {
    fc.assert(
      fc.property(
        dateArb,
        streakArb,
        fc.integer({ min: 2, max: 30 }), // gap in days (>1 means missed at least one day)
        (todayDate, currentStreak, gapDays) => {
          // Compute a lastCompletionDate that is gapDays before today
          const lastDate = new Date(todayDate + 'T00:00:00Z')
          lastDate.setUTCDate(lastDate.getUTCDate() - gapDays)
          const lastCompletionDate = lastDate.toISOString().slice(0, 10)

          const newStreak = calculateNewStreak(lastCompletionDate, currentStreak, todayDate)

          expect(newStreak).toBe(1)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('first ever completion (null lastDate) always starts streak at 1', () => {
    fc.assert(
      fc.property(dateArb, streakArb, (todayDate, currentStreak) => {
        const newStreak = calculateNewStreak(null, currentStreak, todayDate)
        expect(newStreak).toBe(1)
      }),
      { numRuns: 100 }
    )
  })

  it('streak after N consecutive days equals N', () => {
    fc.assert(
      fc.property(
        dateArb,
        fc.integer({ min: 1, max: 30 }),
        (startDate, days) => {
          let streak = 0
          let lastDate: string | null = null

          for (let i = 0; i < days; i++) {
            const currentDate = new Date(startDate + 'T00:00:00Z')
            currentDate.setUTCDate(currentDate.getUTCDate() + i)
            const dateStr = currentDate.toISOString().slice(0, 10)

            streak = calculateNewStreak(lastDate, streak, dateStr)
            lastDate = dateStr
          }

          expect(streak).toBe(days)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('streak resets to 1 after a gap in an otherwise consecutive sequence', () => {
    fc.assert(
      fc.property(
        dateArb,
        fc.integer({ min: 1, max: 10 }), // consecutive days before gap
        fc.integer({ min: 2, max: 5 }),   // gap size (>1 day)
        (startDate, consecutiveDays, gapDays) => {
          let streak = 0
          let lastDate: string | null = null

          // Build up a streak over consecutiveDays
          for (let i = 0; i < consecutiveDays; i++) {
            const d = new Date(startDate + 'T00:00:00Z')
            d.setUTCDate(d.getUTCDate() + i)
            const dateStr = d.toISOString().slice(0, 10)
            streak = calculateNewStreak(lastDate, streak, dateStr)
            lastDate = dateStr
          }

          expect(streak).toBe(consecutiveDays)

          // Skip gapDays, then complete again
          const afterGap = new Date(startDate + 'T00:00:00Z')
          afterGap.setUTCDate(afterGap.getUTCDate() + consecutiveDays + gapDays)
          const afterGapDate = afterGap.toISOString().slice(0, 10)

          const resetStreak = calculateNewStreak(lastDate, streak, afterGapDate)
          expect(resetStreak).toBe(1)
        }
      ),
      { numRuns: 100 }
    )
  })
})
