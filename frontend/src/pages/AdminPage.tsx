import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/use-toast'

interface QueueData {
  pyqs: { id: string; subject: string; course: string; exam_type: string; status: string; flag_count: number }[]
  placements: { id: string; company: string; role: string; year_of_placement: number }[]
  mentors: { user_id: string; bio: string; subjects: string[]; hourly_rate: number; profile: { display_name: string | null; email: string } }[]
  flagged: { id: string; subject: string; flag_count: number }[]
}

interface Stats {
  total_users: number
  total_pyqs: number
  pending_approvals: number
  total_bookings: number
  revenue_this_month: number
  dau_30d: { date: string; dau: number }[]
}

interface ReportItem {
  id: string
  reporter_id: string | null
  target_type: 'pyq' | 'comment' | 'placement' | 'mentor' | 'confession'
  target_id: string
  reason: string
  status: 'pending' | 'reviewed' | 'dismissed'
  created_at: string
  reporter?: { display_name: string | null; email: string } | null
  target_meta?: { title: string; subtitle?: string; snippet?: string }
  redirect_path?: string | null
}

interface ReportsResponse {
  items: ReportItem[]
  nextCursor: string | null
  hasMore: boolean
}

interface User {
  id: string
  display_name: string | null
  email: string
  role: string
  karma: number
  created_at: string
  last_active_date: string | null
  blocked_reason?: string | null
}

interface UsersResponse {
  items: User[]
  nextCursor: string | null
  hasMore: boolean
}

type AdminTab = 'stats' | 'queue' | 'reports' | 'users' | 'audit'

