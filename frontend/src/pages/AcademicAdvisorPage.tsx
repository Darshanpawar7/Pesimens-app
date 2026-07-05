import { useState } from 'react'
import { GraduationCap, BookOpen, Target, Clock, ChevronRight } from 'lucide-react'
import { AIChatPanel } from '../components/ai/AIChatPanel'
import { DetailBackButton } from '../components/common/DetailBackButton'
import { useAuthStore } from '../store/auth'

const ADVISOR_CONTEXT = `You are an academic advisor for PES University students. 
Help students with: degree planning, course selection, prerequisite verification, 
semester planning, elective recommendations, CGPA optimization, career pathway advice, 
internship guidance, and graduation requirements. Be specific to PES University's 
BTech CSE/ECE/ME/Civil programs. Always ask clarifying questions about the student's 
branch, semester, and CGPA when relevant. Provide actionable, structured advice.`

const QUICK_PROMPTS = [
  {
    icon: BookOpen,
    label: 'Course Selection',
    prompt: 'Help me choose electives for next semester that align with my career goals in AI/ML',
  },
  {
    icon: Target,
    label: 'CGPA Planning',
    prompt: 'How can I improve my CGPA this semester? What strategies work best?',
  },
  {
    icon: GraduationCap,
    label: 'Degree Requirements',
    prompt: 'What are the graduation requirements for BTech CSE at PES University?',
  },
  {
    icon: Clock,
    label: 'Semester Plan',
    prompt: 'Help me create an optimal semester plan balancing academics and extracurriculars',
  },
]

export default function AcademicAdvisorPage() {
  const { profile } = useAuthStore()
  const [activePrompt, setActivePrompt] = useState<string | null>(null)
  const [chatStarted, setChatStarted] = useState(false)

  const handleQuickPrompt = (prompt: string) => {
    setActivePrompt(prompt)
    setChatStarted(true)
  }

  const handleStartChat = () => {
    setChatStarted(true)
  }

  if (chatStarted) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <AIChatPanel
          taskType="study_chat"
          context={ADVISOR_CONTEXT}
          onClose={() => setChatStarted(false)}
          mode="general"
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4">
        <DetailBackButton fallbackTo="/" />
      </div>

      {/* Header */}
      <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15">
            <GraduationCap className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Academic Advisor</h1>
            <p className="text-xs text-white/50">Powered by Athena AI</p>
          </div>
        </div>
        <p className="text-sm text-white/60">
          Get personalized guidance on course selection, degree planning, CGPA optimization,
          and career pathways tailored to PES University programs.
          {profile?.display_name && (
            <span className="text-indigo-300"> Ready to help you, {profile.display_name.split(' ')[0]}.</span>
          )}
        </p>
      </div>

      {/* Quick prompts */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">
          Quick Start
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {QUICK_PROMPTS.map(({ icon: Icon, label, prompt }) => (
            <button
              key={label}
              type="button"
              onClick={() => handleQuickPrompt(prompt)}
              className="flex items-center gap-3 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 text-left transition hover:border-indigo-500/40 hover:bg-[#1e1e2e] group"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
                <Icon className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="mt-0.5 text-xs text-white/45 line-clamp-1">{prompt}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-white/25 shrink-0 transition group-hover:text-white/60" />
            </button>
          ))}
        </div>
      </div>

      {/* Start chat button */}
      <button
        type="button"
        onClick={handleStartChat}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
      >
        Start Advising Session
      </button>

      {/* Info note */}
      <p className="mt-4 text-center text-xs text-white/30">
        Academic advice is AI-generated. Always verify with your faculty advisor for official decisions.
      </p>
    </div>
  )
}
