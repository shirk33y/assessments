import { Link, useParams } from 'react-router-dom'
import { LoadingScreen } from '../../../components/LoadingScreen'
import { TemplateMetaSection } from './components/TemplateMetaSection'
import { QuestionList } from './components/QuestionList'
import { TemplatePreviewCard } from './components/TemplatePreviewCard'
import { useTemplateEditorState } from './useTemplateEditorState'

export function CreateAssessmentPage() {
  const { templateId } = useParams<{ templateId?: string }>()
  const editor = useTemplateEditorState(templateId)

  if (editor.authLoading || editor.initializing) {
    return <LoadingScreen message="Loading template…" />
  }

  if (editor.loadError) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">Create assessment template</h1>
        </header>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          <p className="font-semibold">{editor.loadError}</p>
          <Link to="/assessments" className="mt-4 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700">
            Back to assessments
          </Link>
        </div>
      </div>
    )
  }

  const fieldClass = (key: string) =>
    `mt-1 w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
      editor.formErrors[key] ? 'border-rose-500 focus:ring-rose-500/40' : 'border-slate-300'
    }`

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Create assessment template</h1>
        <p className="text-sm text-slate-500">
          Define template metadata and add questions using single choice, multi choice, or numeric scales.
          Each question can have its own configuration.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <TemplateMetaSection
            templateName={editor.templateName}
            templateDescription={editor.templateDescription}
            onNameChange={(value: string) => {
              editor.setTemplateName(value)
              editor.clearErrors('templateName')
            }}
            onDescriptionChange={editor.setTemplateDescription}
            fieldClass={fieldClass}
            formErrors={editor.formErrors}
            registerField={editor.registerField}
          />

          <QuestionList
            questions={editor.questions}
            onAddQuestion={editor.addQuestion}
            onRemoveQuestion={editor.removeQuestion}
            onUpdateQuestion={editor.updateQuestion}
            onAddChoice={editor.addChoice}
            onUpdateChoice={editor.updateChoice}
            onRemoveChoice={editor.removeChoice}
            onAddScaleLabel={editor.addScaleLabel}
            onUpdateScaleLabel={editor.updateScaleLabel}
            onRemoveScaleLabel={editor.removeScaleLabel}
            fieldClass={fieldClass}
            formErrors={editor.formErrors}
            registerField={editor.registerField}
          />

          {editor.submitError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {editor.submitError}
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                void editor.handleSubmit()
              }}
              disabled={editor.isSubmitting}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {editor.isSubmitting ? 'Saving…' : 'Save template'}
            </button>
            <Link to="/assessments" className="text-sm font-medium text-slate-500 hover:text-slate-700">
              Cancel
            </Link>
          </div>
        </div>

        <TemplatePreviewCard preview={editor.templatePreview} />
      </section>
    </div>
  )
}
