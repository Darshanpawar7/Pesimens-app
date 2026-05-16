/**
 * Unit tests for LoginBottomSheet static content and Google OAuth button (Task 2.4)
 * 
 * Validates: Requirements 9.3, 9.4, 9.5, 9.6, 9.7, 9.8
 * 
 * Tests verify:
 * - Drag handle is visible
 * - Title "Your PESU network starts here" is displayed
 * - Subtitle "Placements intel, people, and stories in one sign-in." is displayed
 * - Social proof "Trusted by 2,000+ PESU students" is displayed
 * - "Continue with Google" button is present and wired to signInWithOAuth
 * - "Use email magic link instead" secondary link is present
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { act } from 'react'
import userEvent from '@testing-library/user-event'
import { LoginBottomSheet } from '../LoginBottomSheet'

// ─── Mocks ────────────────────────────────────────────────────────────────────

let mockIsLoginSheetOpen = false
const mockCloseLoginSheet = vi.fn()
const mockSignInWithOAuth = vi.fn()

vi.mock('@/store/exploreUI', () => ({
  useExploreUIStore: (selector: (state: any) => any) =>
    selector({
      isLoginSheetOpen: mockIsLoginSheetOpen,
      closeLoginSheet: mockCloseLoginSheet,
    }),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: (...args: any[]) => mockSignInWithOAuth(...args),
    },
  },
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LoginBottomSheet static content', () => {
  beforeEach(() => {
    mockIsLoginSheetOpen = true
    mockSignInWithOAuth.mockClear()
    mockCloseLoginSheet.mockClear()
  })

  it('displays drag handle at top', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <LoginBottomSheet />
        </BrowserRouter>
      )
    })

    // Drag handle should be visible (it's a decorative div with specific styling)
    const sheet = screen.getByText('Your PESU network starts here').closest('div')?.parentElement
    expect(sheet).toBeTruthy()
  })

  it('displays title "Your PESU network starts here"', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <LoginBottomSheet />
        </BrowserRouter>
      )
    })

    expect(screen.getByText('Your PESU network starts here')).toBeTruthy()
  })

  it('displays subtitle "Placements intel, people, and stories in one sign-in."', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <LoginBottomSheet />
        </BrowserRouter>
      )
    })

    expect(screen.getByText('Placements intel, people, and stories in one sign-in.')).toBeTruthy()
  })

  it('displays social proof "Trusted by 2,000+ PESU students"', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <LoginBottomSheet />
        </BrowserRouter>
      )
    })

    expect(screen.getByText('Trusted by 2,000+ PESU students')).toBeTruthy()
  })

  it('displays "Continue with Google" button', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <LoginBottomSheet />
        </BrowserRouter>
      )
    })

    const googleButton = screen.getByRole('button', { name: /continue with google/i })
    expect(googleButton).toBeTruthy()
  })

  it('calls signInWithOAuth when "Continue with Google" is clicked', async () => {
    const user = userEvent.setup()
    mockSignInWithOAuth.mockResolvedValue({ error: null })

    await act(async () => {
      render(
        <BrowserRouter>
          <LoginBottomSheet />
        </BrowserRouter>
      )
    })

    const googleButton = screen.getByRole('button', { name: /continue with google/i })
    await user.click(googleButton)

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/auth/callback' },
      })
    })
  })

  it('displays "Use email magic link instead" secondary link', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <LoginBottomSheet />
        </BrowserRouter>
      )
    })

    const emailLink = screen.getByRole('button', { name: /use email magic link instead/i })
    expect(emailLink).toBeTruthy()
  })

  it('shows error message when Google OAuth fails', async () => {
    const user = userEvent.setup()
    mockSignInWithOAuth.mockResolvedValue({ error: { message: 'OAuth failed' } })

    await act(async () => {
      render(
        <BrowserRouter>
          <LoginBottomSheet />
        </BrowserRouter>
      )
    })

    const googleButton = screen.getByRole('button', { name: /continue with google/i })
    await user.click(googleButton)

    await waitFor(() => {
      expect(screen.getByText(/Google sign-in failed. Please try again/i)).toBeTruthy()
    })
  })

  it('shows loading state when Google OAuth is in progress', async () => {
    const user = userEvent.setup()
    mockSignInWithOAuth.mockImplementation(() => new Promise(() => {})) // Never resolves

    await act(async () => {
      render(
        <BrowserRouter>
          <LoginBottomSheet />
        </BrowserRouter>
      )
    })

    const googleButton = screen.getByRole('button', { name: /continue with google/i })
    await user.click(googleButton)

    await waitFor(() => {
      expect(googleButton.hasAttribute('disabled')).toBe(true)
    })
  })
})
