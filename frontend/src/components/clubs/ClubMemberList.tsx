import { UserAvatar } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem, DropdownSeparator } from '../ui/dropdown'
import { useUpdateMemberRole, useRemoveMember, type ClubMember } from '../../hooks/useClubs'
import { useToast } from '../ui/use-toast'

interface ClubMemberListProps {
  clubId: string
  members: ClubMember[]
  currentUserRole?: string
  currentUserId?: string
}

const roleVariant: Record<string, 'default' | 'info' | 'warning'> = {
  admin: 'warning',
  moderator: 'info',
  member: 'default',
}

export function ClubMemberList({ clubId, members, currentUserRole, currentUserId }: ClubMemberListProps) {
  const { toast } = useToast()
  const updateRole = useUpdateMemberRole(clubId)
  const removeMember = useRemoveMember(clubId)
  const isAdmin = currentUserRole === 'admin'

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await updateRole.mutateAsync({ userId, role })
      toast({ variant: 'success', title: 'Role updated' })
    } catch {
      toast({ variant: 'error', title: 'Failed to update role' })
    }
  }

  const handleRemove = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from this club?`)) return
    try {
      await removeMember.mutateAsync(userId)
      toast({ variant: 'success', title: 'Member removed' })
    } catch (err) {
      toast({ variant: 'error', title: 'Failed to remove member', description: (err as Error).message })
    }
  }

  return (
    <div className="space-y-2">
      {members.map(member => {
        const name = member.profile?.display_name ?? 'Unknown'
        const isSelf = member.user_id === currentUserId
        return (
          <div key={member.user_id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div className="flex items-center gap-3">
              <UserAvatar avatarUrl={member.profile?.avatar_url} name={name} size="sm" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {name} {isSelf && <span className="text-xs text-gray-400">(you)</span>}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Joined {new Date(member.joined_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={roleVariant[member.role]}>{member.role}</Badge>
              {isAdmin && !isSelf && (
                <Dropdown>
                  <DropdownTrigger>
                    <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label="Member actions">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </DropdownTrigger>
                  <DropdownContent align="right">
                    {member.role !== 'admin' && (
                      <DropdownItem onClick={() => handleRoleChange(member.user_id, 'admin')}>
                        Make Admin
                      </DropdownItem>
                    )}
                    {member.role !== 'moderator' && (
                      <DropdownItem onClick={() => handleRoleChange(member.user_id, 'moderator')}>
                        Make Moderator
                      </DropdownItem>
                    )}
                    {member.role !== 'member' && (
                      <DropdownItem onClick={() => handleRoleChange(member.user_id, 'member')}>
                        Set as Member
                      </DropdownItem>
                    )}
                    <DropdownSeparator />
                    <DropdownItem
                      onClick={() => handleRemove(member.user_id, name)}
                      className="text-red-600 dark:text-red-400"
                    >
                      Remove
                    </DropdownItem>
                  </DropdownContent>
                </Dropdown>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
