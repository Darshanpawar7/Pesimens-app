// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart, ImagePlus, MessageCircle, Plus, SlidersHorizontal, X } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'
import { UserAvatar } from '@/components/ui/avatar'
import {
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_CONDITIONS,
  type MarketplaceListing,
  type MarketplaceSort,
  categoryMeta,
  conditionPillClass,
  formatInr,
  timeAgo,
} from '@/lib/marketplace'

type MarketplaceListResponse = {
  listings: MarketplaceListing[]
  total?: number
}

type ListingInterest = {
  id: string
  message: string | null
  created_at: string
  buyer: {
    id: string
    name: string
    avatar_url: string | null
    branch: string | null
    semester: number | null
  }
}

type ListingFormState = {
  id?: string
  title: string
  description: string
  price: string
  is_negotiable: boolean
  category: string
  condition: string
  images: string[]
  imageFiles: File[]
}

const EMPTY_FORM: ListingFormState = {
  title: '',
  description: '',
  price: '',
  is_negotiable: false,
  category: 'Books',
  condition: 'good',
  images: [],
  imageFiles: [],
}

function MarketplaceCard({
  listing,
  onToggleSave,
  onOpen,
  onOpenInterests,
  isMine,
  onEdit,
  onToggleStatus,
}: {
  listing: MarketplaceListing
  onToggleSave: (listing: MarketplaceListing) => void
  onOpen: (listing: MarketplaceListing) => void
  onOpenInterests?: (listing: MarketplaceListing) => void
  isMine?: boolean
  onEdit?: (listing: MarketplaceListing) => void
  onToggleStatus?: (listing: MarketplaceListing) => void
}) {
  const category = categoryMeta(listing.category)

  return (
    <article className="overflow-hidden rounded-2xl border border-[#1e1e2e] bg-[#13131a]">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpen(listing)}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onOpen(listing)
          }
        }}
        className="relative block h-36 w-full text-left"
      >
        {listing.images.length > 0 ? (
          <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover" />
        ) : (
          <div className={`grid h-full w-full place-items-center bg-gradient-to-br ${category.gradient}`}>
            <span className="text-4xl">{category.emoji}</span>
          </div>
        )}

        {listing.status === 'sold' && (
          <div className="absolute inset-0 grid place-items-center bg-black/65 text-sm font-semibold tracking-wide text-white">
            SOLD
          </div>
        )}

        <button
          type="button"
          onClick={event => {
            event.stopPropagation()
            onToggleSave(listing)
          }}
          className="absolute right-2 top-2 rounded-full border border-white/20 bg-black/45 p-1.5 text-white"
        >
          <Heart className={`h-4 w-4 ${listing.is_saved ? 'fill-pink-500 text-pink-500' : ''}`} />
        </button>

        <span className={`absolute bottom-2 left-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${conditionPillClass(listing.condition)}`}>
          {listing.condition}
        </span>
      </div>

      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-white">{listing.title}</h3>
        <p className="mt-1 text-sm font-semibold text-white">
          {formatInr(listing.price)}
          {listing.is_negotiable && <span className="ml-1 text-xs font-medium text-emerald-300">nego</span>}
        </p>
        <p className="mt-1 truncate text-xs text-white/70">👤 {listing.seller.name}</p>
        <p className="text-xs text-white/55">🕐 {timeAgo(listing.created_at)}</p>
        <p className="text-xs text-white/55">👁 {listing.views_count} views</p>

        {isMine && (
          <>
            <button
              type="button"
              onClick={() => onOpenInterests?.(listing)}
              className="mt-2 text-xs text-indigo-300 hover:text-indigo-200"
            >
              {listing.interested_count} people interested
            </button>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => onEdit?.(listing)}
                className="flex-1 rounded-lg border border-[#2a2a2a] bg-[#111111] px-2 py-1 text-xs text-white/80"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onToggleStatus?.(listing)}
                className="flex-1 rounded-lg border border-[#2a2a2a] bg-[#111111] px-2 py-1 text-xs text-emerald-300"
              >
                {listing.status === 'sold' ? 'Mark Active' : 'Mark Sold'}
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  )
}

