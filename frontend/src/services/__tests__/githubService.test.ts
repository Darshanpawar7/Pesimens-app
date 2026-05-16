/**
 * Unit tests for Frontend GitHub Service
 *
 * Tests API calls, URL construction, error handling, and response parsing.
 * Requirements: 13.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchGitHubUser } from '../githubService'
import type { GitHubData, GitHubProfile, GitHubRepo } from '../githubService'

// Mock the apiFetch utility
vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.name = 'ApiError'
      this.status = status
    }
  },
}))

import { apiFetch, ApiError } from '../../lib/api'

// ── Helpers ────────────────────────────────────────────────────────────────

function makeProfile(overrides: Partial<GitHubProfile> = {}): GitHubProfile {
  return {
    login: 'octocat',
    name: 'The Octocat',
    bio: 'A mysterious cat',
    avatar_url: 'https://avatars.githubusercontent.com/u/583231',
    public_repos: 8,
    followers: 9000,
    ...overrides,
  }
}

function makeRepo(overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    name: 'Hello-World',
    description: 'My first repository',
    html_url: 'https://github.com/octocat/Hello-World',
    language: 'JavaScript',
    stargazers_count: 1500,
    pushed_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeGitHubData(overrides: Partial<GitHubData> = {}): GitHubData {
  return {
    profile: makeProfile(),
    repos: [makeRepo()],
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('fetchGitHubUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Requirement 13.1: calls GET /api/v1/github/:username via apiFetch ────

  it('calls GET /api/v1/github/:username with the correct path', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: makeGitHubData() })

    await fetchGitHubUser('octocat')

    expect(apiFetch).toHaveBeenCalledOnce()
    const [path, options] = vi.mocked(apiFetch).mock.calls[0]
    expect(path).toBe('/api/v1/github/octocat')
    // GET request — no method override
    expect(options?.method).toBeUndefined()
  })

  it('encodes special characters in username', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: makeGitHubData() })

    await fetchGitHubUser('user name')

    const [path] = vi.mocked(apiFetch).mock.calls[0]
    expect(path).toBe('/api/v1/github/user%20name')
  })

  it('uses the exact username in the URL path', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: makeGitHubData() })

    await fetchGitHubUser('torvalds')

    const [path] = vi.mocked(apiFetch).mock.calls[0]
    expect(path).toBe('/api/v1/github/torvalds')
  })

  // ── Response parsing ──────────────────────────────────────────────────────

  it('returns the GitHubData from the backend response', async () => {
    const data = makeGitHubData({
      profile: makeProfile({ login: 'octocat', name: 'The Octocat' }),
      repos: [makeRepo({ name: 'Hello-World' })],
    })
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data })

    const result = await fetchGitHubUser('octocat')

    expect(result.profile.login).toBe('octocat')
    expect(result.profile.name).toBe('The Octocat')
    expect(result.repos).toHaveLength(1)
    expect(result.repos[0].name).toBe('Hello-World')
  })

  it('returns profile with all required fields', async () => {
    const profile = makeProfile({
      login: 'testuser',
      name: 'Test User',
      bio: 'A developer',
      avatar_url: 'https://avatars.githubusercontent.com/u/12345',
      public_repos: 42,
      followers: 100,
    })
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: makeGitHubData({ profile }) })

    const result = await fetchGitHubUser('testuser')

    expect(result.profile).toMatchObject({
      login: 'testuser',
      name: 'Test User',
      bio: 'A developer',
      avatar_url: 'https://avatars.githubusercontent.com/u/12345',
      public_repos: 42,
      followers: 100,
    })
  })

  it('returns repos with all required fields', async () => {
    const repo = makeRepo({
      name: 'my-project',
      description: 'A cool project',
      html_url: 'https://github.com/testuser/my-project',
      language: 'TypeScript',
      stargazers_count: 250,
      pushed_at: '2024-06-01T10:00:00.000Z',
    })
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      data: makeGitHubData({ repos: [repo] }),
    })

    const result = await fetchGitHubUser('testuser')

    expect(result.repos[0]).toMatchObject({
      name: 'my-project',
      description: 'A cool project',
      html_url: 'https://github.com/testuser/my-project',
      language: 'TypeScript',
      stargazers_count: 250,
      pushed_at: '2024-06-01T10:00:00.000Z',
    })
  })

  it('handles profile with null name and bio', async () => {
    const profile = makeProfile({ name: null, bio: null })
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: makeGitHubData({ profile }) })

    const result = await fetchGitHubUser('octocat')

    expect(result.profile.name).toBeNull()
    expect(result.profile.bio).toBeNull()
  })

  it('handles repos with null description and language', async () => {
    const repo = makeRepo({ description: null, language: null })
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      data: makeGitHubData({ repos: [repo] }),
    })

    const result = await fetchGitHubUser('octocat')

    expect(result.repos[0].description).toBeNull()
    expect(result.repos[0].language).toBeNull()
  })

  it('returns up to 10 repos', async () => {
    const repos = Array.from({ length: 10 }, (_, i) => makeRepo({ name: `repo-${i}` }))
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: makeGitHubData({ repos }) })

    const result = await fetchGitHubUser('prolific-user')

    expect(result.repos).toHaveLength(10)
  })

  it('returns empty repos array when user has no repos', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, data: makeGitHubData({ repos: [] }) })

    const result = await fetchGitHubUser('new-user')

    expect(result.repos).toEqual([])
  })

  // ── Error handling ────────────────────────────────────────────────────────

  it('propagates 404 ApiError when user is not found', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new ApiError(404, 'GitHub user not found'))

    const error = await fetchGitHubUser('nonexistent-user-xyz').catch(e => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(404)
    expect((error as ApiError).message).toBe('GitHub user not found')
  })

  it('propagates 500 ApiError when backend fails', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new ApiError(500, 'GitHub service unavailable'))

    await expect(fetchGitHubUser('octocat')).rejects.toThrow('GitHub service unavailable')
  })

  it('propagates 401 ApiError for unauthenticated requests', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new ApiError(401, 'Unauthorized'))

    const error = await fetchGitHubUser('octocat').catch(e => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(401)
  })

  it('propagates network errors', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error('Network error'))

    await expect(fetchGitHubUser('octocat')).rejects.toThrow('Network error')
  })
})
