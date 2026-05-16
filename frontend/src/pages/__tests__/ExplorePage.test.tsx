/**
 * Unit tests for ExplorePage (Task 4.6)
 * Validates: Requirements 1.4, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 *
 * Tests:
 *   - renders all three main components (TopBar, PreviewFeed, BottomNav)
 *   - attaches scroll listener to main container
 *   - increments scroll count when viewport moves >= 60% of viewport height
 *   - does not increment scroll count for small scrolls (< 60% viewport)
 *   - debounces scroll events to filter momentum scrolling
 *   - does not trigger on initial mount
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ExplorePage from '../ExplorePage'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockIncrementScrollCount = vi.fn()

vi.mock('@/store/exploreUI', () => ({
  useExploreUIStore: (selector: (state: { incrementScrollCount: () => void }) => unknown) =>
    selector({ incrementScrollCount: mockIncrementScrollCount }),
}))

vi.mock('@/components/explore/ExploreTopBar', () => ({
  ExploreTopBar: () => <div data-testid="explore-top-bar">TopBar</div>,
}))

vi.mock('@/components/explore/PreviewFeed', () => ({
  PreviewFeed: () => <div data-testid="preview-feed">PreviewFeed</div>,
}))

vi.mock('@/components/explore/ExploreBottomNav', () => ({
  ExploreBottomNav: () => <div data-testid="explore-bottom-nav">BottomNav</div>,
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderExplorePage() {
  return render(
    <MemoryRouter>
      <ExplorePage />
    </MemoryRouter>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ExplorePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('renders ExploreTopBar, PreviewFeed, and ExploreBottomNav', () => {
    renderExplorePage()

    expect(screen.getByTestId('explore-top-bar')).toBeTruthy()
    expect(screen.getByTestId('preview-feed')).toBeTruthy()
    expect(screen.getByTestId('explore-bottom-nav')).toBeTruthy()
  })

  it('increments scroll count when viewport moves >= 60% of viewport height', () => {
    const { container } = renderExplorePage()
    const scrollContainer = container.firstChild as HTMLElement

    // Mock clientHeight to simulate viewport
    Object.defineProperty(scrollContainer, 'clientHeight', {
      value: 1000,
      writable: true,
    })

    // Simulate scroll by 600px (60% of 1000px viewport)
    Object.defineProperty(scrollContainer, 'scrollTop', {
      value: 600,
      writable: true,
    })

    scrollContainer.dispatchEvent(new Event('scroll'))

    // Wait for debounce timeout (150ms)
    vi.advanceTimersByTime(150)

    expect(mockIncrementScrollCount).toHaveBeenCalledTimes(1)
  })

  it('does not increment scroll count for small scrolls (< 60% viewport)', () => {
    const { container } = renderExplorePage()
    const scrollContainer = container.firstChild as HTMLElement

    // Mock clientHeight to simulate viewport
    Object.defineProperty(scrollContainer, 'clientHeight', {
      value: 1000,
      writable: true,
    })

    // Simulate scroll by 500px (50% of 1000px viewport, below 60% threshold)
    Object.defineProperty(scrollContainer, 'scrollTop', {
      value: 500,
      writable: true,
    })

    scrollContainer.dispatchEvent(new Event('scroll'))

    // Wait for debounce timeout
    vi.advanceTimersByTime(150)

    expect(mockIncrementScrollCount).not.toHaveBeenCalled()
  })

  it('debounces scroll events to filter momentum scrolling', () => {
    const { container } = renderExplorePage()
    const scrollContainer = container.firstChild as HTMLElement

    Object.defineProperty(scrollContainer, 'clientHeight', {
      value: 1000,
      writable: true,
    })

    // Simulate rapid scroll events (momentum scrolling)
    Object.defineProperty(scrollContainer, 'scrollTop', {
      value: 600,
      writable: true,
    })
    scrollContainer.dispatchEvent(new Event('scroll'))

    vi.advanceTimersByTime(50)

    Object.defineProperty(scrollContainer, 'scrollTop', {
      value: 650,
      writable: true,
    })
    scrollContainer.dispatchEvent(new Event('scroll'))

    vi.advanceTimersByTime(50)

    Object.defineProperty(scrollContainer, 'scrollTop', {
      value: 700,
      writable: true,
    })
    scrollContainer.dispatchEvent(new Event('scroll'))

    // Wait for debounce to complete
    vi.advanceTimersByTime(150)

    // Should only increment once after debounce settles
    expect(mockIncrementScrollCount).toHaveBeenCalledTimes(1)
  })

  it('does not trigger scroll count on initial mount', () => {
    renderExplorePage()

    // Advance timers to ensure no delayed calls
    vi.advanceTimersByTime(200)

    expect(mockIncrementScrollCount).not.toHaveBeenCalled()
  })

  it('cleans up scroll listener on unmount', () => {
    const { container, unmount } = renderExplorePage()
    const scrollContainer = container.firstChild as HTMLElement

    const removeEventListenerSpy = vi.spyOn(scrollContainer, 'removeEventListener')

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
  })
})
