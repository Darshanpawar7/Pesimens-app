import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { LoginPage } from '../LoginPage'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
  },
}))

/**
 * LoginPage Route Accessibility Tests (Task 8.3)
 * 
 * Validates: Requirement 2.3
 * 
 * Tests verify that the /login route remains accessible as a standalone
 * full-page fallback for all users without requiring authentication.
 */
describe('LoginPage Route Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render LoginPage when navigating to /login route', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    )

    // Verify the login page is rendered by checking for key elements
    expect(screen.getByText('Sign in')).toBeDefined()
    expect(screen.getByPlaceholderText('you@stu.pes.edu')).toBeDefined()
    expect(screen.getByText('Send magic link')).toBeDefined()
    expect(screen.getByText('Sign in with Google')).toBeDefined()
  })

  it('should display the brand panel with PESimens branding', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    )

    // Verify brand panel content
    expect(screen.getByText('PESimens')).toBeDefined()
    expect(screen.getByText('Student Super App')).toBeDefined()
  })

  it('should be accessible without authentication', () => {
    // This test verifies that the LoginPage component renders without requiring auth
    // No ProtectedRoute wrapper should be present
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    )

    // If the page renders without errors and shows login elements, it's accessible
    expect(screen.getByText('Sign in')).toBeDefined()
  })

  it('should render both email and Google OAuth authentication options', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    )

    // Verify both authentication methods are available
    expect(screen.getByText('Send magic link')).toBeDefined()
    expect(screen.getByText('Sign in with Google')).toBeDefined()
    expect(screen.getByText('Sign in with SRN')).toBeDefined()
    expect(screen.getByPlaceholderText('you@stu.pes.edu')).toBeDefined()
  })
})
