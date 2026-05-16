import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'

export interface SearchResults {
  results: {
    events?: { id: string; title: string; category: string; start_time: string }[]
    clubs?: { id: string; name: string; category: string; member_count: number }[]
    pyqs?: { id: string; subject: string; course: string; exam_type: string; year: number }[]
    mentors?: { id: string; display_name: string; expertise: string; company: string }[]
    placements?: { id: string; company: string; role: string; package_lpa: number; year: number }[]
  }
  total_count: number
  query: string
}

const RECENT_KEY = 'pesu_hub_recent_searches'
const MAX_RECENT = 8

export function saveRecentSearch(q: string) {
  try {
    const existing: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    const updated = [q, ...existing.filter(s => s !== q)].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
  } catch { /* ignore */ }
}

export function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function clearRecentSearches() {
  localStorage.removeItem(RECENT_KEY)
}

export function useSearch(query: string, types?: string[]) {
  return useQuery({
    queryKey: ['search', query, types],
    queryFn: async () => {
      const params = new URLSearchParams({ q: query })
      if (types?.length) params.set('types', types.join(','))
      const result = await apiFetch<SearchResults>(`/api/search?${params}`)
      saveRecentSearch(query)
      return result
    },
    enabled: query.trim().length >= 2,
    staleTime: 60 * 1000,
  })
}
