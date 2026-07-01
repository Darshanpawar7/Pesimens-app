/**
 * AIChatPanel component
 *
 * Chat interface for AI interactions. Uses the useAI hook exclusively for all AI requests.
 * Requirements: 17.1-17.9
 */

// @ts-nocheck

// @ts-ignore TS: allow unresolved imports in this workspace environment
import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
// @ts-ignore TS: allow unresolved imports in this workspace environment
import { Send, X, Loader2, Copy, Check, BookmarkCheck, Sparkles, Trash2 } from 'lucide-react'

// Minimal local JSX declaration to satisfy TypeScript when React types are unavailable.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any
    }
  }
}
import { useAI, getAIErrorMessage } from '../../hooks/useAI'
import { useAthenaHistory, useInsertAthenaHistory, useClearAthenaHistory } from '../../hooks/useAthenaHistory'
import { useAuthStore } from '@/store/auth'
import type { AITask, AIResponse, AthenaAnswerMode, AthenaPayload } from '../../services/aiService'

export interface AIChatPanelProps {
  taskType: 'doubt_solving' | 'pyq_explanation' | 'study_chat'
  context?: string
  onClose: () => void
  mode?: 'general' | 'exam'
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  provider?: 'groq' | 'gemini'
  athena?: AthenaPayload
  mode?: AthenaAnswerMode
}

