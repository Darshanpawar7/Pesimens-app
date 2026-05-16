/**
 * Unit tests for LudoPage (new Zustand-based implementation)
 * Validates: Requirements 1.1, 2.1, 8.1, 10.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LudoPage from '../LudoPage'

// ── Mock the Zustand ludo store ───────────────────────────────────────────────
const mockStore = {
  bases: {},
  cells: {},
  coins: {},
  links: {},
  relationships: [],
  walkways: {},
  currentTurn: 'BASE_3',
  diceRoll: null,
  isDiceRollAllowed: true,
  isDiceRollValid: false,
  winner: null,
  phase: 'setup' as 'setup' | 'playing' | 'finished',
  playerCount: 4 as 2 | 3 | 4,
  loadGameData: vi.fn().mockResolvedValue(undefined),
  startGame: vi.fn(),
  rollDice: vi.fn(),
  clickCoin: vi.fn(),
  resetGame: vi.fn(),
  spawnCoin: vi.fn(),
  performMove: vi.fn(),
  checkWinner: vi.fn(),
}

vi.mock('@/lib/ludo/store', () => ({
  useLudoStore: () => mockStore,
}))

// ── Mock child components ─────────────────────────────────────────────────────
vi.mock('@/components/games/ludo/LudoBoardNew', () => ({
  LudoBoardNew: () => <div data-testid="ludo-board-new" />,
  LudoGameStatusBar: () => <div data-testid="ludo-status" />,
}))

vi.mock('@/components/games/ludo/LudoPlayerNew', () => ({
  LudoPlayerNew: ({ baseID }: { baseID: string }) => (
    <div data-testid={`player-panel-${baseID}`} />
  ),
}))

function renderLudoPage() {
  return render(
    <MemoryRouter>
      <LudoPage />
    </MemoryRouter>
  )
}

describe('LudoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.phase = 'setup'
    mockStore.winner = null
    mockStore.bases = {}
  })

  it('shows setup screen when phase is setup', () => {
    renderLudoPage()
    expect(screen.getByText('Select number of players')).toBeTruthy()
    expect(screen.getByText('Start Game')).toBeTruthy()
  })

  it('calls loadGameData on mount', () => {
    renderLudoPage()
    expect(mockStore.loadGameData).toHaveBeenCalledTimes(1)
  })

  it('calls startGame with selected player count', async () => {
    const user = userEvent.setup()
    renderLudoPage()

    await user.click(screen.getByText('2'))
    await user.click(screen.getByText('Start Game'))

    expect(mockStore.startGame).toHaveBeenCalledWith(2)
  })

  it('shows board when phase is playing', () => {
    mockStore.phase = 'playing'
    renderLudoPage()
    expect(screen.getByTestId('ludo-board-new')).toBeTruthy()
  })

  it('shows winner overlay when winner is set', () => {
    mockStore.phase = 'finished'
    mockStore.winner = 'BASE_3' as any
    mockStore.bases = {
      BASE_3: {
        ID: 'BASE_3' as any,
        color: 'RED' as any,
        coinIDs: [],
        nextTurn: 'BASE_1' as any,
        spawnable: false,
        hasWon: true,
        enabled: true,
      },
    }
    renderLudoPage()
    expect(screen.getByText('Winner!')).toBeTruthy()
    expect(screen.getByText('Red wins!')).toBeTruthy()
  })

  it('calls resetGame when Play Again is clicked', async () => {
    const user = userEvent.setup()
    mockStore.phase = 'finished'
    mockStore.winner = 'BASE_3' as any
    mockStore.bases = {
      BASE_3: {
        ID: 'BASE_3' as any,
        color: 'RED' as any,
        coinIDs: [],
        nextTurn: 'BASE_1' as any,
        spawnable: false,
        hasWon: true,
        enabled: true,
      },
    }
    renderLudoPage()

    await user.click(screen.getByText('Play Again'))
    expect(mockStore.resetGame).toHaveBeenCalledTimes(1)
  })

  it('shows current turn indicator during play', () => {
    mockStore.phase = 'playing'
    mockStore.winner = null
    mockStore.bases = {
      BASE_3: {
        ID: 'BASE_3' as any,
        color: 'RED' as any,
        coinIDs: [],
        nextTurn: 'BASE_1' as any,
        spawnable: false,
        hasWon: false,
        enabled: true,
      },
    }
    renderLudoPage()
    expect(screen.getByText((content) => content.includes('Current turn:') && content.includes('Red'))).toBeTruthy()
  })
})
