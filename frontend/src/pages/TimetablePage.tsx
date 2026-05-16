import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import {
  adaptiveRefetchIntervalWhenActive,
  adaptiveRefetchOnReconnect,
  adaptiveRefetchOnWindowFocus,
  adaptiveStaleTime,
} from '@/lib/queryThrottle'

interface TimetableSlot {
  id: string
  day: string
  slot_number: number
  start_time: string
  end_time: string
  subject_name: string
  subject_code: string | null
  room: string | null
  faculty: string | null
}

interface AttendanceItem {
  id: string
  subject_name: string
  subject_code: string | null
}

interface ExamItem {
  id: string
  subject_name: string
  exam_date: string
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const PESU_SLOTS = [
  { slot: 1, start: '08:45', end: '09:45' },
  { slot: 2, start: '09:45', end: '10:45' },
  { slot: 3, start: '11:15', end: '12:15' },
  { slot: 4, start: '12:15', end: '01:15' },
  { slot: 5, start: '02:00', end: '03:00' },
  { slot: 6, start: '03:00', end: '04:00' },
  { slot: 7, start: '04:00', end: '04:45' },
] as const

type FormState = {
  day: string
  slot_number: number
  subject_name: string
  subject_code: string
  faculty: string
  room: string
}

function initialForm(): FormState {
  return {
    day: 'Monday',
    slot_number: 1,
    subject_name: '',
    subject_code: '',
    faculty: '',
    room: '',
  }
}

function toMinutes(value: string): number {
  const [h, m] = value.split(':').map(v => parseInt(v, 10))
  if (!Number.isFinite(h) || !Number.isFinite(m)) return -1
  return h * 60 + m
}

function todayName(): string {
  const day = new Date().getDay()
  if (day === 0) return 'Sunday'
  return DAYS[day - 1] || 'Monday'
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function weekdayName(d: Date): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(d)
}

export default function TimetablePage() {
  const queryClient = useQueryClient()
  const today = todayName()
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(initialForm)
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null)

  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const timetableQuery = useQuery({
    queryKey: ['pesu-sync-timetable'],
    queryFn: () => apiFetch<{ grouped?: Record<string, TimetableSlot[]>; items: TimetableSlot[] }>('/api/pesu-sync/timetable'),
    staleTime: adaptiveStaleTime(5 * 60 * 1000), // 5 minutes
    refetchInterval: () => adaptiveRefetchIntervalWhenActive(5 * 60 * 1000, 'default', { // 5 minutes instead of 30 seconds
      suspendDuringInteraction: true,
      interactionWindowMs: 10_000,
    }),
    refetchOnWindowFocus: adaptiveRefetchOnWindowFocus(false),
    refetchOnReconnect: adaptiveRefetchOnReconnect(false),
    retry: false,
  })

  const attendanceQuery = useQuery({
    queryKey: ['pesu-sync-attendance-subjects'],
    queryFn: () => apiFetch<{ items: AttendanceItem[] }>('/api/pesu-sync/attendance'),
    staleTime: adaptiveStaleTime(5 * 60 * 1000), // 5 minutes
    refetchInterval: () => adaptiveRefetchIntervalWhenActive(5 * 60 * 1000, 'default', { // 5 minutes instead of 1 minute
      suspendDuringInteraction: true,
      interactionWindowMs: 10_000,
    }),
    refetchOnWindowFocus: adaptiveRefetchOnWindowFocus(false),
    refetchOnReconnect: adaptiveRefetchOnReconnect(false),
    retry: false,
  })

  const examsQuery = useQuery({
    queryKey: ['pesu-sync-exams-for-calendar'],
    queryFn: () => apiFetch<{ items: ExamItem[] }>('/api/pesu-sync/exam-schedule'),
    staleTime: adaptiveStaleTime(5 * 60 * 1000), // 5 minutes
    refetchInterval: () => adaptiveRefetchIntervalWhenActive(5 * 60 * 1000, 'default', { // 5 minutes instead of 1 minute
      suspendDuringInteraction: true,
      interactionWindowMs: 10_000,
    }),
    refetchOnWindowFocus: adaptiveRefetchOnWindowFocus(false),
    refetchOnReconnect: adaptiveRefetchOnReconnect(false),
    retry: false,
  })

