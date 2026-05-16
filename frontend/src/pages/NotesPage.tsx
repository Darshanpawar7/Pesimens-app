import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { NoteCard, type NoteItem } from '@/components/notes/NoteCard'
import { SellNoteModal } from '@/components/notes/SellNoteModal'
import { apiFetch } from '@/lib/api'

interface NotesResponse {
  notes: NoteItem[]
  next_cursor: string | null
}

interface NoteDetailsResponse {
  note: NoteItem
  requires_auth_for_download: boolean
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) {
      resolve(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function NotesPage() {
  const queryClient = useQueryClient()
  const [subject, setSubject] = useState('')
  const [course, setCourse] = useState('')
  const [priceType, setPriceType] = useState<'all' | 'free' | 'paid'>('all')
  const [cursor, setCursor] = useState<string | null>(null)
  const [isBusyId, setIsBusyId] = useState<string | null>(null)
  const [sellOpen, setSellOpen] = useState(false)

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (subject.trim()) params.set('subject', subject.trim())
    if (course.trim()) params.set('course', course.trim())
    if (priceType === 'free') params.set('price_max', '0')
    if (cursor) params.set('cursor', cursor)
    params.set('limit', '20')
    return params.toString()
  }, [subject, course, priceType, cursor])

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notes', queryString],
    queryFn: () => apiFetch<NotesResponse>(`/api/notes?${queryString}`),
  })

  const notes = useMemo(() => {
    const base = data?.notes ?? []
    if (priceType === 'paid') return base.filter(n => n.price > 0)
    return base
  }, [data?.notes, priceType])

  async function handleDownload(noteId: string) {
    setIsBusyId(noteId)
    try {
      const res = await apiFetch<{ url: string }>(`/api/notes/${noteId}/download`)
      window.open(res.url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to download note')
    } finally {
      setIsBusyId(null)
    }
  }

  async function handleBuy(noteId: string, price: number) {
    setIsBusyId(noteId)
    try {
      const detail = await apiFetch<NoteDetailsResponse>(`/api/notes/${noteId}`)
      if (detail.note.price <= 0) {
        await handleDownload(noteId)
        return
      }

      const order = await apiFetch<{ razorpay_order_id: string; amount: number; razorpay_key_id: string }>(`/api/notes/${noteId}/purchase`, {
        method: 'POST',
      })

      const loaded = await loadRazorpayScript()
      if (!loaded || !window.Razorpay) {
        alert('Razorpay checkout is not loaded. Please integrate checkout script in index.html.')
        return
      }

      const razorpay = new window.Razorpay({
        key: order.razorpay_key_id,
        amount: order.amount,
        currency: 'INR',
        name: 'PESU Hub',
        description: `Purchase note for ₹${price}`,
        order_id: order.razorpay_order_id,
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          const verify = await apiFetch<{ url: string }>('/api/notes/purchase/verify', {
            method: 'POST',
            body: JSON.stringify({
              note_id: noteId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          })

          window.open(verify.url, '_blank', 'noopener,noreferrer')
          void refetch()
        },
      })

      razorpay.open()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to purchase note')
    } finally {
      setIsBusyId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">📝 Notes Marketplace</h1>
            <p className="mt-1 text-sm text-white/55">Buy and sell quality study notes from PESU students.</p>
          </div>
          <Button className="bg-[#6366f1] text-white hover:bg-[#6366f1]/90" onClick={() => setSellOpen(true)}>
            Sell Your Notes
          </Button>
        </div>

        <div className="rounded-2xl border border-[#2a2a2a] bg-gradient-to-br from-[#1a1a1a] to-[#141414] p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input
              placeholder="Search subject..."
              value={subject}
              onChange={e => {
                setCursor(null)
                setSubject(e.target.value)
              }}
              className="border-[#2a2a2a] bg-[#0f0f0f] text-white placeholder:text-white/35"
            />
            <Input
              placeholder="Filter degree/course..."
              value={course}
              onChange={e => {
                setCursor(null)
                setCourse(e.target.value)
              }}
              className="border-[#2a2a2a] bg-[#0f0f0f] text-white placeholder:text-white/35"
            />
            <div className="flex rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] p-1">
              {(['all', 'free', 'paid'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => {
                    setCursor(null)
                    setPriceType(type)
                  }}
                  className={[
                    'flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                    priceType === type ? 'bg-[#6366f1]/20 text-white' : 'text-white/60 hover:bg-white/5',
                  ].join(' ')}
                >
                  {type === 'all' ? 'All' : type === 'free' ? 'Free' : 'Paid'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a]" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <p className="py-12 text-center text-sm text-white/55">No notes found for the selected filters.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {notes.map(note => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onDownload={handleDownload}
                  onBuy={handleBuy}
                  isBusy={isBusyId === note.id}
                />
              ))}
            </div>

            <div className="flex justify-center">
              {data?.next_cursor ? (
                <Button
                  variant="outline"
                  onClick={() => setCursor(data.next_cursor)}
                  className="border-[#2a2a2a] bg-[#1a1a1a] text-white hover:bg-[#222222]"
                >
                  Load more
                </Button>
              ) : (
                <span className="text-xs text-white/45">No more notes</span>
              )}
            </div>
          </>
        )}
      </div>

      <SellNoteModal
        open={sellOpen}
        onClose={() => setSellOpen(false)}
        onSuccess={() => {
          setSellOpen(false)
          setCursor(null)
          queryClient.invalidateQueries({ queryKey: ['notes'] })
        }}
      />
    </div>
  )
}
