import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PYQFeed } from '@/components/pyqs/PYQFeed'
import { UploadPYQModal } from '@/components/pyqs/UploadPYQModal'
import { CommentThread, type Comment } from '@/components/pyqs/CommentThread'
import { Badge } from '@/components/ui/badge'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/use-toast'

const EXAM_TYPES = ['', 'ISA1', 'ISA2', 'ESA', 'LAB']
const COURSES = ['', 'BTech', 'MTech', 'MCA', 'MBA']

interface PYQDetail {
  id: string
  subject: string
  course: string
  exam_type: string
  year: number
  question_text?: string
  file_url: string
  upvote_count: number
  view_count: number
  is_anonymous: boolean
  tags?: { tag: { id: string; name: string } }[]
  comments: Comment[]
}

interface StudyMaterialItem {
  id: string
  title: string
  material_type: string
  file_name?: string | null
  signed_url?: string | null
  file_path?: string | null
  file_url?: string | null
  processing_status?: string | null
  extraction_method?: 'pdfjs' | 'ocr' | 'hybrid' | null
  created_at: string
}

interface MaterialsResponse {
  ok: boolean
  items: StudyMaterialItem[]
}

function toDisplayStatus(raw?: string | null): 'queued' | 'processing' | 'completed' | 'failed' {
  const normalized = String(raw || '').toLowerCase()
  if (normalized === 'pending') return 'queued'
  if (normalized === 'processing') return 'processing'
  if (normalized === 'completed') return 'completed'
  return 'failed'
}

function statusBadgeClass(status: 'queued' | 'processing' | 'completed' | 'failed'): string {
  if (status === 'queued') return 'bg-slate-500/20 text-slate-200'
  if (status === 'processing') return 'bg-amber-500/20 text-amber-200'
  if (status === 'completed') return 'bg-emerald-500/20 text-emerald-200'
  return 'bg-red-500/20 text-red-200'
}

function extractionMethodClass(method?: string | null): string {
  if (method === 'ocr') return 'bg-cyan-500/20 text-cyan-200'
  if (method === 'hybrid') return 'bg-violet-500/20 text-violet-200'
  if (method === 'pdfjs') return 'bg-indigo-500/20 text-indigo-200'
  return 'bg-slate-500/20 text-slate-200'
}

