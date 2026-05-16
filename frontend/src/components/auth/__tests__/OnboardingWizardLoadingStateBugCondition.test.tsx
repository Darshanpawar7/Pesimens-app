/**
 * Bug Condition Exploration Test for OnboardingWizard Loading State
 * 
 * Property 1: Bug Condition - No Loading State During Save
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * DO NOT attempt to fix the test or the code when it fails
 * 
 * GOAL: Surface counterexamples that demonstrate duplicate requests
 * 
 * Validates: Requirements 1.21
 * 
 * Bug Condition:
 *   1.21: handleNext has no loading state during save, allowing multiple rapid clicks causing duplicate requests
 * 
 * Expected Behavior (after fix):
 *   - When handleNext is called, loading state should be set
 *   - Button should be disabled during save
 *   - Multiple rapid clicks should only send 1 save request
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { OnboardingWizard } from '../OnboardingWizard'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/lib/supabase'
import * as fc from 'fast-check'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// Mock auth store
vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn(),
}))

// Mock react-router-dom navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockUseAuthStore = vi.mocked(useAuthStore)
const mockSupabase = vi.mocked(supabase)

describe('OnboardingWizard - Bug Condition: No Loading State During Save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock authenticated user
    mockUseAuthStore.mockReturnValue({
      user: { id: 'test-user-id', email: 'test@pesu.pes.edu' },
    } as any)
  })

  afterEach(() => {
    cleanup()
  })

  /**
   * Property 1: Bug Condition - Multiple Rapid Clicks Send Duplicate Requests (Bug 1.21)
   * 
   * When user clicks Next rapidly multiple times, the system should only send 1 save request.
   * However, on unfixed code, there's no loading state to prevent duplicate clicks.
   * 
   * EXPECTED OUTCOME ON UNFIXED CODE: Test FAILS
   * - Multiple rapid clicks send multiple save requests
   * - Button is not disabled during save
   * - No loading indicator shown
   */
  it('should only send 1 save request when Next is clicked rapidly 3 times (Bug 1.21)', async () => {
    // Mock supabase update with a delay to simulate network latency
    let updateCallCount = 0
    const mockUpdate = vi.fn().mockImplementation(() => ({
      eq: vi.fn().mockImplementation(() => {
        updateCallCount++
        // Add delay to simulate slow network
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              error: null,
              data: [{ id: 'test-user-id', display_name: 'Test User' }],
            })
          }, 100) // 100ms delay
        })
      }),
    }))
    
    mockSupabase.from = vi.fn().mockReturnValue({
      update: mockUpdate,
    })
    
    render(
      <BrowserRouter>
        <OnboardingWizard />
      </BrowserRouter>
    )
    
    // Fill in name field (Step 1)
    const nameInput = screen.getByPlaceholderText(/Enter your full name/i)
    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    
    // Click Continue button rapidly 3 times
    const continueButton = screen.getByText(/Continue/i)
    fireEvent.click(continueButton)
    fireEvent.click(continueButton)
    fireEvent.click(continueButton)
    
    // Wait for all async operations to complete
    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeTruthy()
    }, { timeout: 3000 })
    
    // EXPECTED BEHAVIOR (after fix): Only 1 update call should be made
    // ACTUAL BEHAVIOR (unfixed code): 3 update calls are made - DUPLICATE REQUESTS
    expect(updateCallCount).toBe(1) // This will FAIL on unfixed code (will be 3)
  })

  /**
   * Property 2: Bug Condition - Button Not Disabled During Save
   * 
   * When save is in progress, the button should be disabled to prevent duplicate clicks.
   * On unfixed code, the button remains enabled during save.
   * 
   * EXPECTED OUTCOME ON UNFIXED CODE: Test FAILS
   * - Button is not disabled during save
   * - User can click multiple times
   */
  it('should disable Continue button during save operation (Bug 1.21)', async () => {
    // Mock supabase update with a delay
    const mockUpdate = vi.fn().mockImplementation(() => ({
      eq: vi.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              error: null,
              data: [{ id: 'test-user-id', display_name: 'Test User' }],
            })
          }, 200) // 200ms delay to check button state during save
        })
      }),
    }))
    
    mockSupabase.from = vi.fn().mockReturnValue({
      update: mockUpdate,
    })
    
    render(
      <BrowserRouter>
        <OnboardingWizard />
      </BrowserRouter>
    )
    
    // Fill in name field
    const nameInput = screen.getByPlaceholderText(/Enter your full name/i)
    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    
    // Click Continue button
    const continueButton = screen.getByText(/Continue/i) as HTMLButtonElement
    fireEvent.click(continueButton)
    
    // Check button state immediately after click (during save)
    // EXPECTED BEHAVIOR (after fix): Button should be disabled
    // ACTUAL BEHAVIOR (unfixed code): Button is NOT disabled
    await waitFor(() => {
      // Button text changes to "Saving..." when disabled
      const buttonAfterClick = screen.getByText(/Saving/i) as HTMLButtonElement
      expect(buttonAfterClick.disabled).toBe(true) // This will FAIL on unfixed code
    }, { timeout: 50 }) // Check very quickly after click
  })

  /**
   * Property 3: Bug Condition - No Loading Indicator Shown
   * 
   * When save is in progress, a loading indicator should be shown to the user.
   * On unfixed code, no loading indicator is displayed.
   * 
   * EXPECTED OUTCOME ON UNFIXED CODE: Test FAILS
   * - No loading text or spinner shown during save
   * - User doesn't know save is in progress
   */
  it('should show loading indicator during save operation (Bug 1.21)', async () => {
    // Mock supabase update with a delay
    const mockUpdate = vi.fn().mockImplementation(() => ({
      eq: vi.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              error: null,
              data: [{ id: 'test-user-id', display_name: 'Test User' }],
            })
          }, 200)
        })
      }),
    }))
    
    mockSupabase.from = vi.fn().mockReturnValue({
      update: mockUpdate,
    })
    
    render(
      <BrowserRouter>
        <OnboardingWizard />
      </BrowserRouter>
    )
    
    // Fill in name field
    const nameInput = screen.getByPlaceholderText(/Enter your full name/i)
    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    
    // Click Continue button
    const continueButton = screen.getByText(/Continue/i)
    fireEvent.click(continueButton)
    
    // Check for loading indicator during save
    // EXPECTED BEHAVIOR (after fix): Loading text like "Saving..." should be shown
    // ACTUAL BEHAVIOR (unfixed code): No loading indicator shown
    await waitFor(() => {
      const loadingIndicator = screen.queryByText(/Saving|Loading|Please wait/i)
      expect(loadingIndicator).toBeTruthy() // This will FAIL on unfixed code
    }, { timeout: 50 })
  })

  /**
   * Property-Based Test: Duplicate Requests Across Various Click Counts
   * 
   * Tests that only 1 save request is sent regardless of how many times the button is clicked.
   * Uses fast-check to generate different click counts.
   */
  it('should only send 1 save request regardless of click count', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          clickCount: fc.integer({ min: 2, max: 5 }), // Test 2-5 rapid clicks
          userName: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
        }),
        async ({ clickCount, userName }) => {
          // Clean up before each property test
          cleanup()
          
          // Track update calls
          let updateCallCount = 0
          const mockUpdate = vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockImplementation(() => {
              updateCallCount++
              return new Promise(resolve => {
                setTimeout(() => {
                  resolve({
                    error: null,
                    data: [{ id: 'test-user-id', display_name: userName }],
                  })
                }, 100)
              })
            }),
          }))
          
          mockSupabase.from = vi.fn().mockReturnValue({
            update: mockUpdate,
          })
          
          render(
            <BrowserRouter>
              <OnboardingWizard />
            </BrowserRouter>
          )
          
          // Fill in name field
          const nameInput = screen.getByPlaceholderText(/Enter your full name/i)
          fireEvent.change(nameInput, { target: { value: userName } })
          
          // Click Continue button multiple times rapidly
          const continueButton = screen.getByText(/Continue/i)
          for (let i = 0; i < clickCount; i++) {
            fireEvent.click(continueButton)
          }
          
          // Wait for save to complete
          await waitFor(() => {
            expect(screen.getByText(/Step 2 of 3/i)).toBeTruthy()
          }, { timeout: 3000 })
          
          // EXPECTED BEHAVIOR (after fix): Only 1 update call
          // ACTUAL BEHAVIOR (unfixed code): clickCount update calls
          expect(updateCallCount).toBe(1) // This will FAIL on unfixed code
        }
      ),
      { numRuns: 3 } // Run 3 test cases with different click counts
    )
  })

  /**
   * Property-Based Test: Button State During Save
   * 
   * Tests that button is disabled during save across various scenarios.
   */
  it('should keep button disabled during entire save operation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          saveDelay: fc.integer({ min: 100, max: 500 }), // Test various save durations
          userName: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
        }),
        async ({ saveDelay, userName }) => {
          // Clean up before each property test
          cleanup()
          
          // Mock supabase update with variable delay
          const mockUpdate = vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockImplementation(() => {
              return new Promise(resolve => {
                setTimeout(() => {
                  resolve({
                    error: null,
                    data: [{ id: 'test-user-id', display_name: userName }],
                  })
                }, saveDelay)
              })
            }),
          }))
          
          mockSupabase.from = vi.fn().mockReturnValue({
            update: mockUpdate,
          })
          
          render(
            <BrowserRouter>
              <OnboardingWizard />
            </BrowserRouter>
          )
          
          // Fill in name field
          const nameInput = screen.getByPlaceholderText(/Enter your full name/i)
          fireEvent.change(nameInput, { target: { value: userName } })
          
          // Click Continue button
          const continueButton = screen.getByText(/Continue/i) as HTMLButtonElement
          fireEvent.click(continueButton)
          
          // Check button is disabled during save
          await waitFor(() => {
            // Button text changes to "Saving..." when disabled
            const button = screen.getByText(/Saving/i) as HTMLButtonElement
            expect(button.disabled).toBe(true) // This will FAIL on unfixed code
          }, { timeout: 50 })
        }
      ),
      { numRuns: 3 } // Run 3 test cases with different save delays
    )
  })
})

/**
 * EXPECTED TEST RESULTS ON UNFIXED CODE:
 * 
 * ❌ should only send 1 save request when Next is clicked rapidly 3 times (Bug 1.21)
 *    - FAILS because 3 update calls are made instead of 1
 *    - Demonstrates duplicate requests bug
 * 
 * ❌ should disable Continue button during save operation (Bug 1.21)
 *    - FAILS because button is not disabled during save
 *    - User can click multiple times
 * 
 * ❌ should show loading indicator during save operation (Bug 1.21)
 *    - FAILS because no loading indicator is shown
 *    - User doesn't know save is in progress
 * 
 * ❌ should only send 1 save request regardless of click count
 *    - FAILS for all generated test cases
 *    - Demonstrates duplicate requests across various click counts
 * 
 * ❌ should keep button disabled during entire save operation
 *    - FAILS for all generated test cases
 *    - Button remains enabled during save
 * 
 * These failures confirm Bug 1.21 exists and provide counterexamples.
 * 
 * COUNTEREXAMPLES FOUND:
 * - 3 rapid clicks sent 3 save requests (expected 1)
 * - Button not disabled during save (expected disabled)
 * - No loading indicator shown (expected "Saving..." or similar)
 */
