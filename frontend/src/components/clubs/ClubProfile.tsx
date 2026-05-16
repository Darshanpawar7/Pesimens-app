import { type Club } from '../../hooks/useClubs'
import { useJoinClub, useLeaveClub } from '../../hooks/useClubs'
import { ClubMemberList } from './ClubMemberList'
import { EventCard } from '../events/EventCard'
import { Badge } from '../ui/badge'
import { UserAvatar } from '../ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { useToast } from '../ui/use-toast'
import type { Event } from '../../hooks/useEvents'

interface ClubProfileProps {
  club: Club
  currentUserId?: string
  onEdit?: () => void
}

const categoryColors: Record<string, 'default' | 'info' | 'success' | 'warning'> = {
  academic: 'info',
  cultural: 'warning',
  sports: 'success',
  technical: 'default',
  social: 'info',
  arts: 'warning',
  other: 'default',
}

export function ClubProfile({ club, currentUserId, onEdit }: ClubProfileProps) {
  const { toast } = useToast()
  const joinClub = useJoinClub()
  const leaveClub = useLeaveClub()

  const userRole = club.user_membership?.role
  const isAdmin = userRole === 'admin'
  const isMember = !!userRole

  const handleJoin = async () => {
    try {
      await joinClub.mutateAsync(club.id)
      toast({ variant: 'success', title: `Joined ${club.name}` })
    } catch (err) {
      toast({ variant: 'error', title: 'Failed to join club', description: (err as Error).message })
    }
  }

  const handleLeave = async () => {
    if (!confirm(`Leave ${club.name}?`)) return
    try {
      await leaveClub.mutateAsync(club.id)
      toast({ variant: 'info', title: `Left ${club.name}` })
    } catch (err) {
      toast({ variant: 'error', title: 'Failed to leave club', description: (err as Error).message })
    }
  }

  return (
    <div className="space-y-6">
      {/* Cover image */}
      <div className="relative">
        {club.cover_image_url ? (
          <img src={club.cover_image_url} alt="" className="w-full h-40 object-cover rounded-xl" />
        ) : (
          <div className="w-full h-40 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600" />
        )}
        {/* Logo */}
        <div className="absolute -bottom-6 left-6">
          <UserAvatar avatarUrl={club.logo_url} name={club.name} size="xl" className="ring-4 ring-white dark:ring-gray-900" />
        </div>
      </div>

      {/* Header */}
      <div className="pt-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{club.name}</h1>
            {!club.is_approved && <Badge variant="warning">Pending</Badge>}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <Badge variant={categoryColors[club.category]}>{club.category}</Badge>
            <span>{club.member_count} members</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {isAdmin && onEdit && (
            <button
              onClick={onEdit}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Edit
            </button>
          )}
          {isMember ? (
            <button
              onClick={handleLeave}
              disabled={leaveClub.isPending}
              className="px-4 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {leaveClub.isPending ? 'Leaving…' : 'Leave'}
            </button>
          ) : (
            <button
              onClick={handleJoin}
              disabled={joinClub.isPending}
              className="px-4 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {joinClub.isPending ? 'Joining…' : 'Join'}
            </button>
          )}
        </div>
      </div>

      {/* Social links */}
      {(club.instagram || club.linkedin || club.website) && (
        <div className="flex gap-3">
          {club.instagram && (
            <a href={club.instagram} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              Instagram
            </a>
          )}
          {club.linkedin && (
            <a href={club.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              LinkedIn
            </a>
          )}
          {club.website && (
            <a href={club.website} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              Website
            </a>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="about">
        <TabsList>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="events">Events {club.upcoming_events && club.upcoming_events.length > 0 && `(${club.upcoming_events.length})`}</TabsTrigger>
          <TabsTrigger value="members">Members {club.members && `(${club.members.length})`}</TabsTrigger>
        </TabsList>

        <TabsContent value="about" className="pt-4">
          {club.description ? (
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
              {club.description}
            </p>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">No description provided.</p>
          )}
        </TabsContent>

        <TabsContent value="events" className="pt-4">
          {club.upcoming_events && club.upcoming_events.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {(club.upcoming_events as Event[]).map(event => (
                <EventCard key={event.id} event={event} compact />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <p>No upcoming events</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="members" className="pt-4">
          {club.members && club.members.length > 0 ? (
            <ClubMemberList
              clubId={club.id}
              members={club.members}
              currentUserRole={userRole}
              currentUserId={currentUserId}
            />
          ) : (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <p>No members yet</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
