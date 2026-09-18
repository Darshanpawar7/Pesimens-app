// Sample fixture data for local development without backend access.
// Shapes match the real types used across the app (see src/store/auth.ts, src/pages/HomePage.tsx).

export const mockProfile = {
  id: 'mock-user-1',
  email: 'dev@pesimens.local',
  display_name: 'Dev User',
  roll_no: 'PES1UG23CS999',
  year: 3,
  course: 'B.Tech',
  campus: 'RR',
  degree: 'B.Tech',
  branch: 'CSE',
  semester: 5,
  role: 'student',
  karma: 120,
  current_streak: 4,
  last_active_date: new Date().toISOString(),
  longest_streak: 10,
  bio: 'Mock profile used for local development without backend access.',
  avatar_url: null,
  date_of_birth: null,
  show_birthday: false,
  linkedin_url: null,
  instagram_url: null,
  github_username: 'mock-dev',
  portfolio_url: null,
  resume_url: null,
  skills: ['React', 'TypeScript'],
  experiences: [],
  looking_for: [],
  headline: 'Frontend contributor (mock session)',
  open_to_work: false,
  github_stars: 0,
  github_repos: 0,
  followers_count: 0,
  following_count: 0,
  onboarding_completed: true,
  created_at: new Date().toISOString(),
}

export const mockEvents = [
  {
    id: 'mock-event-1',
    title: 'GDSC Info Session',
    location: 'RR Campus Auditorium',
    start_time: new Date(Date.now() + 86400000).toISOString(),
    category: 'Tech',
  },
  {
    id: 'mock-event-2',
    title: 'PESiMENs Open Mic Night',
    location: 'RR Campus Amphitheatre',
    start_time: new Date(Date.now() + 3 * 86400000).toISOString(),
    category: 'Cultural',
  },
]

export const mockConfessions = [
  {
    id: 'mock-confession-1',
    content: 'This is sample confession content for local mock development.',
    upvote_count: 12,
    created_at: new Date().toISOString(),
    category: 'general',
  },
  {
    id: 'mock-confession-2',
    content: 'Another mock confession so the feed does not render empty.',
    upvote_count: 4,
    created_at: new Date().toISOString(),
    category: 'academics',
  },
]

export const mockPlacements = [
  {
    id: 'mock-placement-1',
    company: 'Mock Corp',
    role: 'Software Engineer',
    package_band: '10-20L',
    year_of_placement: new Date().getFullYear(),
    branch: 'CSE',
  },
]

export const mockClubs = [
  {
    id: 'mock-club-1',
    name: 'Mock Innovation Lab',
    category: 'technical',
    description: 'Sample club entry for local development.',
  },
]

export const mockMarketplaceListings = [
  {
    id: 'mock-listing-1',
    title: 'Data Structures Textbook',
    price: 300,
    status: 'active',
    created_at: new Date().toISOString(),
  },
]