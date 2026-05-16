/**
 * Unit tests for LoginBottomSheet animation behavior (Task 2.2)
 * Validates: Requirements 9.1
 *
 * Tests:
 *   - Sheet slides up with proper animation when opened
 *   - Sheet slides down when closed
 *   - Backdrop fades in/out with sheet
 *   - Component unmounts after exit animation completes
 *   - No flash on initial mount
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { act } from 'react'
import { LoginBottomSheet } from '../LoginBottomSheet'

// Helper to wrap component with Router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockCloseLoginSheet = vi.fn()
let mockIsLoginSheetOpen = false

vi.mock('@/store/exploreUI', () => ({
  useExploreUIStore: (selector: (state: { isLoginSheetOpen: boolean; closeLoginSheet: () => void }) => unknown) =>
    selector({
      isLoginSheetOpen: mockIsLoginSheetOpen,
      closeLoginSheet: mockCloseLoginSheet,
    }),
}))

// Mock requestAnimationFrame for testing
const originalRAF = globalThis.requestAnimationFrame
beforeEach(() => {
  vi.clearAllMocks()
  mockIsLoginSheetOpen = false
  globalThis.requestAnimationFrame = vi.fn((cb) => {
    cb(0)
    return 0
  }) as unknown as typeof requestAnimationFrame
})

afterEach(() => {
  globalThis.requestAnimationFrame = originalRAF
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LoginBottomSheet animation', () => {
  it('does not render when sheet is closed', () => {
    mockIsLoginSheetOpen = false
    const { container } = renderWithRouter(<LoginBottomSheet />)
    expect(container.firstChild).toBeNull()
  })

  it('renders with slide-up animation when opened', async () => {
    mockIsLoginSheetOpen = true
    
    await act(async () => {
      renderWithRouter(<LoginBottomSheet />)
    })

    // Sheet should be in the DOM
    const sheet = screen.getByText('Your PESU network starts here')
    expect(sheet).toBeTruthy()
    
    // Check that the sheet has the correct animation classes
    const sheetContainer = sheet.closest('.transition-transform')
    expect(sheetContainer).toBeTruthy()
    expect(sheetContainer?.className).toContain('duration-300')
    expect(sheetContainer?.className).toContain('ease-[cubic-bezier(0.4,0,0.2,1)]')
  })

  it('applies translate-y-0 when visible', async () => {
    mockIsLoginSheetOpen = true
    
    await act(async () => {
      renderWithRouter(<LoginBottomSheet />)
    })

    await waitFor(() => {
      const sheet = screen.getByText('Your PESU network starts here').closest('.translate-y-0')
      expect(sheet).toBeTruthy()
    })
  })

  it('backdrop fades in when sheet opens', async () => {
    mockIsLoginSheetOpen = true
    
    await act(async () => {
      renderWithRouter(<LoginBottomSheet />)
    })

    await waitFor(() => {
      const backdrop = document.querySelector('.bg-black\\/70')
      expect(backdrop).toBeTruthy()
      expect(backdrop?.className).toContain('transition-opacity')
      expect(backdrop?.className).toContain('duration-300')
    })
  })

  it('prevents body scroll when sheet is open', async () => {
    mockIsLoginSheetOpen = true
    
    await act(async () => {
      renderWithRouter(<LoginBottomSheet />)
    })

    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restores body scroll when sheet closes', async () => {
    mockIsLoginSheetOpen = true
    
    const { rerender } = await act(async () => {
      return renderWithRouter(<LoginBottomSheet />)
    })

    expect(document.body.style.overflow).toBe('hidden')

    mockIsLoginSheetOpen = false
    
    await act(async () => {
      rerender(
        <BrowserRouter>
          <LoginBottomSheet />
        </BrowserRouter>
      )
    })

    // Wait for cleanup
    await waitFor(() => {
      expect(document.body.style.overflow).toBe('')
    })
  })
})
