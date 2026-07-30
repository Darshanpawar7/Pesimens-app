import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { offlineFallback } from 'workbox-recipes'

declare let self: ServiceWorkerGlobalScope

// Precache everything Vite builds — replaces the old auto-generated list
precacheAndRoute(self.__WB_MANIFEST)

self.skipWaiting()
self.addEventListener('activate', () => self.clients.claim())

// Same caching rules you already had, just written out explicitly now
registerRoute(
  /^\/api\/pyqs/,
  new NetworkFirst({
    cacheName: 'pyqs-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 })],
  })
)

registerRoute(
  /^\/api\/analytics/,
  new StaleWhileRevalidate({
    cacheName: 'analytics-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 })],
  })
)

registerRoute(
  /^\/api\/tags/,
  new CacheFirst({
    cacheName: 'tags-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 })],
  })
)

// The actual fix for issue #143: show offline.html when a page fails to load
// and nothing is cached for it
offlineFallback({
  pageFallback: '/offline.html',
})