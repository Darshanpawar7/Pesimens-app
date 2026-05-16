import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Leaderboard } from '../Leaderboard'

// Mock supabase
const mockRemoveChannel = vi.fn().mockResolvedValue(undefined)
const mockSubscribe = vi.fn().mockReturnThis()
const mockOn = vi.fn().mockReturnThis()
const mockChannel = vi.fn(() => ({ on: mockOn, subscribe: mockSubscribe }))
const mockFrom = vi.fn()

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => (mockFrom as (...a: unknown[]) => unknown)(...args),
    channel: (...args: unknown[]) => (mockChannel as (...a: unknown[]) => unknown)(...args),
    removeChannel: (...args: unknown[]) => (mockRemoveChannel as (...a: unknown[]) => unknown)(...args),
  },
}))

// Mock auth store
const mockUser = { id: 'user-123' }
const mockProfile = { display_name: 'Test User' }

vi.mock('../../../../store/auth', () => ({
  useAuthStore: (selector: (s: { user: typeof mockUser | null; profile: typeof mockProfile | null }) => unknown) =>
    selector({ user: mockUser, profile: mockProfile }),
}))

function makeStatsQuery(rows: object[]) {
  return {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
}

function makeProfilesQuery(rows: object[]) {
  return {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: rows, error: null }),
  }
}

describe('Leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOn.mockReturnThis()
    mockSubscribe.mockReturnThis()
    mockChannel.mockReturnValue({ on: mockOn, subscribe: mockSubscribe })
  })

  it('renders the heading and Your Stats section', () => {
    mockFrom.mockReturnValue(makeStatsQuery([]))
    render(<Leaderboard />)
    expect(screen.getByText(/leaderboard/i)).toBeTruthy()
    expect(screen.getByText('Your Stats')).toBeTruthy()
  })

  it('shows empty state when no players have stats', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'chess_stats') return makeStatsQuery([])
      if (table === 'profiles') return makeProfilesQuery([])
      return makeStatsQuery([])
    })

    render(<Leaderboard />)

    await waitFor(() => {
      expect(screen.getByText(/be the first to play/i)).toBeTruthy()
    })
  })

  it('renders top players after fetch', async () => {
    const statsRows = [
      { user_id: 'user-1', wins: 10, losses: 2, draws: 1, games_played: 13 },
      { user_id: 'user-2', wins: 7, losses: 3, draws: 0, games_played: 10 },
    ]
    const profileRows = [
      { id: 'user-1', display_name: 'Alice' },
      { id: 'user-2', display_name: 'Bob' },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'chess_stats') return makeStatsQuery(statsRows)
      if (table === 'profiles') return makeProfilesQuery(profileRows)
      return makeStatsQuery([])
    })

    render(<Leaderboard />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeTruthy()
      expect(screen.getByText('Bob')).toBeTruthy()
    })
  })

  it('shows medal emojis for top 3 players', async () => {
    const statsRows = [
      { user_id: 'user-1', wins: 10, losses: 2, draws: 1, games_played: 13 },
      { user_id: 'user-2', wins: 7, losses: 3, draws: 0, games_played: 10 },
      { user_id: 'user-3', wins: 5, losses: 5, draws: 2, games_played: 12 },
    ]
    const profileRows = [
      { id: 'user-1', display_name: 'Alice' },
      { id: 'user-2', display_name: 'Bob' },
      { id: 'user-3', display_name: 'Charlie' },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'chess_stats') return makeStatsQuery(statsRows)
      if (table === 'profiles') return makeProfilesQuery(profileRows)
      return makeStatsQuery([])
    })

    render(<Leaderboard />)

    await waitFor(() => {
      expect(screen.getByText(/🥇/)).toBeTruthy()
      expect(screen.getByText(/🥈/)).toBeTruthy()
      expect(screen.getByText(/🥉/)).toBeTruthy()
    })
  })

  it('highlights the current user with a "you" badge', async () => {
    const statsRows = [
      { user_id: 'user-1', wins: 10, losses: 2, draws: 1, games_played: 13 },
      { user_id: 'user-123', wins: 5, losses: 5, draws: 2, games_played: 12 },
    ]
    const profileRows = [
      { id: 'user-1', display_name: 'Alice' },
      { id: 'user-123', display_name: 'Test User' },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'chess_stats') return makeStatsQuery(statsRows)
      if (table === 'profiles') return makeProfilesQuery(profileRows)
      return makeStatsQuery([])
    })

    render(<Leaderboard />)

    await waitFor(() => {
      expect(screen.getByText('you')).toBeTruthy()
    })
  })

  it('displays personal stats labels for authenticated user', async () => {
    const statsRows = [
      { user_id: 'user-123', wins: 5, losses: 3, draws: 2, games_played: 10 },
    ]
    const profileRows = [{ id: 'user-123', display_name: 'Test User' }]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'chess_stats') return makeStatsQuery(statsRows)
      if (table === 'profiles') return makeProfilesQuery(profileRows)
      return makeStatsQuery([])
    })

    render(<Leaderboard />)

    await waitFor(() => {
      expect(screen.getByText('Played')).toBeTruthy()
      expect(screen.getAllByText('Wins').length).toBeGreaterThan(0)
      expect(screen.getByText('Losses')).toBeTruthy()
      expect(screen.getByText('Win Rate')).toBeTruthy()
    })
  })

  it('calculates win rate correctly', async () => {
    const statsRows = [
      { user_id: 'user-123', wins: 4, losses: 1, draws: 0, games_played: 5 },
    ]
    const profileRows = [{ id: 'user-123', display_name: 'Test User' }]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'chess_stats') return makeStatsQuery(statsRows)
      if (table === 'profiles') return makeProfilesQuery(profileRows)
      return makeStatsQuery([])
    })

    render(<Leaderboard />)

    await waitFor(() => {
      // 4/5 = 80%
      expect(screen.getAllByText('80%').length).toBeGreaterThan(0)
    })
  })

  it('subscribes to realtime changes on chess_stats', () => {
    mockFrom.mockReturnValue(makeStatsQuery([]))
    render(<Leaderboard />)
    expect(mockChannel).toHaveBeenCalledWith('chess_stats_changes')
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ table: 'chess_stats' }),
      expect.any(Function)
    )
    expect(mockSubscribe).toHaveBeenCalled()
  })
})
