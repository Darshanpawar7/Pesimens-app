import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export interface Mentor {
  user_id: string
  bio: string
  subjects: string[]
  hourly_rate: number
  rating: number
  total_sessions: number
  is_available: boolean
  profile: {
    id: string
    display_name: string | null
    avatar_url: string | null
    karma: number
  }
}

interface Props {
  mentor: Mentor
  onBook?: (mentor: Mentor) => void
  onMessage?: (mentor: Mentor) => void
  onDelete?: (mentor: Mentor) => void
  isAdmin?: boolean
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5 text-sm">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < Math.round(rating) ? 'text-amber-400' : 'text-white/20'}>★</span>
      ))}
      <span className="ml-1 text-white/55">{rating.toFixed(1)}</span>
    </span>
  )
}

export function MentorCard({ mentor, onBook, onMessage, onDelete, isAdmin }: Props) {
  const initial = (mentor.profile.display_name ?? 'M')[0]?.toUpperCase() ?? 'M'
  return (
    <Card className="group relative border-[#2a2a2a] bg-gradient-to-br from-[#1a1a1a] to-[#141414] text-white shadow-[0_14px_44px_-30px_rgba(0,0,0,1)] transition-all duration-200 hover:scale-[1.015] hover:shadow-[0_22px_80px_-52px_rgba(99,102,241,0.6)]">
      {isAdmin && onDelete && (
        <button
          onClick={() => onDelete(mentor)}
          className="absolute right-3 top-3 rounded-lg bg-red-500/10 p-2 opacity-0 transition-opacity hover:bg-red-500/20 group-hover:opacity-100"
          title="Delete mentor"
        >
          <Trash2 className="h-4 w-4 text-red-400" />
        </button>
      )}
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative">
              <div className="h-12 w-12 rounded-full bg-gradient-to-r from-[#6366f1] to-[#7c3aed] p-[2px]">
                {mentor.profile.avatar_url ? (
                  <img
                    src={mentor.profile.avatar_url}
                    alt={mentor.profile.display_name ?? 'Mentor'}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0f0f0f] text-sm font-semibold text-white">
                    {initial}
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-semibold leading-tight text-white">{mentor.profile.display_name ?? 'Anonymous'}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-white/55">
                <span>{mentor.total_sessions} sessions</span>
                <span className="text-white/35">•</span>
                <span>{mentor.profile.karma} karma</span>
              </p>
            </div>
          </div>

          <div className="shrink-0 text-right leading-tight">
            <p className="text-2xl font-semibold text-white">
              ₹{mentor.hourly_rate}
              <span className="ml-0.5 text-xs font-normal text-white/55">/hr</span>
            </p>
            {!mentor.is_available && <span className="text-xs text-white/40">Unavailable</span>}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <StarRating rating={mentor.rating} />
          <span className="text-xs text-white/45">{mentor.subjects.length} subjects</span>
        </div>

        <p className="line-clamp-2 text-sm text-white/70">{mentor.bio}</p>

        <div className="flex flex-wrap gap-1.5">
          {mentor.subjects.slice(0, 4).map(s => (
            <Badge
              key={s}
              variant="secondary"
              className="border border-[#6366f1]/25 bg-[#6366f1]/10 text-xs text-white/85"
            >
              {s}
            </Badge>
          ))}
          {mentor.subjects.length > 4 && (
            <Badge variant="outline" className="border-[#2a2a2a] text-xs text-white/60">
              +{mentor.subjects.length - 4}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            className="border-[#2a2a2a] bg-[#1a1a1a] text-white hover:bg-[#222222]"
            onClick={() => onMessage?.(mentor)}
          >
            DM Mentor
          </Button>
          <Button
            className="bg-gradient-to-r from-[#6366f1] to-[#7c3aed] text-white shadow-[0_14px_44px_-30px_rgba(99,102,241,0.75)] transition-all duration-200 hover:opacity-95 sm:col-span-1"
            disabled={!mentor.is_available}
            onClick={() => onBook?.(mentor)}
          >
            {mentor.is_available ? 'Book Session' : 'Unavailable'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
