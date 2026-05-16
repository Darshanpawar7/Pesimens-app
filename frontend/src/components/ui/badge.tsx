import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border font-semibold transition-colors',
  {
    variants: {
      variant: {
        default:     'border-transparent bg-indigo-600 text-white',
        secondary:   'border-transparent bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100',
        destructive: 'border-transparent bg-red-500 text-white',
        outline:     'border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100',
        success:     'border-transparent bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
        warning:     'border-transparent bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
        error:       'border-transparent bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
        info:        'border-transparent bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

function Badge({ className, variant, size, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      )}
      {children}
    </div>
  )
}

export { Badge }
