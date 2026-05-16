import { useState } from 'react'
import { 
  signInWithSrnPassword,
  sendMagicLink, 
  signInWithGoogle, 
  isValidEmail, 
  isValidSRN,
  getAuthErrorMessage,
  AUTH_ERROR_MESSAGES 
} from '@/lib/authHelpers'
import { setSignupAuthMethod } from '@/lib/signupAttribution'
import { useAuthStore } from '@/store/auth'

export function useAuthForm(redirectPath?: string) {
  const [srn, setSrn] = useState('')
  const [password, setPassword] = useState('')
  const [srnTouched, setSrnTouched] = useState(false)
  const [isSrnLoading, setIsSrnLoading] = useState(false)
  const [srnError, setSrnError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const setSession = useAuthStore(state => state.setSession)
  const setProfile = useAuthStore(state => state.setProfile)
  const setLoading = useAuthStore(state => state.setLoading)
  const setProfileLoading = useAuthStore(state => state.setProfileLoading)

  const srnValid = isValidSRN(srn)
  const showSrnError = srnTouched && srn.length > 0 && !srnValid
  const emailValid = isValidEmail(email)
  const showEmailError = emailTouched && email.length > 0 && !emailValid

  const handleSrnPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setSrnTouched(true)

    if (!srnValid) {
      setSrnError(AUTH_ERROR_MESSAGES.INVALID_SRN)
      return { ok: false as const, onboardingCompleted: false }
    }

    if (!password.trim()) {
      setSrnError('Please enter your PESU password.')
      return { ok: false as const, onboardingCompleted: false }
    }

    setSrnError(null)
    setIsSrnLoading(true)

    const { data, error } = await signInWithSrnPassword(srn, password)

    if (error || !data) {
      setSrnError(error?.message || AUTH_ERROR_MESSAGES.SRN_LOGIN_FAILED)
      setIsSrnLoading(false)
      return { ok: false as const, onboardingCompleted: false }
    }

    setSession({ user: { id: data.profile.id, email: data.profile.email } } as any)
    setProfile(data.profile)
    setLoading(false)
    setProfileLoading(false)
    setIsSrnLoading(false)
    setSignupAuthMethod('srn')

    return {
      ok: true as const,
      onboardingCompleted: data.profile.onboarding_completed === true,
    }
  }

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailTouched(true)
    
    if (!emailValid) {
      setSendError(AUTH_ERROR_MESSAGES.INVALID_EMAIL)
      return
    }

    setSendError(null)
    setIsSending(true)

    try {
      const { error } = await sendMagicLink(email)

      if (error) {
        setSendError(getAuthErrorMessage(error))
        return
      }

      setSent(true)
      setSignupAuthMethod('email')
    } catch (err) {
      setSendError(AUTH_ERROR_MESSAGES.NETWORK_ERROR)
    } finally {
      setIsSending(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleError(null)
    setIsGoogleLoading(true)
    setSignupAuthMethod('google')
    
    try {
      const { error } = await signInWithGoogle(redirectPath)
      
      if (error) {
        setGoogleError(AUTH_ERROR_MESSAGES.GOOGLE_FAILED)
        setIsGoogleLoading(false)
      }
      // On success, browser redirects
    } catch (err) {
      setGoogleError(AUTH_ERROR_MESSAGES.GOOGLE_FAILED)
      setIsGoogleLoading(false)
    }
  }

  const resetForm = () => {
    setSrnError(null)
    setSent(false)
    setSendError(null)
    setGoogleError(null)
  }

  const setGoogleErrorMessage = (message: string | null) => {
    setGoogleError(message)
  }

  return {
    srn,
    setSrn,
    password,
    setPassword,
    srnTouched,
    setSrnTouched,
    isSrnLoading,
    srnError,
    email,
    setEmail,
    emailTouched,
    setEmailTouched,
    isSending,
    sent,
    sendError,
    googleError,
    isGoogleLoading,
    srnValid,
    showSrnError,
    emailValid,
    showEmailError,
    handleSrnPasswordSignIn,
    handleSendMagicLink,
    handleGoogleSignIn,
    resetForm,
    setGoogleErrorMessage,
  }
}
