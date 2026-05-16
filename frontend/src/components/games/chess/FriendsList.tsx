import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../store/auth'
import { useChessStore } from '../../../lib/chess/store'

interface FriendsListProps {
  onInvite: (friendId: string) => void
  onFindFriends?: () => void
}

interface Friend {
  id: string
  name: string
  isOnline: boolean
}

export function FriendsList({ onInvite, onFindFriends }: FriendsListProps) {
  const user = useAuthStore((s) => s.user)
  const onlineUsers = useChessStore((s) => s.onlineUsers)
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFriends = useCallback(async () => {
    if (!user) return

    // Fetch accepted friendships where the current user is either side
    const { data, error } = await supabase
      .from('friends')
      .select('user_id, friend_id')
      .eq('status', 'accepted')

    if (error) {
      console.error('FriendsList fetch error:', error)
      setLoading(false)
      return
    }

    if (!data || data.length === 0) {
      setFriends([])
      setLoading(false)
      return
    }

    // Determine the friend's id (the other side of the relationship)
    const friendIds = data.map((row) =>
      row.user_id === user.id ? row.friend_id : row.user_id
    )

    // Fetch display names from profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', friendIds)

    const nameMap: Record<string, string> = {}
    if (profiles) {
      for (const p of profiles) {
        nameMap[p.id] = p.display_name ?? 'Unknown'
      }
    }

    const friendList: Friend[] = friendIds.map((id) => ({
      id,
      name: nameMap[id] ?? 'Unknown',
      isOnline: false, // Presence handled by Enhancement 5
    }))

    setFriends(friendList)
    setLoading(false)
  }, [user])

  useEffect(() => {
    void fetchFriends()
  }, [fetchFriends])

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>👥 Friends</h3>

      {loading ? (
        <p style={styles.emptyText}>Loading…</p>
      ) : friends.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyEmoji}>😢</p>
          <p style={styles.emptyText}>No players online</p>
          <p style={styles.emptyHint}>Invite your friends to play!</p>
          {onFindFriends && (
            <button
              style={styles.findFriendsButton}
              onClick={onFindFriends}
              aria-label="Find Friends"
            >
              Find Friends
            </button>
          )}
        </div>
      ) : (
        <div style={styles.list}>
          {friends.map((friend) => (
            <div key={friend.id} style={styles.row}>
              <div style={styles.friendInfo}>
                <span
                  style={{
                    ...styles.onlineDot,
                    background: onlineUsers.includes(friend.id) ? '#22c55e' : '#444',
                  }}
                  aria-label={onlineUsers.includes(friend.id) ? 'Online' : 'Offline'}
                />
                <span style={styles.friendName}>{friend.name}</span>
              </div>
              <button
                style={styles.inviteButton}
                onClick={() => onInvite(friend.id)}
                aria-label={`Invite ${friend.name} to game`}
              >
                Invite to Game
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#1a1a1a',
    borderRadius: 12,
    padding: '20px 24px',
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    border: '1px solid #2a2a2a',
  },
  heading: {
    margin: '0 0 16px',
    fontSize: 16,
    fontWeight: 700,
    color: '#ffffff',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderRadius: 8,
    background: '#111',
  },
  friendInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  friendName: {
    fontSize: 14,
    color: '#e0e0e0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  inviteButton: {
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
    marginLeft: 12,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: '16px 0',
  },
  emptyEmoji: {
    fontSize: 28,
    margin: 0,
  },
  emptyText: {
    margin: 0,
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  emptyHint: {
    margin: 0,
    fontSize: 12,
    color: '#444',
    textAlign: 'center',
  },
  findFriendsButton: {
    marginTop: 8,
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 20px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
