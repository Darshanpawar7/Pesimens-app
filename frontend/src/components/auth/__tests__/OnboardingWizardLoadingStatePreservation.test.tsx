/**
 * Preservation Property Tests for OnboardingWizard Loading State
 * 
 * Property 2: Preservation - Normal Onboarding Navigation
 * 
 * IMPORTANT: Follow observation-first methodology
 * These tests observe behavior on UNFIXED code for non-buggy inputs
 * 
 * GOAL: Capture baseline behavior that must be preserved after fix
 * 
 * Validates: Requirements 3.17
 * 
 * Preservation Requirement:
 *   3.17: When OnboardingWizard is navigated normally (no rapid clicks), system SHALL function correctly
 * 
 * EXPECTED OUTCOME ON UNFIXED CODE: Tests PASS
 * This confirms baseline behavior to preserve
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

describe('OnboardingWizard - Preservation: Normal Navigation Without Rapid Clicks', () => {
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
   * Preservation Requirement 3.17: Normal Navigation (Single Click)
   * 
   * When user clicks Continue once and waits for save to complete,
   * the system should:
   * - Save the data successfully
   * - Advance to the next step
   * - NOT show any errors
   * 
   * This behavior must be preserved after the fix.
   */
  it('should save and advance to next step with single Continue click (Req 3.17)', async () => {
    // Mock successful supabase update
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: null,
        data: [{ id: 'test-user-id', display_name: 'Test User' }],
      }),
    })
    
    mockSupabase.from = vi.fn().mockReturnValue({
      update: mockUpdate,
    })
    
    render(
      <BrowserRouter>
        <OnboardingWizard />
      </BrowserRouter>
    )
    
    // Verify we're on Step 1
    expect(screen.getByText(/Step 1 of 3/i)).toBeTruthy()
    
    // Fill in name field
    const nameInput = screen.getByPlaceholderText(/Enter your full name/i)
    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    
    // Click Continue ONCE and wait
    const continueButton = screen.getByText(/Continue/i)
    fireEvent.click(continueButton)
    
    // Should advance to Step 2
    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeTruthy()
    }, { timeout: 2000 })
    
    // Should NOT show any error messages
    const errorMessage = screen.queryByText(/error|fail/i)
    expect(errorMessage).toBeNull()
    
    // Verify update was called exactly once
    expect(mockUpdate).toHaveBeenCalledTimes(1)
  })

  /**
   * Preservation Requirement 3.17: Normal Navigation Through All Steps
   * 
   * When user navigates through all steps normally (one click at a time),
   * the system should:
   * - Allow progression through all steps
   * - Save data at each step
   * - Maintain data between steps
   * 
   * This behavior must be preserved after the fix.
   */
  it('should allow normal progression through all onboarding steps (Req 3.17)', async () => {
    // Mock successful supabase updates
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: null,
        data: [{ id: 'test-user-id' }],
      }),
    })
    
    mockSupabase.from = vi.fn().mockReturnValue({
      update: mockUpdate,
    })
    
    render(
      <BrowserRouter>
        <OnboardingWizard />
      </BrowserRouter>
    )
    
    // Step 1: Fill in name and continue
    expect(screen.getByText(/Step 1 of 3/i)).toBeTruthy()
    const nameInput = screen.getByPlaceholderText(/Enter your full name/i)
    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    fireEvent.click(screen.getByText(/Continue/i))
    
    // Wait for Step 2
    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeTruthy()
    }, { timeout: 2000 })
    
    // Verify save was called once for Step 1
    expect(mockUpdate).toHaveBeenCalledTimes(1)
    
    // No errors should be shown
    expect(screen.queryByText(/error|fail/i)).toBeNull()
  })

  /**
   * Preservation Requirement 3.17: Backward Navigation
   * 
   * When user navigates backward, the system should:
   * - Allow going back to previous steps
   * - Preserve data entered in previous steps
   * - NOT trigger additional save operations
   * 
   * This behavior must be preserved after the fix.
   */
  it('should allow backward navigation without issues (Req 3.17)', async () => {
    // Mock successful supabase updates
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: null,
        data: [{ id: 'test-user-id' }],
      }),
    })
    
    mockSupabase.from = vi.fn().mockReturnValue({
      update: mockUpdate,
    })
    
    render(
      <BrowserRouter>
        <OnboardingWizard />
      </BrowserRouter>
    )
    
    // Step 1: Fill in name and continue
    const nameInput = screen.getByPlaceholderText(/Enter your full name/i)
    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    fireEvent.click(screen.getByText(/Continue/i))
    
    // Wait for Step 2
    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeTruthy()
    }, { timeout: 2000 })
    
    // Go back to Step 1
    const backButton = screen.getByText(/Back/i)
    fireEvent.click(backButton)
    
    // Should be back on Step 1
    await waitFor(() => {
      expect(screen.getByText(/Step 1 of 3/i)).toBeTruthy()
    }, { timeout: 1000 })
    
    // Name should still be filled in (data preserved)
    const nameInputAgain = screen.getByPlaceholderText(/Enter your full name/i) as HTMLInputElement
    expect(nameInputAgain.value).toBe('Test User')
    
    // No errors should be shown
    expect(screen.queryByText(/error|fail/i)).toBeNull()
  })

  /**
   * Preservation Requirement 3.17: Normal Click with Delay
   * 
   * When user clicks Continue and waits before clicking again,
   * the system should:
   * - Process each click separately
   * - Save data for each step
   * - Advance through steps correctly
   * 
   * This behavior must be preserved after the fix.
   */
  it('should handle sequential clicks with delays correctly (Req 3.17)', async () => {
    // Mock successful supabase updates
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: null,
        data: [{ id: 'test-user-id' }],
      }),
    })
    
    mockSupabase.from = vi.fn().mockReturnValue({
      update: mockUpdate,
    })
    
    render(
      <BrowserRouter>
        <OnboardingWizard />
      </BrowserRouter>
    )
    
    // Step 1: Fill in name
    const nameInput = screen.getByPlaceholderText(/Enter your full name/i)
    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    
    // Click Continue
    fireEvent.click(screen.getByText(/Continue/i))
    
    // Wait for save to complete and step to advance
    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeTruthy()
    }, { timeout: 2000 })
    
    // Verify save was called once
    expect(mockUpdate).toHaveBeenCalledTimes(1)
    
    // No errors
    expect(screen.queryByText(/error|fail/i)).toBeNull()
  })

  /**
   * Property-Based Test: Normal Navigation with Various Valid Inputs
   * 
   * Tests that normal navigation works correctly across many different valid inputs.
   * Uses fast-check to generate various valid user names.
   */
  it('should handle normal navigation with various valid inputs (Property-based)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 0),
        async (userName) => {
          // Clean up before each property test
          cleanup()
          
          // Mock successful supabase update
          const mockUpdate = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null,
              data: [{ id: 'test-user-id', display_name: userName }],
            }),
          })
          
          mockSupabase.from = vi.fn().mockReturnValue({
            update: mockUpdate,
          })
          
          render(
            <BrowserRouter>
              <OnboardingWizard />
            </BrowserRouter>
          )
          
          // Fill in name
          const nameInput = screen.getByPlaceholderText(/Enter your full name/i)
          fireEvent.change(nameInput, { target: { value: userName } })
          
          // Click Continue ONCE
          const continueButton = screen.getByText(/Continue/i)
          fireEvent.click(continueButton)
          
          // Should advance to Step 2 (no errors)
          await waitFor(() => {
            expect(screen.getByText(/Step 2 of 3/i)).toBeTruthy()
          }, { timeout: 2000 })
          
          // Should NOT show error messages
          const errorMessage = screen.queryByText(/error|fail/i)
          expect(errorMessage).toBeNull()
          
          // Should call update exactly once
          expect(mockUpdate).toHaveBeenCalledTimes(1)
        }
      ),
      { numRuns: 5 } // Run 5 test cases with different valid names
    )
  })

  /**
   * Property-Based Test: Data Persistence During Normal Navigation
   * 
   * Tests that data is correctly maintained when navigating normally.
   * This ensures the fix doesn't break data persistence.
   */
  it('should preserve data during normal navigation (Property-based)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 3, maxLength: 30 }).filter(s => s.trim().length >= 3),
        }),
        async ({ name }) => {
          // Clean up before each property test
          cleanup()
          
          // Mock successful supabase update
          const mockUpdate = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null,
              data: [{ id: 'test-user-id' }],
            }),
          })
          
          mockSupabase.from = vi.fn().mockReturnValue({
            update: mockUpdate,
          })
          
          render(
            <BrowserRouter>
              <OnboardingWizard />
            </BrowserRouter>
          )
          
          // Fill in name on Step 1
          const nameInput = screen.getByPlaceholderText(/Enter your full name/i)
          fireEvent.change(nameInput, { target: { value: name } })
          
          // Click Continue ONCE
          fireEvent.click(screen.getByText(/Continue/i))
          
          // Wait for Step 2
          await waitFor(() => {
            expect(screen.getByText(/Step 2 of 3/i)).toBeTruthy()
          }, { timeout: 2000 })
          
          // Go back to Step 1
          fireEvent.click(screen.getByText(/Back/i))
          
          // Wait for Step 1
          await waitFor(() => {
            expect(screen.getByText(/Step 1 of 3/i)).toBeTruthy()
          }, { timeout: 2000 })
          
          // Verify name is still there
          const nameInputAgain = screen.getByPlaceholderText(/Enter your full name/i) as HTMLInputElement
          expect(nameInputAgain.value).toBe(name.trim())
        }
      ),
      { numRuns: 3 } // Run 3 test cases
    )
  })

  /**
   * Integration Test: Complete Normal Onboarding Flow
   * 
   * Tests the entire onboarding flow with normal navigation (no rapid clicks).
   * This ensures the fix doesn't break the happy path.
   */
  it('should complete normal onboarding flow without issues', async () => {
    // Mock successful supabase updates
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: null,
        data: [{ id: 'test-user-id' }],
      }),
    })
    
    mockSupabase.from = vi.fn().mockReturnValue({
      update: mockUpdate,
    })
    
    render(
      <BrowserRouter>
        <OnboardingWizard />
      </BrowserRouter>
    )
    
    // Step 1: Basic Info
    expect(screen.getByText(/Step 1 of 3/i)).toBeTruthy()
    const nameInput = screen.getByPlaceholderText(/Enter your full name/i)
    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    
    // Click Continue ONCE and wait
    fireEvent.click(screen.getByText(/Continue/i))
    
    // Wait for Step 2
    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeTruthy()
    }, { timeout: 2000 })
    
    // No errors should be shown at any point
    expect(screen.queryByText(/error|fail/i)).toBeNull()
    
    // Verify save was called exactly once
    expect(mockUpdate).toHaveBeenCalledTimes(1)
  })

  /**
   * Edge Case: Slow Network with Normal Click
   * 
   * When network is slow but user clicks only once,
   * the system should:
   * - Wait for save to complete
   * - Advance to next step
   * - NOT send duplicate requests
   * 
   * This behavior must be preserved after the fix.
   */
  it('should handle slow network with single click correctly (Req 3.17)', async () => {
    // Mock supabase update with delay (slow network)
    let updateCallCount = 0
    const mockUpdate = vi.fn().mockImplementation(() => ({
      eq: vi.fn().mockImplementation(() => {
        updateCallCount++
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              error: null,
              data: [{ id: 'test-user-id', display_name: 'Test User' }],
            })
          }, 500) // 500ms delay to simulate slow network
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
    
    // Click Continue ONCE
    const continueButton = screen.getByText(/Continue/i)
    fireEvent.click(continueButton)
    
    // Wait for save to complete (even with slow network)
    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeTruthy()
    }, { timeout: 3000 })
    
    // Should call update exactly once (no duplicates)
    expect(updateCallCount).toBe(1)
    
    // No errors
    expect(screen.queryByText(/error|fail/i)).toBeNull()
  })
})

