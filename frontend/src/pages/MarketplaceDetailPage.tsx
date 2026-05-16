import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart, MessageCircle, Share2, X } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/use-toast'
import { UserAvatar } from '@/components/ui/avatar'
import { DetailBackButton } from '@/components/common/DetailBackButton'
import { categoryMeta, conditionPillClass, formatInr, timeAgo, type MarketplaceListing } from '@/lib/marketplace'

type DetailResponse = {
  listing: MarketplaceListing
}

export default function MarketplaceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const me = useAuthStore(state => state.user)

  const [imageIndex, setImageIndex] = useState(0)
  const [interestSheetOpen, setInterestSheetOpen] = useState(false)
  const [interestMessage, setInterestMessage] = useState('')

  const detailQuery = useQuery({
    queryKey: ['marketplace-detail', id],
    queryFn: () => apiFetch<DetailResponse>(`/api/marketplace/${id}`),
    enabled: Boolean(id),
  })

  const listing = detailQuery.data?.listing
  const isOwner = listing?.seller.id && me?.id ? listing.seller.id === me.id : false

  const toggleSaveMutation = useMutation({
    mutationFn: () => apiFetch<{ ok: true; saved: boolean }>(`/api/marketplace/${id}/save`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['marketplace-detail', id] })
      void queryClient.invalidateQueries({ queryKey: ['marketplace-browse'] })
      void queryClient.invalidateQueries({ queryKey: ['marketplace-saved'] })
    },
  })

  const interestMutation = useMutation({
    mutationFn: (message: string) => apiFetch(`/api/marketplace/${id}/interest`, {
      method: 'POST',
      body: JSON.stringify({ message: message.trim() || undefined }),
    }),
    onSuccess: () => {
      toast({ variant: 'success', title: 'Interest sent to seller' })
      setInterestSheetOpen(false)
      setInterestMessage('')
      void queryClient.invalidateQueries({ queryKey: ['marketplace-detail', id] })
      void queryClient.invalidateQueries({ queryKey: ['marketplace-browse'] })
      void queryClient.invalidateQueries({ queryKey: ['marketplace-my-listings'] })
    },
  })

  const removeInterestMutation = useMutation({
    mutationFn: () => apiFetch(`/api/marketplace/${id}/interest`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({ variant: 'success', title: 'Interest removed' })
      void queryClient.invalidateQueries({ queryKey: ['marketplace-detail', id] })
      void queryClient.invalidateQueries({ queryKey: ['marketplace-browse'] })
      void queryClient.invalidateQueries({ queryKey: ['marketplace-my-listings'] })
    },
  })

  if (detailQuery.isLoading || !listing) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-white/70">Loading listing...</div>
    )
  }

  const category = categoryMeta(listing.category)

  return (
    <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-4xl bg-[#0a0a0f] pb-[calc(7rem+env(safe-area-inset-bottom,0px))] text-white">
      <div className="relative h-72 overflow-hidden border-b border-[#1e1e2e] bg-[#13131a] sm:h-96">
        <DetailBackButton fallbackTo="/marketplace" className="absolute left-3 top-3 z-10" />

        {listing.images.length > 0 ? (
          <img src={listing.images[imageIndex]} alt={listing.title} className="h-full w-full object-cover" />
        ) : (
          <div className={`grid h-full place-items-center bg-gradient-to-br ${category.gradient}`}>
            <span className="text-7xl">{category.emoji}</span>
          </div>
        )}

        <div className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/40 px-2 py-1 text-xs text-white/80">
          {category.emoji} {listing.category}
        </div>
        <span className={`absolute bottom-3 left-3 rounded-full border px-2 py-1 text-xs font-semibold capitalize ${conditionPillClass(listing.condition)}`}>
          {listing.condition}
        </span>

        {listing.images.length > 1 && (
          <div className="absolute bottom-3 right-3 flex gap-1 rounded-full border border-white/20 bg-black/45 px-2 py-1">
            {listing.images.map((src, index) => (
              <button
                key={src}
                type="button"
                onClick={() => setImageIndex(index)}
                className={`h-2.5 w-2.5 rounded-full ${index === imageIndex ? 'bg-white' : 'bg-white/30'}`}
                aria-label={`View image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4 px-4 py-4 md:px-6">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">{listing.title}</h1>
          <p className="mt-1 text-2xl font-bold text-white">{formatInr(listing.price)}</p>
          {listing.is_negotiable && <p className="text-sm text-emerald-300">Price negotiable</p>}
        </div>

        <div className="rounded-2xl border border-[#1e1e2e] bg-[#13131a] p-4">
          <h2 className="mb-2 text-sm font-semibold text-white/90">Description</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{listing.description?.trim() || 'No description provided.'}</p>
        </div>

        <div className="rounded-2xl border border-[#1e1e2e] bg-[#13131a] p-4">
          <h2 className="mb-2 text-sm font-semibold text-white/90">Seller</h2>
          <div className="flex items-center gap-3">
            <UserAvatar name={listing.seller.name} avatarUrl={listing.seller.avatar_url} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{listing.seller.name}</p>
              <p className="text-xs text-white/60">
                {listing.seller.branch || 'PES University'}
                {listing.seller.semester ? ` • Sem ${listing.seller.semester}` : ''}
              </p>
              <p className="text-xs text-white/50">Listed {timeAgo(listing.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-[#1e1e2e] bg-[#13131a] p-4 text-center">
          <div><p className="text-[11px] text-white/55">Views</p><p className="text-lg font-semibold">{listing.views_count}</p></div>
          <div><p className="text-[11px] text-white/55">Interested</p><p className="text-lg font-semibold">{listing.interested_count}</p></div>
          <div><p className="text-[11px] text-white/55">Status</p><p className="text-lg font-semibold capitalize">{listing.status}</p></div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => toggleSaveMutation.mutate()}
            className="inline-flex items-center gap-1 rounded-xl border border-[#1e1e2e] bg-[#13131a] px-3 py-2 text-sm text-white/85"
          >
            <Heart className={`h-4 w-4 ${listing.is_saved ? 'fill-pink-500 text-pink-500' : ''}`} />
            {listing.is_saved ? 'Saved' : 'Save'}
          </button>
          <button
            type="button"
            onClick={async () => {
              const url = `${window.location.origin}/marketplace/${listing.id}`
              if (navigator.share) {
                await navigator.share({ title: listing.title, url })
              } else {
                await navigator.clipboard.writeText(url)
                toast({ variant: 'success', title: 'Link copied' })
              }
            }}
            className="inline-flex items-center gap-1 rounded-xl border border-[#1e1e2e] bg-[#13131a] px-3 py-2 text-sm text-white/85"
          >
            <Share2 className="h-4 w-4" /> Share
          </button>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#1e1e2e] bg-[#0f0f15]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl gap-2">
          {isOwner ? (
            <Link
              to="/marketplace?tab=my"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#161622] text-sm font-semibold text-white"
            >
              Manage Listing
            </Link>
          ) : listing.status === 'sold' ? (
            <button type="button" disabled className="h-11 flex-1 rounded-xl border border-[#2a2a2a] bg-[#22222f] text-sm font-semibold text-white/60">
              Item Sold
            </button>
          ) : listing.has_expressed_interest ? (
            <button
              type="button"
              onClick={() => removeInterestMutation.mutate()}
              className="h-11 flex-1 rounded-xl border border-amber-500/50 bg-amber-500/15 text-sm font-semibold text-amber-200"
            >
              Remove Interest
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setInterestSheetOpen(true)}
              className="h-11 flex-1 rounded-xl bg-indigo-600 text-sm font-semibold text-white"
            >
              I am Interested
            </button>
          )}

          {!isOwner && (
            <button
              type="button"
              onClick={() => {
                const prefill = `Hi! Is \"${listing.title}\" still available?`
                navigate(`/messages?user=${listing.seller.id}&source=marketplace&prefill=${encodeURIComponent(prefill)}`)
              }}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#161622] px-4 text-sm font-semibold text-white"
            >
              <MessageCircle className="mr-1 h-4 w-4" /> Chat
            </button>
          )}
        </div>
      </div>

      {interestSheetOpen && (
        <div className="fixed inset-0 z-50">
          <button className="absolute inset-0 bg-black/70" onClick={() => setInterestSheetOpen(false)} aria-label="Close interest sheet" />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t border-[#1e1e2e] bg-[#12121a] p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Send a short note to seller</h3>
              <button type="button" onClick={() => setInterestSheetOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <textarea
              value={interestMessage}
              onChange={event => setInterestMessage(event.target.value.slice(0, 500))}
              placeholder="Hi! Is this still available?"
              className="h-28 w-full rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm"
            />
            <p className="mt-1 text-right text-[11px] text-white/45">{interestMessage.length}/500</p>
            <button
              type="button"
              disabled={interestMutation.isPending}
              onClick={() => interestMutation.mutate(interestMessage)}
              className="mt-2 h-11 w-full rounded-xl bg-indigo-600 text-sm font-semibold disabled:opacity-60"
            >
              {interestMutation.isPending ? 'Sending...' : 'Send Interest'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
