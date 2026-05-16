import { cn } from '../../lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangle' | 'circle' | 'text'
}

export function Skeleton({ className, variant = 'rectangle', ...props }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading..."
      className={cn(
        'animate-pulse bg-gray-200 dark:bg-gray-700',
        variant === 'circle' && 'rounded-full',
        variant === 'text' && 'rounded h-4',
        variant === 'rectangle' && 'rounded-md',
        className
      )}
      {...props}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <Skeleton className="h-40 w-full" />
      <Skeleton variant="text" className="w-3/4" />
      <Skeleton variant="text" className="w-1/2" />
      <div className="flex gap-2">
        <Skeleton variant="text" className="w-16 h-6 rounded-full" />
        <Skeleton variant="text" className="w-16 h-6 rounded-full" />
      </div>
    </div>
  )
}