function renderInlineMarkdown(text: string): ReactNode {
  const codeParts = text.split(/(`[^`]+`)/g)

  return codeParts.map((codePart, codeIndex) => {
    if (codePart.startsWith('`') && codePart.endsWith('`') && codePart.length > 2) {
      return (
        <code key={`inline-code-${codeIndex}`} className="ai-inline-code">
          {codePart.slice(1, -1)}
        </code>
      )
    }

    const boldParts = codePart.split(/(\*\*[^*]+\*\*)/g)
    return (
      <span key={`text-${codeIndex}`}>
        {boldParts.map((part, boldIndex) => {
          if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            return <strong key={`strong-${codeIndex}-${boldIndex}`}>{part.slice(2, -2)}</strong>
          }
          return <span key={`span-${codeIndex}-${boldIndex}`}>{part}</span>
        })}
      </span>
    )
  })
}

function parseMarkdownTableRow(line: string): string[] {
  const normalized = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return normalized.split('|').map(cell => cell.trim())
}

const TABLE_SEPARATOR_PATTERN = /^:?-{3,}:?$/
const HEADING_LINE_PATTERN = /^(#{1,6})\s+(.+)$/
const MINI_HEADING_LINE_PATTERN = /^([A-Za-z][A-Za-z0-9/&'()\- ]{1,46}):(?:\s+(.*))?$/
const BLOCKQUOTE_LINE_PATTERN = /^>\s?/
const RULE_LINE_PATTERN = /^([-*_]\s*){3,}$/

type ParsedMarkdownTable = {
  headers: string[]
  rows: string[][]
  nextIndex: number
}

type ParsedListItem = {
  level: number
  text: string
}

type ParsedListBlock = {
  ordered: boolean
  items: ParsedListItem[]
  nextIndex: number
}

type ListNode = {
  text: string
  children: ListNode[]
}

function parseListLine(rawLine: string): { ordered: boolean; level: number; text: string } | null {
  const match = rawLine.match(/^(\s*)([-*•]|\d+[.)])\s+(.*)$/)
  if (!match) return null

  const leading = match[1].replace(/\t/g, '    ')
  const marker = match[2]
  const text = match[3].trim()

  if (!text) return null

  return {
    ordered: /^\d/.test(marker),
    level: Math.floor(leading.length / 2),
    text,
  }
}

function parseListBlock(lines: string[], startIndex: number): ParsedListBlock | null {
  const firstLine = parseListLine(lines[startIndex])
  if (!firstLine) return null

  const ordered = firstLine.ordered
  const items: ParsedListItem[] = [{ level: 0, text: firstLine.text }]
  let index = startIndex + 1
  let lastLevel = 0

  while (index < lines.length) {
    const rawLine = lines[index]
    const trimmedLine = rawLine.trim()

    if (!trimmedLine) {
      index += 1
      break
    }

    const listLine = parseListLine(rawLine)
    if (listLine) {
      if (listLine.ordered !== ordered) break

      // Keep indentation tight and predictable even if the model emits uneven spaces.
      const normalizedLevel = Math.max(0, Math.min(listLine.level, lastLevel + 1))
      items.push({ level: normalizedLevel, text: listLine.text })
      lastLevel = normalizedLevel
      index += 1
      continue
    }

    const continuationIndent = rawLine.match(/^\s*/)?.[0].replace(/\t/g, '    ').length ?? 0
    if (continuationIndent > 0 && items.length > 0) {
      const lastItem = items[items.length - 1]
      lastItem.text = `${lastItem.text} ${trimmedLine}`
      index += 1
      continue
    }

    break
  }

  return { ordered, items, nextIndex: index }
}

function buildListTree(items: ParsedListItem[]): ListNode[] {
  const roots: ListNode[] = []
  const stack: Array<{ level: number; children: ListNode[] }> = [{ level: -1, children: roots }]

  for (const item of items) {
    while (stack.length > 1 && item.level <= stack[stack.length - 1].level) {
      stack.pop()
    }

    const node: ListNode = { text: item.text, children: [] }
    stack[stack.length - 1].children.push(node)
    stack.push({ level: item.level, children: node.children })
  }

  return roots
}

function renderListNodes(
  nodes: ListNode[],
  ordered: boolean,
  keyPrefix: string,
  depth: number,
): ReactNode {
  if (nodes.length === 0) return null

  const listClass = `ai-assistant-list ${ordered ? 'list-decimal' : 'list-disc'} ai-assistant-list-level-${Math.min(depth, 3)}`

  if (ordered) {
    return (
      <ol className={listClass}>
        {nodes.map((node, nodeIndex) => (
          <li key={`${keyPrefix}-oli-${depth}-${nodeIndex}`}>
            <span>{renderInlineMarkdown(node.text)}</span>
            {node.children.length > 0 ? renderListNodes(node.children, ordered, keyPrefix, depth + 1) : null}
          </li>
        ))}
      </ol>
    )
  }

  return (
    <ul className={listClass}>
      {nodes.map((node, nodeIndex) => (
        <li key={`${keyPrefix}-uli-${depth}-${nodeIndex}`}>
          <span>{renderInlineMarkdown(node.text)}</span>
          {node.children.length > 0 ? renderListNodes(node.children, ordered, keyPrefix, depth + 1) : null}
        </li>
      ))}
    </ul>
  )
}

function parseMiniHeadingLine(line: string): { heading: string; trailingText: string | null } | null {
  const match = line.match(MINI_HEADING_LINE_PATTERN)
  if (!match) return null

  const heading = match[1].trim()
  const trailingText = match[2]?.trim() || null
  if (heading.includes('://')) return null

  const words = heading.split(/\s+/).filter(Boolean)
  if (words.length > 8) return null

  return { heading, trailingText }
}

function isTableStart(lines: string[], startIndex: number): boolean {
  if (startIndex + 1 >= lines.length) return false

  const headerLine = lines[startIndex].trim()
  const separatorLine = lines[startIndex + 1].trim()

  if (!headerLine.includes('|') || !separatorLine.includes('|')) return false

  const separators = parseMarkdownTableRow(separatorLine)
  return separators.length > 0 && separators.every((segment) => TABLE_SEPARATOR_PATTERN.test(segment))
}

function parseMarkdownTable(lines: string[], startIndex: number): ParsedMarkdownTable | null {
  if (!isTableStart(lines, startIndex)) return null

  const headers = parseMarkdownTableRow(lines[startIndex])
  const rows: string[][] = []
  let index = startIndex + 2

  while (index < lines.length) {
    const rowLine = lines[index].trim()
    if (!rowLine || !rowLine.includes('|')) break
    rows.push(parseMarkdownTableRow(rowLine))
    index += 1
  }

  return { headers, rows, nextIndex: index }
}

function renderAssistantTextBlock(text: string, keyPrefix: string): ReactNode {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const nodes: ReactNode[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index].trim()
    if (!line) {
      index += 1
      continue
    }

    const headingMatch = line.match(HEADING_LINE_PATTERN)
    if (headingMatch) {
      nodes.push(
        <h3 key={`${keyPrefix}-h-${index}`} className="ai-assistant-heading">
          {renderInlineMarkdown(headingMatch[2])}
        </h3>,
      )
      index += 1
      continue
    }

    const miniHeading = parseMiniHeadingLine(line)
    if (miniHeading) {
      const itemKey = index
      nodes.push(
        <h4 key={`${keyPrefix}-mh-${itemKey}`} className="ai-assistant-mini-heading">
          {renderInlineMarkdown(miniHeading.heading)}
        </h4>,
      )

      if (miniHeading.trailingText) {
        nodes.push(
          <p key={`${keyPrefix}-mhp-${itemKey}`} className="ai-assistant-paragraph">
            {renderInlineMarkdown(miniHeading.trailingText)}
          </p>,
        )
      }

      index += 1
      continue
    }

    if (BLOCKQUOTE_LINE_PATTERN.test(line)) {
      const quoteLines: string[] = []
      while (index < lines.length) {
        const quoteLine = lines[index].trim()
        if (!quoteLine || !BLOCKQUOTE_LINE_PATTERN.test(quoteLine)) break
        quoteLines.push(quoteLine.replace(BLOCKQUOTE_LINE_PATTERN, '').trim())
        index += 1
      }

      nodes.push(
        <blockquote key={`${keyPrefix}-q-${index}`} className="ai-assistant-quote">
          {quoteLines.map((quote, quoteIndex) => (
            <p key={`${keyPrefix}-qline-${index}-${quoteIndex}`} className="ai-assistant-paragraph">
              {renderInlineMarkdown(quote)}
            </p>
          ))}
        </blockquote>,
      )
      continue
    }

    if (RULE_LINE_PATTERN.test(line)) {
      nodes.push(<hr key={`${keyPrefix}-hr-${index}`} className="ai-assistant-rule" />)
      index += 1
      continue
    }

    const parsedTable = parseMarkdownTable(lines, index)
    if (parsedTable) {
      nodes.push(
        <div key={`${keyPrefix}-table-${index}`} className="ai-table-wrap">
          <table className="ai-assistant-table">
            <thead>
              <tr>
                {parsedTable.headers.map((header, headerIndex) => (
                  <th key={`${keyPrefix}-th-${index}-${headerIndex}`}>{renderInlineMarkdown(header)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsedTable.rows.map((row, rowIndex) => (
                <tr key={`${keyPrefix}-tr-${index}-${rowIndex}`}>
                  {parsedTable.headers.map((_, colIndex) => (
                    <td key={`${keyPrefix}-td-${index}-${rowIndex}-${colIndex}`}>
                      {renderInlineMarkdown(row[colIndex] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      index = parsedTable.nextIndex
      continue
    }

    const parsedList = parseListBlock(lines, index)
    if (parsedList) {
      const listTree = buildListTree(parsedList.items)
      nodes.push(
        <div key={`${keyPrefix}-list-${index}`}>
          {renderListNodes(listTree, parsedList.ordered, keyPrefix, 0)}
        </div>,
      )
      index = parsedList.nextIndex
      continue
    }

    const paragraphLines: string[] = []
    while (index < lines.length) {
      const paragraphLine = lines[index].trim()

      if (!paragraphLine) {
        index += 1
        break
      }

      const startsStructuredBlock =
        HEADING_LINE_PATTERN.test(paragraphLine)
        || Boolean(parseMiniHeadingLine(paragraphLine))
        || BLOCKQUOTE_LINE_PATTERN.test(paragraphLine)
        || RULE_LINE_PATTERN.test(paragraphLine)
        || Boolean(parseListLine(lines[index]))
        || isTableStart(lines, index)

      if (startsStructuredBlock) break

      paragraphLines.push(paragraphLine)
      index += 1
    }

    if (paragraphLines.length > 0) {
      nodes.push(
        <p key={`${keyPrefix}-p-${index}`} className="ai-assistant-paragraph">
          {renderInlineMarkdown(paragraphLines.join(' '))}
        </p>,
      )
      continue
    }

    index += 1
  }

  if (nodes.length === 0) {
    return <p className="ai-assistant-paragraph">{text}</p>
  }

  return nodes
}

function renderAssistantContent(
  content: string,
  messageIndex: number,
  onCopyCode: (code: string, key: string) => void,
  copiedCodeKey: string | null,
): ReactNode {
  const segments: Array<{ type: 'text' | 'code'; lang?: string; value: string }> = []
  const codeFencePattern = /```([a-zA-Z0-9_+-]+)?\n([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = codeFencePattern.exec(content)) !== null) {
    const [fullMatch, lang, code] = match
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: content.slice(lastIndex, match.index) })
    }
    segments.push({ type: 'code', lang, value: code.trimEnd() })
    lastIndex = match.index + fullMatch.length
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'text', value: content.slice(lastIndex) })
  }

  if (segments.length === 0) {
    return renderAssistantTextBlock(content, 'single')
  }

  return segments.map((segment, index) => {
    if (segment.type === 'code') {
      const codeKey = `${messageIndex}-${index}`
      return (
        <div key={`code-${index}`} className="ai-code-block-wrap">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="ai-code-lang">{segment.lang ?? 'code'}</span>
            <button
              type="button"
              onClick={() => onCopyCode(segment.value, codeKey)}
              className="ai-copy-button"
              aria-label="Copy code"
            >
              {copiedCodeKey === codeKey ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedCodeKey === codeKey ? 'Copied' : 'Copy code'}</span>
            </button>
          </div>
          <pre className="ai-code-block"><code>{segment.value}</code></pre>
        </div>
      )
    }

    return <div key={`text-${index}`}>{renderAssistantTextBlock(segment.value, `text-${index}`)}</div>
  })
}

