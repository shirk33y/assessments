import type { ChangeEvent } from 'react'

type TemplateMetaSectionProps = {
  templateName: string
  templateDescription: string
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  fieldClass: (key: string) => string
  formErrors: Record<string, string>
  registerField: (key: string) => (element: HTMLElement | null) => void
}

export function TemplateMetaSection({
  templateName,
  templateDescription,
  onNameChange,
  onDescriptionChange,
  fieldClass,
  formErrors,
  registerField,
}: TemplateMetaSectionProps) {
  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    onNameChange(event.target.value)
  }

  const handleDescriptionChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onDescriptionChange(event.target.value)
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="template-name">
          Template name
        </label>
        <input
          id="template-name"
          value={templateName}
          onChange={handleNameChange}
          placeholder="Quarterly 360 Feedback"
          ref={registerField('templateName')}
          className={fieldClass('templateName')}
        />
        {formErrors.templateName ? (
          <p className="mt-1 text-xs text-rose-600">{formErrors.templateName}</p>
        ) : null}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="template-description">
          Description
        </label>
        <textarea
          id="template-description"
          value={templateDescription}
          onChange={handleDescriptionChange}
          rows={3}
          placeholder="Used for quarterly leadership assessments. Includes competency ratings and qualitative feedback."
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
      </div>
    </div>
  )
}
