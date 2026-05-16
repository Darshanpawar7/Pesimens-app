/**
 * useAI hook
 *
 * Wraps Frontend_AI_Service using React Query's useMutation.
 * Requirements: 11.2, 11.3, 29.10
 */

import { useMutation } from '@tanstack/react-query'
import { askAI, AITask, AIResponse, AthenaAnswerMode } from '../services/aiService'
import { ApiError } from '../lib/api'

export interface UseAIOptions {
  onSuccess?: (data: AIResponse) => void
  onError?: (error: Error) => void
}

export function useAI(options?: UseAIOptions) {
  return useMutation<
    AIResponse,
    Error,
    { task: AITask; prompt: string; context?: string; mode?: AthenaAnswerMode }
  >({
    mutationFn: ({ task, prompt, context, mode }) => askAI(task, prompt, context, mode),
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    throwOnError: false,
  })
}

/**
 * Returns a user-friendly error message, with special handling for HTTP 429.
 */
export function getAIErrorMessage(error: Error | null): string | null {
  if (!error) return null
  if (error instanceof ApiError && error.status === 429) {
    return 'AI quota exceeded. Please try again later.'
  }
  if (/timed out/i.test(error.message)) {
    return 'Athena AI took too long to respond. Please retry.'
  }
  return error.message
}
