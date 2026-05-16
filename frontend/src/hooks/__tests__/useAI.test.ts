/**
 * Tests for useAI hook
 * Requirements: 11.2, 11.3, 29.10
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useAI, getAIErrorMessage } from '../useAI'
import * as aiService from '../../services/aiService'
import { ApiError } from '../../lib/api'

vi.mock('../../services/aiService')
vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}))

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

describe('useAI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Requirement 11.2: useMutation integration — exposes mutate, isPending, error, data
  it('exposes mutate, isPending, error, data from useMutation', () => {
    const { result } = renderHook(() => useAI(), { wrapper: makeWrapper() })
    expect(typeof result.current.mutate).toBe('function')
    expect(result.current.isPending).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.data).toBeUndefined()
  })

  it('sets isPending to true while mutation is in flight', async () => {
    let resolve!: (v: aiService.AIResponse) => void
    vi.mocked(aiService.askAI).mockReturnValue(new Promise(r => { resolve = r }))

    const { result } = renderHook(() => useAI(), { wrapper: makeWrapper() })
    result.current.mutate({ task: 'doubt_solving', prompt: 'hello' })

    await waitFor(() => expect(result.current.isPending).toBe(true))

    resolve({
      answer: 'ok',
      provider: 'groq',
      task: 'doubt_solving',
      timestamp: new Date().toISOString(),
      mode: '4_MARKS',
      query_type: 'concept',
      athena: {
        title: 'Exam-Ready Answer',
        summary: 'summary',
        sections: [],
        numerical: {
          is_numerical: false,
          given: [],
          find: [],
          formulas: [],
          steps: [],
          final_answer: { value: '', unit: '', precision: '3_sig_fig', boxed_katex: '' },
          sanity_check: { unit_check: 'pass', magnitude_check: 'pass', notes: 'ok' },
        },
        exam_relevance: { label: 'MEDIUM', reason: 'test', pyq_frequency: 0 },
        sources: [],
        confidence: { overall: 0.8, numerical_verification: 'verified', warnings: [] },
      },
      ui_meta: { brand_label: 'Athena', save_supported: true },
    })
  })

  it('populates data on successful mutation', async () => {
    const mockResponse: aiService.AIResponse = {
      answer: 'The answer is 42',
      provider: 'groq',
      task: 'doubt_solving',
      timestamp: '2024-01-01T00:00:00Z',
      mode: '4_MARKS',
      query_type: 'concept',
      athena: {
        title: 'Exam-Ready Answer',
        summary: 'summary',
        sections: [],
        numerical: {
          is_numerical: false,
          given: [],
          find: [],
          formulas: [],
          steps: [],
          final_answer: { value: '', unit: '', precision: '3_sig_fig', boxed_katex: '' },
          sanity_check: { unit_check: 'pass', magnitude_check: 'pass', notes: 'ok' },
        },
        exam_relevance: { label: 'MEDIUM', reason: 'test', pyq_frequency: 0 },
        sources: [],
        confidence: { overall: 0.8, numerical_verification: 'verified', warnings: [] },
      },
      ui_meta: { brand_label: 'Athena', save_supported: true },
    }
    vi.mocked(aiService.askAI).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useAI(), { wrapper: makeWrapper() })
    result.current.mutate({ task: 'doubt_solving', prompt: 'What is the answer?' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockResponse)
    expect(result.current.error).toBeNull()
  })

  // Requirement 11.3: surfaces backend errors through React Query error state
  it('surfaces backend errors through error state without crashing', async () => {
    vi.mocked(aiService.askAI).mockRejectedValue(new ApiError(500, 'Internal server error'))

    const { result } = renderHook(() => useAI(), { wrapper: makeWrapper() })
    result.current.mutate({ task: 'doubt_solving', prompt: 'test' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Internal server error')
    expect(result.current.data).toBeUndefined()
  })

  it('does not crash the hook on error — isPending returns to false', async () => {
    vi.mocked(aiService.askAI).mockRejectedValue(new Error('Network failure'))

    const { result } = renderHook(() => useAI(), { wrapper: makeWrapper() })
    result.current.mutate({ task: 'study_chat', prompt: 'test' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.isPending).toBe(false)
  })

  // Requirement 29.10: HTTP 429 quota exceeded handling
  it('surfaces HTTP 429 as an error in the error state', async () => {
    vi.mocked(aiService.askAI).mockRejectedValue(new ApiError(429, 'Too Many Requests'))

    const { result } = renderHook(() => useAI(), { wrapper: makeWrapper() })
    result.current.mutate({ task: 'summarization', prompt: 'summarize this' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as ApiError)?.status).toBe(429)
  })

  it('calls onSuccess callback with response data', async () => {
    const mockResponse: aiService.AIResponse = {
      answer: 'done',
      provider: 'gemini',
      task: 'pyq_explanation',
      timestamp: '2024-01-01T00:00:00Z',
      mode: '4_MARKS',
      query_type: 'concept',
      athena: {
        title: 'Exam-Ready Answer',
        summary: 'summary',
        sections: [],
        numerical: {
          is_numerical: false,
          given: [],
          find: [],
          formulas: [],
          steps: [],
          final_answer: { value: '', unit: '', precision: '3_sig_fig', boxed_katex: '' },
          sanity_check: { unit_check: 'pass', magnitude_check: 'pass', notes: 'ok' },
        },
        exam_relevance: { label: 'MEDIUM', reason: 'test', pyq_frequency: 0 },
        sources: [],
        confidence: { overall: 0.8, numerical_verification: 'verified', warnings: [] },
      },
      ui_meta: { brand_label: 'Athena', save_supported: true },
    }
    vi.mocked(aiService.askAI).mockResolvedValue(mockResponse)
    const onSuccess = vi.fn()

    const { result } = renderHook(() => useAI({ onSuccess }), { wrapper: makeWrapper() })
    result.current.mutate({ task: 'pyq_explanation', prompt: 'explain' })

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(onSuccess.mock.calls[0][0]).toEqual(mockResponse)
  })

  it('calls onError callback on failure', async () => {
    const err = new Error('fail')
    vi.mocked(aiService.askAI).mockRejectedValue(err)
    const onError = vi.fn()

    const { result } = renderHook(() => useAI({ onError }), { wrapper: makeWrapper() })
    result.current.mutate({ task: 'doubt_solving', prompt: 'test' })

    await waitFor(() => expect(onError).toHaveBeenCalled())
    expect(onError.mock.calls[0][0]).toEqual(err)
  })
})

describe('getAIErrorMessage', () => {
  it('returns null when error is null', () => {
    expect(getAIErrorMessage(null)).toBeNull()
  })

  it('returns quota exceeded message for HTTP 429', () => {
    const err = new ApiError(429, 'Too Many Requests')
    expect(getAIErrorMessage(err)).toBe('AI quota exceeded. Please try again later.')
  })

  it('returns the error message for other errors', () => {
    const err = new Error('Something went wrong')
    expect(getAIErrorMessage(err)).toBe('Something went wrong')
  })

  it('returns the error message for non-429 ApiErrors', () => {
    const err = new ApiError(500, 'Internal server error')
    expect(getAIErrorMessage(err)).toBe('Internal server error')
  })
})
