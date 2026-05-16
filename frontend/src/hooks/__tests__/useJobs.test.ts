/**
 * Tests for useJobs hook
 * Requirements: 12.2, 12.3, 12.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useJobs } from '../useJobs'
import * as jobsService from '../../services/jobsService'
import { ApiError } from '../../lib/api'

vi.mock('../../services/jobsService')
vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}))

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

const mockJobs: jobsService.NormalizedJob[] = [
  {
    id: '1',
    title: 'Software Engineer',
    company: 'Acme Corp',
    location: 'Bangalore',
    salary: '₹20L',
    url: 'https://example.com/job/1',
    postedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    title: 'Frontend Developer',
    company: 'Tech Co',
    location: 'Remote',
    salary: null,
    url: 'https://example.com/job/2',
    postedAt: '2024-01-02T00:00:00Z',
  },
]

describe('useJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Requirement 12.2: useQuery with cache key ['jobs', query, location]
  it('uses cache key [jobs, query, location]', async () => {
    vi.mocked(jobsService.fetchJobs).mockResolvedValue(mockJobs)

    const { result } = renderHook(() => useJobs('engineer', 'Bangalore'), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(vi.mocked(jobsService.fetchJobs)).toHaveBeenCalledWith('engineer', 'Bangalore')
  })

  it('fetches jobs and returns data', async () => {
    vi.mocked(jobsService.fetchJobs).mockResolvedValue(mockJobs)

    const { result } = renderHook(() => useJobs('engineer'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockJobs)
  })

  // Requirement 12.3: isLoading is true while query is loading
  it('exposes isLoading: true while fetching', async () => {
    let resolve!: (v: jobsService.NormalizedJob[]) => void
    vi.mocked(jobsService.fetchJobs).mockReturnValue(new Promise(r => { resolve = r }))

    const { result } = renderHook(() => useJobs('developer'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(true))

    resolve(mockJobs)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
  })

  // Requirement 12.4: surfaces backend errors through error state
  it('surfaces backend errors through error state', async () => {
    vi.mocked(jobsService.fetchJobs).mockRejectedValue(new ApiError(500, 'Service unavailable'))

    const { result } = renderHook(() => useJobs('engineer'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Service unavailable')
    expect(result.current.data).toBeUndefined()
  })

  it('does not fetch when query is empty', () => {
    const { result } = renderHook(() => useJobs(''), { wrapper: makeWrapper() })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.fetchStatus).toBe('idle')
    expect(vi.mocked(jobsService.fetchJobs)).not.toHaveBeenCalled()
  })

  it('fetches when query becomes non-empty', async () => {
    vi.mocked(jobsService.fetchJobs).mockResolvedValue(mockJobs)

    const { result, rerender } = renderHook(
      ({ q }: { q: string }) => useJobs(q),
      { wrapper: makeWrapper(), initialProps: { q: '' } }
    )

    expect(vi.mocked(jobsService.fetchJobs)).not.toHaveBeenCalled()

    rerender({ q: 'engineer' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(vi.mocked(jobsService.fetchJobs)).toHaveBeenCalledWith('engineer', undefined)
  })

  it('uses separate cache entries for different query+location combinations', async () => {
    vi.mocked(jobsService.fetchJobs).mockResolvedValue(mockJobs)

    const wrapper = makeWrapper()
    const { result: r1 } = renderHook(() => useJobs('engineer', 'Bangalore'), { wrapper })
    const { result: r2 } = renderHook(() => useJobs('engineer', 'Remote'), { wrapper })

    await waitFor(() => expect(r1.current.isSuccess).toBe(true))
    await waitFor(() => expect(r2.current.isSuccess).toBe(true))

    // Both queries should have been called with different locations
    expect(vi.mocked(jobsService.fetchJobs)).toHaveBeenCalledWith('engineer', 'Bangalore')
    expect(vi.mocked(jobsService.fetchJobs)).toHaveBeenCalledWith('engineer', 'Remote')
  })

  it('caches results — does not re-fetch within staleTime', async () => {
    vi.mocked(jobsService.fetchJobs).mockResolvedValue(mockJobs)

    const wrapper = makeWrapper()
    const { result: r1 } = renderHook(() => useJobs('engineer'), { wrapper })
    await waitFor(() => expect(r1.current.isSuccess).toBe(true))

    const callCount = vi.mocked(jobsService.fetchJobs).mock.calls.length

    // Mount a second hook with the same key — should use cache
    const { result: r2 } = renderHook(() => useJobs('engineer'), { wrapper })
    await waitFor(() => expect(r2.current.isSuccess).toBe(true))

    expect(vi.mocked(jobsService.fetchJobs).mock.calls.length).toBe(callCount)
  })
})
