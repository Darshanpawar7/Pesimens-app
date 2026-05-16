// Feature: chess-game, Property 14: RoomCode format invariant
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { generateRoomCode } from '../../../components/games/chess/MultiplayerLobby'

const ROOM_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const VALID_CHAR_SET = new Set(ROOM_CODE_CHARS.split(''))

// **Validates: Requirements 10.1, 10.2**
describe('Property 14: RoomCode format invariant', () => {
  it('generated room codes are 5–6 characters long and use only valid characters', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<5 | 6>(5, 6),
        (length) => {
          const code = generateRoomCode(length)

          // Length must be exactly the requested length (5 or 6)
          expect(code.length).toBeGreaterThanOrEqual(5)
          expect(code.length).toBeLessThanOrEqual(6)
          expect(code.length).toBe(length)

          // Every character must belong to the valid charset
          for (const char of code) {
            expect(VALID_CHAR_SET.has(char)).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('default length (6) produces valid codes', () => {
    fc.assert(
      fc.property(
        fc.constant(undefined),
        () => {
          const code = generateRoomCode()
          expect(code.length).toBe(6)
          for (const char of code) {
            expect(VALID_CHAR_SET.has(char)).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
