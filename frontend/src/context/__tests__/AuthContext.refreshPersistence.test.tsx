import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}))

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

vi.mock('@/lib/accessToken', () => ({
  clearPesimensAccessToken: vi.fn(),
  getPesimensAccessToken: vi.fn(),
  hasValidPesimensAccessToken: vi.fn(),
  setPesimensAccessToken: vi.fn(),
}))

import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api'
import { getPesimensAccessToken, hasValidPesimensAccessToken } from '@/lib/accessToken'
import { useAuthStore } from '@/store/auth'
import { AuthProvider } from '../AuthContext'

describe('AuthProvider refresh persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useAuthStore.setState({
      session: null,
      user: null,
      profile: null,
      isLoading: true,
      isProfileLoading: true,
    })

    ;(supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null },
    })

    ;(supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })

    ;(hasValidPesimensAccessToken as ReturnType<typeof vi.fn>).mockReturnValue(true)
    ;(getPesimensAccessToken as ReturnType<typeof vi.fn>).mockReturnValue('pesimens-jwt')

    ;(apiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      profile: {
        id: 'user-1',
        email: 'user1@stu.pes.edu',
        onboarding_completed: true,
      },
    })
  })

  it('restores profile and local session on refresh when Supabase session is null but backend token exists', async () => {
    render(
      <AuthProvider>
        <div>child</div>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/auth/me')
    })

    await waitFor(() => {
      const state = useAuthStore.getState()
      expect(state.profile?.id).toBe('user-1')
      expect(state.session?.user?.id).toBe('user-1')
      expect(state.isLoading).toBe(false)
      expect(state.isProfileLoading).toBe(false)
    })
  })
})
