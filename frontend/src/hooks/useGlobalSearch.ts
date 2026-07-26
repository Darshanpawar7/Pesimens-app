import { useState, useEffect, useRef, useCallback } from 'react'
import Fuse from 'fuse.js'
import { STATIC_SEARCH_INDEX, type SearchableItem } from '../data/searchIndex'

const STORAGE_KEY = 'pesimens_recent_searches'
const MAX_RECENT = 5

const fuse = new Fuse(STATIC_SEARCH_INDEX, {
  keys: [
    { name: 'title',       weight: 0.5 },
    { name: 'keywords',    weight: 0.3 },
    { name: 'description', weight: 0.2 },
  ],
  threshold: 0.35,
  includeScore: true,
  includeMatches: true,
})

export function useGlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Fuse.FuseResult<SearchableItem>[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') }
    catch { return [] }
  })

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    debounceRef.current = setTimeout(() => {
      setResults(fuse.search(query.trim()))
      setIsLoading(false)
    }, 200)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const saveRecentSearch = useCallback((term: string) => {
    setRecentSearches(prev => {
      const updated = [term, ...prev.filter(s => s !== term)].slice(0, MAX_RECENT)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const groupedResults = results.reduce<Record<string, Fuse.FuseResult<SearchableItem>[]>>(
    (acc, result) => {
      const mod = result.item.module
      if (!acc[mod]) acc[mod] = []
      acc[mod].push(result)
      return acc
    }, {}
  )

  return { query, setQuery, results, groupedResults, isLoading, recentSearches, saveRecentSearch, clearRecentSearches }
}