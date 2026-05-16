import { useMemo, useState } from 'react'
import { GraduationCap, ChevronLeft, BookOpen, MapPin, Layers } from 'lucide-react'

interface AcademicDetailsStepProps {
  initialData?: { program?: string; course?: string; campus?: string; semester?: number }
  onNext: (data: { program: string; course: string; campus: string; semester: number }) => void
  onBack: () => void
  isSubmitting?: boolean
}

type ProgramConfig = { label: string; courses: string[]; maxSemester: number }

const PROGRAMS: ProgramConfig[] = [
  { label: 'B.Tech', courses: ['CSE', 'AIML', 'ECE', 'EEE', 'MECH', 'CIVIL', 'BT'], maxSemester: 8 },
  { label: 'B.Pharm', courses: ['Pharmaceutics', 'Pharmacology', 'Pharmaceutical Analysis'], maxSemester: 8 },
  { label: 'BBA', courses: ['General', 'Business Analytics', 'Finance'], maxSemester: 6 },
  { label: 'BCA', courses: ['General', 'Data Science', 'Cloud and DevOps'], maxSemester: 6 },
  { label: 'M.Tech', courses: ['CSE', 'VLSI', 'Data Science'], maxSemester: 4 },
  { label: 'MBA', courses: ['General', 'Finance', 'Marketing', 'Business Analytics'], maxSemester: 4 },
]

const CAMPUSES = [{ value: 'EC', label: 'EC Campus' }, { value: 'RR', label: 'RR Campus' }]

const selectClass = 'h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-base text-white outline-none transition-all focus:border-sky-500/50 focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)] disabled:cursor-not-allowed disabled:opacity-40 [&>option]:bg-[#1a1a2e] [&>option]:text-white'

export function AcademicDetailsStep({ initialData, onNext, onBack, isSubmitting = false }: AcademicDetailsStepProps) {
  const [program, setProgram] = useState(initialData?.program || '')
  const [course, setCourse] = useState(initialData?.course || '')
  const [campus, setCampus] = useState(initialData?.campus || '')
  const [semester, setSemester] = useState(initialData?.semester?.toString() || '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const selectedProgram = useMemo(() => PROGRAMS.find(e => e.label === program), [program])
  const currentCourses = selectedProgram?.courses ?? []
  const maxSemester = selectedProgram?.maxSemester ?? 8

  const handleProgramChange = (next: string) => {
    setProgram(next); setCourse(''); setSemester('')
    setErrors(prev => ({ ...prev, program: '', course: '', semester: '' }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    const semNum = Number.parseInt(semester, 10)
    if (!program) newErrors.program = 'Please select your program'
    if (!course) newErrors.course = 'Please select your course'
    if (!campus) newErrors.campus = 'Please select your campus'
    if (!semester) newErrors.semester = 'Please select your semester'
    else if (Number.isNaN(semNum) || semNum < 1 || semNum > maxSemester) newErrors.semester = `Semester must be 1–${maxSemester}`
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    onNext({ program, course, campus, semester: semNum })
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[#13131a] p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
          <GraduationCap size={18} className="text-slate-300" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">Academic details</h3>
          <p className="text-xs text-slate-400">Your program, course, campus, and semester.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Program */}
        <div>
          <label htmlFor="program" className="mb-1.5 block text-sm font-medium text-slate-300">
            Program <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <BookOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <select id="program" value={program} onChange={e => handleProgramChange(e.target.value)} className={selectClass}>
              <option value="">Select your program</option>
              {PROGRAMS.map(e => <option key={e.label} value={e.label}>{e.label}</option>)}
            </select>
          </div>
          {errors.program && <p className="mt-1.5 text-xs text-rose-400" role="alert">{errors.program}</p>}
        </div>

        {/* Course */}
        <div>
          <label htmlFor="course" className="mb-1.5 block text-sm font-medium text-slate-300">
            Course <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <Layers className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <select id="course" value={course} onChange={e => { setCourse(e.target.value); setErrors(p => ({ ...p, course: '' })) }} disabled={!program} className={selectClass}>
              <option value="">{program ? 'Select your course' : 'Select program first'}</option>
              {currentCourses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {errors.course && <p className="mt-1.5 text-xs text-rose-400" role="alert">{errors.course}</p>}
        </div>

        {/* Campus */}
        <div>
          <label htmlFor="campus" className="mb-1.5 block text-sm font-medium text-slate-300">
            Campus <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <select id="campus" value={campus} onChange={e => { setCampus(e.target.value); setErrors(p => ({ ...p, campus: '' })) }} className={selectClass}>
              <option value="">Select your campus</option>
              {CAMPUSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          {errors.campus && <p className="mt-1.5 text-xs text-rose-400" role="alert">{errors.campus}</p>}
        </div>

        {/* Semester */}
        <div>
          <label htmlFor="semester" className="mb-1.5 block text-sm font-medium text-slate-300">
            Current semester <span className="text-rose-400">*</span>
          </label>
          <select
            id="semester"
            value={semester}
            onChange={e => { setSemester(e.target.value); setErrors(p => ({ ...p, semester: '' })) }}
            disabled={!program}
            className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-base text-white outline-none transition-all focus:border-sky-500/50 focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)] disabled:cursor-not-allowed disabled:opacity-40 [&>option]:bg-[#1a1a2e] [&>option]:text-white"
          >
            <option value="">{program ? 'Select your semester' : 'Select program first'}</option>
            {Array.from({ length: maxSemester }, (_, i) => i + 1).map(v => <option key={v} value={v}>Semester {v}</option>)}
          </select>
          {errors.semester && <p className="mt-1.5 text-xs text-rose-400" role="alert">{errors.semester}</p>}
        </div>

        <div className="rounded-xl border border-white/6 bg-white/3 px-4 py-3">
          <p className="text-xs text-slate-500">This personalises your timetable, class groups, and recommendations.</p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="flex h-12 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-slate-300 transition-all hover:bg-white/10 disabled:opacity-50"
          >
            <ChevronLeft size={16} /> Back
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-[#0a0a0f] transition-all hover:bg-slate-100 disabled:opacity-50"
          >
            {isSubmitting ? (<><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0a0a0f]/30 border-t-[#0a0a0f]" />Saving…</>) : 'Continue →'}
          </button>
        </div>
      </form>
    </div>
  )
}
