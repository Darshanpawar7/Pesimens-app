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
    <div className="group rounded-xl border border-[#2a2a2a] dark:border-gray-700 bg-[#1a1a1a] dark:bg-gray-800 overflow-hidden flex flex-col">
      <div className="aspect-video w-full bg-[#222222] dark:bg-gray-700 animate-pulse" />
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-[#2a2a2a] dark:bg-gray-700 rounded-full animate-pulse" />
        </div>
        <div className="h-5 w-3/4 bg-[#2a2a2a] dark:bg-gray-700 rounded animate-pulse" />
        <div className="flex flex-col gap-2 mt-1">
          <div className="h-3 w-1/2 bg-[#2a2a2a] dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-3 w-2/3 bg-[#2a2a2a] dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="mt-auto pt-4 flex items-center justify-between gap-2">
          <div className="h-4 w-20 bg-[#2a2a2a] dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-8 w-24 bg-[#2a2a2a] dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  )
}

export function PYQSkeleton() {
  return (
    <div className="mb-2 flex overflow-hidden rounded-[12px] border border-[#2a2a2a]">
      <div className="w-[40px] shrink-0 border-r border-[#2a2a2a] bg-[#111111]">
        <div className="flex min-h-[124px] flex-col items-center justify-center gap-2 py-2">
          <div className="h-3 w-3 bg-[#2a2a2a] rounded animate-pulse" />
          <div className="h-4 w-4 bg-[#2a2a2a] rounded animate-pulse" />
          <div className="h-3 w-3 bg-[#2a2a2a] rounded animate-pulse" />
        </div>
      </div>
      <div className="min-w-0 flex-1 bg-[#1a1a1a] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-12 bg-[#2a2a2a] rounded-full animate-pulse" />
          <div className="h-4 w-14 bg-[#2a2a2a] rounded-full animate-pulse" />
          <div className="h-3 w-8 bg-[#2a2a2a] rounded animate-pulse" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-4 w-3/4 bg-[#2a2a2a] rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-[#2a2a2a] rounded animate-pulse" />
        </div>
        <div className="mt-3 flex gap-2">
          <div className="h-4 w-12 bg-[#2a2a2a] rounded-full animate-pulse" />
          <div className="h-4 w-16 bg-[#2a2a2a] rounded-full animate-pulse" />
        </div>
        <div className="my-3 h-px bg-[#2a2a2a]" />
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-3">
            <div className="h-3 w-16 bg-[#2a2a2a] rounded animate-pulse" />
            <div className="h-3 w-12 bg-[#2a2a2a] rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 bg-[#2a2a2a] rounded-full animate-pulse" />
            <div className="h-3 w-16 bg-[#2a2a2a] rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function ConfessionSkeleton() {
  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-[#242424] bg-[#121212] flex">
      <div className="w-[42px] shrink-0 border-r border-[#232323] bg-[#101010]">
        <div className="flex min-h-[128px] flex-col items-center justify-center gap-2 py-2">
          <div className="h-4 w-4 bg-[#2a2a2a] rounded animate-pulse" />
          <div className="h-4 w-5 bg-[#2a2a2a] rounded animate-pulse" />
          <div className="h-4 w-4 bg-[#2a2a2a] rounded animate-pulse" />
        </div>
      </div>
      <div className="min-w-0 flex-1 bg-[#171717] px-4 py-3.5">
        <div className="flex items-center gap-2">
          <div className="h-4 w-16 bg-[#2a2a2a] rounded-full animate-pulse" />
          <div className="h-3 w-20 bg-[#2a2a2a] rounded animate-pulse" />
          <div className="h-3 w-12 bg-[#2a2a2a] rounded animate-pulse" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-4 w-[90%] bg-[#2a2a2a] rounded animate-pulse" />
          <div className="h-4 w-[85%] bg-[#2a2a2a] rounded animate-pulse" />
          <div className="h-4 w-[60%] bg-[#2a2a2a] rounded animate-pulse" />
        </div>
        <div className="mt-4 flex gap-3 border-t border-[#242424] pt-3">
          <div className="h-5 w-10 bg-[#2a2a2a] rounded animate-pulse" />
          <div className="h-5 w-10 bg-[#2a2a2a] rounded animate-pulse" />
          <div className="h-5 w-12 bg-[#2a2a2a] rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
}

export function PersonSkeleton() {
  return (
    <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 rounded-full bg-[#2a2a2a] animate-pulse shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-3/4 bg-[#2a2a2a] rounded animate-pulse" />
          <div className="h-3 w-1/2 bg-[#2a2a2a] rounded animate-pulse" />
        </div>
      </div>
      <div className="mt-3">
        <div className="h-3 w-2/3 bg-[#2a2a2a] rounded animate-pulse" />
      </div>
      <div className="mt-3 flex gap-2">
        <div className="h-4 w-16 bg-[#2a2a2a] rounded-full animate-pulse" />
        <div className="h-4 w-12 bg-[#2a2a2a] rounded-full animate-pulse" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="h-5 w-14 bg-[#2a2a2a] rounded animate-pulse" />
        <div className="h-4 w-20 bg-[#2a2a2a] rounded-full animate-pulse" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-8 w-24 bg-[#2a2a2a] rounded-lg animate-pulse" />
        <div className="h-8 w-24 bg-[#2a2a2a] rounded-lg animate-pulse" />
      </div>
    </div>
  )
}
