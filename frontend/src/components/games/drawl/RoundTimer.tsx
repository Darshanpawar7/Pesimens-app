import { useEffect, useState } from 'react'
import { Timer } from 'lucide-react'
 
export interface RoundTimerProps {
  duration?: number
  startedAt: number
  onEnd?: () => void
}
 
export function RoundTimer({ duration = 80, startedAt, onEnd }: RoundTimerProps) {
  const [remaining, setRemaining] = useState(duration)
 
  useEffect(() => {
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      const left = Math.max(0, duration - elapsed)
      setRemaining(left)
      if (left <= 0) onEnd?.()
    }
 
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [duration, startedAt, onEnd])
 
  const urgent = remaining <= 10
  const pct = Math.max(0, Math.min(1, remaining / duration))
 
  return (
    <div className={`flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#1a1a1a] px-4 py-3 ${urgent ? 'animate-pulse' : ''}`}>
      <Timer className={`h-5 w-5 ${urgent ? 'text-rose-400' : 'text-indigo-400'}`} />
      <div className="flex-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${urgent ? 'bg-rose-400' : 'bg-indigo-500'}`}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      </div>
      <span className={`min-w-[2.5rem] text-right text-lg font-bold tabular-nums ${urgent ? 'text-rose-400' : 'text-white'}`}>
        {remaining}s
      </span>
    </div>
  )
}
 
export default RoundTimer