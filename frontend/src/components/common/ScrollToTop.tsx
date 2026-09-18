import { useEffect, useState, type RefObject } from 'react'
import { ArrowUp } from 'lucide-react'

export interface ScrollToTopProps {
  targetRef?: RefObject<HTMLElement | null>
  threshold?: number
  className?: string
}

/**
 * Floating ScrollToTop button component.
 * Appears when scrolling exceeds threshold (default 300px) and smoothly scrolls back to the top.
 */
export function ScrollToTop({
  targetRef,
  threshold = 300,
  className = '',
}: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const checkScroll = () => {
      let currentScroll = 0
      if (targetRef?.current) {
        currentScroll = targetRef.current.scrollTop
      } else {
        currentScroll = window.scrollY || document.documentElement.scrollTop
      }
      setIsVisible(currentScroll > threshold)
    }

    const targetEl = targetRef?.current
    if (targetEl) {
      targetEl.addEventListener('scroll', checkScroll, { passive: true })
    } else {
      window.addEventListener('scroll', checkScroll, { passive: true })
    }

    // Check initial scroll position
    checkScroll()

    return () => {
      if (targetEl) {
        targetEl.removeEventListener('scroll', checkScroll)
      } else {
        window.removeEventListener('scroll', checkScroll)
      }
    }
  }, [targetRef, threshold])

  const handleScrollToTop = () => {
    if (targetRef?.current) {
      targetRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <button
      type="button"
      onClick={handleScrollToTop}
      aria-label="Scroll to top"
      title="Scroll to top"
      tabIndex={isVisible ? 0 : -1}
      className={`fixed bottom-20 right-4 md:bottom-8 md:right-8 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-[#1f1f23]/90 text-zinc-200 border border-white/10 shadow-lg shadow-black/40 backdrop-blur-md transition-all duration-300 hover:bg-indigo-600 hover:text-white hover:border-indigo-500/50 hover:shadow-indigo-500/25 hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        isVisible
          ? 'visible opacity-100 translate-y-0 pointer-events-auto'
          : 'invisible opacity-0 translate-y-3 pointer-events-none'
      } ${className}`}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  )
}
