import { useExploreUIStore } from '@/store/exploreUI'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { useEffect } from 'react'

export function ExploreTopBar() {
  const openLoginSheet = useExploreUIStore(state => state.openLoginSheet)
  const { canInstall, installed, install, trackCtaView } = usePwaInstall()

  useEffect(() => {
    if (!installed) {
      trackCtaView('explore_topbar')
    }
  }, [installed, trackCtaView])

  return (
    <div
      className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-[#0f0f0f] px-4 py-3"
      style={{ position: 'sticky', top: 0 }}
    >
      {/* Brand label on left */}
      <div className="inline-flex items-center gap-2 text-base font-semibold text-white">
        <img src="/app-logo.jpeg" alt="PESimens logo" className="h-6 w-6 rounded-full object-cover" />
        PESimens •
      </div>

      <div className="flex items-center gap-2">
        {!installed && (
          <button
            onClick={() => install('explore_topbar')}
            className="rounded-lg border border-cyan-300/35 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition-colors hover:bg-cyan-400/20"
          >
            Install App {canInstall ? '' : 'Help'}
          </button>
        )}

        {/* Sign in button on right */}
        <button
          onClick={() => openLoginSheet()}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
        >
          Sign in
        </button>
      </div>
    </div>
  )
}
