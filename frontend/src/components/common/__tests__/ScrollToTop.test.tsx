import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useRef } from 'react'
import { ScrollToTop } from '../ScrollToTop'

describe('ScrollToTop component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.scrollTo = vi.fn()
  })

  it('renders the button with accessible attributes', () => {
    render(<ScrollToTop />)
    const button = screen.getByRole('button', { name: /scroll to top/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-label', 'Scroll to top')
  })

  it('is initially hidden when scroll is at top (0px)', () => {
    render(<ScrollToTop threshold={300} />)
    const button = screen.getByRole('button', { name: /scroll to top/i })
    expect(button.className).toContain('opacity-0')
    expect(button.className).toContain('pointer-events-none')
  })

  it('becomes visible when window scroll exceeds threshold', () => {
    render(<ScrollToTop threshold={300} />)
    const button = screen.getByRole('button', { name: /scroll to top/i })

    // Simulate window scroll past 300px
    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 450, writable: true, configurable: true })
      window.dispatchEvent(new Event('scroll'))
    })

    expect(button.className).toContain('opacity-100')
    expect(button.className).toContain('pointer-events-auto')
  })

  it('hides again when window scrolls back to top', () => {
    render(<ScrollToTop threshold={300} />)
    const button = screen.getByRole('button', { name: /scroll to top/i })

    // Scroll down
    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 500, writable: true, configurable: true })
      window.dispatchEvent(new Event('scroll'))
    })
    expect(button.className).toContain('opacity-100')

    // Scroll back up
    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 50, writable: true, configurable: true })
      window.dispatchEvent(new Event('scroll'))
    })
    expect(button.className).toContain('opacity-0')
  })

  it('handles targetRef container scroll and triggers smooth scrolling on click', () => {
    const scrollToMock = vi.fn()

    function TestContainer() {
      const containerRef = useRef<HTMLDivElement>(null)
      return (
        <div>
          <div
            ref={containerRef}
            data-testid="scroll-container"
            style={{ height: '200px', overflowY: 'auto' }}
          >
            <div style={{ height: '1000px' }}>Long Content</div>
          </div>
          <ScrollToTop targetRef={containerRef} threshold={200} />
        </div>
      )
    }

    render(<TestContainer />)
    const container = screen.getByTestId('scroll-container')
    container.scrollTo = scrollToMock

    const button = screen.getByRole('button', { name: /scroll to top/i })
    expect(button.className).toContain('opacity-0')

    // Simulate container scroll
    act(() => {
      Object.defineProperty(container, 'scrollTop', { value: 350, writable: true, configurable: true })
      fireEvent.scroll(container)
    })

    expect(button.className).toContain('opacity-100')

    // Click button
    fireEvent.click(button)
    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })
})
