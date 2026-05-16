// @ts-nocheck
import { useState, useEffect, useRef } from 'react'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PlacementCard, type Placement } from '@/components/placements/PlacementCard'
import { PlacementReportForm } from '@/components/placements/PlacementReportForm'
import { apiFetch } from '@/lib/api'

interface PlacementsResponse { items: Placement[]; nextCursor: string | null; hasMore: boolean }
interface PlacementRound { id: string; round_type: string; questions: string[]; tips?: string; round_order: number }
interface PlacementDetail extends Placement { rounds: PlacementRound[] }

const PACKAGE_BANDS = ['', '0-5L', '5-10L', '10-20L', '20L+']
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = ['', ...Array.from({ length: 8 }, (_, i) => String(CURRENT_YEAR - i))]

export function PlacementsPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({ company: '', package_band: '', year: '' })
  const [companyInput, setCompanyInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [submitOpen, setSubmitOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!companyInput.trim()) { setSuggestions([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await apiFetch<{ companies: string[] }>(`/api/placements/companies?q=${encodeURIComponent(companyInput)}`)
        setSuggestions(res.companies)
      } catch { setSuggestions([]) }
    }, 300)
    return () => clearTimeout(t)
  }, [companyInput])

  const placementsQuery = useInfiniteQuery({
    queryKey: ['placements', filters],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams()
      if (filters.company) params.set('company', filters.company)
      if (filters.package_band) params.set('package_band', filters.package_band)
      if (filters.year) params.set('year', filters.year)
      if (pageParam) params.set('cursor', pageParam as string)
      const qs = params.toString()
      return apiFetch<PlacementsResponse>(`/api/placements${qs ? `?${qs}` : ''}`)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: last => last.nextCursor ?? undefined,
    staleTime: 5 * 60 * 1000,
  })

  const detailQuery = useQuery({
    queryKey: ['placement', selectedId],
    queryFn: () => apiFetch<PlacementDetail>(`/api/placements/${selectedId}`),
    enabled: !!selectedId,
  })

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && placementsQuery.hasNextPage && !placementsQuery.isFetchingNextPage) {
        placementsQuery.fetchNextPage()
      }
    }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [placementsQuery])

  const allItems = placementsQuery.data?.pages.flatMap(p => p.items) ?? []
  // Filter out known seeded/mock placements used for local development
  const visibleItems = allItems.filter(p => {
    if (!p || !p.id) return false
    const id = String(p.id)
    if (id.startsWith('placement-')) return false
    if (id.startsWith('seed-')) return false
    if (id === 'preview') return false
    return true
  })
  const detail = detailQuery.data

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Placements</h1>
            <p className="mt-1 text-sm text-white/55">Interview experiences from PESU alumni</p>
          </div>
          <Button
            onClick={() => setSubmitOpen(true)}
            className="bg-gradient-to-r from-[#6366f1] to-[#7c3aed] text-white hover:opacity-95"
          >
            + Share Experience
          </Button>
        </div>

        {selectedId && detail ? (
          <div className="rounded-2xl border border-[#2a2a2a] bg-gradient-to-br from-[#1a1a1a] to-[#141414] p-6 shadow-[0_22px_70px_-46px_rgba(0,0,0,1)]">
            <button
              onClick={() => setSelectedId(null)}
              className="text-sm text-[#6366f1] hover:underline"
            >
              ← Back
            </button>

            <div className="mt-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-white">{detail.company}</h2>
                <p className="mt-1 text-[#6366f1]">{detail.role}</p>
                <p className="mt-2 text-sm text-white/45">
                  {detail.year_of_placement}
                  {detail.campus && ` · ${detail.campus}`}
                  {detail.branch && ` · ${detail.branch}`}
                  {detail.location && ` · ${detail.location}`}
                </p>
              </div>
              {detail.package_band && (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-300">
                  {detail.package_band}
                </span>
              )}
            </div>

            {detail.skills.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {detail.skills.map(s => (
                  <Badge key={s} variant="secondary" className="border border-[#2a2a2a] bg-[#1a1a1a]/5 text-white/80">
                    {s}
                  </Badge>
                ))}
              </div>
            )}

            {detail.rounds.length > 0 && (
              <div className="mt-7 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/45">Process</p>
                  <h3 className="mt-1 font-semibold text-white">Interview Rounds</h3>
                </div>
                {detail.rounds.map(r => (
                  <div key={r.id} className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a]/3 p-4">
                    <p className="font-medium text-white">
                      Round {r.round_order}: <span className="text-white/70">{r.round_type}</span>
                    </p>
                    {r.questions.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-white/45">Questions</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                          {r.questions.map((q, i) => (
                            <li key={i} className="text-sm text-white/70">
                              {q}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {r.tips && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-white/45">Tips</p>
                        <p className="mt-2 text-sm text-white/65 italic">{r.tips}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {detail.is_anonymous && <p className="mt-4 text-xs text-white/40">Submitted anonymously</p>}
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="rounded-2xl border border-[#2a2a2a] bg-gradient-to-br from-[#1a1a1a] to-[#141414] p-4 shadow-[0_14px_44px_-30px_rgba(0,0,0,1)]">
              <div className="relative">
                <Input
                  className="h-12 w-full border-[#2a2a2a] bg-[#0f0f0f] text-white placeholder:text-white/30 focus-visible:ring-[#6366f1] focus-visible:ring-offset-0"
                  placeholder="Search company (e.g., Microsoft, Atlassian)..."
                  value={companyInput}
                  onChange={e => setCompanyInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      setFilters(f => ({ ...f, company: companyInput }))
                      setSuggestions([])
                    }
                  }}
                />

                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 z-10 mt-2 w-full overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] shadow-[0_22px_70px_-46px_rgba(0,0,0,1)]">
                    {suggestions.map(s => (
                      <button
                        key={s}
                        className="w-full px-4 py-2 text-left text-sm text-white/80 hover:bg-[#1a1a1a]/5"
                        onClick={() => {
                          setCompanyInput(s)
                          setFilters(f => ({ ...f, company: s }))
                          setSuggestions([])
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Filter chips (mobile scrollable) */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/45">Filters</p>
                  {(filters.company || filters.package_band || filters.year) && (
                    <button
                      className="text-xs text-[#6366f1] hover:underline"
                      onClick={() => {
                        setFilters({ company: '', package_band: '', year: '' })
                        setCompanyInput('')
                        setSuggestions([])
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {PACKAGE_BANDS.filter(Boolean).map(b => (
                    <button
                      key={b}
                      onClick={() => setFilters(f => ({ ...f, package_band: f.package_band === b ? '' : b }))}
                      className={[
                        'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                        filters.package_band === b
                          ? 'border-[#6366f1]/50 bg-[#6366f1]/15 text-white'
                          : 'border-[#2a2a2a] bg-[#1a1a1a]/5 text-white/65 hover:bg-[#1a1a1a]/10',
                      ].join(' ')}
                    >
                      {b}
                    </button>
                  ))}
                </div>

                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {YEARS.filter(Boolean).slice(0, 6).map(y => (
                    <button
                      key={y}
                      onClick={() => setFilters(f => ({ ...f, year: f.year === y ? '' : y }))}
                      className={[
                        'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                        filters.year === y
                          ? 'border-[#6366f1]/50 bg-[#6366f1]/15 text-white'
                          : 'border-[#2a2a2a] bg-[#1a1a1a]/5 text-white/65 hover:bg-[#1a1a1a]/10',
                      ].join(' ')}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Feed */}
            {placementsQuery.isLoading && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-32 rounded-2xl border border-[#2a2a2a] bg-gradient-to-br from-[#1a1a1a] to-[#141414] animate-pulse"
                  />
                ))}
              </div>
            )}
            {!placementsQuery.isLoading && allItems.length === 0 && (
              <p className="py-14 text-center text-sm text-white/60">No placements found. Be the first to share!</p>
            )}
            <div className="space-y-3">
              {visibleItems.map(p => <PlacementCard key={p.id} placement={p} onOpen={setSelectedId} />)}
            </div>
            <div ref={sentinelRef} className="h-4" />
            {placementsQuery.isFetchingNextPage && <p className="text-center text-xs text-white/40">Loading more...</p>}
          </>
        )}
      </div>

      <Dialog open={submitOpen} onOpenChange={v => !v && setSubmitOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Share Placement Experience</DialogTitle></DialogHeader>
          <PlacementReportForm
            onCancel={() => setSubmitOpen(false)}
            onSuccess={() => { setSubmitOpen(false); queryClient.invalidateQueries({ queryKey: ['placements'] }) }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
