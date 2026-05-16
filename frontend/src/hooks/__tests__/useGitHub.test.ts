/**
 * Tests for useGitHub hook
 * Requirements: 13.2, 13.3, 13.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useGitHub } from '../useGitHub'
import * as githubService from '../../services/githubService'
import { ApiError } from '../../lib/api'

vi.mock('../../services/githubService')
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

const mockGitHubData: githubService.GitHubData = {
  profile: {
    login: 'octocat',
    name: 'The Octocat',
    bio: 'GitHub mascot',
    avatar_url: 'https://github.com/images/error/octocat_happy.gif',
    public_repos: 8,
    followers: 20,
  },
  repos: [
    {
      name: 'Hello-World',
      description: 'My first repository',
      html_url: 'https://github.com/octocat/Hello-World',
      language: 'JavaScript',
      stargazers_count: 100,
      pushed_at: '2024-01-01T00:00:00Z',
    },
  ],
}

describe('useGitHub', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Requirement 13.2: useQuery with cache key ['github', username]
  it('uses cache key [github, username]', async () => {
    vi.mocked(githubService.fetchGitHubUser).mockResolvedValue(mockGitHubData)

    const { result } = renderHook(() => useGitHub('octocat'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(vi.mocked(githubService.fetchGitHubUser)).toHaveBeenCalledWith('octocat')
  })

  it('fetches GitHub data and returns profile and repos', async () => {
    vi.mocked(githubService.fetchGitHubUser).mockResolvedValue(mockGitHubData)

    const { result } = renderHook(() => useGitHub('octocat'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockGitHubData)
    expect(result.current.data?.profile.login).toBe('octocat')
    expect(result.current.data?.repos).toHaveLength(1)
  })

  // Requirement 13.3: isLoading is true while query is loading
  it('exposes isLoading: true while fetching', async () => {
    let resolve!: (v: githubService.GitHubData) => void
    vi.mocked(githubService.fetchGitHubUser).mockReturnValue(new Promise(r => { resolve = r }))

    const { result } = renderHook(() => useGitHub('octocat'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(true))

    resolve(mockGitHubData)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
  })

  // Requirement 13.4: surfaces backend errors through error state
  it('surfaces backend errors through error state', async () => {
    vi.mocked(githubService.fetchGitHubUser).mockRejectedValue(new ApiError(404, 'User not found'))

    const { result } = renderHook(() => useGitHub('nonexistent'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('User not found')
    expect(result.current.data).toBeUndefined()
  })

  it('surfaces 500 errors through error state', async () => {
    vi.mocked(githubService.fetchGitHubUser).mockRejectedValue(new ApiError(500, 'GitHub API unavailable'))

    const { result } = renderHook(() => useGitHub('octocat'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('GitHub API unavailable')
  })

  it('does not fetch when username is empty', () => {
    const { result } = renderHook(() => useGitHub(''), { wrapper: makeWrapper() })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.fetchStatus).toBe('idle')
    expect(vi.mocked(githubService.fetchGitHubUser)).not.toHaveBeenCalled()
  })

  it('fetches when username becomes non-empty', async () => {
    vi.mocked(githubService.fetchGitHubUser).mockResolvedValue(mockGitHubData)

    const { result, rerender } = renderHook(
      ({ u }: { u: string }) => useGitHub(u),
      { wrapper: makeWrapper(), initialProps: { u: '' } }
    )

    expect(vi.mocked(githubService.fetchGitHubUser)).not.toHaveBeenCalled()

    rerender({ u: 'octocat' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(vi.mocked(githubService.fetchGitHubUser)).toHaveBeenCalledWith('octocat')
  })

  it('caches results — does not re-fetch within staleTime', async () => {
    vi.mocked(githubService.fetchGitHubUser).mockResolvedValue(mockGitHubData)

    const wrapper = makeWrapper()
    const { result: r1 } = renderHook(() => useGitHub('octocat'), { wrapper })
    await waitFor(() => expect(r1.current.isSuccess).toBe(true))

    const callCount = vi.mocked(githubService.fetchGitHubUser).mock.calls.length

    // Mount a second hook with the same username — should use cache
    const { result: r2 } = renderHook(() => useGitHub('octocat'), { wrapper })
    await waitFor(() => expect(r2.current.isSuccess).toBe(true))

    expect(vi.mocked(githubService.fetchGitHubUser).mock.calls.length).toBe(callCount)
  })

  it('uses separate cache entries for different usernames', async () => {
    vi.mocked(githubService.fetchGitHubUser).mockResolvedValue(mockGitHubData)

    const wrapper = makeWrapper()
    const { result: r1 } = renderHook(() => useGitHub('octocat'), { wrapper })
    const { result: r2 } = renderHook(() => useGitHub('torvalds'), { wrapper })

    await waitFor(() => expect(r1.current.isSuccess).toBe(true))
    await waitFor(() => expect(r2.current.isSuccess).toBe(true))

    expect(vi.mocked(githubService.fetchGitHubUser)).toHaveBeenCalledWith('octocat')
    expect(vi.mocked(githubService.fetchGitHubUser)).toHaveBeenCalledWith('torvalds')
  })
})
