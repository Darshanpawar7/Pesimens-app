import { useState, useMemo } from 'react'
import {
  Calculator,
  GraduationCap,
  Target,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  Award,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  BookOpen,
} from 'lucide-react'

// PES University Grading Scale
export const GRADE_POINTS: Record<string, number> = {
  S: 10,
  A: 9,
  B: 8,
  C: 7,
  D: 6,
  E: 5,
  F: 0,
}

export type GradeKey = keyof typeof GRADE_POINTS

export interface Course {
  id: string
  name: string
  credits: number
  grade: GradeKey
}

export interface SemesterEntry {
  id: string
  semesterNumber: number
  sgpa: number
  credits: number
}

const DEFAULT_COURSES: Course[] = [
  { id: '1', name: 'Course 1', credits: 4, grade: 'S' },
  { id: '2', name: 'Course 2', credits: 4, grade: 'A' },
  { id: '3', name: 'Course 3', credits: 3, grade: 'A' },
  { id: '4', name: 'Course 4', credits: 3, grade: 'B' },
  { id: '5', name: 'Course 5', credits: 2, grade: 'S' },
]

const DEFAULT_SEMESTERS: SemesterEntry[] = [
  { id: 'sem-1', semesterNumber: 1, sgpa: 8.5, credits: 20 },
  { id: 'sem-2', semesterNumber: 2, sgpa: 8.8, credits: 22 },
  { id: 'sem-3', semesterNumber: 3, sgpa: 8.2, credits: 20 },
]

