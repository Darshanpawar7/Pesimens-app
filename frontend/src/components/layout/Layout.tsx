import { useEffect, useRef, useState, type UIEvent } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { BottomNav } from './BottomNav'
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications'
import { StoriesBar } from '../stories/StoriesBar'

export function Layout() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [isBottomNavVisible, setIsBottomNavVisible] = useState(true)
  const lastScrollTop = useRef(0)

  const showStories = location.pathname === '/'
  const isMessagesRoute = location.pathname.startsWith('/messages')
  const chatSearchParams = new URLSearchParams(location.search)
  const isActiveChatView = isMessagesRoute && (chatSearchParams.has('conversation') || chatSearchParams.has('user'))
  const shouldRenderMobileNavOffset = !isActiveChatView
  useRealtimeNotifications()

  useEffect(() => {
    setIsBottomNavVisible(true)
    lastScrollTop.current = 0
  }, [location.pathname])

  function handleMainScroll(event: UIEvent<HTMLElement>) {
    const currentTop = event.currentTarget.scrollTop
    const delta = currentTop - lastScrollTop.current
    const threshold = 12

    if (currentTop <= 20) {
      setIsBottomNavVisible(true)
      lastScrollTop.current = currentTop
      return
    }

    if (delta > threshold && currentTop > 80) {
      setIsBottomNavVisible(false)
    } else if (delta < -threshold) {
      setIsBottomNavVisible(true)
    }

    lastScrollTop.current = currentTop
  }

  return (
    <div className="flex h-dvh min-h-screen min-h-dvh bg-[#0f0f0f] overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav />
        {showStories && (
          <div className="sticky top-14 z-20 bg-[#111111] lg:static">
            <StoriesBar />
          </div>
        )}
        <main onScroll={handleMainScroll} className={`${shouldRenderMobileNavOffset ? 'mobile-nav-offset' : ''} flex-1 overflow-y-auto overscroll-contain bg-[#0f0f0f] lg:pb-0`} style={{ WebkitOverflowScrolling: 'touch' }}>
          <Outlet />
        </main>
      </div>
      <BottomNav visible={isActiveChatView ? false : isBottomNavVisible} />
    </div>
  )
}
