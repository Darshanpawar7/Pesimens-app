/**
 * Unit tests for AuthContext sync token (Task 15.3)
 * Validates: Requirements 2.8, 3.8
 *
 * Tests:
 *   - Sync token is now stored in httpOnly cookie (not localStorage)
 *   - Frontend no longer manages sync token refresh
 *   - Browser automatically sends cookie with requests
 *
 * Note: These tests verify that the frontend has removed localStorage
 * operations for sync tokens. The actual cookie management is handled
 * by the backend and browser.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock supabase — use vi.fn() inside factory (no top-level vars in factory)
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
}))

// Mock useAuthStore
vi.mock('@/store/auth', () => ({
  useAuthStore: () => ({
    setSession: vi.fn(),
    setProfile: vi.fn(),
    setLoading: vi.fn(),
    setProfileLoading: vi.fn(),
    clear: vi.fn(),
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

describe('AuthContext sync token (cookie-based)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    // Default: no active session
    ;(supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null },
    })
    // Default: onAuthStateChange returns a no-op unsubscribe
    ;(supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
    // Default: apiFetch returns profile data
    ;(apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({ profile: { id: 'user-1' } })
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('no sync token refresh calls - token managed by backend cookie', async () => {
    // Session exists
    ;(supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        session: { access_token: 'supabase-token', user: { id: 'user-1' } },
      },
    })

    await act(async () => {
      renderProvider()
      await new Promise(r => setTimeout(r, 50))
    })

    // Verify no refresh-sync-token calls were made
    const refreshCalls = (apiFetch as ReturnType<typeof vi.fn>).mock.calls.filter(
      (args: unknown[]) => typeof args[0] === 'string' && (args[0] as string).includes('refresh-sync-token')
    )
    expect(refreshCalls).toHaveLength(0)
  })

  it('no localStorage operations for sync token', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem')
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem')

    ;(supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        session: { access_token: 'supabase-token', user: { id: 'user-1' } },
      },
    })

    await act(async () => {
      renderProvider()
      await new Promise(r => setTimeout(r, 50))
    })

    // Verify no localStorage operations for sync token
    const syncTokenSetCalls = setItemSpy.mock.calls.filter(
      (args: unknown[]) => typeof args[0] === 'string' && args[0].includes('pesu_sync_token')
    )
    const syncTokenGetCalls = getItemSpy.mock.calls.filter(
      (args: unknown[]) => typeof args[0] === 'string' && args[0].includes('pesu_sync_token')
    )
    const syncTokenRemoveCalls = removeItemSpy.mock.calls.filter(
      (args: unknown[]) => typeof args[0] === 'string' && args[0].includes('pesu_sync_token')
    )

    expect(syncTokenSetCalls).toHaveLength(0)
    expect(syncTokenGetCalls).toHaveLength(0)
    expect(syncTokenRemoveCalls).toHaveLength(0)

    setItemSpy.mockRestore()
    getItemSpy.mockRestore()
    removeItemSpy.mockRestore()
  })

  it('signOut does not remove sync token from localStorage', async () => {
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem')

    ;(supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        session: { access_token: 'supabase-token', user: { id: 'user-1' } },
      },
    })

    await act(async () => {
      renderProvider()
      await new Promise(r => setTimeout(r, 50))
    })

    // Trigger sign out
    await act(async () => {
      const signOutCallback = (supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>).mock.calls[0][0]
      await signOutCallback('SIGNED_OUT', null)
    })

    // Verify no localStorage removal for sync token
    const syncTokenRemoveCalls = removeItemSpy.mock.calls.filter(
      (args: unknown[]) => typeof args[0] === 'string' && args[0].includes('pesu_sync_token')
    )
    expect(syncTokenRemoveCalls).toHaveLength(0)

    removeItemSpy.mockRestore()
  })
})