export function AdminPage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<AdminTab>('stats')
  const [userSearch, setUserSearch] = useState('')
  const [showBlockedOnly, setShowBlockedOnly] = useState(false)
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({})
  const [reportStatus, setReportStatus] = useState<'all' | 'pending' | 'reviewed' | 'dismissed'>('pending')
  const [reportType, setReportType] = useState<'all' | 'pyq' | 'comment' | 'placement' | 'mentor' | 'confession'>('all')
  const [reportFrom, setReportFrom] = useState('')
  const [reportTo, setReportTo] = useState('')

  const statsQuery = useQuery({ queryKey: ['admin', 'stats'], queryFn: () => apiFetch<Stats>('/api/admin/stats'), enabled: tab === 'stats' })
  const queueQuery = useQuery({ queryKey: ['admin', 'queue'], queryFn: () => apiFetch<QueueData>('/api/admin/queue'), enabled: tab === 'queue' })
  const usersQuery = useQuery({
    queryKey: ['admin', 'users', userSearch, showBlockedOnly ? 'suspended' : 'all'],
    queryFn: async () => {
      const allUsers: User[] = []
      let cursor: string | null = null

      for (let page = 0; page < 20; page += 1) {
        const params = new URLSearchParams()
        params.set('limit', '100')
        if (userSearch) params.set('q', userSearch)
        if (showBlockedOnly) params.set('role', 'suspended')
        if (cursor) params.set('cursor', cursor)

        const result = await apiFetch<UsersResponse>(`/api/admin/users?${params.toString()}`)
        allUsers.push(...result.items)

        if (!result.hasMore || !result.nextCursor) break
        cursor = result.nextCursor
      }

      return { items: allUsers }
    },
    enabled: tab === 'users',
  })
  const reportsQuery = useQuery({
    queryKey: ['admin', 'reports', reportStatus, reportType, reportFrom, reportTo],
    queryFn: () => {
      const params = new URLSearchParams()
      if (reportStatus !== 'all') params.set('status', reportStatus)
      if (reportType !== 'all') params.set('target_type', reportType)
      if (reportFrom) params.set('from', `${reportFrom}T00:00:00.000Z`)
      if (reportTo) params.set('to', `${reportTo}T23:59:59.999Z`)

      const query = params.toString()
      return apiFetch<ReportsResponse>(`/api/admin/reports${query ? `?${query}` : ''}`)
    },
    enabled: tab === 'reports',
  })
  const auditQuery = useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: () => apiFetch<{ entries: { id: string; action: string; target_type: string; target_id: string; reason?: string; created_at: string; admin: { display_name: string | null } }[] }>('/api/admin/audit-log'),
    enabled: tab === 'audit',
  })

  const updateReportStatusMutation = useMutation({
    mutationFn: ({ reportId, status }: { reportId: string; status: 'reviewed' | 'dismissed' }) =>
      apiFetch<{ ok: boolean; report: { id: string; status: 'reviewed' | 'dismissed' } }>(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: async (_result, variables) => {
      toast({ variant: 'success', title: `Report marked ${variables.status}` })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] })
    },
    onError: (error) => {
      toast({ variant: 'error', title: 'Failed to update report', description: error instanceof Error ? error.message : 'Something went wrong' })
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      apiFetch<{ ok: boolean; success: boolean }>(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        body: JSON.stringify(reason ? { reason } : {}),
      }),
    onSuccess: async () => {
      toast({ variant: 'success', title: 'User deleted' })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] }),
      ])
    },
    onError: (error) => {
      toast({ variant: 'error', title: 'Failed to delete user', description: error instanceof Error ? error.message : 'Something went wrong' })
    },
  })

  const setUserStatusMutation = useMutation({
    mutationFn: ({ userId, status, reason }: { userId: string; status: 'active' | 'suspended'; reason?: string }) =>
      apiFetch<{ ok: boolean; success: boolean }>(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(reason ? { status, reason } : { status }),
      }),
    onSuccess: async (_result, variables) => {
      toast({
        variant: 'success',
        title: variables.status === 'suspended' ? 'User blocked' : 'User unblocked',
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] }),
      ])
    },
    onError: (error) => {
      toast({
        variant: 'error',
        title: 'Failed to update user status',
        description: error instanceof Error ? error.message : 'Something went wrong',
      })
    },
  })

  const cleanupDummyUsersMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean; deletedCount: number; failedCount: number }>('/api/admin/users/cleanup-dummy', {
        method: 'POST',
        body: JSON.stringify({ reason: 'admin_cleanup_dummy_users', dryRun: false }),
      }),
    onSuccess: async (result) => {
      toast({
        variant: 'success',
        title: 'Dummy users cleanup complete',
        description: `Deleted ${result.deletedCount} users${result.failedCount > 0 ? `, failed ${result.failedCount}` : ''}`,
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] }),
      ])
    },
    onError: (error) => {
      toast({ variant: 'error', title: 'Cleanup failed', description: error instanceof Error ? error.message : 'Something went wrong' })
    },
  })

  const deletePyqMutation = useMutation({
    mutationFn: ({ pyqId, reason }: { pyqId: string; reason?: string }) =>
      apiFetch<{ success: boolean }>(`/api/admin/pyqs/${pyqId}`, {
        method: 'DELETE',
        body: JSON.stringify(reason ? { reason } : {}),
      }),
    onSuccess: async () => {
      toast({ variant: 'success', title: 'PYQ deleted' })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] }),
      ])
    },
    onError: (error) => {
      toast({ variant: 'error', title: 'Failed to delete PYQ', description: error instanceof Error ? error.message : 'Something went wrong' })
    },
  })

  if (!profile || !['admin', 'moderator'].includes(profile.role)) {
    return <div className="p-8 text-center text-red-500">Access denied. Admin only.</div>
  }

  async function moderate(type: string, id: string, action: 'approve' | 'reject') {
    try {
      await apiFetch(`/api/admin/content/${type}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action, reason: rejectReason[id] }),
      })
      queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
    } catch (error) {
      console.error('Failed to moderate content', error)
    }
  }

  async function updateRole(userId: string, role: string) {
    try {
      await apiFetch(`/api/admin/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    } catch (error) {
      console.error('Failed to update user role', error)
    }
  }

  function formatLastActive(value: string | null): string {
    if (!value) return 'Unknown'

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Unknown'

    const diffMs = Date.now() - date.getTime()
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) return 'Active now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 30) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const tabs: { key: AdminTab; label: string }[] = [
    { key: 'stats', label: 'Dashboard' },
    { key: 'queue', label: `Queue${queueQuery.data ? ` (${queueQuery.data.pyqs.length + queueQuery.data.placements.length + queueQuery.data.mentors.length})` : ''}` },
    { key: 'reports', label: `Reports${reportsQuery.data ? ` (${reportsQuery.data.items.length})` : ''}` },
    { key: 'users', label: 'Users' },
    { key: 'audit', label: 'Audit Log' },
  ]

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-sm text-gray-500">Logged in as {profile.display_name} ({profile.role})</p>
        </div>

        <div className="flex gap-1 bg-[#242424] rounded-lg p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-[#1b1b1b] shadow-none text-white' : 'text-gray-300 hover:text-gray-100'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'stats' && statsQuery.data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Total Users', value: statsQuery.data.total_users },
                { label: 'Approved PYQs', value: statsQuery.data.total_pyqs },
                { label: 'Pending Approvals', value: statsQuery.data.pending_approvals },
                { label: 'Total Bookings', value: statsQuery.data.total_bookings },
                { label: 'Revenue (Month)', value: `₹${statsQuery.data.revenue_this_month.toLocaleString()}` },
              ].map((s) => (
                <div key={s.label} className="bg-[#1a1a1a] rounded-lg shadow-none p-4 text-center">
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-[#1a1a1a] rounded-lg shadow-none p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-200">Daily Active Users (Last 30 Days)</h2>
                <span className="text-xs text-gray-500">Based on analytics events</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
                {statsQuery.data.dau_30d.map((item) => (
                  <div key={item.date} className="rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2">
                    <p className="text-xs text-gray-500">{item.date}</p>
                    <p className="text-sm font-semibold text-white">{item.dau}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'queue' && queueQuery.data && (
          <div className="space-y-6">
            {queueQuery.data.pyqs.length > 0 && (
              <div className="bg-[#1a1a1a] rounded-lg shadow-none p-4 space-y-3">
                <h2 className="font-semibold text-gray-200">Pending PYQs ({queueQuery.data.pyqs.length})</h2>
                {queueQuery.data.pyqs.map((p) => (
                  <div key={p.id} className="border border-[#2a2a2a] rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{p.subject} - {p.exam_type}</p>
                        <p className="text-xs text-gray-500">{p.course} · Status: <Badge variant="secondary">{p.status}</Badge></p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Input className="w-40 h-7 text-xs" placeholder="Reject reason..." value={rejectReason[p.id] ?? ''} onChange={(e) => setRejectReason((r) => ({ ...r, [p.id]: e.target.value }))} />
                        <Button size="sm" onClick={() => moderate('pyq', p.id, 'approve')}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => moderate('pyq', p.id, 'reject')}>Reject</Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (!window.confirm('Permanently delete this PYQ? This cannot be undone.')) return
                            deletePyqMutation.mutate({ pyqId: p.id, reason: rejectReason[p.id] })
                          }}
                          disabled={deletePyqMutation.isPending}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {queueQuery.data.flagged.length > 0 && (
              <div className="bg-[#1a1a1a] rounded-lg shadow-none p-4 space-y-3">
                <h2 className="font-semibold text-gray-200">Flagged PYQs ({queueQuery.data.flagged.length})</h2>
                {queueQuery.data.flagged.map((p) => (
                  <div key={p.id} className="border border-[#2a2a2a] rounded-lg p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm text-white/90">{p.subject}</p>
                      <p className="text-xs text-gray-500">Flags: {p.flag_count}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (!window.confirm('Permanently delete this flagged PYQ? This cannot be undone.')) return
                        deletePyqMutation.mutate({ pyqId: p.id })
                      }}
                      disabled={deletePyqMutation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {queueQuery.data.placements.length > 0 && (
              <div className="bg-[#1a1a1a] rounded-lg shadow-none p-4 space-y-3">
                <h2 className="font-semibold text-gray-200">Pending Placements ({queueQuery.data.placements.length})</h2>
                {queueQuery.data.placements.map((p) => (
                  <div key={p.id} className="border border-[#2a2a2a] rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{p.company} - {p.role}</p>
                      <p className="text-xs text-gray-500">{p.year_of_placement}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Input className="w-40 h-7 text-xs" placeholder="Reject reason..." value={rejectReason[p.id] ?? ''} onChange={(e) => setRejectReason((r) => ({ ...r, [p.id]: e.target.value }))} />
                      <Button size="sm" onClick={() => moderate('placement', p.id, 'approve')}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => moderate('placement', p.id, 'reject')}>Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {queueQuery.data.mentors.length > 0 && (
              <div className="bg-[#1a1a1a] rounded-lg shadow-none p-4 space-y-3">
                <h2 className="font-semibold text-gray-200">Mentor Applications ({queueQuery.data.mentors.length})</h2>
                {queueQuery.data.mentors.map((m) => (
                  <div key={m.user_id} className="border border-[#2a2a2a] rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{m.profile.display_name ?? m.profile.email}</p>
                        <p className="text-xs text-gray-500">{m.subjects.join(', ')} · ₹{m.hourly_rate}/hr</p>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{m.bio}</p>
                      </div>
                      <div className="flex gap-2 items-center shrink-0">
                        <Input className="w-40 h-7 text-xs" placeholder="Reject reason..." value={rejectReason[m.user_id] ?? ''} onChange={(e) => setRejectReason((r) => ({ ...r, [m.user_id]: e.target.value }))} />
                        <Button size="sm" onClick={() => moderate('mentor', m.user_id, 'approve')}>Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => moderate('mentor', m.user_id, 'reject')}>Reject</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {queueQuery.data.pyqs.length === 0 && queueQuery.data.placements.length === 0 && queueQuery.data.mentors.length === 0 && (
              <p className="text-center text-gray-500 py-12">Queue is empty. All caught up!</p>
            )}
          </div>
        )}

        {tab === 'users' && (
          <div className="bg-[#1a1a1a] rounded-lg shadow-none p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Input placeholder="Search by name or email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="max-w-sm" />
              <Button
                type="button"
                variant={showBlockedOnly ? 'default' : 'outline'}
                onClick={() => setShowBlockedOnly(prev => !prev)}
              >
                {showBlockedOnly ? 'Showing blocked accounts' : 'Blocked only'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!window.confirm('Delete all detected dummy/test users now? This cannot be undone.')) return
                  cleanupDummyUsersMutation.mutate()
                }}
                disabled={cleanupDummyUsersMutation.isPending}
              >
                {cleanupDummyUsersMutation.isPending ? 'Cleaning...' : 'Cleanup Dummy Users'}
              </Button>
              <span className="text-xs text-gray-500">
                Showing {usersQuery.data?.items.length ?? 0} {showBlockedOnly ? 'blocked' : 'users'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wide">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Email</th>
                    <th className="pb-2 pr-4">Role</th>
                    <th className="pb-2 pr-4">Karma</th>
                    <th className="pb-2 pr-4">Last Active</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a2a]">
                  {usersQuery.data?.items.map((u) => (
                    <tr key={u.id}>
                      <td className="py-2 pr-4 font-medium">{u.display_name ?? '—'}</td>
                      <td className="py-2 pr-4 text-gray-500 text-xs">{u.email}</td>
                      <td className="py-2 pr-4">
                        <select className="bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none" value={u.role} onChange={(e) => updateRole(u.id, e.target.value)}>
                          {['student', 'mentor', 'moderator', 'admin', 'suspended'].map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="py-2 pr-4 text-gray-400">{u.karma}</td>
                      <td className="py-2 pr-4 text-gray-400">{formatLastActive(u.last_active_date)}</td>
                      <td className="py-2 text-xs text-gray-500">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span>{new Date(u.created_at).toLocaleDateString()}</span>
                            {u.role === 'suspended' && (
                              <Badge variant="destructive" className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                                Blocked
                              </Badge>
                            )}
                          </div>
                          {u.role === 'suspended' && (
                            <p className="max-w-[240px] text-[11px] leading-4 text-red-300">
                              Reason: {u.blocked_reason?.trim() || 'No reason provided'}
                            </p>
                          )}
                          <button
                            type="button"
                            className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                              u.role === 'suspended'
                                ? 'border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/10'
                                : 'border-amber-500/35 text-amber-300 hover:bg-amber-500/10'
                            }`}
                            onClick={() => {
                              if (u.id === profile.id) return
                              if (u.role === 'suspended') {
                                if (!window.confirm(`Unblock user ${u.email}?`)) return
                                setUserStatusMutation.mutate({ userId: u.id, status: 'active' })
                              } else {
                                if (!window.confirm(`Block user ${u.email} from logging in?`)) return
                                const reason = window.prompt('Add a short reason for blocking this account (optional).', u.blocked_reason ?? '')
                                if (reason === null) return
                                setUserStatusMutation.mutate({
                                  userId: u.id,
                                  status: 'suspended',
                                  reason: reason.trim() || undefined,
                                })
                              }
                            }}
                            disabled={setUserStatusMutation.isPending || u.id === profile.id}
                          >
                            {u.role === 'suspended' ? 'Unblock' : 'Block'}
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-red-500/35 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                            onClick={() => {
                              if (!window.confirm(`Delete user ${u.email}? This cannot be undone.`)) return
                              deleteUserMutation.mutate({ userId: u.id, reason: 'admin_manual_cleanup' })
                            }}
                            disabled={deleteUserMutation.isPending || u.id === profile.id}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'reports' && (
          <div className="bg-[#1a1a1a] rounded-lg shadow-none p-4 space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Status</label>
                <select
                  value={reportStatus}
                  onChange={(e) => setReportStatus(e.target.value as 'all' | 'pending' | 'reviewed' | 'dismissed')}
                  className="h-10 rounded-md border border-[#2a2a2a] bg-[#111111] px-3 text-sm text-white"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as 'all' | 'pyq' | 'comment' | 'placement' | 'mentor' | 'confession')}
                  className="h-10 rounded-md border border-[#2a2a2a] bg-[#111111] px-3 text-sm text-white"
                >
                  <option value="all">All</option>
                  <option value="confession">Confession</option>
                  <option value="comment">Comment</option>
                  <option value="pyq">PYQ</option>
                  <option value="placement">Placement</option>
                  <option value="mentor">Mentor</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">From</label>
                <Input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className="bg-[#111111] border-[#2a2a2a]" />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">To</label>
                <Input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className="bg-[#111111] border-[#2a2a2a]" />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setReportStatus('pending')
                  setReportType('all')
                  setReportFrom('')
                  setReportTo('')
                }}
              >
                Reset
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2a2a2a] text-left text-gray-500 text-xs uppercase tracking-wide">
                    <th className="pb-2 pr-4">Created</th>
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Target</th>
                    <th className="pb-2 pr-4">Reported By</th>
                    <th className="pb-2 pr-4">Reason</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a2a]">
                  {reportsQuery.data?.items.map((report) => (
                    <tr key={report.id}>
                      <td className="py-3 pr-4 text-xs text-gray-400 whitespace-nowrap">{new Date(report.created_at).toLocaleString('en-IN')}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="secondary">{report.target_type}</Badge>
                      </td>
                      <td className="py-3 pr-4 min-w-[280px]">
                        <p className="font-medium text-white/90">{report.target_meta?.title ?? report.target_id}</p>
                        {report.target_meta?.subtitle && <p className="text-xs text-gray-400">{report.target_meta.subtitle}</p>}
                        {report.target_meta?.snippet && <p className="mt-1 text-xs text-gray-500 line-clamp-2">{report.target_meta.snippet}</p>}
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-400">
                        {report.reporter?.display_name ?? report.reporter?.email ?? 'Unknown'}
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-400 max-w-[220px]">
                        <p className="line-clamp-2">{report.reason}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            report.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-300'
                              : report.status === 'reviewed'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-gray-500/20 text-gray-300'
                          }`}
                        >
                          {report.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              if (!report.redirect_path) return
                              navigate(report.redirect_path)
                            }}
                            disabled={!report.redirect_path}
                          >
                            Open
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateReportStatusMutation.mutate({ reportId: report.id, status: 'reviewed' })}
                            disabled={report.status === 'reviewed' || updateReportStatusMutation.isPending}
                          >
                            Mark reviewed
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateReportStatusMutation.mutate({ reportId: report.id, status: 'dismissed' })}
                            disabled={report.status === 'dismissed' || updateReportStatusMutation.isPending}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {reportsQuery.data?.items.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-10">No reports found for current filters.</p>
              )}
            </div>
          </div>
        )}

        {tab === 'audit' && (
          <div className="bg-[#1a1a1a] rounded-lg shadow-none p-4 space-y-2">
            <h2 className="font-semibold text-gray-200 mb-3">Recent Admin Actions</h2>
            {auditQuery.data?.entries.map((e) => (
              <div key={e.id} className="flex items-start gap-3 py-2 border-b border-[#2a2a2a] last:border-0">
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{e.admin?.display_name ?? 'Admin'}</span>
                    {' '}<span className="text-blue-600">{e.action}</span>
                    {' '}<span className="text-gray-500">{e.target_type}</span>
                  </p>
                  {e.reason && <p className="text-xs text-gray-500 italic">"{e.reason}"</p>}
                </div>
                <span className="text-xs text-gray-500 shrink-0">{new Date(e.created_at).toLocaleString('en-IN')}</span>
              </div>
            ))}
            {auditQuery.data?.entries.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No audit entries yet.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
