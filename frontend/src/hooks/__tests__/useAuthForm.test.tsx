import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { useAuthForm } from '../useAuthForm'
import * as authHelpers from '@/lib/authHelpers'

// Mock the auth helpers
vi.mock('@/lib/authHelpers', () => ({
  signInWithSrnPassword: vi.fn(),
  sendMagicLink: vi.fn(),
  signInWithGoogle: vi.fn(),
  isValidEmail: vi.fn(),
  isValidSRN: vi.fn(() => true),
  getAuthErrorMessage: vi.fn(),
  AUTH_ERROR_MESSAGES: {
    RATE_LIMIT: 'Too many requests. Please wait 1 minute and try again.',
    GOOGLE_FAILED: 'Google sign-in failed. Please try again.',
    NETWORK_ERROR: 'Unable to connect. Check your internet and try again.',
    INVALID_EMAIL: 'Please enter a valid email address.',
    MAGIC_LINK_FAILED: 'Could not send magic link. Please try again.',
    GENERIC: 'Something went wrong. Please try again.',
  },
}))

// Wrapper component for router context
const createWrapper = (initialUrl = '/') => {
  window.history.pushState({}, '', initialUrl)
  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>{children}</BrowserRouter>
  )
}

describe('useAuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useAuthForm(), {
        wrapper: createWrapper(),
      })

      expect(result.current.email).toBe('')
      expect(result.current.emailTouched).toBe(false)
      expect(result.current.isSending).toBe(false)
      expect(result.current.sent).toBe(false)
      expect(result.current.sendError).toBe(null)
      expect(result.current.googleError).toBe(null)
      expect(result.current.isGoogleLoading).toBe(false)
      expect(result.current.showEmailError).toBe(false)
    })
  })

  describe('Email Validation', () => {
    it('should show email error when touched and invalid', () => {
      vi.mocked(authHelpers.isValidEmail).mockReturnValue(false)

      const { result } = renderHook(() => useAuthForm(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setEmail('invalid-email')
        result.current.setEmailTouched(true)
      })

      expect(result.current.showEmailError).toBe(true)
    })

    it('should not show email error when not touched', () => {
      vi.mocked(authHelpers.isValidEmail).mockReturnValue(false)

      const { result } = renderHook(() => useAuthForm(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setEmail('invalid-email')
      })

      expect(result.current.showEmailError).toBe(false)
    })

    it('should not show email error when email is empty', () => {
      const { result } = renderHook(() => useAuthForm(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setEmailTouched(true)
      })

      expect(result.current.showEmailError).toBe(false)
    })
  })

  describe('Magic Link Flow', () => {
    it('should handle successful magic link send', async () => {
      vi.mocked(authHelpers.isValidEmail).mockReturnValue(true)
      vi.mocked(authHelpers.sendMagicLink).mockResolvedValue({ data: {} as any, error: null })

      const { result } = renderHook(() => useAuthForm(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setEmail('test@example.com')
      })

      await act(async () => {
        await result.current.handleSendMagicLink({ preventDefault: vi.fn() } as any)
      })

      expect(authHelpers.sendMagicLink).toHaveBeenCalledWith('test@example.com')
      expect(result.current.sent).toBe(true)
      expect(result.current.sendError).toBe(null)
      expect(result.current.isSending).toBe(false)
    })

    it('should handle invalid email on submit', async () => {
      vi.mocked(authHelpers.isValidEmail).mockReturnValue(false)

      const { result } = renderHook(() => useAuthForm(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setEmail('invalid-email')
      })

      await act(async () => {
        await result.current.handleSendMagicLink({ preventDefault: vi.fn() } as any)
      })

      expect(authHelpers.sendMagicLink).not.toHaveBeenCalled()
      expect(result.current.sendError).toBe('Please enter a valid email address.')
      expect(result.current.emailTouched).toBe(true)
    })

    it('should handle magic link send error', async () => {
      vi.mocked(authHelpers.isValidEmail).mockReturnValue(true)
      vi.mocked(authHelpers.sendMagicLink).mockResolvedValue({
        data: null,
        error: { message: 'Network error' } as any,
      })
      vi.mocked(authHelpers.getAuthErrorMessage).mockReturnValue('Unable to connect. Check your internet and try again.')

      const { result } = renderHook(() => useAuthForm(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setEmail('test@example.com')
      })

      await act(async () => {
        await result.current.handleSendMagicLink({ preventDefault: vi.fn() } as any)
      })

      expect(result.current.sendError).toBe('Unable to connect. Check your internet and try again.')
      expect(result.current.sent).toBe(false)
    })

    it('should handle network exception', async () => {
      vi.mocked(authHelpers.isValidEmail).mockReturnValue(true)
      vi.mocked(authHelpers.sendMagicLink).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useAuthForm(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setEmail('test@example.com')
      })

      await act(async () => {
        await result.current.handleSendMagicLink({ preventDefault: vi.fn() } as any)
      })

      expect(result.current.sendError).toBe('Unable to connect. Check your internet and try again.')
      expect(result.current.isSending).toBe(false)
    })

    it('should set loading state during send', async () => {
      vi.mocked(authHelpers.isValidEmail).mockReturnValue(true)
      vi.mocked(authHelpers.sendMagicLink).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: {} as any, error: null }), 100))
      )

      const { result } = renderHook(() => useAuthForm(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setEmail('test@example.com')
      })

      act(() => {
        result.current.handleSendMagicLink({ preventDefault: vi.fn() } as any)
      })

      expect(result.current.isSending).toBe(true)

      await waitFor(() => {
        expect(result.current.isSending).toBe(false)
      })
    })
  })

  describe('Google OAuth Flow', () => {
    it('should handle successful Google sign-in', async () => {
      vi.mocked(authHelpers.signInWithGoogle).mockResolvedValue({ data: {} as any, error: null })

      const { result } = renderHook(() => useAuthForm(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.handleGoogleSignIn()
      })

      expect(authHelpers.signInWithGoogle).toHaveBeenCalledWith(undefined)
      expect(result.current.googleError).toBe(null)
    })

    it('should handle Google sign-in with redirect path', async () => {
      vi.mocked(authHelpers.signInWithGoogle).mockResolvedValue({ data: {} as any, error: null })

      const { result } = renderHook(() => useAuthForm('/explore'), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.handleGoogleSignIn()
      })

      expect(authHelpers.signInWithGoogle).toHaveBeenCalledWith('/explore')
    })

    it('should handle Google sign-in error', async () => {
      vi.mocked(authHelpers.signInWithGoogle).mockResolvedValue({
        data: { provider: 'google' as any, url: null },
        error: { message: 'OAuth failed' } as any,
      })

      const { result } = renderHook(() => useAuthForm(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.handleGoogleSignIn()
      })

      expect(result.current.googleError).toBe('Google sign-in failed. Please try again.')
      expect(result.current.isGoogleLoading).toBe(false)
    })

    it('should handle Google sign-in exception', async () => {
      vi.mocked(authHelpers.signInWithGoogle).mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useAuthForm(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.handleGoogleSignIn()
      })

      expect(result.current.googleError).toBe('Google sign-in failed. Please try again.')
      expect(result.current.isGoogleLoading).toBe(false)
    })

    it('should set loading state during Google sign-in', async () => {
      vi.mocked(authHelpers.signInWithGoogle).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: {} as any, error: null }), 100))
      )

      const { result } = renderHook(() => useAuthForm(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.handleGoogleSignIn()
      })

      expect(result.current.isGoogleLoading).toBe(true)
    })
  })

  describe('Form Reset', () => {
    it('should reset form state', async () => {
      vi.mocked(authHelpers.isValidEmail).mockReturnValue(true)
      vi.mocked(authHelpers.sendMagicLink).mockResolvedValue({ data: {} as any, error: null })

      const { result } = renderHook(() => useAuthForm(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setEmail('test@example.com')
      })

      await act(async () => {
        await result.current.handleSendMagicLink({ preventDefault: vi.fn() } as any)
      })

      expect(result.current.sent).toBe(true)

      act(() => {
        result.current.resetForm()
      })

      expect(result.current.sent).toBe(false)
      expect(result.current.sendError).toBe(null)
      expect(result.current.googleError).toBe(null)
    })
  })
})
