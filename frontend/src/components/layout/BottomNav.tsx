import { useMemo, useRef, useState, type TouchEvent } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { UserAvatar } from '../ui/avatar'
import { useAuthStore } from '../../store/auth'

const navItems = [
  { to: '/', emoji: '🏠', label: 'Home' },
  { to: '/attendance', emoji: '📊', label: 'Attendance' },
  { to: '/confessions', emoji: '🤫', label: 'Confess' },
  { to: '/study', emoji: '📚', label: 'Study' },
  { to: '/games', emoji: '🎮', label: 'Games' },
]

const moreSheetItems = [
  { to: '/timetable', emoji: '🗓', label: 'Timetable' },
  { to: '/notes', emoji: '📝', label: 'Notes' },
  { to: '/marketplace', emoji: '🛒', label: 'Marketplace' },
  { to: '/campus', emoji: '🏫', label: 'Campus' },
  { to: '/mentors', emoji: '🎓', label: 'Mentors' },
  { to: '/contact', emoji: '🛟', label: 'Report/Contact' },
  { to: '/messages', emoji: '💬', label: 'Messages' },
  { to: '/people', emoji: '👥', label: 'People' },
  { to: '/placements', emoji: '💼', label: 'Placements' },
]

interface BottomNavProps {
  visible?: boolean
}

export function BottomNav({ visible = true }: BottomNavProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuthStore()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const touchStartY = useRef<number | null>(null)

  const isMainActive = useMemo(
    () => navItems.some(item => (item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to))),
    [location.pathname]
  )

  const moreActive = !isMainActive

  function closeSheet() {
    setSheetOpen(false)
    setDragOffset(0)
  }

  function handleSheetTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartY.current = event.touches[0]?.clientY ?? null
  }

  function handleSheetTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (touchStartY.current === null) return
    const currentY = event.touches[0]?.clientY ?? touchStartY.current
    const delta = Math.max(0, currentY - touchStartY.current)
    setDragOffset(delta)
  }

  function handleSheetTouchEnd() {
    if (dragOffset > 90) {
      closeSheet()
    } else {
      setDragOffset(0)
    }
    touchStartY.current = null
  }

  function goTo(path: string) {
    navigate(path)
    closeSheet()
  }

  return (
    <>
      <nav
        className={cn(
          'fixed left-1/2 z-40 flex -translate-x-1/2 items-center rounded-full border transition-all duration-300 ease-out lg:hidden',
          visible ? 'translate-y-0 opacity-100' : 'translate-y-[160%] opacity-0 pointer-events-none'
        )}
        style={{
          bottom: 'max(0.6rem, env(safe-area-inset-bottom, 0px))',
          background: 'rgba(20, 20, 30, 0.95)',
          backdropFilter: 'blur(var(--glass-blur-nav))',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '999px',
          boxShadow: 'var(--glass-shadow-nav)',
          // Never wider than the viewport; shrink to fit on small screens
          width: 'min(calc(100vw - 1rem), 430px)',
          padding: '8px 12px',
          gap: 0,
          justifyContent: 'space-between',
        }}
      >
        {navItems.map(({ to, emoji, label }) => (
          <NavLink key={to} to={to} end={to === '/'} style={{ flex: 1, minWidth: 0 }}>
            {({ isActive }) => (
              <span
                className={cn(
                  'group flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[10px] font-medium text-white/70 transition-all active:scale-105 w-full',
                  isActive && 'text-white font-semibold'
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-full transition-all',
                    isActive
                      ? 'bg-gradient-to-r from-indigo-500/40 to-violet-500/35 text-white shadow-[0_0_16px_rgba(99,102,241,0.45)]'
                      : 'text-white/70'
                  )}
                >
                  <span className="text-sm leading-none">{emoji}</span>
                </span>
                <span className="truncate w-full text-center">{label}</span>
              </span>
            )}
          </NavLink>
        ))}

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={cn(
            'flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[10px] font-medium text-white/70 transition-all active:scale-105',
            moreActive && 'text-white font-semibold'
          )}
          style={{ flex: 1, minWidth: 0 }}
          aria-label="Open More menu"
        >
          <span
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-full transition-all',
              moreActive
                ? 'bg-gradient-to-r from-indigo-500/40 to-violet-500/35 text-white shadow-[0_0_16px_rgba(99,102,241,0.45)]'
                : 'text-white/70'
            )}
          >
            <Menu className="h-4 w-4" />
          </span>
          <span>More</span>
        </button>
      </nav>

      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/60 transition-opacity duration-300 lg:hidden',
          sheetOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={closeSheet}
      />

      <section
        className={cn(
          'fixed inset-x-0 bottom-0 z-[55] max-h-[88dvh] overflow-y-auto rounded-t-[28px] border border-b-0 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-4 transition-transform duration-300 mobile-glass-panel sm:px-5 lg:hidden',
          sheetOpen ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{
          background: 'rgba(20, 20, 30, 0.98)',
          borderColor: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(var(--glass-blur-sheet))',
          transform: sheetOpen ? `translateY(${dragOffset}px)` : 'translateY(100%)',
          transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        onTouchStart={handleSheetTouchStart}
        onTouchMove={handleSheetTouchMove}
        onTouchEnd={handleSheetTouchEnd}
      >
        <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-white/20" />
        <header className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">PESimens</h3>
          <button
            type="button"
            onClick={closeSheet}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/85"
            aria-label="Close More menu"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid grid-cols-2 gap-3">
          {moreSheetItems.map(item => (
            <button
              key={item.to}
              type="button"
              onClick={() => goTo(item.to)}
              className="rounded-2xl border p-5 text-left transition-transform active:scale-[0.98]"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
              }}
            >
              <p className="text-[32px] leading-none">{item.emoji}</p>
              <p className="mt-3 text-sm font-medium text-white">{item.label}</p>
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
          <div className="flex items-center gap-3">
            <UserAvatar name={profile?.display_name} avatarUrl={profile?.avatar_url} size="sm" />
            <div>
              <p className="text-sm font-semibold text-white">{profile?.display_name || profile?.email?.split('@')[0] || 'Student'}</p>
              <p className="text-xs text-amber-300">⚡ {profile?.karma ?? 0} karma</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => goTo('/welcome')}
            className="text-xs font-medium text-white/75 underline underline-offset-4"
          >
            About PESimens
          </button>
        </div>
      </section>
    </>
  )
}
