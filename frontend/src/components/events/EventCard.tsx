import { Calendar, MapPin, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../ui/badge'
import { RSVPButton } from './RSVPButton'
import type { Event } from '../../hooks/useEvents'
import { cn } from '../../lib/utils'

const categoryColors: Record<string, string> = {
  academic: 'info',
  cultural: 'warning',
  sports: 'success',
  technical: 'default',
  social: 'secondary',
  workshop: 'info',
  competition: 'error',
  other: 'secondary',
}

interface EventCardProps {
  event: Event
  compact?: boolean
}

export function EventCard({ event, compact = false }: EventCardProps) {
  const start = new Date(event.start_time)
  const isFull = event.current_rsvp_count >= event.max_capacity

  return (
    <div className={cn(
      'group rounded-xl border border-[#2a2a2a] dark:border-gray-700 bg-[#1a1a1a] dark:bg-gray-800 overflow-hidden',
      'hover:shadow-md transition-shadow',
      compact && 'flex gap-3'
    )}>
      {/* Cover image */}
      <Link to={`/events/${event.id}`} className={cn('block overflow-hidden', compact ? 'w-24 shrink-0' : 'aspect-video')}>
        {event.cover_image_url ? (
          <img
            src={event.cover_image_url}
            alt={event.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-900/35 to-purple-900/25 flex items-center justify-center">
            <Calendar className="h-8 w-8 text-indigo-400" />
          </div>
        )}
      </Link>

      <div className="p-4 flex flex-col gap-2 flex-1 min-w-0">
        {/* Category + status */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={categoryColors[event.category] as 'info' | 'warning' | 'success' | 'default' | 'secondary' | 'error'} size="sm">
            {event.category}
          </Badge>
          {event.status === 'cancelled' && <Badge variant="error" size="sm">Cancelled</Badge>}
          {!event.is_approved && <Badge variant="warning" size="sm">Pending Approval</Badge>}
        </div>

        {/* Title */}
        <Link to={`/events/${event.id}`} className="font-semibold text-white dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-2 leading-snug">
          {event.title}
        </Link>

        {/* Meta */}
        <div className="flex flex-col gap-1 text-sm text-gray-500 dark:text-gray-500">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            {start.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
            {' · '}
            {start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{event.location}</span>
          </span>
        </div>

        {/* Club */}
        {event.club && (
          <span className="text-xs text-gray-500 dark:text-gray-500">by {event.club.name}</span>
        )}

        {!compact && (
          <div className="mt-auto pt-2 flex items-center justify-between gap-2">
            {/* Capacity */}
            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-500">
              <Users className="h-4 w-4" />
              <span>{event.current_rsvp_count}/{event.max_capacity}</span>
              {isFull && <Badge variant="error" size="sm">Full</Badge>}
            </div>
            <RSVPButton event={event} />
          </div>
        )}
      </div>
    </div>
  )
}
