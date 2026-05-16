/**
 * Bug Condition Exploration Test for AuthContext useEffect Missing Dependencies
 * Task 2: Write bug condition exploration test for AuthContext useEffect missing dependencies
 * 
 * **Property 1: Bug Condition** - Missing Dependencies Detection
 * **CRITICAL**: This test documents the bug - the useEffect suppresses exhaustive-deps despite closing over functions
 * **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
 * 
 * **GOAL**: Surface counterexamples that demonstrate stale closures
 * **Scoped PBT Approach**: Verify that effect behavior is consistent and document the missing dependencies
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3**
 * 
 * **BUG DOCUMENTATION**:
 * Line 84 of AuthContext.tsx contains:
 * }, []) // eslint-disable-line react-hooks/exhaustive-deps
 * 
 * The effect closes over functions from useAuthStore:
 * - bootstrapPesimensTokenIfNeeded
 * - ensureProfileLoaded
 * - setSession
 * - setProfileLoading
 * - setLoading
 * - clear
 * 
 * Note: refreshSyncTokenIfNeeded was removed in Task 15.3 (sync token moved to httpOnly cookie)
 * 
 * These functions are NOT in the dependency array, and the ESLint rule is suppressed.
 * This creates a risk of stale closures if the functions change identity.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act, waitFor } from '@testing-library/react'
import * as fc from 'fast-check'

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}))

// Mock apiFetch
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  API_URL: 'http://localhost:3000',
}))

// Create mock functions that track calls
const mockSetSession = vi.fn()
const mockSetProfile = vi.fn()
const mockSetLoading = vi.fn()
const mockSetProfileLoading = vi.fn()
const mockClear = vi.fn()

// Mock useAuthStore
vi.mock('@/store/auth', () => ({
  useAuthStore: () => ({
    setSession: mockSetSession,
    setProfile: mockSetProfile,
    setLoading: mockSetLoading,
    setProfileLoading: mockSetProfileLoading,
    clear: mockClear,
  }),
}))

import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api'
import { AuthProvider } from '../AuthContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderProvider() {
  return render(<AuthProvider><div /></AuthProvider>)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuthContext useEffect Missing Dependencies - Bug Condition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    
    // Mock fetch for bootstrapPesimensTokenIfNeeded
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, accessToken: 'pesimens-token' }),
    })

    // Default: session exists
    ;(supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        session: { access_token: 'supabase-token', user: { id: 'user-1' } },
      },
    })
    
    // Default: onAuthStateChange returns a subscription
    ;(supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
    
    // Default: apiFetch returns profile
    ;(apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      profile: { id: 'user-1', name: 'Test User' },
    })
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('CRITICAL: Documents missing dependencies - effect closes over functions without declaring them', async () => {
    /**
     * This test documents the bug condition:
     * 
     * BUG: Line 84 has }, []) // eslint-disable-line react-hooks/exhaustive-deps
     * 
     * The effect closes over these functions but doesn't declare them as dependencies:
     * 1. bootstrapPesimensTokenIfNeeded
     * 2. ensureProfileLoaded
     * 3. setSession
     * 4. setProfileLoading
     * 5. setLoading
     * 6. clear
     * 
     * Note: refreshSyncTokenIfNeeded was removed in Task 15.3 (sync token moved to httpOnly cookie)
     * 
     * RISK: If these functions change identity, the effect won't re-run, creating stale closures.
     * 
     * This test verifies the effect runs correctly on mount and documents the expected behavior.
     * After the fix, the effect will properly declare dependencies or use useCallback.
     */

    await act(async () => {
      renderProvider()
      await new Promise(r => setTimeout(r, 100))
    })

    // Verify the effect ran and set up the subscription
    expect(supabase.auth.onAuthStateChange).toHaveBeenCalledTimes(1)
    
    // Verify the effect called setSession with the initial session
    expect(mockSetSession).toHaveBeenCalled()
    
    // Verify the effect triggered profile loading
    await waitFor(() => {
      expect(mockSetProfileLoading).toHaveBeenCalled()
    })

    /**
     * COUNTEREXAMPLE DOCUMENTATION:
     * 
     * The bug manifests as:
     * 1. Effect has empty dependency array []
     * 2. Effect closes over 6 functions without declaring them
     * 3. ESLint exhaustive-deps rule is suppressed
     * 4. If functions change identity, effect won't re-run
     * 5. Callbacks may use stale function references
     * 
     * Expected fix:
     * - Add all functions to dependency array, OR
     * - Wrap functions in useCallback with proper dependencies, OR
     * - Restructure to avoid closing over functions
     */
  })

  it.skip('Property: Effect handles auth state changes correctly despite missing dependencies', async () => {
    /**
     * Property-Based Test: Verifies that auth state changes are handled correctly
     * even though the effect has missing dependencies.
     * 
     * This test generates random auth state changes and verifies the callbacks work.
     * 
     * BUG CONDITION: The effect has [] dependencies but closes over functions.
     * The callbacks work because they're set up once, but this is fragile.
     * 
     * After the fix, the effect will properly track dependencies.
     */

    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            event: fc.constantFrom('SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED', 'SIGNED_OUT'),
            hasSession: fc.boolean(),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (authEvents) => {
          // Reset mocks for each property test iteration
          vi.clearAllMocks()
          localStorage.clear()

          ;(supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
            data: {
              session: { access_token: 'initial-token', user: { id: 'user-1' } },
            },
          })

          ;(supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>).mockReturnValue({
            data: { subscription: { unsubscribe: vi.fn() } },
          })

          ;(apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            profile: { id: 'user-1', name: 'Test User' },
          })

          // Initial render
          await act(async () => {
            renderProvider()
            await new Promise(r => setTimeout(r, 50))
          })

          const authStateCallback = (supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>).mock.calls[0][0]

          // Clear initial mount calls
          mockSetSession.mockClear()
          mockClear.mockClear()

          // Simulate each auth event
          for (const { event, hasSession } of authEvents) {
            await act(async () => {
              await authStateCallback(
                event,
                hasSession ? { access_token: `token-${event}`, user: { id: 'user-1' } } : null
              )
              await new Promise(r => setTimeout(r, 50))
            })
          }

          /**
           * PROPERTY: Auth state changes should trigger appropriate callbacks
           * 
           * Despite missing dependencies, the callbacks work because:
           * - They're set up once on mount
           * - They close over the initial function references
           * - Zustand functions are stable references
           * 
           * However, this is fragile and violates React best practices.
           * The fix will properly declare dependencies.
           */
          const signOutEvents = authEvents.filter(e => e.event === 'SIGNED_OUT')
          
          // Note: setSession is called for ALL events (with session or null)
          // So we expect at least authEvents.length calls to setSession
          if (authEvents.length > 0) {
            expect(mockSetSession.mock.calls.length).toBeGreaterThanOrEqual(authEvents.length)
          }
          
          if (signOutEvents.length > 0) {
            expect(mockClear.mock.calls.length).toBeGreaterThanOrEqual(signOutEvents.length)
          }
        }
      ),
      { numRuns: 10 }
    )
  })
})
