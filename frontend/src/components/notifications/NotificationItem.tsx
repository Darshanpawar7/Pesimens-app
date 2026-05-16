import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  MessageCircle,
  Star,
  Store,
  Trash2,
  Trophy,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import { useMarkAsRead, useDeleteNotification, type Notification } from '../../hooks/useNotifications'
import { cn } from '../../lib/utils'
import { formatDistanceToNow } from '../../lib/utils'

type NotificationVisual = {
  icon: LucideIcon
  bg: string
  color: string
}

const typeVisual: Record<string, NotificationVisual> = {
  rsvp_confirmed:      { icon: CalendarDays,  bg: 'bg-emerald-100 dark:bg-emerald-500/15', color: 'text-emerald-600 dark:text-emerald-400' },
  event_update:        { icon: CalendarDays,  bg: 'bg-sky-100 dark:bg-sky-500/15',         color: 'text-sky-600 dark:text-sky-400' },
  event_cancelled:     { icon: AlertTriangle, bg: 'bg-rose-100 dark:bg-rose-500/15',       color: 'text-rose-600 dark:text-rose-400' },
  club_update:         { icon: Bell,          bg: 'bg-indigo-100 dark:bg-indigo-500/15',   color: 'text-indigo-600 dark:text-indigo-400' },
  badge_earned:        { icon: Trophy,        bg: 'bg-amber-100 dark:bg-amber-500/15',     color: 'text-amber-600 dark:text-amber-400' },
  karma_update:        { icon: Star,          bg: 'bg-violet-100 dark:bg-violet-500/15',   color: 'text-violet-600 dark:text-violet-400' },
  new_message:         { icon: MessageCircle, bg: 'bg-cyan-100 dark:bg-cyan-500/15',       color: 'text-cyan-600 dark:text-cyan-400' },
  marketplace_interest:{ icon: Store,         bg: 'bg-orange-100 dark:bg-orange-500/15',   color: 'text-orange-600 dark:text-orange-400' },
  booking_request:     { icon: BookOpen,      bg: 'bg-fuchsia-100 dark:bg-fuchsia-500/15', color: 'text-fuchsia-600 dark:text-fuchsia-400' },
  booking_confirmed:   { icon: Check,         bg: 'bg-emerald-100 dark:bg-emerald-500/15', color: 'text-emerald-600 dark:text-emerald-400' },
  booking_cancelled:   { icon: AlertTriangle, bg: 'bg-rose-100 dark:bg-rose-500/15',       color: 'text-rose-600 dark:text-rose-400' },
  new_follower:        { icon: UserPlus,      bg: 'bg-indigo-100 dark:bg-indigo-500/15',   color: 'text-indigo-600 dark:text-indigo-400' },
  attendance_alert:    { icon: AlertTriangle, bg: 'bg-amber-100 dark:bg-amber-500/15',     color: 'text-amber-600 dark:text-amber-400' },
}

const fallbackVisual: NotificationVisual = {
  icon: Bell,
  bg: 'bg-slate-100 dark:bg-slate-700',
  color: 'text-slate-500 dark:text-slate-400',
}

interface NotificationItemProps {
  notification: Notification
  index?: number
  isLast?: boolean
}

export function NotificationItem({ notification: n, index = 0, isLast = false }: NotificationItemProps) {
  const navigate = useNavigate()
  const markRead = useMarkAsRead()
  const deleteNotif = useDeleteNotification()
  const visual = typeVisual[n.type] ?? fallbackVisual
  const Icon = visual.icon

  const handleClick = () => {
    if (!n.is_read) markRead.mutate(n.id)
    if (n.link) navigate(n.link)
  }

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 px-3 py-2.5 transition-colors duration-150 cursor-pointer',
        !isLast && 'border-b border-slate-100 dark:border-slate-800',
        n.is_read
          ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
          : 'bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-500/5 dark:hover:bg-indigo-500/10'
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
      style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
    >
      {/* Icon */}
      <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', visual.bg)}>
        <Icon className={cn('h-3.5 w-3.5', visual.color)} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-xs leading-snug',
          n.is_read
            ? 'text-slate-600 dark:text-slate-300'
            : 'font-semibold text-slate-900 dark:text-white'
        )}>
          {n.title}
        </p>
        <p className="mt-0.5 line-clamp-1 text-xs text-slate-400 dark:text-slate-500">
          {n.message}
        </p>
        <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-600">
          {formatDistanceToNow(n.created_at)}
        </p>
      </div>

      {/* Actions — visible on hover */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {!n.is_read && (
          <button
            onClick={e => { e.stopPropagation(); markRead.mutate(n.id) }}
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-indigo-600 dark:hover:bg-slate-700 dark:hover:text-indigo-400"
            aria-label="Mark as read"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); deleteNotif.mutate(n.id) }}
          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-rose-500 dark:hover:bg-slate-700 dark:hover:text-rose-400"
          aria-label="Delete notification"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Unread dot */}
      {!n.is_read && (
        <span className="absolute right-3 top-3.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
      )}
    </div>
  )
}
