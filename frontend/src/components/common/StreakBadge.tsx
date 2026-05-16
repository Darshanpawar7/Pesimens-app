import { cn } from '@/lib/utils'

interface Props {
  streak: number
}

export function StreakBadge({ streak }: Props) {
  if (streak <= 0) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold',
        streak > 2
          ? 'border-orange-400/50 bg-orange-500/20 text-orange-200 shadow-[0_0_20px_rgba(251,146,60,0.2)]'
          : 'border-orange-500/30 bg-orange-500/10 text-orange-300'
      )}
    >
      <span aria-hidden>🔥</span>
      <span>{streak} day streak</span>
    </span>
  )
}
