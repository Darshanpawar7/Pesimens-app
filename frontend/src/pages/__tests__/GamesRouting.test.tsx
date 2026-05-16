/**
 * Integration test for routing
 * Validates: Requirements 1.1, 4.1, 4.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import GamesPage from '../GamesPage'
import LudoPage from '../LudoPage'

// ── Mock auth store ───────────────────────────────────────────────────────────
const mockAuthStore: {
  isAuthenticated: boolean
  profile: { display_name: string; email: string; avatar_url: null; karma: number } | null
} = {
  isAuthenticated: true,
  profile: {
    display_name: 'Test User',
    email: 'test@example.com',
    avatar_url: null,
    karma: 100,
  },
}

vi.mock('@/store/auth', () => ({
  useAuthStore: () => mockAuthStore,
}))

// ── Mock Zustand ludo store ───────────────────────────────────────────────────
vi.mock('@/lib/ludo/store', () => ({
  useLudoStore: () => ({
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
    phase: 'setup',
    playerCount: 4,
    loadGameData: vi.fn().mockResolvedValue(undefined),
    startGame: vi.fn(),
    rollDice: vi.fn(),
    clickCoin: vi.fn(),
    resetGame: vi.fn(),
    spawnCoin: vi.fn(),
    performMove: vi.fn(),
    checkWinner: vi.fn(),
  }),
}))

// ── Mock child components ─────────────────────────────────────────────────────
vi.mock('@/components/games/ludo/LudoBoardNew', () => ({
  LudoBoardNew: () => <div data-testid="ludo-board-new" />,
  LudoGameStatusBar: () => <div data-testid="ludo-status" />,
}))

vi.mock('@/components/games/ludo/LudoPlayerNew', () => ({
  LudoPlayerNew: () => <div data-testid="ludo-player" />,
}))

// ── ProtectedRoute mock ───────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!mockAuthStore.isAuthenticated) return <div>Login Page</div>
  return <>{children}</>
}

function renderWithRoutes(initialRoute: string) {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/games"
          element={<ProtectedRoute><GamesPage /></ProtectedRoute>}
        />
        <Route
          path="/games/ludo"
          element={<ProtectedRoute><LudoPage /></ProtectedRoute>}
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('Games Routing Integration', () => {
  beforeEach(() => {
    mockAuthStore.isAuthenticated = true
    mockAuthStore.profile = {
      display_name: 'Test User',
      email: 'test@example.com',
      avatar_url: null,
      karma: 100,
    }
  })

  it('/games route renders GamesPage when authenticated', () => {
    renderWithRoutes('/games')
    expect(screen.getByText('Games')).toBeTruthy()
    expect(screen.getByText('Play games with your friends')).toBeTruthy()
    expect(screen.getByText('Ludo')).toBeTruthy()
  })

  it('/games/ludo route renders LudoPage when authenticated', () => {
    renderWithRoutes('/games/ludo')
    expect(screen.getByText('Ludo')).toBeTruthy()
    expect(screen.getByText('Select number of players')).toBeTruthy()
    expect(screen.getByText('Start Game')).toBeTruthy()
  })

  it('/games route redirects to login when not authenticated', () => {
    mockAuthStore.isAuthenticated = false
    mockAuthStore.profile = null
    renderWithRoutes('/games')
    expect(screen.getByText('Login Page')).toBeTruthy()
    expect(screen.queryByText('Play games with your friends')).toBeFalsy()
  })

  it('/games/ludo route redirects to login when not authenticated', () => {
    mockAuthStore.isAuthenticated = false
    mockAuthStore.profile = null
    renderWithRoutes('/games/ludo')
    expect(screen.getByText('Login Page')).toBeTruthy()
    expect(screen.queryByText('Select number of players')).toBeFalsy()
  })
})
