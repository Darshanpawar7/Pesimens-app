import {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from 'react'

interface DropdownContextValue {
  open: boolean
  setOpen: (v: boolean) => void
}

const DropdownContext = createContext<DropdownContextValue>({ open: false, setOpen: () => {} })

interface DropdownProps {
  children: ReactNode
}

export function Dropdown({ children }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div ref={ref} className="relative inline-block">
        {children}
      </div>
    </DropdownContext.Provider>
  )
}

export function DropdownTrigger({ children }: { children: ReactNode }) {
  const { open, setOpen } = useContext(DropdownContext)
  return (
    <div onClick={() => setOpen(!open)} className="cursor-pointer">
      {children}
    </div>
  )
}

interface DropdownContentProps {
  children: ReactNode
  align?: 'left' | 'right'
  className?: string
}

export function DropdownContent({ children, align = 'left', className = '' }: DropdownContentProps) {
  const { open } = useContext(DropdownContext)
  if (!open) return null
  return (
    <div
      className={`absolute z-50 mt-1 min-w-[160px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1 animate-in fade-in zoom-in-95 duration-150 ${align === 'right' ? 'right-0' : 'left-0'} ${className}`}
      role="menu"
    >
      {children}
    </div>
  )
}

interface DropdownItemProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}

export function DropdownItem({ children, onClick, disabled, className = '' }: DropdownItemProps) {
  const { setOpen } = useContext(DropdownContext)
  return (
    <button
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        onClick?.()
        setOpen(false)
      }}
      className={`w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {children}
    </button>
  )
}

export function DropdownSeparator() {
  return <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
}
