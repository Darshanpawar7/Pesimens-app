import { useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { AuthContext } from '@/context/auth-context'
import { apiFetch, ApiError } from '@/lib/api'
import {
  clearSignupAttribution,
  getSignupAttributionSource,
  getSignupAuthMethod,
  hasTrackedSignupCompleted,
  markSignupCompletedTracked,
} from '@/lib/signupAttribution'
import { OnboardingProgress, BasicInfoStep, AcademicDetailsStep, OptionalDetailsStep } from './onboarding'

type OnboardingStep = 1 | 2 | 3

interface OnboardingData {
  name?: string
  profilePicture?: string
  program?: string
  course?: string
  campus?: string
  semester?: number
  bio?: string
  instagram_url?: string
  linkedin_url?: string
}

export function OnboardingWizard() {
  const navigate = useNavigate()
  const authContext = useContext(AuthContext)
  const refreshProfile = authContext?.refreshProfile ?? (async () => undefined)
  const { user } = useAuthStore()
  const profile = useAuthStore(s => s.profile)
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1)

  const defaultName = useMemo(() => {
    if (profile?.display_name?.trim()) return profile.display_name.trim()
    const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>
    const preferred = [metadata.full_name, metadata.name, metadata.display_name]
      .find((value): value is string => typeof value === 'string' && value.trim().length > 0)
    return preferred?.trim() ?? ''
  }, [profile?.display_name, user?.user_metadata])

  const [data, setData] = useState<OnboardingData>({ name: defaultName })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!defaultName) return
    setData(prev => (prev.name ? prev : { ...prev, name: defaultName }))
  }, [defaultName])

  const updateData = (stepData: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...stepData }))
  }

  const toFriendlyOnboardingError = (err: unknown) => {
    if (err instanceof ApiError) {
      if (err.status === 401) return 'Session expired. Please login again.'
      if (err.status === 409) return 'Onboarding is already completed for this account.'
      if (err.status === 503) return 'Service temporarily unavailable. Please try again in a few moments.'
      if (err.status === 429) return 'Too many requests. Please wait a moment and try again.'
    }
    const message = err instanceof Error ? err.message : String(err)
    if (/GitHub|github|username/i.test(message) && (/timeout|temporarily|unavailable/i.test(message))) {
      return 'GitHub verification is temporarily unavailable. Please try again shortly or skip this step.'
    }
    if (/profiles_campus_check/i.test(message)) return 'Invalid campus value. Please pick EC Campus or RR Campus.'
    if (/violates check constraint/i.test(message)) return 'Some values do not match required format. Please re-check.'
    return message || 'Failed to complete onboarding. Please try again.'
  }

  const saveProgress = async (progressData: OnboardingData) => {
    if (!user) return
    // Skip intermediate saves for new users who don't have a profile row yet.
    // The profile is created atomically by completeOnboarding → POST /api/auth/onboard.
    // PATCH /api/profiles/me requires an existing profile row (uses authenticate middleware),
    // so calling it before onboarding completes causes a 401 for new Google OAuth users.
    if (!profile) return
    const patchable: Record<string, unknown> = {}
    if (progressData.name) patchable.display_name = progressData.name
    if (progressData.bio !== undefined) patchable.bio = progressData.bio
    if (progressData.instagram_url !== undefined) patchable.instagram_url = progressData.instagram_url
    if (progressData.linkedin_url !== undefined) patchable.linkedin_url = progressData.linkedin_url
    if (Object.keys(patchable).length === 0) return
    try {
      const result = await apiFetch<{ profile: unknown; warning?: string }>('/api/profiles/me', { method: 'PATCH', body: JSON.stringify(patchable) })
      // Show warning if present but don't fail
      if (result?.warning) {
        console.warn('Profile save warning:', result.warning)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save progress. Please try again.'
      setError(message)
      throw err
    }
  }

  const completeOnboarding = async (finalData: OnboardingData) => {
    if (!user) return
    try {
      await apiFetch('/api/auth/onboard', {
        method: 'POST',
        body: JSON.stringify({
          display_name: finalData.name,
          campus: finalData.campus,
          degree: finalData.program,
          branch: finalData.course,
          semester: finalData.semester,
          bio: finalData.bio,
        }),
      })
      if (finalData.instagram_url || finalData.linkedin_url) {
        const socialResult = await apiFetch<{ profile: unknown; warning?: string }>('/api/profiles/me', {
          method: 'PATCH',
          body: JSON.stringify({ instagram_url: finalData.instagram_url, linkedin_url: finalData.linkedin_url }),
        }).catch(() => undefined)
        // Log warning if present but don't fail
        if (socialResult?.warning) {
          console.warn('Profile save warning:', socialResult.warning)
        }
      }
      if (!hasTrackedSignupCompleted(user.id)) {
        await apiFetch('/api/analytics/events', {
          method: 'POST',
          body: JSON.stringify({
            event_name: 'signup_completed',
            properties: {
              source: getSignupAttributionSource() ?? 'unknown',
              method: getSignupAuthMethod() ?? 'unknown',
              onboarding_path: true,
            },
          }),
        }).catch(() => undefined)
        markSignupCompletedTracked(user.id)
      }
      clearSignupAttribution()
      await refreshProfile()
      navigate('/home')
    } catch (err: unknown) {
      setError(toFriendlyOnboardingError(err))
    }
  }

  const handleNext = async (stepData: Partial<OnboardingData>) => {
    setIsSubmitting(true)
    try {
      setError(null)
      updateData(stepData)
      const updatedData = { ...data, ...stepData }
      await saveProgress(updatedData)
      if (currentStep < 3) setCurrentStep((currentStep + 1) as OnboardingStep)
    } catch (err: unknown) {
      if (!error) setError(err instanceof Error ? err.message : 'An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((currentStep - 1) as OnboardingStep)
  }

  const handleSkip = async () => {
    setIsSubmitting(true)
    setError(null)
    await completeOnboarding(data)
    setIsSubmitting(false)
  }

  const handleComplete = async (finalData: Partial<OnboardingData>) => {
    setIsSubmitting(true)
    setError(null)
    await completeOnboarding({ ...data, ...finalData })
    setIsSubmitting(false)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0f] text-white">
      {/* Subtle dark background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.06),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.05),transparent_40%)]" />

      <div className="relative flex min-h-screen flex-col items-center justify-start px-4 py-8 md:justify-center">
        {/* Header */}
        <div className="mb-5 w-full max-w-md">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Profile setup</p>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
            Quick profile setup
          </h1>
          <p className="mt-1 text-sm text-slate-400">Usually takes under 2 minutes.</p>
        </div>

        {/* Progress */}
        <div className="w-full max-w-md">
          <OnboardingProgress currentStep={currentStep} totalSteps={3} />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 w-full max-w-md rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
            {error}
          </div>
        )}

        {/* Step card */}
        <div className="w-full max-w-md">
          {currentStep === 1 && (
            <BasicInfoStep
              initialData={data}
              onNext={handleNext}
              isSubmitting={isSubmitting}
              isNamePrefilled={Boolean(defaultName)}
            />
          )}
          {currentStep === 2 && (
            <AcademicDetailsStep
              initialData={data}
              onNext={handleNext}
              onBack={handleBack}
              isSubmitting={isSubmitting}
            />
          )}
          {currentStep === 3 && (
            <OptionalDetailsStep
              initialData={data}
              onComplete={handleComplete}
              onSkip={handleSkip}
              onBack={handleBack}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </div>
    </div>
  )
}
