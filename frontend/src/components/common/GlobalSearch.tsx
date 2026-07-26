import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Clock, Trash2 } from 'lucide-react'
import { useGlobalSearch } from '../../hooks/useGlobalSearch'
import type { SearchableItem } from '../../data/searchIndex'

const MODULE_ICONS: Record<string, string> = {
  Study: '📚', Confessions: '💬', Notifications: '🔔',
  Games: '🎮', Campus: '🏫', People: '👥', Career: '💼',
}

function HighlightMatch({ text, indices }: { text: string; indices?: readonly [number, number][] }) {
  if (!indices?.length) return <>{text}</>
  const parts: React.ReactNode[] = []
  let last = 0
  indices.forEach(([s, e], i) => {
    if (s > last) parts.push(<span key={`t${i}`}>{text.slice(last, s)}</span>)
    parts.push(<mark key={`m${i}`} className="bg-[#6366f1]/30 text-white rounded px-0.5">{text.slice(s, e + 1)}</mark>)
    last = e + 1
  })
  if (last < text.length) parts.push(<span key="tail">{text.slice(last)}</span>)
  return <>{parts}</>
}

interface GlobalSearchProps {
  mobile?: boolean
  autoFocus?: boolean
  onClose?: () => void
}

export function GlobalSearch({ mobile = false, autoFocus = false, onClose }: GlobalSearchProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const { query, setQuery, groupedResults, isLoading, recentSearches, saveRecentSearch, clearRecentSearches } = useGlobalSearch()

  const flatResults = Object.values(groupedResults).flat()
  const hasResults = flatResults.length > 0
  const showRecents = !query.trim() && recentSearches.length > 0

  // Ctrl+K shortcut (desktop only)
  useEffect(() => {
    if (mobile) return
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [mobile])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => { setActiveIndex(-1) }, [query])

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus()
      setOpen(true)
    }
  }, [autoFocus])

  const handleSelect = (item: SearchableItem) => {
    saveRecentSearch(item.title)
    navigate(item.route)
    setOpen(false)
    setQuery('')
    onClose?.()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, flatResults.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && activeIndex >= 0) { handleSelect(flatResults[activeIndex].item) }
    else if (e.key === 'Escape') { setOpen(false); onClose?.() }
  }

  const inputStyle = {
    background: '#1a1a1a',
    borderColor: open ? '#6366f1' : '#2a2a2a',
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search people, events, PYQs, games..."
          className="w-full rounded-xl border py-2 pl-9 pr-10 text-sm text-white placeholder:text-gray-400 outline-none transition-all focus:ring-2 focus:ring-[#6366f1]"
          style={inputStyle}
          aria-label="Global search"
          aria-autocomplete="list"
          aria-expanded={open && (hasResults || showRecents)}
        />
        {/* Right side: shortcut hint or clear */}
        {query ? (
          <button
            onClick={() => { setQuery(''); inputRef.current?.focus() }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : !mobile && (
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center text-[10px] text-gray-500 bg-[#2a2a2a] border border-[#3a3a3a] rounded px-1.5 py-0.5 font-mono">
            Ctrl K
          </kbd>
        )}
      </div>

      {/* Dropdown */}
      {open && (hasResults || showRecents || (query.trim() && !isLoading)) && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-2 left-0 right-0 z-50 rounded-xl border overflow-hidden shadow-2xl"
          style={{ background: '#161616', borderColor: '#2a2a2a' }}
          role="listbox"
          aria-label="Search results"
        >
          <div className="max-h-[420px] overflow-y-auto">

            {/* Loading */}
            {isLoading && (
              <div className="flex items-center justify-center py-8 gap-2">
                <div className="h-4 w-4 rounded-full border-2 border-[#6366f1] border-t-transparent animate-spin" />
                <span className="text-sm text-gray-400">Searching...</span>
              </div>
            )}

            {/* Recent searches */}
            {!isLoading && showRecents && (
              <div className="p-2">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Recent</span>
                  <button
                    onClick={clearRecentSearches}
                    className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" /> Clear
                  </button>
                </div>
                {recentSearches.map(term => (
                  <button
                    key={term}
                    onClick={() => { setQuery(term); inputRef.current?.focus() }}
                    className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    <Clock className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                    {term}
                  </button>
                ))}
              </div>
            )}

            {/* No results */}
            {!isLoading && query.trim() && !hasResults && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-400">No results for <span className="text-white font-medium">"{query}"</span></p>
                <p className="text-xs text-gray-600 mt-1">Try a different keyword</p>
              </div>
            )}

            {/* Grouped results */}
            {!isLoading && hasResults && Object.entries(groupedResults).map(([module, items]) => (
              <div key={module} className="p-2">
                <div className="px-2 py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  {MODULE_ICONS[module]} {module}
                </div>
                {items.map(result => {
                  const idx = flatResults.findIndex(r => r.item.id === result.item.id)
                  const isActive = idx === activeIndex
                  const titleMatch = result.matches?.find(m => m.key === 'title')

                  return (
                    <button
                      key={result.item.id}
                      onClick={() => handleSelect(result.item)}
                      className={`flex flex-col w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                        isActive ? 'bg-[#6366f1]/20' : 'hover:bg-white/5'
                      }`}
                      role="option"
                      aria-selected={isActive}
                    >
                      <span className="text-sm font-medium text-white">
                        <HighlightMatch text={result.item.title} indices={titleMatch?.indices} />
                      </span>
                      {result.item.description && (
                        <span className="text-xs text-gray-500 mt-0.5">{result.item.description}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}

          </div>

          {/* Footer hint */}
          {hasResults && (
            <div className="px-3 py-2 border-t flex items-center gap-3 text-[11px] text-gray-600" style={{ borderColor: '#2a2a2a' }}>
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>esc close</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}