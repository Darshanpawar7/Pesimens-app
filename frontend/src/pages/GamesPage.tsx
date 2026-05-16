import { useNavigate } from 'react-router-dom'

interface GameEntry {
  id: string
  name: string
  description: string
  icon: string
  playerCount: string
  route: string | null
}

const GAMES: GameEntry[] = [
  {
    id: 'ludo',
    name: 'Ludo',
    description: 'Classic board game for 2–4 players',
    icon: '🎲',
    playerCount: '2–4',
    route: '/games/ludo',
  },
  {
    id: 'bluff',
    name: 'PES Bluff',
    description: 'Bluff your way to victory',
    icon: '🃏',
    playerCount: '3–6',
    route: '/games/bluff',
  },
  {
    id: 'chess',
    name: 'Chess',
    description: 'The classic game of strategy',
    icon: '♟️',
    playerCount: '2',
    route: '/games/chess',
  },
  {
    id: 'drawl',
    name: 'PES Drawl',
    description: 'Draw and guess with friends',
    icon: '🎨',
    playerCount: '3–8',
    route: null,
  },
]

interface GameCardProps {
  game: GameEntry
}

function GameCard({ game }: GameCardProps) {
  const navigate = useNavigate()

  const handlePlay = () => {
    if (game.route) {
      navigate(game.route)
    }
  }

  return (
    <div
      className="rounded-2xl border p-6 transition-all hover:border-white/20"
      style={{
        background: '#1a1a1a',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-3 text-4xl">{game.icon}</div>
          <h3 className="mb-2 text-lg font-semibold text-white">{game.name}</h3>
          <p className="mb-3 text-sm text-white/70">{game.description}</p>
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
            <span>👥</span>
            <span>{game.playerCount} players</span>
          </div>
        </div>
      </div>

      {game.route ? (
        <button
          type="button"
          onClick={handlePlay}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98]"
          style={{
            background: '#6366f1',
          }}
        >
          Play
        </button>
      ) : (
        <button
          type="button"
          disabled
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-white/40 transition-all"
          style={{
            background: 'rgba(255,255,255,0.05)',
            cursor: 'not-allowed',
          }}
        >
          Coming Soon
        </button>
      )}
    </div>
  )
}

export default function GamesPage() {
  return (
    <div
      className="min-h-screen px-4 py-6"
      style={{
        background: '#0f0f0f',
      }}
    >
      <div className="mx-auto max-w-4xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-white">Games</h1>
          <p className="mt-1 text-sm text-white/70">Play games with your friends</p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {GAMES.map(game => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </div>
    </div>
  )
}
