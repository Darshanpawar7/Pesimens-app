import { Link, NavLink } from 'react-router-dom'
import { useState } from 'react'
import type { ComponentType } from 'react'
import { Home, BookOpen, Calendar, Users, Briefcase, Shield, ChevronLeft, ChevronRight, MessageCircle, FileText, MessageSquare, BarChart2, Clock, GraduationCap, Bug } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/auth'
import { UserAvatar } from '../ui/avatar'
import { cn } from '../../lib/utils'
import { apiFetch } from '../../lib/api'
import {
  adaptiveRefetchIntervalWhenActive,
  adaptiveRefetchOnReconnect,
  adaptiveRefetchOnWindowFocus,
  adaptiveStaleTime,
} from '../../lib/queryThrottle'

const mainNavItems: Array<{ to: string; label: string; icon: ComponentType<{ className?: string }> | string }> = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/study', icon: BookOpen, label: 'Study' },
  { to: '/marketplace', icon: '🛒', label: 'Marketplace' },
  { to: '/campus', icon: Calendar, label: 'Campus' },
  { to: '/placements', icon: Briefcase, label: 'Placements' },
  { to: '/games', icon: '🎮', label: 'Games' },
  { to: '/confessions', icon: MessageCircle, label: 'Confessions' },
  { to: '/notes', icon: FileText, label: 'Notes' },
]

