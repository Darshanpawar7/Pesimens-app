/**
 * Unit tests for ExploreBottomNav component (Task 4.5)
 * 
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5
 * 
 * Tests:
 *   - Component renders all 5 tabs
 *   - Explore tab is highlighted as active
 *   - Protected tabs trigger openLoginSheet when clicked
 *   - Explore tab does not trigger openLoginSheet
 *   - Component applies dark theme styling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExploreBottomNav } from '../ExploreBottomNav'
import { useExploreUIStore } from '@/store/exploreUI'

// Mock the explore UI store
vi.mock('@/store/exploreUI', () => ({
  useExploreUIStore: vi.fn(),
}))

const mockUseExploreUIStore = vi.mocked(useExploreUIStore)

describe('ExploreBottomNav', () => {
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

  it('renders all 5 tabs: Home, Explore, Confessions, Notes, Profile', () => {
    render(<ExploreBottomNav />)
    
    expect(screen.getByText('Home')).toBeTruthy()
    expect(screen.getByText('Explore')).toBeTruthy()
    expect(screen.getByText('Confessions')).toBeTruthy()
    expect(screen.getByText('Notes')).toBeTruthy()
    expect(screen.getByText('Profile')).toBeTruthy()
  })

  it('highlights Explore tab as active', () => {
    render(<ExploreBottomNav />)
    
    const exploreButton = screen.getByText('Explore').closest('button')
    expect(exploreButton).toBeTruthy()
    
    // Check for active styling on the icon container
    const iconContainer = exploreButton?.querySelector('div')
    expect(iconContainer?.className).toContain('from-indigo-500/40')
    expect(iconContainer?.className).toContain('to-violet-500/35')
  })

  it('calls openLoginSheet when Home tab is clicked', () => {
    render(<ExploreBottomNav />)
    
    const homeButton = screen.getByText('Home').closest('button')
    if (homeButton) {
      fireEvent.click(homeButton)
    }
    
    expect(mockOpenLoginSheet).toHaveBeenCalledTimes(1)
  })

  it('calls openLoginSheet when Confessions tab is clicked', () => {
    render(<ExploreBottomNav />)
    
    const confessionsButton = screen.getByText('Confessions').closest('button')
    if (confessionsButton) {
      fireEvent.click(confessionsButton)
    }
    
    expect(mockOpenLoginSheet).toHaveBeenCalledTimes(1)
  })

  it('calls openLoginSheet when Notes tab is clicked', () => {
    render(<ExploreBottomNav />)
    
    const notesButton = screen.getByText('Notes').closest('button')
    if (notesButton) {
      fireEvent.click(notesButton)
    }
    
    expect(mockOpenLoginSheet).toHaveBeenCalledTimes(1)
  })

  it('calls openLoginSheet when Profile tab is clicked', () => {
    render(<ExploreBottomNav />)
    
    const profileButton = screen.getByText('Profile').closest('button')
    if (profileButton) {
      fireEvent.click(profileButton)
    }
    
    expect(mockOpenLoginSheet).toHaveBeenCalledTimes(1)
  })

  it('does not call openLoginSheet when Explore tab is clicked', () => {
    render(<ExploreBottomNav />)
    
    const exploreButton = screen.getByText('Explore').closest('button')
    if (exploreButton) {
      fireEvent.click(exploreButton)
    }
    
    expect(mockOpenLoginSheet).not.toHaveBeenCalled()
  })

  it('applies dark theme styling', () => {
    const { container } = render(<ExploreBottomNav />)
    
    const nav = container.querySelector('nav')
    expect(nav?.className).toContain('bg-[#0f0f0f]')
    expect(nav?.className).toContain('border-white/10')
  })

  it('has fixed positioning at bottom of viewport', () => {
    const { container } = render(<ExploreBottomNav />)
    
    const nav = container.querySelector('nav')
    expect(nav?.className).toContain('fixed')
    expect(nav?.className).toContain('bottom-0')
  })
})
