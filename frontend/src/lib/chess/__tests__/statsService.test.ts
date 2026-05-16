import { describe, it, expect, vi, beforeEach } from 'vitest'
import { recordGameResult } from '../statsService'

// Mock supabase
const mockMaybeSingle = vi.fn()
const mockSelect = vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: mockMaybeSingle })) }))
const mockUpsert = vi.fn()
const mockFrom = vi.fn((table: string) => {
  if (table === 'chess_stats') {
    return {
      select: mockSelect,
      upsert: mockUpsert,
    }
  }
  return {}
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => (mockFrom as (...a: unknown[]) => unknown)(...args),
  },
}))

describe('recordGameResult', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpsert.mockResolvedValue({ error: null })
  })

  it('creates a new row with wins=1 for a new user who wins', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null })

    await recordGameResult('user-1', 'win')

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        wins: 1,
        losses: 0,
        draws: 0,
        games_played: 1,
      }),
      { onConflict: 'user_id' },
    )
  })

  it('creates a new row with losses=1 for a new user who loses', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null })

    await recordGameResult('user-2', 'loss')

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-2',
        wins: 0,
        losses: 1,
        draws: 0,
        games_played: 1,
      }),
      { onConflict: 'user_id' },
    )
  })

  it('creates a new row with draws=1 for a new user who draws', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null })

    await recordGameResult('user-3', 'draw')

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-3',
        wins: 0,
        losses: 0,
        draws: 1,
        games_played: 1,
      }),
      { onConflict: 'user_id' },
    )
  })

  it('increments wins for an existing user', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { wins: 3, losses: 1, draws: 0, games_played: 4 },
    })

    await recordGameResult('user-4', 'win')

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-4',
        wins: 4,
        losses: 1,
        draws: 0,
        games_played: 5,
      }),
      { onConflict: 'user_id' },
    )
  })

  it('increments losses for an existing user', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { wins: 2, losses: 2, draws: 1, games_played: 5 },
    })

    await recordGameResult('user-5', 'loss')

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-5',
        wins: 2,
        losses: 3,
        draws: 1,
        games_played: 6,
      }),
      { onConflict: 'user_id' },
    )
  })

  it('does not throw when upsert returns an error', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null })
    mockUpsert.mockResolvedValue({ error: new Error('DB error') })

    // Should not throw
    await expect(recordGameResult('user-6', 'win')).resolves.toBeUndefined()
  })
})
