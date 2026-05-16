import { apiFetch } from './api'

export type DownloadAppEventType = 'view' | 'click' | 'install_accepted'

interface DownloadAppEventPayload {
  source: string
  canInstall?: boolean
}

const EVENT_NAME_MAP: Record<DownloadAppEventType, string> = {
  view: 'download_app_cta_view',
  click: 'download_app_cta_click',
  install_accepted: 'download_app_install_accepted',
}

export function trackDownloadAppEvent(type: DownloadAppEventType, payload: DownloadAppEventPayload): void {
  const eventName = EVENT_NAME_MAP[type]

  try {
    if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
      ;(window as any).gtag('event', eventName, {
        source: payload.source,
        can_install: payload.canInstall,
      })
    }
  } catch {
    // Never break UX for analytics failures.
  }

  void apiFetch('/api/analytics/events', {
    method: 'POST',
    body: JSON.stringify({
      event_name: eventName,
      properties: {
        source: payload.source,
        can_install: payload.canInstall ?? null,
      },
    }),
  }).catch(() => undefined)
}