  const saveMutation = useMutation({
    mutationFn: (payload: {
      day: string
      slot_number: number
      start_time: string
      end_time: string
      subject_name: string
      subject_code: string
      faculty: string
      room: string
    }) => apiFetch<{ ok: boolean; slot: unknown }>('/api/pesu-sync/timetable', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pesu-sync-timetable'] })
      setIsModalOpen(false)
      setEditingSlot(null)
      setForm(initialForm())
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (payload: { day: string; slot_number: number }) => apiFetch<{ ok: boolean }>(`/api/pesu-sync/timetable/${encodeURIComponent(payload.day)}/${payload.slot_number}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pesu-sync-timetable'] })
      setIsModalOpen(false)
      setEditingSlot(null)
      setForm(initialForm())
    },
  })

  const slotMap = useMemo(() => {
    const map = new Map<string, TimetableSlot>()
    for (const slot of timetableQuery.data?.items ?? []) {
      map.set(`${slot.day}_${slot.slot_number}`, slot)
    }
    return map
  }, [timetableQuery.data?.items])

  const subjectOptions = useMemo(() => {
    const seen = new Set<string>()
    const options: Array<{ name: string; code: string }> = []
    for (const s of attendanceQuery.data?.items ?? []) {
      const code = s.subject_code || s.subject_name
      if (!code || seen.has(code)) continue
      seen.add(code)
      options.push({ name: s.subject_name, code })
    }
    return options.sort((a, b) => a.name.localeCompare(b.name))
  }, [attendanceQuery.data?.items])

  const examMap = useMemo(() => {
    const map = new Map<string, ExamItem[]>()
    for (const exam of examsQuery.data?.items ?? []) {
      const key = exam.exam_date
      if (!map.has(key)) map.set(key, [])
      map.get(key)?.push(exam)
    }
    return map
  }, [examsQuery.data?.items])

  const daysInMonth = useMemo(() => {
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const first = new Date(year, month, 1)
    const count = new Date(year, month + 1, 0).getDate()

    const blanks = Array.from({ length: (first.getDay() + 6) % 7 }, (_, i) => ({ kind: 'blank' as const, key: `blank-${i}` }))
    const days = Array.from({ length: count }, (_, idx) => {
      const date = new Date(year, month, idx + 1)
      return { kind: 'day' as const, date, key: monthKey(date) }
    })

    return [...blanks, ...days]
  }, [monthDate])

  function openModal(day?: string, slotNumber?: number, existing?: TimetableSlot | null) {
    if (existing) {
      setEditingSlot(existing)
      setForm({
        day: existing.day,
        slot_number: existing.slot_number,
        subject_name: existing.subject_name,
        subject_code: existing.subject_code || existing.subject_name,
        faculty: existing.faculty || '',
        room: existing.room || '',
      })
    } else {
      setEditingSlot(null)
      setForm(prev => ({
        ...prev,
        day: day || prev.day,
        slot_number: slotNumber || prev.slot_number,
      }))
    }
    setIsModalOpen(true)
  }

  function closeModal() {
    if (saveMutation.isPending || deleteMutation.isPending) return
    setIsModalOpen(false)
    setEditingSlot(null)
    setForm(initialForm())
  }

  function onSubjectChange(value: string) {
    const selected = subjectOptions.find(opt => opt.code === value)
    setForm(prev => ({
      ...prev,
      subject_code: value,
      subject_name: selected?.name || prev.subject_name,
    }))
  }

  function onSave() {
    if (!form.subject_name.trim() || !form.subject_code.trim()) return
    const slotMeta = PESU_SLOTS.find(s => s.slot === form.slot_number)
    if (!slotMeta) return

    saveMutation.mutate({
      day: form.day,
      slot_number: form.slot_number,
      start_time: slotMeta.start,
      end_time: slotMeta.end,
      subject_name: form.subject_name.trim(),
      subject_code: form.subject_code.trim(),
      faculty: form.faculty.trim(),
      room: form.room.trim(),
    })
  }

  function onDelete() {
    if (!editingSlot) return
    deleteMutation.mutate({ day: editingSlot.day, slot_number: editingSlot.slot_number })
  }

  const selectedDateClasses = useMemo(() => {
    if (!selectedDate) return []
    const day = weekdayName(selectedDate)
    if (!DAYS.includes(day)) return []
    return (timetableQuery.data?.items ?? [])
      .filter(s => s.day === day)
      .sort((a, b) => a.slot_number - b.slot_number)
  }, [selectedDate, timetableQuery.data?.items])

  if (timetableQuery.isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#0f0f0f] p-6 text-white">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="h-16 animate-pulse rounded-2xl bg-[#1a1a1a]" />
          <div className="h-[420px] animate-pulse rounded-2xl bg-[#1a1a1a]" />
          <div className="h-[320px] animate-pulse rounded-2xl bg-[#1a1a1a]" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0f0f0f] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Timetable + Calendar</h1>
              <p className="mt-1 text-sm text-white/60">Weekly slots with monthly class and exam overview</p>
            </div>
            <button
              onClick={() => openModal()}
              className="rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-white/85"
            >
              + Add Class
            </button>
          </div>
        </section>

        <section className="overflow-x-auto rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[120px_repeat(6,minmax(0,1fr))] gap-2">
              <div className="rounded-lg border border-[#2a2a2a] bg-[#111111] p-2 text-xs text-white/60">Time</div>
              {DAYS.map(day => (
                <div
                  key={day}
                  className={`rounded-lg border p-2 text-center text-sm font-semibold ${today === day ? 'border-indigo-400/60 bg-indigo-500/15 text-indigo-100' : 'border-[#2a2a2a] bg-[#111111] text-white/85'}`}
                >
                  {day.slice(0, 3)}
                </div>
              ))}

              {PESU_SLOTS.map(slot => (
                <div key={`row-${slot.slot}`} className="contents">
                  <div className="rounded-lg border border-[#2a2a2a] bg-[#111111] p-2 text-xs text-white/70">
                    <p className="font-medium">Slot {slot.slot}</p>
                    <p>{slot.start} - {slot.end}</p>
                  </div>

                  {DAYS.map(day => {
                    const key = `${day}_${slot.slot}`
                    const cell = slotMap.get(key)
                    const live = day === today && nowMin >= toMinutes(slot.start) && nowMin < toMinutes(slot.end)
                    return (
                      <button
                        key={`${key}-cell`}
                        onClick={() => openModal(day, slot.slot, cell || null)}
                        className={`min-h-[88px] rounded-lg border p-2 text-left transition ${day === today ? 'bg-indigo-500/8' : 'bg-[#141414]'} ${live ? 'animate-pulse border-emerald-400 ring-1 ring-emerald-400/70' : 'border-[#2a2a2a] hover:border-white/35'}`}
                      >
                        {cell ? (
                          <>
                            <p className="truncate text-sm font-semibold text-white">{cell.subject_name}</p>
                            <p className="truncate text-xs text-white/65">{cell.faculty || 'Faculty not set'}</p>
                            <p className="truncate text-[11px] text-white/55">{cell.room || 'Room not set'}</p>
                          </>
                        ) : (
                          <p className="text-xs text-white/35">+ Add class</p>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Monthly Calendar</h2>
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                className="rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-1.5 text-white/80"
              >
                Prev
              </button>
              <span className="min-w-[140px] text-center font-semibold">
                {monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => setMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                className="rounded-lg border border-[#2a2a2a] bg-[#111111] px-3 py-1.5 text-white/80"
              >
                Next
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-xs text-white/65">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="px-2 py-1 text-center font-semibold">{d}</div>
            ))}

            {daysInMonth.map(item => {
              if (item.kind === 'blank') {
                return <div key={item.key} className="h-20 rounded-lg border border-transparent" />
              }

              const d = item.date
              const dateKey = monthKey(d)
              const isToday = monthKey(new Date()) === dateKey
              const dayName = weekdayName(d)
              const hasClasses = DAYS.includes(dayName) && (timetableQuery.data?.items ?? []).some(s => s.day === dayName)
              const exams = examMap.get(dateKey) || []

              return (
                <button
                  key={item.key}
                  onClick={() => setSelectedDate(d)}
                  className={`h-20 rounded-lg border p-2 text-left ${isToday ? 'border-indigo-400/70 bg-indigo-500/12' : 'border-[#2a2a2a] bg-[#111111] hover:border-white/35'}`}
                >
                  <div className="flex items-start justify-between">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${isToday ? 'bg-indigo-500 text-white' : 'text-white/85'}`}>{d.getDate()}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    {hasClasses && <span className="h-1.5 w-1.5 rounded-full bg-indigo-300" title="Classes scheduled" />}
                    {exams.slice(0, 2).map(ex => (
                      <span key={ex.id} className="h-1.5 w-1.5 rounded-full bg-red-400" title={ex.subject_name} />
                    ))}
                  </div>
                </button>
              )
            })}
          </div>

          {selectedDate && (
            <div className="mt-4 rounded-xl border border-[#2a2a2a] bg-[#111111] p-4">
              <h3 className="text-sm font-semibold">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <div className="mt-2 space-y-2">
                {selectedDateClasses.length === 0 ? (
                  <p className="text-sm text-white/55">No classes scheduled for this day.</p>
                ) : (
                  selectedDateClasses.map(slot => (
                    <div key={slot.id} className="rounded-lg border border-[#2a2a2a] bg-[#151515] p-2">
                      <p className="text-sm font-semibold">{slot.subject_name}</p>
                      <p className="text-xs text-white/65">{slot.start_time} - {slot.end_time}</p>
                      <p className="text-xs text-white/55">{slot.room || 'Room TBA'} · {slot.faculty || 'Faculty TBA'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
            <section className="w-full max-w-md rounded-2xl border border-[#2a2a2a] bg-[#151515] p-5">
              <h2 className="text-lg font-semibold">{editingSlot ? 'Edit Class' : 'Add Class'}</h2>

              <div className="mt-4 space-y-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-white/70">Day</span>
                  <select
                    value={form.day}
                    onChange={e => setForm(prev => ({ ...prev, day: e.target.value }))}
                    className="w-full rounded-lg border border-[#2a2a2a] bg-[#101010] px-3 py-2 text-sm"
                  >
                    {DAYS.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-white/70">Time slot</span>
                  <select
                    value={form.slot_number}
                    onChange={e => setForm(prev => ({ ...prev, slot_number: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-[#2a2a2a] bg-[#101010] px-3 py-2 text-sm"
                  >
                    {PESU_SLOTS.map(slot => (
                      <option key={slot.slot} value={slot.slot}>Slot {slot.slot} ({slot.start} - {slot.end})</option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-white/70">Subject</span>
                  <select
                    value={form.subject_code}
                    onChange={e => onSubjectChange(e.target.value)}
                    className="w-full rounded-lg border border-[#2a2a2a] bg-[#101010] px-3 py-2 text-sm"
                  >
                    <option value="">Select from attendance subjects</option>
                    {subjectOptions.map(s => (
                      <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-white/70">Faculty name (optional)</span>
                  <input
                    value={form.faculty}
                    onChange={e => setForm(prev => ({ ...prev, faculty: e.target.value }))}
                    placeholder="Faculty"
                    className="w-full rounded-lg border border-[#2a2a2a] bg-[#101010] px-3 py-2 text-sm"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-white/70">Room (optional)</span>
                  <input
                    value={form.room}
                    onChange={e => setForm(prev => ({ ...prev, room: e.target.value }))}
                    placeholder="Room"
                    className="w-full rounded-lg border border-[#2a2a2a] bg-[#101010] px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  {editingSlot && (
                    <button
                      onClick={onDelete}
                      disabled={deleteMutation.isPending || saveMutation.isPending}
                      className="rounded-lg border border-red-500/45 bg-red-500/15 px-3 py-2 text-sm text-red-200 disabled:opacity-50"
                    >
                      {deleteMutation.isPending ? 'Removing...' : 'Remove Class'}
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={closeModal}
                    disabled={deleteMutation.isPending || saveMutation.isPending}
                    className="rounded-lg border border-[#2a2a2a] bg-[#101010] px-3 py-2 text-sm text-white/80 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onSave}
                    disabled={saveMutation.isPending || !form.subject_name.trim() || !form.subject_code.trim()}
                    className="rounded-lg border border-emerald-500/45 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200 disabled:opacity-50"
                  >
                    {saveMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
