import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { ReactionBar } from '../ReactionBar'

// ─── Mock supabase ────────────────────────────────────────────────────────────
// Use vi.hoisted so variables are available when vi.mock factory runs
const { mockSend, mockSubscribe, mockChannel, mockRemoveChannel, getBroadcastHandler } =
  vi.hoisted(() => {
    let _broadcastHandler: ((event: { payload: unknown }) => void) | null = null

    const mockSend = vi.fn().mockResolvedValue({})
    const mockSubscribe = vi.fn()
    const mockOn = vi.fn().mockImplementation(
      (_type: string, _filter: unknown, handler: (event: { payload: unknown }) => void) => {
        _broadcastHandler = handler
        return channelObj
      }
    )
    const channelObj = { on: mockOn, subscribe: mockSubscribe, send: mockSend }
    mockSubscribe.mockReturnValue(channelObj)

    const mockChannel = vi.fn().mockReturnValue(channelObj)
    const mockRemoveChannel = vi.fn()
    const getBroadcastHandler = () => _broadcastHandler

    return { mockSend, mockSubscribe, mockOn, mockChannel, mockRemoveChannel, getBroadcastHandler }
  })

vi.mock('../../../../lib/supabase', () => ({
  supabase: {
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}))

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('ReactionBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders four emoji buttons', () => {
    render(<ReactionBar sessionId="session-1" myUserId="user-1" />)
    expect(screen.getByLabelText('Send 👍 reaction')).toBeTruthy()
    expect(screen.getByLabelText('Send 😂 reaction')).toBeTruthy()
    expect(screen.getByLabelText('Send 😈 reaction')).toBeTruthy()
    expect(screen.getByLabelText('Send 🔥 reaction')).toBeTruthy()
  })

  it('subscribes to the correct channel on mount', () => {
    render(<ReactionBar sessionId="session-abc" myUserId="user-1" />)
    expect(mockChannel).toHaveBeenCalledWith('chess-reactions-session-abc')
    expect(mockSubscribe).toHaveBeenCalled()
  })

  it('broadcasts reaction with correct payload when button is clicked', async () => {
    render(<ReactionBar sessionId="session-1" myUserId="user-42" />)

    fireEvent.click(screen.getByLabelText('Send 👍 reaction'))

    await waitFor(() => {
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'broadcast',
          event: 'reaction',
          payload: expect.objectContaining({
            fromPlayerId: 'user-42',
            emoji: '👍',
          }),
        })
      )
    })
  })

  it('broadcasts the correct emoji for each button', async () => {
    render(<ReactionBar sessionId="session-1" myUserId="user-1" />)

    for (const emoji of ['👍', '😂', '😈', '🔥']) {
      mockSend.mockClear()
      fireEvent.click(screen.getByLabelText(`Send ${emoji} reaction`))
      await waitFor(() => {
        expect(mockSend).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({ emoji }),
          })
        )
      })
    }
  })

  it('shows floating overlay when opponent sends a reaction', async () => {
    render(<ReactionBar sessionId="session-1" myUserId="user-1" />)

    act(() => {
      getBroadcastHandler()?.({
        payload: { fromPlayerId: 'opponent-id', emoji: '🔥', sentAt: new Date().toISOString() },
      })
    })

    await waitFor(() => {
      expect(screen.getByLabelText('Opponent reacted with 🔥')).toBeTruthy()
    })
  })

  it('does not show overlay for own reactions', async () => {
    render(<ReactionBar sessionId="session-1" myUserId="user-1" />)

    act(() => {
      getBroadcastHandler()?.({
        payload: { fromPlayerId: 'user-1', emoji: '😂', sentAt: new Date().toISOString() },
      })
    })

    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByLabelText('Opponent reacted with 😂')).toBeNull()
  })

  it('overlay has pointer-events: none so it does not block board interaction', async () => {
    render(<ReactionBar sessionId="session-1" myUserId="user-1" />)

    act(() => {
      getBroadcastHandler()?.({
        payload: { fromPlayerId: 'opponent-id', emoji: '👍', sentAt: new Date().toISOString() },
      })
    })

    await waitFor(() => {
      const overlay = screen.getByLabelText('Opponent reacted with 👍')
      expect(overlay.style.pointerEvents).toBe('none')
    })
  })

  it('removes channel on unmount', () => {
    const { unmount } = render(<ReactionBar sessionId="session-1" myUserId="user-1" />)
    unmount()
    expect(mockRemoveChannel).toHaveBeenCalled()
  })

  it('renders the reaction bar toolbar', () => {
    render(<ReactionBar sessionId="session-1" myUserId="user-1" />)
    expect(screen.getByRole('toolbar', { name: /reaction bar/i })).toBeTruthy()
  })
})
