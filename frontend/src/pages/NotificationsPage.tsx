import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { dedupeNotifications, useNotifications, useMarkAllAsRead } from '../hooks/useNotifications'
import { Skeleton } from '../components/ui/skeleton'
import { NotificationItem } from '../components/notifications/NotificationItem'

type NotificationFilter = 'all' | 'unread'

function isRecent(isoTimestamp: string): boolean {
  return Date.now() - new Date(isoTimestamp).getTime() <= 24 * 60 * 60 * 1000
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<NotificationFilter>('all')
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useNotifications()
  const markAll = useMarkAllAsRead()

  const baseNotifications = dedupeNotifications(data?.pages.flatMap(p => p.items) ?? [])
  const unreadCount = baseNotifications.filter(n => !n.is_read).length
  const notifications = useMemo(
    () => (filter === 'unread' ? baseNotifications.filter(n => !n.is_read) : baseNotifications),
    [baseNotifications, filter]
  )
  const recentNotifications = notifications.filter(n => isRecent(n.created_at))
  const earlierNotifications = notifications.filter(n => !isRecent(n.created_at))

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()
    }, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-indigo-500" />
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">Notifications</h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Filter tabs */}
          <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            <button
              onClick={() => setFilter('all')}
              className={[
                'rounded-md px-2.5 py-1 text-xs font-medium transition-all',
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
              ].join(' ')}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={[
                'rounded-md px-2.5 py-1 text-xs font-medium transition-all',
                filter === 'unread'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
              ].join(' ')}
            >
              Unread
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              title="Mark all as read"
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 rounded-xl border border-slate-200/70 bg-white p-3 dark:border-slate-700/70 dark:bg-slate-900">
              <Skeleton variant="circle" className="h-8 w-8 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton variant="text" className="w-3/4" />
                <Skeleton variant="text" className="w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white py-12 text-center dark:border-slate-700/80 dark:bg-slate-900">
          <Bell className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">All caught up</p>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">No notifications to show</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recentNotifications.length > 0 && (
            <section>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">New</p>
              <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-slate-700/80 dark:bg-slate-900">
                {recentNotifications.map((n, idx) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    index={idx}
                    isLast={idx === recentNotifications.length - 1}
                  />
                ))}
              </div>
            </section>
          )}

          {earlierNotifications.length > 0 && (
            <section>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Earlier</p>
              <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-slate-700/80 dark:bg-slate-900">
                {earlierNotifications.map((n, idx) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    index={idx + recentNotifications.length}
                    isLast={idx === earlierNotifications.length - 1}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <div ref={loadMoreRef} className="h-4" />
    </div>
  )
}
