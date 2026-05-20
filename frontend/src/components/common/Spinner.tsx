interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Reusable loading spinner component.
 * Usage: <Spinner size="md" />
 */
export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-4',
  }

  return (
    <div
      className={`rounded-full border-indigo-600 border-t-transparent animate-spin ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}