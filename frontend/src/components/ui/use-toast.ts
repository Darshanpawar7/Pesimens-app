import * as React from 'react'

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info'

interface ToastData {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface ToastContextValue {
  toast: (data: Omit<ToastData, 'id'>) => void
}

export const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastContextProvider')
  return ctx
}
