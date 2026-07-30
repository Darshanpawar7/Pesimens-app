# PWA (Progressive Web App)

PESimens is installable on desktop and mobile, and works offline for pages you've already visited.

## Setup

The PWA is powered by [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/), using **`injectManifest` mode**. Instead of letting the plugin auto-generate a service worker, we write our own at `frontend/src/sw.ts`, which gives us full control over offline behavior (specifically, showing a branded offline page instead of a browser error).

Key files:
- `frontend/src/sw.ts` — the service worker source (caching rules + offline fallback)
- `frontend/public/offline.html` — the branded "You're offline" page
- `frontend/public/manifest.json` — app name, icons, theme color
- `frontend/vite.config.ts` — `VitePWA()` plugin config

## Caching Strategy

| Route | Strategy | Why |
| --- | --- | --- |
| App shell (JS, CSS, HTML, fonts) | Precached at build time | Instant load, works fully offline once visited |
| `/api/pyqs` | Network First | Prefer fresh data, fall back to cache if offline |
| `/api/analytics` | Stale While Revalidate | Show cached data instantly, refresh in background |
| `/api/tags` | Cache First | Rarely changes, no need to refetch often |

Navigation requests (page loads) fall back to `index.html` so client-side routing keeps working offline. API requests and static assets are excluded from that fallback so they don't get served the wrong content type.

## Offline Fallback Page

If someone tries to open a page that isn't cached while offline, `offline.html` is shown instead of the browser's default "No internet" error. It matches app branding and includes a "Try Again" button to reload once the connection is back.

This is powered by `workbox-recipes`' `offlineFallback()` function inside `src/sw.ts`.

## Local Testing

1. Run `npm run build` in `frontend/`
2. Run `npm run preview` to serve the production build
3. Open Chrome DevTools -> Application tab -> Service Workers
4. Check "Offline" and reload a page you haven't visited yet — you should see `offline.html`

## Known Gaps

- No automated Lighthouse score tracking yet (tracked separately — see the Lighthouse CI workflow)
- No dedicated PWA install-prompt UI (relies on the browser's native install prompt)
