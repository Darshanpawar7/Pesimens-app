import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'

/**
 * RootRedirect handles the conditional redirect logic for the root route (/).
 * - Unauthenticated users are redirected to /explore
 * - Authenticated users see the HomePage (no redirect)
 */
export function RootRedirect({ children }: { children: React.ReactNode }) {
  const session = useAuthStore(state => state.session)
  const isLoading = useAuthStore(state => state.isLoading)

  // Wait for auth state to be determined
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  // Redirect unauthenticated users to /explore
  if (!session) {
    return <Navigate to="/explore" replace />
  }

  // Authenticated users see the home dashboard
  return <>{children}</>
}
