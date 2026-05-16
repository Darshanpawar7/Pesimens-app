interface AiDifficultyPickerProps {
  onSelect: (difficulty: 'easy' | 'medium' | 'hard') => void
}

const difficulties = [
  { key: 'easy' as const, label: 'Easy', icon: '🟢', description: 'Random moves' },
  { key: 'medium' as const, label: 'Medium', icon: '🟡', description: 'Mixed strategy' },
  { key: 'hard' as const, label: 'Hard', icon: '🔴', description: 'Best moves' },
]

export function AiDifficultyPicker({ onSelect }: AiDifficultyPickerProps) {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ color: '#8888a8', fontSize: 13, textAlign: 'center', margin: 0 }}>
        Choose difficulty
      </p>
      {difficulties.map((d) => (
        <button
          key={d.key}
          onClick={() => onSelect(d.key)}
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 15,
            background: '#1a1a2e',
            color: '#fff',
            border: '1px solid rgba(99,102,241,0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.15)'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#6366f1'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = '#1a1a2e'
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.3)'
          }}
        >
          <span style={{ fontSize: 20 }}>{d.icon}</span>
          <span style={{ flex: 1, textAlign: 'left' }}>{d.label}</span>
          <span style={{ fontSize: 12, color: '#8888a8', fontWeight: 400 }}>{d.description}</span>
        </button>
      ))}
    </div>
  )
}
