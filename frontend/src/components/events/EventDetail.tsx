import { type Event } from '../../hooks/useEvents'
import { RSVPButton } from './RSVPButton'
import { Badge } from '../ui/badge'
import { UserAvatar } from '../ui/avatar'
import { ShareButton } from '../common/ShareButton'

interface EventDetailProps {
  event: Event
  onEdit?: () => void
  onCancel?: () => void
  isCreatorOrAdmin?: boolean
}

const categoryColors: Record<string, string> = {
  academic: 'info',
  cultural: 'warning',
  sports: 'success',
  technical: 'default',
  social: 'secondary',
  workshop: 'info',
  competition: 'error',
  other: 'default',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export function EventDetail({ event, onEdit, onCancel, isCreatorOrAdmin }: EventDetailProps) {
  const isPast = new Date(event.end_time) < new Date()
  const isCancelled = event.status === 'cancelled'
  const capacityPct = Math.min(100, Math.round((event.current_rsvp_count / event.max_capacity) * 100))

  return (
    <div className="space-y-6">
      {/* Cover image */}
      {event.cover_image_url ? (
        <img
          src={event.cover_image_url}
          alt={event.title}
          className="w-full h-56 object-cover rounded-xl"
        />
      ) : (
        <div className="w-full h-56 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <svg className="w-16 h-16 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}

      {/* Title + status */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant={categoryColors[event.category] as 'default' | 'success' | 'warning' | 'error' | 'info'}>
              {event.category}
            </Badge>
            {isCancelled && <Badge variant="error">Cancelled</Badge>}
            {isPast && !isCancelled && <Badge variant="default">Past</Badge>}
            {!event.is_approved && <Badge variant="warning">Pending Approval</Badge>}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{event.title}</h1>
        </div>
        {isCreatorOrAdmin && !isCancelled && !isPast && (
          <div className="flex gap-2 shrink-0">
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Edit
              </button>
            )}
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-3 py-1.5 text-sm rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Cancel Event
              </button>
            )}
          </div>
        )}
      </div>

      {/* Meta info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 shrink-0">
            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(event.start_time)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{formatTime(event.start_time)} – {formatTime(event.end_time)}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 shrink-0">
            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{event.location}</p>
          </div>
        </div>

        {/* Capacity */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 shrink-0">
            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {event.current_rsvp_count} / {event.max_capacity} attending
            </p>
            <div className="mt-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${capacityPct >= 90 ? 'bg-red-500' : capacityPct >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${capacityPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Club */}
        {event.club && (
          <div className="flex items-center gap-3">
            <UserAvatar
              avatarUrl={event.club.logo_url}
              name={event.club.name}
              size="sm"
            />
            <p className="text-sm font-medium text-gray-900 dark:text-white">{event.club.name}</p>
          </div>
        )}
      </div>

      {/* Tags */}
      {event.tags && event.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {event.tags.map(({ tag }) => (
            <span key={tag.id} className="px-2.5 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              #{tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Description */}
      {event.description && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">About</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
            {event.description}
          </p>
        </div>
      )}

      {/* RSVP + Share */}
      {!isCancelled && (
        <div className="pt-2 flex items-center gap-3">
          <RSVPButton event={event} />
          <ShareButton title={event.title} text={event.description} />
        </div>
      )}
    </div>
  )
}
