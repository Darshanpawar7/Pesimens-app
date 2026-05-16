import { createContext } from 'react'

export interface AuthContextValue {
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  refreshSyncToken: () => Promise<boolean>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