function getRelevanceClasses(label: AthenaPayload['exam_relevance']['label']): string {
  if (label === 'HIGH') return 'bg-white/10 text-white border-white/20'
  if (label === 'LOW') return 'bg-white/5 text-white/70 border-white/15'
  return 'bg-white/7 text-white/85 border-white/15'
}

function formatModeLabel(mode: AthenaAnswerMode): string {
  if (mode === '2_MARKS') return '2 Marks'
  if (mode === '4_MARKS') return '4 Marks'
  return 'Detailed'
}

function parseJsonLoose<T>(value: string): T | null {
  const stripped = value.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
  try {
    return JSON.parse(stripped) as T
  } catch {
    const match = stripped.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0]) as T
    } catch {
      return null
    }
  }
}

function unescapeJsonLikeText(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '')
    .replace(/\\"/g, '"')
    .trim()
}

function looksLikeAthenaJsonNoise(content: string): boolean {
  const trimmed = content.trim()
  if (!trimmed) return false

  if (trimmed.startsWith('{') && /"(query_type|answer|athena|sections|content_markdown|summary)"\s*:/.test(trimmed)) {
    return true
  }

  const jsonSignalCount = [
    '"query_type"',
    '"answer"',
    '"athena"',
    '"title"',
    '"summary"',
    '"sections"',
    '"content_markdown"',
  ].filter((token) => trimmed.includes(token)).length

  return jsonSignalCount >= 3 && /"[a-z_]+"\s*:/.test(trimmed)
}

