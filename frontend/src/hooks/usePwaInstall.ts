import { useCallback, useEffect, useMemo, useState } from 'react'
import { trackDownloadAppEvent } from '@/lib/trackDownloadApp'
import { setSignupAttributionSource } from '@/lib/signupAttribution'

type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const INSTALL_READY_TOAST_KEY = 'pwa_install_ready_toast_shown'

let cachedDeferredPrompt: BeforeInstallPromptEvent | null = null
let installListenerSetup = false
const installPromptSubscribers = new Set<(event: BeforeInstallPromptEvent | null) => void>()

function notifyInstallPromptSubscribers(event: BeforeInstallPromptEvent | null) {
  installPromptSubscribers.forEach((subscriber) => subscriber(event))
}

function ensureInstallPromptListener() {
  if (installListenerSetup || typeof window === 'undefined') return
  installListenerSetup = true

  window.addEventListener('beforeinstallprompt', (event: Event) => {
    event.preventDefault()
    cachedDeferredPrompt = event as BeforeInstallPromptEvent
    notifyInstallPromptSubscribers(cachedDeferredPrompt)
  })

  window.addEventListener('appinstalled', () => {
    cachedDeferredPrompt = null
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(INSTALL_READY_TOAST_KEY)
    }
    notifyInstallPromptSubscribers(null)
  })
}

function isStandaloneDisplayMode(): boolean {
  if (typeof window === 'undefined') return false
  const isIosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  return isStandalone || isIosStandalone
}

function getInstallInstructions(): string {
  if (typeof window === 'undefined') return 'Open this site in your browser menu and choose Install app.'

  const ua = window.navigator.userAgent.toLowerCase()
  const isIos = /iphone|ipad|ipod/.test(ua)

  if (isIos) {
    return 'On iPhone/iPad: tap Share, then Add to Home Screen.'
  }

  return 'Open browser menu and choose Install app or Add to Home screen.'
}

function showInstallFallbackPopup() {
  const instructions = getInstallInstructions()

  if (typeof window === 'undefined') return

  window.alert(`Install PESimens\n\n${instructions}`)
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(cachedDeferredPrompt)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    ensureInstallPromptListener()
    setInstalled(isStandaloneDisplayMode())

    const subscriber = (event: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(event)
    }
    installPromptSubscribers.add(subscriber)

    setDeferredPrompt(cachedDeferredPrompt)

    const onAppInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(INSTALL_READY_TOAST_KEY)
      }
    }

    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      installPromptSubscribers.delete(subscriber)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const canInstall = useMemo(() => !installed && deferredPrompt !== null, [deferredPrompt, installed])

  const trackCtaView = useCallback((source: string) => {
    if (typeof window === 'undefined') return

    const key = `download_app_cta_viewed:${source}`
    if (window.sessionStorage.getItem(key) === '1') return

    window.sessionStorage.setItem(key, '1')
    trackDownloadAppEvent('view', { source, canInstall })
  }, [canInstall])

  const install = useCallback(async (source: string): Promise<InstallOutcome> => {
    setSignupAttributionSource(source)
    trackDownloadAppEvent('click', { source, canInstall })

    if (installed) return 'accepted'

    if (!deferredPrompt) {
      showInstallFallbackPopup()
      return 'unavailable'
    }

    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice

    if (choice.outcome === 'accepted') {
      setInstalled(true)
      setDeferredPrompt(null)
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(INSTALL_READY_TOAST_KEY)
      }
      trackDownloadAppEvent('install_accepted', { source, canInstall })
      return 'accepted'
    }

    return 'dismissed'
  }, [deferredPrompt, installed])

  return {
    canInstall,
    installed,
    install,
    trackCtaView,
  }
}
