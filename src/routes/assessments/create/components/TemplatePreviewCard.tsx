type TemplatePreviewCardProps = {
  preview: {
    name: string
    description: string
    questionCount: number
  }
}

export function TemplatePreviewCard({ preview }: TemplatePreviewCardProps) {
  return (
    <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Template preview</h2>
        <p className="text-sm text-slate-500">Quick summary of what will be saved.</p>
      </div>

      <div className="space-y-3 text-sm text-slate-600">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</p>
          <p className="mt-1 text-slate-900">{preview.name || 'Untitled assessment'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</p>
          <p className="mt-1 whitespace-pre-line text-slate-600">
            {preview.description || 'No description provided yet.'}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Questions</p>
          <p className="mt-1 text-slate-900">{preview.questionCount}</p>
        </div>
      </div>
    </aside>
  )
}
