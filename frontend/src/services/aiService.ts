/**
 * Frontend AI Service
 *
 * Calls the backend AI route via apiFetch.
 * Requirements: 11.1, 11.4
 */

import { apiFetch, API_URL } from '../lib/api'
import { getPesimensAccessToken } from '../lib/accessToken'

export type AITask = 'doubt_solving' | 'pyq_explanation' | 'study_chat' | 'summarization'
export type AthenaAnswerMode = '2_MARKS' | '4_MARKS' | 'DETAILED'
export type AthenaQueryType = 'concept' | 'numerical' | 'mixed' | 'expected_questions'

export interface AthenaSection {
  type: 'concept' | 'exam_writeup' | 'numerical' | 'pyq_insight' | 'tip'
  heading: string
  content_markdown: string
  content_katex: string[]
}

export interface AthenaPayload {
  title: string
  summary: string
  sections: AthenaSection[]
  numerical: {
    is_numerical: boolean
    given: Array<{ symbol: string; value?: number | string; unit?: string; description?: string }>
    find: Array<{ symbol: string; value?: number | string; unit?: string; description?: string }>
    formulas: Array<{ name: string; expression_katex: string; reason: string }>
    steps: Array<{ index: number; expression_katex: string; result_katex: string }>
    final_answer: { value: string; unit: string; precision: string; boxed_katex: string }
    sanity_check: { unit_check: 'pass' | 'fail'; magnitude_check: 'pass' | 'fail'; notes: string }
  }
  exam_relevance: {
    label: 'HIGH' | 'MEDIUM' | 'LOW'
    reason: string
    pyq_frequency: number
  }
  sources: Array<{ type: 'notes' | 'pyq' | 'syllabus'; title: string; ref?: string; year?: number }>
  confidence: {
    overall: number
    numerical_verification: 'verified' | 'caution'
    warnings: string[]
  }
}

export interface AIResponse {
  answer: string
  provider: 'groq' | 'gemini'
  task: string
  timestamp: string
  mode: AthenaAnswerMode
  query_type: AthenaQueryType
  athena: AthenaPayload
  ui_meta: {
    brand_label: 'Athena'
    save_supported: boolean
  }
}

const AI_REQUEST_TIMEOUT_MS = 32000

/**
 * Send an AI request to the backend (non-streaming).
 *
 * @param task - The AI task type
 * @param prompt - The user prompt
 * @param context - Optional context string
 * @returns Parsed AIResponse object
 */
export async function askAI(
  task: AITask,
  prompt: string,
  context?: string,
  mode: AthenaAnswerMode = '4_MARKS'
): Promise<AIResponse> {
  const requestPromise = apiFetch<{ ok: true; data: AIResponse }>('/api/v1/ai', {
    method: 'POST',
    body: JSON.stringify({ task, prompt, context, mode }),
  })

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('AI request timed out. Please try again.')), AI_REQUEST_TIMEOUT_MS)
  })

  const res = await Promise.race([requestPromise, timeoutPromise])
  return res.data
}

/**
 * Stream an AI response from the backend using SSE (Server-Sent Events).
 * Falls back to the non-streaming askAI() if the backend doesn't support SSE.
 *
 * @param task - The AI task type
 * @param prompt - The user prompt
 * @param context - Optional context string
 * @param mode - Answer mode
 * @param onChunk - Callback called with each text chunk as it arrives
 * @param onDone - Callback called when streaming is complete with the full response
 * @param onError - Callback called if an error occurs
 * @param signal - AbortSignal to cancel the stream
 */
export async function askAIStream(
  task: AITask,
  prompt: string,
  context: string | undefined,
  mode: AthenaAnswerMode = '4_MARKS',
  onChunk: (chunk: string) => void,
  onDone: (fullText: string) => void,
  onError: (error: Error) => void,
  signal?: AbortSignal
): Promise<void> {
  const token = getPesimensAccessToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(`${API_URL}/api/v1/ai/stream`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ task, prompt, context, mode }),
      signal,
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') return
    // Network error or SSE not available — fall back to non-streaming
    try {
      const fallbackResult = await askAI(task, prompt, context, mode)
      onChunk(fallbackResult.answer)
      onDone(fallbackResult.answer)
    } catch (fallbackErr) {
      onError(fallbackErr instanceof Error ? fallbackErr : new Error('AI request failed'))
    }
    return
  }

  // If backend doesn't support SSE, fall back gracefully
  if (!response.ok || !response.body || response.status === 404 || response.status === 405) {
    try {
      const fallbackResult = await askAI(task, prompt, context, mode)
      onChunk(fallbackResult.answer)
      onDone(fallbackResult.answer)
    } catch (fallbackErr) {
      onError(fallbackErr instanceof Error ? fallbackErr : new Error('AI request failed'))
    }
    return
  }

  // Read the SSE stream
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === ':') continue

        if (trimmed.startsWith('data:')) {
          const data = trimmed.slice(5).trim()
          if (data === '[DONE]') {
            onDone(fullText)
            return
          }
          try {
            const parsed = JSON.parse(data) as { chunk?: string; text?: string; content?: string }
            const chunk = parsed.chunk ?? parsed.text ?? parsed.content ?? ''
            if (chunk) {
              fullText += chunk
              onChunk(chunk)
            }
          } catch {
            // Plain text chunk (not JSON)
            if (data) {
              fullText += data
              onChunk(data)
            }
          }
        }
      }
    }

    onDone(fullText)
  } catch (err) {
    if ((err as Error).name === 'AbortError') return
    onError(err instanceof Error ? err : new Error('Stream reading failed'))
  } finally {
    reader.releaseLock()
  }
}
