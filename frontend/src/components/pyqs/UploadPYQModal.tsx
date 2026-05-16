import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiFetch } from '@/lib/api'
import { FileText, Upload as UploadIcon } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  initialCourse?: string
  initialSubject?: string
  lockCourse?: boolean
  lockSubject?: boolean
}

const EXAM_TYPES = ['ISA1', 'ISA2', 'ESA', 'LAB'] as const
const SMART_NOTES_EXAM_TYPES = ['ISA1', 'ISA2', 'ESA'] as const
const MATERIAL_TYPES = ['notes', 'slides'] as const
const UNIT_NUMBERS = [1, 2, 3, 4, 5] as const
const COURSES = ['BTech', 'MTech', 'MCA', 'MBA']
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i)
type UploadType = 'pyq' | 'notes-slides'

function normalizeCourse(value?: string): string {
  if (!value) return ''
  const normalized = value.trim().toLowerCase().replace(/\./g, '')

  if (['btech', 'b tech', 'be', 'bachelor of technology'].includes(normalized)) return 'BTech'
  if (['mtech', 'm tech', 'master of technology'].includes(normalized)) return 'MTech'
  if (['mca', 'master of computer applications'].includes(normalized)) return 'MCA'
  if (['mba', 'master of business administration'].includes(normalized)) return 'MBA'
  if (COURSES.includes(value.trim())) return value.trim()

  return ''
}

