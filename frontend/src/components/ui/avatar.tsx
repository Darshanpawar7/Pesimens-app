import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '../../lib/utils'

const sizeClasses = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  size?: keyof typeof sizeClasses
  online?: boolean
}

const Avatar = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Root>, AvatarProps>(
  ({ className, size = 'md', online, children, ...props }, ref) => (
    <div className="relative inline-flex">
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(
          'relative flex shrink-0 overflow-hidden rounded-full',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </AvatarPrimitive.Root>
      {online !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-white dark:ring-gray-900',
            size === 'xs' || size === 'sm' ? 'h-2 w-2' : 'h-3 w-3',
            online ? 'bg-green-500' : 'bg-gray-400'
          )}
          aria-label={online ? 'Online' : 'Offline'}
        />
      )}
    </div>
  )
)
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 font-medium text-indigo-700 dark:text-indigo-300',
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }

// Convenience component
interface UserAvatarProps {
  name?: string | null
  avatarUrl?: string | null
  size?: keyof typeof sizeClasses
  online?: boolean
  className?: string
}

export function UserAvatar({ name, avatarUrl, size = 'md', online, className }: UserAvatarProps) {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <Avatar size={size} online={online} className={className}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name ?? 'User avatar'} />}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  )
}
