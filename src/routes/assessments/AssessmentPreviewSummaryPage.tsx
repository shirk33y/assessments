import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'

interface SummaryState {
  templateName?: string
  totalQuestions?: number
  templateDescription?: string
}

export function AssessmentPreviewSummaryPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as SummaryState | undefined) ?? {}

  const templateName = state.templateName ?? 'Untitled template'
  const templateDescription = state.templateDescription ?? ''
  const totalQuestions = state.totalQuestions ?? 0

  const handleBackToAssessments = () => {
    void navigate('/assessments')
  }

  const handleUpdateTemplate = () => {
    if (templateId) {
      void navigate(`/assessments/${templateId}/edit`)
    } else {
      handleBackToAssessments()
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 text-center">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Preview complete</p>
          <h1 className="text-xl font-semibold text-slate-900">{templateName}</h1>
          {templateDescription ? (
            <p className="text-sm leading-relaxed text-slate-500">{templateDescription}</p>
          ) : null}
        </header>

        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Questions</span>
            <span className="font-semibold text-slate-900">{totalQuestions}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button className="bg-blue-600 hover:bg-blue-500" onClick={handleBackToAssessments}>
            Back to assessments
          </Button>
          <Button variant="outline" onClick={handleUpdateTemplate}>
            Update template
          </Button>
        </div>
      </div>
    </div>
  )
}
