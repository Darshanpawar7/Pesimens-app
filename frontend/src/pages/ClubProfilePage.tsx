import { useParams, useNavigate } from 'react-router-dom'
import { useClub } from '../hooks/useClubs'
import { ClubProfile } from '../components/clubs/ClubProfile'
import { Skeleton } from '../components/ui/skeleton'
import { useAuthStore } from '../store/auth'

export default function ClubProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { data: club, isLoading, error } = useClub(id!)

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="pt-8 space-y-3">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (error || !club) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Club not found</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">This club may have been removed or doesn't exist.</p>
        <button
          onClick={() => navigate('/clubs')}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          Back to Clubs
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>
      <ClubProfile
        club={club}
        currentUserId={profile?.id}
      />
    </div>
  )
}
