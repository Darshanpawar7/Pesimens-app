import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface Props {
  data: Record<string, unknown>[]   // [{ semester: '2024-ESA', TopicA: 5, TopicB: 3 }, ...] OR [{ tag, trend: [{year, count}] }]
  topics: string[]                   // up to 5 topic names to render
}

// Dark theme: indigo primary + amber accent + supporting colors
const LINE_COLORS = ['#6366f1', '#f59e0b', '#22c55e', '#a855f7', '#3b82f6']

// Compute % change label for tooltip
function pctChange(current: number, previous: number | undefined) {
  if (previous === undefined || previous === 0) return null
  const delta = ((current - previous) / previous) * 100
  return delta > 0 ? `+${delta.toFixed(0)}%` : `${delta.toFixed(0)}%`
}

export function TrendLineChart({ data, topics }: Props) {
  const visibleTopics = topics.slice(0, 5)

  if (!data.length || !visibleTopics.length) {
    return <p className="py-12 text-center text-sm text-white/60">Select topics to compare trends.</p>
  }

  // Accept fallback API shape: [{ tag, trend: [{ year, count }] }]
  const looksLikeTagTrend =
    !!data[0] &&
    Object.prototype.hasOwnProperty.call(data[0], 'tag') &&
    Object.prototype.hasOwnProperty.call(data[0], 'trend')

  const normalizedData: Record<string, unknown>[] = looksLikeTagTrend
    ? (() => {
        const yearMap = new Map<number, Record<string, unknown>>()

        for (const row of data) {
          const tag = row.tag as string | undefined
          const trend = (row.trend as Array<{ year: number; count: number }> | undefined) ?? []
          if (!tag) continue

          for (const point of trend) {
            if (!yearMap.has(point.year)) {
              yearMap.set(point.year, { semester: String(point.year) })
            }
            const entry = yearMap.get(point.year)!
            entry[tag] = point.count
          }
        }

        return Array.from(yearMap.entries())
          .sort((a, b) => b[0] - a[0])
          .map(([, value]) => value)
      })()
    : data

  // Reverse so oldest semester is on the left
  const chartData = [...normalizedData].reverse()

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="semester" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.65)' }} />
        <YAxis tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.65)' }} allowDecimals={false} />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            return (
              <div className="rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] p-3 text-sm shadow-[0_18px_55px_-30px_rgba(0,0,0,1)]">
                <p className="mb-1 font-semibold text-white">{label as string}</p>
                {payload.map((p, i) => {
                  const idx = chartData.findIndex(d => d.semester === label)
                  const prev = idx > 0 ? (chartData[idx - 1][p.dataKey as string] as number) : undefined
                  const change = pctChange(p.value as number, prev)
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span style={{ color: p.color }} className="font-medium">{p.name}:</span>
                      <span className="text-white/80">{p.value}</span>
                      {change && (
                        <span className={change.startsWith('+') ? 'text-emerald-300' : 'text-red-300'}>
                          {change}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          }}
        />
        <Legend />
        {visibleTopics.map((topic, i) => (
          <Line
            key={topic}
            type="monotone"
            dataKey={topic}
            stroke={LINE_COLORS[i % LINE_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
