import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

type DetailBackButtonProps = {
  fallbackTo: string
  label?: string
  className?: string
  forceFallback?: boolean
}

export function DetailBackButton({ fallbackTo, label = 'Back', className, forceFallback = false }: DetailBackButtonProps) {
  const navigate = useNavigate()

  const handleGoBack = () => {
    if (forceFallback) {
      navigate(fallbackTo)
      return
    }

    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate(fallbackTo)
  }

  return (
    <button
      type="button"
      onClick={handleGoBack}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/45 px-2.5 py-1.5 text-xs font-semibold text-white',
        className
      )}
    >
      <ArrowLeft className="h-3.5 w-3.5" /> {label}
    </button>
  )
}
