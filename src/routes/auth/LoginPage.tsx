import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { LoadingScreen } from '../../components/LoadingScreen'

type AuthMode = 'sign-in' | 'sign-up'

export function LoginPage() {
  const {
    session,
    loading,
    error,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    resetPassword,
    clearError,
  } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/'

  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [processing, setProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!loading && session) {
      void navigate(redirectPath, { replace: true })
    }
  }, [loading, session, navigate, redirectPath])

  useEffect(() => {
    if (error) {
      setLocalError(error)
    }
  }, [error])

  const handleSwitchMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setPassword('')
    setConfirmPassword('')
    setStatusMessage('')
    setLocalError('')
    clearError()
  }

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLocalError('')
    setStatusMessage('')

    if (!email.trim() || !password) {
      setLocalError('Please provide both email and password.')
      return
    }

    if (mode === 'sign-up' && password !== confirmPassword) {
      setLocalError('Passwords do not match.')
      return
    }

    try {
      setProcessing(true)
      if (mode === 'sign-in') {
        await signInWithPassword(email, password)
        void navigate(redirectPath, { replace: true })
      } else {
        await signUpWithPassword(email, password)
        setStatusMessage('Check your email to confirm your account before signing in.')
        setMode('sign-in')
        setPassword('')
        setConfirmPassword('')
      }
    } catch (authError) {
      if (authError instanceof Error) {
        setLocalError(authError.message)
      } else {
        setLocalError('Something went wrong. Please try again.')
      }
    } finally {
      setProcessing(false)
    }
  }

  const handleResetPassword = async () => {
    setLocalError('')
    setStatusMessage('')

    if (!email.trim()) {
      setLocalError('Enter your email to receive a reset link.')
      return
    }

    try {
      setProcessing(true)
      await resetPassword(email)
      setStatusMessage('Password reset sent. Check your inbox for further instructions.')
    } catch (resetError) {
      if (resetError instanceof Error) {
        setLocalError(resetError.message)
      } else {
        setLocalError('Unable to send reset email. Try again later.')
      }
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return <LoadingScreen message="Checking authentication…" />
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-16 text-center">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
          <p className="text-sm text-slate-500">
            Access the PulseLog assessment workspace with your organization account.
          </p>
        </div>
        <form
          className="space-y-4 text-left"
          onSubmit={(event) => {
            void handlePasswordSubmit(event)
          }}
        >
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              placeholder="Enter your password"
            />
          </div>

          {mode === 'sign-up' ? (
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700" htmlFor="confirm-password">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                placeholder="Re-enter your password"
              />
            </div>
          ) : null}

          {localError ? <p className="text-sm text-rose-600">{localError}</p> : null}
          {statusMessage ? <p className="text-sm text-emerald-600">{statusMessage}</p> : null}

          <div className="space-y-2">
            <button
              type="submit"
              disabled={processing}
              className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? 'Processing…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </button>
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-900"
            >
              Continue with Google
            </button>
          </div>
        </form>

        <div className="space-y-2 text-sm text-slate-500">
          <button
            type="button"
            onClick={() => handleSwitchMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
            className="w-full text-blue-600 hover:text-blue-700"
          >
            {mode === 'sign-in' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
          </button>
          <button
            type="button"
            onClick={() => {
              void handleResetPassword()
            }}
            className="w-full text-blue-600 hover:text-blue-700"
            disabled={processing}
          >
            Forgot password?
          </button>
        </div>
      </div>
    </div>
  )
}
