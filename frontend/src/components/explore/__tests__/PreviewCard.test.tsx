/**
 * Unit tests for PreviewCard component (Task 4.2)
 * 
 * Validates: Requirements 5.6, 8.1, 8.2, 8.3
 * 
 * Tests:
 *   - Component renders with correct dark theme background
 *   - Title, subtitle, and content are displayed
 *   - Metadata is rendered based on card type
 *   - Comment button is present for all card types
 *   - Download button is present only for Notes cards
 *   - Booking button is present only for Mentor cards
 *   - Action buttons call openLoginSheet when clicked
 *   - Locked overlay is rendered for locked cards
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PreviewCard } from '../PreviewCard'
import { useExploreUIStore } from '@/store/exploreUI'
import {
  PreviewCard as PreviewCardType,
  PlacementMetadata,
  ConfessionMetadata,
  NoteMetadata,
  MentorMetadata,
} from '@/types/explore'

// Mock the explore UI store
vi.mock('@/store/exploreUI', () => ({
  useExploreUIStore: vi.fn(),
}))

const mockUseExploreUIStore = vi.mocked(useExploreUIStore)

describe('PreviewCard', () => {
  const mockOpenLoginSheet = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseExploreUIStore.mockImplementation((selector: any) => {
      const state = {
        openLoginSheet: mockOpenLoginSheet,
      }
      return selector(state)
    })
  })

  describe('Placement cards', () => {
    const placementCard: PreviewCardType = {
      id: '1',
      type: 'placement',
      title: 'Software Engineer at Google',
      subtitle: 'Full-time position',
      content: 'Great opportunity for new grads',
      locked: false,
      metadata: {
        company: 'Google',
        role: 'SDE',
        package: '50 LPA',
        year: 2024,
      } as PlacementMetadata,
    }

    it('renders placement card with correct content', () => {
      render(<PreviewCard card={placementCard} />)
      
      expect(screen.getByText('Software Engineer at Google')).toBeTruthy()
      expect(screen.getByText('Full-time position')).toBeTruthy()
      expect(screen.getByText('Great opportunity for new grads')).toBeTruthy()
    })

    it('renders placement metadata', () => {
      render(<PreviewCard card={placementCard} />)
      
      expect(screen.getByText('Google')).toBeTruthy()
      expect(screen.getByText('SDE')).toBeTruthy()
      expect(screen.getByText('50 LPA')).toBeTruthy()
      expect(screen.getByText('2024')).toBeTruthy()
    })

    it('renders comment button only', () => {
      render(<PreviewCard card={placementCard} />)
      
      expect(screen.getByText('Comment')).toBeTruthy()
      expect(screen.queryByText('Download')).toBeNull()
      expect(screen.queryByText('Book Session')).toBeNull()
    })
  })

  describe('Confession cards', () => {
    const confessionCard: PreviewCardType = {
      id: '2',
      type: 'confession',
      title: 'Anonymous Confession',
      content: 'I love this campus',
      locked: false,
      metadata: {
        upvotes: 42,
        comments: 15,
        timestamp: '2h ago',
      } as ConfessionMetadata,
    }

    it('renders confession metadata', () => {
      render(<PreviewCard card={confessionCard} />)
      
      expect(screen.getByText('42 upvotes')).toBeTruthy()
      expect(screen.getByText('15 comments')).toBeTruthy()
      expect(screen.getByText('2h ago')).toBeTruthy()
    })

    it('renders comment button only', () => {
      render(<PreviewCard card={confessionCard} />)
      
      expect(screen.getByText('Comment')).toBeTruthy()
      expect(screen.queryByText('Download')).toBeNull()
      expect(screen.queryByText('Book Session')).toBeNull()
    })
  })

  describe('Note cards', () => {
    const noteCard: PreviewCardType = {
      id: '3',
      type: 'note',
      title: 'Data Structures Notes',
      subtitle: 'Complete semester notes',
      content: 'Comprehensive notes covering all topics',
      locked: false,
      metadata: {
        subject: 'Data Structures',
        semester: 3,
        type: 'notes',
      } as NoteMetadata,
    }

    it('renders note metadata', () => {
      render(<PreviewCard card={noteCard} />)
      
      expect(screen.getByText('Data Structures')).toBeTruthy()
      expect(screen.getByText('Semester 3')).toBeTruthy()
      expect(screen.getByText('notes')).toBeTruthy()
    })

    it('renders comment and download buttons', () => {
      render(<PreviewCard card={noteCard} />)
      
      expect(screen.getByText('Comment')).toBeTruthy()
      expect(screen.getByText('Download')).toBeTruthy()
      expect(screen.queryByText('Book Session')).toBeNull()
    })

    it('calls openLoginSheet when download button is clicked', () => {
      render(<PreviewCard card={noteCard} />)
      
      const downloadButton = screen.getByText('Download')
      fireEvent.click(downloadButton)
      
      expect(mockOpenLoginSheet).toHaveBeenCalledTimes(1)
    })
  })

  describe('Mentor cards', () => {
    const mentorCard: PreviewCardType = {
      id: '4',
      type: 'mentor',
      title: 'John Doe',
      subtitle: 'Senior Software Engineer',
      content: 'Available for mentorship sessions',
      locked: false,
      metadata: {
        expertise: ['React', 'Node.js', 'AWS'],
        company: 'Amazon',
        availability: 'Weekends',
      } as MentorMetadata,
    }

    it('renders mentor metadata', () => {
      render(<PreviewCard card={mentorCard} />)
      
      expect(screen.getByText('React')).toBeTruthy()
      expect(screen.getByText('Node.js')).toBeTruthy()
      expect(screen.getByText('AWS')).toBeTruthy()
      expect(screen.getByText(/Amazon/)).toBeTruthy()
      expect(screen.getByText(/Weekends/)).toBeTruthy()
    })

    it('renders comment and booking buttons', () => {
      render(<PreviewCard card={mentorCard} />)
      
      expect(screen.getByText('Comment')).toBeTruthy()
      expect(screen.getByText('Book Session')).toBeTruthy()
      expect(screen.queryByText('Download')).toBeNull()
    })

    it('calls openLoginSheet when booking button is clicked', () => {
      render(<PreviewCard card={mentorCard} />)
      
      const bookButton = screen.getByText('Book Session')
      fireEvent.click(bookButton)
      
      expect(mockOpenLoginSheet).toHaveBeenCalledTimes(1)
    })
  })

  describe('Action buttons', () => {
    const simpleCard: PreviewCardType = {
      id: '5',
      type: 'placement',
      title: 'Test Card',
      content: 'Test content',
      locked: false,
    }

    it('calls openLoginSheet when comment button is clicked', () => {
      render(<PreviewCard card={simpleCard} />)
      
      const commentButton = screen.getByText('Comment')
      fireEvent.click(commentButton)
      
      expect(mockOpenLoginSheet).toHaveBeenCalledTimes(1)
    })
  })

  describe('Dark theme styling', () => {
    const simpleCard: PreviewCardType = {
      id: '6',
      type: 'placement',
      title: 'Test Card',
      content: 'Test content',
      locked: false,
    }

    it('applies dark theme background color', () => {
      const { container } = render(<PreviewCard card={simpleCard} />)
      
      const card = container.firstChild as HTMLElement
      expect(card.className).toContain('bg-[#1a1a1a]')
    })
  })

  describe('Locked cards', () => {
    const lockedCard: PreviewCardType = {
      id: '7',
      type: 'note',
      title: 'Locked Note',
      content: 'This content is locked',
      locked: true,
    }

    it('renders blur overlay for locked cards', () => {
      render(<PreviewCard card={lockedCard} />)
      
      expect(screen.getByText('Sign in to unlock')).toBeTruthy()
    })

    it('calls openLoginSheet when locked overlay is clicked', () => {
      render(<PreviewCard card={lockedCard} />)
      
      const overlay = screen.getByText('Sign in to unlock').parentElement
      if (overlay) {
        fireEvent.click(overlay)
        expect(mockOpenLoginSheet).toHaveBeenCalledTimes(1)
      }
    })

    it('has proper ARIA attributes for accessibility', () => {
      render(<PreviewCard card={lockedCard} />)
      
      const overlay = screen.getByRole('button', { name: 'Sign in to unlock this content' })
      expect(overlay).toBeTruthy()
      expect(overlay.getAttribute('tabIndex')).toBe('0')
    })

    it('calls openLoginSheet when Enter key is pressed on locked overlay', () => {
      render(<PreviewCard card={lockedCard} />)
      
      const overlay = screen.getByRole('button', { name: 'Sign in to unlock this content' })
      fireEvent.keyDown(overlay, { key: 'Enter' })
      
      expect(mockOpenLoginSheet).toHaveBeenCalledTimes(1)
    })

    it('calls openLoginSheet when Space key is pressed on locked overlay', () => {
      render(<PreviewCard card={lockedCard} />)
      
      const overlay = screen.getByRole('button', { name: 'Sign in to unlock this content' })
      fireEvent.keyDown(overlay, { key: ' ' })
      
      expect(mockOpenLoginSheet).toHaveBeenCalledTimes(1)
    })

    it('does not call openLoginSheet for other keys', () => {
      render(<PreviewCard card={lockedCard} />)
      
      const overlay = screen.getByRole('button', { name: 'Sign in to unlock this content' })
      fireEvent.keyDown(overlay, { key: 'a' })
      
      expect(mockOpenLoginSheet).not.toHaveBeenCalled()
    })

    it('button has minimum touch target size', () => {
      render(<PreviewCard card={lockedCard} />)
      
      const button = screen.getByText('Sign in to unlock')
      expect(button.className).toContain('min-h-[44px]')
      expect(button.className).toContain('min-w-[44px]')
    })
  })
})
