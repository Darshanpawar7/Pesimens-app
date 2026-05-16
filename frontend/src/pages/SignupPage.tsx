import { Navigate } from 'react-router-dom'

export function SignupPage() {
  // PESU Hub does not have a separate signup flow.
  // Authentication is handled exclusively via PESU Academy credentials on the login page.
  // This redirect ensures any user who lands on /signup is sent to /login instead.
  return <Navigate to="/login" replace />
}
