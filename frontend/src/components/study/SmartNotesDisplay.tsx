import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { apiFetch } from '@/lib/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

interface UnitSmartNote {
  id: string
  subject: string
  exam_type: 'ISA1' | 'ISA2' | 'ESA'
  unit_number: number
  summary: string
  key_concepts: string[]
  definitions: Array<{ term: string; definition: string }>
  formulas: Array<{ name: string; formula: string; explanation?: string }>
  mcqs: Array<{ question: string; options: string[]; correct_answer: string; explanation?: string }>
  theory_questions_2mark: string[]
  theory_questions_4mark: string[]
  theory_questions_8mark: string[]
  numerical_problems: Array<{ problem: string; solution?: string }>
  high_priority_topics: string[]
  medium_priority_topics: string[]
  exam_tips: string[]
  time_allocation_suggestion: string
  generated_at: string
}

interface BackendSmartNotesPayload {
  id: string
  smart_summary: string
  key_concepts?: Array<{ concept: string; unit: number }>
  important_definitions?: Array<{ term: string; definition: string; unit: number }>
  formulas?: Array<{ name: string; formula_latex: string; description?: string; unit: number }>
  mcq_1mark?: Array<{ question: string; options: string[]; answer: string; explanation?: string; unit: number }>
  mcq_2mark?: Array<{ question: string; options: string[]; answer: string; explanation?: string; unit: number }>
  theory_2mark?: Array<{ question: string; answer?: string; unit: number }>
  theory_4mark?: Array<{ question: string; answer?: string; unit: number }>
  theory_8mark?: Array<{ question: string; answer?: string; unit: number }>
  numerical_problems?: Array<{ question: string; solution?: string; unit: number }>
  high_priority_topics?: Array<{ topic: string; unit: number }>
  medium_priority_topics?: Array<{ topic: string; unit: number }>
  exam_tips?: string[]
  time_allocation?: Record<string, number>
  generated_at?: string
  updated_at?: string
}

interface SmartNotesResponse {
  ok: true
  smart_notes: BackendSmartNotesPayload
}

interface Props {
  subject: string
  course: string
  examType: 'ISA1' | 'ISA2'
  materialsCount?: number
}

