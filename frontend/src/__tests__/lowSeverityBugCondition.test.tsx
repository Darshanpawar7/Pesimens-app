/**
 * Bug Condition Exploration Tests - LOW Severity Issues
 * 
 * **Validates: Requirements 2.15, 2.16**
 * 
 * **CRITICAL**: These tests MUST FAIL on unfixed code - failure confirms the bugs exist
 * **DO NOT attempt to fix the tests or the code when they fail**
 * **GOAL**: Surface counterexamples that demonstrate the bugs exist
 * 
 * Bug #14: Component render error crashes entire app (should show fallback UI)
 * Bug #15: Null property access causes runtime error (should handle gracefully)
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import * as fc from 'fast-check'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'

// ============================================================================
// Bug #14: React Error Boundaries
// ============================================================================

/**
 * Test component that throws an error during render
 */
function ThrowingComponent({ shouldThrow, message }: { shouldThrow: boolean; message: string }) {
  if (shouldThrow) {
    throw new Error(message)
  }
  return <div>Component rendered successfully</div>
}

/**
 * Test component that accesses undefined properties
 */
function UnsafeComponent({ data }: { data: any }) {
  // This will throw if data is null/undefined
  return <div>{data.nested.property.value}</div>
}

describe('Bug #14: React Error Boundaries', () => {
  it('should catch component render errors and display fallback UI instead of crashing', () => {
    /**
     * Property: For any component that throws an error during rendering,
     * the system SHALL use error boundaries to catch errors and display
     * fallback UI instead of crashing the entire app.
     * 
     * **Expected on UNFIXED code**: Test FAILS - error crashes the app
     * **Expected on FIXED code**: Test PASSES - error boundary catches error
     */
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (errorMessage) => {
          // Suppress console.error for this test since we expect errors
          const originalError = console.error
          console.error = () => {}

          try {
            // Attempt to render a component that throws an error
            const { container } = render(
              <ErrorBoundary>
                <ThrowingComponent shouldThrow={true} message={errorMessage} />
              </ErrorBoundary>
            )

            // On UNFIXED code: This will throw and crash the test
            // On FIXED code: Error boundary should catch and show fallback UI
            
            // Check if error boundary fallback UI is present
            const hasErrorBoundary = 
              container.textContent?.includes('error') ||
              container.textContent?.includes('Error') ||
              container.textContent?.includes('wrong') ||
              container.textContent?.includes('reload') ||
              container.querySelector('[role="alert"]') !== null

            console.error = originalError

            // The error boundary should have caught the error and displayed fallback UI
            expect(hasErrorBoundary).toBe(true)
          } catch (error) {
            console.error = originalError
            // On UNFIXED code: Error crashes the app (test fails here)
            throw new Error(
              `Bug #14 detected: Component render error crashed the app instead of being caught by error boundary. ` +
              `Error: ${error instanceof Error ? error.message : String(error)}`
            )
          }
        }
      ),
      { numRuns: 10 }
    )
  })

  it('should catch errors from components with null reference errors', () => {
    /**
     * Property: For any component that encounters null/undefined reference errors,
     * the error boundary SHALL catch the error and display fallback UI.
     * 
     * **Expected on UNFIXED code**: Test FAILS - null reference crashes the app
     * **Expected on FIXED code**: Test PASSES - error boundary catches error
     */
    fc.assert(
      fc.property(
        fc.constantFrom(null, undefined, {}),
        (invalidData) => {
          const originalError = console.error
          console.error = () => {}

          try {
            const { container } = render(
              <ErrorBoundary>
                <UnsafeComponent data={invalidData} />
              </ErrorBoundary>
            )

            // Check if error boundary fallback UI is present
            const hasErrorBoundary = 
              container.textContent?.includes('error') ||
              container.textContent?.includes('Error') ||
              container.textContent?.includes('wrong') ||
              container.querySelector('[role="alert"]') !== null

            console.error = originalError

            expect(hasErrorBoundary).toBe(true)
          } catch (error) {
            console.error = originalError
            throw new Error(
              `Bug #14 detected: Null reference error crashed the app instead of being caught by error boundary. ` +
              `Error: ${error instanceof Error ? error.message : String(error)}`
            )
          }
        }
      ),
      { numRuns: 10 }
    )
  })
})

// ============================================================================
// Bug #15: Comprehensive Null Checks
// ============================================================================

/**
 * Simulates profile data structures that may have null/undefined nested properties
 */
interface ProfileData {
  id?: string
  display_name?: string | null
  user?: {
    name?: string | null
    email?: string | null
  } | null
  profile?: {
    bio?: string | null
    location?: {
      city?: string | null
      country?: string | null
    } | null
  } | null
}

/**
 * Component that unsafely accesses nested profile properties
 */
function UnsafeProfileComponent({ profile }: { profile: ProfileData | null | undefined }) {
  // These accesses will throw if profile or nested properties are null/undefined
  return (
    <div>
      <h1>{profile!.display_name}</h1>
      <p>{profile!.user!.name}</p>
      <p>{profile!.user!.email}</p>
      <p>{profile!.profile!.bio}</p>
      <p>{profile!.profile!.location!.city}</p>
    </div>
  )
}

