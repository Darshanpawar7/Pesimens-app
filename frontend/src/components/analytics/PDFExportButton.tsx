import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import type { TagFrequency } from './TopicFrequencyChart'

const MAX_EXPORTS_PER_HOUR = 5
const STORAGE_KEY = 'analytics_export_timestamps'

function checkRateLimit(): boolean {
  const raw = localStorage.getItem(STORAGE_KEY)
  const timestamps: number[] = raw ? JSON.parse(raw) : []
  const oneHourAgo = Date.now() - 60 * 60 * 1000
  const recent = timestamps.filter(t => t > oneHourAgo)
  if (recent.length >= MAX_EXPORTS_PER_HOUR) return false
  recent.push(Date.now())
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent))
  return true
}

interface Props {
  tags: TagFrequency[]
  filters: { subject: string; exam_type: string }
}

type PdfDeps = {
  pdf: (typeof import('@react-pdf/renderer'))['pdf']
  AnalyticsReportPDF: (typeof import('./AnalyticsReport'))['AnalyticsReportPDF']
}

let pdfDepsPromise: Promise<PdfDeps> | null = null

function loadPdfDeps(): Promise<PdfDeps> {
  if (!pdfDepsPromise) {
    pdfDepsPromise = Promise.all([
      import('@react-pdf/renderer'),
      import('./AnalyticsReport'),
    ]).then(([renderer, report]) => ({
      pdf: renderer.pdf,
      AnalyticsReportPDF: report.AnalyticsReportPDF,
    }))
  }

  return pdfDepsPromise
}

function prefetchPdfDeps() {
  void loadPdfDeps().catch(() => {
    // Best-effort prefetch only.
  })
}

export function PDFExportButton({ tags, filters }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const linkRef = useRef<HTMLAnchorElement>(null)

  async function handleExport() {
    if (!checkRateLimit()) {
      setError('Export limit reached (5 per hour). Please wait.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { pdf, AnalyticsReportPDF } = await loadPdfDeps()

      const generatedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      const blob = await pdf(
        <AnalyticsReportPDF tags={tags} filters={filters} generatedAt={generatedAt} />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = linkRef.current!
      a.href = url
      a.download = `pesu-hub-analytics-${Date.now()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError('PDF generation failed. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Hidden anchor for download trigger */}
      <a ref={linkRef} className="hidden" aria-hidden="true" />

      <Button
        onClick={handleExport}
        onMouseEnter={prefetchPdfDeps}
        onFocus={prefetchPdfDeps}
        onTouchStart={prefetchPdfDeps}
        disabled={loading || !tags.length}
        className="bg-gradient-to-r from-[#6366f1] to-[#7c3aed] text-white shadow-[0_18px_55px_-30px_rgba(99,102,241,0.9)] hover:opacity-95"
      >
        {loading ? 'Generating PDF...' : 'Export PDF'}
      </Button>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
