import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MultiplayerLobby, generateRoomCode } from '../MultiplayerLobby'

// ─── Mock useGameSession ──────────────────────────────────────────────────────
const mockCreateRoom = vi.fn()
const mockJoinRoom = vi.fn()
const mockSubscribeToGame = vi.fn(() => () => {})

vi.mock('../../../../hooks/useGameSession', () => ({
  useGameSession: () => ({
    session: null,
    loading: false,
    error: null,
    createRoom: mockCreateRoom,
    joinRoom: mockJoinRoom,
    subscribeToGame: mockSubscribeToGame,
    updateGameState: vi.fn(),
    leaveRoom: vi.fn(),
  }),
}))

// ─── Mock useChessStore ───────────────────────────────────────────────────────

vi.mock('../../../../lib/chess/store', () => {
  const storeState = {
    setMultiplayerInfo: vi.fn(),
    applyRemoteMove: vi.fn(),
    multiplayer: null,
    mode: 'passAndPlay',
    phase: 'home',
    moveHistory: [],
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    turn: 'w',
    result: null,
  }
  const useChessStore = (selector?: unknown) => {
    if (typeof selector === 'function') {
      return (selector as (s: typeof storeState) => unknown)(storeState)
    }
    return storeState
  }
  useChessStore.getState = () => storeState
  return { useChessStore }
})

// ─── Mock useAuthStore ────────────────────────────────────────────────────────
vi.mock('../../../../store/auth', () => ({
  useAuthStore: () => ({
    user: { id: 'test-user-id' },
    profile: { display_name: 'Test User' },
  }),
}))

// ─── Mock supabase ────────────────────────────────────────────────────────────
vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockResolvedValue({}),
      send: vi.fn().mockResolvedValue({}),
    })),
    removeChannel: vi.fn(),
  },
}))

// ─── generateRoomCode unit tests ──────────────────────────────────────────────
describe('generateRoomCode', () => {
  const VALID_CHARS = new Set('ABCDEFGHJKMNPQRSTUVWXYZ23456789')

  it('generates a code of length 6 by default', () => {
    const code = generateRoomCode()
    expect(code).toHaveLength(6)
  })

  it('generates a code of length 5 when requested', () => {
    const code = generateRoomCode(5)
    expect(code).toHaveLength(5)
  })

  it('only uses characters from the allowed charset', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode()
      for (const ch of code) {
        expect(VALID_CHARS.has(ch)).toBe(true)
      }
    }
  })

  it('produces different codes across calls (probabilistic)', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateRoomCode()))
    expect(codes.size).toBeGreaterThan(1)
  })
})

