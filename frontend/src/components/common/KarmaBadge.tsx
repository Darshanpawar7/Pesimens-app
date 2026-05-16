import { cn } from '@/lib/utils'

interface Props {
  karma: number
  showLabel?: boolean
}

function getTier(karma: number) {
  if (karma >= 1000) {
    return {
      emoji: '👑',
      name: 'Elite',
      className: 'border-yellow-400/40 bg-gradient-to-r from-yellow-500/20 via-amber-400/20 to-yellow-300/20 text-yellow-200',
    }
  }
  if (karma >= 700) {
    return {
      emoji: '🏆',
      name: 'Legend',
      className: 'border-violet-500/40 bg-violet-500/15 text-violet-200',
    }
  }
  if (karma >= 350) {
    return {
      emoji: '💎',
      name: 'Scholar',
      className: 'border-indigo-500/40 bg-indigo-500/15 text-indigo-200',
    }
  }
  if (karma >= 150) {
    return {
      emoji: '🔥',
      name: 'Contributor',
      className: 'border-amber-500/40 bg-amber-500/15 text-amber-200',
    }
  }
  if (karma >= 50) {
    return {
      emoji: '⚡',
      name: 'Active',
      className: 'border-sky-500/40 bg-sky-500/15 text-sky-200',
    }
  }
  return {
    emoji: '🌱',
    name: 'Seedling',
    className: 'border-zinc-500/40 bg-zinc-500/15 text-zinc-200',
  }
}

export function KarmaBadge({ karma, showLabel = true }: Props) {
  const tier = getTier(karma)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
        tier.className
      )}
    >
      <span aria-hidden>{tier.emoji}</span>
      {showLabel && <span>{tier.name}</span>}
      <span>{karma} karma</span>
    </span>
  )
}
