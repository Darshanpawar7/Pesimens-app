import { createContext, useContext, useState, useRef, type ReactNode, type KeyboardEvent } from 'react'

interface TabsContextValue {
  active: string
  setActive: (v: string) => void
  orientation: 'horizontal' | 'vertical'
}

const TabsContext = createContext<TabsContextValue>({
  active: '',
  setActive: () => {},
  orientation: 'horizontal',
})

interface TabsProps {
  defaultValue: string
  value?: string
  onValueChange?: (v: string) => void
  orientation?: 'horizontal' | 'vertical'
  children: ReactNode
  className?: string
}

export function Tabs({ defaultValue, value, onValueChange, orientation = 'horizontal', children, className = '' }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue)
  const active = value ?? internal
  const setActive = (v: string) => {
    setInternal(v)
    onValueChange?.(v)
  }
  return (
    <TabsContext.Provider value={{ active, setActive, orientation }}>
      <div className={`${orientation === 'vertical' ? 'flex gap-4' : ''} ${className}`}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  children: ReactNode
  className?: string
}

export function TabsList({ children, className = '' }: TabsListProps) {
  const { orientation } = useContext(TabsContext)
  const listRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = (e: KeyboardEvent) => {
    const tabs = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])')
    if (!tabs) return
    const arr = Array.from(tabs)
    const idx = arr.indexOf(document.activeElement as HTMLButtonElement)
    const isHorizontal = orientation === 'horizontal'
    if ((isHorizontal && e.key === 'ArrowRight') || (!isHorizontal && e.key === 'ArrowDown')) {
      arr[(idx + 1) % arr.length]?.focus()
    } else if ((isHorizontal && e.key === 'ArrowLeft') || (!isHorizontal && e.key === 'ArrowUp')) {
      arr[(idx - 1 + arr.length) % arr.length]?.focus()
    }
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-orientation={orientation}
      onKeyDown={handleKeyDown}
      className={`${orientation === 'horizontal'
        ? 'flex border-b border-[#3a3a4a] bg-[#151522]'
        : 'flex flex-col border-r border-[#3a3a4a] bg-[#151522] min-w-[140px]'
      } ${className}`}
    >
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: ReactNode
  disabled?: boolean
  className?: string
}

export function TabsTrigger({ value, children, disabled, className = '' }: TabsTriggerProps) {
  const { active, setActive, orientation } = useContext(TabsContext)
  const isActive = active === value

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${value}`}
      id={`tab-${value}`}
      disabled={disabled}
      tabIndex={isActive ? 0 : -1}
      onClick={() => setActive(value)}
      className={`
        px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
        disabled:opacity-50 disabled:cursor-not-allowed
        ${orientation === 'horizontal'
          ? `border-b-2 -mb-px ${isActive ? 'border-indigo-400 bg-indigo-400/25 text-indigo-200' : 'border-transparent text-gray-300 hover:text-gray-100'}`
          : `border-r-2 -mr-px text-left ${isActive ? 'border-indigo-400 bg-indigo-400/25 text-indigo-200' : 'border-transparent text-gray-300 hover:text-gray-100'}`
        }
        ${className}
      `}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: ReactNode
  className?: string
}

export function TabsContent({ value, children, className = '' }: TabsContentProps) {
  const { active } = useContext(TabsContext)
  if (active !== value) return null
  return (
    <div
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      className={className}
    >
      {children}
    </div>
  )
}
