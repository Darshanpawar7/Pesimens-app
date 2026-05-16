interface OnboardingProgressProps {
  currentStep: number
  totalSteps: number
}

export function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step, index) => (
          <div key={step} className="flex flex-1 items-center">
            <div
              className={[
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all',
                step === currentStep
                  ? 'bg-white text-[#0a0a0f] shadow-[0_0_0_3px_rgba(255,255,255,0.15)]'
                  : step < currentStep
                  ? 'bg-emerald-500 text-white'
                  : 'border border-white/10 bg-white/5 text-slate-500',
              ].join(' ')}
              aria-current={step === currentStep ? 'step' : undefined}
            >
              {step < currentStep ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : step}
            </div>
            {index < totalSteps - 1 && (
              <div className={['mx-2 h-0.5 flex-1 rounded-full transition-all', step < currentStep ? 'bg-emerald-500' : 'bg-white/10'].join(' ')} />
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">Step {currentStep} of {totalSteps}</p>
    </div>
  )
}
