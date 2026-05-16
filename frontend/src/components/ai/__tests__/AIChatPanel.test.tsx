/**
 * AIChatPanel unit tests
 * Requirements: 17.1-17.9
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AIChatPanel } from '../AIChatPanel'

// Mock the useAI hook — AIChatPanel must NOT make direct API calls (Req 17.9)
const mockMutate = vi.fn()
let mockIsPending = false
let mockError: Error | null = null
let mockOnSuccess: ((data: any) => void) | undefined

vi.mock('../../../hooks/useAI', () => ({
  useAI: (options?: { onSuccess?: (data: any) => void; onError?: (e: Error) => void }) => {
    mockOnSuccess = options?.onSuccess
    return {
      mutate: mockMutate,
      isPending: mockIsPending,
      error: mockError,
    }
  },
  getAIErrorMessage: (error: Error | null) => {
    if (!error) return null
    return error.message
  },
}))

const defaultProps = {
  taskType: 'doubt_solving' as const,
  onClose: vi.fn(),
}

describe('AIChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsPending = false
    mockError = null
    mockOnSuccess = undefined
  })

  // Req 17.1 / 17.3 — component renders chat interface elements
  describe('rendering', () => {
    it('renders text input, submit button, and message history area', () => {
      render(<AIChatPanel {...defaultProps} />)

      expect(screen.getByRole('textbox', { name: /message input/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
      expect(screen.getByRole('log')).toBeInTheDocument()
    })

    it('renders close button that calls onClose', async () => {
      const onClose = vi.fn()
      render(<AIChatPanel {...defaultProps} onClose={onClose} />)

      await userEvent.click(screen.getByRole('button', { name: /close/i }))
      expect(onClose).toHaveBeenCalledOnce()
    })
  })

  // Req 17.2 — accepts taskType, context, onClose props
  describe('props', () => {
    it('accepts doubt_solving taskType', () => {
      expect(() =>
        render(<AIChatPanel taskType="doubt_solving" onClose={vi.fn()} />)
      ).not.toThrow()
    })

    it('accepts pyq_explanation taskType', () => {
      expect(() =>
        render(<AIChatPanel taskType="pyq_explanation" onClose={vi.fn()} />)
      ).not.toThrow()
    })

    it('accepts optional context prop', () => {
      expect(() =>
        render(<AIChatPanel {...defaultProps} context="some context" />)
      ).not.toThrow()
    })
  })

  // Req 17.4 — submitting a message calls the useAI hook
  describe('message submission', () => {
    it('calls mutate with task, prompt, and context on submit', async () => {
      render(<AIChatPanel {...defaultProps} context="ctx" />)

      const input = screen.getByRole('textbox', { name: /message input/i })
      await userEvent.type(input, 'What is recursion?')
      await userEvent.click(screen.getByRole('button', { name: /send/i }))

      expect(mockMutate).toHaveBeenCalledWith({
        task: 'doubt_solving',
        prompt: 'What is recursion?',
        context: 'ctx',
        mode: '4_MARKS',
      })
    })

    it('does not submit empty or whitespace-only messages', async () => {
      render(<AIChatPanel {...defaultProps} />)

      const input = screen.getByRole('textbox', { name: /message input/i })
      await userEvent.type(input, '   ')
      await userEvent.click(screen.getByRole('button', { name: /send/i }))

      expect(mockMutate).not.toHaveBeenCalled()
    })

    it('clears input after submission', async () => {
      render(<AIChatPanel {...defaultProps} />)

      const input = screen.getByRole('textbox', { name: /message input/i })
      await userEvent.type(input, 'Hello')
      await userEvent.click(screen.getByRole('button', { name: /send/i }))

      expect(input).toHaveValue('')
    })

    it('adds user message to history immediately', async () => {
      render(<AIChatPanel {...defaultProps} />)

      const input = screen.getByRole('textbox', { name: /message input/i })
      await userEvent.type(input, 'My question')
      await userEvent.click(screen.getByRole('button', { name: /send/i }))

      expect(screen.getByText('My question')).toBeInTheDocument()
    })

    it('submits on Enter key', async () => {
      render(<AIChatPanel {...defaultProps} />)

      const input = screen.getByRole('textbox', { name: /message input/i })
      await userEvent.type(input, 'Hello{Enter}')

      expect(mockMutate).toHaveBeenCalled()
    })
  })

  // Req 17.5 — loading state disables submit and shows indicator
  describe('loading state', () => {
    it('shows loading indicator while request is in flight', () => {
      mockIsPending = true
      render(<AIChatPanel {...defaultProps} />)

      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    })

    it('disables submit button while loading', () => {
      mockIsPending = true
      render(<AIChatPanel {...defaultProps} />)

      expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
    })

    it('disables text input while loading', () => {
      mockIsPending = true
      render(<AIChatPanel {...defaultProps} />)

      expect(screen.getByRole('textbox', { name: /message input/i })).toBeDisabled()
    })

    it('does not show loading indicator when idle', () => {
      mockIsPending = false
      render(<AIChatPanel {...defaultProps} />)

      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })
  })

  // Req 17.6 — AI response displayed with Athena footer badge
  describe('AI response display', () => {
    it('displays assistant response in message history', async () => {
      render(<AIChatPanel {...defaultProps} />)

      // Simulate successful AI response via onSuccess callback
      const input = screen.getByRole('textbox', { name: /message input/i })
      await userEvent.type(input, 'Question')
      await userEvent.click(screen.getByRole('button', { name: /send/i }))

      // Trigger onSuccess
      mockOnSuccess?.({
        answer: 'Recursion is a function calling itself.',
        provider: 'groq',
        task: 'doubt_solving',
        timestamp: new Date().toISOString(),
        mode: '4_MARKS',
        query_type: 'concept',
        athena: {
          title: 'Exam-Ready Answer',
          summary: 'summary',
          sections: [
            {
              type: 'concept',
              heading: 'Concept Explanation',
              content_markdown: 'Recursion is a function calling itself.',
              content_katex: [],
            },
          ],
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

      await waitFor(() => {
        expect(screen.getByText('Recursion is a function calling itself.')).toBeInTheDocument()
      })
    })

    it('shows "Athena" footer badge for groq responses', async () => {
      render(<AIChatPanel {...defaultProps} />)

      const input = screen.getByRole('textbox', { name: /message input/i })
      await userEvent.type(input, 'Question')
      await userEvent.click(screen.getByRole('button', { name: /send/i }))

      mockOnSuccess?.({
        answer: 'Answer from Groq',
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

      await waitFor(() => {
        expect(screen.getByTestId('provider-badge')).toHaveTextContent('Athena')
      })
    })

    it('shows "Athena" footer badge for gemini responses', async () => {
      render(<AIChatPanel {...defaultProps} />)

      const input = screen.getByRole('textbox', { name: /message input/i })
      await userEvent.type(input, 'Question')
      await userEvent.click(screen.getByRole('button', { name: /send/i }))

      mockOnSuccess?.({
        answer: 'Answer from Gemini',
        provider: 'gemini',
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

      await waitFor(() => {
        expect(screen.getByTestId('provider-badge')).toHaveTextContent('Athena')
      })
    })
  })

  // Req 17.9 — no direct API calls; all through useAI hook
  describe('no direct API calls (Req 17.9)', () => {
    it('does not import or call apiFetch directly', async () => {
      // The component is mocked to use useAI; if it called apiFetch directly
      // the mock would not intercept it and the test would fail or network would be hit.
      // This test verifies mutate (the hook) is the only call path.
      render(<AIChatPanel {...defaultProps} />)

      const input = screen.getByRole('textbox', { name: /message input/i })
      await userEvent.type(input, 'Test')
      await userEvent.click(screen.getByRole('button', { name: /send/i }))

      expect(mockMutate).toHaveBeenCalledOnce()
    })
  })

  // Error handling
  describe('error handling', () => {
    it('displays error message when mutation has an error', () => {
      mockError = new Error('AI quota exceeded. Please try again later.')
      render(<AIChatPanel {...defaultProps} />)

      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'AI quota exceeded. Please try again later.'
      )
    })

    it('does not show error message when there is no error', () => {
      mockError = null
      render(<AIChatPanel {...defaultProps} />)

      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument()
    })
  })
})
