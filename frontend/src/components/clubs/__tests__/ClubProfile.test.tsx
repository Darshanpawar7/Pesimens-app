/**
 * Unit tests for ClubProfile — cover image alt text accessibility
 *
 * Validates that the cover image `alt` attribute uses the centralized
 * getClubImageAlt helper with proper fallback behaviour:
 *   - Explicit cover_image_alt when provided
 *   - "{club.name} cover image" as the default
 *   - Gradient placeholder rendered when cover_image_url is absent
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClubProfile } from '../ClubProfile'
import type { Club } from '../../../hooks/useClubs'

// ── Mocks ────────────────────────────────────────────────────────────────

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

vi.mock('../../ui/avatar', () => ({
  UserAvatar: ({ name }: any) => <div data-testid="avatar">{name}</div>,
}))

vi.mock('../../ui/tabs', () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children }: any) => <button>{children}</button>,
  TabsContent: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('../ClubMemberList', () => ({
  ClubMemberList: () => <div data-testid="member-list" />,
}))

vi.mock('../../events/EventCard', () => ({
  EventCard: () => <div data-testid="event-card" />,
}))

// ── Helpers ──────────────────────────────────────────────────────────────

function makeClub(overrides: Partial<Club> = {}): Club {
  return {
    id: 'club-1',
    name: 'Drama Club',
    category: 'cultural',
    member_count: 25,
    is_approved: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user_membership: null,
    ...overrides,
  }
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('ClubProfile — cover image alt text', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders alt text derived from club name when cover image exists', () => {
    const club = makeClub({
      cover_image_url: 'https://example.com/drama-cover.jpg',
    })

    render(<ClubProfile club={club} />)

    const img = screen.getByRole('img', { name: 'Drama Club cover image' })
    expect(img).toBeTruthy()
    expect(img.getAttribute('alt')).toBe('Drama Club cover image')
  })

  it('uses explicit cover_image_alt when provided', () => {
    const club = makeClub({
      cover_image_url: 'https://example.com/drama-cover.jpg',
      cover_image_alt: 'Cast on stage during the spring production',
    })

    render(<ClubProfile club={club} />)

    const img = screen.getByRole('img', { name: 'Cast on stage during the spring production' })
    expect(img).toBeTruthy()
    expect(img.getAttribute('alt')).toBe('Cast on stage during the spring production')
  })

  it('renders gradient placeholder when cover_image_url is absent', () => {
    const club = makeClub({ cover_image_url: undefined })

    const { container } = render(<ClubProfile club={club} />)

    // No <img> for cover
    const images = screen.queryAllByRole('img')
    const coverImg = images.find(img => img.getAttribute('alt')?.includes('cover image'))
    expect(coverImg).toBeUndefined()

    // Gradient div should be rendered instead
    const gradient = container.querySelector('.bg-gradient-to-br')
    expect(gradient).toBeTruthy()
  })
})
