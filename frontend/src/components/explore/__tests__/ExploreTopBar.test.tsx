/**
 * Unit tests for ExploreTopBar component (Task 4.1)
 * 
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 * 
 * Tests:
 *   - Component renders with correct brand label
 *   - Sign in button is present
 *   - Clicking sign in button calls openLoginSheet
 *   - Component has sticky positioning
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExploreTopBar } from '../ExploreTopBar'
import { useExploreUIStore } from '@/store/exploreUI'

// Mock the explore UI store
vi.mock('@/store/exploreUI', () => ({
  useExploreUIStore: vi.fn(),
}))

const mockUseExploreUIStore = vi.mocked(useExploreUIStore)

describe('ExploreTopBar', () => {
  const mockOpenLoginSheet = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseExploreUIStore.mockImplementation((selector: any) => {
      const state = {
        openLoginSheet: mockOpenLoginSheet,
      }
      return selector(state)
    })
  })

  it('renders the brand label "PESimens •"', () => {
    render(<ExploreTopBar />)
    
    expect(screen.getByText('PESimens •')).toBeTruthy()
  })

  it('renders the sign in button', () => {
    render(<ExploreTopBar />)
    
    const signInButton = screen.getByRole('button', { name: /sign in/i })
    expect(signInButton).toBeTruthy()
  })

  it('calls openLoginSheet when sign in button is clicked', () => {
    render(<ExploreTopBar />)
    
    const signInButton = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(signInButton)
    
    expect(mockOpenLoginSheet).toHaveBeenCalledTimes(1)
    expect(mockOpenLoginSheet).toHaveBeenCalledWith()
  })

  it('has sticky positioning at top of viewport', () => {
    const { container } = render(<ExploreTopBar />)
    
    const topBar = container.firstChild as HTMLElement
    expect(topBar.className).toContain('sticky')
    expect(topBar.className).toContain('top-0')
  })

  it('applies dark theme styling', () => {
    const { container } = render(<ExploreTopBar />)
    
    const topBar = container.firstChild as HTMLElement
    expect(topBar.className).toContain('bg-[#0f0f0f]')
    expect(topBar.className).toContain('border-white/10')
  })
})
