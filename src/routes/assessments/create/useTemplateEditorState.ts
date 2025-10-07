import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabaseClient'
import { useAuth } from '../../../contexts/AuthContext'
import type { TemplateRow, QuestionDraft } from './types'
import { createEmptyQuestion } from './types'

type FormErrors = Record<string, string>

type EditorState = {
  authLoading: boolean
  initializing: boolean
  loadError: string | null
  submitError: string | null
  isSubmitting: boolean
  templateName: string
  templateDescription: string
  questions: QuestionDraft[]
  formErrors: FormErrors
  templatePreview: {
    name: string
    description: string
    questionCount: number
  }
  setTemplateName: (value: string) => void
  setTemplateDescription: (value: string) => void
  setSubmitError: (value: string | null) => void
  clearErrors: (...keys: string[]) => void
  addQuestion: () => void
  updateQuestion: (questionId: string, partial: Partial<QuestionDraft>, errorKeys?: string[]) => void
  removeQuestion: (questionId: string) => void
  addChoice: (questionId: string) => void
  updateChoice: (questionId: string, choiceId: string, partial: Partial<{ label: string; description: string }>) => void
  removeChoice: (questionId: string, choiceId: string) => void
  addScaleLabel: (questionId: string, value: number) => void
  updateScaleLabel: (questionId: string, value: number, label: string) => void
  removeScaleLabel: (questionId: string, value: number) => void
  registerField: (key: string) => (element: HTMLElement | null) => void
  handleSubmit: () => Promise<void>
}

