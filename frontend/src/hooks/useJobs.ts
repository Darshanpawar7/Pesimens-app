/**
 * useJobs hook
 *
 * Wraps Frontend_Jobs_Service using React Query's useQuery.
 * Requirements: 12.2, 12.3, 12.4
 */

import { useQuery } from '@tanstack/react-query'
import { fetchJobs, NormalizedJob } from '../services/jobsService'

const STALE_TIME = 5 * 60 * 1000 // 5 minutes

export function useJobs(query: string, location?: string) {
  return useQuery<NormalizedJob[], Error>({
    queryKey: ['jobs', query, location],
    queryFn: () => fetchJobs(query, location),
    staleTime: STALE_TIME,
    enabled: query.length > 0,
  })
}
