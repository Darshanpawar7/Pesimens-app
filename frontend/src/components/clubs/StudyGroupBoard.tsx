import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { UserAvatar } from '../ui/avatar'
import { Button } from '../ui/button'

interface StudyGroupBoardProps {
  roomId: string
  roomName: string
  clubId: string
  currentUser: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
  onLeave: () => void
  onDelete?: () => void
}

interface PresenceState {
  user_id: string
  display_name: string | null
  avatar_url: string | null
  online_at: string
}

export function StudyGroupBoard({ roomId, roomName, currentUser, onLeave, onDelete }: StudyGroupBoardProps) {
  const [notes, setNotes] = useState('')
  const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([])
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null)
  const [isTyping, setIsTyping] = useState<string | null>(null)

  useEffect(() => {
    const newChannel = supabase.channel(`study_room_${roomId}`, {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    })

    newChannel
      .on('presence', { event: 'sync' }, () => {
        const state = newChannel.presenceState<PresenceState>()
        const users = Object.values(state).flatMap((presences) => presences)
        setOnlineUsers(users)
      })
      .on('broadcast', { event: 'note_update' }, ({ payload }) => {
        if (payload.notes !== undefined) {
          setNotes(payload.notes)
        }
        if (payload.userId && payload.userId !== currentUser.id) {
          setIsTyping(payload.displayName || 'Someone')
          // Clear typing indicator after 2 seconds
          setTimeout(() => setIsTyping(null), 2000)
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await newChannel.track({
            user_id: currentUser.id,
            display_name: currentUser.display_name,
            avatar_url: currentUser.avatar_url,
            online_at: new Date().toISOString(),
          })
        }
      })

    setChannel(newChannel)

    return () => {
      newChannel.unsubscribe()
    }
  }, [roomId, currentUser.id, currentUser.display_name, currentUser.avatar_url])

  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value
      setNotes(newText)
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'note_update',
          payload: { 
            notes: newText,
            userId: currentUser.id,
            displayName: currentUser.display_name
          },
        })
      }
    },
    [channel, currentUser.id, currentUser.display_name]
  )

  return (
    <div className="flex flex-col h-[500px] border border-[#2a2a2a] rounded-xl overflow-hidden bg-[#1a1a1a]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] bg-[#111111]">
        <div>
          <h3 className="font-semibold text-white">{roomName}</h3>
          <p className="text-xs text-white/50">{onlineUsers.length} online</p>
        </div>
        <div className="flex items-center gap-2">
          {onDelete && (
            <Button variant="destructive" size="sm" onClick={onDelete}>
              Delete Room
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onLeave} className="border-[#2a2a2a] bg-[#1a1a1a] text-white hover:bg-[#2a2a2a]">
            Leave
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Note Board */}
        <div className="flex-1 p-4 flex flex-col">
          <textarea
            value={notes}
            onChange={handleNotesChange}
            placeholder="Start typing collaborative notes here..."
            className="flex-1 w-full bg-transparent text-white outline-none resize-none placeholder:text-white/30"
          />
          <div className="h-6 mt-2 text-xs text-indigo-400 italic">
            {isTyping ? `${isTyping} is typing...` : ''}
          </div>
        </div>

        {/* Presence Sidebar */}
        <div className="w-48 border-l border-[#2a2a2a] bg-[#111111] p-4 flex flex-col gap-3 overflow-y-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">Members Online</p>
          {onlineUsers.map((user) => (
            <div key={user.user_id} className="flex items-center gap-2">
              <div className="relative">
                <UserAvatar name={user.display_name || 'Student'} avatarUrl={user.avatar_url} size="sm" />
                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-[#111111]" />
              </div>
              <span className="text-sm text-white truncate">{user.display_name || 'Student'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
