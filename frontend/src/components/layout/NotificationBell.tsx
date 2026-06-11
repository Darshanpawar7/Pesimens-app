import { useRef, useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { dedupeNotifications, useUnreadCount, useNotifications, useMarkAllAsRead, useMarkAsRead, type Notification } from '../../hooks/useNotifications'
import { cn } from '../../lib/utils'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const typeIcon: Record<string, string> = {
  rsvp_confirmed: '✅',
  event_update: '📅',
  event_cancelled: '❌',
  club_update: '🏛️',
  badge_earned: '🏆',
  karma_update: '⭐',
}

function NotifItem({ n, index, closeMenu }: { n: Notification; index: number; closeMenu: () => void }) {
  const navigate = useNavigate()
  const markAsRead = useMarkAsRead()

  const handleClick = () => {
    if (!n.is_read) {
      markAsRead.mutate(n.id)
    }
    if (n.link) {
      navigate(n.link)
      closeMenu()
    }
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full px-4 py-3 text-left transition-colors duration-200 hover:bg-slate-50/90 will-change-transform motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 dark:hover:bg-slate-800/70',
        !n.is_read && 'bg-indigo-50/60 dark:bg-indigo-500/10'
      )}
      style={{
        animationDelay: `${Math.min(index, 8) * 30}ms`,
        transform: 'translateZ(0)',
      }}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-base transition-transform duration-200 hover:scale-105 dark:bg-slate-800">{typeIcon[n.type] ?? '🔔'}</span>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm leading-snug', !n.is_read ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300')}>
            {n.title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{n.message}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">{timeAgo(n.created_at)}</p>
        </div>
        {!n.is_read && (
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              markAsRead.mutate(n.id)
            }}
            className="mt-1 flex h-6 w-6 items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Mark as read"
          >
            <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
          </div>
        )}
      </div>
    </button>
  )
}

export function NotificationBell() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const unreadPollingActive = !location.pathname.startsWith('/messages')
  const { data: unreadCount = 0 } = useUnreadCount(unreadPollingActive)
  const { data } = useNotifications(false, open)
  const markAll = useMarkAllAsRead()

  const recent = dedupeNotifications(data?.pages[0]?.items ?? []).slice(0, 5)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 animate-in zoom-in duration-200">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-2 z-50 mt-2 w-[min(320px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.95)] backdrop-blur-sm animate-in fade-in zoom-in-95 duration-150 dark:border-slate-700/80 dark:bg-slate-900/92 sm:right-0 sm:w-84">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200/80 bg-gradient-to-r from-indigo-500/10 via-cyan-500/5 to-transparent px-4 py-3 dark:border-slate-700/80">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAll.mutate()}
                className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800 sm:max-h-80">
            {recent.length > 0 ? (
              recent.map((n, idx) => <NotifItem key={n.id} n={n} index={idx} closeMenu={() => setOpen(false)} />)
            ) : (
              <div className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                No notifications yet
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200/80 px-4 py-2.5 dark:border-slate-700/80">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