export default function GpaCalculatorPage() {
  const [activeTab, setActiveTab] = useState<'sgpa' | 'cgpa' | 'target'>('sgpa')

  // ----------------------------------------------------
  // Tab 1: SGPA State
  // ----------------------------------------------------
  const [courses, setCourses] = useState<Course[]>(DEFAULT_COURSES)

  const handleAddCourse = () => {
    const newCourse: Course = {
      id: crypto.randomUUID(),
      name: `Course ${courses.length + 1}`,
      credits: 4,
      grade: 'A',
    }
    setCourses([...courses, newCourse])
  }

  const handleRemoveCourse = (id: string) => {
    if (courses.length <= 1) return
    setCourses(courses.filter(c => c.id !== id))
  }

  const handleCourseChange = (id: string, field: keyof Course, value: any) => {
    setCourses(
      courses.map(c => (c.id === id ? { ...c, [field]: value } : c))
    )
  }

  const handleResetCourses = () => {
    setCourses(DEFAULT_COURSES)
  }

  const sgpaCalculation = useMemo(() => {
    let totalCredits = 0
    let totalGradePoints = 0

    for (const course of courses) {
      const credits = Number(course.credits) || 0
      const points = GRADE_POINTS[course.grade] ?? 0
      totalCredits += credits
      totalGradePoints += points * credits
    }

    const sgpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0
    return {
      totalCredits,
      totalGradePoints,
      sgpa: Number(sgpa.toFixed(2)),
    }
  }, [courses])

  // ----------------------------------------------------
  // Tab 2: CGPA State
  // ----------------------------------------------------
  const [semesters, setSemesters] = useState<SemesterEntry[]>(DEFAULT_SEMESTERS)

  const handleAddSemester = () => {
    if (semesters.length >= 8) return
    const nextSemNum = semesters.length + 1
    const newSem: SemesterEntry = {
      id: crypto.randomUUID(),
      semesterNumber: nextSemNum,
      sgpa: 8.0,
      credits: 20,
    }
    setSemesters([...semesters, newSem])
  }

  const handleRemoveSemester = (id: string) => {
    if (semesters.length <= 1) return
    setSemesters(semesters.filter(s => s.id !== id))
  }

  const handleSemesterChange = (id: string, field: keyof SemesterEntry, value: any) => {
    if (field === 'credits') {
      const numVal = Number(value)
      if (isNaN(numVal) || numVal < 1) {
        return
      }
    }
    setSemesters(
      semesters.map(s => (s.id === id ? { ...s, [field]: value } : s))
    )
  }

  const handleResetSemesters = () => {
    setSemesters(DEFAULT_SEMESTERS)
  }

  const cgpaCalculation = useMemo(() => {
    let totalCredits = 0
    let totalWeightedSgpa = 0

    for (const sem of semesters) {
      const credits = Number(sem.credits)
      if (isNaN(credits) || credits <= 0) continue

      const sgpa = Math.min(10, Math.max(0, Number(sem.sgpa) || 0))
      totalCredits += credits
      totalWeightedSgpa += sgpa * credits
    }

    const cgpa = totalCredits > 0 ? totalWeightedSgpa / totalCredits : 0
    return {
      totalCredits,
      cgpa: Number(cgpa.toFixed(2)),
    }
  }, [semesters])

  // ----------------------------------------------------
  // Tab 3: Target CGPA Predictor State
  // ----------------------------------------------------
  const [currentCgpa, setCurrentCgpa] = useState<number>(8.0)
  const [completedCredits, setCompletedCredits] = useState<number>(60)
  const [targetCgpa, setTargetCgpa] = useState<number>(8.5)
  const [upcomingCredits, setUpcomingCredits] = useState<number>(20)

  const targetCalculation = useMemo(() => {
    const curr = Math.min(10, Math.max(0, Number(currentCgpa) || 0))
    const comp = Math.max(1, Number(completedCredits) || 1)
    const target = Math.min(10, Math.max(0, Number(targetCgpa) || 0))
    const upcoming = Math.max(1, Number(upcomingCredits) || 1)

    const totalCredits = comp + upcoming
    const requiredTotalPoints = target * totalCredits
    const currentPoints = curr * comp
    const requiredUpcomingPoints = requiredTotalPoints - currentPoints
    const requiredSgpa = requiredUpcomingPoints / upcoming

    const rounded = Number(requiredSgpa.toFixed(2))

    let status: 'impossible' | 'hard' | 'achievable' | 'easy' = 'achievable'
    let message = ''

    if (rounded > 10.0) {
      status = 'impossible'
      message = `Mathematically Impossible: You would need an SGPA of ${rounded.toFixed(2)} (maximum achievable is 10.00). Try adjusting your target CGPA or increasing credit load.`
    } else if (rounded >= 8.5) {
      status = 'hard'
      message = `Ambitious Target: You need an SGPA of ${rounded.toFixed(2)} in the upcoming semester. Target 'S' and 'A' grades in high-credit courses!`
    } else if (rounded >= 5.0) {
      status = 'achievable'
      message = `Very Achievable: Maintain a steady SGPA of ${rounded.toFixed(2)} in the upcoming semester to reach your goal.`
    } else {
      status = 'easy'
      message = `Goal Already Secured: Even with minimum passing grades (${Math.max(0, rounded).toFixed(2)} SGPA), your target CGPA will be met!`
    }

    return {
      requiredSgpa: rounded,
      status,
      message,
    }
  }, [currentCgpa, completedCredits, targetCgpa, upcomingCredits])

  return (
    <div className="min-h-screen bg-[#0f0f0f] px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Calculator className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                GPA & CGPA Calculator
              </h1>
              <p className="mt-1 text-sm text-white/60">
                PES University 10-point scale grade calculator and target predictor
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 flex flex-wrap gap-2 rounded-xl border border-white/10 bg-[#16161a] p-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('sgpa')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === 'sgpa'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>SGPA Calculator</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cgpa')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === 'cgpa'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              <span>CGPA Calculator</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('target')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                activeTab === 'target'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Target className="h-4 w-4" />
              <span>Target Predictor</span>
            </button>
          </div>
        </header>

        {/* Tab 1: SGPA Calculator */}
        {activeTab === 'sgpa' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Courses Table / Form */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-[#141418] p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Semester Courses</h2>
                    <p className="text-xs text-white/50">Add your courses with credits and expected grades</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetCourses}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white"
                      title="Reset to default courses"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Reset</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCourse}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Course</span>
                    </button>
                  </div>
                </div>

                {/* Course List Header */}
                <div className="mb-2 grid grid-cols-12 gap-3 px-3 py-2 text-xs font-medium text-white/50">
                  <div className="col-span-5 md:col-span-6">Course Name</div>
                  <div className="col-span-3 md:col-span-3">Credits</div>
                  <div className="col-span-3 md:col-span-2">Grade</div>
                  <div className="col-span-1 text-right"></div>
                </div>

                {/* Course Rows */}
                <div className="space-y-2.5">
                  {courses.map((course, idx) => (
                    <div
                      key={course.id}
                      className="grid grid-cols-12 items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 transition-colors hover:border-white/10"
                    >
                      <div className="col-span-5 md:col-span-6">
                        <input
                          type="text"
                          value={course.name}
                          onChange={e => handleCourseChange(course.id, 'name', e.target.value)}
                          placeholder={`Course ${idx + 1}`}
                          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white placeholder-white/30 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div className="col-span-3 md:col-span-3">
                        <select
                          value={course.credits}
                          onChange={e => handleCourseChange(course.id, 'credits', Number(e.target.value))}
                          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                        >
                          <option value={1}>1 Credit</option>
                          <option value={2}>2 Credits</option>
                          <option value={3}>3 Credits</option>
                          <option value={4}>4 Credits</option>
                          <option value={5}>5 Credits</option>
                        </select>
                      </div>

                      <div className="col-span-3 md:col-span-2">
                        <select
                          value={course.grade}
                          onChange={e => handleCourseChange(course.id, 'grade', e.target.value as GradeKey)}
                          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm font-semibold text-indigo-400 focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="S">S (10)</option>
                          <option value="A">A (9)</option>
                          <option value="B">B (8)</option>
                          <option value="C">C (7)</option>
                          <option value="D">D (6)</option>
                          <option value="E">E (5)</option>
                          <option value="F">F (0)</option>
                        </select>
                      </div>

                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveCourse(course.id)}
                          disabled={courses.length <= 1}
                          className="rounded-lg p-1.5 text-white/40 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-white/50">
                  <span>{courses.length} courses added</span>
                  <span>Total Credits: {sgpaCalculation.totalCredits}</span>
                </div>
              </div>
            </div>

            {/* SGPA Result Card */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/40 to-[#141418] p-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    Calculated SGPA
                  </span>
                  <Award className="h-5 w-5 text-indigo-400" />
                </div>

                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold tracking-tight text-white">
                    {sgpaCalculation.sgpa.toFixed(2)}
                  </span>
                  <span className="text-sm font-medium text-white/50">/ 10.00</span>
                </div>

                <div className="mt-6 space-y-2 border-t border-white/10 pt-4 text-xs text-white/70">
                  <div className="flex justify-between">
                    <span>Total Semester Credits</span>
                    <span className="font-semibold text-white">{sgpaCalculation.totalCredits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Earned Grade Points</span>
                    <span className="font-semibold text-white">{sgpaCalculation.totalGradePoints}</span>
                  </div>
                </div>

                {/* Grade Scale Quick Reference */}
                <div className="mt-6 rounded-xl border border-white/5 bg-black/30 p-3">
                  <p className="text-[11px] font-semibold text-white/60 mb-2">PESU Grade Scale</p>
                  <div className="grid grid-cols-4 gap-1 text-[10px] text-white/50 text-center">
                    <span className="rounded bg-white/5 py-0.5">S = 10</span>
                    <span className="rounded bg-white/5 py-0.5">A = 9</span>
                    <span className="rounded bg-white/5 py-0.5">B = 8</span>
                    <span className="rounded bg-white/5 py-0.5">C = 7</span>
                    <span className="rounded bg-white/5 py-0.5">D = 6</span>
                    <span className="rounded bg-white/5 py-0.5">E = 5</span>
                    <span className="rounded bg-white/5 py-0.5">F = 0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: CGPA Calculator */}
        {activeTab === 'cgpa' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-[#141418] p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Past Semesters</h2>
                    <p className="text-xs text-white/50">Enter SGPA and credits for completed semesters</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetSemesters}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Reset</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddSemester}
                      disabled={semesters.length >= 8}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Semester</span>
                    </button>
                  </div>
                </div>

                <div className="mb-2 grid grid-cols-12 gap-3 px-3 py-2 text-xs font-medium text-white/50">
                  <div className="col-span-4">Semester</div>
                  <div className="col-span-4">SGPA (0–10)</div>
                  <div className="col-span-3">Credits</div>
                  <div className="col-span-1 text-right"></div>
                </div>

                <div className="space-y-2.5">
                  {semesters.map((sem, idx) => (
                    <div
                      key={sem.id}
                      className="grid grid-cols-12 items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 hover:border-white/10"
                    >
                      <div className="col-span-4">
                        <span className="font-semibold text-sm text-white">Semester {idx + 1}</span>
                      </div>

                      <div className="col-span-4">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="10"
                          value={sem.sgpa}
                          onChange={e => handleSemesterChange(sem.id, 'sgpa', Number(e.target.value))}
                          placeholder="SGPA"
                          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-indigo-400 font-semibold focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          min="1"
                          max="40"
                          value={sem.credits}
                          onChange={e => handleSemesterChange(sem.id, 'credits', Number(e.target.value))}
                          placeholder="Credits"
                          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveSemester(sem.id)}
                          disabled={semesters.length <= 1}
                          className="rounded-lg p-1.5 text-white/40 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CGPA Result Card */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/40 to-[#141418] p-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    Cumulative CGPA
                  </span>
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>

                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold tracking-tight text-white">
                    {cgpaCalculation.cgpa.toFixed(2)}
                  </span>
                  <span className="text-sm font-medium text-white/50">/ 10.00</span>
                </div>

                <div className="mt-6 space-y-2 border-t border-white/10 pt-4 text-xs text-white/70">
                  <div className="flex justify-between">
                    <span>Semesters Calculated</span>
                    <span className="font-semibold text-white">{semesters.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Cumulative Credits</span>
                    <span className="font-semibold text-white">{cgpaCalculation.totalCredits}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Target CGPA Predictor */}
        {activeTab === 'target' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-[#141418] p-6 shadow-xl">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-white">Target Predictor Parameters</h2>
                  <p className="text-xs text-white/50">Calculate what SGPA you need next semester to achieve your target CGPA</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Current CGPA */}
                  <div className="rounded-xl border border-white/5 bg-black/40 p-4">
                    <label className="block text-xs font-medium text-white/70 mb-1.5">Current CGPA</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={currentCgpa}
                      onChange={e => setCurrentCgpa(Number(e.target.value))}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-base font-semibold text-white focus:border-indigo-500 focus:outline-none"
                    />
                    <span className="text-[11px] text-white/40 mt-1 block">Your current cumulative GPA</span>
                  </div>

                  {/* Completed Credits */}
                  <div className="rounded-xl border border-white/5 bg-black/40 p-4">
                    <label className="block text-xs font-medium text-white/70 mb-1.5">Completed Credits</label>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={completedCredits}
                      onChange={e => setCompletedCredits(Number(e.target.value))}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-base font-semibold text-white focus:border-indigo-500 focus:outline-none"
                    />
                    <span className="text-[11px] text-white/40 mt-1 block">Total credits earned so far (e.g. 60)</span>
                  </div>

                  {/* Target CGPA */}
                  <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4">
                    <label className="block text-xs font-medium text-indigo-300 mb-1.5">Desired Target CGPA</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={targetCgpa}
                      onChange={e => setTargetCgpa(Number(e.target.value))}
                      className="w-full rounded-lg border border-indigo-500/40 bg-white/5 px-3 py-2 text-base font-bold text-indigo-400 focus:border-indigo-400 focus:outline-none"
                    />
                    <span className="text-[11px] text-indigo-300/50 mt-1 block">The CGPA you want to reach</span>
                  </div>

                  {/* Upcoming Semester Credits */}
                  <div className="rounded-xl border border-white/5 bg-black/40 p-4">
                    <label className="block text-xs font-medium text-white/70 mb-1.5">Upcoming Semester Credits</label>
                    <input
                      type="number"
                      min="1"
                      max="35"
                      value={upcomingCredits}
                      onChange={e => setUpcomingCredits(Number(e.target.value))}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-base font-semibold text-white focus:border-indigo-500 focus:outline-none"
                    />
                    <span className="text-[11px] text-white/40 mt-1 block">Credits registered next sem (e.g. 20)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Target Prediction Result Card */}
            <div className="space-y-4">
              <div
                className={`rounded-2xl border p-6 shadow-xl ${
                  targetCalculation.status === 'impossible'
                    ? 'border-rose-500/40 bg-gradient-to-b from-rose-950/40 to-[#141418]'
                    : targetCalculation.status === 'hard'
                    ? 'border-amber-500/40 bg-gradient-to-b from-amber-950/40 to-[#141418]'
                    : 'border-indigo-500/40 bg-gradient-to-b from-indigo-950/40 to-[#141418]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider ${
                      targetCalculation.status === 'impossible'
                        ? 'text-rose-400'
                        : targetCalculation.status === 'hard'
                        ? 'text-amber-400'
                        : 'text-indigo-400'
                    }`}
                  >
                    Required SGPA Next Sem
                  </span>
                  {targetCalculation.status === 'impossible' ? (
                    <AlertCircle className="h-5 w-5 text-rose-400" />
                  ) : (
                    <Sparkles className="h-5 w-5 text-indigo-400" />
                  )}
                </div>

                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-extrabold tracking-tight text-white">
                    {targetCalculation.requiredSgpa > 0
                      ? targetCalculation.requiredSgpa.toFixed(2)
                      : '0.00'}
                  </span>
                  <span className="text-sm font-medium text-white/50">/ 10.00</span>
                </div>

                {/* Status Message */}
                <div
                  className={`mt-4 rounded-xl border p-3 text-xs leading-relaxed ${
                    targetCalculation.status === 'impossible'
                      ? 'border-rose-500/20 bg-rose-500/10 text-rose-300'
                      : targetCalculation.status === 'hard'
                      ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                      : 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300'
                  }`}
                >
                  <p>{targetCalculation.message}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
