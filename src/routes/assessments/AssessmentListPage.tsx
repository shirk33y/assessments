import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MoreHorizontal } from 'lucide-react'

import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import type { Tables } from '@/lib/supabase.types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type TemplateRow = Pick<
  Tables<'assessment_templates'>,
  'id' | 'name' | 'description' | 'updated_at' | 'created_at' | 'owner_id'
> & {
  questionCount: number
}

const PAGE_SIZE = 8

export function AssessmentListPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [page, setPage] = useState(1)
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const totalPages = useMemo(() => {
    if (!totalCount) return 1
    return Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  }, [totalCount])

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true)
      setError(null)

      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      let query = supabase
        .from('assessment_templates')
        .select('id, name, description, updated_at, created_at, owner_id', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .range(from, to)

      const ownerId = session?.user?.id
      if (ownerId) {
        query = query.eq('owner_id', ownerId)
      }

      const { data, error: fetchError, count } = await query

      if (fetchError) {
        console.error('Failed to load templates', fetchError)
        setError(fetchError.message)
        setTemplates([])
        setTotalCount(0)
        setLoading(false)
        return
      }

      const templateRows: TemplateRow[] = (data ?? []).map((template) => ({
        ...template,
        questionCount: 0,
      }))
      const templateIds = templateRows.map((template) => template.id).filter(Boolean)

      const questionCounts: Record<string, number> = {}
      if (templateIds.length > 0) {
        const { data: questionRows, error: questionError } = await supabase
          .from('assessment_questions')
          .select('template_id')
          .in('template_id', templateIds)

        if (questionError) {
          console.warn('Failed to load question counts', questionError)
        } else if (questionRows) {
          for (const row of questionRows) {
            const templateId = row?.template_id as string | null | undefined
            if (!templateId) continue
            questionCounts[templateId] = (questionCounts[templateId] ?? 0) + 1
          }
        }
      }

      setTemplates(templateRows.map((template) => ({ ...template, questionCount: questionCounts[template.id] ?? 0 })))
      setTotalCount(count ?? templateRows.length)
      setLoading(false)
    }

    fetchTemplates().catch((fetchError) => {
      console.error('Unexpected error loading templates', fetchError)
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load assessments')
      setLoading(false)
    })
  }, [page, session?.user?.id])

  const handleNavigateToTemplate = (templateId: string) => {
    navigate(`/assessments/${templateId}/edit`)
  }

  const handlePrev = () => setPage((prev) => Math.max(1, prev - 1))
  const handleNext = () => setPage((prev) => Math.min(totalPages, prev + 1))

  const formatDate = (value: string | null | undefined) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">Assessments</h1>
          <p className="text-sm text-slate-500">
            Browse existing assessment templates, update their details, or create new ones for your
            team.
          </p>
        </div>
        <Button
          asChild
          className="bg-blue-600 text-white shadow-sm hover:bg-blue-500 focus-visible:ring-blue-500"
        >
          <Link to="/assessments/new">Create template</Link>
        </Button>
      </header>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-[32%] px-4 py-3 font-semibold">Name</th>
                <th className="w-[40%] px-4 py-3 font-semibold">Description</th>
                <th className="w-[72px] px-3 py-3 text-center font-semibold">Questions</th>
                <th className="w-[72px] px-3 py-3 text-center font-semibold">Invited</th>
                <th className="w-[72px] px-3 py-3 text-center font-semibold">Started</th>
                <th className="w-[88px] px-3 py-3 text-center font-semibold">Completed</th>
                <th className="w-[120px] px-4 py-3 font-semibold">Updated</th>
                <th className="w-[44px] px-2 py-3 text-right font-semibold"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading
                ? Array.from({ length: PAGE_SIZE }).map((_, index) => (
                    <tr key={index} className="h-[51px] min-h-[51px] animate-pulse align-middle">
                      <td className="w-[32%] px-4 py-2 align-middle">
                        <div className="h-4 w-32 rounded bg-slate-200" />
                      </td>
                      <td className="w-[40%] px-4 py-2 align-middle">
                        <div className="h-4 w-48 rounded bg-slate-200" />
                      </td>
                      {Array.from({ length: 3 }).map((__, metricIndex) => (
                        <td key={metricIndex} className="w-[72px] px-3 py-2 text-center align-middle">
                          <div className="mx-auto h-4 w-10 rounded bg-slate-200" />
                        </td>
                      ))}
                      <td className="w-[88px] px-3 py-2 text-center align-middle">
                        <div className="h-4 w-28 rounded bg-slate-200" />
                      </td>
                      <td className="w-[44px] px-2 py-2 text-right align-middle">
                        <div className="ml-auto h-8 w-8 rounded bg-slate-200" />
                      </td>
                    </tr>
                  ))
                : error
                  ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-sm text-rose-600">
                        {error}
                      </td>
                    </tr>
                    )
                  : templates.length === 0
                    ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                          No templates yet. Create your first assessment template to start collecting
                          evaluations.
                        </td>
                      </tr>
                      )
                    : (
                      templates.map((template) => (
                        <tr
                          key={template.id}
                          onClick={() => handleNavigateToTemplate(template.id)}
                          className="h-12 min-h-[48px] cursor-pointer align-middle bg-white transition hover:bg-slate-50"
                        >
                          <td className="w-[32%] px-4 py-2 align-middle font-semibold text-slate-900">
                            <span className="relative block max-w-full overflow-hidden whitespace-nowrap pr-6 text-sm after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-6 after:bg-gradient-to-r after:from-transparent after:to-white">
                              {template.name || 'Untitled template'}
                            </span>
                          </td>
                          <td className="w-[40%] px-4 py-2 align-middle text-slate-500">
                            <span className="relative block max-w-full overflow-hidden whitespace-nowrap pr-6 text-xs sm:text-sm after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-6 after:bg-gradient-to-r after:from-transparent after:to-white">
                              {template.description?.trim() || 'No description provided.'}
                            </span>
                          </td>
                          <td className="w-[72px] px-3 py-2 align-middle text-center font-medium text-slate-700">
                            {template.questionCount}
                          </td>
                          <td className="w-[72px] px-3 py-2 align-middle text-center text-slate-500">—</td>
                          <td className="w-[72px] px-3 py-2 align-middle text-center text-slate-500">—</td>
                          <td className="w-[88px] px-3 py-2 align-middle text-center text-slate-500">—</td>
                          <td className="w-[120px] px-4 py-2 align-middle text-slate-500">{formatDate(template.updated_at ?? template.created_at)}</td>
                          <td className="w-[44px] px-2 py-2 align-middle text-right" onClick={(event) => event.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex items-center rounded-md border border-transparent p-2 transition hover:border-slate-200 hover:bg-slate-100"
                                  aria-label={`More actions for ${template.name}`}
                                >
                                  <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => navigate(`/assessments/${template.id}/edit`)}>
                                  Edit template
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled className="text-slate-400">
                                  Invite participants
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled className="text-slate-400">
                                  Clone template
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem disabled variant="destructive" className="text-slate-400">
                                  Delete template
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    )}
            </tbody>
          </table>
        </div>
        <footer className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Showing {templates.length} of {totalCount ?? 0} templates
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrev} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={handleNext} disabled={page === totalPages}>
              Next
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}
