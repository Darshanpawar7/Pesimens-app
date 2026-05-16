import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, Chrome, UserRound, KeyRound } from 'lucide-react'
import { useAuthForm } from '@/hooks/useAuthForm'
import { usePwaInstall } from '@/hooks/usePwaInstall'

const featureCards = [
  {
    title: 'Academic Power Tools',
    description: 'Attendance, timetable, and exam utilities in one place.',
  },
  {
    title: 'Career And Growth',
    description: 'Placements, mentors, and campus updates without clutter.',
  },
  {
    title: 'Campus Social Layer',
    description: 'PYQs, notes, and study support that feel easy to revisit.',
  },
  {
    title: 'Daily Productivity',
    description: 'Built to help students get in, finish tasks, and move on.',
  },
]

function LoginBrandPanel() {
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16),_transparent_30%),linear-gradient(160deg,#07111f_0%,#0b1425_48%,#09101b_100%)] p-8 text-white md:p-12">
      <div className="pointer-events-none absolute -left-24 top-12 h-56 w-56 rounded-full bg-sky-400/14 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-6 h-64 w-64 rounded-full bg-emerald-300/12 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:28px_28px] opacity-20" />

      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-3">
          <p className="inline-flex rounded-full border border-white/15 bg-white/7 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/82 backdrop-blur-sm">
            PES University
          </p>
          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/72">
            Student Super App
          </span>
        </div>

        <h1
          className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl"
          style={{ fontFamily: '"Segoe UI Variable Display", "Aptos Display", "Georgia", serif' }}
        >
          PESimens
        </h1>

        <p className="mt-5 max-w-xl text-2xl font-semibold leading-tight text-white md:text-3xl">
          A sign-in screen that feels calmer, sharper, and more polished.
        </p>
        <p className="mt-3 max-w-lg text-sm leading-6 text-white/72">
          Choose one of three sign-in options to continue. Your dashboard opens in seconds.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {featureCards.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_40px_-30px_rgba(14,165,233,0.5)] backdrop-blur-sm"
            >
              <p className="text-sm font-semibold tracking-[-0.02em] text-white">{feature.title}</p>
              <p className="mt-2 text-sm leading-6 text-white/72">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 mt-8 flex flex-wrap gap-2 md:mt-auto">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/72">EC + RR campus</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/72">Secure sign-in</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/72">Built for students</span>
      </div>
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const { canInstall, installed, install, trackCtaView } = usePwaInstall()
  const [searchParams] = useSearchParams()
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
    setEmailTouched,
    isSending,
    sent,
    sendError,
    googleError,
    isGoogleLoading,
    showEmailError,
    handleSrnPasswordSignIn,
    handleSendMagicLink,
    handleGoogleSignIn,
    resetForm,
    setGoogleErrorMessage,
  } = useAuthForm()

  // Handle Google OAuth error from URL query parameter
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setGoogleErrorMessage('Google sign-in was cancelled or failed. Please try again.')
    }
  }, [searchParams, setGoogleErrorMessage])

  useEffect(() => {
    if (!installed) {
      trackCtaView('login_page')
    }
  }, [installed, trackCtaView])

  const handleSrnSubmit = async (e: React.FormEvent) => {
    const result = await handleSrnPasswordSignIn(e)
    if (!result.ok) return

    const redirectAfterAuth = sessionStorage.getItem('redirectAfterAuth')
    if (redirectAfterAuth) {
      sessionStorage.removeItem('redirectAfterAuth')
    }
    navigate(redirectAfterAuth || '/', { replace: true })
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden text-slate-100 md:grid md:grid-cols-[1.08fr_0.92fr]"
      style={{ fontFamily: 'Aptos, "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif' }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.12),transparent_26%),linear-gradient(180deg,#08101b_0%,#050b14_100%)]" />

      {/* Brand panel — full width on mobile (collapsed height), left column on md+ */}
      <div className="relative h-72 overflow-hidden border-b border-slate-900/5 md:h-auto md:border-b-0">
        <LoginBrandPanel />
      </div>

      {/* Auth panel */}
      <div className="relative flex items-center justify-center bg-[linear-gradient(180deg,#0b1220_0%,#090f1a_100%)] px-6 py-10 md:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.08),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_34%)]" />
        <div className="relative w-full max-w-[480px] rounded-[28px] border border-slate-800/80 bg-slate-900/85 p-6 shadow-[0_28px_70px_-42px_rgba(0,0,0,0.6)] backdrop-blur-xl md:p-8">

          {!installed && (
            <button
              type="button"
              onClick={() => install('login_page')}
              className="mb-5 flex w-full items-center justify-between rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-left transition-all duration-200 hover:-translate-y-[1px] hover:bg-sky-500/15"
            >
              <div>
                <p className="text-sm font-semibold text-slate-100">Install app</p>
                <p className="text-xs text-slate-300">Faster launch and home-screen access.</p>
              </div>
              <span className="rounded-full bg-sky-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-200">
                {canInstall ? '1-tap' : 'steps'}
              </span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Secure access</p>
          </div>

          <h2
            className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-100"
            style={{ fontFamily: '"Segoe UI Variable Display", "Aptos Display", "Georgia", serif' }}
          >
            Sign in
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-300">
            Choose one of three sign-in options to continue. Use your PES credentials or continue with Google.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">SRN and password</p>
            <form onSubmit={handleSrnSubmit} className="mt-3 space-y-3" noValidate>
              <div>
                <label htmlFor="srn" className="mb-2 block text-sm font-medium text-slate-300">SRN</label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="srn"
                    type="text"
                    value={srn}
                    onChange={(e) => setSrn(e.target.value.toUpperCase())}
                    onBlur={() => setSrnTouched(true)}
                    placeholder="PES2UG24CS123"
                    autoComplete="username"
                    className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-10 text-base text-slate-100 placeholder:text-slate-500 outline-none transition-all duration-200 focus:border-sky-400 focus:shadow-[0_0_0_4px_rgba(56,189,248,0.2)]"
                  />
                </div>
                {showSrnError && (
                  <p className="mt-1.5 text-xs text-rose-500">Please enter a valid SRN (example: PES2UG24CS123).</p>
                )}
              </div>

              <div>
                <label htmlFor="srn-password" className="mb-2 block text-sm font-medium text-slate-300">PESU password</label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="srn-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your PESU Academy password"
                    autoComplete="current-password"
                    className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-10 text-base text-slate-100 placeholder:text-slate-500 outline-none transition-all duration-200 focus:border-sky-400 focus:shadow-[0_0_0_4px_rgba(56,189,248,0.2)]"
                  />
                </div>
              </div>

              {srnError && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                  {srnError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSrnLoading}
                className="flex h-12 w-full min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-slate-950 text-base font-semibold text-white shadow-[0_16px_30px_-20px_rgba(15,23,42,0.7)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSrnLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Verifying...
                  </>
                ) : (
                  'Sign in with SRN'
                )}
              </button>
            </form>
          </div>

          {/* Google OAuth error */}
          {googleError && (
            <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {googleError}
            </div>
          )}

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-700" />
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">or continue with</span>
            <div className="h-px flex-1 bg-slate-700" />
          </div>

          {/* Sign in with Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="flex h-12 w-full min-h-[44px] items-center justify-center gap-2.5 rounded-2xl border border-slate-700 bg-slate-900 text-sm font-semibold text-slate-100 shadow-[0_12px_28px_-24px_rgba(0,0,0,0.6)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-slate-100" />
            ) : (
              <Chrome className="h-4.5 w-4.5 text-slate-300" />
            )}
            Sign in with Google
          </button>

          {/* Email magic link section */}
          <div className="mt-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Magic link (optional)</p>

            {sent ? (
              <div className="mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
                  <Mail className="h-6 w-6 text-emerald-200" />
                </div>
                <p className="text-base font-semibold text-emerald-200">Check your email for a magic link</p>
                <p className="mt-2 text-sm text-slate-300">
                  We sent a sign-in link to <span className="font-medium text-slate-100">{email.trim()}</span>. Click it to continue.
                </p>
                <button
                  type="button"
                  onClick={resetForm}
                  className="mt-4 text-xs font-medium text-sky-300 underline decoration-sky-500/40 underline-offset-4 transition-colors hover:text-sky-200"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendMagicLink} className="mt-3 space-y-3" noValidate>
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">Email address</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setEmailTouched(true)}
                      placeholder="you@stu.pes.edu"
                      autoComplete="email"
                      className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-10 text-base text-slate-100 placeholder:text-slate-500 outline-none transition-all duration-200 focus:border-emerald-400 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.2)]"
                    />
                  </div>

                  {showEmailError && (
                    <p className="mt-1.5 text-xs text-rose-500">Please enter a valid email address.</p>
                  )}
                </div>

                {sendError && (
                  <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                    {sendError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSending}
                  className="flex h-12 w-full min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-base font-semibold text-white shadow-[0_16px_30px_-22px_rgba(15,118,110,0.8)] transition-all duration-200 hover:-translate-y-[1px] hover:from-emerald-500 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />
                      Sending magic link...
                    </>
                  ) : (
                    'Send magic link'
                  )}
                </button>
              </form>
            )}
          </div>

          <div className="mt-6 text-center text-[0.75rem] leading-6 text-slate-400">
            <p>New students are set up automatically on first sign-in.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
