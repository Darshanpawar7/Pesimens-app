import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { AnalyticsFilters } from '@/components/analytics/AnalyticsFilters'
import { TopicFrequencyChart, type TagFrequency } from '@/components/analytics/TopicFrequencyChart'
import { TrendLineChart } from '@/components/analytics/TrendLineChart'
import { PDFExportButton } from '@/components/analytics/PDFExportButton'

interface TagsResponse {
  tags: TagFrequency[]
  subject: string | null
  exam_type: string | null
  cached: boolean
}

interface TrendsResponse {
  trends: Record<string, unknown>[]
  semesters: string[]
  tags: string[]
  subject: string | null
  cached: boolean
}

const ANALYTICS_STALE_TIME = 5 * 60 * 1000 // 5 minutes client-side
const SUGGESTED_SUBJECTS = ['Data Structures', 'DBMS', 'OS', 'CN', 'Mathematics']

export function AnalyticsPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({ subject: '', exam_type: '' })
  const [trendTopics, setTrendTopics] = useState<string[]>([])
  const normalizedSubject = filters.subject.trim()
  const shouldFetchAnalytics = normalizedSubject.length >= 3

  // Tag frequency query — 5-min staleTime, background refetch
  const tagsQuery = useQuery({
    queryKey: ['analytics', 'tags', filters],
    queryFn: () => {
      const params = new URLSearchParams()
      if (normalizedSubject) params.set('subject', normalizedSubject)
      if (filters.exam_type) params.set('exam_type', filters.exam_type)
      const qs = params.toString()
      return apiFetch<TagsResponse>(`/api/analytics/tags${qs ? `?${qs}` : ''}`)
    },
    enabled: shouldFetchAnalytics,
    staleTime: ANALYTICS_STALE_TIME,
    refetchOnWindowFocus: true,
  })

  // Trends query
  const trendsQuery = useQuery({
    queryKey: ['analytics', 'trends', normalizedSubject, trendTopics],
    queryFn: () => {
      const params = new URLSearchParams()
      if (normalizedSubject) params.set('subject', normalizedSubject)
      for (const topic of trendTopics) params.append('tags', topic)
      const qs = params.toString()
      return apiFetch<TrendsResponse>(`/api/analytics/trends${qs ? `?${qs}` : ''}`)
    },
    enabled: shouldFetchAnalytics,
    staleTime: ANALYTICS_STALE_TIME,
    refetchOnWindowFocus: true,
  })

  function handleTagClick(name: string) {
    setTrendTopics(prev =>
      prev.includes(name)
        ? prev.filter(t => t !== name)
        : prev.length < 5 ? [...prev, name] : prev
    )
  }

  function handleFiltersChange(f: typeof filters) {
    setFilters(f)
    setTrendTopics([])
    // Invalidate so next fetch is fresh
    queryClient.invalidateQueries({ queryKey: ['analytics'] })
  }

  const tags = tagsQuery.data?.tags ?? []
  const trends = trendsQuery.data?.trends ?? []

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <style>{`
        /* Recharts dark theme */
        .recharts-cartesian-grid-horizontal line,
        .recharts-cartesian-grid-vertical line {
          stroke: rgba(255,255,255,0.08);
        }
        .recharts-text {
          fill: rgba(255,255,255,0.70);
        }
        .recharts-legend-item-text {
          color: rgba(255,255,255,0.70) !important;
        }
      `}</style>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/45">Dashboard</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Analytics</h1>
            <p className="mt-1 text-sm text-white/55">Topic frequency and trends across PYQs</p>
          </div>

          <div className="pt-1">
            <PDFExportButton tags={tags} filters={filters} />
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-[#2a2a2a] bg-gradient-to-br from-[#1a1a1a] to-[#141414] p-4 shadow-[0_14px_44px_-30px_rgba(0,0,0,1)]">
          <AnalyticsFilters filters={filters} onChange={handleFiltersChange} />
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTED_SUBJECTS.map(subject => (
              <button
                key={subject}
                onClick={() => handleFiltersChange({ ...filters, subject })}
                className="rounded-full border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-1.5 text-xs font-semibold text-white/75 hover:bg-white/5 hover:text-white"
              >
                {subject}
              </button>
            ))}
          </div>
        </div>

        {/* Topic Frequency */}
        <div className="rounded-2xl border border-[#2a2a2a] bg-gradient-to-br from-[#1a1a1a] to-[#141414] p-5 shadow-[0_14px_44px_-30px_rgba(0,0,0,1)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/45">Distribution</p>
              <h2 className="mt-1 font-semibold text-white">Top Topics</h2>
            </div>

            {tagsQuery.data?.cached && (
              <span className="rounded-full border border-[#2a2a2a] bg-white/5 px-2.5 py-1 text-xs text-white/55">
                cached
              </span>
            )}
          </div>

          {!normalizedSubject && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2a2a2a] bg-white/5 text-[#6366f1]">
                <Search className="h-7 w-7" />
              </div>
              <p className="mt-4 text-base font-semibold text-white">Enter a subject above to see topic analytics</p>
              <p className="mt-1 text-sm text-white/60">e.g. Data Structures, Mathematics, DBMS</p>
            </div>
          )}

          {normalizedSubject && !shouldFetchAnalytics && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2a2a2a] bg-white/5 text-[#6366f1]">
                <Search className="h-7 w-7" />
              </div>
              <p className="mt-4 text-base font-semibold text-white">Type at least 3 characters to start analytics</p>
              <p className="mt-1 text-sm text-white/60">Add one more letter to fetch topic data.</p>
            </div>
          )}

          {shouldFetchAnalytics && tagsQuery.isLoading && (
            <div className="h-64 rounded-xl border border-[#2a2a2a] bg-white/3 animate-pulse" />
          )}
          {shouldFetchAnalytics && tagsQuery.isError && (
            <p className="text-sm text-red-400">Failed to load topic data.</p>
          )}
          {shouldFetchAnalytics && !tagsQuery.isLoading && !tagsQuery.isError && (
            <TopicFrequencyChart tags={tags} onTagClick={handleTagClick} selectedTags={trendTopics} />
          )}

          {shouldFetchAnalytics && !tagsQuery.isLoading && !tagsQuery.isError && tags.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#2a2a2a] bg-white/5 text-[#6366f1]">
                <span className="text-xl">▦</span>
              </div>
              <p className="mt-4 text-sm font-semibold text-white">No data yet</p>
              <p className="mt-1 text-sm text-white/60">Try selecting a subject or exam type.</p>
            </div>
          )}
        </div>

        {/* Trend Comparison */}
        <div className="rounded-2xl border border-[#2a2a2a] bg-gradient-to-br from-[#1a1a1a] to-[#141414] p-5 shadow-[0_14px_44px_-30px_rgba(0,0,0,1)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/45">Trends</p>
              <h2 className="mt-1 font-semibold text-white">Trend Comparison</h2>
            </div>
            {trendTopics.length > 0 && (
              <button
                className="text-xs text-white/50 hover:text-red-300"
                onClick={() => setTrendTopics([])}
              >
                Clear selection
              </button>
            )}
          </div>

          {trendTopics.length === 0 && (
            <p className="mb-4 text-sm text-white/55">
              Click topics in the chart above to compare their trends (up to 5).
            </p>
          )}

          {/* Selected topic chips */}
          {trendTopics.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {trendTopics.map(t => (
                <button
                  key={t}
                  onClick={() => handleTagClick(t)}
                  className="rounded-full border border-[#6366f1]/25 bg-[#6366f1]/10 px-3 py-1 text-xs font-semibold text-white/85 hover:bg-red-500/10 hover:border-red-500/30 transition-colors"
                >
                  {t} ×
                </button>
              ))}
            </div>
          )}

          {shouldFetchAnalytics && trendsQuery.isLoading && (
            <div className="h-56 rounded-xl border border-[#2a2a2a] bg-white/3 animate-pulse" />
          )}
          {!shouldFetchAnalytics && (
            <div className="h-56 rounded-xl border border-[#2a2a2a] bg-white/2" />
          )}
          {shouldFetchAnalytics && !trendsQuery.isLoading && (
            <TrendLineChart data={trends} topics={trendTopics} />
          )}
        </div>
      </div>
    </div>
  )
}
