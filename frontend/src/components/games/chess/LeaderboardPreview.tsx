import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { trackChessEvent } from '../../../lib/chess/analytics'

interface PreviewEntry {
  user_id: string
  wins: number
  display_name: string | null
}

const TROPHIES = ['🥇', '🥈', '🥉']

interface LeaderboardPreviewProps {
  onViewFull: () => void
}

export function LeaderboardPreview({ onViewFull }: LeaderboardPreviewProps) {
  const [entries, setEntries] = useState<PreviewEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTop3() {
      const { data, error } = await supabase
        .from('chess_stats')
        .select('user_id, wins')
        .order('wins', { ascending: false })
        .limit(3)

      if (error || !data) {
        setLoading(false)
        return
      }

      const userIds = data.map((r) => r.user_id)
      let nameMap: Record<string, string | null> = {}

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', userIds)

        if (profiles) {
          nameMap = Object.fromEntries(profiles.map((p) => [p.id, p.display_name]))
        }
      }

      setEntries(
        data.map((row) => ({
          user_id: row.user_id,
          wins: row.wins,
          display_name: nameMap[row.user_id] ?? null,
        }))
      )
      setLoading(false)
    }

    void fetchTop3()
  }, [])

  function handleViewFull() {
    void trackChessEvent('leaderboard_preview_clicked')
    onViewFull()
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={styles.heading}>🏆 Top Players</p>
        <div style={styles.skeletonList}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={styles.skeletonRow} />
          ))}
        </div>
      </div>
    )
  }

  if (entries.length === 0) return null

  return (
    <div style={styles.container}>
      <p style={styles.heading}>🏆 Top Players</p>
      <div style={styles.list}>
        {entries.map((entry, idx) => (
          <div key={entry.user_id} style={styles.row}>
            <span style={styles.trophy}>{TROPHIES[idx]}</span>
            <span style={styles.name}>{entry.display_name ?? 'Anonymous'}</span>
            <span style={styles.wins}>{entry.wins}W</span>
          </div>
        ))}
      </div>
      <button style={styles.ctaButton} onClick={handleViewFull}>
        View Full Leaderboard →
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: 14,
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  heading: {
    margin: 0,
    fontSize: 14,
    fontWeight: 700,
    color: '#ffffff',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 8,
    background: '#111',
  },
  trophy: {
    fontSize: 18,
    flexShrink: 0,
  },
  name: {
    flex: 1,
    fontSize: 13,
    color: '#e0e0e0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  wins: {
    fontSize: 13,
    fontWeight: 700,
    color: '#6366f1',
    flexShrink: 0,
  },
  ctaButton: {
    marginTop: 4,
    width: '100%',
    padding: '10px 0',
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 13,
    background: 'rgba(99,102,241,0.15)',
    color: '#a5b4fc',
    border: '1px solid rgba(99,102,241,0.3)',
    cursor: 'pointer',
    letterSpacing: '0.01em',
  },
  skeletonList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  skeletonRow: {
    height: 36,
    borderRadius: 8,
    background: 'linear-gradient(90deg, #1f1f1f 25%, #2a2a2a 50%, #1f1f1f 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
  },
}