export function SmartNotesDisplay({ subject, course, examType, materialsCount = 0 }: Props) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null)

  const normalizedSubject = subject.trim()
  const normalizedCourse = course.trim()

  const notesQuery = useQuery({
    queryKey: ['unit-smart-notes', normalizedSubject, normalizedCourse, examType],
    queryFn: () =>
      apiFetch<SmartNotesResponse>(
        `/api/study-materials/smart-notes?subject=${encodeURIComponent(normalizedSubject)}&course=${encodeURIComponent(normalizedCourse)}&exam_type=${examType}`
      ),
    enabled: Boolean(normalizedSubject && normalizedCourse),
    staleTime: 5 * 60 * 1000,
  })

  const generateMutation = useMutation({
    mutationFn: () =>
      apiFetch('/api/study-materials/generate-smart-notes', {
        method: 'POST',
        body: JSON.stringify({ subject, course, exam_type: examType }),
      }),
    onSuccess: () => {
      toast({ variant: 'success', title: 'Smart notes generated successfully!' })
      queryClient.invalidateQueries({ queryKey: ['unit-smart-notes', normalizedSubject, normalizedCourse, examType] })
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Something went wrong'
      const notReady = message.toLowerCase().includes('no materials found') || message.toLowerCase().includes('smart notes not found')

      toast({
        variant: 'error',
        title: notReady ? 'Smart notes are not ready yet' : 'Failed to generate smart notes',
        description: notReady
          ? materialsCount > 0
            ? 'Uploaded notes/slides are present, but smart notes have not been generated for this subject and exam yet. Try again after the upload finishes or use OCR recovery for image-only PDFs.'
            : 'Upload notes/slides first, then generate smart notes for this subject and exam.'
          : message,
      })
    },
  })

  const units = examType === 'ISA1' ? [1, 2] : [3, 4]
  const payload = notesQuery.data?.smart_notes

  const notes = useMemo<UnitSmartNote[]>(() => {
    if (!payload) return []

    const generatedAt = payload.generated_at || payload.updated_at || new Date().toISOString()
    return units.map((unit) => {
      const mcqsRaw = [
        ...(payload.mcq_1mark ?? []).filter((q) => q.unit === unit),
        ...(payload.mcq_2mark ?? []).filter((q) => q.unit === unit),
      ]

      const mcqs = mcqsRaw.map((q) => {
        const answerLetter = (q.answer || '').trim().toUpperCase()
        const answerIndex = answerLetter.length === 1 ? answerLetter.charCodeAt(0) - 65 : -1
        const correctAnswer = answerIndex >= 0 && answerIndex < q.options.length
          ? q.options[answerIndex]
          : q.answer

        return {
          question: q.question,
          options: q.options,
          correct_answer: correctAnswer,
          explanation: q.explanation,
        }
      })

      return {
        id: `${payload.id}-unit-${unit}`,
        subject,
        exam_type: examType,
        unit_number: unit,
        summary: payload.smart_summary,
        key_concepts: (payload.key_concepts ?? []).filter((k) => k.unit === unit).map((k) => k.concept),
        definitions: (payload.important_definitions ?? []).filter((d) => d.unit === unit).map((d) => ({ term: d.term, definition: d.definition })),
        formulas: (payload.formulas ?? []).filter((f) => f.unit === unit).map((f) => ({ name: f.name, formula: f.formula_latex, explanation: f.description })),
        mcqs,
        theory_questions_2mark: (payload.theory_2mark ?? []).filter((q) => q.unit === unit).map((q) => q.question),
        theory_questions_4mark: (payload.theory_4mark ?? []).filter((q) => q.unit === unit).map((q) => q.question),
        theory_questions_8mark: (payload.theory_8mark ?? []).filter((q) => q.unit === unit).map((q) => q.question),
        numerical_problems: (payload.numerical_problems ?? []).filter((q) => q.unit === unit).map((q) => ({ problem: q.question, solution: q.solution })),
        high_priority_topics: (payload.high_priority_topics ?? []).filter((q) => q.unit === unit).map((q) => q.topic),
        medium_priority_topics: (payload.medium_priority_topics ?? []).filter((q) => q.unit === unit).map((q) => q.topic),
        exam_tips: payload.exam_tips ?? [],
        time_allocation_suggestion: payload.time_allocation?.[`unit${unit}`] ? `${payload.time_allocation[`unit${unit}`]} mins` : '',
        generated_at: generatedAt,
      }
    }).filter((note) => (
      note.key_concepts.length > 0 ||
      note.definitions.length > 0 ||
      note.formulas.length > 0 ||
      note.mcqs.length > 0 ||
      note.theory_questions_2mark.length > 0 ||
      note.theory_questions_4mark.length > 0 ||
      note.theory_questions_8mark.length > 0 ||
      note.numerical_problems.length > 0
    ))
  }, [payload, subject, examType, units])

  const selectedNote = notes.find((n) => n.unit_number === selectedUnit)

  const isFresh = (generatedAt: string) => {
    return Date.now() - new Date(generatedAt).getTime() < 7 * 24 * 60 * 60 * 1000
  }

  useEffect(() => {
    if (!selectedUnit && notes.length > 0) {
      setSelectedUnit(notes[0].unit_number)
    }
  }, [selectedUnit, notes])

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#2a2a2a] bg-[linear-gradient(180deg,#141414_0%,#101010_100%)] p-5 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.9)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">
              🧠 SmartNotes
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">{subject} Study Guide</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#b7c0d4]">
                {examType === 'ISA1' ? 'Units 1-2' : 'Units 3-4'} with summary, concepts, definitions, formulas, questions, and exam tips.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-[#c9d1df]">
              <span className="rounded-full border border-[#2a2a2a] bg-[#111111] px-3 py-1">Course: {course || 'Unknown'}</span>
              <span className="rounded-full border border-[#2a2a2a] bg-[#111111] px-3 py-1">Uploads: {materialsCount}</span>
              <span className="rounded-full border border-[#2a2a2a] bg-[#111111] px-3 py-1">Mode: {examType}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {generateMutation.isPending ? 'Generating...' : '✨ Generate Smart Notes'}
            </Button>
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-xs text-[#b7c0d4]">
              {materialsCount > 0
                ? 'Notes/slides are uploaded. If generation fails, enable OCR recovery only for image-heavy PDFs.'
                : 'Upload notes/slides first, then generate the guide.'}
            </div>
          </div>
        </div>
      </section>

      {/* Unit Selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {units.map((unit) => {
          const unitNote = notes.find((n) => n.unit_number === unit)
          const fresh = unitNote && isFresh(unitNote.generated_at)
          return (
            <button
              key={unit}
              onClick={() => setSelectedUnit(unit)}
              className={[
                'rounded-xl border px-4 py-2 text-sm font-semibold transition-colors',
                selectedUnit === unit
                  ? 'border-violet-400 bg-violet-500/20 text-white'
                  : 'border-[#2a2a2a] bg-[#151515] text-[#bcc5d6] hover:border-[#3a3a3a] hover:text-white',
              ].join(' ')}
            >
              Unit {unit}
              {fresh && <span className="ml-2">✨</span>}
            </button>
          )
        })}
      </div>

      {/* Loading State */}
      {notesQuery.isLoading && (
        <div className="rounded-3xl border border-[#2a2a2a] bg-[#151515] p-10 text-center text-[#cad2e1] shadow-[0_18px_36px_-30px_rgba(0,0,0,0.8)]">
          Loading smart notes...
        </div>
      )}

      {/* Empty State */}
      {!notesQuery.isLoading && notes.length === 0 && (
        <div className="rounded-3xl border border-[#2a2a2a] bg-[linear-gradient(180deg,#151515_0%,#121212_100%)] p-8 text-center text-[#cad2e1] shadow-[0_18px_36px_-30px_rgba(0,0,0,0.8)]">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-500/10 text-xl">
            ✨
          </div>
          <p className="text-lg font-semibold text-white">
            {materialsCount > 0 ? 'Smart notes are not generated yet' : 'No smart notes generated yet'}
          </p>
          <p className="mt-2 text-sm text-[#b7c0d4]">
            {materialsCount > 0
              ? 'Uploaded notes/slides are available, but the AI note generation step has not produced a final guide yet. Use Generate Smart Notes or enable OCR recovery for image-only PDFs.'
              : 'Upload your notes/slides PDFs first, then generate a comprehensive study guide from the uploaded material.'}
          </p>
        </div>
      )}

      {/* Content */}
      {selectedNote && (
        <div className="space-y-5">
          {/* Summary */}
          <section className="rounded-2xl border border-[#2a2a2a] bg-[#151515] p-5">
            <h3 className="text-lg font-semibold text-white">📋 Summary</h3>
            <div className="prose prose-invert prose-sm md:prose-base max-w-none mt-3 break-words text-[#e4e9f2]">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                {selectedNote.summary}
              </ReactMarkdown>
            </div>
          </section>

          {/* Key Concepts */}
          {selectedNote.key_concepts.length > 0 && (
            <section className="rounded-2xl border border-[#2a2a2a] bg-[#151515] p-5">
              <h3 className="text-lg font-semibold text-white">💡 Key Concepts</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedNote.key_concepts.map((concept, idx) => (
                  <span key={idx} className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs text-indigo-200">
                    {concept}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Definitions */}
          {selectedNote.definitions.length > 0 && (
            <section className="rounded-2xl border border-[#2a2a2a] bg-[#151515] p-5">
              <h3 className="text-lg font-semibold text-white">📖 Definitions</h3>
              <dl className="mt-3 space-y-3 text-sm">
                {selectedNote.definitions.map((def, idx) => (
                  <div key={idx} className="rounded-lg border border-[#252525] bg-[#101010] p-3">
                    <dt className="font-semibold text-white">{def.term}</dt>
                    <dd className="mt-1 text-[#dbe2ee]">{def.definition}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* Formulas */}
          {selectedNote.formulas.length > 0 && (
            <section className="rounded-2xl border border-[#2a2a2a] bg-[#151515] p-5">
              <h3 className="text-lg font-semibold text-white">🔢 Formulas</h3>
              <div className="mt-3 space-y-3">
                {selectedNote.formulas.map((formula, idx) => (
                  <div key={idx} className="rounded-lg border border-[#252525] bg-[#101010] p-3">
                    <p className="font-semibold text-white">{formula.name}</p>
                    <div className="prose prose-invert prose-sm max-w-none mt-2">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {formula.formula}
                      </ReactMarkdown>
                    </div>
                    {formula.explanation && <p className="mt-2 text-xs text-[#9aa7bd]">{formula.explanation}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* MCQs */}
          {selectedNote.mcqs.length > 0 && (
            <section className="rounded-2xl border border-[#2a2a2a] bg-[#151515] p-5">
              <h3 className="text-lg font-semibold text-white">✅ Practice MCQs ({selectedNote.mcqs.length})</h3>
              <div className="mt-3 space-y-4">
                {selectedNote.mcqs.map((mcq, idx) => (
                  <div key={idx} className="rounded-lg border border-[#252525] bg-[#101010] p-3">
                    <p className="font-medium text-white">
                      Q{idx + 1}. {mcq.question}
                    </p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {mcq.options.map((option, optIdx) => (
                        <li
                          key={optIdx}
                          className={[
                            'rounded px-2 py-1',
                            option === mcq.correct_answer
                              ? 'bg-emerald-500/20 text-emerald-200 font-medium'
                              : 'text-[#dbe2ee]',
                          ].join(' ')}
                        >
                          {String.fromCharCode(65 + optIdx)}. {option}
                        </li>
                      ))}
                    </ul>
                    {mcq.explanation && <p className="mt-2 text-xs text-[#a8ffc5]">💡 {mcq.explanation}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Theory Questions */}
          {(selectedNote.theory_questions_2mark.length > 0 ||
            selectedNote.theory_questions_4mark.length > 0 ||
            selectedNote.theory_questions_8mark.length > 0) && (
            <section className="rounded-2xl border border-[#2a2a2a] bg-[#151515] p-5">
              <h3 className="text-lg font-semibold text-white">📝 Theory Questions</h3>

              {selectedNote.theory_questions_2mark.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-semibold text-amber-300">2-Mark Questions</h4>
                  <ul className="mt-2 space-y-1 text-sm text-[#dbe2ee]">
                    {selectedNote.theory_questions_2mark.map((q, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-amber-400">•</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedNote.theory_questions_4mark.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-orange-300">4-Mark Questions</h4>
                  <ul className="mt-2 space-y-1 text-sm text-[#dbe2ee]">
                    {selectedNote.theory_questions_4mark.map((q, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-orange-400">•</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedNote.theory_questions_8mark.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-red-300">8-Mark Questions</h4>
                  <ul className="mt-2 space-y-1 text-sm text-[#dbe2ee]">
                    {selectedNote.theory_questions_8mark.map((q, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-red-400">•</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Numerical Problems */}
          {selectedNote.numerical_problems.length > 0 && (
            <section className="rounded-2xl border border-[#2a2a2a] bg-[#151515] p-5">
              <h3 className="text-lg font-semibold text-white">🔢 Numerical Problems</h3>
              <div className="mt-3 space-y-3">
                {selectedNote.numerical_problems.map((problem, idx) => (
                  <div key={idx} className="rounded-lg border border-[#252525] bg-[#101010] p-3">
                    <p className="font-medium text-white">Problem {idx + 1}:</p>
                    <p className="mt-1 text-sm text-[#dbe2ee]">{problem.problem}</p>
                    {problem.solution && (
                      <div className="mt-2 rounded bg-[#0a0a0a] p-2">
                        <p className="text-xs font-semibold text-emerald-300">Solution:</p>
                        <div className="prose prose-invert prose-sm max-w-none mt-1">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {problem.solution}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Priority Topics */}
          <section className="grid gap-4 md:grid-cols-2">
            {selectedNote.high_priority_topics.length > 0 && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                <h3 className="text-base font-semibold text-white">🔥 High Priority</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedNote.high_priority_topics.map((topic, idx) => (
                    <span key={idx} className="rounded-full bg-black/25 px-3 py-1 text-xs text-[#f8fafc]">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedNote.medium_priority_topics.length > 0 && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                <h3 className="text-base font-semibold text-white">⚡ Medium Priority</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedNote.medium_priority_topics.map((topic, idx) => (
                    <span key={idx} className="rounded-full bg-black/25 px-3 py-1 text-xs text-[#f8fafc]">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Exam Tips */}
          {selectedNote.exam_tips.length > 0 && (
            <section className="rounded-2xl border border-[#2a2a2a] bg-[#151515] p-5">
              <h3 className="text-lg font-semibold text-white">💡 Exam Tips</h3>
              <ul className="mt-3 space-y-2 text-sm text-[#dbe2ee]">
                {selectedNote.exam_tips.map((tip, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-violet-400">→</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Time Allocation */}
          {selectedNote.time_allocation_suggestion && (
            <section className="rounded-2xl border border-[#2a2a2a] bg-[#151515] p-5">
              <h3 className="text-lg font-semibold text-white">⏱️ Time Allocation</h3>
              <p className="mt-3 text-sm text-[#dbe2ee]">{selectedNote.time_allocation_suggestion}</p>
            </section>
          )}

          {/* Metadata */}
          <div className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-3 text-xs text-[#9aa7bd]">
            Generated {new Date(selectedNote.generated_at).toLocaleString('en-IN')} •{' '}
            {isFresh(selectedNote.generated_at) ? '✨ Fresh (< 7 days old)' : 'Consider regenerating for latest content'}
          </div>
        </div>
      )}
    </div>
  )
}
