import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { LoginPage } from '../LoginPage'
import * as authHelpers from '@/lib/authHelpers'

// Mock the auth helpers
vi.mock('@/lib/authHelpers', () => ({
  signInWithSrnPassword: vi.fn(),
  sendMagicLink: vi.fn(),
  signInWithGoogle: vi.fn(),
  isValidSRN: vi.fn(),
  isValidEmail: vi.fn(),
  getAuthErrorMessage: vi.fn(),
  AUTH_ERROR_MESSAGES: {
    RATE_LIMIT: 'Too many requests. Please wait 1 minute and try again.',
    GOOGLE_FAILED: 'Google sign-in failed. Please try again.',
    NETWORK_ERROR: 'Unable to connect. Check your internet and try again.',
    INVALID_EMAIL: 'Please enter a valid email address.',
    INVALID_SRN: 'Please enter a valid SRN (example: PES2UG24CS123).',
    INVALID_CREDENTIALS: 'Invalid SRN or PESU Academy password.',
    SRN_LOGIN_FAILED: 'SRN login failed. Please try again.',
    MAGIC_LINK_FAILED: 'Could not send magic link. Please try again.',
    GENERIC: 'Something went wrong. Please try again.',
  },
}))

const renderLoginPage = (initialUrl = '/login') => {
  window.history.pushState({}, '', initialUrl)
  return render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the login page with all elements', () => {
      renderLoginPage()
      
      expect(screen.getByText('Sign in')).toBeInTheDocument()
      expect(screen.getAllByText(/Choose one of three sign-in options to continue/).length).toBeGreaterThan(0)
      expect(screen.getByLabelText('SRN')).toBeInTheDocument()
      expect(screen.getByLabelText('PESU password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in with srn/i })).toBeInTheDocument()
      expect(screen.getByLabelText('Email address')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send magic link/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
    })

    it('should render the brand panel with features', () => {
      renderLoginPage()
      
      expect(screen.getByText('PESimens')).toBeInTheDocument()
      expect(screen.getByText('Academic Power Tools')).toBeInTheDocument()
      expect(screen.getByText('Career And Growth')).toBeInTheDocument()
      expect(screen.getByText('Campus Social Layer')).toBeInTheDocument()
      expect(screen.getByText('Daily Productivity')).toBeInTheDocument()
    })
  })

  describe('SRN Login Flow', () => {
    it('should submit SRN + password successfully', async () => {
      vi.mocked(authHelpers.isValidSRN).mockReturnValue(true)
      vi.mocked(authHelpers.signInWithSrnPassword).mockResolvedValue({
        data: {
          accessToken: 'token',
          profile: {
            id: 'user-1',
            email: 'pes2ug24cs123@stu.pes.edu',
            onboarding_completed: true,
          },
        } as any,
        error: null,
      })

      renderLoginPage()

      fireEvent.change(screen.getByLabelText('SRN'), { target: { value: 'PES2UG24CS123' } })
      fireEvent.change(screen.getByLabelText('PESU password'), { target: { value: 'secret123' } })
      fireEvent.click(screen.getByRole('button', { name: /sign in with srn/i }))

      await waitFor(() => {
        expect(authHelpers.signInWithSrnPassword).toHaveBeenCalledWith('PES2UG24CS123', 'secret123')
      })
    })

    it('should show validation message for invalid SRN', async () => {
      vi.mocked(authHelpers.isValidSRN).mockReturnValue(false)

      renderLoginPage()

      fireEvent.change(screen.getByLabelText('SRN'), { target: { value: 'invalid' } })
      fireEvent.blur(screen.getByLabelText('SRN'))
      fireEvent.click(screen.getByRole('button', { name: /sign in with srn/i }))

      await waitFor(() => {
        expect(screen.getAllByText('Please enter a valid SRN (example: PES2UG24CS123).').length).toBeGreaterThan(0)
      })

      expect(authHelpers.signInWithSrnPassword).not.toHaveBeenCalled()
    })
  })

  describe('Magic Link Flow', () => {
    it('should handle successful magic link send', async () => {
      vi.mocked(authHelpers.isValidEmail).mockReturnValue(true)
      vi.mocked(authHelpers.sendMagicLink).mockResolvedValue({ data: {} as any, error: null })
      
      renderLoginPage()
      
      const emailInput = screen.getByLabelText('Email address')
      const submitButton = screen.getByRole('button', { name: /send magic link/i })
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(authHelpers.sendMagicLink).toHaveBeenCalledWith('test@example.com')
      })
      
      await waitFor(() => {
        expect(screen.getByText('Check your email for a magic link')).toBeInTheDocument()
        expect(screen.getByText(/We sent a sign-in link to/)).toBeInTheDocument()
      })
    })

    it('should show error for invalid email', async () => {
      vi.mocked(authHelpers.isValidEmail).mockReturnValue(false)
      
      renderLoginPage()
      
      const emailInput = screen.getByLabelText('Email address')
      const submitButton = screen.getByRole('button', { name: /send magic link/i })
      
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
      fireEvent.blur(emailInput)
      
      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument()
      })
      
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(authHelpers.sendMagicLink).not.toHaveBeenCalled()
      })
    })

    it('should handle magic link send error', async () => {
      vi.mocked(authHelpers.isValidEmail).mockReturnValue(true)
      vi.mocked(authHelpers.sendMagicLink).mockResolvedValue({ 
        data: null,
        error: { message: 'Network error' } as any
      })
      vi.mocked(authHelpers.getAuthErrorMessage).mockReturnValue('Unable to connect. Check your internet and try again.')
      
      renderLoginPage()
      
      const emailInput = screen.getByLabelText('Email address')
      const submitButton = screen.getByRole('button', { name: /send magic link/i })
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Unable to connect. Check your internet and try again.')).toBeInTheDocument()
      })
    })

    it('should show loading state during magic link send', async () => {
      vi.mocked(authHelpers.isValidEmail).mockReturnValue(true)
      vi.mocked(authHelpers.sendMagicLink).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: {} as any, error: null }), 100))
      )
      
      renderLoginPage()
      
      const emailInput = screen.getByLabelText('Email address')
      const submitButton = screen.getByRole('button', { name: /send magic link/i })
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Sending magic link...')).toBeInTheDocument()
      })
    })

    it('should allow resetting form after successful send', async () => {
      vi.mocked(authHelpers.isValidEmail).mockReturnValue(true)
      vi.mocked(authHelpers.sendMagicLink).mockResolvedValue({ data: {} as any, error: null })
      
      renderLoginPage()
      
      const emailInput = screen.getByLabelText('Email address')
      const submitButton = screen.getByRole('button', { name: /send magic link/i })
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Check your email for a magic link')).toBeInTheDocument()
      })
      
      const resetButton = screen.getByRole('button', { name: /use a different email/i })
      fireEvent.click(resetButton)
      
      await waitFor(() => {
        expect(screen.getByLabelText('Email address')).toBeInTheDocument()
        expect(screen.queryByText('Check your email for a magic link')).not.toBeInTheDocument()
      })
    })
  })

  describe('Google OAuth Flow', () => {
    it('should handle Google sign-in click', async () => {
      vi.mocked(authHelpers.signInWithGoogle).mockResolvedValue({ data: {} as any, error: null })
      
      renderLoginPage()
      
      const googleButton = screen.getByRole('button', { name: /sign in with google/i })
      fireEvent.click(googleButton)
      
      await waitFor(() => {
        expect(authHelpers.signInWithGoogle).toHaveBeenCalledWith(undefined)
      })
    })

    it('should handle Google sign-in error', async () => {
      vi.mocked(authHelpers.signInWithGoogle).mockResolvedValue({ 
        data: { provider: 'google' as any, url: null },
        error: { message: 'OAuth failed' } as any
      })
      
      renderLoginPage()
      
      const googleButton = screen.getByRole('button', { name: /sign in with google/i })
      fireEvent.click(googleButton)
      
      await waitFor(() => {
        expect(screen.getByText('Google sign-in failed. Please try again.')).toBeInTheDocument()
      })
    })

    it('should show loading state during Google sign-in', async () => {
      vi.mocked(authHelpers.signInWithGoogle).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: {} as any, error: null }), 100))
      )
      
      renderLoginPage()
      
      const googleButton = screen.getByRole('button', { name: /sign in with google/i })
      fireEvent.click(googleButton)
      
      await waitFor(() => {
        expect(googleButton).toBeDisabled()
      })
    })
  })

  describe('Error Messages', () => {
    it('should use AUTH_ERROR_MESSAGES constants', async () => {
      vi.mocked(authHelpers.isValidEmail).mockReturnValue(true)
      vi.mocked(authHelpers.sendMagicLink).mockResolvedValue({ 
        data: null,
        error: { message: 'rate limit exceeded' } as any
      })
      vi.mocked(authHelpers.getAuthErrorMessage).mockReturnValue(authHelpers.AUTH_ERROR_MESSAGES.RATE_LIMIT)
      
      renderLoginPage()
      
      const emailInput = screen.getByLabelText('Email address')
      const submitButton = screen.getByRole('button', { name: /send magic link/i })
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Too many requests. Please wait 1 minute and try again.')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      renderLoginPage()
      
      expect(screen.getByLabelText('Email address')).toBeInTheDocument()
    })

    it('should allow form submission with Enter key', async () => {
      vi.mocked(authHelpers.isValidEmail).mockReturnValue(true)
      vi.mocked(authHelpers.sendMagicLink).mockResolvedValue({ data: {} as any, error: null })
      
      renderLoginPage()
      
      const emailInput = screen.getByLabelText('Email address')
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.submit(emailInput.closest('form')!)
      
      await waitFor(() => {
        expect(authHelpers.sendMagicLink).toHaveBeenCalled()
      })
    })

    it('should disable buttons during loading', async () => {
      vi.mocked(authHelpers.isValidEmail).mockReturnValue(true)
      vi.mocked(authHelpers.sendMagicLink).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: {} as any, error: null }), 100))
      )
      
      renderLoginPage()
      
      const emailInput = screen.getByLabelText('Email address')
      const submitButton = screen.getByRole('button', { name: /send magic link/i })
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
    })
  })
})
