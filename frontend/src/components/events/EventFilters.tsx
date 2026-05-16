import { useState } from 'react'
import { Filter, X } from 'lucide-react'
import type { EventFilters } from '../../hooks/useEvents'

const CATEGORIES = ['academic', 'cultural', 'sports', 'technical', 'social', 'workshop', 'competition', 'other']

interface EventFiltersProps {
  filters: EventFilters
  onChange: (filters: EventFilters) => void
}

export function EventFiltersBar({ filters, onChange }: EventFiltersProps) {
  const [open, setOpen] = useState(false)

  const update = (key: keyof EventFilters, value: string | undefined) => {
    onChange({ ...filters, [key]: value || undefined })
  }

  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Category pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => update('category', filters.category === cat ? undefined : cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                filters.category === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <Filter className="h-3.5 w-3.5" />
          More filters
        </button>

        {hasFilters && (
          <button
            onClick={() => onChange({})}
            className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {open && (
        <div className="flex flex-wrap gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">From</label>
            <input
              type="date"
              value={filters.start_date ?? ''}
              onChange={e => update('start_date', e.target.value)}
              className="text-sm rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">To</label>
            <input
              type="date"
              value={filters.end_date ?? ''}
              onChange={e => update('end_date', e.target.value)}
              className="text-sm rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Sort by</label>
            <select
              value={filters.sort ?? 'start_time'}
              onChange={e => update('sort', e.target.value)}
              className="text-sm rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-gray-900 dark:text-gray-100"
            >
              <option value="start_time">Date</option>
              <option value="rsvp_count">Popularity</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
