import type { ChangeEvent } from 'react'
import {
  QUESTION_TYPE_OPTIONS,
  SCALE_VARIANTS,
  type QuestionDraft,
  type QuestionType,
} from '../types'

type QuestionListProps = {
  questions: QuestionDraft[]
  onAddQuestion: () => void
  onRemoveQuestion: (questionId: string) => void
  onUpdateQuestion: (questionId: string, partial: Partial<QuestionDraft>, errorKeys?: string[]) => void
  onAddChoice: (questionId: string) => void
  onUpdateChoice: (
    questionId: string,
    choiceId: string,
    partial: Partial<{ label: string; description: string }>,
  ) => void
  onRemoveChoice: (questionId: string, choiceId: string) => void
  onAddScaleLabel: (questionId: string, value: number) => void
  onUpdateScaleLabel: (questionId: string, value: number, label: string) => void
  onRemoveScaleLabel: (questionId: string, value: number) => void
  fieldClass: (key: string) => string
  formErrors: Record<string, string>
  registerField: (key: string) => (element: HTMLElement | null) => void
}

type QuestionCardProps = Omit<QuestionListProps, 'questions' | 'onAddQuestion'> & {
  question: QuestionDraft
  index: number
  totalQuestions: number
}

type ChoiceListProps = {
  question: QuestionDraft
  questionIndex: number
  onAddChoice: () => void
  onUpdateChoice: (choiceId: string, partial: Partial<{ label: string; description: string }>) => void
  onRemoveChoice: (choiceId: string) => void
  formErrors: Record<string, string>
  registerField: (key: string) => (element: HTMLElement | null) => void
}

type ScaleConfiguratorProps = {
  question: QuestionDraft
  questionIndex: number
  onUpdateQuestion: (partial: Partial<QuestionDraft>) => void
  onAddScaleLabel: (value: number) => void
  onUpdateScaleLabel: (value: number, label: string) => void
  onRemoveScaleLabel: (value: number) => void
  fieldClass: (key: string) => string
  formErrors: Record<string, string>
  registerField: (key: string) => (element: HTMLElement | null) => void
}

export function QuestionList({ questions, onAddQuestion, ...callbacks }: QuestionListProps) {
  return (
    <div className="space-y-4">
      {questions.map((question, index) => (
        <QuestionCard
          key={question.id}
          {...callbacks}
          question={question}
          index={index}
          totalQuestions={questions.length}
        />
      ))}

      <div className="pt-2">
        <button
          type="button"
          onClick={onAddQuestion}
          className="inline-flex items-center justify-center rounded-md border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-700"
        >
          Add question
        </button>
      </div>
    </div>
  )
}

function QuestionCard({
  question,
  index,
  totalQuestions,
  onRemoveQuestion,
  onUpdateQuestion,
  onAddChoice,
  onUpdateChoice,
  onRemoveChoice,
  onAddScaleLabel,
  onUpdateScaleLabel,
  onRemoveScaleLabel,
  fieldClass,
  formErrors,
  registerField,
}: QuestionCardProps) {
  const questionPath = `questions.${index}`
  const handlePromptChange = (event: ChangeEvent<HTMLInputElement>) => {
    onUpdateQuestion(question.id, { prompt: event.target.value }, ['prompt'])
  }

  const handleDetailsChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateQuestion(question.id, { details: event.target.value })
  }

  const handleTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onUpdateQuestion(question.id, { type: event.target.value as QuestionType }, ['choices', 'scale'])
  }

  const handleScoreWeightChange = (event: ChangeEvent<HTMLInputElement>) => {
    onUpdateQuestion(question.id, { scoreWeight: Number(event.target.value) }, ['scoreWeight'])
  }

  const questionTypeMeta = QUESTION_TYPE_OPTIONS.find((option) => option.value === question.type)

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question {index + 1}</p>
          <h2 className="text-lg font-semibold text-slate-900">{question.prompt || 'Untitled question'}</h2>
        </div>
        <select
          value={question.type}
          onChange={handleTypeChange}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        >
          {QUESTION_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3" ref={registerField(`${questionPath}.choices`)}>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor={`${question.id}-prompt`}>
              Prompt
            </label>
            <input
              id={`${question.id}-prompt`}
              value={question.prompt}
              onChange={handlePromptChange}
              placeholder="Describe how you demonstrated leadership this quarter."
              ref={registerField(`${questionPath}.prompt`)}
              className={fieldClass(`${questionPath}.prompt`)}
            />
            {formErrors[`${questionPath}.prompt`] ? (
              <p className="mt-1 text-xs text-rose-600">{formErrors[`${questionPath}.prompt`]}</p>
            ) : null}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor={`${question.id}-details`}>
              Details
            </label>
            <textarea
              id={`${question.id}-details`}
              value={question.details}
              onChange={handleDetailsChange}
              rows={question.type === 'scale' ? 2 : 3}
              placeholder="Provide additional context or examples for respondents."
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700" htmlFor={`${question.id}-score`}>
            Score weight
          </label>
          <input
            id={`${question.id}-score`}
            type="number"
            min={0}
            step={0.1}
            value={question.scoreWeight}
            onChange={handleScoreWeightChange}
            ref={registerField(`${questionPath}.scoreWeight`)}
            className={fieldClass(`${questionPath}.scoreWeight`)}
          />
          {formErrors[`${questionPath}.scoreWeight`] ? (
            <p className="mt-1 text-xs text-rose-600">{formErrors[`${questionPath}.scoreWeight`]}</p>
          ) : null}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-700">{questionTypeMeta?.label}</p>
            <p className="mt-1 text-xs text-slate-500">{questionTypeMeta?.description}</p>
          </div>
        </div>
      </div>

      {(question.type === 'single_choice' || question.type === 'multi_choice') && (
        <ChoiceList
          question={question}
          questionIndex={index}
          onAddChoice={() => onAddChoice(question.id)}
          onUpdateChoice={(choiceId, partial) => onUpdateChoice(question.id, choiceId, partial)}
          onRemoveChoice={(choiceId) => onRemoveChoice(question.id, choiceId)}
          formErrors={formErrors}
          registerField={registerField}
        />
      )}

      {question.type === 'scale' ? (
        <ScaleConfigurator
          question={question}
          questionIndex={index}
          onUpdateQuestion={(partial) => onUpdateQuestion(question.id, partial, ['scale'])}
          onAddScaleLabel={(value) => onAddScaleLabel(question.id, value)}
          onUpdateScaleLabel={(value, label) => onUpdateScaleLabel(question.id, value, label)}
          onRemoveScaleLabel={(value) => onRemoveScaleLabel(question.id, value)}
          fieldClass={fieldClass}
          formErrors={formErrors}
          registerField={registerField}
        />
      ) : null}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onRemoveQuestion(question.id)}
          className="text-sm font-medium text-rose-600 hover:text-rose-700 disabled:text-slate-400"
          disabled={totalQuestions <= 1}
        >
          Remove question
        </button>
      </div>
    </div>
  )
}