const secondaryNavItems: Array<{ to: string; label: string; icon: ComponentType<{ className?: string }> | string }> = [
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/people', icon: Users, label: 'People' },
  { to: '/mentors', icon: GraduationCap, label: 'Mentors' },
  { to: '/contact', icon: Bug, label: 'Report/Contact' },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [aboutOpen, setAboutOpen] = useState(false)
  const { profile: user } = useAuthStore()
  const isAdmin = user?.role === 'admin' || user?.role === 'moderator'
  const unreadPollingActive = !location.pathname.startsWith('/messages')
  const unreadQuery = useQuery({
    queryKey: ['messages-unread-count'],
    queryFn: () => apiFetch<{ unread_count: number }>('/api/messages/unread-count'),
    enabled: unreadPollingActive,
    staleTime: adaptiveStaleTime(3 * 60 * 1000, 'interactive'),
    refetchInterval: () => (unreadPollingActive ? adaptiveRefetchIntervalWhenActive(3 * 60 * 1000, 'interactive') : false),
    refetchOnWindowFocus: unreadPollingActive && adaptiveRefetchOnWindowFocus(true, 'interactive'),
    refetchOnReconnect: unreadPollingActive && adaptiveRefetchOnReconnect(true, 'interactive'),
  })
  const unreadCount = unreadQuery.data?.unread_count ?? 0

  const attendanceQuery = useQuery({
    queryKey: ['sidebar-attendance-alert'],
    queryFn: () => apiFetch<{ items: Array<{ percentage: number }> }>('/api/pesu-sync/attendance'),
    retry: false,
  })

  const examsQuery = useQuery({
    queryKey: ['sidebar-exam-alert'],
    queryFn: () => apiFetch<{ items: Array<{ exam_date: string }> }>('/api/pesu-sync/exam-schedule'),
    retry: false,
  })

  const syncStatusQuery = useQuery({
    queryKey: ['sidebar-sync-status'],
    queryFn: () => apiFetch<{ status?: { sync_status?: string; last_synced?: string | null } }>('/api/pesu-sync/status'),
    retry: false,
  })

  const hasAttendanceRisk = (attendanceQuery.data?.items ?? []).some(item => item.percentage < 75)
  const hasNearExam = (examsQuery.data?.items ?? []).some(item => {
    const t = Date.parse(item.exam_date)
    if (Number.isNaN(t)) return false
    const diffDays = (t - Date.now()) / (1000 * 60 * 60 * 24)
    return diffDays >= 0 && diffDays <= 3
  })

  const syncState = syncStatusQuery.data?.status?.sync_status || 'never'
  const lastSynced = syncStatusQuery.data?.status?.last_synced || null

  const syncedAgo = (() => {
    if (!lastSynced) return ''
    const diffMin = Math.max(1, Math.floor((Date.now() - new Date(lastSynced).getTime()) / 60000))
    if (diffMin < 60) return `${diffMin}m ago`
    const hours = Math.floor(diffMin / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  })()

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col h-screen sticky top-0 border-r transition-all duration-200',
        collapsed ? 'w-16' : 'w-56'
      )}
      style={{ background: '#111111', borderColor: '#2a2a2a' }}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-2 px-4 py-4 border-b', collapsed && 'justify-center px-2')} style={{ borderColor: '#2a2a2a' }}>
        {!collapsed && (
          <span className="inline-flex items-center gap-2 font-semibold text-sm tracking-tight text-white select-none">
            <img src="/app-logo.jpeg" alt="PESimens logo" className="h-6 w-6 rounded-full object-cover" />
            PESimens <span className="text-[#6366f1]" aria-hidden="true">•</span>
          </span>
        )}
        {collapsed && <img src="/app-logo.jpeg" alt="PESimens logo" className="h-8 w-8 rounded-full object-cover" />}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto" aria-label="Sidebar navigation">
        {mainNavItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
              isActive
                ? 'bg-[#6366f1]/15 text-white ring-1 ring-[#6366f1]/25'
                : 'text-white/60 hover:bg-[rgba(255,255,255,0.04)] hover:text-white/85',
              collapsed && 'justify-center px-2'
            )}
            title={collapsed ? label : undefined}
          >
            {({ isActive }) => (
              <>
                {typeof icon === 'string' ? (
                  <span className="inline-flex h-5 w-5 items-center justify-center text-base leading-none">{icon}</span>
                ) : (
                  (() => {
                    const Icon = icon
                    return (
                      <span className="relative inline-flex">
                        <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-[#6366f1]' : 'text-white/55')} />
                      </span>
                    )
                  })()
                )}
                {!collapsed && <span className="min-w-0">{label}</span>}
              </>
            )}
          </NavLink>
        ))}

        <div className="my-2 border-t border-[#2a2a2a]" />

        {!collapsed && (
          <p
            style={{
              fontSize: '10px',
              color: '#4b5563',
              padding: '0 12px',
              marginTop: '8px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            PESU Academy
          </p>
        )}

        {[{ to: '/attendance', icon: BarChart2, label: 'Attendance' }, { to: '/timetable', icon: Clock, label: 'Timetable+Calendar' }].map(({ to, icon, label }) => (
          <NavLink
            key={`pesu-${to}`}
            to={to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
              isActive
                ? 'bg-[#6366f1]/15 text-white ring-1 ring-[#6366f1]/25'
                : 'text-white/60 hover:bg-[rgba(255,255,255,0.04)] hover:text-white/85',
              collapsed && 'justify-center px-2'
            )}
            title={collapsed ? label : undefined}
          >
            {({ isActive }) => {
              const Icon = icon
              const showAlert = (to === '/attendance' && hasAttendanceRisk) || (to === '/timetable' && hasNearExam)
              return (
                <>
                  <span className="relative inline-flex">
                    <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-[#6366f1]' : 'text-white/55')} />
                    {showAlert && <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" aria-label="Alert" />}
                  </span>
                  {!collapsed && <span>{label}</span>}
                </>
              )
            }}
          </NavLink>
        ))}

        {!collapsed && syncState === 'syncing' && (
          <div className="mt-1 flex items-center gap-2 px-3 py-1.5 text-xs text-white/50">
            <span className="h-3 w-3 animate-spin rounded-full border border-white/25 border-t-white/70" aria-hidden="true" />
            <span>Syncing...</span>
          </div>
        )}

        {!collapsed && syncState === 'success' && lastSynced && (
          <p className="mt-1 px-3 py-1.5 text-xs text-emerald-300">● Synced {syncedAgo}</p>
        )}

        {!collapsed && (
          <p
            style={{
              fontSize: '10px',
              color: '#4b5563',
              padding: '0 12px',
              marginTop: '8px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Explore
          </p>
        )}

        {secondaryNavItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
              isActive
                ? 'bg-[#6366f1]/15 text-white ring-1 ring-[#6366f1]/25'
                : 'text-white/60 hover:bg-[rgba(255,255,255,0.04)] hover:text-white/85',
              collapsed && 'justify-center px-2'
            )}
            title={collapsed ? label : undefined}
          >
            {({ isActive }) => (
              <>
                {typeof icon === 'string' ? (
                  <span className="inline-flex h-5 w-5 items-center justify-center text-base leading-none">{icon}</span>
                ) : (
                  (() => {
                    const Icon = icon
                    return (
                      <span className="relative inline-flex">
                        <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-[#6366f1]' : 'text-white/55')} />
                        {to === '/messages' && unreadCount > 0 && (
                          <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-red-500" aria-label={`${unreadCount} unread messages`} />
                        )}
                      </span>
                    )
                  })()
                )}
                {!collapsed && (
                  <span className="flex min-w-0 items-center gap-2">
                    <span>{label}</span>
                    {to === '/messages' && unreadCount > 0 && (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white" aria-hidden="true">
                        {unreadCount}
                      </span>
                    )}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
              isActive
                ? 'bg-red-500/15 text-red-200 ring-1 ring-red-500/25'
                : 'text-white/60 hover:bg-[rgba(255,255,255,0.04)] hover:text-white/85',
              collapsed && 'justify-center px-2'
            )}
            title={collapsed ? 'Admin' : undefined}
          >
            <Shield className={cn('h-5 w-5 shrink-0', 'text-red-300')} />
            {!collapsed && <span>Admin</span>}
          </NavLink>
        )}
      </nav>

      {/* User + collapse */}
      <div className="border-t p-2 space-y-1" style={{ borderColor: '#2a2a2a' }}>
        {!collapsed && user && (
          <>
            <Link
              to="/profile"
              style={{ textDecoration: 'none' }}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg block"
            >
              <div className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer hover:bg-[#2a2a2a] transition-colors border bg-white/3" style={{ borderColor: '#2a2a2a' }}>
                <UserAvatar name={user.display_name} avatarUrl={user.avatar_url} size="sm" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{user?.display_name || user?.email?.split('@')[0]}</p>
                  <p className="text-xs truncate" style={{ color: '#f59e0b' }}>⚡ {user.karma ?? 0} karma</p>
                </div>
              </div>
            </Link>
            <button
              onClick={() => setAboutOpen(true)}
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-2 py-1.5 text-left text-xs text-white/65 transition-colors hover:bg-white/5 hover:text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              About PESimens
            </button>
          </>
        )}
        {collapsed && user && (
          <Link
            to="/profile"
            title="View Profile"
            aria-label="View Profile"
            className="flex items-center justify-center rounded-xl p-2 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <UserAvatar name={user.display_name} avatarUrl={user.avatar_url} size="sm" />
          </Link>
        )}
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full p-2 rounded-xl text-white/45 hover:bg-white/5 hover:text-white/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {aboutOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="About PESimens">
          <button className="absolute inset-0 bg-black/70" onClick={() => setAboutOpen(false)} aria-label="Close about modal" />
          <section className="relative w-full max-w-md rounded-2xl border border-[#2a2a2a] bg-[#151515] p-5 text-white shadow-[0_30px_80px_-45px_rgba(0,0,0,1)]">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-lg font-bold">PESimens</p>
                <p className="text-xs text-white/50">Student community platform</p>
              </div>
              <button
                onClick={() => setAboutOpen(false)}
                className="rounded-full border border-[#2a2a2a] px-2 py-1 text-xs text-white/60 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label="Close about modal"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-sm text-white/85">
              <p>Welcome, {user?.display_name || user?.email?.split('@')[0] || 'Student'}</p>
              <p>{user?.branch || 'Branch'} · Sem {user?.semester ?? '--'} · {user?.campus || '--'} Campus</p>
              {user?.roll_no && <p>SRN: {user.roll_no}</p>}
            </div>

            <p className="mt-4 text-sm text-white/70">This is a student-built, student-run app. We are not affiliated with or monitored by PESU University.</p>
            <p className="mt-3 text-sm text-white/70">Confessions and posts are stored with a random ID, never your SRN or name.</p>

            
              href="https://github.com/Darshanpawar7/pesimens-app"
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm text-white/80 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              View on GitHub
            </a>
          </section>
        </div>
      )}
    </aside>
  )
}
