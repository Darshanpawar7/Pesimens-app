/**
 * Unit tests for LoginBottomSheet inline email magic link flow (Task 2.5)
 * and backdrop click to close (Task 2.8)
 * 
 * Validates: Requirements 9.9, 9.10, 9.13
 * 
 * Tests:
 *   - Email input toggles when "Use email magic link instead" is clicked
 *   - Email validation errors display correctly
 *   - signInWithOtp is called with correct parameters
 *   - Success message displays after email is sent
 *   - Backdrop click closes the sheet
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { LoginBottomSheet } from '../LoginBottomSheet'
import { useExploreUIStore } from '@/store/exploreUI'
import { supabase } from '@/lib/supabase'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
  },
}))

// Mock the explore UI store
vi.mock('@/store/exploreUI', () => ({
  useExploreUIStore: vi.fn(),
}))

const mockUseExploreUIStore = vi.mocked(useExploreUIStore)
const mockSignInWithOtp = vi.mocked(supabase.auth.signInWithOtp)

describe('LoginBottomSheet - Inline Email Magic Link Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock: sheet is open
    mockUseExploreUIStore.mockImplementation((selector: any) => {
      const state = {
        isLoginSheetOpen: true,
        closeLoginSheet: vi.fn(),
      }
      return selector(state)
    })
  })

  it('closes the sheet when backdrop is clicked', async () => {
    const mockCloseLoginSheet = vi.fn()
    
    mockUseExploreUIStore.mockImplementation((selector: any) => {
      const state = {
        isLoginSheetOpen: true,
        closeLoginSheet: mockCloseLoginSheet,
      }
      return selector(state)
    })
    
    render(
      <BrowserRouter>
        <LoginBottomSheet />
      </BrowserRouter>
    )
    
    // Find the backdrop element by test id
    const backdrop = screen.getByTestId('login-sheet-backdrop')
    
    // Click the backdrop
    fireEvent.click(backdrop)
    
    // Should call closeLoginSheet
    await waitFor(() => {
      expect(mockCloseLoginSheet).toHaveBeenCalledTimes(1)
    })
  })

  it('shows email input when "Use email magic link instead" is clicked', async () => {
    render(
      <BrowserRouter>
        <LoginBottomSheet />
      </BrowserRouter>
    )
    
    // Initially, email input should not be visible
    expect(screen.queryByPlaceholderText(/your.email@pesu.pes.edu/i)).toBeNull()
    
    // Click the "Use email magic link instead" button
    const emailLinkButton = screen.getByText(/Use email magic link instead/i)
    fireEvent.click(emailLinkButton)
    
    // Email input should now be visible
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/your.email@pesu.pes.edu/i)).toBeTruthy()
    })
  })

  it('displays validation error for empty email', async () => {
    render(
      <BrowserRouter>
        <LoginBottomSheet />
      </BrowserRouter>
    )
    
    // Open email input
    const emailLinkButton = screen.getByText(/Use email magic link instead/i)
    fireEvent.click(emailLinkButton)
    
    // Wait for email input to appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/your.email@pesu.pes.edu/i)).toBeTruthy()
    })
    
    // Submit without entering email
    const submitButton = screen.getByText(/Send magic link/i)
    fireEvent.click(submitButton)
    
    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid email address/i)).toBeTruthy()
    })
  })

  it('displays validation error for invalid email format', async () => {
    render(
      <BrowserRouter>
        <LoginBottomSheet />
      </BrowserRouter>
    )
    
    // Open email input
    const emailLinkButton = screen.getByText(/Use email magic link instead/i)
    fireEvent.click(emailLinkButton)
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/your.email@pesu.pes.edu/i)).toBeTruthy()
    })
    
    // Enter invalid email (missing domain extension)
    const emailInput = screen.getByPlaceholderText(/your.email@pesu.pes.edu/i)
    fireEvent.change(emailInput, { target: { value: 'invalid@email' } })
    
    // Submit
    const submitButton = screen.getByText(/Send magic link/i)
    fireEvent.click(submitButton)
    
    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid email address/i)).toBeTruthy()
    })
  })

  it('calls signInWithOtp with correct parameters for valid email', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null } as any)
    
    render(
      <BrowserRouter>
        <LoginBottomSheet />
      </BrowserRouter>
    )
    
    // Open email input
    const emailLinkButton = screen.getByText(/Use email magic link instead/i)
    fireEvent.click(emailLinkButton)
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/your.email@pesu.pes.edu/i)).toBeTruthy()
    })
    
    // Enter valid email
    const emailInput = screen.getByPlaceholderText(/your.email@pesu.pes.edu/i)
    fireEvent.change(emailInput, { target: { value: 'test@pesu.pes.edu' } })
    
    // Submit
    const submitButton = screen.getByText(/Send magic link/i)
    fireEvent.click(submitButton)
    
    // Should call signInWithOtp with correct parameters
    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: 'test@pesu.pes.edu',
        options: {
          emailRedirectTo: window.location.origin + '/auth/callback',
        },
      })
    })
  })

  it('displays success message after email is sent', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null } as any)
    
    render(
      <BrowserRouter>
        <LoginBottomSheet />
      </BrowserRouter>
    )
    
    // Open email input
    const emailLinkButton = screen.getByText(/Use email magic link instead/i)
    fireEvent.click(emailLinkButton)
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/your.email@pesu.pes.edu/i)).toBeTruthy()
    })
    
    // Enter valid email
    const emailInput = screen.getByPlaceholderText(/your.email@pesu.pes.edu/i)
    fireEvent.change(emailInput, { target: { value: 'test@pesu.pes.edu' } })
    
    // Submit
    const submitButton = screen.getByText(/Send magic link/i)
    fireEvent.click(submitButton)
    
    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/Check your email for a magic link/i)).toBeTruthy()
    })
  })

  it('displays rate limit error message', async () => {
    mockSignInWithOtp.mockResolvedValue({ 
      data: { user: null, session: null },
      error: { message: 'rate limit exceeded' } as any
    })
    
    render(
      <BrowserRouter>
        <LoginBottomSheet />
      </BrowserRouter>
    )
    
    // Open email input
    const emailLinkButton = screen.getByText(/Use email magic link instead/i)
    fireEvent.click(emailLinkButton)
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/your.email@pesu.pes.edu/i)).toBeTruthy()
    })
    
    // Enter valid email
    const emailInput = screen.getByPlaceholderText(/your.email@pesu.pes.edu/i)
    fireEvent.change(emailInput, { target: { value: 'test@pesu.pes.edu' } })
    
    // Submit
    const submitButton = screen.getByText(/Send magic link/i)
    fireEvent.click(submitButton)
    
    // Should show rate limit error
    await waitFor(() => {
      expect(screen.getByText(/Too many requests. Please wait 1 minute and try again/i)).toBeTruthy()
    })
  })

  it('displays generic Supabase error message', async () => {
    mockSignInWithOtp.mockResolvedValue({ 
      data: { user: null, session: null },
      error: { message: 'Invalid email domain' } as any
    })
    
    render(
      <BrowserRouter>
        <LoginBottomSheet />
      </BrowserRouter>
    )
    
    // Open email input
    const emailLinkButton = screen.getByText(/Use email magic link instead/i)
    fireEvent.click(emailLinkButton)
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/your.email@pesu.pes.edu/i)).toBeTruthy()
    })
    
    // Enter valid email
    const emailInput = screen.getByPlaceholderText(/your.email@pesu.pes.edu/i)
    fireEvent.change(emailInput, { target: { value: 'test@pesu.pes.edu' } })
    
    // Submit
    const submitButton = screen.getByText(/Send magic link/i)
    fireEvent.click(submitButton)
    
    // Should show the Supabase error message
    await waitFor(() => {
      expect(screen.getByText(/Invalid email domain/i)).toBeTruthy()
    })
  })

  it('displays network error message when request fails', async () => {
    mockSignInWithOtp.mockRejectedValue(new Error('Network error'))
    
    render(
      <BrowserRouter>
        <LoginBottomSheet />
      </BrowserRouter>
    )
    
    // Open email input
    const emailLinkButton = screen.getByText(/Use email magic link instead/i)
    fireEvent.click(emailLinkButton)
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/your.email@pesu.pes.edu/i)).toBeTruthy()
    })
    
    // Enter valid email
    const emailInput = screen.getByPlaceholderText(/your.email@pesu.pes.edu/i)
    fireEvent.change(emailInput, { target: { value: 'test@pesu.pes.edu' } })
    
    // Submit
    const submitButton = screen.getByText(/Send magic link/i)
    fireEvent.click(submitButton)
    
    // Should show network error message
    await waitFor(() => {
      expect(screen.getByText(/Unable to connect. Check your internet and try again/i)).toBeTruthy()
    })
  })
})
