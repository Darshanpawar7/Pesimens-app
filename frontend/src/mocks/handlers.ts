import { http, HttpResponse } from 'msw'
import {
  mockProfile,
  mockEvents,
  mockConfessions,
  mockPlacements,
  mockClubs,
  mockMarketplaceListings,
} from './data'

// API_URL mirrors the fallback in src/lib/api.ts for local dev (http://localhost:4000).
// Contributors without backend access run `npm run dev:mock`, which never actually
// calls this URL — MSW intercepts every request before it leaves the browser.
const API_URL = 'http://localhost:4000'

export const handlers = [
  // Health check used by the keep-alive ping in AuthContext.tsx
  http.get(`${API_URL}/health`, () => {
    return HttpResponse.json({ ok: true })
  }),

  // CSRF token — required before any mutating request in lib/api.ts
  http.get(`${API_URL}/api/auth/csrf-token`, () => {
    return HttpResponse.json({ csrfToken: 'mock-csrf-token:0:0' })
  }),

  // Backend-token auth refresh — this is the path AuthContext.tsx falls back to
  // when there is no Supabase session, so mocking it fully bypasses the need
  // for real Supabase credentials during local development.
  http.post(`${API_URL}/api/auth/refresh`, () => {
    return HttpResponse.json({ ok: true, accessToken: 'mock-access-token' })
  }),

  // Logged-in user profile
  http.get(`${API_URL}/api/auth/me`, () => {
    return HttpResponse.json({ profile: mockProfile })
  }),

  // Home feed data
  http.get(`${API_URL}/api/events`, () => {
    return HttpResponse.json({ items: mockEvents, nextCursor: null, hasMore: false })
  }),

  http.get(`${API_URL}/api/confessions`, () => {
    return HttpResponse.json({ items: mockConfessions })
  }),

  http.get(`${API_URL}/api/placements`, () => {
    return HttpResponse.json({ items: mockPlacements })
  }),

  http.get(`${API_URL}/api/clubs`, () => {
    return HttpResponse.json({ items: mockClubs })
  }),

  http.get(`${API_URL}/api/marketplace`, () => {
    return HttpResponse.json({ listings: mockMarketplaceListings })
  }),

  http.get(`${API_URL}/api/analytics/home-feed/interactions`, () => {
    return HttpResponse.json({ history: {} })
  }),
]