export function UploadPYQModal({
  open,
  onClose,
  onSuccess,
  initialCourse,
  initialSubject,
  lockCourse = false,
  lockSubject = false,
}: Props) {
  const [uploadType, setUploadType] = useState<UploadType>('pyq')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    course: '',
    subject: '',
    exam_type: 'ISA1' as typeof EXAM_TYPES[number],
    year: CURRENT_YEAR,
    question_text: '',
    is_anonymous: false,
  })

  const [materialForm, setMaterialForm] = useState({
    course: '',
    subject: '',
    material_type: 'slides' as typeof MATERIAL_TYPES[number],
    exam_type: 'ISA1' as typeof SMART_NOTES_EXAM_TYPES[number],
    unit_number: 1 as typeof UNIT_NUMBERS[number],
    title: '',
    allow_ocr_recovery: false,
  })

  useEffect(() => {
    if (!open) return

    const detectedCourse = normalizeCourse(initialCourse)
    const detectedSubject = (initialSubject ?? '').trim()

    setForm(prev => ({
      ...prev,
      course: detectedCourse || prev.course,
      subject: detectedSubject || prev.subject,
    }))

    setMaterialForm(prev => ({
      ...prev,
      course: detectedCourse || prev.course,
      subject: detectedSubject || prev.subject,
    }))
  }, [open, initialCourse, initialSubject])

  function handleFile(f: File) {
    const allowed = uploadType === 'pyq'
      ? ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
      : ['application/pdf']
    if (!allowed.includes(f.type)) {
      setError(uploadType === 'pyq' ? 'Only PDF, JPG, PNG files are allowed.' : 'Only PDF files are allowed.')
      return
    }

    const maxSizeMb = uploadType === 'pyq' ? 10 : 20
    if (f.size > maxSizeMb * 1024 * 1024) {
      setError(`File must be under ${maxSizeMb}MB.`)
      return
    }

    setError(null)
    setFile(f)
  }

  async function handlePYQSubmit() {
    if (!file) { setError('Please select a file.'); return }
    if (!form.course || !form.subject) { setError('Course and subject are required.'); return }

    setUploading(true)
    setProgress(10)
    setError(null)
    setStatusMessage('Uploading PYQ...')

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('course', form.course)
      fd.append('subject', form.subject)
      fd.append('exam_type', form.exam_type)
      fd.append('year', String(form.year))
      fd.append('question_text', form.question_text)
      fd.append('is_anonymous', String(form.is_anonymous))

      setProgress(40)
      await apiFetch('/api/pyqs', { method: 'POST', body: fd })
      setProgress(100)
      setStatusMessage('PYQ uploaded successfully!')

      setTimeout(() => {
        onSuccess?.()
        onClose()
        resetForm()
      }, 700)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
      setStatusMessage('')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  async function handleMaterialSubmit() {
    if (!file) { setError('Please select a file.'); return }
    if (!materialForm.course || !materialForm.subject) { setError('Course and subject are required.'); return }

    setUploading(true)
    setProgress(5)
    setError(null)
    setStatusMessage('Uploading PDF...')

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('course', materialForm.course)
      fd.append('subject', materialForm.subject)
      fd.append('material_type', materialForm.material_type)
      fd.append('unit_number', String(materialForm.unit_number))
      fd.append('allow_ocr_recovery', String(materialForm.allow_ocr_recovery))

      const cleanTitle = materialForm.title.trim() || file.name.replace(/\.[^.]+$/, '')
      fd.append('title', cleanTitle)

      setProgress(30)
      setStatusMessage(materialForm.allow_ocr_recovery ? 'Extracting text with OCR recovery...' : 'Extracting text from PDF...')
      await apiFetch<{ ok: boolean; material_id: string }>('/api/study-materials/upload', {
        method: 'POST',
        body: fd,
      })

      setProgress(100)
      setStatusMessage('Smart notes generated and saved!')

      setTimeout(() => {
        onSuccess?.()
        onClose()
        resetForm()
      }, 1200)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
      setStatusMessage('')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (uploadType === 'pyq') {
      await handlePYQSubmit()
      return
    }

    await handleMaterialSubmit()
  }

  function resetForm() {
    setFile(null)
    setError(null)
    setStatusMessage('')
    setProgress(0)
    setUploadType('pyq')
  }

  const activeCourse = uploadType === 'pyq' ? form.course : materialForm.course
  const activeSubject = uploadType === 'pyq' ? form.subject : materialForm.subject

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Study Material</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            onClick={() => { setUploadType('pyq'); setFile(null); setError(null) }}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              uploadType === 'pyq'
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-[#2a2a2a] hover:border-indigo-500/50'
            }`}
          >
            <FileText className="h-8 w-8 text-indigo-400" />
            <div className="text-center">
              <div className="font-semibold">Upload PYQ</div>
              <div className="text-xs text-gray-400 mt-1">Previous year questions</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => { setUploadType('notes-slides'); setFile(null); setError(null) }}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              uploadType === 'notes-slides'
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-[#2a2a2a] hover:border-emerald-500/50'
            }`}
          >
            <UploadIcon className="h-8 w-8 text-emerald-400" />
            <div className="text-center">
              <div className="font-semibold">Upload Notes/Slides</div>
              <div className="text-xs text-gray-400 mt-1">Auto-generate smart notes</div>
            </div>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File dropzone */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragOver
                ? uploadType === 'pyq' ? 'border-indigo-500 bg-[#111111]' : 'border-emerald-500 bg-[#111111]'
                : 'border-[#2a2a2a] hover:border-indigo-500'
            }`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault()
              setDragOver(false)
              const f = e.dataTransfer.files[0]
              if (f) handleFile(f)
            }}
            role="button"
            aria-label="Upload file dropzone"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept={uploadType === 'pyq' ? '.pdf,.jpg,.jpeg,.png' : '.pdf'}
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            {file ? (
              <p className="text-sm text-gray-200 font-medium">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>
            ) : (
              <p className="text-sm text-gray-500">
                {uploadType === 'pyq'
                  ? 'Drop PDF/JPG/PNG here or click to browse (max 10MB)'
                  : 'Drop PDF here or click to browse (max 20MB)'}
              </p>
            )}
          </div>

          {/* Course + Subject */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="course">Course</Label>
              <select
                id="course"
                className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                value={activeCourse}
                onChange={e => {
                  if (uploadType === 'pyq') setForm(f => ({ ...f, course: e.target.value }))
                  else setMaterialForm(f => ({ ...f, course: e.target.value }))
                }}
                disabled={lockCourse}
                required
              >
                <option value="">Select course</option>
                {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="e.g. Data Structures"
                value={activeSubject}
                onChange={e => {
                  if (uploadType === 'pyq') setForm(f => ({ ...f, subject: e.target.value }))
                  else setMaterialForm(f => ({ ...f, subject: e.target.value }))
                }}
                readOnly={lockSubject}
                className={lockSubject ? 'opacity-90 cursor-not-allowed' : ''}
                required
              />
            </div>
          </div>

          {(initialCourse || initialSubject) && (
            <p className="text-xs text-gray-400">
              Course and subject were auto-detected to make upload faster.
            </p>
          )}

          {uploadType === 'pyq' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="exam_type">Exam Type</Label>
                  <select
                    id="exam_type"
                    className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                    value={form.exam_type}
                    onChange={e => setForm(f => ({ ...f, exam_type: e.target.value as typeof EXAM_TYPES[number] }))}
                  >
                    {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="year">Year</Label>
                  <select
                    id="year"
                    className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                    value={form.year}
                    onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value, 10) }))}
                  >
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="question_text">Question text (optional)</Label>
                <textarea
                  id="question_text"
                  className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none resize-none"
                  rows={3}
                  placeholder="Paste the question text if you have it..."
                  value={form.question_text}
                  onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))}
                />
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_anonymous}
                  onChange={e => setForm(f => ({ ...f, is_anonymous: e.target.checked }))}
                />
                Post anonymously
              </label>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <Label htmlFor="material_title">Title (optional)</Label>
                <Input
                  id="material_title"
                  placeholder="e.g. Unit 2 CN Slides"
                  value={materialForm.title}
                  onChange={e => setMaterialForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="material_type">Type</Label>
                  <select
                    id="material_type"
                    className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    value={materialForm.material_type}
                    onChange={e => setMaterialForm(f => ({ ...f, material_type: e.target.value as typeof MATERIAL_TYPES[number] }))}
                  >
                    <option value="slides">Slides</option>
                    <option value="notes">Notes</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="material_exam_type">Exam</Label>
                  <select
                    id="material_exam_type"
                    className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    value={materialForm.exam_type}
                    onChange={e => setMaterialForm(f => ({ ...f, exam_type: e.target.value as typeof SMART_NOTES_EXAM_TYPES[number] }))}
                  >
                    {SMART_NOTES_EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="unit_number">Unit</Label>
                  <select
                    id="unit_number"
                    className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    value={materialForm.unit_number}
                    onChange={e => setMaterialForm(f => ({ ...f, unit_number: parseInt(e.target.value, 10) as typeof UNIT_NUMBERS[number] }))}
                  >
                    {UNIT_NUMBERS.map(u => <option key={u} value={u}>Unit {u}</option>)}
                  </select>
                </div>
              </div>

              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3">
                <p className="text-xs text-emerald-200">
                  Upload once and we generate structured smart notes in sequence.
                </p>
              </div>

              <label className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={materialForm.allow_ocr_recovery}
                  onChange={e => setMaterialForm(f => ({ ...f, allow_ocr_recovery: e.target.checked }))}
                  className="mt-1"
                />
                <span>
                  <span className="block font-medium text-white">Enable OCR recovery for image-only PDFs</span>
                  <span className="block text-xs text-emerald-100/80">
                    Use Gemini OCR only when the PDF has little or no extractable text. This can spend extra AI credits.
                  </span>
                </span>
              </label>
            </>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="w-full bg-[#111111] rounded-full h-2 border border-[#2a2a2a]">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${uploadType === 'pyq' ? 'bg-indigo-500' : 'bg-emerald-500'}`}
                  style={{ width: `${progress}%` }}
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              {statusMessage && <p className="text-xs text-center text-gray-400">{statusMessage}</p>}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>Cancel</Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? 'Processing...' : uploadType === 'pyq' ? 'Upload PYQ' : 'Upload & Auto-Generate Smart Notes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
