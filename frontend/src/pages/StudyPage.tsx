import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Search, Target, Upload, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { DetailBackButton } from '@/components/common/DetailBackButton'
import type { TagFrequency } from '@/components/analytics/TopicFrequencyChart'
import { ApiError, apiFetch } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { AIChatPanel } from '../components/ai/AIChatPanel'
import { SmartNotesDisplay } from '@/components/study/SmartNotesDisplay'
import { UnifiedUploadModal } from '@/components/study/UnifiedUploadModal'

const PYQFeed = lazy(() => import('@/components/pyqs/PYQFeed').then(m => ({ default: m.PYQFeed })))
const AnalyticsFilters = lazy(() => import('@/components/analytics/AnalyticsFilters').then(m => ({ default: m.AnalyticsFilters })))
const TopicFrequencyChart = lazy(() => import('@/components/analytics/TopicFrequencyChart').then(m => ({ default: m.TopicFrequencyChart })))
const TrendLineChart = lazy(() => import('@/components/analytics/TrendLineChart').then(m => ({ default: m.TrendLineChart })))
const PDFExportButton = lazy(() => import('@/components/analytics/PDFExportButton').then(m => ({ default: m.PDFExportButton })))

type SubjectType = 'core' | 'elective' | 'project' | 'audit'
type ContentType = 'pyqs' | 'notes' | 'slides' | 'analytics' | 'summary' | 'unit-notes'
type BranchKey = 'CSE' | 'AIML' | 'ECE' | 'EEE' | 'ME' | 'BIOTECH' | 'BPHARM'

interface SubjectDef {
  code: string
  name: string
  short: string
  type: SubjectType
  hasLab: boolean
  credits: number
  note?: string
  specialization?: string
}

interface SubjectAvailability {
  subject: string
  pyq_count: number
  has_notes: boolean
  has_slides: boolean
  has_summary: boolean
  latest_pyq_at: string | null
}

interface SubjectsResponse {
  ok: true
  subjects: SubjectAvailability[]
}

interface StudyMaterial {
  id: string
  title: string
  exam_type: string
  material_type: string
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
  extraction_method?: 'pdfjs' | 'ocr' | 'hybrid' | null
  file_name?: string | null
  file_path?: string | null
  file_url?: string | null
  signed_url?: string | null
}

interface MaterialsResponse {
  ok: true
  items: StudyMaterial[]
}

interface SummaryData {
  subject: string
  exam_type: string
  smart_summary: string
  high_probability_topics: Array<{ topic: string; years?: number[] }>
  medium_probability_topics: Array<{ topic: string; years?: number[] }>
  low_probability_topics: Array<{ topic: string; years?: number[] }>
  key_definitions: Array<{ term: string; definition: string }>
  mcq_1mark?: Array<{ question: string; options?: string[]; answer?: string; explanation?: string; topic?: string }>
  mcq_2mark?: Array<{ question: string; options?: string[]; answer?: string; explanation?: string; topic?: string }>
  theory_questions?: Array<{ question: string; answer?: string; marks?: number; topic?: string }>
  based_on_years?: number[]
  generated_at: string
}

interface SummaryResponse {
  ok: true
  summary: SummaryData | null
}

interface TrendsResponse {
  trends: Record<string, unknown>[]
}

interface DriveResponse {
  drive_url?: string | null
}

function queryErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

function normalizeTopicLabel(value: string): string {
  const cleaned = value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) return ''

  let normalized = cleaned
    .split(' ')
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : '')
    .join(' ')

  normalized = normalized.replace(/\bIsa\b/g, 'ISA')
  normalized = normalized.replace(/\bArm7tdmi\b/g, 'ARM7TDMI')
  normalized = normalized.replace(/\bRisc\b/g, 'RISC')
  normalized = normalized.replace(/\bCisc\b/g, 'CISC')

  return normalized
}

function isWeakTopicLabel(value: string): boolean {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) return true
  if (normalized.length > 48) return true
  if (/^(?:what|why|when|where|which|who|how|assume|consider|given|find|derive|state|explain|write|show|calculate|discuss)\b/.test(normalized)) {
    return true
  }
  if (normalized === 'general' || normalized === 'misc' || normalized === 'others') return true

  const tokens = normalized.split(' ').filter(Boolean)
  if (tokens.length === 0) return true
  if (tokens.every((token) => token.length < 4)) return true

  return false
}

