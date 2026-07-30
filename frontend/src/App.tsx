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

const lazyImport = (importFn: () => Promise<any>) => {
  return async () => {
    try {
      const mod = await importFn()
      sessionStorage.removeItem('chunk_reload_count')
      return mod
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch dynamically imported module')) {
        const reloadCount = parseInt(sessionStorage.getItem('chunk_reload_count') || '0', 10)
        if (reloadCount < 2) {
          sessionStorage.setItem('chunk_reload_count', String(reloadCount + 1))
          window.location.reload()
          return new Promise(() => { })
        }
      }
      throw error
    }
  }
}

const HomePage = lazy(lazyImport(() => import('./pages/HomePage.tsx')))
const StudyPage = lazy(lazyImport(() => import('./pages/StudyPage')))
const CampusPage = lazy(lazyImport(() => import('./pages/CampusPage')))
const PlacementsPage = lazy(lazyImport(() => import('./pages/PlacementsPage').then(m => ({ default: m.PlacementsPage }))))
.catch(err => console.error(err))