function ChoiceList({
  question,
  questionIndex,
  onAddChoice,
  onUpdateChoice,
  onRemoveChoice,
  formErrors,
  registerField,
}: ChoiceListProps) {
  const path = `questions.${questionIndex}.choices`

  return (
    <div className="space-y-3" ref={registerField(path)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Options</h3>
        <button
          type="button"
          onClick={onAddChoice}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Add option
        </button>
      </div>
      <div className="space-y-2">
        {question.choices.map((choice, choiceIndex) => (
          <div
            key={choice.id}
            className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Option {choiceIndex + 1}
            </span>
            <input
              value={choice.label}
              onChange={(event) => onUpdateChoice(choice.id, { label: event.target.value })}
              placeholder="Option label"
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <input
              value={choice.description}
              onChange={(event) => onUpdateChoice(choice.id, { description: event.target.value })}
              placeholder="Short description (optional)"
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            {question.choices.length > 1 ? (
              <button
                type="button"
                onClick={() => onRemoveChoice(choice.id)}
                className="text-xs font-medium text-rose-600 hover:text-rose-700"
              >
                Remove
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {formErrors[path] ? <p className="text-xs text-rose-600">{formErrors[path]}</p> : null}
    </div>
  )
}

function ScaleConfigurator({
  question,
  questionIndex,
  onUpdateQuestion,
  onAddScaleLabel,
  onUpdateScaleLabel,
  onRemoveScaleLabel,
  fieldClass,
  formErrors,
  registerField,
}: ScaleConfiguratorProps) {
  const path = `questions.${questionIndex}.scale`
  const valuesWithLabels = new Set(question.scaleLabels.map((entry) => entry.value))
  let nextValue: number | null = null
  for (let value = question.scaleMin; value <= question.scaleMax; value += 1) {
    if (!valuesWithLabels.has(value)) {
      nextValue = value
      break
    }
  }

  const handleAddScaleLabel = () => {
    if (nextValue !== null) {
      onAddScaleLabel(nextValue)
    }
  }

  return (
    <div className="space-y-3" ref={registerField(path)}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor={`${question.id}-scale-min`}>
            Scale minimum
          </label>
          <input
            id={`${question.id}-scale-min`}
            type="number"
            value={question.scaleMin}
            onChange={(event) => onUpdateQuestion({ scaleMin: Number(event.target.value) })}
            className={fieldClass(`${path}.min`)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor={`${question.id}-scale-max`}>
            Scale maximum
          </label>
          <input
            id={`${question.id}-scale-max`}
            type="number"
            value={question.scaleMax}
            onChange={(event) => onUpdateQuestion({ scaleMax: Number(event.target.value) })}
            className={fieldClass(`${path}.max`)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor={`${question.id}-scale-variant`}>
            Variant
          </label>
          <select
            id={`${question.id}-scale-variant`}
            value={question.scaleVariant}
            onChange={(event) =>
              onUpdateQuestion({ scaleVariant: event.target.value as QuestionDraft['scaleVariant'] })
            }
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            {SCALE_VARIANTS.map((variant) => (
              <option key={variant.value} value={variant.value}>
                {variant.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Scale labels</h3>
          <button
            type="button"
            onClick={handleAddScaleLabel}
            disabled={nextValue === null}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-slate-400"
          >
            Add label
          </button>
        </div>
        <div className="space-y-2">
          {question.scaleLabels
            .slice()
            .sort((a, b) => a.value - b.value)
            .map((entry) => (
              <div
                key={entry.value}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Value {entry.value}
                </span>
                <input
                  value={entry.label}
                  onChange={(event) => onUpdateScaleLabel(entry.value, event.target.value)}
                  placeholder="Label"
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
                <button
                  type="button"
                  onClick={() => onRemoveScaleLabel(entry.value)}
                  className="text-xs font-medium text-rose-600 hover:text-rose-700"
                >
                  Remove
                </button>
              </div>
            ))}
        </div>
      </div>
      {formErrors[path] ? <p className="text-xs text-rose-600">{formErrors[path]}</p> : null}
    </div>
  )
}
