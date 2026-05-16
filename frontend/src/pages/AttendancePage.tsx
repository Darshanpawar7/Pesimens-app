import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import PesuConnectCard from '@/components/pesu/PesuConnectCard'
import {
  adaptiveRefetchIntervalWhenActive,
  adaptiveRefetchOnReconnect,
  adaptiveRefetchOnWindowFocus,
  adaptiveStaleTime,
} from '@/lib/queryThrottle'

interface AttendanceItem {
  id: string
  subject_name: string
  subject_code: string | null
  conducted: number
  attended: number
  percentage: number
  last_synced: string
}

interface SyncStatus {
  status?: {
    last_synced?: string | null
    sync_status?: string
  }
}

interface TimetableSlot {
  id: string
  day: string
  start_time: string
  end_time: string
  subject_name: string
  subject_code: string | null
}

function ringColor(pct: number) {
  if (pct >= 85) return '#22c55e'
  if (pct >= 75) return '#f59e0b'
  return '#ef4444'
}

function ProgressRing({ pct, size = 110, stroke = 10 }: { pct: number; size?: number; stroke?: number }) {
  const value = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="#2a2a2a" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={ringColor(value)}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}

function timeAgo(iso?: string | null): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.max(1, Math.floor(diff / 60000))
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function toMinutes(value: string): number {
  const parts = value.split(':')
  const h = Number(parts[0])
  const m = Number(parts[1])
  if (!Number.isFinite(h) || !Number.isFinite(m)) return -1
  return h * 60 + m
}

function todayName(): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date())
}

