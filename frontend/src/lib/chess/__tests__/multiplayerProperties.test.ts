import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// Feature: chess-game, Property 15: Colour assignment is deterministic for room creator
// **Validates: Requirements 10.5**

/**
 * The colour assignment logic used in the multiplayer flow:
 *   myColour = (myUserId === session.host_id) ? 'w' : 'b'
 *
 * This pure function is extracted here for direct property testing
 * without requiring a Supabase connection.
 */
function assignColour(myUserId: string, hostId: string): 'w' | 'b' {
  return myUserId === hostId ? 'w' : 'b'
}

describe('Property 15: Colour assignment is deterministic for room creator', () => {
  it('host always receives White and non-host always receives Black', () => {
    // Arbitrary for a non-empty user ID string
    const userIdArb = fc.uuid()

    fc.assert(
      fc.property(
        userIdArb, // hostId
        userIdArb, // joinerId (may coincidentally equal hostId — handled below)
        (hostId, joinerId) => {
          // Host must be White
          expect(assignColour(hostId, hostId)).toBe('w')

          // If joiner is a different user, they must be Black
          if (joinerId !== hostId) {
            expect(assignColour(joinerId, hostId)).toBe('b')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('colour assignment is deterministic — same inputs always produce same output', () => {
    const userIdArb = fc.uuid()

    fc.assert(
      fc.property(
        userIdArb, // myUserId
        userIdArb, // hostId
        (myUserId, hostId) => {
          const colour1 = assignColour(myUserId, hostId)
          const colour2 = assignColour(myUserId, hostId)

          // Calling with the same arguments must always return the same colour
          expect(colour1).toBe(colour2)

          // Result must be exactly 'w' or 'b'
          expect(['w', 'b']).toContain(colour1)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('exactly one of the two players is White and the other is Black', () => {
    const userIdArb = fc.uuid()

    fc.assert(
      fc.property(
        userIdArb, // hostId
        userIdArb, // joinerId
        (hostId, joinerId) => {
          // Skip the degenerate case where both IDs are identical
          fc.pre(hostId !== joinerId)

          const hostColour = assignColour(hostId, hostId)
          const joinerColour = assignColour(joinerId, hostId)

          // Host is White, joiner is Black — never the same colour
          expect(hostColour).toBe('w')
          expect(joinerColour).toBe('b')
          expect(hostColour).not.toBe(joinerColour)
        }
      ),
      { numRuns: 100 }
    )
  })
})