export default function MarketplacePage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()
  const uploadInputRef = useRef<HTMLInputElement | null>(null)

  const [tab, setTab] = useState<'browse' | 'saved' | 'my'>('browse')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('All')
  const [sort, setSort] = useState<MarketplaceSort>('newest')
  const [filterOpen, setFilterOpen] = useState(false)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'sold' | ''>('active')
  const [selectedConditions, setSelectedConditions] = useState<string[]>([])
  const [createSheetOpen, setCreateSheetOpen] = useState(false)
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1)
  const [editingListingId, setEditingListingId] = useState<string | null>(null)
  const [form, setForm] = useState<ListingFormState>(EMPTY_FORM)
  const [interestsDrawer, setInterestsDrawer] = useState<{ open: boolean; listing: MarketplaceListing | null }>({ open: false, listing: null })

  useEffect(() => {
    const requestedTab = searchParams.get('tab')
    if (requestedTab === 'browse' || requestedTab === 'saved' || requestedTab === 'my') {
      setTab(requestedTab)
    }
  }, [searchParams])

  const browseQuery = useQuery({
    queryKey: ['marketplace-browse', category, sort, minPrice, maxPrice, search, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (category !== 'All') params.set('category', category)
      if (search.trim()) params.set('search', search.trim())
      if (minPrice.trim()) params.set('min_price', minPrice)
      if (maxPrice.trim()) params.set('max_price', maxPrice)
      if (statusFilter) params.set('status', statusFilter)
      params.set('sort', sort)
      params.set('limit', '60')
      return apiFetch<MarketplaceListResponse>(`/api/marketplace?${params.toString()}`)
    },
  })

  const savedQuery = useQuery({
    queryKey: ['marketplace-saved'],
    enabled: tab === 'saved',
    queryFn: () => apiFetch<MarketplaceListResponse>('/api/marketplace/my/saved'),
  })

  const myListingsQuery = useQuery({
    queryKey: ['marketplace-my-listings'],
    enabled: tab === 'my',
    queryFn: () => apiFetch<MarketplaceListResponse>('/api/marketplace/my/listings'),
  })

  const listingInterestsQuery = useQuery({
    queryKey: ['marketplace-listing-interests', interestsDrawer.listing?.id],
    enabled: interestsDrawer.open && Boolean(interestsDrawer.listing?.id),
    queryFn: () => apiFetch<{ interests: ListingInterest[] }>(`/api/marketplace/${interestsDrawer.listing?.id}/interests`),
  })

  const toggleSaveMutation = useMutation({
    mutationFn: (listingId: string) => apiFetch<{ ok: true; saved: boolean }>(`/api/marketplace/${listingId}/save`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['marketplace-browse'] })
      void queryClient.invalidateQueries({ queryKey: ['marketplace-saved'] })
      void queryClient.invalidateQueries({ queryKey: ['marketplace-my-listings'] })
    },
  })

  const createOrUpdateMutation = useMutation({
    mutationFn: async () => {
      const uploadedUrls: string[] = [...form.images]

      for (const file of form.imageFiles) {
        const data = new FormData()
        data.append('file', file)
        const res = await apiFetch<{ url: string }>('/api/marketplace/upload-image', {
          method: 'POST',
          body: data,
        })
        uploadedUrls.push(res.url)
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        price: Number(form.price),
        is_negotiable: form.is_negotiable,
        category: form.category,
        condition: form.condition,
        images: uploadedUrls.slice(0, 5),
      }

      if (editingListingId) {
        return apiFetch<{ listing: MarketplaceListing }>(`/api/marketplace/${editingListingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      }

      return apiFetch<{ listing: MarketplaceListing }>('/api/marketplace', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    onSuccess: ({ listing }) => {
      toast({ variant: 'success', title: editingListingId ? 'Listing updated' : 'Listed! Your item is now live on the marketplace.' })
      setCreateSheetOpen(false)
      setCreateStep(1)
      setEditingListingId(null)
      setForm(EMPTY_FORM)
      void queryClient.invalidateQueries({ queryKey: ['marketplace-browse'] })
      void queryClient.invalidateQueries({ queryKey: ['marketplace-my-listings'] })
      navigate(`/marketplace/${listing.id}`)
    },
    onError: error => {
      toast({ variant: 'error', title: 'Could not publish listing', description: error instanceof Error ? error.message : 'Please try again' })
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: (listing: MarketplaceListing) => apiFetch(`/api/marketplace/${listing.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: listing.status === 'sold' ? 'active' : 'sold' }),
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['marketplace-browse'] })
      void queryClient.invalidateQueries({ queryKey: ['marketplace-my-listings'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (listingId: string) => apiFetch(`/api/marketplace/${listingId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({ variant: 'success', title: 'Listing deleted' })
      navigate('/marketplace')
      void queryClient.invalidateQueries({ queryKey: ['marketplace-browse'] })
      void queryClient.invalidateQueries({ queryKey: ['marketplace-my-listings'] })
    },
  })

  const browseListings = useMemo(() => {
    const base = browseQuery.data?.listings ?? []
    if (selectedConditions.length === 0) return base
    return base.filter(item => selectedConditions.includes(item.condition.toLowerCase()))
  }, [browseQuery.data?.listings, selectedConditions])

  const activeListings = useMemo(() => {
    if (tab === 'browse') return browseListings
    if (tab === 'saved') return savedQuery.data?.listings ?? []
    return myListingsQuery.data?.listings ?? []
  }, [tab, browseListings, savedQuery.data?.listings, myListingsQuery.data?.listings])

  // Hide known frontend/dev seeded listings
  const visibleListings = useMemo(() => {
    const base = activeListings ?? []
    return base.filter(item => {
      if (!item || !item.id) return false
      const id = String(item.id)
      if (id === 'preview') return false
      if (id.startsWith('seed-')) return false
      if (item.seller && (item.seller.id === 'self' || item.seller.name === 'You')) return false
      return true
    })
  }, [activeListings])

  const myStats = useMemo(() => {
    const rows = myListingsQuery.data?.listings ?? []
    const active = rows.filter(item => item.status === 'active').length
    const sold = rows.filter(item => item.status === 'sold').length
    const views = rows.reduce((sum, item) => sum + item.views_count, 0)
    return { active, sold, views }
  }, [myListingsQuery.data?.listings])

  function openCreateSheet(listing?: MarketplaceListing) {
    if (listing) {
      setEditingListingId(listing.id)
      setForm({
        id: listing.id,
        title: listing.title,
        description: listing.description ?? '',
        price: String(listing.price),
        is_negotiable: listing.is_negotiable,
        category: listing.category,
        condition: listing.condition.toLowerCase(),
        images: listing.images,
        imageFiles: [],
      })
      setCreateStep(2)
    } else {
      setEditingListingId(null)
      setForm(EMPTY_FORM)
      setCreateStep(1)
    }
    setCreateSheetOpen(true)
  }

  function removeImage(index: number) {
    const remoteCount = form.images.length
    if (index < remoteCount) {
      setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))
      return
    }
    const localIndex = index - remoteCount
    setForm(prev => ({ ...prev, imageFiles: prev.imageFiles.filter((_, i) => i !== localIndex) }))
  }

  function addFiles(files: FileList | null) {
    if (!files) return
    const next = Array.from(files).slice(0, 5)
    setForm(prev => {
      const room = 5 - (prev.images.length + prev.imageFiles.length)
      if (room <= 0) return prev
      return { ...prev, imageFiles: [...prev.imageFiles, ...next.slice(0, room)] }
    })
  }

  const previewImages = [...form.images, ...form.imageFiles.map(file => URL.createObjectURL(file))]

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0a0a0f] px-4 py-6 pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] text-white md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 rounded-2xl border border-[#1e1e2e] bg-[#13131a] p-3">
          <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
            {[
              { key: 'browse', label: '🛍 Browse' },
              { key: 'saved', label: '❤️ Saved' },
              { key: 'my', label: '📦 My Listings' },
            ].map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  const nextTab = item.key as 'browse' | 'saved' | 'my'
                  setTab(nextTab)
                  setSearchParams(prev => {
                    const next = new URLSearchParams(prev)
                    next.set('tab', nextTab)
                    return next
                  })
                }}
                className={`rounded-xl px-3 py-2 ${tab === item.key ? 'bg-indigo-600 text-white' : 'bg-[#0f0f0f] text-white/70'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'browse' && (
          <>
            <div className="mb-3 flex items-center gap-2">
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search items..."
                className="h-11 flex-1 rounded-xl border border-[#1e1e2e] bg-[#13131a] px-3 text-sm text-white"
              />
              <button type="button" onClick={() => setFilterOpen(true)} className="inline-flex h-11 items-center gap-1 rounded-xl border border-[#1e1e2e] bg-[#13131a] px-3 text-sm text-white/80">
                <SlidersHorizontal className="h-4 w-4" /> Filter
              </button>
              <select
                value={sort}
                onChange={event => setSort(event.target.value as MarketplaceSort)}
                className="h-11 rounded-xl border border-[#1e1e2e] bg-[#13131a] px-2 text-sm"
              >
                <option value="newest">Newest</option>
                <option value="price_low">Price ↑</option>
                <option value="price_high">Price ↓</option>
                <option value="popular">Popular</option>
              </select>
            </div>

            <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {MARKETPLACE_CATEGORIES.map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setCategory(item.key)}
                  className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs ${category === item.key ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200' : 'border-[#1e1e2e] bg-[#13131a] text-white/70'}`}
                >
                  {item.emoji} {item.label}
                </button>
              ))}
            </div>
          </>
        )}

        {tab === 'my' && (
          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-3 text-center"><p className="text-[11px] text-white/60">Active</p><p className="text-lg font-semibold text-emerald-300">{myStats.active}</p></div>
            <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-3 text-center"><p className="text-[11px] text-white/60">Sold</p><p className="text-lg font-semibold text-amber-300">{myStats.sold}</p></div>
            <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-3 text-center"><p className="text-[11px] text-white/60">Views</p><p className="text-lg font-semibold text-indigo-200">{myStats.views}</p></div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {visibleListings.map(item => (
            <MarketplaceCard
              key={item.id}
              listing={item}
              onToggleSave={(listing) => toggleSaveMutation.mutate(listing.id)}
              onOpen={(listing) => navigate(`/marketplace/${listing.id}`)}
              isMine={tab === 'my'}
              onOpenInterests={(listing) => setInterestsDrawer({ open: true, listing })}
              onEdit={(listing) => openCreateSheet(listing)}
              onToggleStatus={(listing) => toggleStatusMutation.mutate(listing)}
            />
          ))}
        </div>

        {activeListings.length === 0 && (
          <div className="mt-8 rounded-2xl border border-[#1e1e2e] bg-[#13131a] p-8 text-center">
            <p className="text-base font-semibold text-white">{tab === 'saved' ? 'No saved items yet' : 'No listings found'}</p>
            <p className="mt-1 text-sm text-white/60">
              {tab === 'saved' ? 'Heart items you like to save them here' : 'Try adjusting filters or list an item first.'}
            </p>
          </div>
        )}

        {tab === 'my' && (
          <button
            type="button"
            onClick={() => openCreateSheet()}
            className="fixed bottom-[calc(5.8rem+env(safe-area-inset-bottom,0px))] right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-[0_10px_24px_rgba(99,102,241,0.45)]"
            aria-label="Create listing"
          >
            <Plus className="h-6 w-6" />
          </button>
        )}
      </div>

      {filterOpen && (
        <div className="fixed inset-0 z-50">
          <button className="absolute inset-0 bg-black/70" onClick={() => setFilterOpen(false)} aria-label="Close filters" />
          <aside className="absolute right-0 top-0 h-full w-full max-w-sm overflow-y-auto border-l border-[#1e1e2e] bg-[#13131a] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">Filters</h3>
              <button type="button" onClick={() => setFilterOpen(false)}><X className="h-5 w-5" /></button>
            </div>

            <label className="mb-1 block text-xs text-white/70">Price Range</label>
            <div className="grid grid-cols-2 gap-2">
              <input value={minPrice} onChange={event => setMinPrice(event.target.value)} placeholder="Min ₹" className="h-10 rounded-lg border border-[#1e1e2e] bg-[#0f0f0f] px-3 text-sm" />
              <input value={maxPrice} onChange={event => setMaxPrice(event.target.value)} placeholder="Max ₹" className="h-10 rounded-lg border border-[#1e1e2e] bg-[#0f0f0f] px-3 text-sm" />
            </div>

            <label className="mb-1 mt-4 block text-xs text-white/70">Condition</label>
            <div className="flex flex-wrap gap-2">
              {MARKETPLACE_CONDITIONS.map(item => {
                const selected = selectedConditions.includes(item)
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSelectedConditions(prev => selected ? prev.filter(v => v !== item) : [...prev, item])}
                    className={`rounded-full border px-3 py-1 text-xs capitalize ${selected ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200' : 'border-[#2a2a2a] bg-[#0f0f0f] text-white/70'}`}
                  >
                    {item}
                  </button>
                )
              })}
            </div>

            <label className="mb-1 mt-4 block text-xs text-white/70">Status</label>
            <div className="flex gap-2">
              {[
                { key: 'active', label: 'Active' },
                { key: 'sold', label: 'Sold' },
                { key: '', label: 'Both' },
              ].map(item => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setStatusFilter(item.key as 'active' | 'sold' | '')}
                  className={`rounded-full border px-3 py-1 text-xs ${statusFilter === item.key ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200' : 'border-[#2a2a2a] bg-[#0f0f0f] text-white/70'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMinPrice('')
                  setMaxPrice('')
                  setStatusFilter('active')
                  setSelectedConditions([])
                }}
                className="rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm text-white/75"
              >
                Clear Filters
              </button>
              <button type="button" onClick={() => setFilterOpen(false)} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
                Apply Filters
              </button>
            </div>
          </aside>
        </div>
      )}

      {interestsDrawer.open && interestsDrawer.listing && (
        <div className="fixed inset-0 z-50">
          <button className="absolute inset-0 bg-black/70" onClick={() => setInterestsDrawer({ open: false, listing: null })} aria-label="Close interested drawer" />
          <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-[#1e1e2e] bg-[#13131a] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Interested Buyers</h3>
              <button type="button" onClick={() => setInterestsDrawer({ open: false, listing: null })}><X className="h-5 w-5" /></button>
            </div>

            {(listingInterestsQuery.data?.interests ?? []).map(interest => (
              <div key={interest.id} className="mb-2 rounded-xl border border-[#1e1e2e] bg-[#0f0f0f] p-3">
                <div className="flex items-center gap-2">
                  <UserAvatar name={interest.buyer.name} avatarUrl={interest.buyer.avatar_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{interest.buyer.name}</p>
                    <p className="text-xs text-white/60">{interest.buyer.branch || 'PESU'} {interest.buyer.semester ? `• Sem ${interest.buyer.semester}` : ''}</p>
                  </div>
                </div>
                {interest.message && <p className="mt-2 text-xs text-white/80">Message: {interest.message}</p>}
                <button
                  type="button"
                  onClick={() => navigate(`/messages?user=${interest.buyer.id}`)}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-300"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Message them →
                </button>
              </div>
            ))}

            {(listingInterestsQuery.data?.interests ?? []).length === 0 && (
              <p className="text-sm text-white/60">No interests yet for this listing.</p>
            )}
          </aside>
        </div>
      )}

      {createSheetOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0a0a0f] p-4">
          <div className="mx-auto w-full max-w-xl pb-20">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editingListingId ? 'Edit Listing' : 'List an Item'}</h2>
              <button type="button" onClick={() => { setCreateSheetOpen(false); setCreateStep(1) }} className="rounded-full border border-[#2a2a2a] p-2"><X className="h-4 w-4" /></button>
            </div>

            {createStep === 1 && (
              <section className="rounded-2xl border border-[#1e1e2e] bg-[#13131a] p-4">
                <p className="text-sm font-semibold">Add up to 5 photos</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {previewImages.map((src, index) => (
                    <div key={`${src}-${index}`} className="relative h-32 overflow-hidden rounded-xl border border-[#2a2a2a]">
                      <img src={src} alt="preview" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => removeImage(index)} className="absolute right-1 top-1 rounded-full bg-black/70 p-1"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                  {previewImages.length < 5 && (
                    <button
                      type="button"
                      onClick={() => uploadInputRef.current?.click()}
                      className="grid h-32 place-items-center rounded-xl border border-dashed border-[#3a3a50] bg-[#0f0f0f] text-white/65"
                    >
                      <span className="inline-flex items-center gap-1 text-sm"><ImagePlus className="h-4 w-4" /> Add Photo</span>
                    </button>
                  )}
                </div>
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={event => addFiles(event.target.files)}
                />
                <p className="mt-3 text-xs text-white/55">Good photos = faster sales 📸</p>
                <div className="mt-4 flex justify-end">
                  <button type="button" onClick={() => setCreateStep(2)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold">Skip</button>
                </div>
              </section>
            )}

            {createStep === 2 && (
              <section className="space-y-4 rounded-2xl border border-[#1e1e2e] bg-[#13131a] p-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Title *</label>
                  <input
                    value={form.title}
                    onChange={event => setForm(prev => ({ ...prev, title: event.target.value.slice(0, 100) }))}
                    placeholder="What are you selling?"
                    className="h-11 w-full rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] px-3 text-sm"
                  />
                  <p className="mt-1 text-right text-[11px] text-white/45">{form.title.length}/100</p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Category *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {MARKETPLACE_CATEGORIES.filter(item => item.key !== 'All').map(item => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, category: item.key }))}
                        className={`rounded-xl border px-3 py-2 text-left text-sm ${form.category === item.key ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200' : 'border-[#2a2a2a] bg-[#0f0f0f] text-white/75'}`}
                      >
                        {item.emoji} {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Condition *</label>
                  <div className="flex flex-wrap gap-2">
                    {MARKETPLACE_CONDITIONS.map(item => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, condition: item }))}
                        className={`rounded-full border px-3 py-1 text-xs capitalize ${form.condition === item ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200' : 'border-[#2a2a2a] bg-[#0f0f0f] text-white/75'}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Price *</label>
                  <input
                    value={form.price}
                    onChange={event => setForm(prev => ({ ...prev, price: event.target.value.replace(/[^\d.]/g, '') }))}
                    placeholder="₹"
                    className="h-11 w-full rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] px-3 text-sm"
                  />
                  <label className="mt-2 inline-flex items-center gap-2 text-sm text-white/80">
                    <input type="checkbox" checked={form.is_negotiable} onChange={event => setForm(prev => ({ ...prev, is_negotiable: event.target.checked }))} />
                    Open to negotiation
                  </label>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Description</label>
                  <textarea
                    value={form.description}
                    onChange={event => setForm(prev => ({ ...prev, description: event.target.value.slice(0, 1000) }))}
                    rows={5}
                    placeholder="Describe your item..."
                    className="w-full rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm"
                  />
                  <p className="mt-1 text-right text-[11px] text-white/45">{form.description.length}/1000</p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!form.title.trim() || !form.category || !form.condition || !form.price || Number(form.price) < 0) {
                        toast({ variant: 'error', title: 'Please fill all required fields' })
                        return
                      }
                      setCreateStep(3)
                    }}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold"
                  >
                    Preview →
                  </button>
                </div>
              </section>
            )}

            {createStep === 3 && (
              <section className="space-y-4 rounded-2xl border border-[#1e1e2e] bg-[#13131a] p-4">
                <p className="text-sm text-white/75">This is how your listing will look</p>
                <MarketplaceCard
                  listing={{
                    id: 'preview',
                    title: form.title,
                    description: form.description,
                    price: Number(form.price || 0),
                    is_negotiable: form.is_negotiable,
                    category: form.category,
                    condition: form.condition,
                    images: previewImages,
                    status: 'active',
                    campus: null,
                    views_count: 0,
                    interested_count: 0,
                    created_at: new Date().toISOString(),
                    seller: { id: 'self', name: 'You', avatar_url: null, srn: null, branch: null, semester: null },
                    is_saved: false,
                    has_expressed_interest: false,
                  }}
                  onToggleSave={() => undefined}
                  onOpen={() => undefined}
                />

                <div className="flex gap-2">
                  <button type="button" onClick={() => setCreateStep(2)} className="flex-1 rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-2 text-sm">← Edit</button>
                  <button type="button" onClick={() => createOrUpdateMutation.mutate()} disabled={createOrUpdateMutation.isPending} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold disabled:opacity-60">
                    {createOrUpdateMutation.isPending ? 'Posting...' : 'Post Listing 🚀'}
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      )}

      {editingListingId && createSheetOpen && (
        <button
          type="button"
          onClick={() => {
            if (!editingListingId) return
            if (!confirm('Delete this listing?')) return
            deleteMutation.mutate(editingListingId)
          }}
          className="fixed bottom-5 left-4 z-50 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300"
        >
          Delete Listing
        </button>
      )}
    </div>
  )
}
