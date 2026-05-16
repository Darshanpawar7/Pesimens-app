import { useNavigate } from 'react-router-dom'
import { Calendar, type CalendarEvent } from '../ui/calendar'
import type { Event } from '../../hooks/useEvents'

interface EventCalendarProps {
  events: Event[]
  birthdays?: Array<{ birthday_mmdd: string }>
  onDateSelect?: (date: Date) => void
  onBirthdayClick?: (birthdayDate: string) => void
  className?: string
}

export function EventCalendar({ events, birthdays = [], onDateSelect, onBirthdayClick, className }: EventCalendarProps) {
  const navigate = useNavigate()

  const calendarEvents: CalendarEvent[] = events.map(ev => ({
    id: ev.id,
    date: ev.start_time.slice(0, 10),
    title: ev.title,
    category: ev.category,
    color: ev.user_rsvp ? 'bg-green-500' : undefined,
  }))

  const currentYear = new Date().getFullYear()
  const birthdayCounts = new Map<string, number>()
  for (const item of birthdays) {
    const key = `${currentYear}-${item.birthday_mmdd}`
    birthdayCounts.set(key, (birthdayCounts.get(key) ?? 0) + 1)
  }

  const birthdayEvents: CalendarEvent[] = Array.from(birthdayCounts.entries()).map(([date, count]) => ({
    id: `birthday-${date}`,
    date,
    title: `🎂 ${count}`,
    category: 'other',
    color: 'bg-amber-500',
  }))

  return (
    <Calendar
      events={[...calendarEvents, ...birthdayEvents]}
      onDateSelect={onDateSelect}
      onEventClick={ev => {
        if (ev.id.startsWith('birthday-')) {
          onBirthdayClick?.(ev.date)
          return
        }
        navigate(`/events/${ev.id}`)
      }}
      className={className}
    />
  )
}