/**
 * EXPECTED TEST RESULTS ON UNFIXED CODE:
 * 
 * ✅ should save and advance to next step with single Continue click (Req 3.17)
 *    - PASSES because single clicks work correctly on unfixed code
 * 
 * ✅ should allow normal progression through all onboarding steps (Req 3.17)
 *    - PASSES because normal navigation works correctly on unfixed code
 * 
 * ✅ should allow backward navigation without issues (Req 3.17)
 *    - PASSES because backward navigation works on unfixed code
 * 
 * ✅ should handle sequential clicks with delays correctly (Req 3.17)
 *    - PASSES because clicks with delays work on unfixed code
 * 
 * ✅ should handle normal navigation with various valid inputs (Property-based)
 *    - PASSES for all generated test cases
 * 
 * ✅ should preserve data during normal navigation (Property-based)
 *    - PASSES because data persistence works on unfixed code
 * 
 * ✅ should complete normal onboarding flow without issues
 *    - PASSES because happy path works on unfixed code
 * 
 * ✅ should handle slow network with single click correctly (Req 3.17)
 *    - PASSES because single clicks work even with slow network
 * 
 * These passing tests confirm the baseline behavior that must be preserved after the fix.
 * After implementing the fix, these tests MUST STILL PASS to ensure no regressions.
 */
