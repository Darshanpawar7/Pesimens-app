import { useEffect, useRef } from 'react'
import { useExploreUIStore } from '@/store/exploreUI'
import { ExploreTopBar } from '@/components/explore/ExploreTopBar'
import { PreviewFeed } from '@/components/explore/PreviewFeed'
import { ExploreBottomNav } from '@/components/explore/ExploreBottomNav'

export default function ExplorePage() {
  const incrementScrollCount = useExploreUIStore(state => state.incrementScrollCount)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastScrollPositionRef = useRef(0)
  const scrollTimeoutRef = useRef<number | null>(null)
  const isScrollingRef = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      // Clear existing timeout
      if (scrollTimeoutRef.current !== null) {
        window.clearTimeout(scrollTimeoutRef.current)
      }

      isScrollingRef.current = true

      // Debounce scroll events to filter out momentum scrolling
      scrollTimeoutRef.current = window.setTimeout(() => {
        const currentScrollPosition = container.scrollTop
        const scrollDelta = Math.abs(currentScrollPosition - lastScrollPositionRef.current)
        const viewportHeight = container.clientHeight
        const scrollThreshold = viewportHeight * 0.6

        // Only count as deliberate scroll if moved >= 60% of viewport height
        if (scrollDelta >= scrollThreshold) {
          incrementScrollCount()
          lastScrollPositionRef.current = currentScrollPosition
        }

        isScrollingRef.current = false
      }, 150) // 150ms debounce to filter momentum scrolling
    }

    container.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current !== null) {
        window.clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [incrementScrollCount])

  return (
    <div
      ref={containerRef}
      className="relative h-screen overflow-y-auto bg-[#0f0f0f]"
    >
      <ExploreTopBar />
      <PreviewFeed />
      <ExploreBottomNav />
    </div>
  )
}
