/**
 * Unit tests for Frontend AI Service
 *
 * Tests API calls, error handling, and response parsing.
 * Requirements: 11.1, 11.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { askAI } from '../aiService'
import type { AIResponse } from '../aiService'

// Mock the apiFetch utility
vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.name = 'ApiError'
      this.status = status
    }
  },
}))

import { apiFetch, ApiError } from '../../lib/api'

// ── Helpers ────────────────────────────────────────────────────────────────

function makeAIResponse(overrides: Partial<AIResponse> = {}): AIResponse {
  return {
    answer: 'Here is the answer',
    provider: 'groq',
    task: 'doubt_solving',
    timestamp: '2024-01-01T00:00:00.000Z',
    mode: '2_MARKS',
    query_type: 'concept',
    athena: {
      title: 'Test Title',
      summary: 'Test Summary',
      sections: [],
      numerical: {
        is_numerical: false,
        given: [],
        find: [],
        formulas: [],
        steps: [],
        final_answer: { value: '', unit: '', precision: '', boxed_katex: '' },
        sanity_check: { unit_check: 'pass', magnitude_check: 'pass', notes: '' },
      },
      exam_relevance: {
        label: 'MEDIUM',
        reason: 'Test reason',
        pyq_frequency: 0,
      },
      sources: [],
      confidence: {
        overall: 0.9,
        numerical_verification: 'verified',
        warnings: [],
      },
    },
    ui_meta: {
      brand_label: 'Athena',
      save_supported: true,
    },
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('askAI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Requirement 11.1: calls POST /api/v1/ai via apiFetch ─────────────────

  it('calls POST /api/v1/ai with correct method and body', async () => {
    const mockResponse = makeAIResponse()
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: mockResponse })

    await askAI('doubt_solving', 'Explain recursion')

    expect(apiFetch).toHaveBeenCalledOnce()
    const [path, options] = vi.mocked(apiFetch).mock.calls[0]
    expect(path).toBe('/api/v1/ai')
    expect(options?.method).toBe('POST')
    const body = JSON.parse(options?.body as string)
    expect(body.task).toBe('doubt_solving')
    expect(body.prompt).toBe('Explain recursion')
  })

  it('includes context in request body when provided', async () => {
    const mockResponse = makeAIResponse()
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: mockResponse })

    await askAI('study_chat', 'Help me study', 'Chapter 5 - Data Structures')

    const [, options] = vi.mocked(apiFetch).mock.calls[0]
    const body = JSON.parse(options?.body as string)
    expect(body.context).toBe('Chapter 5 - Data Structures')
  })

  it('omits context from request body when not provided', async () => {
    const mockResponse = makeAIResponse()
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: mockResponse })

    await askAI('doubt_solving', 'Explain binary search')

    const [, options] = vi.mocked(apiFetch).mock.calls[0]
    const body = JSON.parse(options?.body as string)
    expect(body.context).toBeUndefined()
  })

  // ── Requirement 11.4: parses response and returns AI_Response ────────────

  it('returns the AI_Response data from the backend response', async () => {
    const mockResponse = makeAIResponse({
      answer: 'Recursion is a function calling itself',
      provider: 'groq',
      task: 'doubt_solving',
      timestamp: '2024-06-01T12:00:00.000Z',
    })
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: mockResponse })

    const result = await askAI('doubt_solving', 'Explain recursion')

    expect(result.answer).toBe('Recursion is a function calling itself')
    expect(result.provider).toBe('groq')
    expect(result.task).toBe('doubt_solving')
    expect(result.timestamp).toBe('2024-06-01T12:00:00.000Z')
  })

  it('returns AI_Response with gemini provider when backend uses fallback', async () => {
    const mockResponse = makeAIResponse({ provider: 'gemini' })
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: mockResponse })

    const result = await askAI('summarization', 'Summarize this text')

    expect(result.provider).toBe('gemini')
  })

  it('returns AI_Response for all valid task types', async () => {
    const tasks = ['doubt_solving', 'pyq_explanation', 'study_chat', 'summarization'] as const

    for (const task of tasks) {
      const mockResponse = makeAIResponse({ task })
      vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: mockResponse })

      const result = await askAI(task, 'Test prompt')

      expect(result.task).toBe(task)
    }
  })

  // ── Error handling ────────────────────────────────────────────────────────

  it('propagates ApiError when backend returns an error', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new ApiError(500, 'AI service unavailable'))

    await expect(askAI('doubt_solving', 'Explain recursion')).rejects.toThrow(
      'AI service unavailable'
    )
  })

  it('propagates 429 ApiError for quota exceeded', async () => {
    vi.mocked(apiFetch).mockRejectedValue(
      new ApiError(429, 'Daily AI quota exceeded. Try again tomorrow.')
    )

    const error = await askAI('doubt_solving', 'Test').catch(e => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(429)
  })

  it('propagates 401 ApiError for unauthenticated requests', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new ApiError(401, 'Unauthorized'))

    const error = await askAI('doubt_solving', 'Test').catch(e => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(401)
  })

  it('propagates network errors', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error('Network error'))

    await expect(askAI('doubt_solving', 'Test')).rejects.toThrow('Network error')
  })

  // ── URL construction ──────────────────────────────────────────────────────

  it('always calls the correct endpoint path', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: makeAIResponse() })

    await askAI('pyq_explanation', 'Explain this PYQ')

    expect(vi.mocked(apiFetch).mock.calls[0][0]).toBe('/api/v1/ai')
  })
})
