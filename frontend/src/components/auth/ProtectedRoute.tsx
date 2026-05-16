import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useExploreUIStore } from '@/store/exploreUI'
import { useEffect } from 'react'

interface Props {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function ProtectedRoute({ children, requireAdmin = false }: Props) {
  const { session, profile, isLoading, isProfileLoading } = useAuthStore()
  const openLoginSheet = useExploreUIStore(state => state.openLoginSheet)
  const location = useLocation()

  useEffect(() => {
    if (!isLoading && !isProfileLoading && !session) {
      openLoginSheet(location.pathname)
    }
  }, [isLoading, isProfileLoading, session, location.pathname, openLoginSheet])

  if (isLoading || isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A56DB]" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/explore" replace />
  }

  // Redirect to onboarding if profile is missing or incomplete
  // BUG FIX (Bug 3.7): Use strict equality check to prevent undefined/null bypass
  // Requirements: 2.19, 3.15
  if (location.pathname !== '/onboard') {
    if (!profile || profile.onboarding_completed !== true) {
      return <Navigate to="/onboard" replace />
    }
  }

  if (requireAdmin && profile?.role !== 'admin' && profile?.role !== 'moderator') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
