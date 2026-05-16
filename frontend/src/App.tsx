import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { RootRedirect } from './components/routing/RootRedirect'
import { OfflineIndicator } from './components/common/OfflineIndicator'
import { PwaInstallNotifier } from './components/common/PwaInstallNotifier'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { ToastContextProvider } from './components/ui/toast'
import { Layout } from './components/layout/Layout'
import { adaptiveQueryDefaults } from './lib/queryThrottle'
import { LoginPage } from './pages/LoginPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import LandingPage from './pages/LandingPage'
import { LoginBottomSheet } from './components/auth/LoginBottomSheet'

/**
 * Wrapper to handle Vercel deployment stale chunk errors
 * 
 * PURPOSE: Handles Vite chunk reload failures during deployment.
 * When a new version is deployed to Vercel, old JavaScript chunks are deleted.
 * Users with the old version loaded will get "Failed to fetch dynamically imported module"
 * errors when navigating to lazy-loaded routes. This wrapper automatically recovers
 * by reloading the page to fetch the new version.
 * 
 * BEHAVIOR: Automatically reloads up to 2 times, then shows error.
 * - On first chunk load failure: Increments counter to 1, reloads page
 * - On second chunk load failure: Increments counter to 2, reloads page
 * - On third chunk load failure: Counter is 2, throws error to user
 * This prevents infinite reload loops while giving the browser chances to fetch new chunks.
 * 
 * TIMING: Counter cleared on successful chunk load.
 * When any lazy-loaded module successfully loads, the counter is immediately cleared.
 * This ensures that subsequent navigation failures are treated as new incidents,
 * not continuations of previous failures. The counter persists only during active
 * failure scenarios via sessionStorage (cleared on tab close).
 * 
 * @param importFn - The dynamic import function for a lazy-loaded module
 * @returns Async function that loads the module with automatic retry on chunk errors
 */
const lazyImport = (importFn: () => Promise<any>) => {
  return async () => {
    try {
      const mod = await importFn()
      // Clear the reload counter on any successful chunk load
      sessionStorage.removeItem('chunk_reload_count')
      return mod
    } catch (error) {
      // If Vercel deployed a new version and the old chunk is gone, Vite throws this error
      if (error instanceof TypeError && error.message.includes('Failed to fetch dynamically imported module')) {
        const reloadCount = parseInt(sessionStorage.getItem('chunk_reload_count') || '0', 10)
        if (reloadCount < 2) {
          sessionStorage.setItem('chunk_reload_count', String(reloadCount + 1))
          window.location.reload()
          return new Promise(() => {}) // pending promise prevents render while reloading
        }
      }
      throw error
    }
  }
}