function localDateStr(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getRiskySubjectQuip(count: number): string {
  if (count === 1) return 'Keep the Medical Certificate Ready. Just one slip-up away from a lecture from your parents.'
  if (count === 2) return 'Your attendance sheet looks like a horror movie. Start praying.'
  if (count === 3) return 'Your professor knows your face only from the attendance register.'
  if (count === 4) return 'Bro, are you even enrolled? The college has filed a missing person report.'
  if (count === 5) return 'Five subjects! At this point just apply for a guest pass to your own college.'
  if (count === 6) return 'Six subjects in the danger zone. Your college ID might as well say "Occasional Visitor".'
  if (count === 7) return 'Seven subjects! Legend. The security guard has started asking for your ID every single day.'
  if (count === 8) return 'Eight subjects below 75%. Your seat in class has been officially declared a heritage site — untouched.'
  return `${count} subjects! The college has started charging you a tourist entry fee.`
}

export default function AttendancePage() {
  const queryClient = useQueryClient()
  const [sortBy, setSortBy] = useState<'lowest' | 'alpha' | 'most'>('lowest')
  const [alertState, setAlertState] = useState<Record<string, 'yes' | 'no'>>({})
  const [syncError, setSyncError] = useState<string | null>(null)

  const attendanceQuery = useQuery({
    queryKey: ['pesu-sync-attendance'],
    queryFn: () => apiFetch<{ items: AttendanceItem[] }>('/api/pesu-sync/attendance'),
    staleTime: adaptiveStaleTime(5 * 60 * 1000), // 5 minutes
    refetchInterval: () => adaptiveRefetchIntervalWhenActive(5 * 60 * 1000, 'default', { // 5 minutes instead of 30 seconds
      suspendDuringInteraction: true,
      interactionWindowMs: 10_000,
    }),
    refetchOnWindowFocus: adaptiveRefetchOnWindowFocus(false),
    refetchOnReconnect: adaptiveRefetchOnReconnect(false),
    retry: false,
  })

  const statusQuery = useQuery({
    queryKey: ['pesu-sync-status'],
    queryFn: () => apiFetch<SyncStatus>('/api/pesu-sync/status'),
    staleTime: adaptiveStaleTime(5 * 60 * 1000), // 5 minutes
    refetchInterval: () => adaptiveRefetchIntervalWhenActive(5 * 60 * 1000, 'default', { // 5 minutes instead of 30 seconds
      suspendDuringInteraction: true,
      interactionWindowMs: 10_000,
    }),
    refetchOnWindowFocus: adaptiveRefetchOnWindowFocus(false),
    refetchOnReconnect: adaptiveRefetchOnReconnect(false),
    retry: false,
  })

  const timetableQuery = useQuery({
    queryKey: ['pesu-sync-timetable-for-att-alert'],
    queryFn: () => apiFetch<{ items: TimetableSlot[] }>('/api/pesu-sync/timetable'),
    staleTime: adaptiveStaleTime(5 * 60 * 1000), // 5 minutes
    refetchInterval: () => adaptiveRefetchIntervalWhenActive(5 * 60 * 1000, 'default', { // 5 minutes instead of 1 minute
      suspendDuringInteraction: true,
      interactionWindowMs: 10_000,
    }),
    refetchOnWindowFocus: adaptiveRefetchOnWindowFocus(false),
    refetchOnReconnect: adaptiveRefetchOnReconnect(false),
    retry: false,
  })

  const syncMutation = useMutation({
    mutationFn: () => apiFetch<{ ok: boolean }>('/api/pesu-sync/trigger', {
      method: 'POST',
    }),
    onSuccess: () => {
      setSyncError(null)
      void queryClient.invalidateQueries({ queryKey: ['pesu-sync-status'] })
      void queryClient.invalidateQueries({ queryKey: ['pesu-sync-attendance'] })
      void queryClient.invalidateQueries({ queryKey: ['pesu-sync-timetable-for-att-alert'] })
    },
    onError: (err) => {
      setSyncError(err instanceof Error ? err.message : 'Sync failed')
    },
  })

  const sorted = useMemo(() => {
    const items = [...(attendanceQuery.data?.items ?? [])]
    if (sortBy === 'alpha') {
      items.sort((a, b) => a.subject_name.localeCompare(b.subject_name))
    } else if (sortBy === 'most') {
      items.sort((a, b) => b.conducted - a.conducted)
    } else {
      items.sort((a, b) => a.percentage - b.percentage)
    }
    return items
  }, [attendanceQuery.data?.items, sortBy])

  const totals = useMemo(() => {
    const items = attendanceQuery.data?.items ?? []
    const risky = items.filter(i => i.percentage < 75).length
    const safe = items.filter(i => i.percentage >= 75).length
    const overall = items.length > 0
      ? items.reduce((acc, item) => acc + item.percentage, 0) / items.length
      : 0
    return { risky, safe, overall }
  }, [attendanceQuery.data?.items])

  const todayAlerts = useMemo(() => {
    const now = new Date()
    const nowMin = now.getHours() * 60 + now.getMinutes()
    const day = todayName()
    const items = timetableQuery.data?.items ?? []

    return items
      .filter(slot => slot.day === day)
      .map(slot => {
        const endMin = toMinutes(slot.end_time)
        if (endMin < 0) return null
        const minsSinceEnd = nowMin - endMin
        if (minsSinceEnd < 30 || minsSinceEnd >= 24 * 60) return null
        const code = slot.subject_code || slot.subject_name
        return {
          id: slot.id,
          key: `att_alert_${code}_${localDateStr()}`,
          subjectName: slot.subject_name,
          subjectCode: slot.subject_code || '',
        }
      })
      .filter((v): v is { id: string; key: string; subjectName: string; subjectCode: string } => Boolean(v))
  }, [timetableQuery.data?.items])

  useEffect(() => {
    const next: Record<string, 'yes' | 'no'> = {}
    for (const alert of todayAlerts) {
      const value = localStorage.getItem(alert.key)
      if (value === 'yes' || value === 'no') next[alert.key] = value
    }
    setAlertState(next)
  }, [todayAlerts])

  // Fire attendance-alert notifications for subjects that haven't been dismissed yet
  useEffect(() => {
    for (const alert of todayAlerts) {
      const dismissed = localStorage.getItem(alert.key)
      if (dismissed) continue
      const notifKey = `att_notif_sent_${alert.key}`
      if (localStorage.getItem(notifKey)) continue
      localStorage.setItem(notifKey, '1')
      void apiFetch('/api/notifications/attendance-alert', {
        method: 'POST',
        body: JSON.stringify({ subject_name: alert.subjectName }),
      }).catch(() => { /* best-effort */ })
    }
  }, [todayAlerts])

  function dismissAlert(key: string, value: 'yes' | 'no') {
    localStorage.setItem(key, value)
    setAlertState(prev => ({ ...prev, [key]: value }))
  }

  function triggerSyncNow() {
    if (syncMutation.isPending) return
    setSyncError(null)
    syncMutation.mutate()
  }

  if (attendanceQuery.isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#0f0f0f] p-6 text-white">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="h-16 animate-pulse rounded-2xl bg-[#1a1a1a]" />
          <div className="h-48 animate-pulse rounded-2xl bg-[#1a1a1a]" />
          <div className="h-28 animate-pulse rounded-2xl bg-[#1a1a1a]" />
          <div className="h-28 animate-pulse rounded-2xl bg-[#1a1a1a]" />
        </div>
      </div>
    )
  }

  const items = sorted
  const hasData = items.length > 0
  const syncState = statusQuery.data?.status?.sync_status || 'never'
  const showPesuConnect = !hasData

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--bg-base)] px-4 py-5 text-white md:px-6">
      <div className="mx-auto max-w-6xl space-y-4">
        {syncState === 'syncing' && (
          <section className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-3 text-sm text-white/70">
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border border-white/25 border-t-white/70" />
              <span>Syncing your data...</span>
            </div>
          </section>
        )}

        <section
          className="rounded-2xl border border-[#2a2a2a] p-5"
          style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">My Attendance</h1>
              <p className="mt-1 text-sm text-white/60">Last synced: {timeAgo(statusQuery.data?.status?.last_synced)}</p>
            </div>
            <button
              onClick={triggerSyncNow}
              disabled={syncMutation.isPending || syncState === 'syncing'}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/25 disabled:opacity-50 md:self-auto"
            >
              {syncMutation.isPending || syncState === 'syncing' ? (
                <><span className="h-3.5 w-3.5 animate-spin rounded-full border border-indigo-300/40 border-t-indigo-200" />Syncing...</>
              ) : (
                '↻ Sync Now'
              )}
            </button>
          </div>
          <p className="mt-4 text-5xl font-bold leading-none">{totals.overall.toFixed(1)}%</p>
          <p className="mt-2 text-sm text-white/75">{totals.safe} subjects above 75%</p>
          <div className="mt-4 flex gap-2 overflow-x-auto hide-scrollbar">
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-100">✅ {totals.safe} safe</span>
            <span className="rounded-full border border-amber-500/45 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-100">⚠️ {totals.risky} at risk</span>
          </div>
          {syncError && <p className="mt-3 text-xs text-red-300">{syncError}</p>}
        </section>

        {showPesuConnect && (
          <PesuConnectCard
            onConnected={() => {
              void queryClient.invalidateQueries({ queryKey: ['pesu-sync-attendance'] })
              void queryClient.invalidateQueries({ queryKey: ['pesu-sync-status'] })
            }}
          />
        )}

        {!hasData && !showPesuConnect && (
          <section className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-8 text-center">
            <p className="text-5xl">🔄</p>
            <h2 className="mt-2 text-lg font-semibold">No attendance records yet</h2>
            <p className="mt-2 text-sm text-white/60">Sync from PESU Academy to load your latest attendance.</p>
            <button
              onClick={triggerSyncNow}
              disabled={syncMutation.isPending || syncState === 'syncing'}
              className="mt-4 rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-4 py-2 text-sm font-semibold text-indigo-200 disabled:opacity-50"
            >
              {syncMutation.isPending || syncState === 'syncing' ? 'Syncing...' : 'Sync Now'}
            </button>
            {syncError && (
              <p className="mt-2 text-xs text-red-300">{syncError}</p>
            )}
          </section>
        )}

        {hasData && (
          <>
            <section className="space-y-2">
              {todayAlerts.map(alert => {
                const state = alertState[alert.key]
                if (state === 'yes') return null
                if (state === 'no') {
                  return (
                    <article key={alert.id} className="rounded-2xl border border-red-500/35 bg-red-500/10 p-4">
                      <p className="font-semibold text-red-200">Marked as absent for {alert.subjectName}</p>
                    </article>
                  )
                }

                return (
                  <article key={alert.id} className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4">
                    <p className="font-semibold text-amber-200">⚠️ Did you attend {alert.subjectName} today?</p>
                    <p className="mt-1 text-sm text-amber-100/90">If your attendance wasn&apos;t marked, you have until midnight to alert your teacher.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => dismissAlert(alert.key, 'yes')}
                        className="rounded-lg border border-emerald-500/45 bg-emerald-500/15 px-3 py-1.5 text-sm text-emerald-200"
                      >
                        Yes, I was there
                      </button>
                      <button
                        onClick={() => dismissAlert(alert.key, 'no')}
                        className="rounded-lg border border-red-500/45 bg-red-500/15 px-3 py-1.5 text-sm text-red-200"
                      >
                        No, I missed it
                      </button>
                    </div>
                  </article>
                )
              })}
            </section>

            {totals.risky > 0 && (
              <section className="rounded-2xl border border-red-500/35 bg-red-500/10 p-4">
                <p className="font-semibold text-red-200">⚠️ {totals.risky} subject(s) below 75% attendance</p>
                <p className="text-sm text-red-300/90">{getRiskySubjectQuip(totals.risky)}</p>
              </section>
            )}

            <section className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-white/60">Sort subjects</p>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as 'lowest' | 'alpha' | 'most')}
                  className="rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm"
                >
                  <option value="lowest">Lowest % first</option>
                  <option value="alpha">Alphabetical</option>
                  <option value="most">Most classes</option>
                </select>
              </div>
            </section>

            <section className="space-y-3">
              {items.map(item => {
                const pct = item.percentage || 0
                const color = ringColor(pct)
                const canBunk = Math.floor((item.attended - 0.75 * item.conducted) / 0.75)
                const classesNeeded = Math.max(0, Math.ceil(((0.75 * item.conducted) - item.attended) / 0.25))
                const trendUp = pct >= 75

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border-l-4 border-y border-r bg-[var(--bg-card)] p-4 transition hover:bg-[#1a1a1a]"
                    style={{ borderLeftColor: color, borderTopColor: 'var(--border)', borderRightColor: 'var(--border)', borderBottomColor: 'var(--border)' }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0">
                        <ProgressRing pct={pct} size={56} stroke={5} />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color }}>{pct.toFixed(0)}%</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{item.subject_name}</p>
                        {item.subject_code && <p className="text-xs text-white/40">{item.subject_code}</p>}
                        <p className="mt-0.5 text-xs text-white/55">{item.attended}/{item.conducted} classes</p>
                        {canBunk > 0 ? (
                          <p className="mt-1 text-xs font-medium text-emerald-300">Can bunk {canBunk} more</p>
                        ) : (
                          <p className="mt-1 text-xs font-medium text-red-300">Need {classesNeeded} more classes</p>
                        )}
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-xl font-bold" style={{ color }}>{pct.toFixed(1)}%</p>
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${trendUp ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                          {trendUp ? 'safe' : 'at risk'}
                        </span>
                      </div>
                    </div>
                  </article>
                )
              })}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