function downloadFile(url: string, filename: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function PYQsPage() {
  const navigate = useNavigate()
  const { id: routeId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { profile } = useAuthStore()
  const { toast } = useToast()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [filters, setFilters] = useState({
    course: '',
    subject: '',
    exam_type: '',
    sort: 'recent' as 'recent' | 'upvotes',
  })
  const [subjectInput, setSubjectInput] = useState('')
  const [deletingPyqId, setDeletingPyqId] = useState<string | null>(null)

  const selectedId = routeId ?? null

  const { data: detail, refetch: refetchDetail } = useQuery({
    queryKey: ['pyq', selectedId],
    queryFn: () => apiFetch<PYQDetail>(`/api/pyqs/${selectedId}`),
    enabled: !!selectedId,
  })

  const canDeletePyq = profile?.role === 'admin' || profile?.role === 'moderator'

  const deletePyqMutation = useMutation({
    mutationFn: ({ pyqId, reason }: { pyqId: string; reason?: string }) =>
      apiFetch<{ success: boolean }>(`/api/admin/pyqs/${pyqId}`, {
        method: 'DELETE',
        body: JSON.stringify(reason ? { reason } : {}),
      }),
    onSuccess: async (_result, variables) => {
      toast({ variant: 'success', title: 'PYQ deleted' })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pyqs'] }),
        queryClient.invalidateQueries({ queryKey: ['pyq', variables.pyqId] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] }),
      ])

      if (selectedId === variables.pyqId) {
        navigate('/pyqs')
      }
    },
    onError: (error) => {
      toast({ variant: 'error', title: 'Failed to delete PYQ', description: error instanceof Error ? error.message : 'Something went wrong' })
    },
  })

  function applyFilters() {
    setFilters(f => ({ ...f, subject: subjectInput }))
  }

  const activeFilters = {
    ...(filters.course && { course: filters.course }),
    ...(filters.subject && { subject: filters.subject }),
    ...(filters.exam_type && { exam_type: filters.exam_type }),
    sort: filters.sort,
  }

  const detectedCourse = filters.course || detail?.course || ''
  const detectedSubject = filters.subject || subjectInput || detail?.subject || ''

  const materialsQuery = useQuery({
    queryKey: ['pyq-page-materials', detectedSubject, detectedCourse],
    queryFn: () => {
      const params = new URLSearchParams()
      params.set('subject', detectedSubject)
      if (detectedCourse) params.set('course', detectedCourse)
      return apiFetch<MaterialsResponse>(`/api/study-materials/list?${params.toString()}`)
    },
    enabled: Boolean(detectedSubject),
    staleTime: 3 * 60 * 1000,
    refetchInterval: (query) => {
      const data = query.state.data as MaterialsResponse | undefined
      const hasInFlight = (data?.items ?? []).some((item) => {
        const status = toDisplayStatus(item.processing_status)
        return status === 'queued' || status === 'processing'
      })
      return hasInFlight ? 4000 : false
    },
    refetchIntervalInBackground: true,
  })

  const handleAdminDeleteCurrentPyq = () => {
    if (!detail || deletePyqMutation.isPending) return

    if (!window.confirm('Permanently delete this PYQ? This action cannot be undone.')) {
      return
    }

    const reasonInput = window.prompt('Optional reason for audit log (leave blank to skip):', '')
    const reason = reasonInput?.trim() || undefined
    deletePyqMutation.mutate({ pyqId: detail.id, reason })
  }

  const handleAdminDeleteFromFeed = (pyqId: string) => {
    if (deletePyqMutation.isPending) return

    if (!window.confirm('Permanently delete this PYQ? This action cannot be undone.')) {
      return
    }

    const reasonInput = window.prompt('Optional reason for audit log (leave blank to skip):', '')
    const reason = reasonInput?.trim() || undefined

    setDeletingPyqId(pyqId)
    deletePyqMutation.mutate(
      { pyqId, reason },
      {
        onSettled: () => setDeletingPyqId(null),
      }
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0f0f0f] text-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-white">PYQ Repository</h1>
          <p className="mt-1 text-sm text-white/55">Previous Year Questions from PESU students</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <FilterPanel
              filters={filters}
              setFilters={setFilters}
              subjectInput={subjectInput}
              setSubjectInput={setSubjectInput}
              applyFilters={applyFilters}
              onUpload={() => setUploadOpen(true)}
              materials={materialsQuery.data?.items ?? []}
              materialsLoading={materialsQuery.isLoading}
              activeSubject={detectedSubject}
            />
          </aside>

          <main className="min-w-0">
          {selectedId && detail ? (
            <div className="rounded-xl border border-[#2a2a2a] bg-gradient-to-br from-[#1a1a1a] to-[#141414] p-5 shadow-[0_18px_55px_-32px_rgba(0,0,0,1)]">
              <button
                onClick={() => navigate('/pyqs')}
                className="text-sm text-[#6366f1] hover:underline"
              >
                ← Back to feed
              </button>

              <div className="mt-4">
                <h2 className="text-xl font-semibold text-white">{detail.subject}</h2>
                <p className="mt-1 text-sm text-white/55">
                  {detail.course} · {detail.exam_type} · {detail.year}
                </p>
              </div>

              {detail.tags && detail.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {detail.tags.map(t => (
                    <Badge
                      key={t.tag.id}
                      variant="secondary"
                      className="border border-[#2a2a2a] bg-[#1a1a1a]/5 text-white/80"
                    >
                      {t.tag.name}
                    </Badge>
                  ))}
                </div>
              )}

              {detail.question_text && (
                <p className="mt-4 whitespace-pre-wrap text-white/75">
                  {detail.question_text}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="border-[#2a2a2a] bg-transparent text-white hover:bg-[#1a1a1a]/5 hover:text-white"
                  onClick={async () => {
                    try {
                      const { url } = await apiFetch<{ url: string }>(`/api/pyqs/${detail.id}/download`)
                      window.open(url, '_blank')
                    } catch (error) {
                      console.error('Failed to generate download URL', error)
                    }
                  }}
                >
                  Download File
                </Button>

                {canDeletePyq && (
                  <Button
                    variant="destructive"
                    className="hover:brightness-110"
                    onClick={handleAdminDeleteCurrentPyq}
                    disabled={deletePyqMutation.isPending}
                  >
                    {deletePyqMutation.isPending ? 'Deleting...' : 'Delete PYQ'}
                  </Button>
                )}
              </div>

              <div className="my-6 h-px bg-[#2a2a2a]" />
              <div className="text-white">
                <CommentThread
                  pyqId={detail.id}
                  comments={detail.comments}
                  onRefresh={() => refetchDetail()}
                />
              </div>
            </div>
          ) : (
            <PYQFeed
              filters={activeFilters}
              canDeletePyq={canDeletePyq}
              onDeletePyq={handleAdminDeleteFromFeed}
              deletingPyqId={deletingPyqId}
            />
          )}
          </main>
        </div>
      </div>

      <UploadPYQModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        initialCourse={detectedCourse}
        initialSubject={detectedSubject}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['pyqs'] })
          queryClient.invalidateQueries({ queryKey: ['pyq-page-materials'] })
        }}
      />
    </div>
  )
}

