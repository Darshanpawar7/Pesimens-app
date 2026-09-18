import { useState, useEffect, useRef, type KeyboardEvent } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search, Calendar, Users, BookOpen, UserCheck, Briefcase, ShoppingBag, User, Clock, Trash2 } from 'lucide-react'
import { useSearch, getRecentSearches, clearRecentSearches } from '../hooks/useSearch'
import { Skeleton } from '../components/ui/skeleton'

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

  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches())
  const [showRecents, setShowRecents] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setInput(q) }, [q])

  const { data, isLoading, isError, error } = useSearch(normalizedQ)

  // A completed search persists to localStorage inside useSearch's queryFn;
  // refresh local state so the dropdown reflects it without a manual re-read.
  useEffect(() => {
    if (data) setRecentSearches(getRecentSearches())
  }, [data])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowRecents(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const runSearch = (term: string) => {
    setInput(term)
    setSearchParams({ q: term })
    setShowRecents(false)
    setActiveIndex(-1)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) runSearch(input.trim())
  }

  const handleClearRecents = () => {
    clearRecentSearches()
    setRecentSearches([])
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showRecents || recentSearches.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, recentSearches.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, -1)) }
    else if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); runSearch(recentSearches[activeIndex]) }
    else if (e.key === 'Escape') { setShowRecents(false); setActiveIndex(-1) }
  }

  return (
    <div ref={containerRef} className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <form onSubmit={handleSearch}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <input
            autoFocus
            value={input}
            onChange={e => { setInput(e.target.value); setActiveIndex(-1) }}
            onFocus={() => setShowRecents(!input.trim() && recentSearches.length > 0)}
            onKeyDown={handleKeyDown}
            placeholder="Search people, marketplace, events, clubs, PYQs, mentors..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base"
            aria-autocomplete="list"
            aria-expanded={showRecents}
          />
        </div>

        {showRecents && recentSearches.length > 0 && (
          <div
            role="listbox"
            aria-label="Recent searches"
            className="mt-2 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Recent</span>
              <button
                type="button"
                onClick={handleClearRecents}
                className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white/80 transition-colors"
              >
                <Trash2 className="h-3 w-3" /> Clear
              </button>
            </div>
            {recentSearches.map((term, i) => (
              <button
                key={term}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                onClick={() => runSearch(term)}
                className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-white/80 text-left transition-colors ${
                  i === activeIndex ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <Clock className="h-3.5 w-3.5 text-white/40 shrink-0" />
                {term}
              </button>
            ))}
          </div>
        )}
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
