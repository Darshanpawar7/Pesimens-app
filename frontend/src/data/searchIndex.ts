export type SearchableItem = {
  id: string
  title: string
  description?: string
  module: 'Events' | 'Confessions' | 'PYQs' | 'Notifications' | 'Games' | 'Campus' | 'Study' | 'People' | 'Career'
  route: string
  keywords?: string[]
}

export const STATIC_SEARCH_INDEX: SearchableItem[] = [
  // Study
  { id: 'study',       title: 'Study & PYQs',      module: 'Study',   route: '/study',        description: 'Browse past year questions and study materials', keywords: ['pyq', 'notes', 'exam', 'papers'] },
  { id: 'attendance',  title: 'Attendance',          module: 'Study',   route: '/attendance',   description: 'Track your attendance', keywords: ['attendance', 'bunk'] },
  { id: 'timetable',   title: 'Timetable',           module: 'Study',   route: '/timetable',    description: 'View your class schedule', keywords: ['schedule', 'classes', 'timetable'] },
  { id: 'notes',       title: 'Notes',               module: 'Study',   route: '/notes',        description: 'Your personal notes', keywords: ['notes'] },

  // Campus
  { id: 'campus',      title: 'Campus',              module: 'Campus',  route: '/campus',       description: 'Campus events and activities', keywords: ['events', 'fest', 'campus'] },
  { id: 'confessions', title: 'Confessions',          module: 'Confessions', route: '/confessions', description: 'Anonymous confessions feed', keywords: ['confess', 'anonymous', 'rant'] },
  { id: 'notifications', title: 'Notifications',     module: 'Notifications', route: '/notifications', description: 'Your notifications', keywords: ['alerts', 'updates'] },
  { id: 'clubs',       title: 'Clubs',               module: 'Campus',  route: '/campus',       description: 'Discover and join clubs', keywords: ['clubs', 'society', 'join'] },

  // People
  { id: 'people',      title: 'People Directory',    module: 'People',  route: '/people',       description: 'Find and connect with students', keywords: ['students', 'connect', 'find', 'directory'] },
  { id: 'messages',    title: 'Messages',            module: 'People',  route: '/messages',     description: 'Direct messages', keywords: ['chat', 'dm', 'message'] },
  { id: 'mentors',     title: 'Mentors',             module: 'Career',  route: '/mentors',      description: 'Book mentorship sessions', keywords: ['mentor', 'guidance', 'session'] },

  // Career
  { id: 'placements',  title: 'Placements',          module: 'Career',  route: '/placements',   description: 'Interview experiences and placement data', keywords: ['placement', 'interview', 'job', 'package', 'ctc'] },
  { id: 'marketplace', title: 'Marketplace',         module: 'Career',  route: '/marketplace',  description: 'Buy and sell student resources', keywords: ['buy', 'sell', 'books', 'marketplace'] },

  // Games
  { id: 'games',       title: 'Games Hub',           module: 'Games',   route: '/games',        description: 'All campus games', keywords: ['play', 'game'] },
  { id: 'chess',       title: 'Chess',               module: 'Games',   route: '/games/chess',  description: 'Play chess with other students', keywords: ['chess', 'play'] },
  { id: 'ludo',        title: 'Ludo',                module: 'Games',   route: '/games/ludo',   description: 'Multiplayer Ludo', keywords: ['ludo', 'play'] },
  { id: 'bluff',       title: 'PES Bluff',           module: 'Games',   route: '/games/bluff',  description: 'Bluff party game', keywords: ['bluff', 'party', 'play'] },

  // Settings / misc
  { id: 'profile',     title: 'My Profile',          module: 'People',  route: '/profile',      description: 'View and edit your profile', keywords: ['profile', 'account', 'bio'] },
  { id: 'settings',    title: 'Settings',            module: 'Campus',  route: '/settings',     description: 'App settings and preferences', keywords: ['settings', 'preferences', 'theme', 'dark'] },
  { id: 'contact',     title: 'Contact / Support',   module: 'Campus',  route: '/contact',      description: 'Get help or report an issue', keywords: ['help', 'support', 'report', 'bug'] },
]