function recoverTextFromAthenaJsonNoise(content: string): string | null {
  const trimmed = content.trim()
  if (!looksLikeAthenaJsonNoise(trimmed)) return null

  const recoveredChunks: string[] = []

  const summaryMatch = trimmed.match(/"summary"\s*:\s*"([\s\S]*?)"\s*,/i)
  if (summaryMatch?.[1]) {
    recoveredChunks.push(unescapeJsonLikeText(summaryMatch[1]))
  }

  const contentMarkdownMatches = Array.from(trimmed.matchAll(/"content_markdown"\s*:\s*"([\s\S]*?)"\s*(?:,|\})/gi))
    .map((match) => unescapeJsonLikeText(match[1] || ''))
    .filter(Boolean)
    .slice(0, 4)

  if (contentMarkdownMatches.length > 0) {
    recoveredChunks.push(...contentMarkdownMatches)
  }

  if (recoveredChunks.length === 0) {
    return 'Athena returned a partially formatted answer. Please send once more for a clean exam-ready response.'
  }

  return recoveredChunks.join('\n\n')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
}

function normalizeSectionType(type: unknown): AthenaPayload['sections'][number]['type'] {
  if (type === 'concept' || type === 'exam_writeup' || type === 'numerical' || type === 'pyq_insight' || type === 'tip') {
    return type
  }

  const normalized = asString(type).toLowerCase().replace(/\s+/g, '_')
  if (normalized === 'definition' || normalized === 'text') return 'concept'
  if (normalized === 'comparison' || normalized === 'steps') return 'exam_writeup'
  if (normalized === 'formula' || normalized === 'formulas' || normalized === 'given' || normalized === 'find' || normalized === 'final_answer') return 'numerical'
  return 'concept'
}

function normalizeExamRelevance(value: unknown): AthenaPayload['exam_relevance'] {
  const defaultReason = 'Recovered from provider payload'

  if (typeof value === 'string') {
    return {
      label: 'MEDIUM',
      reason: value,
      pyq_frequency: 0,
    }
  }

  if (!isRecord(value)) {
    return {
      label: 'MEDIUM',
      reason: defaultReason,
      pyq_frequency: 0,
    }
  }

  const rawLabel = asString(value.label, 'MEDIUM').toUpperCase()
  const label: AthenaPayload['exam_relevance']['label'] = rawLabel === 'HIGH' || rawLabel === 'LOW' ? rawLabel : 'MEDIUM'

  return {
    label,
    reason: asString(value.reason, defaultReason),
    pyq_frequency: typeof value.pyq_frequency === 'number' ? value.pyq_frequency : 0,
  }
}

function normalizeSources(value: unknown): AthenaPayload['sources'] {
  if (!Array.isArray(value)) return []

  const sources: AthenaPayload['sources'] = []

  for (const entry of value) {
    if (typeof entry === 'string') {
      sources.push({
        type: 'notes',
        title: entry,
      })
      continue
    }

    if (!isRecord(entry)) continue

    const rawType = asString(entry.type, 'notes').toLowerCase()
    const type: AthenaPayload['sources'][number]['type'] =
      rawType === 'pyq' || rawType === 'syllabus' ? rawType : 'notes'

    const title = asString(entry.title)
    if (!title) continue

    sources.push({
      type,
      title,
      ref: asString(entry.ref) || undefined,
      year: typeof entry.year === 'number' ? entry.year : undefined,
    })
  }

  return sources
}

function normalizeConfidence(value: unknown): AthenaPayload['confidence'] {
  if (typeof value === 'number') {
    const score = value > 1 ? value / 100 : value
    return {
      overall: Number.isFinite(score) ? Math.max(0, Math.min(1, score)) : 0.7,
      numerical_verification: 'caution',
      warnings: ['Recovered from non-standard confidence field.'],
    }
  }

  if (!isRecord(value)) {
    return {
      overall: 0.7,
      numerical_verification: 'caution',
      warnings: ['Recovered from raw JSON payload.'],
    }
  }

  const warnings = Array.isArray(value.warnings)
    ? value.warnings.map((warning) => asString(warning)).filter(Boolean)
    : []

  return {
    overall: typeof value.overall === 'number' ? value.overall : 0.7,
    numerical_verification: value.numerical_verification === 'verified' ? 'verified' : 'caution',
    warnings,
  }
}

function normalizeNumerical(value: unknown): AthenaPayload['numerical'] {
  const defaults: AthenaPayload['numerical'] = {
    is_numerical: false,
    given: [],
    find: [],
    formulas: [],
    steps: [],
    final_answer: { value: '', unit: '', precision: '3_sig_fig', boxed_katex: '' },
    sanity_check: { unit_check: 'pass', magnitude_check: 'pass', notes: '' },
  }

  if (!isRecord(value)) return defaults

  return {
    is_numerical: Boolean(value.is_numerical),
    given: Array.isArray(value.given)
      ? value.given
          .filter(isRecord)
          .map((entry) => ({
            symbol: asString(entry.symbol),
            value: entry.value as string | number | undefined,
            unit: asString(entry.unit) || undefined,
            description: asString(entry.description) || undefined,
          }))
          .filter((entry) => Boolean(entry.symbol))
      : [],
    find: Array.isArray(value.find)
      ? value.find
          .filter(isRecord)
          .map((entry) => ({
            symbol: asString(entry.symbol),
            value: entry.value as string | number | undefined,
            unit: asString(entry.unit) || undefined,
            description: asString(entry.description) || undefined,
          }))
          .filter((entry) => Boolean(entry.symbol))
      : [],
    formulas: Array.isArray(value.formulas)
      ? value.formulas
          .filter(isRecord)
          .map((entry) => ({
            name: asString(entry.name),
            expression_katex: asString(entry.expression_katex),
            reason: asString(entry.reason),
          }))
          .filter((entry) => Boolean(entry.name || entry.expression_katex))
      : [],
    steps: Array.isArray(value.steps)
      ? value.steps
          .filter(isRecord)
          .map((entry, stepIndex) => ({
            index: typeof entry.index === 'number' ? entry.index : stepIndex + 1,
            expression_katex: asString(entry.expression_katex),
            result_katex: asString(entry.result_katex),
          }))
          .filter((entry) => Boolean(entry.expression_katex || entry.result_katex))
      : [],
    final_answer: isRecord(value.final_answer)
      ? {
          value: asString(value.final_answer.value),
          unit: asString(value.final_answer.unit),
          precision: asString(value.final_answer.precision, '3_sig_fig'),
          boxed_katex: asString(value.final_answer.boxed_katex),
        }
      : defaults.final_answer,
    sanity_check: isRecord(value.sanity_check)
      ? {
          unit_check: value.sanity_check.unit_check === 'fail' ? 'fail' : 'pass',
          magnitude_check: value.sanity_check.magnitude_check === 'fail' ? 'fail' : 'pass',
          notes: asString(value.sanity_check.notes),
        }
      : defaults.sanity_check,
  }
}

