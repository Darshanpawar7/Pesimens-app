import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown } from 'lucide-react'

const socialStats = ['500+ PYQs', '50+ Mentors', '2 Campuses', '100+ Placement Reports'] as const

const featureCards = [
  {
    icon: '📚',
    title: 'PYQ Repository',
    desc: 'Find past exam questions, upload yours, and never study blind again',
  },
  {
    icon: '📊',
    title: 'Smart Analytics',
    desc: "See which topics appear most. Study what matters, skip what doesn't",
  },
  {
    icon: '👨‍🏫',
    title: 'Mentor Marketplace',
    desc: 'Book 1:1 sessions with seniors who cracked the same exams',
  },
  {
    icon: '💼',
    title: 'Placement Portal',
    desc: 'Real interview experiences from students placed at your dream companies',
  },
] as const

const footerLinks = [
  { to: '/pyqs', label: 'PYQs' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/mentors', label: 'Mentors' },
  { to: '/placements', label: 'Placements' },
] as const

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <style>{`
        @keyframes meshMoveA {
          0% { transform: translate3d(-6%, -4%, 0) scale(1); }
          50% { transform: translate3d(7%, 5%, 0) scale(1.08); }
          100% { transform: translate3d(-6%, -4%, 0) scale(1); }
        }

        @keyframes meshMoveB {
          0% { transform: translate3d(7%, 6%, 0) scale(1.06); }
          50% { transform: translate3d(-5%, -4%, 0) scale(0.96); }
          100% { transform: translate3d(7%, 6%, 0) scale(1.06); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes floatArrow {
          0% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(6px); opacity: 1; }
          100% { transform: translateY(0); opacity: 0.5; }
        }

        .mesh-layer-a {
          animation: meshMoveA 16s ease-in-out infinite;
        }

        .mesh-layer-b {
          animation: meshMoveB 18s ease-in-out infinite;
        }

        .scroll-arrow {
          animation: floatArrow 1.8s ease-in-out infinite;
        }
      `}</style>

      <section className="relative flex min-h-[100svh] flex-col overflow-hidden border-b border-[#2a2a2a]">
        <div className="pointer-events-none absolute inset-0">
          <div style={{
            position: 'absolute', top: '-20%', left: '-10%',
            width: '600px', height: '600px',
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: 'float 8s ease-in-out infinite',
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute', bottom: '-20%', right: '-10%',
            width: '500px', height: '500px',
            background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: 'float 10s ease-in-out infinite reverse',
            pointerEvents: 'none'
          }} />
          <div
            className="mesh-layer-a absolute inset-[-10%]"
            style={{
              background:
                'radial-gradient(45% 55% at 20% 25%, rgba(99,102,241,0.45), rgba(99,102,241,0) 70%), radial-gradient(42% 48% at 78% 20%, rgba(139,92,246,0.42), rgba(139,92,246,0) 70%), radial-gradient(55% 60% at 55% 85%, rgba(99,102,241,0.25), rgba(99,102,241,0) 75%)',
            }}
          />
          <div
            className="mesh-layer-b absolute inset-[-12%]"
            style={{
              background:
                'radial-gradient(50% 60% at 72% 70%, rgba(139,92,246,0.28), rgba(139,92,246,0) 70%), radial-gradient(55% 65% at 30% 80%, rgba(99,102,241,0.24), rgba(99,102,241,0) 75%), radial-gradient(70% 80% at 50% 50%, rgba(15,15,15,0.8), rgba(15,15,15,0.97) 76%)',
            }}
          />
        </div>

        <nav className="relative z-10 border-b border-[#2a2a2a] bg-[#0f0f0f]/55 backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
            <span className="text-sm font-semibold tracking-tight text-white">
              PESimens <span className="text-[#6366f1]">•</span>
            </span>
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm text-white/65 transition-colors hover:text-white">
                Sign in
              </Link>
              <Link
                to="/signup"
                className="rounded-lg border border-[#6366f1]/40 bg-[#1a1a1a] px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-[#6366f1]"
              >
                Sign up
              </Link>
            </div>
          </div>
        </nav>

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 pb-16 pt-32 text-center">
          <span className="inline-flex items-center rounded-full border border-[#6366f1]/45 bg-[#1a1a1a] px-4 py-1.5 text-xs font-semibold tracking-wide text-white/90">
            🎓 Built for PESU students
          </span>

          <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-[64px]">
            <span className="text-white">Your campus, </span>
            <span className="bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] bg-clip-text text-transparent">supercharged</span>
          </h1>

          <p className="mt-5 max-w-3xl text-base text-white/70 sm:text-lg">
            PYQs, analytics, mentors, placements and more — all in one place for PES University
          </p>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_60px_-30px_rgba(99,102,241,0.95)] transition-transform hover:-translate-y-0.5"
            >
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/pyqs"
              className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-transparent px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-white/45 hover:bg-white/5"
            >
              Browse PYQs
            </Link>
          </div>

          <button
            type="button"
            onClick={() => window.scrollTo({ top: window.innerHeight * 0.95, behavior: 'smooth' })}
            className="scroll-arrow absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full border border-[#2a2a2a] bg-[#1a1a1a]/75 p-2 text-white/75 hover:text-white"
            aria-label="Scroll down"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="border-b border-[#2a2a2a] bg-[#111111] py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center">
          <p className="text-sm font-semibold text-white/80">Trusted by PESU students across EC & RR campus</p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-white/65">
            {socialStats.map((stat, idx) => (
              <div key={stat} className="flex items-center gap-2">
                <span className="font-semibold text-white">{stat}</span>
                {idx < socialStats.length - 1 && <span className="text-white/35">•</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[#2a2a2a] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything you need to ace PESU
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {featureCards.map(card => (
              <article
                key={card.title}
                className="rounded-2xl border border-[#2a2a2a] bg-gradient-to-br from-[#1a1a1a] to-[#131313] p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#6366f1]/20 text-xl">
                    {card.icon}
                  </div>
                  <div className="min-w-0 border-l-2 border-l-[#6366f1] pl-4">
                    <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/65">{card.desc}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full border-b border-[#2a2a2a] bg-[#111111] py-16">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <section style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: '1.5rem',
            padding: '3rem 2rem',
            textAlign: 'center',
            margin: '0 auto',
            maxWidth: '700px'
          }}>
            <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🤫</div>
            <h2 style={{fontSize: '1.75rem', fontWeight: 700, color: 'white', marginBottom: '0.75rem'}}>
              Anonymous Confessions
            </h2>
            <p style={{color: '#9ca3af', marginBottom: '2rem', fontSize: '1.1rem'}}>
              Rant about exams, share hot takes, ask questions
              — completely anonymous. No one knows it's you.
            </p>
            <Link to="/confessions" style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              padding: '0.875rem 2rem',
              borderRadius: '0.75rem',
              fontWeight: 600,
              textDecoration: 'none',
              fontSize: '1rem'
            }}>
              Read Confessions →
            </Link>
          </section>
        </div>
      </section>

      <section className="border-b border-[#2a2a2a] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            <article className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-8 text-center">
              <div className="text-[3rem] leading-none">🔐</div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#6366f1]">Step 1</p>
              <h3 className="mt-2 text-lg font-semibold">Sign up with your SRN</h3>
              <p className="mt-2 text-sm text-white/65">Just your SRN — no email needed</p>
            </article>

            <article className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-8 text-center">
              <div className="text-[3rem] leading-none">📚</div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#6366f1]">Step 2</p>
              <h3 className="mt-2 text-lg font-semibold">Upload PYQs, browse content</h3>
              <p className="mt-2 text-sm text-white/65">Share knowledge, earn karma points</p>
            </article>

            <article className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-8 text-center">
              <div className="text-[3rem] leading-none">🎯</div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#6366f1]">Step 3</p>
              <h3 className="mt-2 text-lg font-semibold">Ace your exams</h3>
              <p className="mt-2 text-sm text-white/65">Study smarter with AI-powered analytics</p>
            </article>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-3xl border border-[#6366f1]/30 bg-gradient-to-r from-[#4f46e5] via-[#6366f1] to-[#8b5cf6] p-10 text-center shadow-[0_30px_80px_-40px_rgba(99,102,241,0.9)] sm:p-14">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ready to study smarter?</h2>
            <Link
              to="/signup"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-7 py-3 text-lg font-semibold text-white ring-1 ring-white/30 transition-colors hover:bg-white/20"
            >
              Join PESimens
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#2a2a2a] bg-[#0f0f0f] py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-base font-semibold">
              PESimens 🔬
            </p>
            <p className="mt-1 text-sm text-white/55">The academic platform for PESimens</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            {footerLinks.map(link => (
              <Link key={link.to} to={link.to} className="text-white/65 transition-colors hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>

          <p className="text-sm text-white/55">© PESimens. Made with ❤️ for PESU students</p>
        </div>
      </footer>
    </div>
  )
}
