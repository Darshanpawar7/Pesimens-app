import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search, Calendar, Users, BookOpen, UserCheck, Briefcase, ShoppingBag, User } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import { Skeleton } from '../components/ui/skeleton'

interface SearchResults {
  results: {
    events?: { id: string; title: string; category: string; start_time: string }[]
    clubs?: { id: string; name: string; category: string; member_count: number }[]
    pyqs?: { id: string; subject: string; course: string; exam_type: string; year: number }[]
    mentors?: { id: string; display_name: string; expertise: string; company: string }[]
    placements?: { id: string; company: string; role: string; package_lpa: number; year: number }[]
    people?: { id: string; display_name: string; branch: string; campus: string; role: string }[]
    marketplace?: { id: string; title: string; price: number; condition: string; category: string }[]
  }
  total_count: number
  query: string
}

const typeIcons = {
  events: Calendar,
  clubs: Users,
  pyqs: BookOpen,
  mentors: UserCheck,
  placements: Briefcase,
  people: User,
  marketplace: ShoppingBag,
}

const typeLinks: Record<string, (id: string) => string> = {
  events: id => `/events/${id}`,
  clubs: id => `/clubs/${id}`,
  pyqs: _id => `/pyqs`,
  mentors: _id => `/mentors`,
  placements: _id => `/placements`,
  people: id => `/profile/${id}`,
  marketplace: id => `/marketplace/${id}`,
}

const typeLabels: Record<string, string> = {
  events: 'Events',
  clubs: 'Clubs',
  pyqs: 'PYQs',
  mentors: 'Mentors',
  placements: 'Placements',
  people: 'People',
  marketplace: 'Marketplace',
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [input, setInput] = useState(searchParams.get('q') ?? '')
  const q = searchParams.get('q') ?? ''
  const normalizedQ = q.trim()

  useEffect(() => { setInput(q) }, [q])

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['search', normalizedQ],
    queryFn: () => apiFetch<SearchResults>(`/api/search?q=${encodeURIComponent(normalizedQ)}`),
    enabled: normalizedQ.length >= 2,
    staleTime: 60 * 1000,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) setSearchParams({ q: input.trim() })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <form onSubmit={handleSearch}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <input
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Search people, marketplace, events, clubs, PYQs, mentors..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base"
          />
        </div>
      </form>

      {!normalizedQ && (
        <p className="text-center text-white/50 py-12">Type to search across PESimens</p>
      )}

      {normalizedQ.length > 0 && normalizedQ.length < 2 && (
        <p className="text-center text-white/50 py-12">Type at least 2 characters to search.</p>
      )}

      {normalizedQ.length >= 2 && isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton variant="text" className="w-24 h-5" />
              {Array.from({ length: 3 }).map((_, j) => <Skeleton key={j} className="h-12 w-full" />)}
            </div>
          ))}
        </div>
      )}

      {normalizedQ.length >= 2 && isError && (
        <div className="text-center py-12 text-white/60">
          <p className="text-base font-medium">Search failed</p>
          <p className="mt-1 text-sm">{error instanceof Error ? error.message : 'Please try again.'}</p>
        </div>
      )}

      {data && normalizedQ.length >= 2 && data.total_count === 0 && (
        <div className="text-center py-12 text-white/50">
          <Search className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No results for "{normalizedQ}"</p>
        </div>
      )}

      {data && Object.entries(data.results).map(([type, items]) => {
        if (!items || items.length === 0) return null
        const Icon = typeIcons[type as keyof typeof typeIcons] ?? Search
        return (
          <div key={type} className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white/50 uppercase tracking-wide">
              <Icon className="h-4 w-4" />
              {typeLabels[type] ?? type}
            </h2>
            <div className="rounded-xl border border-[#2a2a2a] overflow-hidden divide-y divide-[#2a2a2a]">
              {(items as { id: string; [key: string]: unknown }[]).map(item => (
                <Link
                  key={item.id}
                  to={typeLinks[type]?.(item.id) ?? '/'}
                  className="flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] hover:bg-[#222222] transition-colors"
                >
                  <Icon className="h-4 w-4 text-white/40 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {(item.title ?? item.name ?? item.display_name ?? item.company ?? item.subject) as string}
                    </p>
                    <p className="text-xs text-white/50 truncate">
                      {(item.category ?? item.course ?? item.expertise ?? item.role ?? item.branch ?? item.condition) as string}
                      {type === 'marketplace' && item.price ? ` · ₹${item.price}` : ''}
                      {type === 'people' && item.campus ? ` · ${item.campus}` : ''}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
