import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Trash2, X, Download } from 'lucide-react'
import { apiFetch } from '../lib/api'
import { useToast } from '../components/ui/use-toast'
import { downloadICS, type ICS_Event } from '../lib/ics'

interface BirthdayItem {
  id: string
  display_name: string | null
  avatar_url: string | null
  birthday_mmdd: string
  campus: string | null
  degree: string | null
  branch: string | null
}

type TaskType = 'assignment' | 'exam' | 'project' | 'personal' | 'reminder' | 'other'
type Priority = 'low' | 'medium' | 'high'

interface TaskItem {
  id: string
  user_id: string
  title: string
  description: string | null
  due_date: string
  due_time: string | null
  task_type: TaskType
  priority: Priority
  is_completed: boolean
  notify_before_minutes: number | null
  created_at: string
}

interface ExamItem {
  id: string
  user_id: string
  subject_name: string
  exam_type: 'ISA1' | 'ISA2' | 'ESA' | 'LAB' | 'QUIZ' | 'VIVA'
  exam_date: string
  exam_time: string | null
  venue: string | null
  semester: number | null
  notes: string | null
  created_at: string
}

interface PesuExamItem {
  id: string
  subject_name: string
  exam_type: string
  exam_date: string
  start_time: string | null
  end_time: string | null
  venue: string | null
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const TASK_TYPE_STYLES: Record<TaskType, string> = {
  exam: 'bg-[#ef4444]',
  assignment: 'bg-[#f59e0b]',
  project: 'bg-[#8b5cf6]',
  personal: 'bg-[#6366f1]',
  reminder: 'bg-[#10b981]',
  other: 'bg-[#6b7280]',
}

const TASK_TYPE_BORDER: Record<TaskType, string> = {
  exam: 'border-l-[#ef4444]',
  assignment: 'border-l-[#f59e0b]',
  project: 'border-l-[#8b5cf6]',
  personal: 'border-l-[#6366f1]',
  reminder: 'border-l-[#10b981]',
  other: 'border-l-[#6b7280]',
}

const EXAM_SUBJECT_SUGGESTIONS = [
  'Data Structures',
  'DBMS',
  'Operating Systems',
  'Computer Networks',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Engineering Graphics',
  'Microprocessors',
  'VLSI',
  'Signals and Systems',
]

const PERSONA_WORDS = ['midnight coder', 'quiet genius', 'campus legend', 'mystery topper', 'silent hustler']

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function mmdd(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function dayDiffFromToday(dateIso: string): number {
  const today = new Date()
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const d = new Date(`${dateIso}T00:00:00`)
  const startTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffMs = startTarget.getTime() - startToday.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

function firstGridDate(monthDate: Date): Date {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const mondayIndex = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - mondayIndex)
  return start
}

export default function CalendarPage() {
  const qc = useQueryClient()
  const { toast } = useToast()

  const [currentMonth, setCurrentMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()))
  const [dismissExamBanner, setDismissExamBanner] = useState(false)
  const [birthdayDraft, setBirthdayDraft] = useState('')
  const [birthdayModalOpen, setBirthdayModalOpen] = useState(false)

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    due_date: toDateKey(new Date()),
    due_time: '',
    task_type: 'personal' as TaskType,
    priority: 'medium' as Priority,
    notify_before_minutes: '60',
  })

  const [examForm, setExamForm] = useState({
    subject_name: '',
    exam_type: 'ISA1' as ExamItem['exam_type'],
    exam_date: toDateKey(new Date()),
    exam_time: '',
    venue: '',
  })

  const monthKey = toMonthKey(currentMonth)

  const tasksQuery = useQuery({
    queryKey: ['calendar', 'tasks', monthKey],
    queryFn: () => apiFetch<{ tasks: TaskItem[] }>(`/api/tasks?month=${monthKey}`),
  })

  const upcomingTasksQuery = useQuery({
    queryKey: ['calendar', 'tasks', 'upcoming'],
    queryFn: () => apiFetch<{ tasks: TaskItem[] }>('/api/tasks/upcoming'),
  })

  const birthdaysQuery = useQuery({
    queryKey: ['calendar', 'birthdays'],
    queryFn: () => apiFetch<BirthdayItem[]>('/api/profiles/birthdays'),
    staleTime: 10 * 60 * 1000,
  })

  const examsQuery = useQuery({
    queryKey: ['calendar', 'exams', monthKey],
    queryFn: () => apiFetch<{ exams: ExamItem[] }>(`/api/exam-schedule?month=${monthKey}`),
  })

  const upcomingExamsQuery = useQuery({
    queryKey: ['calendar', 'exams', 'upcoming', monthKey],
    queryFn: async () => {
      const nextMonthDate = new Date(currentMonth)
      nextMonthDate.setMonth(currentMonth.getMonth() + 1)
      const [thisMonth, nextMonth] = await Promise.all([
        apiFetch<{ exams: ExamItem[] }>(`/api/exam-schedule?month=${toMonthKey(currentMonth)}`),
        apiFetch<{ exams: ExamItem[] }>(`/api/exam-schedule?month=${toMonthKey(nextMonthDate)}`),
      ])
      return [...(thisMonth.exams ?? []), ...(nextMonth.exams ?? [])]
    },
  })

  const pesuExamsQuery = useQuery({
    queryKey: ['calendar-pesu-exams'],
    queryFn: () => apiFetch<{ items: PesuExamItem[] }>('/api/pesu-sync/exam-schedule'),
    retry: false,
  })

  const addTaskMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ task: TaskItem }>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description || undefined,
          due_date: taskForm.due_date,
          due_time: taskForm.due_time || undefined,
          task_type: taskForm.task_type,
          priority: taskForm.priority,
          notify_before_minutes: Number(taskForm.notify_before_minutes),
        }),
      }),
    onSuccess: () => {
      toast({ variant: 'success', title: 'Task added to calendar' })
      setTaskForm(prev => ({ ...prev, title: '', description: '' }))
      qc.invalidateQueries({ queryKey: ['calendar', 'tasks'] })
    },
    onError: () => toast({ variant: 'error', title: 'Failed to add task' }),
  })

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TaskItem> }) =>
      apiFetch<{ task: TaskItem }>(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar', 'tasks'] })
    },
  })

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => apiFetch<{ success: true }>(`/api/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar', 'tasks'] })
    },
  })

  const addExamMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ exam: ExamItem }>('/api/exam-schedule', {
        method: 'POST',
        body: JSON.stringify({
          subject_name: examForm.subject_name,
          exam_type: examForm.exam_type,
          exam_date: examForm.exam_date,
          exam_time: examForm.exam_time || undefined,
          venue: examForm.venue || undefined,
        }),
      }),
    onSuccess: () => {
      toast({ variant: 'success', title: 'Exam added' })
      setExamForm(prev => ({ ...prev, subject_name: '', venue: '' }))
      qc.invalidateQueries({ queryKey: ['calendar', 'exams'] })
    },
    onError: () => toast({ variant: 'error', title: 'Failed to add exam' }),
  })

  const deleteExamMutation = useMutation({
    mutationFn: (id: string) => apiFetch<{ success: true }>(`/api/exam-schedule/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar', 'exams'] }),
  })

  const postBirthdayWishMutation = useMutation({
    mutationFn: () =>
      apiFetch('/api/confessions', {
        method: 'POST',
        body: JSON.stringify({
          content: birthdayDraft,
          category: 'confession',
        }),
      }),
    onSuccess: () => {
      toast({ variant: 'success', title: 'Birthday wish posted anonymously' })
      setBirthdayModalOpen(false)
      setBirthdayDraft('')
    },
    onError: () => toast({ variant: 'error', title: 'Failed to post wish' }),
  })

  const tasks = useMemo(() => tasksQuery.data?.tasks ?? [], [tasksQuery.data?.tasks])
  const birthdays = useMemo(() => birthdaysQuery.data ?? [], [birthdaysQuery.data])
  const exams = useMemo(() => examsQuery.data?.exams ?? [], [examsQuery.data?.exams])

  const gridDays = useMemo(() => {
    const start = firstGridDate(currentMonth)
    return Array.from({ length: 42 }, (_, i) => {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      return day
    })
  }, [currentMonth])

  const selectedDayTasks = useMemo(() => tasks.filter(task => task.due_date === selectedDate), [tasks, selectedDate])
  const selectedDayExams = useMemo(() => exams.filter(exam => exam.exam_date === selectedDate), [exams, selectedDate])
  const selectedDayBirthdays = useMemo(() => {
    if (!selectedDate) return []
    const date = new Date(`${selectedDate}T00:00:00`)
    const key = mmdd(date)
    return birthdays.filter(item => item.birthday_mmdd === key)
  }, [birthdays, selectedDate])

  const upcomingExams = useMemo(
    () => (upcomingExamsQuery.data ?? []).filter(exam => {
      const diff = dayDiffFromToday(exam.exam_date)
      return diff >= 0 && diff <= 7
    }),
    [upcomingExamsQuery.data]
  )

  const firstUpcomingExam = upcomingExams[0]
  const pesuExams = useMemo(() => pesuExamsQuery.data?.items ?? [], [pesuExamsQuery.data?.items])
  const examMarkerSet = useMemo(() => new Set(pesuExams.map(item => item.exam_date)), [pesuExams])

  const upcomingPesuExams = useMemo(() => {
    const now = Date.now()
    return [...pesuExams]
      .filter(exam => {
        const t = Date.parse(exam.exam_date)
        return !Number.isNaN(t) && t >= now - (24 * 60 * 60 * 1000)
      })
      .sort((a, b) => Date.parse(a.exam_date) - Date.parse(b.exam_date))
      .slice(0, 8)
  }, [pesuExams])

  const upcomingItems = useMemo(() => {
    const taskItems = (upcomingTasksQuery.data?.tasks ?? []).map(task => ({
      kind: 'task' as const,
      id: task.id,
      title: task.title,
      date: task.due_date,
      time: task.due_time,
      type: task.task_type,
      completed: task.is_completed,
      raw: task,
    }))

    const examItems = upcomingExams.map(exam => ({
      kind: 'exam' as const,
      id: exam.id,
      title: `${exam.subject_name} ${exam.exam_type}`,
      date: exam.exam_date,
      time: exam.exam_time,
      type: 'exam' as TaskType,
      completed: false,
      raw: exam,
    }))

    return [...taskItems, ...examItems]
      .sort((a, b) => {
        const aDate = new Date(`${a.date}T${a.time ?? '00:00:00'}`).getTime()
        const bDate = new Date(`${b.date}T${b.time ?? '00:00:00'}`).getTime()
        return aDate - bDate
      })
      .slice(0, 5)
  }, [upcomingTasksQuery.data?.tasks, upcomingExams])

  useEffect(() => {
    if (!('Notification' in window)) return

    if (Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    const remindersEnabled = localStorage.getItem('calendar_notifications_task_reminders') !== '0'
    if (!remindersEnabled || !('Notification' in window)) return

    const checkNotifications = () => {
      if (Notification.permission !== 'granted') return

      const today = toDateKey(new Date())
      const now = Date.now()
      const notifiedRaw = sessionStorage.getItem('pesimens_notified_task_ids')
      const notified = new Set<string>(notifiedRaw ? JSON.parse(notifiedRaw) as string[] : [])

      for (const task of upcomingTasksQuery.data?.tasks ?? []) {
        if (task.due_date !== today || !task.due_time || !task.notify_before_minutes) continue
        if (notified.has(task.id)) continue

        const due = new Date(`${task.due_date}T${task.due_time}`).getTime()
        const notifyAt = due - task.notify_before_minutes * 60 * 1000

        if (now >= notifyAt && now < notifyAt + 60 * 1000) {
          new Notification('PESimens Reminder', {
            body: `${task.title} is due in ${task.notify_before_minutes} minutes`,
            icon: '/icons/icon-192.png',
            tag: task.id,
          })
          notified.add(task.id)
        }
      }

      sessionStorage.setItem('pesimens_notified_task_ids', JSON.stringify(Array.from(notified)))
    }

    checkNotifications()
    const timer = setInterval(checkNotifications, 60 * 1000)
    return () => clearInterval(timer)
  }, [upcomingTasksQuery.data?.tasks])

  const handleExportICS = () => {
    const allEvents: ICS_Event[] = []

    tasks.forEach(task => {
      allEvents.push({
        id: task.id,
        title: `[Task] ${task.title}`,
        description: task.description || '',
        date: task.due_date,
        time: task.due_time,
      })
    })

    exams.forEach(exam => {
      allEvents.push({
        id: exam.id,
        title: `[Exam] ${exam.subject_name} ${exam.exam_type}`,
        description: `Venue: ${exam.venue || 'TBA'}`,
        date: exam.exam_date,
        time: exam.exam_time,
      })
    })

    pesuExams.forEach(exam => {
      allEvents.push({
        id: exam.id,
        title: `[PESU Exam] ${exam.subject_name} ${exam.exam_type}`,
        description: `Venue: ${exam.venue || 'TBA'}\nTime: ${exam.start_time || 'TBA'} - ${exam.end_time || 'TBA'}`,
        date: exam.exam_date,
        time: exam.start_time,
      })
    })

    if (allEvents.length === 0) {
      toast({ variant: 'info', title: 'No events to export' })
      return
    }

    downloadICS(allEvents, `pesimens-schedule-${monthKey}.ics`)
    toast({ variant: 'success', title: 'Calendar exported successfully' })
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0f0f0f] px-4 py-5 text-white md:px-6">
      <div className="mx-auto max-w-7xl space-y-4">
        {firstUpcomingExam && !dismissExamBanner && localStorage.getItem('calendar_notifications_exam_alerts') !== '0' && (
          <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/20 to-amber-500/20 px-4 py-3 text-sm">
            <p>
              ⚠️ Upcoming Exams: {firstUpcomingExam.subject_name} {firstUpcomingExam.exam_type} in {Math.max(dayDiffFromToday(firstUpcomingExam.exam_date), 0)} days
            </p>
            <button className="rounded-lg px-2 py-1 text-white/70 hover:bg-white/10" onClick={() => setDismissExamBanner(true)}>
              Dismiss
            </button>
          </div>
        )}

        <div className="flex flex-col gap-4 lg:flex-row">
          <section className="flex-1 space-y-4">
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                    className="rounded-lg p-2 text-indigo-300 transition hover:bg-indigo-500/20"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h1 className="text-lg font-semibold">{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h1>
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                    className="rounded-lg p-2 text-indigo-300 transition hover:bg-indigo-500/20"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
                <button
                  onClick={handleExportICS}
                  className="flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-sm font-medium text-indigo-300 transition hover:bg-indigo-500/20"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export (.ics)</span>
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-xs text-white/55">
                {WEEKDAYS.map(day => (
                  <div key={day} className="py-1 font-semibold">{day}</div>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-7 gap-2">
                {gridDays.map(day => {
                  const dayKey = toDateKey(day)
                  const dayTasks = tasks.filter(task => task.due_date === dayKey)
                  const dayExams = exams.filter(exam => exam.exam_date === dayKey)
                  const dayBirthdays = birthdays.filter(item => item.birthday_mmdd === mmdd(day))
                  const isToday = dayKey === toDateKey(new Date())
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
                  const hasPesuExam = examMarkerSet.has(dayKey)

                  return (
                    <button
                      key={dayKey}
                      onClick={() => setSelectedDate(dayKey)}
                      className={`min-h-[80px] rounded-lg border p-1 text-left transition ${
                        selectedDate === dayKey
                          ? 'border-indigo-500 bg-indigo-500/15'
                          : isToday
                            ? 'border-indigo-500 bg-indigo-500/10'
                            : 'border-[#2a2a2a] bg-[#1a1a1a]'
                      } ${!isCurrentMonth ? 'opacity-45' : ''}`}
                    >
                      <div className="mb-1 text-xs font-semibold">{day.getDate()}</div>
                      <div className="space-y-1">
                        {hasPesuExam && (
                          <div className="inline-flex items-center gap-1 rounded bg-red-500/20 px-1 py-0.5 text-[10px] text-red-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Exam
                          </div>
                        )}
                        {dayTasks.slice(0, 2).map(task => (
                          <div key={task.id} className={`truncate rounded px-1 py-0.5 text-[10px] ${TASK_TYPE_STYLES[task.task_type]}`}>
                            {task.title}
                          </div>
                        ))}
                        {dayExams.slice(0, 1).map(exam => (
                          <div key={exam.id} className="truncate rounded bg-red-600 px-1 py-0.5 text-[10px]">
                            📝 {exam.subject_name} {exam.exam_type}
                          </div>
                        ))}
                        {dayBirthdays.length > 0 && (
                          <div className="text-[10px] text-amber-300">🎂 {dayBirthdays.length}</div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
              <h2 className="mb-3 text-sm font-semibold">Details for {selectedDate}</h2>

              <div className="space-y-3">
                <div>
                  <h3 className="mb-1 text-xs uppercase tracking-wide text-white/50">Tasks</h3>
                  {selectedDayTasks.length === 0 ? (
                    <p className="text-sm text-white/50">No tasks for this day.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedDayTasks.map(task => (
                        <div key={task.id} className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold">{task.title}</p>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={task.is_completed}
                                onChange={() => updateTaskMutation.mutate({ id: task.id, patch: { is_completed: !task.is_completed } })}
                              />
                              <button onClick={() => deleteTaskMutation.mutate(task.id)} className="text-white/60 hover:text-red-300">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-white/55">{task.due_time ? task.due_time.slice(0, 5) : 'No time'} • {task.priority}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-1 text-xs uppercase tracking-wide text-white/50">Birthdays</h3>
                  {selectedDayBirthdays.length === 0 ? (
                    <p className="text-sm text-white/50">No birthdays listed.</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm font-semibold">🎂 Birthdays Today</div>
                      {selectedDayBirthdays.map(item => (
                        <div key={item.id} className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <img src={item.avatar_url || ''} alt="avatar" className="h-7 w-7 rounded-full bg-[#2a2a2a] object-cover" />
                              <p>Happy Birthday {item.display_name || 'friend'}!</p>
                            </div>
                            <button
                              className="rounded-lg border border-amber-400/40 bg-amber-500/20 px-2 py-1 text-xs font-semibold text-amber-200"
                              onClick={() => {
                                const persona = PERSONA_WORDS[Math.floor(Math.random() * PERSONA_WORDS.length)]
                                setBirthdayDraft(`Happy Birthday 🎂 to the ${persona} in ${item.branch || 'campus'}!`)
                                setBirthdayModalOpen(true)
                              }}
                            >
                              🎉 Wish them!
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-1 text-xs uppercase tracking-wide text-white/50">Exam Schedule</h3>
                  {selectedDayExams.length === 0 ? (
                    <p className="text-sm text-white/50">No exams for this day.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedDayExams.map(exam => (
                        <div key={exam.id} className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold">📝 {exam.subject_name} {exam.exam_type}</p>
                            <button onClick={() => deleteExamMutation.mutate(exam.id)} className="text-white/60 hover:text-red-200">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="text-xs text-white/55">{exam.exam_time ? exam.exam_time.slice(0, 5) : 'Time TBA'} • {exam.venue || 'Venue TBA'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] p-4">
              <h2 className="text-sm font-semibold text-white">Exams</h2>
              <p className="mt-1 text-xs text-white/55">Upcoming PESU Academy exam schedule</p>
              <div className="mt-3 space-y-2">
                {upcomingPesuExams.length === 0 ? (
                  <p className="text-sm text-white/50">No synced exams yet.</p>
                ) : (
                  upcomingPesuExams.map(exam => {
                    const diff = dayDiffFromToday(exam.exam_date)
                    const countdown = diff <= 0 ? 'TODAY' : diff === 1 ? 'TOMORROW' : `In ${diff} days`
                    return (
                      <div key={exam.id} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{exam.subject_name}</p>
                            <p className="mt-0.5 text-xs text-white/65">{exam.exam_type} · {exam.exam_date}</p>
                            <p className="text-xs text-white/55">{exam.start_time || 'TBA'} - {exam.end_time || 'TBA'} · {exam.venue || 'Venue TBA'}</p>
                          </div>
                          <p className={`text-xs font-semibold ${diff < 1 ? 'animate-pulse text-red-300' : diff < 7 ? 'text-amber-300' : 'text-indigo-300'}`}>{countdown}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </section>

          <aside className="w-full space-y-4 lg:sticky lg:top-4 lg:h-fit lg:w-[280px]">
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
              <h2 className="mb-3 text-base font-semibold">Add Task +</h2>
              <div className="space-y-2">
                <input
                  value={taskForm.title}
                  onChange={e => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Task title"
                  className="w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm"
                />

                <select
                  value={taskForm.task_type}
                  onChange={e => setTaskForm(prev => ({ ...prev, task_type: e.target.value as TaskType }))}
                  className="w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm"
                >
                  <option value="assignment">📚 Assignment</option>
                  <option value="exam">📝 Exam</option>
                  <option value="project">🎯 Project</option>
                  <option value="reminder">💬 Reminder</option>
                  <option value="personal">👤 Personal</option>
                  <option value="other">Other</option>
                </select>

                <select
                  value={taskForm.priority}
                  onChange={e => setTaskForm(prev => ({ ...prev, priority: e.target.value as Priority }))}
                  className="w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm"
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🔴 High</option>
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={taskForm.due_date}
                    onChange={e => setTaskForm(prev => ({ ...prev, due_date: e.target.value }))}
                    className="rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm"
                  />
                  <input
                    type="time"
                    value={taskForm.due_time}
                    onChange={e => setTaskForm(prev => ({ ...prev, due_time: e.target.value }))}
                    className="rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm"
                  />
                </div>

                <select
                  value={taskForm.notify_before_minutes}
                  onChange={e => setTaskForm(prev => ({ ...prev, notify_before_minutes: e.target.value }))}
                  className="w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm"
                >
                  <option value="15">15min</option>
                  <option value="30">30min</option>
                  <option value="60">1hr</option>
                  <option value="120">2hr</option>
                  <option value="1440">1 day before</option>
                </select>

                <textarea
                  value={taskForm.description}
                  onChange={e => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description"
                  rows={2}
                  className="w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm"
                />

                <button
                  onClick={() => addTaskMutation.mutate()}
                  disabled={!taskForm.title.trim()}
                  className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Add to Calendar
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
              <h2 className="mb-3 text-base font-semibold">My Exams</h2>
              <div className="space-y-2">
                <input
                  list="exam-subjects"
                  value={examForm.subject_name}
                  onChange={e => setExamForm(prev => ({ ...prev, subject_name: e.target.value }))}
                  placeholder="Subject"
                  className="w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm"
                />
                <datalist id="exam-subjects">
                  {EXAM_SUBJECT_SUGGESTIONS.map(subject => (
                    <option key={subject} value={subject} />
                  ))}
                </datalist>

                <select
                  value={examForm.exam_type}
                  onChange={e => setExamForm(prev => ({ ...prev, exam_type: e.target.value as ExamItem['exam_type'] }))}
                  className="w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm"
                >
                  <option value="ISA1">ISA1</option>
                  <option value="ISA2">ISA2</option>
                  <option value="ESA">ESA</option>
                  <option value="LAB">LAB</option>
                  <option value="QUIZ">QUIZ</option>
                  <option value="VIVA">VIVA</option>
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={examForm.exam_date}
                    onChange={e => setExamForm(prev => ({ ...prev, exam_date: e.target.value }))}
                    className="rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm"
                  />
                  <input
                    type="time"
                    value={examForm.exam_time}
                    onChange={e => setExamForm(prev => ({ ...prev, exam_time: e.target.value }))}
                    className="rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm"
                  />
                </div>

                <input
                  value={examForm.venue}
                  onChange={e => setExamForm(prev => ({ ...prev, venue: e.target.value }))}
                  placeholder="Venue (e.g. Seminar Hall 2)"
                  className="w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm"
                />

                <button
                  onClick={() => addExamMutation.mutate()}
                  disabled={!examForm.subject_name.trim()}
                  className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Add Exam
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
              <h2 className="mb-3 text-base font-semibold">📋 Coming Up</h2>
              <div className="space-y-2">
                {upcomingItems.length === 0 ? (
                  <p className="text-sm text-white/50">No upcoming tasks.</p>
                ) : (
                  upcomingItems.map(item => {
                    const diff = dayDiffFromToday(item.date)
                    const countdown = diff === 0 ? 'TODAY' : diff === 1 ? 'TOMORROW' : `in ${diff} days`

                    return (
                      <div key={`${item.kind}-${item.id}`} className={`rounded-lg border border-[#2a2a2a] border-l-4 bg-[#111111] px-3 py-2 ${TASK_TYPE_BORDER[item.type]}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{item.title}</p>
                            <p className="text-xs text-white/55">{item.date} {item.time ? `• ${item.time.slice(0, 5)}` : ''}</p>
                            {item.kind === 'exam' && (
                              <p className="text-xs text-red-300">{countdown}</p>
                            )}
                            {item.kind === 'task' && (
                              <p className="text-xs text-white/45">{countdown}</p>
                            )}
                          </div>
                          {item.kind === 'task' ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={item.completed}
                                onChange={() => updateTaskMutation.mutate({ id: item.id, patch: { is_completed: !item.completed } })}
                              />
                              <button onClick={() => deleteTaskMutation.mutate(item.id)} className="text-white/50 hover:text-red-300">×</button>
                            </div>
                          ) : (
                            <button onClick={() => deleteExamMutation.mutate(item.id)} className="text-white/50 hover:text-red-300">×</button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {birthdayModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Anonymous Birthday Wish</h3>
              <button onClick={() => setBirthdayModalOpen(false)} className="text-white/60 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <textarea
              value={birthdayDraft}
              onChange={e => setBirthdayDraft(e.target.value.slice(0, 500))}
              rows={4}
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-white/45">This posts as an anonymous confession-style campus message.</p>
            <button
              onClick={() => postBirthdayWishMutation.mutate()}
              disabled={!birthdayDraft.trim()}
              className="mt-3 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Post Birthday Wish
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
