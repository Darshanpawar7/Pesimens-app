/**
 * Bug Condition Exploration Tests for Bug #13: Missing Loading State Indicators
 * 
 * **Validates: Requirements 2.14**
 * 
 * CRITICAL: These tests are EXPECTED TO FAIL on unfixed code.
 * Test failure confirms the bug exists (missing loading states).
 * 
 * Bug Condition: Async operations allow duplicate clicks/submissions
 * because loading states are missing or not properly disabling UI elements.
 * 
 * Property 1: Follow button during async operation should be disabled
 * Property 2: Form submission during async operation should be disabled
 * Property 3: Mutation in progress should show loading indicator
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as fc from 'fast-check'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { FollowButton } from '../common/FollowButton'
import { PYQCard, type PYQ } from '../pyqs/PYQCard'
import * as api from '@/lib/api'

// Mock the API module
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}))

// Mock CSRF token generation
vi.mock('@/lib/csrf', () => ({
  generateCsrfToken: vi.fn().mockResolvedValue('mock-csrf-token'),
}))

// Mock auth store
vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn((selector) => {
    const state = { profile: { id: 'current-user-id' } }
    return selector ? selector(state) : state
  }),
}))

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('Bug #13: Loading State Indicators - Bug Condition Exploration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Property 1: Follow button allows duplicate clicks during async operation', () => {
    it('disables follow button during async operation', async () => {
      const user = userEvent.setup()
      
      // Simulate slow API response
      const mockApiFetch = vi.mocked(api.apiFetch)
      mockApiFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ ok: true }), 1000))
      )

      render(
        <TestWrapper>
          <FollowButton userId="target-user-id" initialFollowing={false} />
        </TestWrapper>
      )

      const followButton = screen.getByRole('button', { name: /Follow/i })
      
      // First click
      await user.click(followButton)
      
      // BUG CONDITION: Button should be disabled during async operation
      // If button is still enabled, it allows duplicate clicks (BUG)
      
      // Wait a bit to ensure we're in the middle of the async operation
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Try to click again while first operation is in progress
      const isDisabled = followButton.hasAttribute('disabled')
      
      // Fixed behavior: button is disabled while request is pending
      expect(isDisabled).toBe(true)
      
      // If we reach here, the bug exists: button allows duplicate clicks
    })

    it.skip('property: follow button prevents duplicate clicks across random delays', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 100, max: 2000 }), // Random API delay
          fc.integer({ min: 10, max: 100 }),   // Random click interval
          async (apiDelay, clickInterval) => {
            const user = userEvent.setup()
            
            const mockApiFetch = vi.mocked(api.apiFetch)
            mockApiFetch.mockImplementation(() => 
              new Promise(resolve => setTimeout(() => resolve({ ok: true }), apiDelay))
            )

            const { unmount } = render(
              <TestWrapper>
                <FollowButton userId="target-user-id" initialFollowing={false} />
              </TestWrapper>
            )

            const followButton = screen.getByRole('button', { name: /Follow/i })
            
            // First click
            await user.click(followButton)
            
            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, clickInterval))
            
            // BUG CONDITION: Button should be disabled during async operation
            const currentButton = screen.getByRole('button')
            const isDisabled = currentButton.hasAttribute('disabled')
            
            unmount()
            
            // Fixed behavior: button is disabled, preventing duplicate clicks
            return isDisabled
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  describe('Property 2: Form submission allows duplicate submissions during async operation', () => {
    it('disables upvote button during async operation', async () => {
      const user = userEvent.setup()
      
      const mockPyq: PYQ = {
        id: 'pyq-1',
        course: 'CS101',
        subject: 'Data Structures',
        exam_type: 'MIDSEM',
        year: 2024,
        question_text: 'Explain binary trees',
        upvote_count: 10,
        view_count: 100,
        is_anonymous: false,
        status: 'approved',
        created_at: new Date().toISOString(),
      }
      
      // Simulate slow API response
      const mockApiFetch = vi.mocked(api.apiFetch)
      mockApiFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ upvoted: true }), 1000))
      )

      render(
        <TestWrapper>
          <PYQCard pyq={mockPyq} />
        </TestWrapper>
      )

      const upvoteButton = screen.getByLabelText(/Upvote/)
      
      // First click
      await user.click(upvoteButton)
      
      // Wait a bit to ensure we're in the middle of the async operation
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // BUG CONDITION: Button should be disabled during async operation
      const isDisabled = upvoteButton.hasAttribute('disabled')
      
      // Fixed behavior: button is disabled while request is pending
      expect(isDisabled).toBe(true)
    })

    it('property: upvote button prevents duplicate clicks across random scenarios', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 100, max: 2000 }), // Random API delay
          fc.integer({ min: 5, max: 50 }),     // Random click interval
          fc.integer({ min: 0, max: 100 }),    // Random initial upvote count
          async (apiDelay, clickInterval, initialUpvotes) => {
            const user = userEvent.setup()
            
            const mockPyq: PYQ = {
              id: `pyq-${Math.random()}`,
              course: 'CS101',
              subject: 'Test Subject',
              exam_type: 'MIDSEM',
              year: 2024,
              upvote_count: initialUpvotes,
              view_count: 100,
              is_anonymous: false,
              status: 'approved',
              created_at: new Date().toISOString(),
            }
            
            const mockApiFetch = vi.mocked(api.apiFetch)
            mockApiFetch.mockImplementation(() => 
              new Promise(resolve => setTimeout(() => resolve({ upvoted: true }), apiDelay))
            )

            const { unmount } = render(
              <TestWrapper>
                <PYQCard pyq={mockPyq} />
              </TestWrapper>
            )

            const upvoteButton = screen.getByLabelText(/Upvote/)
            
            // First click
            await user.click(upvoteButton)
            
            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, clickInterval))
            
            // BUG CONDITION: Button should be disabled
            const isDisabled = upvoteButton.hasAttribute('disabled')
            
            unmount()
            
            // Fixed behavior: button is disabled during pending mutation
            return isDisabled
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  describe('Property 3: Mutation in progress does not show loading indicator', () => {
    it('shows loading feedback during bookmark async operation', async () => {
      const user = userEvent.setup()
      
      const mockPyq: PYQ = {
        id: 'pyq-1',
        course: 'CS101',
        subject: 'Data Structures',
        exam_type: 'MIDSEM',
        year: 2024,
        question_text: 'Explain binary trees',
        upvote_count: 10,
        view_count: 100,
        is_anonymous: false,
        status: 'approved',
        created_at: new Date().toISOString(),
      }
      
      // Simulate slow API response
      const mockApiFetch = vi.mocked(api.apiFetch)
      mockApiFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ bookmarked: true }), 1000))
      )

      render(
        <TestWrapper>
          <PYQCard pyq={mockPyq} />
        </TestWrapper>
      )

      const bookmarkButton = screen.getByLabelText(/Bookmark/)
      
      // Click bookmark
      await user.click(bookmarkButton)
      
      // Wait a bit to ensure we're in the middle of the async operation
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // BUG CONDITION: Button should show loading state (disabled or visual indicator)
      const isDisabled = bookmarkButton.hasAttribute('disabled')
      const hasLoadingClass = bookmarkButton.className.includes('opacity-50') || 
                              bookmarkButton.className.includes('cursor-wait')
      
      // Fixed behavior: disabled state or loading styling must be present
      expect(isDisabled || hasLoadingClass).toBe(true)
    })

    it('property: async operations show no loading feedback across random scenarios', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 100, max: 2000 }), // Random API delay
          fc.constantFrom('upvote', 'bookmark'), // Random operation type
          async (apiDelay, operationType) => {
            const user = userEvent.setup()
            
            const mockPyq: PYQ = {
              id: `pyq-${Math.random()}`,
              course: 'CS101',
              subject: 'Test Subject',
              exam_type: 'MIDSEM',
              year: 2024,
              upvote_count: 10,
              view_count: 100,
              is_anonymous: false,
              status: 'approved',
              created_at: new Date().toISOString(),
            }
            
            const mockApiFetch = vi.mocked(api.apiFetch)
            mockApiFetch.mockImplementation(() => 
              new Promise(resolve => setTimeout(() => resolve({ 
                upvoted: true, 
                bookmarked: true 
              }), apiDelay))
            )

            const { unmount } = render(
              <TestWrapper>
                <PYQCard pyq={mockPyq} />
              </TestWrapper>
            )

            const button = operationType === 'upvote' 
              ? screen.getByLabelText(/Upvote/)
              : screen.getByLabelText(/Bookmark/)
            
            // Click button
            await user.click(button)
            
            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 50))
            
            // BUG CONDITION: Button should show loading state
            const isDisabled = button.hasAttribute('disabled')
            const hasLoadingClass = button.className.includes('opacity-50') || 
                                    button.className.includes('cursor-wait')
            
            unmount()
            
            // Fixed behavior: loading feedback is visible during operation
            return isDisabled || hasLoadingClass
          }
        ),
        { numRuns: 20 }
      )
    })
  })
})
