import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const TRUST_KEY = 'pesimens_onboarded'

const CARDS = [
  {
    title: '📊 Your data, only yours',
    text: 'Attendance and timetable are only visible to you. Never shared.',
  },
  {
    title: '🔒 Confessions are truly anonymous',
    text: 'Your SRN is never stored with any post. Untraceable by design.',
  },
  {
    title: '🎓 Student-built, student-run',
    text: 'Built by a PESU student, not the administration. We\'re on your side.',
  },
]

export default function TrustOnboardingPage() {
  const navigate = useNavigate()

  useEffect(() => {
    if (localStorage.getItem(TRUST_KEY) === 'true') {
      navigate('/', { replace: true })
    }
  }, [navigate])

  function handleContinue() {
    localStorage.setItem(TRUST_KEY, 'true')
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-8 text-white md:px-6">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-2xl border border-[#2a2a2a] bg-[#161616] p-6 md:p-8">
          <h1 className="text-3xl font-bold">Welcome to PESimens 👋</h1>
          <p className="mt-2 text-sm text-white/65">Before you begin, here is how trust and privacy are built into the app.</p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {CARDS.map(card => (
              <article key={card.title} className="rounded-xl border border-[#2a2a2a] bg-[#101010] p-4">
                <h2 className="text-sm font-semibold">{card.title}</h2>
                <p className="mt-2 text-sm text-white/70">{card.text}</p>
              </article>
            ))}
          </div>

          <button
            onClick={handleContinue}
            className="mt-7 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:brightness-110"
          >
            Got it, take me in →
          </button>
        </section>
      </div>
    </div>
  )
}
