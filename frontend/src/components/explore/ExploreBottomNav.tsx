import { useExploreUIStore } from '@/store/exploreUI'
import { Home, Compass, MessageSquare, FileText, User } from 'lucide-react'

export function ExploreBottomNav() {
  const openLoginSheet = useExploreUIStore(state => state.openLoginSheet)

  const tabs = [
    { id: 'home', label: 'Home', icon: Home, protected: true },
    { id: 'explore', label: 'Explore', icon: Compass, protected: false },
    { id: 'confessions', label: 'Confessions', icon: MessageSquare, protected: true },
    { id: 'notes', label: 'Notes', icon: FileText, protected: true },
    { id: 'profile', label: 'Profile', icon: User, protected: true },
  ]

  const handleTabClick = (isProtected: boolean) => {
    if (isProtected) {
      openLoginSheet()
    }
    // Explore tab is already active, no action needed
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0f0f0f] px-2 py-2"
      style={{
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="flex items-center justify-around">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = tab.id === 'explore'

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.protected)}
              className="flex min-w-[60px] flex-col items-center gap-1 rounded-lg px-3 py-2 transition-all active:scale-95"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500/40 to-violet-500/35 text-white shadow-[0_0_16px_rgba(99,102,241,0.45)]'
                    : 'text-white/70'
                }`}
              >
                <Icon size={18} />
              </div>
              <span
                className={`text-[10px] font-medium ${
                  isActive ? 'text-white font-semibold' : 'text-white/70'
                }`}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
