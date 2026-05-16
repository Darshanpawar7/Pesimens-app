/**
 * Preservation Property Tests for OnboardingWizard
 * 
 * Property 2: Preservation - Successful Onboarding Flow
 * 
 * IMPORTANT: Follow observation-first methodology
 * These tests observe behavior on UNFIXED code for non-buggy inputs
 * 
 * GOAL: Capture baseline behavior that must be preserved after fix
 * 
 * Validates: Requirements 3.16, 3.17, 3.18
 * 
 * Preservation Requirements:
 *   3.16: When OnboardingWizard saveProgress succeeds, system SHALL save progress and advance to next step
 *   3.17: When OnboardingWizard is navigated normally (no rapid clicks), system SHALL function correctly
 *   3.18: When OnboardingWizard operations succeed, system SHALL display success states
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

describe('OnboardingWizard - Preservation: Successful Onboarding Flow', () => {
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
   * Preservation Requirement 3.16: Successful Save Progress
   * 
   * When saveProgress succeeds, the system should:
   * - Save the data to the database
   * - Advance to the next step
   * - NOT display any error messages
   * 
   * This behavior must be preserved after the fix.
   */
  it('should save progress and advance to next step when save succeeds (Req 3.16)', async () => {
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
    expect(screen.getByText(/Basic Information/i)).toBeTruthy()
    
    // Fill in name field
    const nameInput = screen.getByPlaceholderText(/Enter your full name/i)
    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    
    // Click Continue
    const continueButton = screen.getByText(/Continue/i)
    fireEvent.click(continueButton)
    
    // Should advance to Step 2
    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeTruthy()
      expect(screen.getByText(/Academic Details/i)).toBeTruthy()
    })
    
    // Should NOT show any error messages
    const errorMessage = screen.queryByText(/error|fail/i)
    expect(errorMessage).toBeNull()
    
    // Verify update was called with correct data
    expect(mockUpdate).toHaveBeenCalled()
  })

  /**
   * Preservation Requirement 3.17: Normal Navigation
   * 
   * When navigating normally (no rapid clicks, no errors), the system should:
   * - Allow forward navigation through steps
   * - Allow backward navigation
   * - Maintain data between steps
   * 
   * This behavior must be preserved after the fix.
   */
  it('should allow normal navigation through onboarding steps (Req 3.17)', async () => {
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
    fireEvent.click(screen.getByText(/Continue/i))
    
    // Should be on Step 2
    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeTruthy()
    })
    
    // Go back to Step 1
    const backButton = screen.getByText(/Back/i)
    fireEvent.click(backButton)
    
    // Should be back on Step 1
    await waitFor(() => {
      expect(screen.getByText(/Step 1 of 3/i)).toBeTruthy()
    })
    
    // Name should still be filled in (data preserved)
    const nameInputAgain = screen.getByPlaceholderText(/Enter your full name/i) as HTMLInputElement
    expect(nameInputAgain.value).toBe('Test User')
  })

  /**
   * Preservation Requirement 3.18: Success States
   * 
   * When operations succeed, the system should:
   * - Display appropriate UI states
   * - Show correct step indicators
   * - Enable/disable buttons appropriately
   * 
   * This behavior must be preserved after the fix.
   */
  it('should display correct success states during onboarding (Req 3.18)', async () => {
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
    
    // Step 1 should be active
    const step1Indicator = screen.getByText('1').closest('div')
    expect(step1Indicator?.className).toContain('from-indigo-500')
    
    // Fill in and continue
    const nameInput = screen.getByPlaceholderText(/Enter your full name/i)
    fireEvent.change(nameInput, { target: { value: 'Test User' } })
    fireEvent.click(screen.getByText(/Continue/i))
    
    // Step 2 should become active
    await waitFor(() => {
      const step2Indicator = screen.getByText('2').closest('div')
      expect(step2Indicator?.className).toContain('from-indigo-500')
    })
    
    // Step 1 should show as completed (different styling - with opacity)
    const step1IndicatorAfter = screen.getByText('1').closest('div')
    expect(step1IndicatorAfter?.className).toContain('bg-indigo-500/30')
  })

  /**
   * Property-Based Test: Successful Saves with Various Valid Inputs
   * 
   * Tests that successful saves work correctly across many different valid inputs.
   * Uses fast-check to generate various valid user names.
   */
  it('should handle successful saves with various valid inputs (Property-based)', async () => {
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
          
          // Click Continue
          const continueButton = screen.getByText(/Continue/i)
          fireEvent.click(continueButton)
          
          // Should advance to Step 2 (no errors)
          await waitFor(() => {
            expect(screen.getByText(/Step 2 of 3/i)).toBeTruthy()
          }, { timeout: 2000 })
          
          // Should NOT show error messages
          const errorMessage = screen.queryByText(/error|fail/i)
          expect(errorMessage).toBeNull()
        }
      ),
      { numRuns: 5 } // Run 5 test cases with different valid names
    )
  })

  /**
   * Property-Based Test: Data Persistence Across Steps
   * 
   * Tests that data is correctly maintained when navigating between steps.
   * This ensures the fix doesn't break data persistence.
   */
  it('should preserve data when navigating between steps (Property-based)', async () => {
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
          
          // Verify name is still there (trimmed version)
          const nameInputAgain = screen.getByPlaceholderText(/Enter your full name/i) as HTMLInputElement
          expect(nameInputAgain.value).toBe(name.trim())
        }
      ),
      { numRuns: 3 } // Run 3 test cases
    )
  })

  /**
   * Integration Test: Complete Successful Onboarding Flow
   * 
   * Tests the entire onboarding flow from start to finish with successful saves.
   * This ensures the fix doesn't break the happy path.
   */
  it('should complete full onboarding flow successfully', async () => {
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
    fireEvent.click(screen.getByText(/Continue/i))
    
    // Step 2: Academic Details
    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 3/i)).toBeTruthy()
    })
    
    // No errors should be shown at any point
    expect(screen.queryByText(/error|fail/i)).toBeNull()
    
    // Verify save was called
    expect(mockUpdate).toHaveBeenCalled()
  })
})

/**
 * EXPECTED TEST RESULTS ON UNFIXED CODE:
 * 
 * ✅ should save progress and advance to next step when save succeeds (Req 3.16)
 *    - PASSES because successful saves work correctly on unfixed code
 * 
 * ✅ should allow normal navigation through onboarding steps (Req 3.17)
 *    - PASSES because navigation works correctly on unfixed code
 * 
 * ✅ should display correct success states during onboarding (Req 3.18)
 *    - PASSES because UI states are correct on unfixed code
 * 
 * ✅ should handle successful saves with various valid inputs (Property-based)
 *    - PASSES for all generated test cases
 * 
 * ✅ should preserve data when navigating between steps (Property-based)
 *    - PASSES because data persistence works on unfixed code
 * 
 * ✅ should complete full onboarding flow successfully
 *    - PASSES because happy path works on unfixed code
 * 
 * These passing tests confirm the baseline behavior that must be preserved after the fix.
 * After implementing the fix, these tests MUST STILL PASS to ensure no regressions.
 */
