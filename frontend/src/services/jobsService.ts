/**
 * Frontend Jobs Service
 *
 * Calls the backend Jobs route via apiFetch.
 * Requirements: 12.1
 */

import { apiFetch } from '../lib/api'

export interface NormalizedJob {
  id: string
  title: string
  company: string
  location: string
  salary: string | null
  url: string
  postedAt: string
}

/**
 * Fetch job listings from the backend.
 *
 * @param query - Search query string
 * @param location - Optional location filter
 * @returns Array of normalized job listings
 */
export async function fetchJobs(
  query: string,
  location?: string
): Promise<NormalizedJob[]> {
  const params = new URLSearchParams({ query })
  if (location) params.append('location', location)
  const res = await apiFetch<{ ok: true; jobs: NormalizedJob[] }>(
    `/api/v1/jobs?${params.toString()}`
  )
  return res.jobs
}
