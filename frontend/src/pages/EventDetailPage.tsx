import { useParams, useNavigate } from 'react-router-dom'
import { useEvent, useDeleteEvent } from '../hooks/useEvents'
import { EventDetail } from '../components/events/EventDetail'
import { Skeleton } from '../components/ui/skeleton'
import { useAuthStore } from '../store/auth'
import { useToast } from '../components/ui/use-toast'

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { toast } = useToast()
  const { data: event, isLoading, error } = useEvent(id!)
  const deleteEvent = useDeleteEvent()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator'
  const isCreator = event?.creator_id === profile?.id
  const isCreatorOrAdmin = isCreator || isAdmin

  const handleCancel = async () => {
    if (!event) return
    if (!confirm(`Cancel "${event.title}"? This will notify all attendees.`)) return
    try {
      await deleteEvent.mutateAsync(event.id)
      toast({ variant: 'success', title: 'Event cancelled' })
      navigate('/events')
    } catch {
      toast({ variant: 'error', title: 'Failed to cancel event' })
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Event not found</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">This event may have been removed or doesn't exist.</p>
        <button
          onClick={() => navigate('/events')}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          Back to Events
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>
      <EventDetail
        event={event}
        isCreatorOrAdmin={isCreatorOrAdmin}
        onCancel={isCreatorOrAdmin ? handleCancel : undefined}
      />
    </div>
  )
}
