import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { NotificationBell } from './NotificationBell'
import { ProfileMenu } from './ProfileMenu'

export function TopNav() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setMobileSearchOpen(false)
    }
  }

  return (
    <header
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
          <span className="lg:hidden inline-flex items-center gap-2 font-semibold tracking-tight text-white">
            <img src="/app-logo.jpeg" alt="PESimens logo" className="h-6 w-6 rounded-full object-cover" />
            PESimens <span className="text-[#6366f1]">•</span>
          </span>
        )}

        {/* Mobile search bar (expanded) */}
        {mobileSearchOpen && (
          <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2 lg:hidden">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search people, marketplace, events, PYQs..."
                className="w-full rounded-xl border py-2 pl-9 pr-4 text-sm text-white placeholder:text-gray-400 outline-none transition-all focus:ring-2 focus:ring-[#6366f1]"
                style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }}
              />
            </div>
            <button
              type="button"
              onClick={() => { setMobileSearchOpen(false); setSearchQuery('') }}
              className="rounded-full p-1.5 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* Desktop search */}
        <form onSubmit={handleSearch} className="mx-auto hidden flex-1 max-w-xl lg:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search people, marketplace, events, PYQs..."
              className="w-full rounded-xl border py-2 pl-9 pr-4 text-sm text-white placeholder:text-gray-400 outline-none transition-all focus:ring-2 focus:ring-[#6366f1]"
              style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }}
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1">
          {/* Mobile search toggle */}
          {!mobileSearchOpen && (
            <button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:text-white lg:hidden"
              aria-label="Search"
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
