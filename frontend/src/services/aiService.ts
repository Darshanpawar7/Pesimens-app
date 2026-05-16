/**
 * Frontend AI Service
 *
 * Calls the backend AI route via apiFetch.
 * Requirements: 11.1, 11.4
 */

import { apiFetch } from '../lib/api'

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
 * Send an AI request to the backend.
 *
 * @param task - The AI task type
 * @param prompt - The user prompt
 * @param context - Optional context string
 * @returns Parsed AI_Response object
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
