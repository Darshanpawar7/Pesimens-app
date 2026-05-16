import { createContext } from 'react'

export type Theme = 'dark'

export interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'dark'
  setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
