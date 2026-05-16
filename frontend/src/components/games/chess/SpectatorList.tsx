import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useChessStore } from '../../../lib/chess/store'
import { Skeleton } from './Skeleton'

interface PublicGame {
  id: string
  room_code: string
  players: Array<{ id: string; name?: string }>
  created_at: string
}

interface SpectatorListProps {
  onSelectGame: (sessionId: string, roomCode: string) => void
}

export function SpectatorList({ onSelectGame }: SpectatorListProps) {
  const [games, setGames] = useState<PublicGame[]>([])
  const [loading, setLoading] = useState(true)
  const onlineUsers = useChessStore((s) => s.onlineUsers)

  useEffect(() => {
    let cancelled = false

    async function fetchGames() {
      setLoading(true)
      const { data, error } = await supabase
        .from('game_sessions')
        .select('id, room_code, players, created_at')
        .eq('game_type', 'chess')
        .eq('is_public', true)
        .eq('phase', 'playing')
        .order('created_at', { ascending: false })

      if (!cancelled) {
        if (!error && data) {
          setGames(data as PublicGame[])
        }
        setLoading(false)
      }
    }

    fetchGames()
    return () => { cancelled = true }
  }, [])

  function getGameLabel(game: PublicGame, index: number): string {
    const players = game.players ?? []
    const names = players
      .map((p) => p.name)
      .filter(Boolean)
    if (names.length >= 2) return `${names[0]} vs ${names[1]}`
    if (names.length === 1) return `${names[0]} vs ...`
    return `Game #${index + 1}`
  }

  return (
    <div
      style={{
        background: '#1a1a1a',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 400,
      }}
    >
      <h3
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#8888a8',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 14,
        }}
      >
        👁 Live Games
      </h3>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={44} borderRadius={10} />
          ))}
        </div>
      ) : games.length === 0 ? (
        <div style={{ color: '#555', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
          No live games right now.
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {games.map((game, i) => (
            <li key={game.id}>
              <button
                onClick={() => onSelectGame(game.id, game.room_code)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  cursor: 'pointer',
                  color: '#e5e7eb',
                  fontSize: 13,
                  fontWeight: 500,
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background =
                    'rgba(99,102,241,0.18)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background =
                    'rgba(99,102,241,0.08)'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {(game.players ?? []).some((p) => onlineUsers.includes(p.id)) && (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#22c55e',
                        flexShrink: 0,
                        display: 'inline-block',
                      }}
                      aria-label="Players online"
                    />
                  )}
                  {getGameLabel(game, i)}
                </span>
                <span style={{ color: '#6366f1', fontSize: 12 }}>Watch →</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
