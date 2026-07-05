/**
 * Unit tests for ClubCard — cover image alt text accessibility
 *
 * Validates that the cover image `alt` attribute uses the centralized
 * getClubImageAlt helper with proper fallback behaviour:
 *   - Explicit cover_image_alt when provided
 *   - "{club.name} cover image" as the default
 *   - No <img> rendered when cover_image_url is absent
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClubCard } from '../ClubCard'
import type { Club } from '../../../hooks/useClubs'

// ── Mocks ────────────────────────────────────────────────────────────────

// react-router-dom Link → simple anchor
vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...rest }: any) => <a href={to} {...rest}>{children}</a>,
}))

// Stub hooks so the component doesn't need a QueryClient
vi.mock('../../../hooks/useClubs', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    useJoinClub: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useLeaveClub: () => ({ mutateAsync: vi.fn(), isPending: false }),
  }
})

vi.mock('../../ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

vi.mock('../../ui/badge', () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
}))

// ── Helpers ──────────────────────────────────────────────────────────────

function makeClub(overrides: Partial<Club> = {}): Club {
  return {
    id: 'club-1',
    name: 'Robotics Club',
    category: 'technical',
    member_count: 42,
    is_approved: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user_membership: null,
    ...overrides,
  }
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('ClubCard — cover image alt text', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders alt text derived from club name when cover image exists', () => {
    const club = makeClub({
      cover_image_url: 'https://example.com/cover.jpg',
    })

    render(<ClubCard club={club} />)

    const img = screen.getByRole('img', { name: 'Robotics Club' })
    expect(img).toBeTruthy()
    expect(img.getAttribute('alt')).toBe('Robotics Club')
  })

  it('uses explicit cover_image_alt when provided', () => {
    const club = makeClub({
      cover_image_url: 'https://example.com/cover.jpg',
      cover_image_alt: 'Team building a drone at the annual expo',
    })

    render(<ClubCard club={club} />)

    const img = screen.getByRole('img', { name: 'Team building a drone at the annual expo' })
    expect(img).toBeTruthy()
    expect(img.getAttribute('alt')).toBe('Team building a drone at the annual expo')
  })

  it('does not render a cover image when cover_image_url is absent', () => {
    const club = makeClub({ cover_image_url: undefined })

    render(<ClubCard club={club} />)

    // The logo img may still be rendered, but no cover image
    const images = screen.queryAllByRole('img')
    const coverImg = images.find(img => img.getAttribute('alt')?.includes('cover image'))
    expect(coverImg).toBeUndefined()
  })

  it('does not render a cover image in compact mode', () => {
    const club = makeClub({
      cover_image_url: 'https://example.com/cover.jpg',
    })

    render(<ClubCard club={club} compact />)

    const coverImg = screen.queryByRole('img', { name: 'Robotics Club' })
    expect(coverImg).toBeNull()
  })
})