// Lazy-loaded pages (wrapped to auto-reload on stale chunks)
const HomePage = lazy(lazyImport(() => import('./pages/HomePage.tsx')))
const StudyPage = lazy(lazyImport(() => import('./pages/StudyPage')))
const CampusPage = lazy(lazyImport(() => import('./pages/CampusPage')))
const PlacementsPage = lazy(lazyImport(() => import('./pages/PlacementsPage').then(m => ({ default: m.PlacementsPage }))))
const AdminPage = lazy(lazyImport(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage }))))
const ConfessionsPage = lazy(lazyImport(() => import('./pages/ConfessionsPage')))
const ProfilePage = lazy(lazyImport(() => import('./pages/ProfilePage')))
const SettingsPage = lazy(lazyImport(() => import('./pages/SettingsPage')))
const MessagesPage = lazy(lazyImport(() => import('./pages/MessagesPage')))
const NotesPage = lazy(lazyImport(() => import('./pages/NotesPage')))
const MarketplacePage = lazy(lazyImport(() => import('./pages/MarketplacePage')))
const MarketplaceDetailPage = lazy(lazyImport(() => import('./pages/MarketplaceDetailPage')))
const PeoplePage = lazy(lazyImport(() => import('./pages/PeoplePage')))
const MentorsPage = lazy(lazyImport(() => import('./pages/MentorsPage')))
const AttendancePage = lazy(lazyImport(() => import('./pages/AttendancePage')))
const TimetablePage = lazy(lazyImport(() => import('./pages/TimetablePage')))
const ContactPage = lazy(lazyImport(() => import('./pages/ContactPage')))
const TrustOnboardingPage = lazy(lazyImport(() => import('./pages/TrustOnboardingPage')))
const NotificationsPage = lazy(lazyImport(() => import('./pages/NotificationsPage')))
const ExplorePage = lazy(lazyImport(() => import('./pages/ExplorePage')))
const GamesPage = lazy(lazyImport(() => import('./pages/GamesPage')))
const LudoPage = lazy(lazyImport(() => import('./pages/LudoPage')))
const ChessPage = lazy(lazyImport(() => import('./pages/ChessPage')))
const PESBluffPage = lazy(lazyImport(() => import('./pages/PESBluffPage')))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, ...adaptiveQueryDefaults() },
  },
})

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
  </div>
)

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastContextProvider>
            <OfflineIndicator />
            <BrowserRouter>
              <AuthProvider>
                <PwaInstallNotifier />
                <LoginBottomSheet />
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<Navigate to="/login" replace />} />
                  <Route path="/welcome" element={<LandingPage />} />
                  <Route path="/auth/callback" element={<AuthCallbackPage />} />
                  <Route path="/explore" element={<Suspense fallback={<PageLoader />}><ExplorePage /></Suspense>} />

                  {/* Onboarding */}
                  <Route
                    path="/onboard"
                    element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>}
                  />
                  <Route
                    path="/trust-onboarding"
                    element={<ProtectedRoute><Suspense fallback={<PageLoader />}><TrustOnboardingPage /></Suspense></ProtectedRoute>}
                  />

                  {/* App shell with layout */}
                  <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    <Route path="/" element={<RootRedirect><Suspense fallback={<PageLoader />}><HomePage /></Suspense></RootRedirect>} />
                    <Route path="/dashboard" element={<Navigate to="/" replace />} />
                    <Route path="/study" element={<Suspense fallback={<PageLoader />}><StudyPage /></Suspense>} />
                    <Route path="/study/:subject" element={<Suspense fallback={<PageLoader />}><StudyPage /></Suspense>} />
                    <Route path="/study/:subject/:contentType" element={<Suspense fallback={<PageLoader />}><StudyPage /></Suspense>} />
                    <Route path="/campus" element={<Suspense fallback={<PageLoader />}><CampusPage /></Suspense>} />
                    <Route path="/profile" element={<Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>} />
                    <Route path="/profile/:id" element={<Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>} />
                    <Route path="/settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
                    <Route path="/messages" element={<Suspense fallback={<PageLoader />}><MessagesPage /></Suspense>} />
                    <Route path="/attendance" element={<Suspense fallback={<PageLoader />}><AttendancePage /></Suspense>} />
                    <Route path="/timetable" element={<Suspense fallback={<PageLoader />}><TimetablePage /></Suspense>} />
                    <Route path="/people" element={<Suspense fallback={<PageLoader />}><PeoplePage /></Suspense>} />
                    <Route path="/mentors" element={<Suspense fallback={<PageLoader />}><MentorsPage /></Suspense>} />
                    <Route path="/contact" element={<Suspense fallback={<PageLoader />}><ContactPage /></Suspense>} />
                    <Route path="/notes" element={<Suspense fallback={<PageLoader />}><NotesPage /></Suspense>} />
                    <Route path="/marketplace" element={<Suspense fallback={<PageLoader />}><MarketplacePage /></Suspense>} />
                    <Route path="/marketplace/:id" element={<Suspense fallback={<PageLoader />}><MarketplaceDetailPage /></Suspense>} />
                    <Route path="/placements" element={<Suspense fallback={<PageLoader />}><PlacementsPage /></Suspense>} />
                    <Route path="/admin" element={<ProtectedRoute requireAdmin><Suspense fallback={<PageLoader />}><AdminPage /></Suspense></ProtectedRoute>} />
                    <Route path="/confessions" element={<Suspense fallback={<PageLoader />}><ConfessionsPage /></Suspense>} />
                    <Route path="/notifications" element={<Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense>} />
                    <Route path="/games" element={<Suspense fallback={<PageLoader />}><GamesPage /></Suspense>} />
                    <Route path="/games/ludo" element={<Suspense fallback={<PageLoader />}><LudoPage /></Suspense>} />
                    <Route path="/games/chess" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><ChessPage /></Suspense></ProtectedRoute>} />
                    <Route path="/games/bluff" element={<Suspense fallback={<PageLoader />}><PESBluffPage /></Suspense>} />
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AuthProvider>
            </BrowserRouter>
          </ToastContextProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
