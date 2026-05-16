import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { apiFetch } from '@/lib/api'

export interface Placement {
  id: string
  company: string
  role: string
  location?: string
  package_band?: string
  skills: string[]
  year_of_placement: number
  branch?: string
  campus?: string
  is_anonymous: boolean
  upvote_count: number
  created_at: string
}

interface Props {
  placement: Placement
  onOpen?: (id: string) => void
}

function getBandBadgeClasses(band?: string) {
  if (!band) return 'bg-[#1a1a1a]/5 text-white/70 border-[#2a2a2a]'
  if (band === '20L+') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  if (band === '10-20L') return 'bg-blue-500/15 text-blue-300 border-blue-500/30'
  return 'bg-[#1a1a1a]/5 text-white/70 border-[#2a2a2a]'
}

export function PlacementCard({ placement, onOpen }: Props) {
  const [upvotes, setUpvotes] = useState(placement.upvote_count)
  const [upvoted, setUpvoted] = useState(false)

  async function handleUpvote(e: React.MouseEvent) {
    e.stopPropagation()
    const next = !upvoted
    setUpvoted(next)
    setUpvotes(v => next ? v + 1 : v - 1)
    try {
      const res = await apiFetch<{ upvoted: boolean }>(`/api/placements/${placement.id}/upvote`, { method: 'POST' })
      setUpvoted(res.upvoted)
    } catch {
      setUpvoted(!next)
      setUpvotes(v => next ? v - 1 : v + 1)
    }
  }

  return (
    <Card
      className={[
        'group cursor-pointer border-[#2a2a2a] bg-gradient-to-br from-[#1a1a1a] to-[#141414] text-white',
        'shadow-[0_14px_44px_-30px_rgba(0,0,0,1)] transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-[0_22px_70px_-46px_rgba(0,0,0,1)]',
        'hover:border-l-[#6366f1] hover:border-l-2',
      ].join(' ')}
      onClick={() => onOpen?.(placement.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Logo placeholder */}
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1]/35 to-white/10 ring-1 ring-[#6366f1]/25">
            <span className="text-sm font-semibold text-white">
              {(placement.company?.[0] ?? 'C').toUpperCase()}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-white">{placement.company}</p>
                <p className="mt-0.5 truncate text-sm font-medium text-[#6366f1]">{placement.role}</p>
                <p className="mt-1 text-xs text-white/45">
                  {placement.year_of_placement}
                  {placement.campus && ` · ${placement.campus}`}
                  {placement.branch && ` · ${placement.branch}`}
                  {placement.location && ` · ${placement.location}`}
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2">
                <span
                  className={[
                    'rounded-full border px-2.5 py-1 text-xs font-semibold',
                    getBandBadgeClasses(placement.package_band),
                  ].join(' ')}
                >
                  {placement.package_band || '—'}
                </span>
              </div>
            </div>

            {placement.skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {placement.skills.slice(0, 6).map(s => (
                  <Badge
                    key={s}
                    variant="secondary"
                    className="border border-[#2a2a2a] bg-[#1a1a1a]/5 text-[11px] text-white/80"
                  >
                    {s}
                  </Badge>
                ))}
                {placement.skills.length > 6 && (
                  <Badge variant="outline" className="border-[#2a2a2a] text-[11px] text-white/60">
                    +{placement.skills.length - 6}
                  </Badge>
                )}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-[#2a2a2a] pt-3">
              <button
                onClick={handleUpvote}
                aria-label={`Upvote — ${upvotes}`}
                className={[
                  'rounded-md px-2 py-1 text-sm font-semibold transition-colors',
                  'hover:bg-[#1a1a1a]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]',
                  upvoted ? 'bg-[#6366f1]/10 text-[#6366f1]' : 'text-white/60',
                ].join(' ')}
              >
                ▲ {upvotes}
              </button>
              {placement.is_anonymous && <span className="text-xs text-white/40">Anonymous</span>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
