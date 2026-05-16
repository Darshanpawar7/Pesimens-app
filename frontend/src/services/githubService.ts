/**
 * Frontend GitHub Service
 *
 * Calls the backend GitHub route via apiFetch.
 * Requirements: 13.1
 */

import { apiFetch } from '../lib/api'

export interface GitHubProfile {
  login: string
  name: string | null
  bio: string | null
  avatar_url: string
  public_repos: number
  followers: number
}

export interface GitHubRepo {
  name: string
  description: string | null
  html_url: string
  language: string | null
  stargazers_count: number
  pushed_at: string
}

export interface GitHubData {
  profile: GitHubProfile
  repos: GitHubRepo[]
}

/**
 * Fetch a GitHub user's profile and repositories from the backend.
 *
 * @param username - GitHub username
 * @returns Object containing profile and repos
 */
export async function fetchGitHubUser(username: string): Promise<GitHubData> {
  const res = await apiFetch<{ ok: true; data: GitHubData }>(
    `/api/v1/github/${encodeURIComponent(username)}`
  )
  return res.data
}
