import { Button } from '@/components/ui/button'

export interface NoteItem {
  id: string
  title: string
  subject: string
  course: string
  description?: string | null
  price: number
  download_count: number
  created_at: string
  seller?: { display_name?: string | null } | null
}

interface Props {
  note: NoteItem
  onDownload: (noteId: string) => void
  onBuy: (noteId: string, price: number) => void
  isBusy?: boolean
}

export function NoteCard({ note, onDownload, onBuy, isBusy = false }: Props) {
  const sellerName = note.seller?.display_name || 'Student'

  return (
    <article className="rounded-2xl border border-[#2a2a2a] bg-gradient-to-br from-[#1a1a1a] to-[#141414] p-4 text-white shadow-[0_12px_36px_-24px_rgba(0,0,0,1)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="rounded-full border border-[#6366f1]/35 bg-[#6366f1]/15 px-2.5 py-1 text-xs font-semibold text-[#c7d2fe]">
          {note.subject}
        </span>
        <span className="text-xs text-white/45">{note.course}</span>
      </div>

      <h3 className="line-clamp-2 text-base font-semibold text-white">{note.title}</h3>
      <p className="mt-1 text-xs text-white/50">by {sellerName}</p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span
          className={[
            'rounded-full border px-2.5 py-1 text-xs font-semibold',
            note.price === 0
              ? 'border-emerald-500/30 bg-emerald-500/12 text-emerald-300'
              : 'border-amber-500/30 bg-amber-500/12 text-amber-300',
          ].join(' ')}
        >
          {note.price === 0 ? 'Free' : `₹${note.price}`}
        </span>

        <span className="text-xs text-white/45">{note.download_count} downloads</span>
      </div>

      <div className="mt-4">
        {note.price === 0 ? (
          <Button
            onClick={() => onDownload(note.id)}
            disabled={isBusy}
            className="h-10 w-full bg-[#6366f1] text-white hover:bg-[#6366f1]/90"
          >
            Download
          </Button>
        ) : (
          <Button
            onClick={() => onBuy(note.id, note.price)}
            disabled={isBusy}
            className="h-10 w-full bg-amber-500 text-[#1f1400] hover:bg-amber-400"
          >
            Buy ₹{note.price}
          </Button>
        )}
      </div>
    </article>
  )
}
