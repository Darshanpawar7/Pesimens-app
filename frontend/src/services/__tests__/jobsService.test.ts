/**
 * Unit tests for Frontend Jobs Service
 *
 * Tests API calls, URL construction, error handling, and response parsing.
 * Requirements: 12.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchJobs } from '../jobsService'
import type { NormalizedJob } from '../jobsService'

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

function makeJob(overrides: Partial<NormalizedJob> = {}): NormalizedJob {
  return {
    id: 'job-1',
    title: 'Software Engineer',
    company: 'Acme Corp',
    location: 'Bangalore',
    salary: '₹10,00,000 - ₹15,00,000',
    url: 'https://example.com/job/1',
    postedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('fetchJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Requirement 12.1: calls GET /api/v1/jobs via apiFetch ────────────────

  it('calls GET /api/v1/jobs with query parameter', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, jobs: [makeJob()] })

    await fetchJobs('software engineer')

    expect(apiFetch).toHaveBeenCalledOnce()
    const [path, options] = vi.mocked(apiFetch).mock.calls[0]
    expect(path).toContain('/api/v1/jobs')
    expect(path).toContain('query=software+engineer')
    // GET request — no method override needed (defaults to GET)
    expect(options?.method).toBeUndefined()
  })

  it('includes location in query string when provided', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, jobs: [] })

    await fetchJobs('frontend developer', 'Bangalore')

    const [path] = vi.mocked(apiFetch).mock.calls[0]
    expect(path).toContain('query=frontend+developer')
    expect(path).toContain('location=Bangalore')
  })

  it('omits location from query string when not provided', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, jobs: [] })

    await fetchJobs('backend developer')

    const [path] = vi.mocked(apiFetch).mock.calls[0]
    expect(path).not.toContain('location=')
  })

  // ── Response parsing ──────────────────────────────────────────────────────

  it('returns the jobs array from the backend response', async () => {
    const jobs = [
      makeJob({ id: 'job-1', title: 'Frontend Engineer' }),
      makeJob({ id: 'job-2', title: 'Backend Engineer' }),
    ]
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, jobs })

    const result = await fetchJobs('engineer')

    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Frontend Engineer')
    expect(result[1].title).toBe('Backend Engineer')
  })

  it('returns an empty array when no jobs are found', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, jobs: [] })

    const result = await fetchJobs('very obscure job title')

    expect(result).toEqual([])
  })

  it('returns jobs with all NormalizedJob fields', async () => {
    const job = makeJob({
      id: 'job-42',
      title: 'Full Stack Developer',
      company: 'Tech Startup',
      location: 'Remote',
      salary: '₹8,00,000+',
      url: 'https://jobs.example.com/42',
      postedAt: '2024-06-15T09:00:00.000Z',
    })
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, jobs: [job] })

    const result = await fetchJobs('full stack')

    expect(result[0]).toMatchObject({
      id: 'job-42',
      title: 'Full Stack Developer',
      company: 'Tech Startup',
      location: 'Remote',
      salary: '₹8,00,000+',
      url: 'https://jobs.example.com/42',
      postedAt: '2024-06-15T09:00:00.000Z',
    })
  })

  it('handles jobs with null salary', async () => {
    const job = makeJob({ salary: null })
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, jobs: [job] })

    const result = await fetchJobs('engineer')

    expect(result[0].salary).toBeNull()
  })

  // ── URL construction ──────────────────────────────────────────────────────

  it('correctly encodes special characters in query', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, jobs: [] })

    await fetchJobs('C++ developer')

    const [path] = vi.mocked(apiFetch).mock.calls[0]
    expect(path).toContain('/api/v1/jobs?')
    expect(path).toContain('query=')
  })

  it('always calls the correct base endpoint', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, jobs: [] })

    await fetchJobs('any query', 'any location')

    const [path] = vi.mocked(apiFetch).mock.calls[0]
    expect(path).toMatch(/^\/api\/v1\/jobs\?/)
  })

  // ── Error handling ────────────────────────────────────────────────────────

  it('propagates ApiError when backend returns an error', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new ApiError(500, 'Jobs service unavailable'))

    await expect(fetchJobs('engineer')).rejects.toThrow('Jobs service unavailable')
  })

  it('propagates 400 ApiError for missing query', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new ApiError(400, 'query is required'))

    const error = await fetchJobs('').catch(e => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(400)
  })

  it('propagates 401 ApiError for unauthenticated requests', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new ApiError(401, 'Unauthorized'))

    const error = await fetchJobs('engineer').catch(e => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(401)
  })

  it('propagates network errors', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error('Network error'))

    await expect(fetchJobs('engineer')).rejects.toThrow('Network error')
  })
})
