import { useState } from 'react'
import { ChevronDown, Check, Star, X, Calendar } from 'lucide-react'
import { useRSVP, useCancelRSVP, type Event } from '../../hooks/useEvents'
import { useToast } from '../ui/use-toast'
import { cn } from '../../lib/utils'

interface RSVPButtonProps {
  event: Event
  onSuccess?: () => void
}

const statusConfig = {
  going: { label: 'Going', icon: Check, color: 'bg-green-600 hover:bg-green-700 text-white' },
  interested: { label: 'Interested', icon: Star, color: 'bg-yellow-500 hover:bg-yellow-600 text-white' },
  not_going: { label: 'Not Going', icon: X, color: 'bg-gray-500 hover:bg-gray-600 text-white' },
}

export function RSVPButton({ event, onSuccess }: RSVPButtonProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const rsvp = useRSVP(event.id)
  const cancelRsvp = useCancelRSVP(event.id)

  const currentStatus = event.user_rsvp?.status as keyof typeof statusConfig | undefined
  const isPast = new Date(event.end_time) < new Date()
  const isCancelled = event.status === 'cancelled'
  const isFull = event.current_rsvp_count >= event.max_capacity

  const handleRSVP = async (status: 'going' | 'interested' | 'not_going') => {
    setOpen(false)
    try {
      if (currentStatus === status) {
        await cancelRsvp.mutateAsync()
        toast({ variant: 'info', title: 'RSVP removed' })
      } else {
        await rsvp.mutateAsync(status)
        toast({ variant: 'success', title: `Marked as ${statusConfig[status].label}` })
      }
      onSuccess?.()
    } catch (err) {
      toast({ variant: 'error', title: 'Failed to update RSVP', description: (err as Error).message })
    }
  }

  if (isPast || isCancelled) {
    return (
      <button disabled className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 text-sm cursor-not-allowed">
        <Calendar className="h-4 w-4" />
        {isCancelled ? 'Cancelled' : 'Event Ended'}
      </button>
    )
  }

  if (isFull && !currentStatus) {
    return (
      <button disabled className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 text-sm cursor-not-allowed">
        Event Full
      </button>
    )
  }

  const current = currentStatus ? statusConfig[currentStatus] : null
  const isLoading = rsvp.isPending || cancelRsvp.isPending

  return (
    <div className="relative">
      <div className="flex rounded-lg overflow-hidden shadow-sm">
        <button
          onClick={() => !current && handleRSVP('going')}
          disabled={isLoading}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors',
            current
              ? current.color
              : 'bg-indigo-600 hover:bg-indigo-700 text-white',
            isLoading && 'opacity-60 cursor-not-allowed'
          )}
        >
          {current ? (
            <>
              <current.icon className="h-4 w-4" />
              {current.label}
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4" />
              RSVP
            </>
          )}
        </button>
        <button
          onClick={() => setOpen(o => !o)}
          disabled={isLoading}
          className={cn(
            'px-2 py-2 border-l border-white/20 transition-colors',
            current ? current.color : 'bg-indigo-600 hover:bg-indigo-700 text-white',
            isLoading && 'opacity-60 cursor-not-allowed'
          )}
          aria-label="RSVP options"
          aria-expanded={open}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="absolute right-0 mt-1 w-40 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-10">
          {(Object.entries(statusConfig) as [keyof typeof statusConfig, typeof statusConfig[keyof typeof statusConfig]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => handleRSVP(key)}
              className={cn(
                'flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                currentStatus === key && 'font-semibold text-indigo-600 dark:text-indigo-400'
              )}
            >
              <cfg.icon className="h-4 w-4" />
              {cfg.label}
              {currentStatus === key && <Check className="h-3 w-3 ml-auto" />}
            </button>
          ))}
          {currentStatus && (
            <button
              onClick={() => { setOpen(false); cancelRsvp.mutate() }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-t border-gray-100 dark:border-gray-700"
            >
              <X className="h-4 w-4" />
              Remove RSVP
            </button>
          )}
        </div>
      )}
    </div>
  )
}
