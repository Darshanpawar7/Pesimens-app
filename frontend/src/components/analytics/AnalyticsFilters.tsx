interface Filters {
  subject: string
  exam_type: string
}

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
}

const EXAM_TYPES = ['', 'ISA1', 'ISA2', 'ESA', 'LAB']

export function AnalyticsFilters({ filters, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-[260px] flex-1 space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-widest text-white/45">Subject</label>
        <input
          className="h-12 w-full rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] px-4 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-[#6366f1]"
          placeholder="Type a subject (e.g., Data Structures)"
          value={filters.subject}
          onChange={e => onChange({ ...filters, subject: e.target.value })}
        />
      </div>

      <div className="w-full space-y-1.5 sm:w-56">
        <label className="text-xs font-semibold uppercase tracking-widest text-white/45">Exam Type</label>
        <select
          className="h-12 w-full rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] px-4 text-sm text-white/85 outline-none focus:ring-2 focus:ring-[#6366f1]"
          value={filters.exam_type}
          onChange={e => onChange({ ...filters, exam_type: e.target.value })}
        >
          {EXAM_TYPES.map(t => (
            <option key={t} value={t}>
              {t || 'All types'}
            </option>
          ))}
        </select>
      </div>

      {(filters.subject || filters.exam_type) && (
        <button
          className="text-sm font-semibold text-[#6366f1] hover:underline sm:pb-2"
          onClick={() => onChange({ subject: '', exam_type: '' })}
        >
          Clear
        </button>
      )}
    </div>
  )
}
