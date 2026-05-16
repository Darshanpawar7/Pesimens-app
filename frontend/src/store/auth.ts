import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'

export interface Profile {
  id: string
  email: string
  display_name: string | null
  roll_no: string | null
  year: number | null
  course: string | null
  campus: 'EC' | 'RR' | null
  degree: string | null
  branch: string | null
  semester: number | null
  role: 'student' | 'mentor' | 'admin' | 'moderator' | 'suspended'
  karma: number
  current_streak: number | null
  last_active_date: string | null
  longest_streak: number | null
  bio: string | null
  avatar_url: string | null
  date_of_birth: string | null
  show_birthday: boolean | null
  linkedin_url: string | null
  instagram_url: string | null
  github_username: string | null
  portfolio_url: string | null
  resume_url: string | null
  skills: string[]
  experiences: string[]
  looking_for: string[]
  headline: string | null
  open_to_work: boolean
  github_stars: number
  github_repos: number
  followers_count: number
  following_count: number
  onboarding_completed: boolean
  created_at: string
}

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isProfileLoading: boolean
  setSession: (session: Session | null) => void
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  updateAvatar: (avatarUrl: string | null) => void
  setLoading: (loading: boolean) => void
  setProfileLoading: (loading: boolean) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>(set => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isProfileLoading: true,
  setSession: session => set({ session, user: session?.user ?? null }),
  setUser: user => set({ user }),
  setProfile: profile => {
    set({ profile })
  },
  updateAvatar: avatarUrl => set(state => {
    // BUG FIX (Bug 3.8): Validate avatar URL format before storing
    // Requirements: 2.20, 3.16
    if (avatarUrl !== null) {
      try {
        const url = new URL(avatarUrl)
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          console.error('Invalid avatar URL: must use HTTP or HTTPS protocol')
          return state
        }
      } catch {
        console.error('Invalid avatar URL format')
        return state
      }
    }
    
    return {
      profile: state.profile ? { ...state.profile, avatar_url: avatarUrl } : state.profile,
    }
  }),
  setLoading: isLoading => set({ isLoading }),
  setProfileLoading: isProfileLoading => set({ isProfileLoading }),
  clear: () => set({ session: null, user: null, profile: null, isLoading: false, isProfileLoading: false }),
}))
