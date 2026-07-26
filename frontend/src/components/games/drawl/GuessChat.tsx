import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'

export interface GuessMessage {
  id: string
  player: string
  text: string
  correct?: boolean
  system?: boolean
}

export interface GuessChatProps {
  messages?: GuessMessage[]
  onSend?: (text: string) => void
  placeholder?: string
}

export function GuessChat({
  messages = [],
  onSend,
  placeholder = 'Type your guess…',
}: GuessChatProps) {
  const [value, setValue] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  const submit = () => {
    const text = value.trim()
    if (!text || !onSend) return
    onSend(text)
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit()
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#1a1a1a]">
      <div className="border-b border-white/[0.08] px-4 py-2.5 text-sm font-semibold text-white/80">
        Guesses
      </div>

      <div ref={scrollRef} className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
        {messages.length === 0 && (
          <p className="px-1 text-xs text-white/30">No guesses yet.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-md px-2 py-1 text-sm ${
              m.correct
                ? 'bg-emerald-400/10 text-emerald-400'
                : m.system
                ? 'text-white/40 italic'
                : 'text-white/80'
            }`}
          >
            {!m.system && (
              <span className="mr-1.5 font-semibold text-white/60">{m.player}:</span>
            )}
            <span>{m.correct ? 'guessed the word!' : m.text}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-white/[0.08] p-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={!onSend}
          className="flex-1 rounded-md border border-white/[0.08] bg-[#0f0f0f] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-indigo-500 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!onSend || !value.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-500 text-white transition hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default GuessChat