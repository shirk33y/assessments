import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

type AuthContextValue = {
  session: Session | null
  loading: boolean
  error: string | null
  signInWithGoogle: () => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUpWithPassword: (email: string, password: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  clearError: () => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return
        setSession(data.session)
        setLoading(false)
        setError(null)
      })
      .catch((error: unknown) => {
        console.error('Failed to get session', error)
        if (isMounted) setLoading(false)
      })

    const { data } = supabase.auth.onAuthStateChange((_event, authSession) => {
      setSession(authSession)
      setLoading(false)
      setError(null)
    })

    return () => {
      isMounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = async () => {
    const redirectUrl = new URL(import.meta.env.BASE_URL ?? '/', window.location.origin).toString()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl },
    })
    if (error) {
      console.error('OAuth error:', error.message)
      setError(error.message)
      throw error
    }
    setError(null)
  }

  const signInWithPassword = async (email: string, password: string) => {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      console.error('Password sign-in error:', signInError.message)
      setError(signInError.message)
      throw signInError
    }
    setError(null)
  }

  const signUpWithPassword = async (email: string, password: string) => {
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: new URL(`${import.meta.env.BASE_URL ?? '/'}login`, window.location.origin).toString(),
      },
    })

    if (signUpError) {
      console.error('Password sign-up error:', signUpError.message)
      setError(signUpError.message)
      throw signUpError
    }
    setError(null)
  }

  const resetPassword = async (email: string) => {
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: new URL(`${import.meta.env.BASE_URL ?? '/'}login`, window.location.origin).toString(),
    })

    if (resetError) {
      console.error('Password reset error:', resetError.message)
      setError(resetError.message)
      throw resetError
    }
    setError(null)
  }

  const clearError = () => setError(null)

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Sign out error:', error.message)
      setError(error.message)
      throw error
    }
    setError(null)
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      error,
      signInWithGoogle,
      signInWithPassword,
      signUpWithPassword,
      resetPassword,
      clearError,
      signOut,
    }),
    [session, loading, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
