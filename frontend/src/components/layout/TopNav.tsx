import { useState } from 'react'
import { X, Search } from 'lucide-react'
import { NotificationBell } from './NotificationBell'
import { ProfileMenu } from './ProfileMenu'
import { GlobalSearch } from '../common/GlobalSearch'

export function TopNav() {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  return (
    <header
      role="banner"
      className="sticky top-0 z-30 border-b mobile-glass-panel"
      style={{
        background: '#111111',
        borderColor: '#2a2a2a',
        backdropFilter: 'blur(var(--glass-blur-nav))',
      }}
    >
      <div className="flex h-14 items-center gap-3 px-4">
        {/* Mobile logo */}
        {!mobileSearchOpen && (
          <span className="lg:hidden inline-flex items-center gap-2 font-semibold tracking-tight text-white select-none">
            <img src="/app-logo.jpeg" alt="PESimens logo" className="h-6 w-6 rounded-full object-cover" />
            PESimens <span className="text-[#6366f1]" aria-hidden="true">•</span>
          </span>
        )}

        {/* Mobile search (expanded) */}
        {mobileSearchOpen && (
          <div className="flex flex-1 items-center gap-2 lg:hidden">
            <div className="flex-1">
              <GlobalSearch mobile autoFocus onClose={() => setMobileSearchOpen(false)} />
            </div>
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              className="rounded-full p-1.5 text-gray-400 hover:text-white shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Desktop search */}
        <div className="mx-auto hidden flex-1 max-w-xl lg:block">
          <GlobalSearch />
        </div>

        <div className="ml-auto flex items-center gap-1">
          {/* Mobile search toggle */}
          {!mobileSearchOpen && (
            <button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:text-white lg:hidden transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Open search"
              aria-expanded={mobileSearchOpen}
            >
              <Search className="h-4 w-4" />
            </button>
          )}
          <NotificationBell />
          <ProfileMenu />
        </div>
      </div>
    </header>
  )
}
