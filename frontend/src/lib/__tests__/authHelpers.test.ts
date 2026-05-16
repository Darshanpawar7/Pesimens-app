import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isValidSRN,
  signInWithSrnPassword,
  isValidEmail,
  sendMagicLink,
  signInWithGoogle,
  getAuthErrorMessage,
  AUTH_ERROR_MESSAGES,
} from '../authHelpers'
import { supabase } from '../supabase'
import { setPesimensAccessToken } from '../accessToken'

// Mock the supabase module
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
  },
}))

vi.mock('../accessToken', () => ({
  setPesimensAccessToken: vi.fn(),
}))

describe('authHelpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  describe('isValidEmail', () => {
    it('should return true for valid email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
      expect(isValidEmail('user+tag@example.com')).toBe(true)
      expect(isValidEmail('123@test.com')).toBe(true)
    })

    it('should return false for invalid email addresses', () => {
      expect(isValidEmail('')).toBe(false)
      expect(isValidEmail('notanemail')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('user@')).toBe(false)
      expect(isValidEmail('user@domain')).toBe(false)
      expect(isValidEmail('user @example.com')).toBe(false)
      expect(isValidEmail('user@exam ple.com')).toBe(false)
    })

    it('should trim whitespace before validation', () => {
      expect(isValidEmail('  test@example.com  ')).toBe(true)
      expect(isValidEmail('\ntest@example.com\n')).toBe(true)
    })

    it('should handle null and undefined gracefully', () => {
      // These will throw errors, which is expected behavior for invalid input types
      expect(() => isValidEmail(null as any)).toThrow()
      expect(() => isValidEmail(undefined as any)).toThrow()
    })
  })

  describe('isValidSRN', () => {
    it('should return true for valid SRN values', () => {
      expect(isValidSRN('PES2UG24CS123')).toBe(true)
      expect(isValidSRN('PES1PG23ME1234')).toBe(true)
      expect(isValidSRN('pes2ug24cs143')).toBe(true)
    })

    it('should return false for invalid SRN values', () => {
      expect(isValidSRN('')).toBe(false)
      expect(isValidSRN('PES2UG24C123')).toBe(false)
      expect(isValidSRN('ABC2UG24CS123')).toBe(false)
      expect(isValidSRN('PES2UG24CS12')).toBe(false)
    })
  })

  describe('signInWithSrnPassword', () => {
    it('should return invalid credentials message on 401', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ code: 'INVALID_CREDENTIALS' }),
      } as any)

      const result = await signInWithSrnPassword('PES2UG24CS123', 'wrong')

      expect(result.error?.message).toBe(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS)
    })

    it('should persist access token and return profile on success', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch')
      fetchSpy
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ accessToken: 'jwt-token' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => ({}),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ profile: { id: 'u1', email: 'u1@stu.pes.edu', onboarding_completed: true } }),
        } as any)

      const result = await signInWithSrnPassword('PES2UG24CS123', 'secret')

      expect(setPesimensAccessToken).toHaveBeenCalledWith('jwt-token')
      expect(result.data?.profile.id).toBe('u1')
      expect(result.error).toBeNull()
    })
  })

  describe('sendMagicLink', () => {
    it('should call supabase.auth.signInWithOtp with correct parameters', async () => {
      const mockResponse = { data: { user: null, session: null }, error: null }
      vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue(mockResponse as any)

      const email = 'test@example.com'
      await sendMagicLink(email)

      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: email,
        options: {
          emailRedirectTo: 'http://localhost:3000/auth/callback',
        },
      })
    })

    it('should trim email before sending', async () => {
      const mockResponse = { data: { user: null, session: null }, error: null }
      vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue(mockResponse as any)

      await sendMagicLink('  test@example.com  ')

      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: {
          emailRedirectTo: 'http://localhost:3000/auth/callback',
        },
      })
    })

    it('should return data on success', async () => {
      const mockData = { user: null, session: null }
      const mockResponse = { data: mockData, error: null }
      vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue(mockResponse)

      const result = await sendMagicLink('test@example.com')

      expect(result.data).toEqual(mockData)
      expect(result.error).toBeNull()
    })

    it('should return error on failure', async () => {
      const mockError = { message: 'Rate limit exceeded' }
      const mockResponse = { data: { user: null, session: null }, error: mockError }
      vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue(mockResponse as any)

      const result = await sendMagicLink('test@example.com')

      expect(result.error).toEqual(mockError)
    })

    it('should handle network errors', async () => {
      vi.mocked(supabase.auth.signInWithOtp).mockRejectedValue(
        new Error('Network error')
      )

      await expect(sendMagicLink('test@example.com')).rejects.toThrow('Network error')
    })
  })

  describe('signInWithGoogle', () => {
    it('should call supabase.auth.signInWithOAuth with correct parameters', async () => {
      const mockResponse = { data: { provider: 'google' as const, url: 'https://google.com' }, error: null }
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue(mockResponse as any)

      await signInWithGoogle()

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
        },
      })
    })

    it('should persist redirectPath to sessionStorage when provided', async () => {
      const mockResponse = { data: { provider: 'google' as const, url: 'https://google.com' }, error: null }
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue(mockResponse as any)

      const redirectPath = '/explore'
      await signInWithGoogle(redirectPath)

      expect(sessionStorage.getItem('redirectAfterAuth')).toBe(redirectPath)
    })

    it('should not persist to sessionStorage when redirectPath is not provided', async () => {
      const mockResponse = { data: { provider: 'google' as const, url: 'https://google.com' }, error: null }
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue(mockResponse as any)

      await signInWithGoogle()

      expect(sessionStorage.getItem('redirectAfterAuth')).toBeNull()
    })

    it('should not persist empty string redirectPath', async () => {
      const mockResponse = { data: { provider: 'google' as const, url: 'https://google.com' }, error: null }
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue(mockResponse as any)

      await signInWithGoogle('')

      // Empty string is falsy, so it won't be persisted
      expect(sessionStorage.getItem('redirectAfterAuth')).toBeNull()
    })

    it('should return data on success', async () => {
      const mockData = { provider: 'google' as const, url: 'https://google.com' }
      const mockResponse = { data: mockData, error: null }
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue(mockResponse as any)

      const result = await signInWithGoogle()

      expect(result.data).toEqual(mockData)
      expect(result.error).toBeNull()
    })

    it('should return error on failure', async () => {
      const mockError = { message: 'OAuth failed' }
      const mockResponse = { data: { provider: 'google' as const, url: null }, error: mockError }
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue(mockResponse as any)

      const result = await signInWithGoogle()

      expect(result.error).toEqual(mockError)
    })

    it('should handle network errors', async () => {
      vi.mocked(supabase.auth.signInWithOAuth).mockRejectedValue(
        new Error('Network error')
      )

      await expect(signInWithGoogle()).rejects.toThrow('Network error')
    })
  })

  describe('getAuthErrorMessage', () => {
    it('should return RATE_LIMIT message for rate limit errors', () => {
      const error = { message: 'Rate limit exceeded' }
      expect(getAuthErrorMessage(error)).toBe(AUTH_ERROR_MESSAGES.RATE_LIMIT)
    })

    it('should return RATE_LIMIT message for case-insensitive rate limit errors', () => {
      const error = { message: 'RATE LIMIT EXCEEDED' }
      expect(getAuthErrorMessage(error)).toBe(AUTH_ERROR_MESSAGES.RATE_LIMIT)
    })

    it('should return NETWORK_ERROR message for network errors', () => {
      const error = { message: 'Network request failed' }
      expect(getAuthErrorMessage(error)).toBe(AUTH_ERROR_MESSAGES.NETWORK_ERROR)
    })

    it('should return NETWORK_ERROR message for fetch errors', () => {
      const error = { message: 'Fetch failed' }
      expect(getAuthErrorMessage(error)).toBe(AUTH_ERROR_MESSAGES.NETWORK_ERROR)
    })

    it('should return error message for unrecognized errors', () => {
      const error = { message: 'Some other error' }
      expect(getAuthErrorMessage(error)).toBe('Some other error')
    })

    it('should return GENERIC message for null error', () => {
      expect(getAuthErrorMessage(null)).toBe(AUTH_ERROR_MESSAGES.GENERIC)
    })

    it('should return GENERIC message for undefined error', () => {
      expect(getAuthErrorMessage(undefined)).toBe(AUTH_ERROR_MESSAGES.GENERIC)
    })

    it('should return GENERIC message for error without message property', () => {
      const error = {}
      expect(getAuthErrorMessage(error)).toBe(AUTH_ERROR_MESSAGES.GENERIC)
    })

    it('should return GENERIC message for error with empty message', () => {
      const error = { message: '' }
      expect(getAuthErrorMessage(error)).toBe(AUTH_ERROR_MESSAGES.GENERIC)
    })

    it('should handle error objects with non-string message', () => {
      const error = { message: 123 }
      // Non-string messages will cause toLowerCase to fail, returning the original message
      expect(getAuthErrorMessage(error as any)).toBe(123)
    })
  })

  describe('AUTH_ERROR_MESSAGES constants', () => {
    it('should have all required error message constants', () => {
      expect(AUTH_ERROR_MESSAGES.RATE_LIMIT).toBeDefined()
      expect(AUTH_ERROR_MESSAGES.GOOGLE_FAILED).toBeDefined()
      expect(AUTH_ERROR_MESSAGES.NETWORK_ERROR).toBeDefined()
      expect(AUTH_ERROR_MESSAGES.INVALID_EMAIL).toBeDefined()
      expect(AUTH_ERROR_MESSAGES.MAGIC_LINK_FAILED).toBeDefined()
      expect(AUTH_ERROR_MESSAGES.GENERIC).toBeDefined()
    })

    it('should have user-friendly error messages', () => {
      expect(AUTH_ERROR_MESSAGES.RATE_LIMIT).toContain('wait')
      expect(AUTH_ERROR_MESSAGES.GOOGLE_FAILED).toContain('Google')
      expect(AUTH_ERROR_MESSAGES.NETWORK_ERROR).toContain('internet')
      expect(AUTH_ERROR_MESSAGES.INVALID_EMAIL).toContain('valid email')
      expect(AUTH_ERROR_MESSAGES.MAGIC_LINK_FAILED).toContain('magic link')
      expect(AUTH_ERROR_MESSAGES.GENERIC).toContain('try again')
    })

    it('should be immutable (readonly) at TypeScript level', () => {
      // TypeScript enforces immutability at compile time with 'as const'
      // At runtime, JavaScript objects are mutable unless frozen
      // This test verifies the constant exists and has the expected structure
      expect(typeof AUTH_ERROR_MESSAGES).toBe('object')
      expect(Object.keys(AUTH_ERROR_MESSAGES).length).toBeGreaterThan(0)
    })
  })

  describe('Edge cases and integration', () => {
    it('should handle concurrent sendMagicLink calls', async () => {
      const mockResponse = { data: { user: null, session: null }, error: null }
      vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue(mockResponse as any)

      const promises = [
        sendMagicLink('test1@example.com'),
        sendMagicLink('test2@example.com'),
        sendMagicLink('test3@example.com'),
      ]

      await Promise.all(promises)

      expect(supabase.auth.signInWithOtp).toHaveBeenCalledTimes(3)
    })

    it('should handle concurrent signInWithGoogle calls with different redirects', async () => {
      const mockResponse = { data: { provider: 'google' as const, url: 'https://google.com' }, error: null }
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue(mockResponse as any)

      await signInWithGoogle('/explore')
      await signInWithGoogle('/profile')

      // Last call should win
      expect(sessionStorage.getItem('redirectAfterAuth')).toBe('/profile')
    })

    it('should validate email before sending magic link in real usage', () => {
      const invalidEmail = 'notanemail'
      expect(isValidEmail(invalidEmail)).toBe(false)
      // In real usage, component should check isValidEmail before calling sendMagicLink
    })
  })
})
