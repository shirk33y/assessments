import type { Tables } from '../../../lib/supabase.types'

export type QuestionType = Tables<'assessment_questions'>['question_type']
export type ScaleVariant = Tables<'assessment_questions'>['scale_variant']

export type QuestionChoiceDraft = {
  id: string
  label: string
  description: string
  value: number
}

export type QuestionDraft = {
  id: string
  type: QuestionType
  prompt: string
  details: string
  scoreWeight: number
  choices: QuestionChoiceDraft[]
  scaleMin: number
  scaleMax: number
  scaleVariant: ScaleVariant
  scaleLabels: { value: number; label: string }[]
}

export type QuestionRow = Tables<'assessment_questions'> & {
  assessment_question_choices: {
    id: string
    label: string | null
    description: string | null
    value: number | null
  }[] | null
  assessment_scale_labels: {
    scale_value: number
    label: string | null
  }[] | null
}

export type TemplateRow = Tables<'assessment_templates'> & {
  assessment_questions: QuestionRow[] | null
}

export const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string; description: string }[] = [
  {
    value: 'single_choice',
    label: 'Single choice',
    description: 'Respondent selects exactly one option. Ideal for categorical questions.',
  },
  {
    value: 'multi_choice',
    label: 'Multi choice',
    description: 'Respondent can pick multiple options. Useful for peer feedback or competencies.',
  },
  {
    value: 'scale',
    label: 'Numeric scale',
    description:
      'Configurable range (1–N) with optional visual variants like stars or hearts and per-value labels.',
  },
]

export const SCALE_VARIANTS: { value: ScaleVariant; label: string }[] = [
  { value: 'number', label: 'Numbers' },
  { value: 'stars', label: 'Stars' },
  { value: 'hearts', label: 'Hearts' },
]

export const createEmptyQuestion = (order: number): QuestionDraft => ({
  id: `question-${order}-${crypto.randomUUID()}`,
  type: 'single_choice',
  prompt: '',
  details: '',
  scoreWeight: 1,
  choices: [
    { id: crypto.randomUUID(), label: 'Option A', description: '', value: 1 },
    { id: crypto.randomUUID(), label: 'Option B', description: '', value: 2 },
  ],
  scaleMin: 1,
  scaleMax: 5,
  scaleVariant: 'number',
  scaleLabels: [],
})
