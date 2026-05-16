import { useState } from 'react'
import { ApiError, apiFetch } from '@/lib/api'

interface PesuConnectCardProps {
  onConnected: () => void
}

interface ConnectResponse {
  ok: boolean
  syncing?: boolean
  code?: string
  message?: string
}

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Incorrect SRN or PESU password',
  PESU_TIMEOUT: 'PESU Academy is not responding. Try again.',
  PESU_UNAVAILABLE: 'PESU verification unavailable. Try again later.',
}

export default function PesuConnectCard({ onConnected }: PesuConnectCardProps) {
  const [srn, setSrn] = useState('')
  const [password, setPassword] = useState('')
  const [rememberSession, setRememberSession] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!srn.trim() || !password) return

    setLoading(true)
    setError(null)

    try {
      const res = await apiFetch<ConnectResponse>('/api/pesu/connect', {
        method: 'POST',
        body: JSON.stringify({
          srn: srn.trim(),
          password,
          remember_session: rememberSession,
        }),
      })

      if (res.ok) {
        onConnected()
      } else {
        const code = res.code ?? ''
        setError(ERROR_MESSAGES[code] ?? res.message ?? 'Something went wrong. Try again.')
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.message
        const code = body.match(/"code":"([^"]+)"/)?.[1] ?? ''
        setError(ERROR_MESSAGES[code] ?? body ?? 'Something went wrong. Try again.')
      } else {
        setError('Something went wrong. Try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Connect PESU Academy</h2>
        <p className="mt-1 text-sm text-white/60">
          Link your PESU credentials to sync attendance and timetable automatically.
        </p>
      </div>

      <form onSubmit={(e) => { void handleSubmit(e) }} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="pesu-srn" className="text-sm font-medium text-white/80">
            SRN
          </label>
          <input
            id="pesu-srn"
            type="text"
            value={srn}
            onChange={e => setSrn(e.target.value)}
            placeholder="PES1UG22CS001"
            autoComplete="username"
            required
            disabled={loading}
            className="min-h-[44px] rounded-xl border border-[#2a2a2a] bg-[#111111] px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 disabled:opacity-50"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="pesu-password" className="text-sm font-medium text-white/80">
            PESU Password
          </label>
          <input
            id="pesu-password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Your PESU Academy password"
            autoComplete="current-password"
            required
            disabled={loading}
            className="min-h-[44px] rounded-xl border border-[#2a2a2a] bg-[#111111] px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 disabled:opacity-50"
          />
        </div>

        <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={rememberSession}
            onChange={e => setRememberSession(e.target.checked)}
            disabled={loading}
            className="h-4 w-4 rounded border-[#2a2a2a] accent-indigo-500 disabled:opacity-50"
          />
          <span className="text-sm text-white/80">Remember session for automatic syncing</span>
        </label>

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !srn.trim() || !password}
          className="min-h-[44px] rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border border-white/30 border-t-white" />
              Connecting...
            </span>
          ) : (
            'Connect PESU Academy'
          )}
        </button>

        <p className="text-center text-xs text-white/40">
          Your credentials are used only to verify your identity and are not stored unless you enable "Remember session".
        </p>
      </form>
    </section>
  )
}
