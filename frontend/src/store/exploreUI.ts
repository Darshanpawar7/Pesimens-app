import { create } from 'zustand'

interface ExploreUIState {
  isLoginSheetOpen: boolean
  scrollCount: number
  redirectAfterAuth: string | null
  hasShownSheet: boolean

  openLoginSheet: (redirectPath?: string) => void
  closeLoginSheet: () => void
  incrementScrollCount: () => void
  clearRedirectAfterAuth: () => void
}

export const useExploreUIStore = create<ExploreUIState>(set => ({
  isLoginSheetOpen: false,
  scrollCount: 0,
  redirectAfterAuth: null,
  hasShownSheet: false,

  openLoginSheet: (redirectPath?: string) =>
    set(state => ({
      isLoginSheetOpen: true,
      hasShownSheet: true,
      redirectAfterAuth: redirectPath ?? state.redirectAfterAuth,
    })),

  closeLoginSheet: () =>
    set({
      isLoginSheetOpen: false,
    }),

  incrementScrollCount: () =>
    set(state => {
      const newCount = state.scrollCount + 1

      // Auto-open sheet when count reaches 5, but only if not already shown
      if (newCount === 5 && !state.hasShownSheet) {
        return {
          scrollCount: newCount,
          isLoginSheetOpen: true,
          hasShownSheet: true,
        }
      }

      return {
        scrollCount: newCount,
      }
    }),

  clearRedirectAfterAuth: () =>
    set({
      redirectAfterAuth: null,
    }),
}))
