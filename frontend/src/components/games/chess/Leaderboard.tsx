import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { setupVisibilityAwareChannel } from '../../../lib/realtimeVisibility'
import { useAuthStore } from '../../../store/auth'
import { useChessStore } from '../../../lib/chess/store'
import { Skeleton } from './Skeleton'

interface ChessStatRow {
  user_id: string
  wins: number
  losses: number
  draws: number
  games_played: number
  win_streak: number
  best_streak: number
  display_name?: string | null
}

interface LeaderboardEntry extends ChessStatRow {
  rank: number
  win_rate: number
}

const MEDAL = ['🥇', '🥈', '🥉']

type LeaderboardTab = 'wins' | 'streaks'

export function Leaderboard({ onPlayNow }: { onPlayNow?: () => void } = {}) {
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const onlineUsers = useChessStore((s) => s.onlineUsers)

  const [topPlayers, setTopPlayers] = useState<LeaderboardEntry[]>([])
  const [myStats, setMyStats] = useState<ChessStatRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('wins')

  const fetchLeaderboard = useCallback(async () => {
    const orderCol = activeTab === 'streaks' ? 'best_streak' : 'wins'

    const { data, error } = await supabase
      .from('chess_stats')
      .select('user_id, wins, losses, draws, games_played, win_streak, best_streak')
      .order(orderCol, { ascending: false })
      .limit(10)

    if (error) {
      console.error('Leaderboard fetch error:', error)
      return
    }

    if (!data) return

    // Fetch display names for top players
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

    const entries: LeaderboardEntry[] = data.map((row, idx) => ({
      ...row,
      win_streak: row.win_streak ?? 0,
      best_streak: row.best_streak ?? 0,
      display_name: nameMap[row.user_id] ?? null,
      rank: idx + 1,
      win_rate: row.games_played > 0 ? Math.round((row.wins / row.games_played) * 100) : 0,
    }))

    setTopPlayers(entries)

    // Set personal stats
    if (user) {
      const mine = data.find((r) => r.user_id === user.id)
      if (mine) {
        setMyStats({
          ...mine,
          win_streak: mine.win_streak ?? 0,
          best_streak: mine.best_streak ?? 0,
          display_name: profile?.display_name ?? null,
        })
      } else {
        // Fetch separately if not in top 10
        const { data: myRow } = await supabase
          .from('chess_stats')
          .select('user_id, wins, losses, draws, games_played, win_streak, best_streak')
          .eq('user_id', user.id)
          .single()

        if (myRow) {
          setMyStats({
            ...myRow,
            win_streak: myRow.win_streak ?? 0,
            best_streak: myRow.best_streak ?? 0,
            display_name: profile?.display_name ?? null,
          })
        }
      }
    }

    setLoading(false)
  }, [user, profile, activeTab])

  useEffect(() => {
    void fetchLeaderboard()

    // Subscribe to Realtime changes on chess_stats
    return setupVisibilityAwareChannel(() =>
      supabase
        .channel('chess_stats_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'chess_stats' },
          () => {
            void fetchLeaderboard()
          }
        )
        .subscribe()
    )
  }, [fetchLeaderboard])

  const myWinRate =
    myStats && myStats.games_played > 0
      ? Math.round((myStats.wins / myStats.games_played) * 100)
      : 0

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>🏆 Leaderboard</h2>

      {/* Personal stats */}
      {user && (
        <div style={styles.myStatsCard}>
          <div style={styles.myStatsHeader}>
            <p style={styles.myStatsTitle}>Your Stats</p>
            {myStats && myStats.win_streak > 0 && (
              <span style={styles.streakBadge}>🔥 {myStats.win_streak} streak</span>
            )}
          </div>
          {myStats ? (
            <>
              <div style={styles.statsGrid}>
                <StatBox label="Played" value={myStats.games_played} />
                <StatBox label="Wins" value={myStats.wins} accent />
                <StatBox label="Losses" value={myStats.losses} />
                <StatBox label="Win Rate" value={`${myWinRate}%`} />
              </div>
              {myStats.best_streak > 0 && (
                <p style={styles.bestStreakText}>Best streak: {myStats.best_streak} 🔥</p>
              )}
            </>
          ) : loading ? (
            <p style={styles.emptyText}>Loading…</p>
          ) : (
            <p style={styles.emptyText}>No games played yet. Play a game to appear here!</p>
          )}
        </div>
      )}

      {/* Top players */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <p style={styles.tableTitle}>Top Players</p>
          <div style={styles.tabRow}>
            <button
              style={{ ...styles.tabBtn, ...(activeTab === 'wins' ? styles.tabBtnActive : {}) }}
              onClick={() => setActiveTab('wins')}
            >
              Wins
            </button>
            <button
              style={{ ...styles.tabBtn, ...(activeTab === 'streaks' ? styles.tabBtnActive : {}) }}
              onClick={() => setActiveTab('streaks')}
            >
              Streaks
            </button>
          </div>
        </div>

        {loading ? (
          <div style={styles.skeletonList}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={40} borderRadius={8} />
            ))}
          </div>
        ) : topPlayers.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyEmoji}>♟️</p>
            <p style={styles.emptyText}>Be the first to play and rank #1 🏆</p>
            {onPlayNow && (
              <button
                style={styles.playNowButton}
                onClick={onPlayNow}
                aria-label="Play Now"
              >
                Play Now
              </button>
            )}
          </div>
        ) : (
          <div style={styles.list}>
            {topPlayers.map((entry) => (
              <div
                key={entry.user_id}
                style={{
                  ...styles.row,
                  ...(entry.user_id === user?.id ? styles.myRow : {}),
                }}
              >
                <span style={styles.rank}>
                  {entry.rank <= 3 ? MEDAL[entry.rank - 1] : `#${entry.rank}`}
                </span>
                <span style={styles.name}>
                  {entry.display_name ?? 'Anonymous'}
                  {entry.user_id === user?.id && (
                    <span style={styles.youBadge}> you</span>
                  )}
                  {onlineUsers.includes(entry.user_id) && (
                    <span style={styles.onlineDot} aria-label="Online" />
                  )}
                </span>
                {activeTab === 'wins' ? (
                  <>
                    <span style={styles.wins}>{entry.wins}W</span>
                    <span style={styles.winRate}>{entry.win_rate}%</span>
                  </>
                ) : (
                  <>
                    <span style={styles.wins}>{entry.best_streak} best</span>
                    {entry.win_streak > 0 && (
                      <span style={styles.streakBadgeSmall}>🔥{entry.win_streak}</span>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatBox({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div style={styles.statBox}>
      <span style={{ ...styles.statValue, ...(accent ? styles.accentText : {}) }}>
        {value}
      </span>
      <span style={styles.statLabel}>{label}</span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    width: '100%',
    maxWidth: 480,
    margin: '0 auto',
  },
  heading: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: '#ffffff',
  },
  myStatsCard: {
    background: '#1a1a1a',
    borderRadius: 12,
    padding: '20px 24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    border: '1px solid #2a2a2a',
  },
  myStatsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  myStatsTitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  streakBadge: {
    fontSize: 13,
    fontWeight: 700,
    color: '#f97316',
    background: 'rgba(249,115,22,0.12)',
    border: '1px solid rgba(249,115,22,0.3)',
    borderRadius: 20,
    padding: '2px 10px',
  },
  streakBadgeSmall: {
    fontSize: 12,
    fontWeight: 700,
    color: '#f97316',
    flexShrink: 0,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
  },
  bestStreakText: {
    margin: '10px 0 0',
    fontSize: 12,
    color: '#f97316',
    textAlign: 'center' as const,
  },
  statBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 700,
    color: '#ffffff',
  },
  accentText: {
    color: '#6366f1',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableCard: {
    background: '#1a1a1a',
    borderRadius: 12,
    padding: '20px 24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    border: '1px solid #2a2a2a',
  },
  tableHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  tableTitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tabRow: {
    display: 'flex',
    gap: 4,
  },
  tabBtn: {
    background: 'transparent',
    border: '1px solid #4b4b4b',
    borderRadius: 6,
    color: '#b3b3b3',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    padding: '4px 12px',
  },
  tabBtnActive: {
    background: 'rgba(99,102,241,0.25)',
    border: '1px solid rgba(99,102,241,0.55)',
    color: '#a5b4fc',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 8,
    background: '#111',
  },
  myRow: {
    background: 'rgba(99,102,241,0.12)',
    border: '1px solid rgba(99,102,241,0.3)',
  },
  rank: {
    width: 32,
    fontSize: 16,
    textAlign: 'center',
    flexShrink: 0,
  },
  name: {
    flex: 1,
    fontSize: 14,
    color: '#e0e0e0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  youBadge: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: 600,
  },
  onlineDot: {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#22c55e',
    marginLeft: 6,
    verticalAlign: 'middle',
  },
  wins: {
    fontSize: 13,
    fontWeight: 600,
    color: '#6366f1',
    flexShrink: 0,
  },
  winRate: {
    fontSize: 12,
    color: '#666',
    width: 36,
    textAlign: 'right',
    flexShrink: 0,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: '24px 0',
  },
  emptyEmoji: {
    fontSize: 36,
    margin: 0,
  },
  emptyText: {
    margin: 0,
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  playNowButton: {
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
  skeletonList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  skeletonRow: {
    height: 40,
    borderRadius: 8,
    background: 'linear-gradient(90deg, #1f1f1f 25%, #2a2a2a 50%, #1f1f1f 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
  },
}
