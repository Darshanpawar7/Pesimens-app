import React from 'react'

interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
  width?: number | string
  height?: number | string
  borderRadius?: number | string
}

/**
 * Reusable skeleton placeholder with pulse animation.
 * Uses inline styles consistent with the chess game dark theme.
 */
export function Skeleton({ className, style, width = '100%', height = 20, borderRadius = 6 }: SkeletonProps) {
  return (
    <>
      <style>{`
        @keyframes chess-skeleton-pulse {
          0%, 100% { background-color: #2a2a2a; }
          50% { background-color: #3a3a3a; }
        }
      `}</style>
      <div
        className={className}
        style={{
          width,
          height,
          borderRadius,
          animation: 'chess-skeleton-pulse 1.4s ease-in-out infinite',
          flexShrink: 0,
          ...style,
        }}
      />
    </>
  )
}
