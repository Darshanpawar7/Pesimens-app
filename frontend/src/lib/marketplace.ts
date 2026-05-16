export type MarketplaceSort = 'newest' | 'price_low' | 'price_high' | 'popular'

export type MarketplaceListing = {
  id: string
  title: string
  description: string | null
  price: number
  is_negotiable: boolean
  category: string
  condition: string
  images: string[]
  status: 'active' | 'sold' | 'reserved' | 'deleted'
  campus: string | null
  views_count: number
  interested_count: number
  created_at: string
  updated_at?: string | null
  seller: {
    id: string
    name: string
    avatar_url: string | null
    srn: string | null
    branch: string | null
    semester: number | null
  }
  is_saved: boolean
  has_expressed_interest: boolean
}

export const MARKETPLACE_CATEGORIES = [
  { key: 'All', label: 'All', emoji: '🛍', gradient: 'from-slate-700 to-slate-900' },
  { key: 'Books', label: 'Books', emoji: '📚', gradient: 'from-purple-600 to-purple-900' },
  { key: 'Electronics', label: 'Electronics', emoji: '💻', gradient: 'from-blue-500 to-blue-900' },
  { key: 'Clothing', label: 'Clothing', emoji: '👕', gradient: 'from-pink-500 to-rose-900' },
  { key: 'Gaming', label: 'Gaming', emoji: '🎮', gradient: 'from-orange-500 to-orange-900' },
  { key: 'Transport', label: 'Transport', emoji: '🚲', gradient: 'from-emerald-500 to-emerald-900' },
  { key: 'Hostel', label: 'Hostel', emoji: '🏠', gradient: 'from-amber-400 to-yellow-800' },
  { key: 'Stationery', label: 'Stationery', emoji: '📝', gradient: 'from-teal-500 to-teal-900' },
  { key: 'Other', label: 'Other', emoji: '🔧', gradient: 'from-zinc-500 to-zinc-900' },
] as const

export const MARKETPLACE_CONDITIONS = ['new', 'like new', 'good', 'fair', 'for parts'] as const

export function conditionPillClass(condition: string): string {
  const key = condition.toLowerCase()
  if (key === 'new') return 'border-emerald-500/35 bg-emerald-500/15 text-emerald-200'
  if (key === 'like new') return 'border-teal-500/35 bg-teal-500/15 text-teal-200'
  if (key === 'good') return 'border-blue-500/35 bg-blue-500/15 text-blue-200'
  if (key === 'fair') return 'border-orange-500/35 bg-orange-500/15 text-orange-200'
  if (key === 'for parts') return 'border-red-500/35 bg-red-500/15 text-red-200'
  return 'border-[#2a2a2a] bg-[#171717] text-white/75'
}

export function categoryMeta(category: string) {
  return MARKETPLACE_CATEGORIES.find(item => item.key.toLowerCase() === category.toLowerCase()) ?? MARKETPLACE_CATEGORIES[0]
}

export function formatInr(value: number): string {
  return `₹${new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value)}`
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.max(1, Math.floor(diff / 60000))
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
