import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

export interface TagFrequency {
  id: string
  name: string
  count: number
}

interface Props {
  tags: TagFrequency[]
  onTagClick?: (name: string) => void
  selectedTags?: string[]
}

const COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
  '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6',
]

export function TopicFrequencyChart({ tags, onTagClick, selectedTags = [] }: Props) {
  if (!tags.length) {
    return <p className="py-12 text-center text-sm text-white/60">No topic data available.</p>
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={tags}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 16, bottom: 4 }}
          onClick={(state: unknown) => {
            const activePayload =
              typeof state === 'object' && state !== null && 'activePayload' in state
                ? (state as { activePayload?: Array<{ payload?: { tag?: string; name?: string } }> }).activePayload
                : undefined
            const payload = activePayload?.[0]?.payload
            const topicName = payload?.tag ?? payload?.name
            if (topicName) onTagClick?.(topicName)
          }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.65)' }} />
          <YAxis
            type="category"
            dataKey="name"
            width={190}
            tickFormatter={(value: string) => (value.length > 26 ? `${value.slice(0, 26)}...` : value)}
            tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.65)' }}
          />
          <Tooltip
            formatter={(value) => [value, 'Occurrences']}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            contentStyle={{
              background: '#0f0f0f',
              border: '1px solid #2a2a2a',
              borderRadius: 12,
              color: 'rgba(255,255,255,0.85)',
              boxShadow: '0 18px 55px -30px rgba(0,0,0,1)',
            }}
          />
          <Bar
            dataKey="count"
            radius={[0, 4, 4, 0]}
            cursor={onTagClick ? 'pointer' : 'default'}
            onClick={(entry) => onTagClick?.((entry as unknown as TagFrequency).name)}
          >
            {tags.map((entry, i) => (
              <Cell
                key={entry.id}
                fill={selectedTags.includes(entry.name) ? '#6366f1' : COLORS[i % COLORS.length]}
                opacity={selectedTags.length && !selectedTags.includes(entry.name) ? 0.45 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {onTagClick && (
        <p className="mt-2 text-center text-xs text-white/45">Click a bar to add to trend comparison</p>
      )}
    </div>
  )
}
