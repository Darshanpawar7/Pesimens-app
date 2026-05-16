import { useEffect, useState, useRef, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Chrome, KeyRound, UserRound, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useExploreUIStore } from '@/store/exploreUI'
import { useAuthForm } from '@/hooks/useAuthForm'

const COPY_VARIANTS = {
  A: {
    title: 'Your PESU network starts here',
    subtitle: 'Placements intel, people, and stories in one sign-in.',
    socialProof: 'Trusted by 2,000+ PESU students',
    value1: 'Placement alerts that matter',
    value2: 'Campus stories in real time',
    value3: 'Find your people faster',
    sectionSrn: '1. Fastest access with SRN',
    sectionGoogle: '2. One-tap with Google',
    sectionEmail: '3. No password? Use email',
    emailToggle: 'Use email magic link instead',
  },
  B: {
    title: 'Join PESU\'s most active student hub',
    subtitle: 'Be first to opportunities, updates, and real campus conversations.',
    socialProof: 'Already used by 2,000+ PESU students',
    value1: 'Daily placements updates',
    value2: 'Verified PESU student community',
    value3: 'Follow peers and mentors',
    sectionSrn: '1. Sign in with SRN',
    sectionGoogle: '2. Continue with Google',
    sectionEmail: '3. Email magic link',
    emailToggle: 'Use email magic link instead',
  },
} as const

const ACTIVE_COPY = COPY_VARIANTS.A

