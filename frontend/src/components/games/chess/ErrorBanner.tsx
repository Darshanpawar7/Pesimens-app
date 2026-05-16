import { useEffect, useRef } from 'react'

interface ErrorBannerAction {
  label: string
  onClick: () => void
}

interface ErrorBannerProps {
  message: string
  /** Called when the banner is dismissed (X button or auto-dismiss) */
  onClose?: () => void
  /** @deprecated Use onClose instead */
  onDismiss?: () => void
  /** Optional action button (e.g. Retry) */
  action?: ErrorBannerAction
  /** Auto-dismiss after this many ms. Defaults to 5000. Pass 0 to disable. */
  autoDismissMs?: number
}

export function ErrorBanner({
  message,
  onClose,
  onDismiss,
  action,
  autoDismissMs = 5000,
}: ErrorBannerProps) {
  // Support legacy onDismiss prop
  const handleClose = onClose ?? onDismiss

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!handleClose || autoDismissMs === 0) return
    timerRef.current = setTimeout(() => {
      handleClose()
    }, autoDismissMs)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [handleClose, autoDismissMs])

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        background: 'rgba(239,68,68,0.12)',
        border: '1px solid rgba(239,68,68,0.4)',
        borderRadius: 10,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        width: '100%',
        boxSizing: 'border-box',
        animation: 'errorBannerSlideIn 0.25s ease-out',
      }}
    >
      <span style={{ fontSize: 13, color: '#fca5a5', flex: 1 }}>{message}</span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {action && (
          <button
            onClick={action.onClick}
            style={{
              background: 'rgba(99,102,241,0.2)',
              border: '1px solid rgba(99,102,241,0.5)',
              borderRadius: 6,
              color: '#a5b4fc',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 10px',
              whiteSpace: 'nowrap',
            }}
          >
            {action.label}
          </button>
        )}

        {handleClose && (
          <button
            onClick={handleClose}
            aria-label="Dismiss error"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fca5a5',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
