/**
 * useGitHub hook
 *
 * Wraps Frontend_GitHub_Service using React Query's useQuery.
 * Requirements: 13.2, 13.3, 13.4
 */

import { useQuery } from '@tanstack/react-query'
import { fetchGitHubUser, GitHubData } from '../services/githubService'

const STALE_TIME = 5 * 60 * 1000 // 5 minutes

export function useGitHub(username: string) {
  return useQuery<GitHubData, Error>({
    queryKey: ['github', username],
    queryFn: () => fetchGitHubUser(username),
    staleTime: STALE_TIME,
    enabled: username.length > 0,
  })
}
