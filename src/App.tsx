import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

export default function App() {
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) console.error('OAuth error:', error.message)
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Sign out error:', error.message)
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">Employee Performance Review System</h1>
        <p className="mt-2 text-sm text-gray-600">React 19 + Vite + Tailwind CSS v4 + Supabase</p>
        <div className="mt-6 rounded-lg border bg-white p-4">
          {session ? (
            <div className="flex items-center justify-between gap-4">
              <p>Signed in as {session.user.email}</p>
              <button
                onClick={signOut}
                className="px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 border text-sm"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p>No session. Sign in to continue.</p>
              <button
                onClick={signInWithGoogle}
                className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm"
              >
                Sign in with Google
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
