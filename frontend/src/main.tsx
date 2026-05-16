import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx'
import { applyPerformanceMode, getPerformanceModePreference } from './lib/performanceMode'
import './index.css'

if (typeof window !== 'undefined') {
  applyPerformanceMode(getPerformanceModePreference())
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
