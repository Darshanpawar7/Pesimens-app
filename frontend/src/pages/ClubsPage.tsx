import { useState, useEffect, useRef } from 'react'
import { Plus, Users, Search } from 'lucide-react'
import { useClubs, type ClubFilters } from '../hooks/useClubs'
import { ClubCard } from '../components/clubs/ClubCard'
import { CreateClubModal } from '../components/clubs/CreateClubModal'
import { SkeletonCard } from '../components/ui/skeleton'

const CATEGORIES = ['all', 'academic', 'technical', 'cultural', 'sports', 'social', 'social_service', 'entrepreneurship', 'arts', 'other']

export default function ClubsPage() {
  const [filters, setFilters] = useState<ClubFilters>({})
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setFilters(f => ({ ...f, search: search || undefined })), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useClubs(filters)
  const clubs = data?.pages.flatMap(p => p.items) ?? []

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
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white dark:text-gray-100 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            Clubs
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">Find and join student clubs</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Club
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clubs..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#2a2a2a] dark:border-gray-700 bg-[#1a1a1a] dark:bg-gray-800 text-sm text-white dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilters(f => ({ ...f, category: cat === 'all' ? undefined : cat }))}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
              (cat === 'all' && !filters.category) || filters.category === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-[#0f0f0f] dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-[#1a1a1a] dark:hover:bg-gray-600'
            }`}
          >
            {cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : clubs.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No clubs found</p>
          <p className="text-sm mt-1">Try a different search or create a new club</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clubs.map(club => <ClubCard key={club.id} club={club} />)}
        </div>
      )}

      <div ref={loadMoreRef} className="h-4" />
      {isFetchingNextPage && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {showCreate && <CreateClubModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
