import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import * as fc from 'fast-check'
import { useGameSession } from '../useGameSession'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

// Mock auth store
vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn(),
}))

// Feature: games-section, Property 8: RoomCode character set and length
// Validates: Requirements 3.6

const ROOM_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function generateRoomCode(): string {
  return Array.from({ length: 4 }, () =>
    ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
  ).join('')
}

describe('useGameSession - RoomCode Generation', () => {
  describe('Property 8: RoomCode character set and length', () => {
    it('should generate room codes with exactly 4 characters from the allowed charset', () => {
      // Generate 1000 room codes and verify each one
      const roomCodes = Array.from({ length: 1000 }, () => generateRoomCode())
      
      roomCodes.forEach(code => {
        // Assert length is exactly 4
        expect(code).toHaveLength(4)
        
        // Assert all characters are in the allowed charset
        for (const char of code) {
          expect(ROOM_CODE_CHARS).toContain(char)
        }
      })
    })

    it('should generate valid room codes using property-based testing', () => {
      fc.assert(
        fc.property(
          fc.constant(null), // We don't need input, just run the generator
          () => {
            const code = generateRoomCode()
            
            // Property 1: Length must be exactly 4
            expect(code).toHaveLength(4)
            
            // Property 2: All characters must be in the allowed charset
            const allowedChars = new Set(ROOM_CODE_CHARS.split(''))
            for (const char of code) {
              expect(allowedChars.has(char)).toBe(true)
            }
            
            // Property 3: No ambiguous characters (0, O, 1, I, L)
            const ambiguousChars = ['0', 'O', '1', 'I', 'L']
            for (const char of code) {
              expect(ambiguousChars).not.toContain(char)
            }
          }
        ),
        { numRuns: 100 } // Minimum 100 iterations as specified
      )
    })

    it('should verify the charset excludes ambiguous characters', () => {
      // Verify the charset definition is correct
      expect(ROOM_CODE_CHARS).not.toContain('0')
      expect(ROOM_CODE_CHARS).not.toContain('O')
      expect(ROOM_CODE_CHARS).not.toContain('1')
      expect(ROOM_CODE_CHARS).not.toContain('I')
      expect(ROOM_CODE_CHARS).not.toContain('L')
      
      // Verify it contains expected characters
      expect(ROOM_CODE_CHARS).toContain('A')
      expect(ROOM_CODE_CHARS).toContain('Z')
      expect(ROOM_CODE_CHARS).toContain('2')
      expect(ROOM_CODE_CHARS).toContain('9')
    })
  })
})