function normalizeRecoveredAthena(payload: Partial<AthenaPayload> | Record<string, unknown>): AthenaPayload {
  const raw = isRecord(payload) ? payload : {}
  const rawSections = Array.isArray(raw.sections) ? raw.sections : []

  return {
    title: asString(raw.title, 'Exam-Ready Answer'),
    summary: asString(raw.summary),
    sections: rawSections
      .filter(isRecord)
      .map((section, sectionIndex) => ({
        type: normalizeSectionType(section.type),
        heading: asString(section.heading, `Section ${sectionIndex + 1}`),
        content_markdown: asString(section.content_markdown, asString(section.content, asString(section.value))),
        content_katex: Array.isArray(section.content_katex)
          ? section.content_katex.map((entry) => asString(entry)).filter(Boolean)
          : [],
      }))
      .filter((section) => Boolean(section.heading || section.content_markdown)),
    numerical: normalizeNumerical(raw.numerical),
    exam_relevance: normalizeExamRelevance(raw.exam_relevance),
    sources: normalizeSources(raw.sources),
    confidence: normalizeConfidence(raw.confidence),
  }
}

function polishEnglishText(text: string): string {
  if (!text.trim()) return text

  const replacements: Array<[RegExp, string]> = [
    [/\bdont\b/gi, "don't"],
    [/\bcant\b/gi, "can't"],
    [/\bwont\b/gi, "won't"],
    [/\bdoesnt\b/gi, "doesn't"],
    [/\bisnt\b/gi, "isn't"],
    [/\baren't\b/gi, "aren't"],
    [/\bim\b/gi, "I'm"],
    [/\bi\b/g, 'I'],
  ]

  return text
    .split('\n')
    .map((rawLine) => {
      if (!rawLine.trim()) return ''

      let line = rawLine.replace(/\s+/g, ' ').trim()

      const isMarkdownStructureLine =
        /^#{1,6}\s+/.test(line)
        || /^>\s?/.test(line)
        || /^```/.test(line)
        || /^\|.*\|$/.test(line)
        || /^([-*_]\s*){3,}$/.test(line)

      if (isMarkdownStructureLine) {
        return line
      }

      for (const [pattern, replacement] of replacements) {
        line = line.replace(pattern, replacement)
      }

      if (/^[a-z]/.test(line)) {
        line = `${line[0].toUpperCase()}${line.slice(1)}`
      }

      const isListLine = /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)
      if (!isListLine && /[a-zA-Z0-9]$/.test(line) && !/[.!?:]$/.test(line) && line.length > 28) {
        line += '.'
      }

      return line
    })
    .join('\n')
}

type JsonBlock = {
  start: number
  end: number
  text: string
}

function collectJsonBlocks(text: string): JsonBlock[] {
  const blocks: JsonBlock[] = []
  let depth = 0
  let start = -1
  let inString = false
  let escapeNext = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]

    if (inString) {
      if (escapeNext) {
        escapeNext = false
        continue
      }

      if (char === '\\') {
        escapeNext = true
        continue
      }

      if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === '{') {
      if (depth === 0) start = i
      depth += 1
      continue
    }

    if (char === '}' && depth > 0) {
      depth -= 1
      if (depth === 0 && start >= 0) {
        blocks.push({
          start,
          end: i + 1,
          text: text.slice(start, i + 1),
        })
        start = -1
      }
    }
  }

  return blocks
}

function extractAthenaCandidate(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null

  if (isRecord(value.athena)) {
    return value.athena
  }

  if (isRecord(value.answer)) {
    return value.answer
  }

  if (typeof value.answer === 'string') {
    const nestedParsed = parseJsonLoose<unknown>(value.answer)
    const nestedCandidate = extractAthenaCandidate(nestedParsed)
    if (nestedCandidate) return nestedCandidate
  }

  if (typeof value.title === 'string' || Array.isArray(value.sections)) {
    return value
  }

  return null
}

function extractAthenaPayloadsFromContent(content: string): AthenaPayload[] {
  const payloads: AthenaPayload[] = []
  const seen = new Set<string>()

  const rawCandidates = [
    content,
    ...collectJsonBlocks(content).map((block) => block.text),
  ]

  for (const candidate of rawCandidates) {
    const parsed = parseJsonLoose<unknown>(candidate)
    if (!parsed) continue

    const athenaCandidate = extractAthenaCandidate(parsed)
    if (!athenaCandidate) continue

    const normalized = normalizeRecoveredAthena(athenaCandidate)
    const signature = `${normalized.title}::${normalized.summary}::${normalized.sections.map((section) => `${section.heading}:${section.content_markdown}`).join('|')}`

    if (seen.has(signature)) continue
    if (!normalized.summary && normalized.sections.length === 0) continue

    seen.add(signature)
    payloads.push(normalized)
  }

  return payloads
}

function buildReadableRecoveredAnswers(payloads: AthenaPayload[], preface?: string): string {
  const parts: string[] = []

  if (preface?.trim()) {
    parts.push(polishEnglishText(preface.trim()))
  }

  payloads.forEach((payload, payloadIndex) => {
    parts.push(buildReadableRecoveredAnswer(payload))
    if (payloadIndex < payloads.length - 1) {
      parts.push('---')
    }
  })

  return parts.join('\n\n').trim()
}

function extractPrefaceText(content: string): string {
  const blocks = collectJsonBlocks(content)
  if (blocks.length === 0) return content.trim()

  const firstBlock = blocks[0]
  return content.slice(0, firstBlock.start).trim()
}

function normalizeAssistantResponse(answer: string, athena?: AthenaPayload): { content: string; athena?: AthenaPayload } {
  if (athena) {
    const normalized = normalizeRecoveredAthena(athena)
    return {
      content: buildReadableRecoveredAnswer(normalized),
      athena: normalized,
    }
  }

  const recoveredPayloads = extractAthenaPayloadsFromContent(answer)

  if (recoveredPayloads.length === 1) {
    return {
      content: buildReadableRecoveredAnswer(recoveredPayloads[0]),
      athena: recoveredPayloads[0],
    }
  }

  if (recoveredPayloads.length > 1) {
    const preface = extractPrefaceText(answer)
    return {
      content: buildReadableRecoveredAnswers(recoveredPayloads, preface),
    }
  }

  const recoveredFromNoise = recoverTextFromAthenaJsonNoise(answer)
  if (recoveredFromNoise) {
    return { content: polishEnglishText(recoveredFromNoise) }
  }

  return { content: polishEnglishText(answer) }
}

function sanitizeAthenaSectionContent(content: string): string {
  const trimmed = content.trim()
  if (!trimmed) return ''

  const nestedPayloads = extractAthenaPayloadsFromContent(trimmed)
  if (nestedPayloads.length > 0) {
    return buildReadableRecoveredAnswers(nestedPayloads)
  }

  const recoveredFromNoise = recoverTextFromAthenaJsonNoise(trimmed)
  if (recoveredFromNoise) {
    return polishEnglishText(recoveredFromNoise)
  }

  return polishEnglishText(trimmed)
}

function buildReadableRecoveredAnswer(athena: AthenaPayload): string {
  // Allow headings and rich formatting.
  const parts: string[] = []
  
  const isTemplateSummary = /structured 4-mark response|exam-oriented structure|short, conversational answer/i.test(athena.summary)
  if (athena.summary && !isTemplateSummary) {
    parts.push(polishEnglishText(athena.summary))
  }

  for (const section of athena.sections) {
    if (section.heading) {
      parts.push(`### ${section.heading}`)
    }
    const cleaned = sanitizeAthenaSectionContent(section.content_markdown)
    if (cleaned) parts.push(cleaned)
  }

  if (athena.numerical?.is_numerical) {
    if (athena.numerical.formulas && athena.numerical.formulas.length > 0) {
      parts.push('**Formulas:**\n\n' + athena.numerical.formulas.map(f => `*${f.name}*: \`${f.expression_katex}\` - ${f.reason}`).join('\n\n'))
    }
    if (athena.numerical.steps && athena.numerical.steps.length > 0) {
      parts.push('**Steps:**\n\n' + athena.numerical.steps.map(s => `**Step ${s.index}:**\n\`${s.expression_katex}\`\n\`${s.result_katex}\``).join('\n\n'))
    }
    if (athena.numerical.final_answer?.value) {
      parts.push(`**Final Answer:**\n\n\`${athena.numerical.final_answer.boxed_katex || athena.numerical.final_answer.value} ${athena.numerical.final_answer.unit || ''}\``)
    }
  }

  return parts.join('\n\n').trim()
}

function recoverAthenaFromContent(content: string): AthenaPayload | null {
  const payloads = extractAthenaPayloadsFromContent(content)
  return payloads.length > 0 ? payloads[0] : null
}

export function AIChatPanel({ taskType, context, onClose, mode = 'exam' }: AIChatPanelProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null)
  const [copiedCodeKey, setCopiedCodeKey] = useState<string | null>(null)
  const [savedMessageIndex, setSavedMessageIndex] = useState<number | null>(null)
  const answerMode: AthenaAnswerMode = mode === 'general' ? '2_MARKS' : '4_MARKS'
  const [keyboardInset, setKeyboardInset] = useState(0)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: history, isPending: isHistoryLoading } = useAthenaHistory(taskType as AITask)
  const insertMessage = useInsertAthenaHistory()
  const clearHistory = useClearAthenaHistory()

  useEffect(() => {
    if (history && history.length > 0 && messages.length === 0) {
      setMessages(
        history.map(msg => ({
          role: msg.role,
          content: msg.content,
          provider: msg.provider || undefined,
          athena: msg.athena_payload || undefined,
          mode: msg.mode || undefined,
        }))
      )
    }
  }, [history])

  const mutation = useAI({
    onSuccess: (data: AIResponse) => {
      const normalizedResponse = normalizeAssistantResponse(data.answer, data.athena)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: normalizedResponse.content,
          provider: data.provider,
          athena: normalizedResponse.athena,
          mode: data.mode ?? '4_MARKS',
        },
      ])

      insertMessage.mutate({
        task_type: taskType as AITask,
        role: 'assistant',
        content: normalizedResponse.content,
        provider: data.provider,
        athena_payload: normalizedResponse.athena,
        mode: data.mode ?? '4_MARKS',
      })
    },
  })

  const { profile } = useAuthStore()

  useEffect(() => {
    const endElement = messagesEndRef.current
    if (endElement && typeof endElement.scrollIntoView === 'function') {
      endElement.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, mutation.isPending])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateViewportType = () => {
      setIsMobileViewport(window.matchMedia('(max-width: 767px)').matches)
    }

    updateViewportType()
    window.addEventListener('resize', updateViewportType)
    return () => window.removeEventListener('resize', updateViewportType)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return

    const viewport = window.visualViewport
    const updateKeyboardInset = () => {
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
      setKeyboardInset(inset)
    }

    updateKeyboardInset()
    viewport.addEventListener('resize', updateKeyboardInset)
    viewport.addEventListener('scroll', updateKeyboardInset)

    return () => {
      viewport.removeEventListener('resize', updateKeyboardInset)
      viewport.removeEventListener('scroll', updateKeyboardInset)
    }
  }, [])

  const starterPrompts = useMemo(() => {
    if (mode === 'general') {
      return [
        'How are you?',
        'What is the weather in Bengaluru today?',
        'Tell me a fun fact about space',
        'Explain machine learning in simple terms',
      ]
    }

    if (taskType === 'pyq_explanation') {
      return [
        'Important topics for ISA 1 in Math?',
        'Explain Laplace Transform in 4 marks format',
        'Most repeated questions in Unit 3',
        'Solve this numerical step-by-step',
      ]
    }

    if (taskType === 'study_chat') {
      return [
        'What should I study tonight for ISA?',
        'Give me a 2-mark and 4-mark answer for this concept',
        'List high-probability questions from this chapter',
        'Solve this numerical with units and final boxed answer',
      ]
    }

    return [
      'Important topics for ISA 1 in Math?',
      'Explain in 4 marks format',
      'Most repeated questions in Unit 3',
      'Solve this numerical step-by-step',
    ]
  }, [mode, taskType])

  const submitPrompt = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || mutation.isPending) return

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }])
    setInput('')
    
    insertMessage.mutate({
      task_type: taskType as AITask,
      role: 'user',
      content: trimmed,
    })

    mutation.mutate({ task: taskType as AITask, prompt: trimmed, context, mode: answerMode })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitPrompt(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const copyText = async (text: string): Promise<boolean> => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return true
      }

      if (typeof document !== 'undefined') {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        textArea.style.pointerEvents = 'none'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        const success = document.execCommand('copy')
        document.body.removeChild(textArea)
        return success
      }
    } catch {
      return false
    }

    return false
  }

  const handleCopyMessage = async (content: string, messageIndex: number) => {
    const copied = await copyText(content)
    if (!copied) return

    setCopiedMessageIndex(messageIndex)
    window.setTimeout(() => setCopiedMessageIndex((prev) => (prev === messageIndex ? null : prev)), 1600)
  }

  const handleCopyCode = async (code: string, codeKey: string) => {
    const copied = await copyText(code)
    if (!copied) return

    setCopiedCodeKey(codeKey)
    window.setTimeout(() => setCopiedCodeKey((prev) => (prev === codeKey ? null : prev)), 1600)
  }

  const handleSaveAnswer = (message: Message, messageIndex: number) => {
    const recoveredAthena = message.athena ?? recoverAthenaFromContent(message.content)
    if (!recoveredAthena || typeof window === 'undefined') return

    const storageKey = 'athena_saved_notes'
    const current = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]') as unknown[]
    const entry = {
      savedAt: new Date().toISOString(),
      mode: message.mode,
      title: recoveredAthena.title,
      summary: recoveredAthena.summary,
      sections: recoveredAthena.sections,
      sources: recoveredAthena.sources,
    }

    window.localStorage.setItem(storageKey, JSON.stringify([entry, ...current].slice(0, 100)))
    setSavedMessageIndex(messageIndex)
    window.setTimeout(() => {
      setSavedMessageIndex((prev) => (prev === messageIndex ? null : prev))
    }, 1700)
  }

  const errorMessage = getAIErrorMessage(mutation.error)
  const mobileLift = isMobileViewport ? Math.max(0, keyboardInset) : 0

  return (
    <div className="relative grid h-[min(640px,86vh)] w-full grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-t-2xl border border-white/10 bg-[#050505] shadow-[0_28px_90px_rgba(0,0,0,0.75)] sm:h-[min(680px,88vh)] md:rounded-2xl md:h-[min(760px,88vh)]"
      style={{
        maxHeight: 'calc(100dvh - 4.25rem - env(safe-area-inset-bottom, 0px))',
        transform: mobileLift > 0 ? `translateY(-${mobileLift}px)` : undefined,
        transition: 'transform 120ms ease-out',
      }}
    >
      <div className="pointer-events-none absolute -right-20 top-20 h-60 w-60 rounded-full bg-white/5 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/7 blur-3xl" />

      <div className="relative border-b border-white/10 bg-[#0b0b0b] px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src="/athena-ai-logo-v2.jpeg"
                alt="Athena AI Logo"
                className="h-9 w-9 rounded-xl border border-white/15 object-cover shadow-[0_0_24px_rgba(255,255,255,0.08)]"
              />
              <span className="absolute -bottom-1 -right-1 rounded-full border border-white/20 bg-black p-0.5">
                <Sparkles className="h-2.5 w-2.5 text-white" />
              </span>
            </div>
            <div>
              <span className="text-[15px] font-semibold tracking-tight text-white">Athena AI</span>
              <p className="text-[11px] text-white/60">{mode === 'general' ? 'A calm conversational assistant' : 'Exam assistant tuned for PESU patterns'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (window.confirm('Clear conversation history for this task?')) {
                  clearHistory.mutate(taskType as AITask)
                  setMessages([])
                }
              }}
              title="Clear history"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        className="min-h-0 overflow-y-auto overscroll-contain space-y-3.5 px-3 py-3.5 md:px-4"
        role="log"
        aria-live="polite"
      >
        {isHistoryLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-white/40" />
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-white/55">{mode === 'general' ? 'Chat with Athena' : 'Athena Exam Studio'}</p>
                <h3 className="mt-2 text-base font-semibold text-white">{mode === 'general' ? 'Ask me anything' : 'Stop Googling. Ask Athena.'}</h3>
                <p className="mt-1 text-sm text-white/68">{mode === 'general' ? 'Natural, direct answers for everyday questions and quick help.' : 'Get answers exactly in exam format, with PYQ context and numerical verification.'}</p>
              </div>
              <img src="/athena-ai-logo-v2.jpeg" alt="Athena AI" className="h-14 w-14 rounded-2xl border border-white/15 object-cover" />
            </div>
            <div className="mt-3">
              <p className="text-sm text-white/80">Hi {profile?.display_name ? profile.display_name : 'there'}, how can I assist you today?</p>
            </div>
          </div>
        ) : null}

        {messages.map((msg, i) => {
          const recoveredAthena = msg.athena ?? (msg.role === 'assistant' ? recoverAthenaFromContent(msg.content) : null)

          return (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[92%] md:max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-[0_6px_22px_rgba(0,0,0,0.2)] ${
                msg.role === 'user'
                  ? 'bg-white text-black border border-white/20'
                  : 'ai-assistant-response-surface text-white/92 border border-white/12'
              }`}
            >
              {msg.role === 'assistant' ? (
                // Present assistant responses as plain flowing prose (Claude-like).
                <div className="ai-assistant-prose break-words">
                  {renderAssistantContent(msg.content, i, handleCopyCode, copiedCodeKey)}
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              )}

              {msg.role === 'assistant' && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => handleCopyMessage(msg.content, i)} className="ai-copy-button" aria-label="Copy full message">
                    {copiedMessageIndex === i ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedMessageIndex === i ? 'Copied' : 'Copy message'}</span>
                  </button>

                  {mode === 'exam' && (
                    <button type="button" onClick={() => handleSaveAnswer(msg, i)} className="ai-copy-button" aria-label="Save to notes">
                      {savedMessageIndex === i ? <Check className="h-3.5 w-3.5" /> : <BookmarkCheck className="h-3.5 w-3.5" />}
                      <span>{savedMessageIndex === i ? 'Saved' : 'Save to My Notes'}</span>
                    </button>
                  )}

                  <span className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/78" data-testid="provider-badge">
                    <img src="/athena-ai-logo-v2.jpeg" alt="Athena" className="h-3 w-3 rounded-full object-cover" />
                    Athena
                  </span>
                </div>
              )}
            </div>
          </div>
          )
        })}

        {mutation.isPending && (
          <div className="flex justify-start" data-testid="loading-indicator" aria-label="Loading">
            <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] px-3 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-white/70" />
              <span className="text-xs text-white/70">{mode === 'general' ? 'Athena is thinking...' : 'Athena is drafting your exam-writeup...'}</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div role="alert" data-testid="error-message" className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
            {errorMessage}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t border-white/10 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] md:px-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-2.5 py-2">
            <img src="/athena-ai-logo-v2.jpeg" alt="Athena" className="h-6 w-6 rounded-full object-cover" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Athena anything about your syllabus..."
              disabled={mutation.isPending}
              aria-label="Message input"
              className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder-white/35 outline-none disabled:opacity-50"
              style={{ fontSize: '16px' }}
            />
          </div>
          <button
            type="submit"
            disabled={mutation.isPending || !input.trim()}
            aria-label="Send"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white text-black transition hover:bg-white/90 disabled:opacity-40"
          >
            {mutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />
            }
          </button>
        </form>
      </div>
    </div>
  )
}
