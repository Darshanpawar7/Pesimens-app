import { Bug, Camera, Github, Linkedin, MessageCircleWarning } from 'lucide-react'

const CONTACT_EMAIL = 'pesimens.app@gmail.com'
const INSTAGRAM_HANDLE = 'pesimens.app'
const GITHUB_URL = 'https://github.com/Darshanpawar7'
const LINKEDIN_URL = 'https://www.linkedin.com/in/darshanpawar7'

export default function ContactPage() {
  const reportBugMailto = `mailto:${CONTACT_EMAIL}?subject=Bug%20Report%20-%20PESimens`
  const instagramUrl = `https://instagram.com/${INSTAGRAM_HANDLE}`

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-[#2a2a2a] bg-[#151515] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Support</p>
        <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Report Bugs and Contact Us</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/60">
          Found something broken or want to share feedback? Reach us via email, GitHub, or LinkedIn using any option below.
        </p>
      </section>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group rounded-2xl border border-[#2a2a2a] bg-[#161622] p-5 transition hover:border-sky-500/40 hover:bg-[#141c25]"
        >
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
            <Github className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-white">GitHub</h2>
          <p className="mt-1 text-sm text-white/60">Report issues, contribute code, and collaborate on open-source work.</p>
          <p className="mt-3 text-sm text-sky-300 group-hover:text-sky-200">@Darshanpawar7</p>
        </a>

        <a
          href={LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group rounded-2xl border border-[#2a2a2a] bg-[#161622] p-5 transition hover:border-cyan-500/40 hover:bg-[#132023]"
        >
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
            <Linkedin className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-white">LinkedIn</h2>
          <p className="mt-1 text-sm text-white/60">Connect for networking, feedback, and collaboration opportunities.</p>
          <p className="mt-3 text-sm text-cyan-300 group-hover:text-cyan-200">darshanpawar7</p>
        </a>

        <a
          href={reportBugMailto}
          className="group rounded-2xl border border-[#2a2a2a] bg-[#161622] p-5 transition hover:border-rose-500/40 hover:bg-[#21161b]"
        >
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300">
            <Bug className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-white">Report a Bug</h2>
          <p className="mt-1 text-sm text-white/60">Send bug details and screenshots to our support email.</p>
          <p className="mt-3 text-sm text-rose-300 group-hover:text-rose-200">{CONTACT_EMAIL}</p>
        </a>
      </div>

      <a
        href={instagramUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex items-start gap-4 rounded-2xl border border-[#2a2a2a] bg-[#1a151b] p-5 transition hover:border-pink-500/40"
      >
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-500/15 text-pink-300">
          <Camera className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-white">Instagram</h2>
          <p className="mt-1 text-sm text-white/60">Follow us for updates and announcements.</p>
          <p className="mt-2 text-sm text-pink-300">@{INSTAGRAM_HANDLE}</p>
        </div>
      </a>

      <div className="mt-4 rounded-xl border border-dashed border-[#2a2a2a] bg-[#121212] p-4 text-sm text-white/50">
        <p className="inline-flex items-center gap-2">
          <MessageCircleWarning className="h-4 w-4" />
          Typical response time: 24 to 48 hours.
        </p>
      </div>
    </div>
  )
}
