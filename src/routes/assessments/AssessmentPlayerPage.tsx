import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LoadingScreen } from '../../components/LoadingScreen'

const QUESTION_PLACEHOLDERS = [
  {
    type: 'scale',
    prompt: 'How confident are you in your current role?',
    description: 'Example of a numeric scale question. Actual content will load from Supabase.',
  },
  {
    type: 'single_choice',
    prompt: 'Which competency best describes your strength?',
    description: 'Single choice question sample.',
  },
]

export function AssessmentPlayerPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const questions = useMemo(() => QUESTION_PLACEHOLDERS, [])

  useEffect(() => {
    if (!token) {
      void navigate('/', { replace: true })
    }
  }, [navigate, token])

  if (!token) {
    return <LoadingScreen message="Redirecting…" />
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <header className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-wide text-slate-500">Invitation token</p>
          <p className="text-sm font-semibold text-slate-600 break-words">{token}</p>
          <h1 className="text-2xl font-semibold text-slate-900">Assessment preview</h1>
          <p className="text-sm text-slate-500">
            This screen will evolve into the real, mobile-friendly player that displays one question at a
            time and synchronizes answers to Supabase.
          </p>
        </header>

        <section className="space-y-4">
          {questions.map((question) => (
            <article key={question.prompt} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {question.type.replace('_', ' ')} question
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">{question.prompt}</h2>
              <p className="mt-2 text-sm text-slate-500">{question.description}</p>
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
                Question player UI coming soon
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  )
}
