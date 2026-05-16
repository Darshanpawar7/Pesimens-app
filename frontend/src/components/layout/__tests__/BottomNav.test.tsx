/**
 * Unit tests for BottomNav Games tab (Task 12.1)
 * Validates: Requirements 1.7, 1.8, 4.4
 *
 * Tests:
 *   - BottomNav includes Games tab linking to /games
 *   - BottomNav highlights Games tab when on /games
 *   - BottomNav highlights Games tab when on /games/ludo
 *   - Home tab uses exact match (not active on /games)
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BottomNav } from '../BottomNav'

// Mock the auth store
vi.mock('@/store/auth', () => ({
  useAuthStore: () => ({
    profile: {
      display_name: 'Test User',
      email: 'test@example.com',
      avatar_url: null,
      karma: 100,
    },
  }),
}))

function renderBottomNav(initialRoute: string) {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <BottomNav visible={true} />
    </MemoryRouter>
  )
}

describe('BottomNav Games Tab', () => {
  it('includes Games tab linking to /games', () => {
    renderBottomNav('/')

    // Find the Games tab
    const gamesTab = screen.getByText('Games')
    expect(gamesTab).toBeTruthy()

    // Check that it's a link to /games
    const gamesLink = gamesTab.closest('a')
    expect(gamesLink).toBeTruthy()
    expect(gamesLink?.getAttribute('href')).toBe('/games')
  })

  it('highlights Games tab when on /games', () => {
    renderBottomNav('/games')

    // Find the Games tab
    const gamesTab = screen.getByText('Games')
    expect(gamesTab).toBeTruthy()

    // Check that it has active styling
    const gamesLink = gamesTab.closest('a')
    const gamesSpan = gamesLink?.querySelector('span')
    
    // Active tabs should have 'text-white' and 'font-semibold' classes
    expect(gamesSpan?.className).toContain('text-white')
    expect(gamesSpan?.className).toContain('font-semibold')
  })

  it('highlights Games tab when on /games/ludo', () => {
    renderBottomNav('/games/ludo')

    // Find the Games tab
    const gamesTab = screen.getByText('Games')
    expect(gamesTab).toBeTruthy()

    // Check that it has active styling
    const gamesLink = gamesTab.closest('a')
    const gamesSpan = gamesLink?.querySelector('span')
    
    // Active tabs should have 'text-white' and 'font-semibold' classes
    expect(gamesSpan?.className).toContain('text-white')
    expect(gamesSpan?.className).toContain('font-semibold')
  })

  it('Home tab uses exact match (not active on /games)', () => {
    renderBottomNav('/games')

    // Find the Home tab
    const homeTab = screen.getByText('Home')
    expect(homeTab).toBeTruthy()

    // Check that it does NOT have active styling
    const homeLink = homeTab.closest('a')
    const homeSpan = homeLink?.querySelector('span')
    
    // Inactive tabs should have 'text-white/70' class, not 'text-white' and 'font-semibold'
    expect(homeSpan?.className).toContain('text-white/70')
    expect(homeSpan?.className).not.toContain('font-semibold')
  })

  it('Home tab is active only on exact / route', () => {
    renderBottomNav('/')

    // Find the Home tab
    const homeTab = screen.getByText('Home')
    expect(homeTab).toBeTruthy()

    // Check that it has active styling
    const homeLink = homeTab.closest('a')
    const homeSpan = homeLink?.querySelector('span')
    
    // Active tabs should have 'text-white' and 'font-semibold' classes
    expect(homeSpan?.className).toContain('text-white')
    expect(homeSpan?.className).toContain('font-semibold')
  })

  it('renders all primary navigation tabs', () => {
    renderBottomNav('/')

    // Check that all primary tabs are present
    expect(screen.getByText('Home')).toBeTruthy()
    expect(screen.getByText('Attendance')).toBeTruthy()
    expect(screen.getByText('Confess')).toBeTruthy()
    expect(screen.getByText('Study')).toBeTruthy()
    expect(screen.getByText('Games')).toBeTruthy()
    expect(screen.getByText('More')).toBeTruthy()
  })

  it('Games tab has correct emoji icon', () => {
    renderBottomNav('/')

    // Find the Games tab and check for the game controller emoji
    const gamesTab = screen.getByText('Games')
    const gamesLink = gamesTab.closest('a')
    
    // The emoji should be in the link
    expect(gamesLink?.textContent).toContain('🎮')
  })

  it('other tabs remain functional with Games tab added', () => {
    // Test that adding Games tab doesn't break other tabs
    renderBottomNav('/attendance')

    // Attendance tab should be active
    const attendanceTab = screen.getByText('Attendance')
    const attendanceLink = attendanceTab.closest('a')
    const attendanceSpan = attendanceLink?.querySelector('span')
    
    expect(attendanceSpan?.className).toContain('text-white')
    expect(attendanceSpan?.className).toContain('font-semibold')

    // Games tab should not be active
    const gamesTab = screen.getByText('Games')
    const gamesLink = gamesTab.closest('a')
    const gamesSpan = gamesLink?.querySelector('span')
    
    expect(gamesSpan?.className).toContain('text-white/70')
    expect(gamesSpan?.className).not.toContain('font-semibold')
  })
})