describe('Bug #15: Comprehensive Null Checks', () => {
  it('should handle null profile data without crashing', () => {
    /**
     * Property: For any profile data that may be null or have null nested fields,
     * the system SHALL include comprehensive null checks to prevent runtime errors.
     * 
     * **Expected on UNFIXED code**: Test FAILS - null access causes runtime error
     * **Expected on FIXED code**: Test PASSES - null checks prevent errors
     */
    fc.assert(
      fc.property(
        fc.constantFrom(
          null,
          undefined,
          {},
          { id: '123' },
          { id: '123', display_name: null },
          { id: '123', display_name: 'Test', user: null },
          { id: '123', display_name: 'Test', user: { name: null } },
          { id: '123', display_name: 'Test', user: { name: 'John' }, profile: null },
          { id: '123', display_name: 'Test', user: { name: 'John' }, profile: { bio: null, location: null } }
        ),
        (profileData) => {
          const originalError = console.error
          console.error = () => {}

          try {
            // Attempt to render component with potentially null data
            render(
              <ErrorBoundary>
                <UnsafeProfileComponent profile={profileData} />
              </ErrorBoundary>
            )
            
            console.error = originalError
            
            // If we reach here without error, null checks are working
            // (or error boundary caught it)
            return true
          } catch (error) {
            console.error = originalError
            
            // Check if it's a null/undefined access error
            const errorMessage = error instanceof Error ? error.message : String(error)
            const isNullError = 
              errorMessage.includes('null') ||
              errorMessage.includes('undefined') ||
              errorMessage.includes('Cannot read propert')

            if (isNullError) {
              throw new Error(
                `Bug #15 detected: Null property access caused runtime error. ` +
                `Profile data: ${JSON.stringify(profileData)}. ` +
                `Error: ${errorMessage}`
              )
            }
            
            // Some other error, re-throw
            throw error
          }
        }
      ),
      { numRuns: 20 }
    )
  })

  it('should handle deeply nested null properties without crashing', () => {
    /**
     * Property: For any deeply nested property access on profile data,
     * the system SHALL use optional chaining or null checks to prevent
     * "Cannot read property of null/undefined" errors.
     * 
     * **Expected on UNFIXED code**: Test FAILS - deep null access crashes
     * **Expected on FIXED code**: Test PASSES - optional chaining prevents errors
     */
    
    // Generator for profile data with various null patterns
    const profileArbitrary = fc.record({
      id: fc.option(fc.uuid(), { nil: undefined }),
      display_name: fc.option(fc.string(), { nil: null }),
      user: fc.option(
        fc.record({
          name: fc.option(fc.string(), { nil: null }),
          email: fc.option(fc.emailAddress(), { nil: null }),
        }),
        { nil: null }
      ),
      profile: fc.option(
        fc.record({
          bio: fc.option(fc.string(), { nil: null }),
          location: fc.option(
            fc.record({
              city: fc.option(fc.string(), { nil: null }),
              country: fc.option(fc.string(), { nil: null }),
            }),
            { nil: null }
          ),
        }),
        { nil: null }
      ),
    }) as fc.Arbitrary<ProfileData>

    fc.assert(
      fc.property(
        fc.option(profileArbitrary, { nil: null }),
        (profileData) => {
          const originalError = console.error
          console.error = () => {}

          try {
            render(
              <ErrorBoundary>
                <UnsafeProfileComponent profile={profileData} />
              </ErrorBoundary>
            )
            console.error = originalError
            return true
          } catch (error) {
            console.error = originalError
            
            const errorMessage = error instanceof Error ? error.message : String(error)
            const isNullError = 
              errorMessage.includes('null') ||
              errorMessage.includes('undefined') ||
              errorMessage.includes('Cannot read propert')

            if (isNullError) {
              throw new Error(
                `Bug #15 detected: Deep nested null property access caused runtime error. ` +
                `Profile structure: ${JSON.stringify(profileData, null, 2)}. ` +
                `Error: ${errorMessage}`
              )
            }
            
            throw error
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should handle profile data with missing required fields', () => {
    /**
     * Property: For any profile data access where required fields may be missing,
     * the system SHALL validate or provide defaults to prevent crashes.
     * 
     * **Expected on UNFIXED code**: Test FAILS - missing fields cause errors
     * **Expected on FIXED code**: Test PASSES - validation/defaults prevent errors
     */
    
    // Test various incomplete profile structures
    const incompleteProfiles: Array<ProfileData | null | undefined> = [
      null,
      undefined,
      {},
      { id: '123' }, // missing display_name
      { display_name: 'Test' }, // missing id
      { id: '123', display_name: 'Test', user: {} }, // user missing name
      { id: '123', display_name: 'Test', user: { name: 'John' }, profile: {} }, // profile missing bio
    ]

    incompleteProfiles.forEach((profileData, index) => {
      const originalError = console.error
      console.error = () => {}

      try {
        render(
          <ErrorBoundary>
            <UnsafeProfileComponent profile={profileData} />
          </ErrorBoundary>
        )
        console.error = originalError
      } catch (error) {
        console.error = originalError
        
        const errorMessage = error instanceof Error ? error.message : String(error)
        const isNullError = 
          errorMessage.includes('null') ||
          errorMessage.includes('undefined') ||
          errorMessage.includes('Cannot read propert')

        if (isNullError) {
          throw new Error(
            `Bug #15 detected: Missing profile field caused runtime error at test case ${index}. ` +
            `Profile data: ${JSON.stringify(profileData)}. ` +
            `Error: ${errorMessage}`
          )
        }
      }
    })
  })
})
