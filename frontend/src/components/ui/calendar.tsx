import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface CalendarEvent {
  id: string
  date: string // ISO date string
  title: string
  category?: string
  color?: string
}

interface CalendarProps {
  events?: CalendarEvent[]
  onDateSelect?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  className?: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

const categoryColor: Record<string, string> = {
  academic: 'bg-blue-500',
  cultural: 'bg-yellow-500',
  sports: 'bg-green-500',
  technical: 'bg-purple-500',
  social: 'bg-pink-500',
  workshop: 'bg-cyan-500',
  competition: 'bg-red-500',
  other: 'bg-gray-500',
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

export function Calendar({ events = [], onDateSelect, onEventClick, className }: CalendarProps) {
  const today = new Date()
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState<Date | null>(null)

  const year = current.getFullYear()
  const month = current.getMonth()

  // Build grid: days from prev month + current month + next month
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()

  const cells: { date: Date; isCurrentMonth: boolean }[] = []

  // Prev month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrev - i), isCurrentMonth: false })
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true })
  }
  // Next month padding to fill 6 rows
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    cells.push({ date: new Date(year, month + 1, d), isCurrentMonth: false })
  }

  const eventsMap = new Map<string, CalendarEvent[]>()
  for (const ev of events) {
    const key = ev.date.slice(0, 10)
    if (!eventsMap.has(key)) eventsMap.set(key, [])
    eventsMap.get(key)!.push(ev)
  }

  const handleDateClick = (date: Date) => {
    setSelected(date)
    onDateSelect?.(date)
  }

  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setCurrent(new Date(year, month - 1, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </button>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          {MONTHS[month]} {year}
        </h2>
        <button
          onClick={() => setCurrent(new Date(year, month + 1, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {DAYS.map(d => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {cells.map(({ date, isCurrentMonth }, i) => {
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
          const dayEvents = eventsMap.get(key) ?? []
          const isToday = isSameDay(date, today)
          const isSelected = selected ? isSameDay(date, selected) : false

          return (
            <button
              key={i}
              onClick={() => handleDateClick(date)}
              className={cn(
                'min-h-[60px] p-1 border-b border-r border-gray-100 dark:border-gray-800 text-left transition-colors',
                'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                !isCurrentMonth && 'opacity-40',
                isSelected && 'bg-indigo-50 dark:bg-indigo-900/20'
              )}
            >
              <span className={cn(
                'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                isToday && 'bg-indigo-600 text-white',
                !isToday && isCurrentMonth && 'text-gray-900 dark:text-gray-100',
                !isCurrentMonth && 'text-gray-400'
              )}>
                {date.getDate()}
              </span>
              {/* Event dots */}
              <div className="mt-0.5 flex flex-wrap gap-0.5">
                {dayEvents.slice(0, 3).map(ev => (
                  <button
                    key={ev.id}
                    onClick={e => { e.stopPropagation(); onEventClick?.(ev) }}
                    className={cn(
                      'w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded truncate text-white',
                      ev.category ? categoryColor[ev.category] ?? 'bg-indigo-500' : 'bg-indigo-500'
                    )}
                    title={ev.title}
                  >
                    {ev.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-gray-400 px-1">+{dayEvents.length - 3}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
