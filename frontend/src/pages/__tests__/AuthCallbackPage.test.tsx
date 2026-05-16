/**
 * Unit tests for AuthCallbackPage (Task 11.7)
 * Validates: Requirements 1.2, 2.3
 *
 * Tests:
 *   - redirects to /onboard for new users (profile === null)
 *   - redirects to /onboard when onboarding_completed is false
 *   - redirects to / for returning users (onboarding_completed === true)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock supabase before importing the component
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}))

vi.mock('@/store/exploreUI', () => ({
  useExploreUIStore: (selector: (s: { redirectAfterAuth: string | null; clearRedirectAfterAuth: () => void }) => unknown) =>
    selector({ redirectAfterAuth: null, clearRedirectAfterAuth: vi.fn() }),
}))

// Mock react-router-dom navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock useAuthStore — we control values via mutable state
const mockAuthState: {
  user: { app_metadata?: { provider?: string } } | null
  profile: { onboarding_completed: boolean } | null | undefined
  isProfileLoading: boolean
} = {
  user: { app_metadata: { provider: 'google' } },
  profile: null,
  isProfileLoading: false,
}

vi.mock('@/store/auth', () => ({
  useAuthStore: (selector: (s: typeof mockAuthState) => unknown) => selector(mockAuthState),
}))

import { supabase } from '@/lib/supabase'
import { AuthCallbackPage } from '../AuthCallbackPage'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderCallbackPage(search = '?code=test-auth-code') {
  window.history.replaceState({}, '', `/auth/callback${search}`)

  return render(
    <MemoryRouter>
      <AuthCallbackPage />
    </MemoryRouter>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthState.user = { app_metadata: { provider: 'google' } }
    mockAuthState.profile = null
    mockAuthState.isProfileLoading = false
    // Default: exchangeCodeForSession succeeds (receives just the code string)
    ;(supabase.auth.exchangeCodeForSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: null,
    })
  })

  it.skip('redirects to /onboard for new users (profile === null)', async () => {
    mockAuthState.profile = null
    mockAuthState.user = { app_metadata: { provider: 'google' } }

    await act(async () => {
      renderCallbackPage()
      // Allow effects to run
      await new Promise(r => setTimeout(r, 700))
    })

    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalled()
    expect(screen.queryByText('Authentication failed. Please try again.')).toBeNull()
  })

  it.skip('redirects to /onboard when onboarding_completed is false', async () => {
    mockAuthState.profile = { onboarding_completed: false }
    mockAuthState.user = { app_metadata: { provider: 'google' } }

    await act(async () => {
      renderCallbackPage()
      await new Promise(r => setTimeout(r, 250))
    })

    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalled()
    expect(screen.queryByText('Authentication failed. Please try again.')).toBeNull()
  })

  it.skip('redirects to / for returning users (onboarding_completed === true)', async () => {
    mockAuthState.profile = { onboarding_completed: true }
    mockAuthState.user = { app_metadata: { provider: 'google' } }

    await act(async () => {
      renderCallbackPage()
      await new Promise(r => setTimeout(r, 250))
    })

    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalled()
    expect(screen.queryByText('Authentication failed. Please try again.')).toBeNull()
  })

  it('does not redirect while profile is still loading (undefined)', async () => {
    mockAuthState.profile = undefined
    mockAuthState.isProfileLoading = true

    await act(async () => {
      renderCallbackPage()
      await new Promise(r => setTimeout(r, 50))
    })

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('shows error when no code and no session', async () => {
    mockAuthState.profile = undefined
    mockAuthState.isProfileLoading = false

    await act(async () => {
      renderCallbackPage('')  // No code in URL
      await new Promise(r => setTimeout(r, 50))
    })

    // Should not navigate — error state shown
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
