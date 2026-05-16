import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'

interface Tag {
  id: string
  name: string
  subject?: string
}

interface Props {
  selected: string[]
  onChange: (tags: string[]) => void
  subject?: string
}

export function TagSelector({ selected, onChange, subject }: Props) {
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [input, setInput] = useState('')

  useEffect(() => {
    const url = subject ? `/api/tags?subject=${encodeURIComponent(subject)}` : '/api/tags'
    apiFetch<{ tags: Tag[] }>(url)
      .then(r => setAllTags(r.tags))
      .catch(() => {})
  }, [subject])

  const filtered = allTags.filter(
    t => t.name.toLowerCase().includes(input.toLowerCase()) && !selected.includes(t.name)
  )

  function toggle(name: string) {
    if (selected.includes(name)) {
      onChange(selected.filter(s => s !== name))
    } else {
      onChange([...selected, name])
    }
  }

  function addCustom() {
    const t = input.trim()
    if (t && !selected.includes(t)) {
      onChange([...selected, t])
    }
    setInput('')
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Search or add tag..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
        />
      </div>

      {/* Suggestions */}
      {input && filtered.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {filtered.slice(0, 8).map(t => (
            <Badge
              key={t.id}
              variant="outline"
              className="cursor-pointer hover:bg-[#1a1a1a]"
              onClick={() => { toggle(t.name); setInput('') }}
            >
              {t.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map(t => (
            <Badge
              key={t}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => toggle(t)}
            >
              {t} ×
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
