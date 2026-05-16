import { useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function SellNoteModal({ open, onClose, onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    title: '',
    subject: '',
    course: '',
    description: '',
    price: 0,
  })

  function pickFile(selected: File | null) {
    if (!selected) return
    if (selected.type !== 'application/pdf') {
      setError('Only PDF files are allowed.')
      return
    }
    if (selected.size > 15 * 1024 * 1024) {
      setError('File must be under 15MB.')
      return
    }
    setError(null)
    setFile(selected)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setError('Please upload a PDF file.')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const body = new FormData()
      body.append('title', form.title)
      body.append('subject', form.subject)
      body.append('course', form.course)
      body.append('description', form.description)
      body.append('price', String(form.price))
      body.append('file', file)

      await apiFetch('/api/notes', { method: 'POST', body })
      onSuccess?.()
      onClose()
      setForm({ title: '', subject: '', course: '', description: '', price: 0 })
      setFile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload note')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-xl border-[#2a2a2a] bg-[#111111] text-white">
        <DialogHeader>
          <DialogTitle>Sell Your Notes</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <Input
            placeholder="Title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="border-[#2a2a2a] bg-[#0f0f0f] text-white"
            required
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              placeholder="Subject"
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              className="border-[#2a2a2a] bg-[#0f0f0f] text-white"
              required
            />
            <Input
              placeholder="Degree / Course"
              value={form.course}
              onChange={e => setForm(f => ({ ...f, course: e.target.value }))}
              className="border-[#2a2a2a] bg-[#0f0f0f] text-white"
              required
            />
          </div>

          <textarea
            rows={4}
            placeholder="Description"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm text-white outline-none focus:border-[#6366f1]"
            required
          />

          <Input
            type="number"
            min={0}
            max={500}
            placeholder="Price (0 for free)"
            value={form.price}
            onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) || 0 }))}
            className="border-[#2a2a2a] bg-[#0f0f0f] text-white"
            required
          />

          <div
            className="cursor-pointer rounded-lg border border-dashed border-[#2a2a2a] bg-[#0f0f0f] p-4 text-center text-sm text-white/60 hover:border-[#6366f1]/60"
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={e => pickFile(e.target.files?.[0] ?? null)}
            />
            {file ? `${file.name} (${Math.round(file.size / 1024)} KB)` : 'Upload PDF (max 15MB)'}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading} className="bg-[#6366f1] text-white hover:bg-[#6366f1]/90">
              {uploading ? 'Uploading...' : 'Submit Note'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
