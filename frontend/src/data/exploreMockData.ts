import type { PreviewCard } from '../types/explore'

/**
 * Mock data for placement preview cards
 * Requirements: 5.1 - Display 2-3 Placements Preview_Cards
 */
export const placementCards: PreviewCard[] = []

/**
 * Mock data for confession preview cards
 * Requirements: 5.2 - Display 2-3 Confessions Preview_Cards
 */
export const confessionCards: PreviewCard[] = []

/**
 * Mock data for notes/PYQ preview cards
 * Requirements: 5.3 - Display 1-2 Notes/PYQs Preview_Cards (first unlocked, rest locked)
 */
export const noteCards: PreviewCard[] = []

/**
 * Mock data for mentor preview cards
 * Requirements: 5.4 - Display 1-2 Mentors Preview_Cards (all locked)
 */
export const mentorCards: PreviewCard[] = []

/**
 * Combined mock data for the explore feed
 * Exports all preview cards organized by category
 */
export const exploreMockData = {
  placements: placementCards,
  confessions: confessionCards,
  notes: noteCards,
  mentors: mentorCards,
}