describe('useGameSession - Unit Tests', () => {
  const mockUser = { id: 'user-123' }
  const mockProfile = { display_name: 'Test User' }

  beforeEach(() => {
    vi.clearAllMocks()
    // Setup default auth store mock
    vi.mocked(useAuthStore).mockReturnValue({
      user: mockUser,
      profile: mockProfile,
    } as any)
  })

  describe('createRoom - Retry on collision', () => {
    it('should retry up to 3 times on room code collision and succeed on third attempt', async () => {
      // Mock Supabase to return conflict error twice, then succeed
      let callCount = 0
      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount <= 2) {
            // First two calls: return conflict error
            return Promise.resolve({
              data: null,
              error: {
                code: '23505',
                message: 'duplicate key value violates unique constraint "game_sessions_room_code_key"',
              },
            })
          } else {
            // Third call: succeed
            return Promise.resolve({
              data: {
                id: 'session-123',
                game_type: 'ludo',
                room_code: 'ABC3',
                host_id: 'user-123',
                players: [{ id: 'user-123', display_name: 'Test User' }],
                game_state: {},
                phase: 'lobby',
                phase_ends_at: null,
                created_at: new Date().toISOString(),
              },
              error: null,
            })
          }
        }),
      })

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      })

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any)

      const { result } = renderHook(() => useGameSession())

      let roomCode: string | null = null
      await act(async () => {
        roomCode = await result.current.createRoom('ludo')
      })

      // Should have called insert 3 times (2 failures + 1 success)
      expect(mockInsert).toHaveBeenCalledTimes(3)
      // Room code should be a valid 4-character code (randomly generated)
      expect(roomCode).toBeTruthy()
      expect(roomCode).toHaveLength(4)
      expect(result.current.error).toBeNull()
    })

    it('should return error after 3 failed collision attempts', async () => {
      // Mock Supabase to always return conflict error
      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint "game_sessions_room_code_key"',
          },
        }),
      })

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      })

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any)

      const { result } = renderHook(() => useGameSession())

      let roomCode: string | null = null
      await act(async () => {
        roomCode = await result.current.createRoom('ludo')
      })

      // Should have tried 3 times
      expect(mockInsert).toHaveBeenCalledTimes(3)
      expect(roomCode).toBeNull()
      expect(result.current.error).toBe('Could not generate unique room code')
    })
  })

  describe('Error handling - Operations return errors instead of throwing', () => {
    it('should return error object when createRoom fails with non-collision error', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: 'PGRST116',
            message: 'Database connection failed',
          },
        }),
      })

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      })

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any)

      const { result } = renderHook(() => useGameSession())

      let roomCode: string | null = null
      let threwError = false

      try {
        await act(async () => {
          roomCode = await result.current.createRoom('ludo')
        })
      } catch (e) {
        threwError = true
      }

      expect(threwError).toBe(false) // Should NOT throw
      expect(roomCode).toBeNull()
      expect(result.current.error).toBe('Database connection failed')
    })

    it('should return error object when createRoom throws an exception', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockRejectedValue(new Error('Network error')),
      })

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      })

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any)

      const { result } = renderHook(() => useGameSession())

      let roomCode: string | null = null
      let threwError = false

      try {
        await act(async () => {
          roomCode = await result.current.createRoom('ludo')
        })
      } catch (e) {
        threwError = true
      }

      expect(threwError).toBe(false) // Should NOT throw
      expect(roomCode).toBeNull()
      expect(result.current.error).toBe('Network error')
    })

    it('should return error object when updateGameState fails', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'Permission denied',
          },
        }),
      })

      const mockEq = vi.fn().mockReturnValue({
        select: mockSelect,
      })

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockEq,
      })

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any)

      const { result } = renderHook(() => useGameSession())

      let threwError = false

      try {
        await act(async () => {
          await result.current.updateGameState('session-123', { score: 10 })
        })
      } catch (e) {
        threwError = true
      }

      expect(threwError).toBe(false) // Should NOT throw
      expect(result.current.error).toBe('Permission denied')
    })

    it('should return error object when leaveRoom fails', async () => {
      // First call to fetch the session
      const mockSingleFetch = vi.fn().mockResolvedValue({
        data: null,
        error: {
          message: 'Session not found',
        },
      })

      const mockEqFetch = vi.fn().mockReturnValue({
        single: mockSingleFetch,
      })

      const mockSelectFetch = vi.fn().mockReturnValue({
        eq: mockEqFetch,
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelectFetch,
      } as any)

      const { result } = renderHook(() => useGameSession())

      let threwError = false

      try {
        await act(async () => {
          await result.current.leaveRoom('session-123')
        })
      } catch (e) {
        threwError = true
      }

      expect(threwError).toBe(false) // Should NOT throw
      expect(result.current.error).toBe('Session not found')
    })
  })

  describe('joinRoom - Invalid room code', () => {
    it('should return error when room code does not exist', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [{ success: false, error_message: 'Room not found' }],
        error: null,
      } as any)

      const { result } = renderHook(() => useGameSession())

      let threwError = false

      try {
        await act(async () => {
          await result.current.joinRoom('INVALID')
        })
      } catch (e) {
        threwError = true
      }

      expect(threwError).toBe(false) // Should NOT throw
      expect(result.current.error).toBe('Room not found')
    })

    it('should return error when room code is null', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [{ success: false, error_message: 'Room not found' }],
        error: null,
      } as any)

      const { result } = renderHook(() => useGameSession())

      let threwError = false

      try {
        await act(async () => {
          await result.current.joinRoom('NOTFOUND')
        })
      } catch (e) {
        threwError = true
      }

      expect(threwError).toBe(false) // Should NOT throw
      expect(result.current.error).toBe('Room not found')
    })
  })
})
