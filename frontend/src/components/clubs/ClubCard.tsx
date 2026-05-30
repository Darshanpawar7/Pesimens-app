import { Users, Instagram, Linkedin, Globe } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../ui/badge'
import { useJoinClub, useLeaveClub, type Club } from '../../hooks/useClubs'
import { useToast } from '../ui/use-toast'
import { cn, getClubImageAlt } from '../../lib/utils'

interface ClubCardProps {
  club: Club
  compact?: boolean
}

export function ClubCard({ club, compact = false }: ClubCardProps) {
  const { toast } = useToast()
  const join = useJoinClub()
  const leave = useLeaveClub()
  const isMember = !!club.user_membership
  const isLoading = join.isPending || leave.isPending

  const handleMembership = async (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      if (isMember) {
        await leave.mutateAsync(club.id)
        toast({ variant: 'info', title: `Left ${club.name}` })
      } else {
        await join.mutateAsync(club.id)
        toast({ variant: 'success', title: `Joined ${club.name}` })
      }
    } catch (err) {
      toast({ variant: 'error', title: 'Failed', description: (err as Error).message })
    }
  }

  return (
    <div className={cn(
      'group rounded-xl border border-[#2a2a2a] dark:border-gray-700 bg-[#1a1a1a] dark:bg-gray-800 overflow-hidden hover:shadow-md transition-shadow',
      compact && 'flex gap-3 items-center p-3'
    )}>
      {!compact && (
        /* Cover */
        <div className="h-24 bg-gradient-to-br from-indigo-900/40 to-purple-900/30 relative">
          {club.cover_image_url && (
            <img src={club.cover_image_url} alt={getClubImageAlt(club.name, club.cover_image_alt)} loading="lazy" className="w-full h-full object-cover" />
          )}
          {/* Logo */}
          <div className="absolute -bottom-5 left-4 h-12 w-12 rounded-xl border-2 border-white dark:border-gray-800 bg-[#1a1a1a] dark:bg-gray-700 overflow-hidden shadow-none">
            {club.logo_url ? (
              <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg font-bold text-indigo-600 dark:text-indigo-400">
                {club.name[0]}
              </div>
            )}
          </div>
        </div>
      )}

      <div className={cn('flex flex-col gap-2', compact ? 'flex-1 min-w-0' : 'p-4 pt-8')}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link to={`/clubs/${club.id}`} className="font-semibold text-white dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 truncate block">
              {club.name}
            </Link>
            <Badge variant="secondary" size="sm" className="mt-0.5 capitalize">{club.category}</Badge>
          </div>
          {!compact && (
            <button
              onClick={handleMembership}
              disabled={isLoading}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                isMember
                  ? 'bg-[#0f0f0f] text-gray-400 hover:bg-red-500/15 hover:text-red-300'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white',
                isLoading && 'opacity-60 cursor-not-allowed'
              )}
            >
              {isMember ? 'Leave' : 'Join'}
            </button>
          )}
        </div>

        {!compact && club.description && (
          <p className="text-sm text-gray-500 dark:text-gray-500 line-clamp-2">{club.description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {club.member_count} members
          </span>
          {club.instagram && (
            <a href={club.instagram} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="hover:text-pink-500 transition-colors">
              <Instagram className="h-3.5 w-3.5" />
            </a>
          )}
          {club.linkedin && (
            <a href={club.linkedin} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="hover:text-blue-500 transition-colors">
              <Linkedin className="h-3.5 w-3.5" />
            </a>
          )}
          {club.website && (
            <a href={club.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="hover:text-indigo-500 transition-colors">
              <Globe className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
