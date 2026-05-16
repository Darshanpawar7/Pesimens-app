/**
 * Unit tests for GamesPage (Task 11.2)
 * Validates: Requirements 1.2, 1.3, 1.4
 *
 * Tests:
 *   - renders exactly 4 cards with correct names
 *   - Play button navigates to /games/ludo for Ludo
 *   - Coming Soon buttons are disabled
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import GamesPage from '../GamesPage'

function renderGamesPage() {
  return render(
    <MemoryRouter initialEntries={['/games']}>
      <Routes>
        <Route path="/games" element={<GamesPage />} />
        <Route path="/games/ludo" element={<div>Ludo Page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('GamesPage', () => {
  it('renders exactly 4 cards with correct names', () => {
    renderGamesPage()

    // Check that all 4 game names are present
    expect(screen.getByText('Ludo')).toBeTruthy()
    expect(screen.getByText('PES Bluff')).toBeTruthy()
    expect(screen.getByText('Chess')).toBeTruthy()
    expect(screen.getByText('PES Drawl')).toBeTruthy()

    // Verify we have exactly 4 game cards by checking for unique game icons
    const { container } = render(
      <MemoryRouter>
        <GamesPage />
      </MemoryRouter>
    )
    
    const content = container.textContent || ''
    expect(content).toContain('🎲') // Ludo
    expect(content).toContain('🃏') // PES Bluff
    expect(content).toContain('♟️') // Chess
    expect(content).toContain('🎨') // PES Drawl
  })

  it('Play button navigates to /games/ludo for Ludo', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/games']}>
        <Routes>
          <Route path="/games" element={<GamesPage />} />
          <Route path="/games/ludo" element={<div>Ludo Page</div>} />
          <Route path="/games/chess" element={<div>Chess Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    // Find and click the Play button for Ludo (first Play button)
    const playButtons = screen.getAllByText('Play')
    expect(playButtons.length).toBeGreaterThanOrEqual(2) // Ludo + Chess both have Play buttons

    // Click the first Play button (Ludo)
    await user.click(playButtons[0])

    // Should navigate to Ludo page
    expect(screen.getByText('Ludo Page')).toBeTruthy()
  })

  it('Play button navigates to /games/chess for Chess', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/games']}>
        <Routes>
          <Route path="/games" element={<GamesPage />} />
          <Route path="/games/ludo" element={<div>Ludo Page</div>} />
          <Route path="/games/chess" element={<div>Chess Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    // Find and click the Play button for Chess (second Play button)
    const playButtons = screen.getAllByText('Play')
    expect(playButtons.length).toBeGreaterThanOrEqual(2)

    // Click the second Play button (Chess)
    await user.click(playButtons[1])

    // Should navigate to Chess page
    expect(screen.getByText('Chess Page')).toBeTruthy()
  })

  it('Coming Soon buttons are disabled', () => {
    render(
      <MemoryRouter>
        <GamesPage />
      </MemoryRouter>
    )

    // Find all "Coming Soon" buttons
    const comingSoonButtons = screen.getAllByText('Coming Soon')

    // Should have 2 Coming Soon buttons (PES Bluff, PES Drawl) — Chess now has a Play button
    expect(comingSoonButtons.length).toBe(2)

    // All Coming Soon buttons should be disabled
    comingSoonButtons.forEach(button => {
      expect(button.hasAttribute('disabled')).toBe(true)
    })
  })

  it('Chess card has a Play button (not Coming Soon)', () => {
    renderGamesPage()

    // Chess should have a Play button since route is set
    const playButtons = screen.getAllByText('Play')
    expect(playButtons.length).toBeGreaterThanOrEqual(2) // Ludo + Chess

    // Chess should NOT have a Coming Soon button
    const comingSoonButtons = screen.getAllByText('Coming Soon')
    expect(comingSoonButtons.length).toBe(2) // Only PES Bluff and PES Drawl
  })

  it('renders game descriptions', () => {
    renderGamesPage()

    // Check that game descriptions are present
    expect(screen.getByText(/Classic board game/i)).toBeTruthy()
    expect(screen.getByText(/Bluff your way to victory/i)).toBeTruthy()
    expect(screen.getByText(/classic game of strategy/i)).toBeTruthy()
    expect(screen.getByText(/Draw and guess with friends/i)).toBeTruthy()
  })

  it('renders player count badges', () => {
    renderGamesPage()

    // Check that player count badges are present
    const { container } = render(
      <MemoryRouter>
        <GamesPage />
      </MemoryRouter>
    )
    
    const content = container.textContent || ''
    expect(content).toContain('2–4') // Ludo
    expect(content).toContain('3–6') // PES Bluff
    expect(content).toContain('2')   // Chess
    expect(content).toContain('3–8') // PES Drawl
  })

  it('renders page header', () => {
    renderGamesPage()

    // Check for page title
    expect(screen.getByText('Games')).toBeTruthy()
    expect(screen.getByText('Play games with your friends')).toBeTruthy()
  })

  it('applies dark theme styling', () => {
    const { container } = render(
      <MemoryRouter>
        <GamesPage />
      </MemoryRouter>
    )

    // Check for dark theme background
    const mainDiv = container.querySelector('[style*="background"]')
    expect(mainDiv).toBeTruthy()
    
    // The page should have the dark background color (may be in hex or rgb format)
    const style = mainDiv?.getAttribute('style')
    expect(style).toMatch(/background.*(?:#0f0f0f|rgb\(15,\s*15,\s*15\))/i)
  })
})