export function useTemplateEditorState(templateId: string | undefined): EditorState {
  const navigate = useNavigate()
  const { session, loading: authLoading } = useAuth()

  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [questions, setQuestions] = useState<QuestionDraft[]>([createEmptyQuestion(0)])
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [initializing, setInitializing] = useState<boolean>(Boolean(templateId))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({})

  const clearErrors = (...keys: string[]) => {
    setFormErrors((prev) => {
      if (keys.every((key) => !(key in prev))) return prev
      const next = { ...prev }
      keys.forEach((key) => {
        delete next[key]
      })
      return next
    })
  }

  const mutateQuestion = (
    questionId: string,
    updater: (question: QuestionDraft) => QuestionDraft,
    errorKeys: string[] = [],
  ) => {
    let targetIndex = -1
    let changed = false
    setQuestions((prev) => {
      const next = prev.map((question, index) => {
        if (question.id !== questionId) return question
        targetIndex = index
        const updated = updater(question)
        if (updated !== question) changed = true
        return updated
      })
      return changed ? next : prev
    })

    if (targetIndex !== -1 && errorKeys.length > 0) {
      const qualifiedKeys = errorKeys.map((key) =>
        key ? `questions.${targetIndex}.${key}` : `questions.${targetIndex}`,
      )
      clearErrors(...qualifiedKeys)
    }
  }

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createEmptyQuestion(prev.length)])
    clearErrors('questions')
  }

  const updateQuestion = (
    questionId: string,
    partial: Partial<QuestionDraft>,
    errorKeys: string[] = [],
  ) => {
    mutateQuestion(
      questionId,
      (question) => ({
        ...question,
        ...partial,
      }),
      errorKeys,
    )
  }

  const removeQuestion = (questionId: string) => {
    setQuestions((prev) => prev.filter((question) => question.id !== questionId))
  }

  const addChoice = (questionId: string) => {
    mutateQuestion(
      questionId,
      (question) => ({
        ...question,
        choices: [
          ...question.choices,
          {
            id: crypto.randomUUID(),
            label: `Option ${question.choices.length + 1}`,
            description: '',
            value:
              question.choices.reduce((max, choice) => Math.max(max, choice.value), 0) + 1,
          },
        ],
      }),
      ['choices'],
    )
  }

  const updateChoice = (
    questionId: string,
    choiceId: string,
    partial: Partial<{ label: string; description: string }>,
  ) => {
    mutateQuestion(
      questionId,
      (question) => ({
        ...question,
        choices: question.choices.map((choice) =>
          choice.id === choiceId ? { ...choice, ...partial } : choice,
        ),
      }),
      ['choices'],
    )
  }

  const removeChoice = (questionId: string, choiceId: string) => {
    mutateQuestion(
      questionId,
      (question) => ({
        ...question,
        choices: question.choices.filter((choice) => choice.id !== choiceId),
      }),
      ['choices'],
    )
  }

  const addScaleLabel = (questionId: string, value: number) => {
    mutateQuestion(
      questionId,
      (question) => {
        if (question.scaleLabels.some((entry) => entry.value === value)) return question
        return {
          ...question,
          scaleLabels: [...question.scaleLabels, { value, label: '' }],
        }
      },
      ['scale'],
    )
  }

  const updateScaleLabel = (questionId: string, value: number, label: string) => {
    mutateQuestion(
      questionId,
      (question) => ({
        ...question,
        scaleLabels: question.scaleLabels.map((entry) =>
          entry.value === value ? { ...entry, label } : entry,
        ),
      }),
      ['scale'],
    )
  }

  const removeScaleLabel = (questionId: string, value: number) => {
    mutateQuestion(
      questionId,
      (question) => ({
        ...question,
        scaleLabels: question.scaleLabels.filter((entry) => entry.value !== value),
      }),
      ['scale'],
    )
  }

  const templatePreview = useMemo(
    () => ({
      name: templateName || 'Untitled assessment',
      description: templateDescription,
      questionCount: questions.length,
    }),
    [templateDescription, templateName, questions.length],
  )

  const registerField = (key: string) => (element: HTMLElement | null) => {
    fieldRefs.current[key] = element
  }

  const scrollToError = (key: string) => {
    const element = fieldRefs.current[key]
    if (!element) return
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if ('focus' in element && typeof element.focus === 'function') {
      element.focus({ preventScroll: true })
    }
  }

  const validate = () => {
    const errors: FormErrors = {}

    if (!templateName.trim()) {
      errors['templateName'] = 'Template name is required.'
    }

    if (questions.length === 0) {
      errors['questions'] = 'Add at least one question.'
    }

    questions.forEach((question, index) => {
      const path = `questions.${index}`
      if (!question.prompt.trim()) {
        errors[`${path}.prompt`] = 'Prompt is required.'
      }

      if (Number.isNaN(question.scoreWeight) || question.scoreWeight < 0) {
        errors[`${path}.scoreWeight`] = 'Score weight must be zero or positive.'
      }

      if ((question.type === 'single_choice' || question.type === 'multi_choice') && question.choices.length < 2) {
        errors[`${path}.choices`] = 'Provide at least two options.'
      }

      if (question.type === 'scale' && question.scaleMin >= question.scaleMax) {
        errors[`${path}.scale`] = 'Maximum must be greater than minimum.'
      }
    })

    setFormErrors(errors)
    return errors
  }

  useEffect(() => {
    if (Object.keys(formErrors).length === 0) return
    scrollToError(Object.keys(formErrors)[0])
  }, [formErrors])

  useEffect(() => {
    if (!templateId) {
      setInitializing(false)
      return
    }

    const loadTemplate = async () => {
      try {
        const { data, error } = await supabase
          .from('assessment_templates')
          .select(
            `id, name, description,
            assessment_questions (
              id, question_type, prompt, details, score_weight, position, scale_min, scale_max, scale_variant,
              assessment_question_choices (id, value, label, description),
              assessment_scale_labels (scale_value, label)
            )`
          )
          .eq('id', templateId)
          .maybeSingle<TemplateRow>()

        if (error) throw error
        if (!data) {
          setLoadError('Template not found.')
          return
        }

        setTemplateName(data.name ?? '')
        setTemplateDescription(data.description ?? '')

        const questionsFromDb = [...(data.assessment_questions ?? [])]
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

        if (questionsFromDb.length === 0) {
          setQuestions([createEmptyQuestion(0)])
          return
        }

        setQuestions(
          questionsFromDb.map((row) => ({
            id: row.id,
            type: row.question_type,
            prompt: row.prompt ?? '',
            details: row.details ?? '',
            scoreWeight: Number(row.score_weight ?? 1),
            choices: [...(row.assessment_question_choices ?? [])]
              .sort((a, b) => (a.value ?? Number.MAX_SAFE_INTEGER) - (b.value ?? Number.MAX_SAFE_INTEGER))
              .map((choice, index) => ({
                id: choice.id,
                label: choice.label ?? '',
                description: choice.description ?? '',
                value: choice.value ?? index + 1,
              })),
            scaleMin: Number(row.scale_min ?? 1),
            scaleMax: Number(row.scale_max ?? 5),
            scaleVariant: row.scale_variant ?? 'number',
            scaleLabels: [...(row.assessment_scale_labels ?? [])]
              .sort((a, b) => a.scale_value - b.scale_value)
              .map((entry) => ({ value: entry.scale_value, label: entry.label ?? '' })),
          })),
        )
      } catch (error) {
        console.error('Failed to load template', error)
        setLoadError(error instanceof Error ? error.message : 'Failed to load template.')
      } finally {
        setInitializing(false)
      }
    }

    void loadTemplate()
  }, [templateId])

  useEffect(() => {
    if (!authLoading && !session) {
      void navigate('/login', { replace: true })
    }
  }, [authLoading, navigate, session])

  const upsertTemplate = async () => {
    const payload = {
      name: templateName.trim(),
      description: templateDescription.trim() || null,
      owner_id: session?.user?.id ?? null,
    }

    if (templateId) {
      const { error } = await supabase
        .from('assessment_templates')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', templateId)

      if (error) throw error
      return templateId
    }

    const { data, error } = await supabase
      .from('assessment_templates')
      .insert({ ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .select('id')
      .single()

    if (error) throw error
    return data.id as string
  }

  const persistQuestions = async (templateIdentifier: string) => {
    const { error: deleteError } = await supabase
      .from('assessment_questions')
      .delete()
      .eq('template_id', templateIdentifier)
    if (deleteError) throw deleteError

    const baseQuestions = questions.map((question, index) => ({
      template_id: templateIdentifier,
      question_type: question.type,
      prompt: question.prompt.trim(),
      details: question.details.trim() || null,
      score_weight: question.scoreWeight,
      position: index,
      scale_min: question.scaleMin,
      scale_max: question.scaleMax,
      scale_variant: question.scaleVariant,
    }))

    const { data: savedQuestions, error: insertError } = await supabase
      .from('assessment_questions')
      .insert(baseQuestions)
      .select('id, position')
      .returns<{ id: string; position: number }[]>()

    if (insertError) throw insertError
    const positionMap = new Map<number, string>()
    savedQuestions?.forEach((row) => {
      positionMap.set(row.position, row.id)
    })

    const choiceRows: {
      question_id: string
      label: string
      description: string | null
      value: number
    }[] = []
    const scaleRows: {
      question_id: string
      scale_value: number
      label: string | null
    }[] = []

    questions.forEach((question, index) => {
      const savedId = positionMap.get(index)
      if (!savedId) return

      if (question.type === 'single_choice' || question.type === 'multi_choice') {
        question.choices.forEach((choice) => {
          choiceRows.push({
            question_id: savedId,
            label: choice.label.trim(),
            description: choice.description.trim() || null,
            value: choice.value,
          })
        })
      }

      if (question.type === 'scale') {
        question.scaleLabels.forEach((entry) => {
          scaleRows.push({
            question_id: savedId,
            scale_value: entry.value,
            label: entry.label.trim() || null,
          })
        })
      }
    })

    if (choiceRows.length > 0) {
      const { error: choicesError } = await supabase
        .from('assessment_question_choices')
        .insert(choiceRows)
      if (choicesError) throw choicesError
    }

    if (scaleRows.length > 0) {
      const { error: scaleError } = await supabase
        .from('assessment_scale_labels')
        .insert(scaleRows)
      if (scaleError) throw scaleError
    }
  }

  const handleSubmit = async () => {
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const errors = validate()
      if (Object.keys(errors).length > 0) return

      if (!session?.user) {
        setSubmitError('You must be signed in to save a template.')
        return
      }

      const templateIdentifier = await upsertTemplate()
      await persistQuestions(templateIdentifier)

      void navigate('/assessments', { replace: true })
    } catch (error) {
      console.error('Failed to save template', error)
      const message = (error as PostgrestError)?.message ?? (error instanceof Error ? error.message : 'Unable to save template.')
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    authLoading,
    initializing,
    loadError,
    submitError,
    isSubmitting,
    templateName,
    templateDescription,
    questions,
    formErrors,
    templatePreview,
    setTemplateName,
    setTemplateDescription,
    setSubmitError,
    clearErrors,
    addQuestion,
    updateQuestion,
    removeQuestion,
    addChoice,
    updateChoice,
    removeChoice,
    addScaleLabel,
    updateScaleLabel,
    removeScaleLabel,
    registerField,
    handleSubmit,
  }
}