export function LoginBottomSheet() {
  const navigate = useNavigate()
  const isLoginSheetOpen = useExploreUIStore(state => state.isLoginSheetOpen)
  const closeLoginSheet = useExploreUIStore(state => state.closeLoginSheet)
  const redirectAfterAuth = useExploreUIStore(state => state.redirectAfterAuth)
  
  const [isMounted, setIsMounted] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const dragStartY = useRef<number | null>(null)
  const currentDragOffset = useRef<number>(0)
  const sheetRef = useRef<HTMLDivElement>(null)
  const [showEmailInput, setShowEmailInput] = useState(false)

  const {
    srn,
    setSrn,
    password,
    setPassword,
    setSrnTouched,
    isSrnLoading,
    srnError,
    showSrnError,
    email,
    setEmail,
    isSending: isEmailLoading,
    sent: emailSent,
    sendError: emailError,
    googleError,
    isGoogleLoading,
    handleSendMagicLink,
    handleGoogleSignIn,
    handleSrnPasswordSignIn,
  } = useAuthForm(redirectAfterAuth || undefined)

  const handleBottomSheetSrnSubmit = async (e: FormEvent) => {
    const result = await handleSrnPasswordSignIn(e)
    if (!result.ok) return

    closeLoginSheet()
    const sessionRedirect = sessionStorage.getItem('redirectAfterAuth')

    if (result.onboardingCompleted) {
      if (sessionRedirect) {
        sessionStorage.removeItem('redirectAfterAuth')
      }
      navigate(sessionRedirect || redirectAfterAuth || '/', { replace: true })
      return
    }

    navigate('/onboard', { replace: true })
  }

  // Focus management - focus first interactive element when sheet opens
  useEffect(() => {
    if (isLoginSheetOpen && sheetRef.current) {
      const firstButton = sheetRef.current.querySelector('button')
      if (firstButton) {
        // Small delay to ensure animation completes
        setTimeout(() => {
          firstButton.focus()
        }, 350)
      }
    }
  }, [isLoginSheetOpen])

  // Keyboard navigation support - Tab trapping
  // BUG FIX (Bug 3.6): Improved Tab trapping for dynamic content including email input
  // Requirements: 2.18, 3.14
  useEffect(() => {
    if (!isLoginSheetOpen || !sheetRef.current) return

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      // Re-query focusable elements on every Tab press to handle dynamic content
      const focusableElements = sheetRef.current!.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      // Trap focus within the modal
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [isLoginSheetOpen, showEmailInput]) // Re-run when email input visibility changes

  // Handle mount and animation state to prevent flash
  useEffect(() => {
    if (isLoginSheetOpen) {
      // First mount the component
      setIsMounted(true)
      // Then trigger animation after a frame to ensure DOM is ready
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true)
        })
      })
    } else {
      // Trigger exit animation
      setIsVisible(false)
      // Unmount after animation completes
      const timer = setTimeout(() => {
        setIsMounted(false)
      }, 300) // Match transition duration
      return () => clearTimeout(timer)
    }
  }, [isLoginSheetOpen])

  // Close sheet on Escape key
  useEffect(() => {
    if (!isLoginSheetOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeLoginSheet()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isLoginSheetOpen, closeLoginSheet])

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isLoginSheetOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isLoginSheetOpen])

  // Handle drag-to-dismiss gesture
  useEffect(() => {
    if (!isLoginSheetOpen || !sheetRef.current) return

    const handleTouchStart = (e: TouchEvent) => {
      dragStartY.current = e.touches[0].clientY
      currentDragOffset.current = 0
      setDragOffset(0)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (dragStartY.current === null) return

      const currentY = e.touches[0].clientY
      const deltaY = currentY - dragStartY.current

      // Only allow downward dragging (positive deltaY)
      if (deltaY > 0) {
        currentDragOffset.current = deltaY
        setDragOffset(deltaY)
      }
    }

    const handleTouchEnd = () => {
      if (dragStartY.current === null) return

      // Close sheet if dragged more than 80px downward
      if (currentDragOffset.current > 80) {
        closeLoginSheet()
      }

      // Reset drag state
      dragStartY.current = null
      currentDragOffset.current = 0
      setDragOffset(0)
    }

    const sheet = sheetRef.current
    sheet.addEventListener('touchstart', handleTouchStart)
    sheet.addEventListener('touchmove', handleTouchMove)
    sheet.addEventListener('touchend', handleTouchEnd)

    return () => {
      sheet.removeEventListener('touchstart', handleTouchStart)
      sheet.removeEventListener('touchmove', handleTouchMove)
      sheet.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isLoginSheetOpen, closeLoginSheet])

  // Don't render anything if not mounted
  if (!isMounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop with fade in/out animation */}
      <div
        data-testid="login-sheet-backdrop"
        className={`absolute inset-0 bg-black/70 backdrop-blur-[2px] transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={closeLoginSheet}
        aria-hidden="true"
      />

      {/* Sheet Container with slide-up animation */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-sheet-title"
        aria-describedby="login-sheet-description"
        className={`relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] border-t border-white/10 bg-[#0b111b] shadow-[0_-18px_48px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: dragOffset > 0 ? 'none' : undefined,
        }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1.5 w-14 rounded-full bg-white/30" />
        </div>

        {/* Close button */}
        <button
          onClick={closeLoginSheet}
          className="absolute right-4 top-4 rounded-lg p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Close sign-in dialog"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="relative px-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] sm:px-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Student hub</p>
            <h2 id="login-sheet-title" className="mt-3 text-[28px] font-semibold leading-tight text-white">
              {ACTIVE_COPY.title}
            </h2>
            <p id="login-sheet-description" className="mt-2 text-sm text-slate-300">
              {ACTIVE_COPY.subtitle}
            </p>
            <p className="mt-2 text-xs font-medium text-slate-400">
              {ACTIVE_COPY.socialProof}
            </p>
          </div>

          {/* Google OAuth error */}
          {googleError && (
            <div 
              className="mt-4 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              role="alert"
              aria-live="assertive"
            >
              {googleError}
            </div>
          )}

          {/* 1. SRN + Password */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{ACTIVE_COPY.sectionSrn}</p>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                Recommended
              </span>
            </div>
            <form onSubmit={handleBottomSheetSrnSubmit} className="mt-3 space-y-3" noValidate>
              <div>
                <label htmlFor="sheet-srn" className="sr-only">
                  SRN
                </label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-cyan-200/70" />
                  <input
                    id="sheet-srn"
                    type="text"
                    value={srn}
                    onChange={e => setSrn(e.target.value.toUpperCase())}
                    onBlur={() => setSrnTouched(true)}
                    placeholder="PES2UG24CS123"
                    autoComplete="username"
                    className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-10 text-sm text-white placeholder:text-slate-500 transition-all duration-200 outline-none focus:border-white/25 focus-visible:ring-2 focus-visible:ring-white/10"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="sheet-srn-password" className="sr-only">
                  PESU password
                </label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-cyan-200/70" />
                  <input
                    id="sheet-srn-password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="PESU password"
                    autoComplete="current-password"
                    className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-10 text-sm text-white placeholder:text-slate-500 transition-all duration-200 outline-none focus:border-white/25 focus-visible:ring-2 focus-visible:ring-white/10"
                  />
                </div>
              </div>

              {(showSrnError || srnError) && (
                <p className="text-xs text-red-300" role="alert">
                  {srnError || 'Please enter a valid SRN (example: PES2UG24CS123).'}
                </p>
              )}

              <button
                type="submit"
                disabled={isSrnLoading}
                aria-busy={isSrnLoading}
                className="flex h-12 w-full min-h-[44px] items-center justify-center gap-2.5 rounded-2xl bg-white text-sm font-semibold text-slate-900 transition-all duration-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b111b]"
              >
                {isSrnLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/50 border-t-slate-900" />
                    <span className="sr-only">Signing in with SRN...</span>
                  </>
                ) : (
                  <span>Sign in with SRN</span>
                )}
              </button>
            </form>
          </div>

          {/* Auth buttons */}
          <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{ACTIVE_COPY.sectionGoogle}</p>
            {/* Continue with Google button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              aria-busy={isGoogleLoading}
              className="flex h-12 w-full min-h-[44px] items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white text-sm font-semibold text-slate-900 transition-all duration-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b111b]"
            >
              {isGoogleLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-900/50 border-t-gray-900" />
                  <span className="sr-only">Signing in with Google...</span>
                </>
              ) : (
                <>
                  <Chrome className="h-4.5 w-4.5" />
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <p className="pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{ACTIVE_COPY.sectionEmail}</p>

            {/* Use email magic link instead */}
            <button
              type="button"
              onClick={() => setShowEmailInput(!showEmailInput)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] py-3 text-center text-sm font-medium text-slate-200 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              aria-expanded={showEmailInput}
              aria-controls="email-input-section"
            >
              {ACTIVE_COPY.emailToggle}
            </button>
          </div>

          {/* Inline email input (expanded below buttons) */}
          {showEmailInput && (
            <div id="email-input-section" className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              {emailSent ? (
                <div 
                  className="rounded-2xl border border-green-500/25 bg-green-500/10 px-4 py-4 text-sm text-green-100"
                  role="status"
                  aria-live="polite"
                >
                  Check your email for a magic link.
                </div>
              ) : (
                <form onSubmit={handleSendMagicLink} className="space-y-3">
                  <div>
                    <label htmlFor="email-input" className="sr-only">
                      Email address
                    </label>
                    <input
                      id="email-input"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your.email@pesu.pes.edu"
                      disabled={isEmailLoading}
                      aria-invalid={!!emailError}
                      aria-describedby={emailError ? 'email-error' : undefined}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white placeholder:text-slate-500 transition-all duration-200 outline-none focus:border-white/25 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-white/10"
                    />
                    {emailError && (
                      <p id="email-error" className="mt-2 text-xs text-red-300" role="alert">
                        {emailError}
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isEmailLoading}
                    aria-busy={isEmailLoading}
                    className="flex h-12 w-full items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-900 transition-all duration-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b111b]"
                  >
                    {isEmailLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />
                        <span className="sr-only">Sending magic link...</span>
                      </>
                    ) : (
                      'Send magic link'
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
