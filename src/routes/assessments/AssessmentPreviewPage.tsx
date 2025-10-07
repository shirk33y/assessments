import { useEffect, useMemo, useState } from 'react'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { supabase } from '@/lib/supabaseClient'
import type { Tables } from '@/lib/supabase.types'
import { Button } from '@/components/ui/button'

type QuestionRow = Tables<'assessment_questions'> & {
  assessment_question_choices: Tables<'assessment_question_choices'>[]
  assessment_scale_labels: Tables<'assessment_scale_labels'>[]
}

interface PreviewQuestion {
  id: string
  prompt: string
  description: string | null
  type: Tables<'assessment_questions'>['question_type']
  choices: {
    id: string
    label: string
    description: string | null
    value: number
  }[]
  scaleLabels: {
    value: number
    label: string | null
  }[]
}

type TemplateWithQuestions = Tables<'assessment_templates'> & {
  assessment_questions: QuestionRow[]
}

interface LocationState {
  templateName?: string
  templateDescription?: string
}

export function AssessmentPreviewPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as LocationState | undefined) ?? {}

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [templateName, setTemplateName] = useState(state.templateName ?? '')
  const [templateDescription, setTemplateDescription] = useState(state.templateDescription ?? '')
  const [questions, setQuestions] = useState<PreviewQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number | number[] | null>>({})

  const totalQuestions = questions.length
  const currentQuestion = useMemo(() => questions[currentIndex], [questions, currentIndex])

  useEffect(() => {
    if (!templateId) {
      void navigate('/assessments', { replace: true })
      return
    }

    const fetchTemplate = async () => {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('assessment_templates')
        .select(
          `id, name,
          assessment_questions (
            id, question_type, prompt, details, score_weight, position,
            assessment_question_choices (id, value, label, description),
            assessment_scale_labels (scale_value, label)
          )`
        )
        .eq('id', templateId)
        .maybeSingle<TemplateWithQuestions>()

      if (fetchError) {
        setError(fetchError.message)
        setQuestions([])
        setLoading(false)
        return
      }

      if (!data) {
        setError('Template not found.')
        setLoading(false)
        return
      }

      setTemplateName(data.name ?? 'Untitled template')
      setTemplateDescription((prev) => data.description?.trim() ?? prev)

      const mappedQuestions: PreviewQuestion[] = [...(data.assessment_questions ?? [])]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((question) => ({
          id: question.id,
          prompt: question.prompt ?? 'Untitled question',
          description: question.details ? question.details.trim() : '',
          type: question.question_type,
          choices: [...(question.assessment_question_choices ?? [])]
            .sort((a, b) => (a.value ?? 0) - (b.value ?? 0))
            .map((choice) => ({
              id: choice.id,
              label: choice.label ?? 'Option',
              description: choice.description,
              value: choice.value ?? 0,
            })),
          scaleLabels: [...(question.assessment_scale_labels ?? [])]
            .sort((a, b) => a.scale_value - b.scale_value)
            .map((entry) => ({
              value: entry.scale_value,
              label: entry.label,
            })),
        }))

      setQuestions(mappedQuestions)
      setCurrentIndex(0)
      setLoading(false)
    }

    void fetchTemplate()
  }, [navigate, templateId])

  const handlePrev = () => {
    setCurrentIndex((index) => Math.max(0, index - 1))
  }

  const handleNext = () => {
    setCurrentIndex((index) => Math.min(totalQuestions - 1, index + 1))
  }

  const handleSubmit = () => {
    if (!templateId) return
    void navigate(`/assessments/${templateId}/preview/summary`, {
      state: {
        templateName,
        totalQuestions,
        templateDescription,
      },
    })
  }

  const handleSingleChoice = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleMultiChoice = (questionId: string, value: number) => {
    setAnswers((prev) => {
      const existingValue = prev[questionId]
      const existing = Array.isArray(existingValue) ? [...existingValue] : []
      const set = new Set(existing)
      if (set.has(value)) {
        set.delete(value)
      } else {
        set.add(value)
      }
      return { ...prev, [questionId]: Array.from(set).sort((a, b) => a - b) }
    })
  }

  const handleScaleSelect = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const renderAnswerControls = (question: PreviewQuestion) => {
    if (question.type === 'single_choice') {
      return (
        <div className="space-y-2">
          {question.choices.map((choice) => {
            const selected = answers[question.id] === choice.value
            return (
              <button
                key={choice.id || choice.value}
                type="button"
                onClick={() => handleSingleChoice(question.id, choice.value)}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                  selected ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="font-medium text-slate-900">{choice.label}</span>
                {choice.description ? <p className="mt-1 text-xs text-slate-500">{choice.description}</p> : null}
              </button>
            )
          })}
          {question.choices.length === 0 ? (
            <p className="text-sm text-slate-500">No answer options yet.</p>
          ) : null}
        </div>
      )
    }

    if (question.type === 'multi_choice') {
      const selectedValues = Array.isArray(answers[question.id]) ? (answers[question.id] as number[]) : []
      return (
        <div className="space-y-2">
          {question.choices.map((choice) => {
            const selected = selectedValues.includes(choice.value)
            return (
              <label
                key={choice.id || choice.value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                  selected ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => handleMultiChoice(question.id, choice.value)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <div>
                  <span className="font-medium text-slate-900">{choice.label}</span>
                  {choice.description ? <p className="mt-1 text-xs text-slate-500">{choice.description}</p> : null}
                </div>
              </label>
            )
          })}
          {question.choices.length === 0 ? (
            <p className="text-sm text-slate-500">No answer options yet.</p>
          ) : null}
        </div>
      )
    }

    if (question.type === 'scale') {
      const selected = typeof answers[question.id] === 'number' ? (answers[question.id] as number) : null
      const labels = question.scaleLabels.length > 0 ? question.scaleLabels : null
      const min = labels ? labels[0]?.value ?? 1 : question.scaleLabels[0]?.value ?? 1
      const max = labels ? labels[labels.length - 1]?.value ?? 5 : question.scaleLabels[question.scaleLabels.length - 1]?.value ?? 5
      const values = labels ? labels.map((entry) => entry.value) : Array.from({ length: max - min + 1 }, (_, idx) => min + idx)

      return (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => {
            const label = labels?.find((entry) => entry.value === value)?.label
            const active = selected === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleScaleSelect(question.id, value)}
                className={`min-w-[48px] rounded-full border px-4 py-2 text-sm transition ${
                  active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="block text-center font-medium">{value}</span>
                {label ? <span className="block text-[10px] text-slate-500">{label}</span> : null}
              </button>
            )
          })}
        </div>
      )
    }

    return (
      <textarea
        className="min-h-[120px] w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
        placeholder="Answer text"
        readOnly
      />
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center text-sm text-slate-500">
        <p>Unable to load preview: {error}</p>
        <Button
          size="sm"
          onClick={() => {
            void navigate('/assessments')
          }}
        >
          Back to assessments
        </Button>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center text-sm text-slate-500">
        <p>This template has no questions yet.</p>
        <Button
          size="sm"
          onClick={() => {
            void navigate(`/assessments/${templateId}/edit`)
          }}
        >
          Add questions
        </Button>
      </div>
    )
  }

  const progress = ((currentIndex + 1) / totalQuestions) * 100
  const descriptionToShow = currentQuestion.description || templateDescription

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-500">
            <span>
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-3">
            <h1 className="text-xl font-semibold text-slate-900">{currentQuestion.prompt}</h1>
            {descriptionToShow ? (
              <p className="text-sm leading-relaxed text-slate-500">{descriptionToShow}</p>
            ) : null}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
              {currentQuestion.type.replace('_', ' ')}
            </p>
            {renderAnswerControls(currentQuestion)}
          </div>
        </article>

        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" disabled={currentIndex === 0} onClick={handlePrev} size="lg" className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          {currentIndex < totalQuestions - 1 ? (
            <Button onClick={handleNext} size="lg" className="gap-1">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} size="lg" className="gap-2 bg-blue-600 hover:bg-blue-500">
              Submit preview
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