function isWeakPracticeQuestion(question: string): boolean {
  const normalized = question
    .replace(/\s+/g, ' ')
    .trim()

  if (normalized.length < 14 || normalized.length > 280) return true
  if (/^[\[{]/.test(normalized)) return true
  if (/"(?:question|answer|topic|options)"\s*:/.test(normalized)) return true
  if (normalized.split(' ').length < 4) return true

  return false
}

function formatAnswerHint(answer: string, options: string[]): string {
  const normalizedAnswer = answer.trim()
  if (!normalizedAnswer) return ''

  const match = normalizedAnswer.match(/^(?:option\s*)?([a-d])\b/i)
  if (!match) return normalizedAnswer

  const index = match[1].toUpperCase().charCodeAt(0) - 65
  const selected = options[index]
  if (!selected) return match[1].toUpperCase()

  return `${match[1].toUpperCase()}: ${selected}`
}

const CSE_SUBJECTS: Record<number, SubjectDef[]> = {
  1: [
    {
      code: 'UE25CS151A',
      name: 'Python for Computational Problem Solving',
      short: 'Python',
      type: 'core',
      hasLab: true,
      credits: 5,
    },
    {
      code: 'UE25PH1XX',
      name: 'Engineering Physics',
      short: 'Physics',
      type: 'core',
      hasLab: true,
      credits: 5,
    },
    {
      code: 'UE25ME1XX',
      name: 'Engineering Mechanics',
      short: 'Mechanics',
      type: 'core',
      hasLab: false,
      credits: 4,
    },
    {
      code: 'UE25MA1XX',
      name: 'Mathematics - I (Calculus & ODE)',
      short: 'Maths 1',
      type: 'core',
      hasLab: false,
      credits: 4,
    },
    {
      code: 'UE25EE1XX',
      name: 'Basic Electrical Engineering',
      short: 'BEE',
      type: 'core',
      hasLab: true,
      credits: 4,
    },
    {
      code: 'UE25EV1XX',
      name: 'Environmental Studies',
      short: 'EVS',
      type: 'audit',
      hasLab: false,
      credits: 2,
      note: 'Online · Saturday only',
    },
  ],
  2: [
    {
      code: 'UE25CS151B',
      name: 'Problem Solving with C',
      short: 'C Programming',
      type: 'core',
      hasLab: true,
      credits: 5,
    },
    {
      code: 'UE25CH2XX',
      name: 'Engineering Chemistry',
      short: 'Chemistry',
      type: 'core',
      hasLab: true,
      credits: 5,
    },
    {
      code: 'UE25ME2XX',
      name: 'Engineering Mechanics (Dynamics)',
      short: 'Mechanics 2',
      type: 'core',
      hasLab: false,
      credits: 4,
    },
    {
      code: 'UE25MA2XX',
      name: 'Mathematics - II (Linear Algebra & PDE)',
      short: 'Maths 2',
      type: 'core',
      hasLab: false,
      credits: 4,
    },
    {
      code: 'UE25EC2XX',
      name: 'Basic Electronics Engineering',
      short: 'Electronics',
      type: 'core',
      hasLab: true,
      credits: 4,
    },
    {
      code: 'UE25CI2XX',
      name: 'Constitution of India',
      short: 'Constitution',
      type: 'audit',
      hasLab: false,
      credits: 2,
      note: 'Online · Saturday only',
    },
  ],
  3: [
    {
      code: 'UE24CS251A',
      name: 'Digital Design and Computer Organization',
      short: 'DDCO',
      type: 'core',
      hasLab: true,
      credits: 5,
    },
    {
      code: 'UE24CS252A',
      name: 'Data Structures and its Applications',
      short: 'DSA',
      type: 'core',
      hasLab: true,
      credits: 5,
    },
    {
      code: 'UE24MA242A',
      name: 'Mathematics for Computer Science and Engineering',
      short: 'Maths (CSE)',
      type: 'core',
      hasLab: false,
      credits: 4,
    },
    {
      code: 'UE24CS242A',
      name: 'Web Technologies',
      short: 'Web Tech',
      type: 'core',
      hasLab: false,
      credits: 4,
    },
    {
      code: 'UE24CS243A',
      name: 'Automata Formal Languages and Logic',
      short: 'Automata',
      type: 'core',
      hasLab: false,
      credits: 4,
    },
    {
      code: 'UE24EC221A',
      name: 'CIE - Center of Excellence Level 1',
      short: 'CIE L1',
      type: 'audit',
      hasLab: false,
      credits: 2,
      note: 'Industry exposure course',
    },
  ],
  4: [
    {
      code: 'UE24CS251B',
      name: 'Microprocessor and Computer Architecture',
      short: 'Microprocessors',
      type: 'core',
      hasLab: true,
      credits: 5,
    },
    {
      code: 'UE24CS252B',
      name: 'Computer Networks',
      short: 'CN',
      type: 'core',
      hasLab: true,
      credits: 5,
    },
    {
      code: 'UE24CS241B',
      name: 'Design and Analysis of Algorithms',
      short: 'DAA',
      type: 'core',
      hasLab: false,
      credits: 4,
    },
    {
      code: 'UE24CS242B',
      name: 'Operating Systems',
      short: 'OS',
      type: 'core',
      hasLab: false,
      credits: 4,
    },
    {
      code: 'UE24MA241B',
      name: 'Linear Algebra and its Applications',
      short: 'Linear Algebra',
      type: 'core',
      hasLab: false,
      credits: 4,
    },
    {
      code: 'UE24EC221B',
      name: 'EIE - Level 2',
      short: 'EIE L2',
      type: 'audit',
      hasLab: false,
      credits: 2,
      note: 'Industry exposure course',
    },
  ],
  5: [
    {
      code: 'UE23CS351A',
      name: 'Database Management System',
      short: 'DBMS',
      type: 'core',
      hasLab: true,
      credits: 5,
    },
    {
      code: 'UE23CS352A',
      name: 'Machine Learning',
      short: 'ML',
      type: 'core',
      hasLab: true,
      credits: 5,
    },
    {
      code: 'UE23CS341A',
      name: 'Software Engineering',
      short: 'SE',
      type: 'core',
      hasLab: false,
      credits: 4,
    },
    {
      code: 'UE23CS342AA1',
      name: 'Advanced Algorithms',
      short: 'Adv Algorithms',
      type: 'elective',
      hasLab: false,
      credits: 4,
      specialization: 'SCC',
    },
    {
      code: 'UE23CS342AA2',
      name: 'Data Analytics',
      short: 'Data Analytics',
      type: 'elective',
      hasLab: false,
      credits: 4,
      specialization: 'MIDS',
    },
    {
      code: 'UE23CS343AB8',
      name: 'Text and Speech Processing',
      short: 'NLP',
      type: 'elective',
      hasLab: false,
      credits: 4,
      specialization: 'MIDS',
    },
  ],
  6: [
    {
      code: 'UE23CS351B',
      name: 'Cloud Computing',
      short: 'Cloud Computing',
      type: 'core',
      hasLab: true,
      credits: 5,
    },
    {
      code: 'UE23CS352B',
      name: 'Object Oriented Analysis and Design',
      short: 'OOAD',
      type: 'core',
      hasLab: true,
      credits: 5,
    },
    {
      code: 'UE23CS341B',
      name: 'Compiler Design',
      short: 'Compiler Design',
      type: 'core',
      hasLab: false,
      credits: 4,
    },
    {
      code: 'UE23CS342BA4',
      name: 'Generative AI and its Applications',
      short: 'Generative AI',
      type: 'elective',
      hasLab: false,
      credits: 4,
    },
    {
      code: 'UE23CS343BB2',
      name: 'Topics in Deep Learning',
      short: 'Deep Learning',
      type: 'elective',
      hasLab: false,
      credits: 4,
    },
  ],
  7: [
    {
      code: 'UE22CS441A',
      name: 'Capstone Project Phase III',
      short: 'Capstone III',
      type: 'project',
      hasLab: true,
      credits: 4,
    },
  ],
  8: [
    {
      code: 'UE22CS421B',
      name: 'Capstone Project Phase IV',
      short: 'Capstone IV',
      type: 'project',
      hasLab: true,
      credits: 4,
    },
    {
      code: 'UE22CS461XB',
      name: 'Internship',
      short: 'Internship',
      type: 'project',
      hasLab: false,
      credits: 6,
    },
  ],
}

const ECE_SUBJECTS: Record<number, SubjectDef[]> = {
  1: [
    { code: 'UE25PH1XX', name: 'Engineering Physics', short: 'Physics', type: 'core', hasLab: true, credits: 5 },
    { code: 'UE25CS151A', name: 'Python for Computational Problem Solving', short: 'Python', type: 'core', hasLab: true, credits: 5 },
    { code: 'UE25ME1XX', name: 'Engineering Mechanics', short: 'Mechanics', type: 'core', hasLab: false, credits: 4 },
    { code: 'UE25MA1XX', name: 'Mathematics - I', short: 'Maths 1', type: 'core', hasLab: false, credits: 4 },
    { code: 'UE25EE1XX', name: 'Basic Electrical Engineering', short: 'BEE', type: 'core', hasLab: true, credits: 4 },
    { code: 'UE25EV1XX', name: 'Environmental Studies', short: 'EVS', type: 'audit', hasLab: false, credits: 2, note: 'Online · Saturday only' },
  ],
  2: [
    { code: 'UE25CH2XX', name: 'Engineering Chemistry', short: 'Chemistry', type: 'core', hasLab: true, credits: 5 },
    { code: 'UE25CS151B', name: 'Problem Solving with C', short: 'C Programming', type: 'core', hasLab: true, credits: 5 },
    { code: 'UE25ME2XX', name: 'Engineering Mechanics (Dynamics)', short: 'Mechanics 2', type: 'core', hasLab: false, credits: 4 },
    { code: 'UE25MA2XX', name: 'Mathematics - II', short: 'Maths 2', type: 'core', hasLab: false, credits: 4 },
    { code: 'UE25EC2XX', name: 'Basic Electronics Engineering', short: 'Electronics', type: 'core', hasLab: true, credits: 4 },
    { code: 'UE25CI2XX', name: 'Constitution of India', short: 'Constitution', type: 'audit', hasLab: false, credits: 2, note: 'Online · Saturday only' },
  ],
  3: [
    { code: 'UE24EC251A', name: 'Analog Circuit Design', short: 'Analog Circuits', type: 'core', hasLab: true, credits: 5 },
    { code: 'UE24EC252A', name: 'Computer Aided Digital Design', short: 'CADD', type: 'core', hasLab: true, credits: 5 },
    { code: 'UE24MA242B', name: 'Mathematics for Electronics Engineers', short: 'Maths (ECE)', type: 'core', hasLab: false, credits: 4 },
    { code: 'UE24EC241A', name: 'Network Analysis and Synthesis', short: 'NAS', type: 'core', hasLab: false, credits: 4 },
    { code: 'UE24EC242A', name: 'Signals and Systems', short: 'Signals & Systems', type: 'core', hasLab: false, credits: 4 },
    { code: 'UE24EC221A', name: 'CIE - Center of Excellence Level 1', short: 'CIE L1', type: 'audit', hasLab: false, credits: 2, note: 'Industry exposure course' },
  ],
  4: [
    { code: 'UE24EC251B', name: 'Principles of Digital Signal Processing', short: 'DSP', type: 'core', hasLab: true, credits: 5 },
    { code: 'UE24EC252B', name: 'Digital VLSI Design', short: 'VLSI Design', type: 'core', hasLab: true, credits: 5 },
    { code: 'UE24EC241B', name: 'Control Systems', short: 'Control Systems', type: 'core', hasLab: false, credits: 4 },
    { code: 'UE24EC242B', name: 'Electromagnetic Field Theory', short: 'EMF Theory', type: 'core', hasLab: false, credits: 4 },
    { code: 'UE24MA241B', name: 'Linear Algebra and its Applications', short: 'Linear Algebra', type: 'core', hasLab: false, credits: 4 },
    { code: 'UE24EC221B', name: 'EIE - Level 2', short: 'EIE L2', type: 'audit', hasLab: false, credits: 2, note: 'Industry exposure course' },
  ],
  5: [
    { code: 'UE23EC351A', name: 'Computer Organisation and Design', short: 'COD', type: 'core', hasLab: true, credits: 5 },
    { code: 'UE23EC352A', name: 'Computer Communication Networks', short: 'CCN', type: 'core', hasLab: true, credits: 5 },
    { code: 'UE23EC341A', name: 'Digital Communication', short: 'Digital Comm', type: 'core', hasLab: false, credits: 4 },
    { code: 'UE23EC342AX', name: 'Elective I', short: 'Elective I', type: 'elective', hasLab: false, credits: 4 },
    { code: 'UE23EC343AX', name: 'Elective II', short: 'Elective II', type: 'elective', hasLab: false, credits: 4 },
    { code: 'UE23EC320A', name: 'Capstone Project Phase 0', short: 'Capstone 0', type: 'project', hasLab: true, credits: 2 },
  ],
  6: [
    { code: 'UE23EC351B', name: 'Waveguides and Antennas', short: 'Antennas', type: 'core', hasLab: true, credits: 5 },
    { code: 'UE23EC352B', name: 'Machine Learning and Applications', short: 'ML (ECE)', type: 'core', hasLab: true, credits: 5 },
    { code: 'UE23EC341B', name: 'Computer Architecture', short: 'Computer Arch', type: 'core', hasLab: false, credits: 4 },
    { code: 'UE23EC342BX', name: 'Elective III', short: 'Elective III', type: 'elective', hasLab: false, credits: 4 },
    { code: 'UE23EC343BX', name: 'Elective IV', short: 'Elective IV', type: 'elective', hasLab: false, credits: 4 },
    { code: 'UE23EC320B', name: 'Capstone Project Phase I', short: 'Capstone I', type: 'project', hasLab: true, credits: 2 },
  ],
  7: [
    { code: 'UE22EC441A', name: 'Special Topics I', short: 'Special Topic I', type: 'elective', hasLab: false, credits: 3 },
    { code: 'UE22EC441B', name: 'Special Topics II', short: 'Special Topic II', type: 'elective', hasLab: false, credits: 3 },
    { code: 'UE22EC421A', name: 'Capstone Project Phase II', short: 'Capstone II', type: 'project', hasLab: true, credits: 4 },
  ],
  8: [
    { code: 'UE22EC461XB', name: 'Internship', short: 'Internship', type: 'project', hasLab: false, credits: 6 },
    { code: 'UE22EC421B', name: 'Capstone Project Phase III', short: 'Capstone III', type: 'project', hasLab: true, credits: 4 },
  ],
}

const AIML_SUBJECTS: Record<number, SubjectDef[]> = {
  ...CSE_SUBJECTS,
  5: [
    { code: 'UE23CS352A-AIML', name: 'Deep Learning and Neural Networks', short: 'Deep Learning', type: 'core', hasLab: true, credits: 5 },
    { code: 'UE23CS351A', name: 'Database Management System', short: 'DBMS', type: 'core', hasLab: true, credits: 5 },
    { code: 'UE23CS341A', name: 'Software Engineering', short: 'SE', type: 'core', hasLab: false, credits: 4 },
    { code: 'UE23AI342AA1', name: 'Computer Vision', short: 'Computer Vision', type: 'elective', hasLab: false, credits: 4 },
    { code: 'UE23AI342AA2', name: 'Natural Language Processing', short: 'NLP', type: 'elective', hasLab: false, credits: 4 },
  ],
  6: [
    { code: 'UE23AI351B', name: 'Reinforcement Learning', short: 'RL', type: 'core', hasLab: true, credits: 5 },
    { code: 'UE23AI352B', name: 'AI Ethics and Responsible AI', short: 'AI Ethics', type: 'core', hasLab: false, credits: 4 },
    { code: 'UE23CS341B', name: 'Compiler Design', short: 'Compiler Design', type: 'core', hasLab: false, credits: 4 },
    { code: 'UE23AI342BA4', name: 'Generative AI and its Applications', short: 'Generative AI', type: 'elective', hasLab: false, credits: 4 },
    { code: 'UE23CS343BB2', name: 'Topics in Deep Learning', short: 'Deep Learning+', type: 'elective', hasLab: false, credits: 4 },
  ],
}

const BPHARM_SUBJECTS: Record<number, SubjectDef[]> = {
  1: [
    { code: 'BP101T', name: 'Human Anatomy and Physiology I', short: 'HAP I', type: 'core', hasLab: true, credits: 5 },
    { code: 'BP102T', name: 'Pharmaceutical Analysis I', short: 'Pharma Analysis I', type: 'core', hasLab: true, credits: 4 },
    { code: 'BP103T', name: 'Pharmaceutics I', short: 'Pharmaceutics I', type: 'core', hasLab: false, credits: 4 },
    { code: 'BP104T', name: 'Pharmaceutical Inorganic Chemistry', short: 'Inorganic Chem', type: 'core', hasLab: true, credits: 4 },
    { code: 'BP105T', name: 'Communication Skills', short: 'Communication', type: 'audit', hasLab: false, credits: 2 },
  ],
  2: [
    { code: 'BP201T', name: 'Human Anatomy and Physiology II', short: 'HAP II', type: 'core', hasLab: true, credits: 5 },
    { code: 'BP202T', name: 'Pharmaceutical Organic Chemistry I', short: 'Organic Chem I', type: 'core', hasLab: true, credits: 4 },
    { code: 'BP203T', name: 'Biochemistry', short: 'Biochemistry', type: 'core', hasLab: true, credits: 4 },
    { code: 'BP204T', name: 'Pathophysiology', short: 'Pathophysiology', type: 'core', hasLab: false, credits: 4 },
  ],
  3: [
    { code: 'BP301T', name: 'Pharmaceutical Organic Chemistry II', short: 'Organic Chem II', type: 'core', hasLab: true, credits: 4 },
    { code: 'BP302T', name: 'Physical Pharmaceutics I', short: 'Physical Pharm I', type: 'core', hasLab: true, credits: 4 },
    { code: 'BP303T', name: 'Pharmaceutical Microbiology', short: 'Pharma Microbio', type: 'core', hasLab: true, credits: 4 },
    { code: 'BP304T', name: 'Pharmaceutical Engineering', short: 'Pharma Engineering', type: 'core', hasLab: false, credits: 4 },
  ],
  4: [
    { code: 'BP401T', name: 'Medicinal Chemistry I', short: 'Medicinal Chem I', type: 'core', hasLab: true, credits: 4 },
    { code: 'BP402T', name: 'Pharmacology I', short: 'Pharmacology I', type: 'core', hasLab: true, credits: 4 },
    { code: 'BP403T', name: 'Pharmacognosy I', short: 'Pharmacognosy I', type: 'core', hasLab: true, credits: 4 },
    { code: 'BP404T', name: 'Physical Pharmaceutics II', short: 'Physical Pharm II', type: 'core', hasLab: true, credits: 4 },
    { code: 'BP405T', name: 'Pharmaceutical Jurisprudence', short: 'Jurisprudence', type: 'audit', hasLab: false, credits: 2 },
  ],
  5: [
    { code: 'BP501T', name: 'Medicinal Chemistry II', short: 'Medicinal Chem II', type: 'core', hasLab: true, credits: 4 },
    { code: 'BP502T', name: 'Industrial Pharmacy I', short: 'Industrial Pharm I', type: 'core', hasLab: true, credits: 4 },
    { code: 'BP503T', name: 'Pharmacology II', short: 'Pharmacology II', type: 'core', hasLab: true, credits: 4 },
    { code: 'BP504T', name: 'Pharmacognosy II', short: 'Pharmacognosy II', type: 'core', hasLab: true, credits: 4 },
  ],
  6: [
    { code: 'BP601T', name: 'Medicinal Chemistry III', short: 'Medicinal Chem III', type: 'core', hasLab: true, credits: 4 },
    { code: 'BP602T', name: 'Pharmacology III', short: 'Pharmacology III', type: 'core', hasLab: true, credits: 4 },
    { code: 'BP603T', name: 'Herbal Drug Technology', short: 'Herbal Tech', type: 'core', hasLab: true, credits: 4 },
    { code: 'BP604T', name: 'Biopharmaceutics and Pharmacokinetics', short: 'Biopharmaceutics', type: 'core', hasLab: false, credits: 4 },
  ],
  7: [
    { code: 'BP701T', name: 'Instrumental Methods of Analysis', short: 'Instrumental Analysis', type: 'core', hasLab: true, credits: 4 },
    { code: 'BP702T', name: 'Industrial Pharmacy II', short: 'Industrial Pharm II', type: 'core', hasLab: true, credits: 4 },
    { code: 'BP703T', name: 'Pharmacy Practice', short: 'Pharmacy Practice', type: 'core', hasLab: false, credits: 4 },
    { code: 'BP704T', name: 'Novel Drug Delivery System', short: 'NDDS', type: 'elective', hasLab: false, credits: 4 },
  ],
  8: [
    { code: 'BP801T', name: 'Biostatistics and Research Methodology', short: 'Biostatistics', type: 'core', hasLab: false, credits: 4 },
    { code: 'BP802T', name: 'Social and Preventive Pharmacy', short: 'Preventive Pharmacy', type: 'core', hasLab: false, credits: 4 },
    { code: 'BP803PW', name: 'Project Work', short: 'Project', type: 'project', hasLab: true, credits: 6 },
  ],
}

const PESU_SUBJECTS: Record<BranchKey, Record<number, SubjectDef[]>> = {
  CSE: CSE_SUBJECTS,
  AIML: AIML_SUBJECTS,
  ECE: ECE_SUBJECTS,
  EEE: CSE_SUBJECTS,
  ME: CSE_SUBJECTS,
  BIOTECH: CSE_SUBJECTS,
  BPHARM: BPHARM_SUBJECTS,
}

const BRANCH_OPTIONS_BASE: Array<{ label: string; key: BranchKey }> = [
  { label: 'CSE', key: 'CSE' },
  { label: 'CSE-AIML', key: 'AIML' },
  { label: 'ECE', key: 'ECE' },
  { label: 'EEE', key: 'EEE' },
  { label: 'ME', key: 'ME' },
  { label: 'Biotech', key: 'BIOTECH' },
  { label: 'B.Pharm', key: 'BPHARM' },
]

const BRANCH_LABELS: Record<BranchKey, string> = {
  CSE: 'CSE',
  AIML: 'CSE-AIML',
  ECE: 'ECE',
  EEE: 'EEE',
  ME: 'ME',
  BIOTECH: 'Biotech',
  BPHARM: 'B.Pharm',
}

const EXAM_FILTERS = ['ALL', 'ISA1', 'ISA2', 'ESA']
const PYQ_EXAM_FILTERS = ['ALL', 'ISA1', 'ISA2', 'ESA', 'LAB']
const SMARTNOTES_EXAM_FILTERS = [
  { label: 'ISA-1', value: 'ISA1' },
  { label: 'ISA-2', value: 'ISA2' },
]

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.max(1, Math.floor(diffMs / 60000))
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const LazySectionLoader = () => (
  <div className="rounded-xl border border-[#2a2a2a] bg-[#151515] px-4 py-5 text-sm text-[#cad2e1]">Loading section...</div>
)

function downloadFile(url: string, filename: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function getBranchKey(branch: string): BranchKey {
  const b = branch.toLowerCase()
  if (b.includes('b.pharm') || b.includes('bpharm') || b.includes('pharm')) return 'BPHARM'
  if (b.includes('biotech') || b.includes('biotechnology')) return 'BIOTECH'
  if (b.includes('aiml') || b.includes('ai & ml') || b.includes('ai and ml')) return 'AIML'
  if (b.includes('ece') || b.includes('electronics')) return 'ECE'
  if (b.includes('cse') || b.includes('computer science')) return 'CSE'
  return 'CSE'
}

function inferSemester(profile: ReturnType<typeof useAuthStore.getState>['profile']): number {
  if (profile?.semester && profile.semester >= 1 && profile.semester <= 12) {
    return profile.semester
  }

  const branchText = (profile?.branch ?? profile?.course ?? '').toLowerCase()
  const semMatch = branchText.match(/sem(?:ester)?\s*[-:]?\s*(\d{1,2})/i)
  if (semMatch) {
    const parsed = Number(semMatch[1])
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 12) {
      return parsed
    }
  }

  const rollNo = (profile?.roll_no ?? '').toUpperCase().trim()
  const yearMatch = rollNo.match(/(?:PES\d+UG|PESU?)(\d{2})/)
  if (yearMatch) {
    const joinYear = 2000 + Number(yearMatch[1])
    const now = new Date()
    const academicYear = now.getFullYear() - joinYear
    const guessed = (now.getMonth() >= 6 ? academicYear * 2 + 1 : academicYear * 2)
    return Math.max(1, Math.min(8, guessed || 1))
  }

  return 1
}

export default function StudyPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { profile } = useAuthStore()
  const { toast } = useToast()
  const params = useParams<{ subject?: string; contentType?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const studentSemester = inferSemester(profile)
  const studentDegree = profile?.degree || 'B.Tech'
  const studentBranch = profile?.branch || ''
  const studentCampus = profile?.campus || ''

  const branchSource = profile?.branch || profile?.course || profile?.degree || 'CSE'
  const branchKey = getBranchKey(branchSource)
  const [selectedBranch, setSelectedBranch] = useState<BranchKey>(branchKey)

  // Initialise semester from: 1) last saved preference, 2) profile semester, 3) fallback 1
  const [selectedSemester, setSelectedSemester] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('study_selected_semester')
      if (saved) {
        const parsed = Number(saved)
        if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 8) return parsed
      }
    } catch { /* localStorage unavailable */ }
    return Math.min(8, Math.max(1, Number(studentSemester) || 1))
  })
  const [filtersCustomized, setFiltersCustomized] = useState(false)

  const branchOptions = useMemo(() => {
    const options = [...BRANCH_OPTIONS_BASE]
    const preferredLabel = (studentBranch || '').trim() || BRANCH_LABELS[branchKey]
    const idx = options.findIndex(item => item.key === branchKey)

    if (idx >= 0) {
      options[idx] = { ...options[idx], label: preferredLabel }
      const [preferred] = options.splice(idx, 1)
      options.unshift(preferred)
      return options
    }

    return [{ label: preferredLabel, key: branchKey }, ...options]
  }, [studentBranch, branchKey])

  useEffect(() => {
    if (filtersCustomized) return
    setSelectedBranch(branchKey)
    // Only sync from profile if there's no saved preference
    const hasSaved = (() => {
      try { return Boolean(localStorage.getItem('study_selected_semester')) } catch { return false }
    })()
    if (!hasSaved) {
      setSelectedSemester(Math.min(8, Math.max(1, Number(studentSemester) || 1)))
    }
  }, [branchKey, studentSemester, filtersCustomized])

  const subjectList = PESU_SUBJECTS[selectedBranch] || PESU_SUBJECTS.CSE
  const allSubjects = useMemo(() => Object.values(subjectList).flat(), [subjectList])

  const subjectSlug = params.subject ?? ''
  const contentType = params.contentType as ContentType | undefined

  const [uploadOpen, setUploadOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [showOtherBranches, setShowOtherBranches] = useState(false)
  const [trendTopics, setTrendTopics] = useState<string[]>([])
  const [showAIChat, setShowAIChat] = useState(false)
  const [deletingPyqId, setDeletingPyqId] = useState<string | null>(null)
  const [deletingMaterialId, setDeletingMaterialId] = useState<string | null>(null)

  const canDeletePyq = profile?.role === 'admin' || profile?.role === 'moderator'

  const examType = searchParams.get('exam_type') ?? 'ALL'
  const summaryExam = searchParams.get('summary_exam_type') ?? 'ISA1'

  const setParam = (key: string, value?: string) => {
    const next = new URLSearchParams(searchParams)
    if (value && value.trim().length > 0) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  const currentSubjectDef = useMemo(() => {
    const byShort = allSubjects.find((s) => slugify(s.short) === subjectSlug)
    if (byShort) return byShort
    return allSubjects.find((s) => slugify(s.name) === subjectSlug)
  }, [allSubjects, subjectSlug])

  const currentSubjectName = currentSubjectDef?.name ?? decodeURIComponent(subjectSlug || '')

  const subjectsQuery = useQuery({
    queryKey: ['study-subjects', examType],
    queryFn: async () => {
      const query = new URLSearchParams()
      if (examType !== 'ALL') query.set('exam_type', examType)
      return apiFetch<SubjectsResponse>(`/api/study-materials/subjects${query.toString() ? `?${query.toString()}` : ''}`)
    },
    staleTime: 5 * 60 * 1000,
  })

  const materialsQuery = useQuery({
    queryKey: ['study-materials-list', currentSubjectName, contentType, examType],
    queryFn: async () => {
      const query = new URLSearchParams()
      query.set('subject', currentSubjectName)
      if (contentType === 'slides') query.set('material_type', 'slides')
      if (contentType === 'notes') query.set('material_type', 'all')
      if (examType !== 'ALL') query.set('exam_type', examType)
      return apiFetch<MaterialsResponse>(`/api/study-materials/list?${query.toString()}`)
    },
    enabled: !!currentSubjectName,
    staleTime: 5 * 60 * 1000,
  })

  const summaryQuery = useQuery({
    queryKey: ['study-summary', currentSubjectName, summaryExam],
    queryFn: async () => {
      const query = new URLSearchParams()
      query.set('subject', currentSubjectName)
      if (summaryExam !== 'ALL') query.set('exam_type', summaryExam)
      return apiFetch<SummaryResponse>(`/api/study-materials/summary?${query.toString()}`)
    },
    enabled: !!currentSubjectName,
    staleTime: 5 * 60 * 1000,
  })

  const analyticsTagsQuery = useQuery({
    queryKey: ['study-analytics-tags', currentSubjectName, examType],
    queryFn: async () => {
      const query = new URLSearchParams()
      query.set('subject', currentSubjectName)
      if (examType !== 'ALL') query.set('exam_type', examType)
      return apiFetch<{ tags: TagFrequency[]; cached?: boolean }>(`/api/analytics/tags?${query.toString()}`)
    },
    enabled: !!currentSubjectName && contentType === 'analytics',
    staleTime: 5 * 60 * 1000,
  })

  const trendsQuery = useQuery({
    queryKey: ['study-analytics-trends', currentSubjectName, trendTopics],
    queryFn: async () => {
      const query = new URLSearchParams()
      query.set('subject', currentSubjectName)
      for (const topic of trendTopics) query.append('tags', topic)
      return apiFetch<TrendsResponse>(`/api/analytics/trends?${query.toString()}`)
    },
    enabled: !!currentSubjectName && contentType === 'analytics',
    staleTime: 5 * 60 * 1000,
  })

  const driveQuery = useQuery({
    queryKey: ['study-drive-link', currentSubjectName],
    queryFn: async () => apiFetch<DriveResponse>(`/api/resources/drive?subject=${encodeURIComponent(currentSubjectName)}`),
    enabled: !!currentSubjectName,
    staleTime: 5 * 60 * 1000,
  })

  const availabilityMap = useMemo(() => {
    const map = new Map<string, SubjectAvailability>()
    for (const row of subjectsQuery.data?.subjects ?? []) map.set(row.subject.toLowerCase(), row)
    return map
  }, [subjectsQuery.data?.subjects])

  const getAvailability = (subject: SubjectDef): SubjectAvailability | undefined => {
    const exact = availabilityMap.get(subject.name.toLowerCase())
    if (exact) return exact
    const shortLower = subject.short.toLowerCase()
    return (subjectsQuery.data?.subjects ?? []).find((item) => {
      const nameLower = item.subject.toLowerCase()
      return nameLower.includes(shortLower) || shortLower.includes(nameLower)
    })
  }

  const semesterSubjects = subjectList[selectedSemester] || []
  const searchedSubjects = allSubjects.filter((s) => {
    const q = searchText.trim().toLowerCase()
    if (!q) return false
    return s.name.toLowerCase().includes(q) || s.short.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
  })
  const displaySubjects = searchText.trim() ? searchedSubjects : semesterSubjects
  const regularSubjects = displaySubjects.filter((s) => s.type !== 'audit')
  const auditSubjects = displaySubjects.filter((s) => s.type === 'audit')

  const summary = summaryQuery.data?.summary

  const currentAvailability = currentSubjectDef ? getAvailability(currentSubjectDef) : undefined
  const topTopic = analyticsTagsQuery.data?.tags?.[0]?.name
  const driveUrl = driveQuery.data?.drive_url
  const analyticsTagsError = queryErrorMessage(analyticsTagsQuery.error, 'Failed to load topic frequency data.')
  const trendsError = queryErrorMessage(trendsQuery.error, 'Failed to load trend comparison data.')

  const aiCandidateQuestions = [
    ...(summary?.mcq_1mark ?? []),
    ...(summary?.mcq_2mark ?? []),
    ...(summary?.theory_questions ?? []),
  ]

  const aiPracticeQuestions = [
    ...aiCandidateQuestions,
  ]
    .map((item) => {
      const itemRecord = item as Record<string, unknown>
      const question = String(itemRecord.question || '').replace(/\s+/g, ' ').trim()
      const options = Array.isArray(itemRecord.options)
        ? itemRecord.options.map((option) => String(option || '').trim()).filter(Boolean)
        : []
      const answer = typeof itemRecord.answer === 'string'
        ? formatAnswerHint(itemRecord.answer, options)
        : ''
      const topicRaw = typeof itemRecord.topic === 'string' ? itemRecord.topic : ''
      const topic = normalizeTopicLabel(topicRaw)

      return {
        question,
        answer,
        topic: isWeakTopicLabel(topic) ? '' : topic,
      }
    })
    .filter((item) => !isWeakPracticeQuestion(item.question))
    .slice(0, 8)

  const fallbackPracticeQuestions = (analyticsTagsQuery.data?.tags ?? []).slice(0, 6).map((tag, idx) => ({
    question: `Explain the exam-focused approach for ${tag.name} and solve one ${examType === 'ALL' ? 'recent' : examType} PYQ-style question.`,
    answer: 'Start with definitions, apply the standard solving pattern, and validate against common PYQ mistakes.',
    topic: normalizeTopicLabel(tag.name),
    id: `fallback-${idx}-${tag.id}`,
  })).filter((item) => !isWeakTopicLabel(item.topic))

  const practiceQuestions = aiPracticeQuestions.length > 0
    ? aiPracticeQuestions.map((item, idx) => ({ ...item, id: `ai-${idx}-${item.question}` }))
    : fallbackPracticeQuestions

  const handleTagClick = (name: string) => {
    setTrendTopics((prev) => {
      if (prev.includes(name)) return prev.filter((t) => t !== name)
      if (prev.length >= 5) return prev
      return [...prev, name]
    })
  }

  const deletePyqMutation = useMutation({
    mutationFn: ({ pyqId, reason }: { pyqId: string; reason?: string }) =>
      apiFetch<{ success: boolean }>(`/api/admin/pyqs/${pyqId}`, {
        method: 'DELETE',
        body: JSON.stringify(reason ? { reason } : {}),
      }),
    onSuccess: async () => {
      toast({ variant: 'success', title: 'PYQ deleted' })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pyqs'] }),
        queryClient.invalidateQueries({ queryKey: ['study-subjects'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] }),
      ])
    },
    onError: (error) => {
      toast({
        variant: 'error',
        title: 'Failed to delete PYQ',
        description: error instanceof Error ? error.message : 'Something went wrong',
      })
    },
  })

  const deleteMaterialMutation = useMutation({
    mutationFn: ({ materialId, reason }: { materialId: string; reason?: string }) =>
      apiFetch<{ ok: boolean; success: boolean; deletedSmartNotesCount?: number }>(`/api/admin/study-materials/${materialId}`, {
        method: 'DELETE',
        body: JSON.stringify(reason ? { reason } : {}),
      }),
    onSuccess: async () => {
      toast({ variant: 'success', title: 'Study material deleted' })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['study-materials-list'] }),
        queryClient.invalidateQueries({ queryKey: ['study-subjects'] }),
        queryClient.invalidateQueries({ queryKey: ['unit-smart-notes'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] }),
      ])
    },
    onError: (error) => {
      toast({
        variant: 'error',
        title: 'Failed to delete study material',
        description: error instanceof Error ? error.message : 'Something went wrong',
      })
    },
  })

  const handleAdminDeleteFromStudyFeed = (pyqId: string) => {
    if (deletePyqMutation.isPending) return

    if (!window.confirm('Permanently delete this PYQ? This action cannot be undone.')) {
      return
    }

    const reasonInput = window.prompt('Optional reason for audit log (leave blank to skip):', '')
    const reason = reasonInput?.trim() || undefined

    setDeletingPyqId(pyqId)
    deletePyqMutation.mutate(
      { pyqId, reason },
      {
        onSettled: () => setDeletingPyqId(null),
      }
    )
  }

  const handleAdminDeleteStudyMaterial = (materialId: string, materialTitle: string) => {
    if (deleteMaterialMutation.isPending) return

    if (!window.confirm(`Permanently delete "${materialTitle}"? This will remove the uploaded file and linked smart notes.`)) {
      return
    }

    const reasonInput = window.prompt('Optional reason for audit log (leave blank to skip):', '')
    const reason = reasonInput?.trim() || undefined

    setDeletingMaterialId(materialId)
    deleteMaterialMutation.mutate(
      { materialId, reason },
      {
        onSettled: () => setDeletingMaterialId(null),
      }
    )
  }

  if (!subjectSlug) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#0f0f0f] px-4 py-6 pb-[calc(8.5rem+env(safe-area-inset-bottom,0px))] text-white md:px-6 md:pb-8">
        <div className="mx-auto max-w-6xl space-y-5">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">📚 Study</h1>
            <p className="mt-1 text-sm text-[#cbd5e1]">Sem {studentSemester} · {studentBranch || studentDegree} · {studentCampus || 'PESU'}</p>
          </div>

          <section className="rounded-3xl border border-[#2a2a2a] bg-[linear-gradient(180deg,#171717_0%,#131313_100%)] p-4 shadow-[0_24px_55px_-48px_rgba(0,0,0,0.95)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6366f1]">Semester</div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2b2f43] bg-[#171b2f] px-2.5 py-1 text-[11px] font-semibold text-[#c7d2fe]">
                <span>{BRANCH_LABELS[selectedBranch]}</span>
                <span className="text-[#94a3b8]">•</span>
                <span>Sem {selectedSemester}</span>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {Array.from({ length: 8 }).map((_, i) => {
                const sem = i + 1
                const isSelected = sem === selectedSemester
                const isProfileSem = Boolean(profile) && sem === studentSemester && !isSelected
                return (
                  <button
                    key={sem}
                    onClick={() => {
                      setFiltersCustomized(true)
                      setSelectedSemester(sem)
                      try { localStorage.setItem('study_selected_semester', String(sem)) } catch { /* */ }
                    }}
                    className={[
                      'h-11 w-11 shrink-0 rounded-full border text-sm font-bold transition-all',
                      isSelected
                        ? 'border-transparent bg-[#6366f1] text-white shadow-[0_0_0_3px_rgba(99,102,241,0.3)]'
                        : isProfileSem
                          ? 'border-[#6366f1]/50 bg-[#23263a] text-[#a5b4fc]'
                          : 'border-[#2a2a2a] bg-[#1a1a1a] text-[#7f8798] hover:border-[#3a3a3a] hover:text-white'
                    ].join(' ')}
                  >
                    {sem}
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {EXAM_FILTERS.map((item) => (
                <button
                  key={item}
                  onClick={() => setParam('exam_type', item === 'ALL' ? undefined : item)}
                  className={[
                    'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                    examType === item || (item === 'ALL' && examType === 'ALL')
                      ? 'border-[#6366f1] bg-[#2a2f46] text-white'
                      : 'border-[#2a2a2a] bg-[#141414] text-[#a3adc2] hover:border-[#3a3a3a] hover:text-[#e5e7eb]'
                  ].join(' ')}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa5bf]" />
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search subject e.g. Computer Networks..."
                  className="h-12 rounded-xl border-[#2a2a2a] bg-[#121329] pl-10 text-[#eef2ff] placeholder:text-[#9aa5bf]"
                />
              </div>
              {searchText && (
                <Button variant="outline" onClick={() => setSearchText('')} className="h-12 border-[#2a2a2a] bg-[#111111] text-white hover:bg-[#181818]">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7f8cff]">Your Semester {selectedSemester} Subjects</p>
              <span className="rounded-full border border-[#2a2a2a] bg-[#151515] px-2.5 py-1 text-[11px] text-[#cbd5e1]">{regularSubjects.length + auditSubjects.length} subjects</span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {regularSubjects.map((subject) => {
                const availability = getAvailability(subject)
                const hasAny = !!availability && (availability.pyq_count > 0 || availability.has_notes || availability.has_slides || availability.has_summary)
                const popular = (availability?.pyq_count ?? 0) >= 5
                return (
                  <button
                    key={subject.code}
                    onClick={() => navigate(`/study/${slugify(subject.short)}`)}
                    className={[
                      'relative rounded-3xl border border-[#2a2a2a] bg-[linear-gradient(180deg,#1a1a1a_0%,#171717_100%)] p-5 text-left transition-all hover:border-[#6366f1] hover:-translate-y-[1px]',
                      availability?.has_summary ? 'shadow-[0_0_24px_-12px_rgba(139,92,246,0.85)]' : ''
                    ].join(' ')}
                  >
                    {availability?.has_summary && <span className="absolute right-4 top-4">✨</span>}
                    {popular && <span className="absolute right-4 top-10 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300">⭐ Popular</span>}

                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-xl font-bold text-[#f8fafc]">{subject.type === 'project' ? '🎓 ' : ''}{subject.short}</h3>
                      <span className={[
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        subject.type === 'core'
                          ? 'bg-indigo-500/25 text-[#dbe5ff]'
                          : subject.type === 'elective'
                            ? 'bg-amber-500/25 text-[#ffe8b4]'
                            : subject.type === 'project'
                              ? 'bg-teal-500/25 text-[#cbfff3]'
                              : 'bg-gray-500/25 text-[#e6ebf5]'
                      ].join(' ')}>{subject.type === 'core' ? 'Core' : subject.type === 'elective' ? 'Elective' : subject.type === 'project' ? 'Project' : 'Audit'}</span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-[#eef2ff]">{subject.credits} CR</span>
                      {subject.hasLab && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-[#eef2ff]">🔬 Has Lab</span>}
                    </div>

                    <p className="text-[15px] text-[#f8fafc]">{subject.name}</p>
                    <p className="mt-1 text-xs text-[#d7deed]">{subject.code}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {(availability?.pyq_count ?? 0) > 0 && <span className="rounded-full bg-indigo-500/20 px-2.5 py-1 text-xs text-indigo-200">📄 {availability?.pyq_count} PYQs</span>}
                      {availability?.has_notes && <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs text-emerald-200">📝 Notes</span>}
                      {availability?.has_slides && <span className="rounded-full bg-blue-500/20 px-2.5 py-1 text-xs text-blue-200">🖥️ Slides</span>}
                      {availability?.has_summary && <span className="rounded-full bg-violet-500/20 px-2.5 py-1 text-xs text-violet-200">🧠 SmartNotes</span>}
                      {!hasAny && <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs text-[#e2e8f5]">📭 No content yet</span>}
                    </div>

                    {!hasAny && <p className="mt-3 text-xs text-[#e2e8f5]">Be the first to upload!</p>}

                    <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-200">
                      Open subject <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </button>
                )
              })}
            </div>

            {auditSubjects.length > 0 && (
              <>
                <div className="my-4 border-t border-[#2a2a2a] pt-3 text-xs uppercase tracking-[0.18em] text-[#98a3bc]">2-Credit Courses</div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {auditSubjects.map((subject) => {
                    const availability = getAvailability(subject)
                    return (
                      <button
                        key={subject.code}
                        onClick={() => navigate(`/study/${slugify(subject.short)}`)}
                        className="rounded-3xl border border-dashed border-[#4b5563] bg-[linear-gradient(180deg,#1a1a1a_0%,#161616_100%)] p-5 text-left transition-all hover:border-[#6366f1]"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <h3 className="text-xl font-bold text-[#f8fafc]">{subject.short}</h3>
                          <span className="rounded-full bg-gray-500/20 px-2 py-0.5 text-[10px] font-semibold text-gray-200">2 Credits</span>
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-[#eef2ff]">{subject.credits} CR</span>
                        </div>
                        <p className="text-[15px] text-[#f8fafc]">{subject.name}</p>
                        {subject.note && <p className="mt-2 text-xs text-[#d7deed]">{subject.note}</p>}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(availability?.pyq_count ?? 0) > 0 && <span className="rounded-full bg-indigo-500/20 px-2.5 py-1 text-xs text-indigo-200">📄 {availability?.pyq_count} PYQs</span>}
                          {availability?.has_summary && <span className="rounded-full bg-violet-500/20 px-2.5 py-1 text-xs text-violet-200">🧠 SmartNotes</span>}
                        </div>
                        <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-200">
                          Open course <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </section>

          <section className="rounded-3xl border border-[#2a2a2a] bg-[linear-gradient(180deg,#171717_0%,#141414_100%)] p-4">
            <button onClick={() => setShowOtherBranches((v) => !v)} className="inline-flex items-center gap-1 text-sm font-semibold text-[#d3dbeb] hover:text-white">
              Browse other branches <ChevronRight className={['h-4 w-4 transition-transform', showOtherBranches ? 'rotate-90' : 'rotate-0'].join(' ')} />
            </button>
            {showOtherBranches && (
              <div className="mt-3 flex flex-wrap gap-2">
                {branchOptions.map((branch) => (
                  <button
                    key={branch.key}
                    onClick={() => {
                      setFiltersCustomized(true)
                      setSelectedBranch(branch.key)
                      setSelectedSemester(1)
                      try { localStorage.setItem('study_selected_semester', '1') } catch { /* */ }
                    }}
                    className={[
                      'rounded-full border px-3 py-1 text-xs transition-colors',
                      selectedBranch === branch.key
                        ? 'border-[#6366f1] bg-[#262c47] text-white'
                        : 'border-[#2a2a2a] bg-[#111111] text-[#c0c8d8] hover:border-[#3a3a3a] hover:text-white'
                    ].join(' ')}
                  >
                    {branch.label}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

      </div>
    )
  }

  const subjectForTitle = currentSubjectDef?.short || currentSubjectName

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0f0f0f] px-4 py-6 pb-[calc(8.5rem+env(safe-area-inset-bottom,0px))] text-white md:px-6 md:pb-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="rounded-2xl border border-[#2a2a2a] bg-[linear-gradient(180deg,#171717_0%,#141414_100%)] p-5">
          <div className="mb-2">
            <DetailBackButton fallbackTo="/study" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#f8fafc]">{subjectForTitle}</h1>
          {!contentType && driveUrl && (
            <a
              href={driveUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #1a73e8, #0d62d1)',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '15px',
                textDecoration: 'none',
                marginTop: '12px',
              }}
            >
              📁 Open Study Materials
            </a>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAM_FILTERS.map((item) => (
              <button
                key={item}
                onClick={() => setParam('exam_type', item === 'ALL' ? undefined : item)}
                className={[
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  examType === item || (item === 'ALL' && examType === 'ALL')
                    ? 'border-[#6366f1] bg-[#2a2f46] text-white'
                    : 'border-[#2a2a2a] bg-[#111111] text-[#b6bfd0] hover:border-[#3a3a3a] hover:text-white'
                ].join(' ')}
              >
                {item}
              </button>
            ))}
          </div>
        </header>

        {!contentType && (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <button onClick={() => navigate(`/study/${subjectSlug}/pyqs`)} className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-5 text-left transition-all hover:border-indigo-400/70">
              <p className="text-4xl">📄</p>
              <h3 className="mt-2 text-xl font-semibold">Previous Year Questions</h3>
              <p className="mt-1 text-sm text-[#d7deed]">{currentAvailability?.pyq_count ?? 0} papers</p>
              <p className="mt-3 text-sm text-indigo-200">Browse PYQs →</p>
            </button>

            <button onClick={() => navigate(`/study/${subjectSlug}/analytics`)} className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-left transition-all hover:border-amber-400/70">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/40 bg-[radial-gradient(circle_at_30%_30%,#fbbf24_0%,#f59e0b_50%,#b45309_100%)] shadow-[0_10px_24px_rgba(245,158,11,0.35)]">
                <Target className="h-6 w-6 text-[#1f1300]" strokeWidth={2.5} />
              </div>
              <h3 className="mt-2 text-xl font-semibold">Practice Questions</h3>
              <p className="mt-1 text-sm text-[#e8e0cf]">Smart exam predictions + practice MCQs</p>
              <p className="mt-1 text-xs text-[#d7ceb8]">{topTopic ? `Top topic: ${topTopic}` : `Based on ${currentAvailability?.pyq_count ?? 0} PYQs`}</p>
              <p className="mt-3 text-sm text-amber-200">Open Practice Questions →</p>
            </button>

            <button onClick={() => navigate(`/study/${subjectSlug}/unit-notes`)} className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-left transition-all hover:border-emerald-400/70">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/40 bg-[radial-gradient(circle_at_30%_30%,#6ee7b7_0%,#10b981_50%,#047857_100%)] shadow-[0_10px_24px_rgba(16,185,129,0.35)]">
                <Upload className="h-6 w-6 text-[#f0fdf4]" strokeWidth={2.5} />
              </div>
              <h3 className="mt-2 text-xl font-semibold">Smart Notes</h3>
              <p className="mt-1 text-sm text-[#c3e8d8]">Upload notes/slides → AI generates comprehensive study guides with MCQs, formulas & exam tips</p>
              <p className="mt-3 text-sm text-emerald-200">Open Smart Notes →</p>
            </button>
          </section>
        )}

        {contentType === 'pyqs' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">📄 {subjectForTitle} — Previous Year Questions</h2>
              <Button onClick={() => setUploadOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">+ Upload</Button>
            </div>

            <div className="flex flex-wrap gap-2 rounded-xl border border-[#2a2a2a] bg-[#151515] p-3">
              {PYQ_EXAM_FILTERS.map((item) => (
                <button
                  key={item}
                  onClick={() => setParam('exam_type', item === 'ALL' ? undefined : item)}
                  className={[
                    'rounded-full border px-2.5 py-1 text-xs',
                    examType === item || (item === 'ALL' && examType === 'ALL') ? 'border-indigo-500 bg-indigo-500/20 text-white' : 'border-[#2a2a2a] text-[#bcc5d6] hover:border-[#3a3a3a] hover:text-white'
                  ].join(' ')}
                >
                  {item}
                </button>
              ))}
            </div>

            <Suspense fallback={<LazySectionLoader />}>
              <PYQFeed
                filters={{ subject: currentSubjectName, ...(examType !== 'ALL' && { exam_type: examType }) }}
                canDeletePyq={canDeletePyq}
                onDeletePyq={handleAdminDeleteFromStudyFeed}
                deletingPyqId={deletingPyqId}
              />
            </Suspense>
          </section>
        )}

        {contentType === 'analytics' && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#151515] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Suspense fallback={<LazySectionLoader />}>
                  <AnalyticsFilters
                    filters={{ subject: currentSubjectName, exam_type: examType === 'ALL' ? '' : examType }}
                    onChange={(f) => {
                      if (f.subject && slugify(f.subject) !== subjectSlug) {
                        navigate(`/study/${slugify(f.subject)}/analytics`)
                      }
                      setParam('exam_type', f.exam_type || undefined)
                    }}
                  />
                </Suspense>
                <Suspense fallback={null}>
                  <PDFExportButton tags={analyticsTagsQuery.data?.tags ?? []} filters={{ subject: currentSubjectName, exam_type: examType === 'ALL' ? '' : examType }} />
                </Suspense>
              </div>
            </div>

            <div className="rounded-2xl border border-[#2a2a2a] bg-[#151515] p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-amber-300/40 bg-[radial-gradient(circle_at_30%_30%,#fbbf24_0%,#f59e0b_55%,#b45309_100%)]">
                  <Target className="h-4 w-4 text-[#1f1300]" strokeWidth={2.5} />
                </span>
                Practice Questions
              </h2>
              {analyticsTagsQuery.isError && (
                <div className="mt-3 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  {analyticsTagsError}
                </div>
              )}
              <Suspense fallback={<LazySectionLoader />}>
                <TopicFrequencyChart tags={analyticsTagsQuery.data?.tags ?? []} onTagClick={handleTagClick} selectedTags={trendTopics} />
              </Suspense>
            </div>

            <div className="rounded-2xl border border-[#2a2a2a] bg-[#151515] p-5">
              <h2 className="text-lg font-semibold">Trend Comparison</h2>
              {trendsQuery.isError && (
                <div className="mt-3 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  {trendsError}
                </div>
              )}
              <Suspense fallback={<LazySectionLoader />}>
                <TrendLineChart data={trendsQuery.data?.trends ?? []} topics={trendTopics} />
              </Suspense>
            </div>

            <div className="rounded-2xl border border-[#2a2a2a] bg-[#151515] p-5">
              <h2 className="text-lg font-semibold">Generated Practice Questions</h2>
              {practiceQuestions.length === 0 ? (
                <p className="mt-3 text-sm text-[#aeb8cb]">Practice questions are being generated from the latest PYQs. Refresh in a few moments.</p>
              ) : (
                <ul className="mt-3 space-y-3 text-sm text-[#dde4f1]">
                  {practiceQuestions.map((item, idx) => (
                    <li key={item.id} className="rounded-xl border border-[#252525] bg-[#101010] px-3 py-2">
                      <p className="font-medium">Q{idx + 1}. {item.question}</p>
                      {item.topic && <p className="mt-1 text-xs text-[#9aa7bd]">Topic: {item.topic}</p>}
                      {item.answer && <p className="mt-1 text-xs text-[#a8ffc5]">Answer hint: {item.answer}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {contentType === 'summary' && (
          <section className="min-h-[calc(100vh-10rem)] space-y-5 pb-8">
            <div className="rounded-3xl border border-[#2a2a2a] bg-[#111111] p-5 md:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">
                    🧠 SmartNotes
                  </div>
                  <h2 className="text-3xl font-semibold tracking-tight text-[#f8fafc]">{subjectForTitle} Study Guide</h2>
                  <p className="max-w-2xl text-sm leading-6 text-[#b7c0d4]">
                    Choose ISA-1 or ISA-2 to open the chapter guide for Units 1-2 or Units 3-4 inside the app. The page stays focused on reading and revision.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SMARTNOTES_EXAM_FILTERS.map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setParam('summary_exam_type', item.value)}
                      className={[
                        'rounded-full border px-4 py-2 text-xs font-semibold transition-colors',
                        summaryExam === item.value ? 'border-violet-400 bg-violet-500/20 text-white' : 'border-[#2a2a2a] bg-[#151515] text-[#bcc5d6] hover:border-[#3a3a3a] hover:text-white'
                      ].join(' ')}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {!summary && (
              <div className="rounded-3xl border border-[#2a2a2a] bg-[#151515] p-10 text-center text-[#cad2e1]">
                AI-powered chapter summary is loading for this ISA.
              </div>
            )}

            {summary && (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.7fr)]">
                <article className="min-w-0 overflow-hidden space-y-5 rounded-2xl md:rounded-3xl border border-[#2a2a2a] bg-[#151515] p-4 sm:p-5 md:p-6">
                  <header className="space-y-2 border-b border-[#242424] pb-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-[#8e96ab]">{summary.exam_type} summary</p>
                    <p className="text-xs text-[#b8c0cf]">Based on: {(summary.based_on_years || []).join(', ') || 'available materials'}</p>
                    <p className="text-xs text-[#b8c0cf]">Last updated: {relativeTime(summary.generated_at)}</p>
                  </header>

                  <section className="space-y-3">
                    <h3 className="text-lg font-semibold text-white">Detailed Summary</h3>
                    <div className="prose prose-invert prose-sm md:prose-base max-w-none break-words text-[#e4e9f2] prose-headings:text-white prose-a:text-violet-400 prose-p:leading-relaxed prose-p:mb-4 md:prose-p:mb-5 prose-li:mb-2 prose-headings:mt-6 md:prose-headings:mt-8 prose-headings:mb-3 md:prose-headings:mb-4 [&_.katex-display]:my-4 md:[&_.katex-display]:my-6 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-2 prose-table:block prose-table:overflow-x-auto prose-table:whitespace-nowrap">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {summary.smart_summary}
                      </ReactMarkdown>
                    </div>
                  </section>

                  <section className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                      <h3 className="text-base font-semibold text-white">Must Know</h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {summary.high_probability_topics.map((item, idx) => <span key={`${item.topic}-${idx}`} className="rounded-full bg-black/25 px-3 py-1 text-xs text-[#f8fafc]">{item.topic}</span>)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                      <h3 className="text-base font-semibold text-white">Good to Know</h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {summary.medium_probability_topics.map((item, idx) => <span key={`${item.topic}-${idx}`} className="rounded-full bg-black/25 px-3 py-1 text-xs text-[#f8fafc]">{item.topic}</span>)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                      <h3 className="text-base font-semibold text-white">Skim Only</h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {summary.low_probability_topics.map((item, idx) => <span key={`${item.topic}-${idx}`} className="rounded-full bg-black/25 px-3 py-1 text-xs text-[#f8fafc]">{item.topic}</span>)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
                      <h3 className="text-base font-semibold text-white">Key Definitions</h3>
                      <ul className="mt-3 space-y-2 text-sm text-[#dbe2ee]">
                        {summary.key_definitions.slice(0, 8).map((k, idx) => <li key={`${k.term}-${idx}`}>{k.term}: {k.definition}</li>)}
                      </ul>
                    </div>
                  </section>
                </article>

                <aside className="space-y-4 rounded-3xl border border-[#2a2a2a] bg-[#111111] p-5 md:p-6 lg:sticky lg:top-4 lg:self-start">
                  <div>
                    <h3 className="text-base font-semibold text-white">Revision Mode</h3>
                    <p className="mt-2 text-sm leading-6 text-[#b7c0d4]">Stay inside the app and move through the guide section by section.</p>
                  </div>

                  <div className="rounded-2xl border border-[#242424] bg-[#151515] p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-[#8e96ab]">Focus</p>
                    <p className="mt-2 text-sm text-[#e4e9f2]">Revise the highlighted topics first, then skim the lower-priority items.</p>
                  </div>

                  <div className="rounded-2xl border border-[#242424] bg-[#151515] p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-[#8e96ab]">Plan</p>
                    <p className="mt-2 text-sm text-[#e4e9f2]">Use this SmartNotes view as your in-app study guide for the selected ISA.</p>
                  </div>

                  <button onClick={() => navigate(`/study/${subjectSlug}/pyqs`)} className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700">
                    Practice PYQs
                  </button>
                </aside>
              </div>
            )}
          </section>
        )}

        {contentType === 'unit-notes' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">📚 {subjectForTitle} — Smart Notes</h2>
              <Button onClick={() => setUploadOpen(true)} className="shrink-0 bg-emerald-600 hover:bg-emerald-700">
                + Upload Notes/Slides
              </Button>
            </div>
            
            <SmartNotesDisplay
              subject={currentSubjectName}
              course={profile?.course ?? profile?.degree ?? ''}
              examType={summaryExam as 'ISA1' | 'ISA2'}
              materialsCount={materialsQuery.data?.items?.length ?? 0}
            />

            {/* Uploaded Materials Section */}
            {materialsQuery.data?.items && materialsQuery.data.items.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">📁 Uploaded Materials</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {materialsQuery.data.items.map((item) => {
                    const url = item.signed_url || item.file_url || item.file_path || ''
                    const filename = item.file_name || `${item.title}.pdf`
                    return (
                      <article key={item.id} className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
                            {String(item.material_type || '').toLowerCase() === 'notes' ? '📝' : '🖥️'} {item.material_type}
                          </span>
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-[#d2d9e6]">{item.exam_type || 'ALL'}</span>
                          {item.processing_status && (
                            <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-200">
                              {item.processing_status}
                            </span>
                          )}
                          {item.extraction_method && (
                            <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-200">{item.extraction_method}</span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold">{item.title}</h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button onClick={() => window.open(url, '_blank')} className="rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs text-emerald-200">👁 View</button>
                          <button onClick={() => downloadFile(url, filename)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white">📥 Download</button>
                          {canDeletePyq && (
                            <button
                              onClick={() => handleAdminDeleteStudyMaterial(item.id, item.title)}
                              disabled={deleteMaterialMutation.isPending || deletingMaterialId === item.id}
                              className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-200 transition hover:bg-red-500/10 disabled:opacity-50"
                            >
                              {deletingMaterialId === item.id ? 'Deleting...' : 'Delete'}
                            </button>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      <UnifiedUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        initialCourse={profile?.course ?? profile?.degree ?? ''}
        initialSubject={currentSubjectName}
        lockSubject
        onSuccess={() => {
          subjectsQuery.refetch()
          materialsQuery.refetch()
        }}
      />

      {/* AI Chat floating action button (Requirement 17.7, 17.8) */}
      <button
        onClick={() => setShowAIChat((v) => !v)}
        aria-label="Toggle Athena AI"
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] right-4 z-50 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-cyan-200/40 bg-[linear-gradient(180deg,#0ea5e9_0%,#2563eb_100%)] text-white shadow-[0_12px_26px_rgba(2,132,199,0.5)] transition hover:brightness-110 active:scale-95 md:bottom-6 md:right-6"
      >
        <img src="/athena-ai-logo-v2.jpeg" alt="Athena" className="h-full w-full object-cover" />
      </button>

      {showAIChat && (
        <>
          {/* Backdrop on mobile */}
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setShowAIChat(false)}
          />
          {/* Panel — full-width bottom sheet on mobile, floating on desktop */}
          <div className="fixed bottom-0 left-0 right-0 z-50 p-0 md:bottom-24 md:right-6 md:left-auto md:w-96 md:p-0">
            <Suspense fallback={<LazySectionLoader />}>
              <AIChatPanel
                taskType="doubt_solving"
                context={currentSubjectName || undefined}
                onClose={() => setShowAIChat(false)}
              />
            </Suspense>
          </div>
        </>
      )}
    </div>
  )
}
