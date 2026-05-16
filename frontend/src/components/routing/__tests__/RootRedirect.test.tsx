import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { RootRedirect } from '../RootRedirect'
import { useAuthStore } from '@/store/auth'

// Mock the auth store
vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn(),
}))

describe('RootRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading spinner when auth state is loading', () => {
    vi.mocked(useAuthStore).mockImplementation((selector: any) => {
      const state = { session: null, isLoading: true }
      return selector(state)
    })

    render(
      <BrowserRouter>
        <RootRedirect>
          <div>Home Page</div>
        </RootRedirect>
      </BrowserRouter>
    )

    // Should show loading spinner
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeTruthy()
  })

  it('redirects to /explore when user is not authenticated', () => {
    vi.mocked(useAuthStore).mockImplementation((selector: any) => {
      const state = { session: null, isLoading: false }
      return selector(state)
    })

    render(
      <BrowserRouter>
        <RootRedirect>
          <div>Home Page</div>
        </RootRedirect>
      </BrowserRouter>
    )

    // Should not render children
    expect(screen.queryByText('Home Page')).toBeNull()
  })

  it('renders children when user is authenticated', () => {
    vi.mocked(useAuthStore).mockImplementation((selector: any) => {
      const state = { 
        session: { user: { id: '123' } }, 
        isLoading: false 
      }
      return selector(state)
    })

    render(
      <BrowserRouter>
        <RootRedirect>
          <div>Home Page</div>
        </RootRedirect>
      </BrowserRouter>
    )

    // Should render children for authenticated users
    expect(screen.getByText('Home Page')).toBeTruthy()
  })
})
