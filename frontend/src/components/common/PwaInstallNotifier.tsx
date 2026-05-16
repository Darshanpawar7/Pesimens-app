import { useEffect, useRef } from 'react'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { useToast } from '@/components/ui/use-toast'

const INSTALL_READY_TOAST_KEY = 'pwa_install_ready_toast_shown'

export function PwaInstallNotifier() {
  const { canInstall, installed } = usePwaInstall()
  const { toast } = useToast()
  const shownThisMountRef = useRef(false)

  useEffect(() => {
    if (installed || !canInstall || shownThisMountRef.current) return

    if (typeof window !== 'undefined' && window.sessionStorage.getItem(INSTALL_READY_TOAST_KEY) === '1') {
      shownThisMountRef.current = true
      return
    }

    shownThisMountRef.current = true

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(INSTALL_READY_TOAST_KEY, '1')
    }

    toast({
      variant: 'info',
      title: 'App is installable now',
      description: 'Tap Install App to get faster launch and native notifications.',
      duration: 5000,
    })
  }, [canInstall, installed, toast])

  return null
}