function FilterPanel({
  filters,
  setFilters,
  subjectInput,
  setSubjectInput,
  applyFilters,
  onUpload,
  materials,
  materialsLoading,
  activeSubject,
}: {
  filters: { course: string; subject: string; exam_type: string; sort: 'recent' | 'upvotes' }
  setFilters: React.Dispatch<React.SetStateAction<{ course: string; subject: string; exam_type: string; sort: 'recent' | 'upvotes' }>>
  subjectInput: string
  setSubjectInput: React.Dispatch<React.SetStateAction<string>>
  applyFilters: () => void
  onUpload: () => void
  materials: StudyMaterialItem[]
  materialsLoading: boolean
  activeSubject: string
}) {
  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#6366f1]">FILTER</p>

      <div className="space-y-2">
        <select
          className="h-10 w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 text-sm text-white outline-none focus:border-[#6366f1]"
          value={filters.course}
          onChange={e => setFilters(f => ({ ...f, course: e.target.value }))}
        >
          {COURSES.map(c => (
            <option key={c} value={c}>
              {c || 'All courses'}
            </option>
          ))}
        </select>

        <select
          className="h-10 w-full rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 text-sm text-white outline-none focus:border-[#6366f1]"
          value={filters.exam_type}
          onChange={e => setFilters(f => ({ ...f, exam_type: e.target.value }))}
        >
          {EXAM_TYPES.map(t => (
            <option key={t} value={t}>
              {t || 'All types'}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <Input
            className="h-10 w-full rounded-lg border-[#2a2a2a] bg-[#111111] px-3 text-white placeholder:text-white/40 focus-visible:border-[#6366f1]"
            placeholder="Search..."
            value={subjectInput}
            onChange={e => setSubjectInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyFilters()}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-10 rounded-lg border-[#2a2a2a] bg-[#111111] px-4 text-white hover:bg-[#303030] hover:text-white"
            onClick={applyFilters}
          >
            Go
          </Button>
        </div>

        <div className="flex gap-2">
          {(['recent', 'upvotes'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilters(f => ({ ...f, sort: s }))}
              className={[
                'h-10 flex-1 rounded-lg border px-4 text-xs font-semibold transition-colors',
                'hover:bg-[#303030]',
                filters.sort === s
                  ? 'border-[#6366f1] bg-[#6366f1]/20 text-white'
                  : 'border-[#2a2a2a] bg-[#2a2a2a] text-white/75',
              ].join(' ')}
            >
              {s === 'recent' ? 'Recent' : 'Top'}
            </button>
          ))}
        </div>

        <Button
          onClick={onUpload}
          className="mt-2 h-10 w-full bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white hover:brightness-110"
        >
          + Upload PYQ / Slides
        </Button>

        <div className="mt-4 rounded-lg border border-[#2a2a2a] bg-[#121212] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">Uploaded Notes/Slides</p>
          {!activeSubject.trim() && materials.length === 0 && (
            <p className="mt-2 text-xs text-white/55">Search or open a subject to see uploaded materials.</p>
          )}
          {materialsLoading && <p className="mt-2 text-xs text-white/55">Loading materials...</p>}
          {!materialsLoading && materials.length === 0 && activeSubject.trim() && (
            <p className="mt-2 text-xs text-white/55">No notes/slides uploaded yet for this subject.</p>
          )}
          {!materialsLoading && materials.length > 0 && (
            <div className="mt-2 space-y-2">
              {materials.slice(0, 4).map((item) => {
                const url = item.signed_url || item.file_path || item.file_url || ''
                const fileName = item.file_name || `${item.title}.pdf`
                const status = toDisplayStatus(item.processing_status)
                const extractionMethod = item.extraction_method || 'unknown'
                return (
                  <div key={item.id} className="rounded-md border border-[#2a2a2a] bg-[#1a1a1a] p-2">
                    <p className="truncate text-xs font-semibold text-white">{item.title}</p>
                    <p className="mt-1 flex items-center gap-2 text-[10px] text-white/60">
                      <span>{item.material_type}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${statusBadgeClass(status)}`}>{status}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${extractionMethodClass(item.extraction_method)}`}>{extractionMethod}</span>
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                        className="rounded border border-[#2a2a2a] px-2 py-1 text-[10px] text-white/80 hover:bg-[#222222]"
                      >
                        View
                      </button>
                      <button
                        onClick={() => downloadFile(url, fileName)}
                        className="rounded border border-emerald-500/30 bg-emerald-500/15 px-2 py-1 text-[10px] text-emerald-200 hover:bg-emerald-500/25"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