// ─── MultiplayerLobby component tests ────────────────────────────────────────
describe('MultiplayerLobby', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Create Room button and Join Room input on initial view', () => {
    render(<MultiplayerLobby />)
    expect(screen.getByRole('button', { name: /create room/i })).toBeTruthy()
    expect(screen.getByRole('textbox', { name: /room code input/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /join room/i })).toBeTruthy()
  })

  it('calls createRoom with "chess" when Create Room is clicked', async () => {
    mockCreateRoom.mockResolvedValue('ABC123')
    render(<MultiplayerLobby />)

    fireEvent.click(screen.getByRole('button', { name: /create room/i }))

    await waitFor(() => {
      expect(mockCreateRoom).toHaveBeenCalledWith('chess')
    })
  })

  it('shows waiting state after room is created', async () => {
    mockCreateRoom.mockResolvedValue('XYZ789')
    render(<MultiplayerLobby />)

    fireEvent.click(screen.getByRole('button', { name: /create room/i }))

    await waitFor(() => {
      expect(screen.getByText(/waiting for opponent/i)).toBeTruthy()
    })
  })

  it('shows Cancel button in waiting state', async () => {
    mockCreateRoom.mockResolvedValue('XYZ789')
    render(<MultiplayerLobby />)

    fireEvent.click(screen.getByRole('button', { name: /create room/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy()
    })
  })

  it('returns to menu when Cancel is clicked from waiting state', async () => {
    mockCreateRoom.mockResolvedValue('XYZ789')
    render(<MultiplayerLobby />)

    fireEvent.click(screen.getByRole('button', { name: /create room/i }))
    await waitFor(() => screen.getByText(/waiting for opponent/i))

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.getByRole('button', { name: /create room/i })).toBeTruthy()
  })

  it('calls joinRoom with uppercased input when Join Room is clicked', async () => {
    mockJoinRoom.mockResolvedValue(undefined)
    render(<MultiplayerLobby />)

    const input = screen.getByRole('textbox', { name: /room code input/i })
    fireEvent.change(input, { target: { value: 'abc123' } })
    fireEvent.click(screen.getByRole('button', { name: /join room/i }))

    await waitFor(() => {
      expect(mockJoinRoom).toHaveBeenCalledWith('ABC123')
    })
  })

  it('Join Room button is disabled when input is whitespace only', () => {
    render(<MultiplayerLobby />)

    const input = screen.getByRole('textbox', { name: /room code input/i })
    fireEvent.change(input, { target: { value: '   ' } })

    const joinBtn = screen.getByRole('button', { name: /join room/i })
    expect((joinBtn as HTMLButtonElement).disabled).toBe(true)
  })

  it('Join Room button is disabled when input is empty', () => {
    render(<MultiplayerLobby />)
    const joinBtn = screen.getByRole('button', { name: /join room/i })
    expect((joinBtn as HTMLButtonElement).disabled).toBe(true)
  })

  it('displays room code display area in waiting state', async () => {
    mockCreateRoom.mockResolvedValue('ABCDEF')
    render(<MultiplayerLobby />)

    fireEvent.click(screen.getByRole('button', { name: /create room/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/room code display/i)).toBeTruthy()
    })
  })

  // ── Quick Play (Task 12.1) ──────────────────────────────────────────────────
  it('renders Quick Play button on initial view', () => {
    render(<MultiplayerLobby />)
    expect(screen.getByRole('button', { name: /quick play/i })).toBeTruthy()
  })

  it('shows "Finding opponent..." state after Quick Play is clicked', async () => {
    render(<MultiplayerLobby />)
    fireEvent.click(screen.getByRole('button', { name: /quick play/i }))
    await waitFor(() => {
      expect(screen.getByText(/finding opponent/i)).toBeTruthy()
    })
  })

  it('shows Cancel button in matchmaking state', async () => {
    render(<MultiplayerLobby />)
    fireEvent.click(screen.getByRole('button', { name: /quick play/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy()
    })
  })

  it('returns to menu when Cancel is clicked from matchmaking state', async () => {
    render(<MultiplayerLobby />)
    fireEvent.click(screen.getByRole('button', { name: /quick play/i }))
    await waitFor(() => screen.getByText(/finding opponent/i))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /quick play/i })).toBeTruthy()
    })
  })

  // ── Matchmaking timeout (Task 12.4) ────────────────────────────────────────
  it('shows "No opponent found" message after timeout', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<MultiplayerLobby />)
    fireEvent.click(screen.getByRole('button', { name: /quick play/i }))
    await waitFor(() => screen.getByText(/finding opponent/i))

    // Advance past the 60-second timeout
    await vi.advanceTimersByTimeAsync(61_000)

    await waitFor(() => {
      expect(screen.getByText(/no opponent found/i)).toBeTruthy()
    })
    vi.useRealTimers()
  }, 15_000)

  it('shows "Try Again" button after matchmaking timeout', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<MultiplayerLobby />)
    fireEvent.click(screen.getByRole('button', { name: /quick play/i }))
    await waitFor(() => screen.getByText(/finding opponent/i))

    await vi.advanceTimersByTimeAsync(61_000)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy()
    })
    vi.useRealTimers()
  }, 15_000)
})
