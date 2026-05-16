/**
 * Metadata for placement preview cards
 */
export interface PlacementMetadata {
  company: string
  role: string
  package?: string
  year: number
}

/**
 * Metadata for confession preview cards
 */
export interface ConfessionMetadata {
  upvotes: number
  comments: number
  timestamp: string
}

/**
 * Metadata for note/PYQ preview cards
 */
export interface NoteMetadata {
  subject: string
  semester: number
  type: 'notes' | 'pyq'
}

/**
 * Metadata for mentor preview cards
 */
export interface MentorMetadata {
  expertise: string[]
  company?: string
  availability: string
}

/**
 * Preview card interface for the explore feed
 * Represents a single content card that can be a placement, confession, note, or mentor entry
 */
export interface PreviewCard {
  id: string
  type: 'placement' | 'confession' | 'note' | 'mentor'
  title: string
  subtitle?: string
  content: string
  locked: boolean
  metadata?: PlacementMetadata | ConfessionMetadata | NoteMetadata | MentorMetadata
}
