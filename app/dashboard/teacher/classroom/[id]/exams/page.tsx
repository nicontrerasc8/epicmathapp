"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ExamRegistry } from "@/components/exams"
import { createClient } from "@/utils/supabase/client"
import { PageHeader } from "@/components/dashboard/core"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useInstitution } from "@/components/institution-provider"
import {
  CalendarClock,
  FileText,
  Loader2,
  MonitorPlay,
  Plus,
  Search,
  Trash2,
  X,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  formatDateTimeLabel,
  getExamWindowState,
} from "@/lib/exam-availability"

type ExamCatalogRow = {
  id: string
  title: string
  description: string | null
  exam_type: string
  block: string | null
  component_key: string
  duration_minutes: number | null
  institution_id: string | null
  active: boolean
}

type ClassroomExamRow = {
  id: string
  exam_id: string
  active: boolean
  order: number
  available_from: string | null
  available_until: string | null
  created_at: string
  exam: ExamCatalogRow | null
}

function toDatetimeInputValue(value: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function fromDatetimeInputValue(value: string) {
  return value ? new Date(value).toISOString() : null
}

function getSortableTime(value: string | null) {
  if (!value) return Number.POSITIVE_INFINITY
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time
}

function sortClassroomExamsByTime(rows: ClassroomExamRow[]) {
  return [...rows].sort((a, b) => {
    const fromDiff = getSortableTime(a.available_from) - getSortableTime(b.available_from)
    if (fromDiff !== 0) return fromDiff

    const untilDiff = getSortableTime(a.available_until) - getSortableTime(b.available_until)
    if (untilDiff !== 0) return untilDiff

    if (a.order !== b.order) return a.order - b.order

    const createdDiff = getSortableTime(a.created_at) - getSortableTime(b.created_at)
    if (createdDiff !== 0) return createdDiff

    return (a.exam?.title ?? "").localeCompare(b.exam?.title ?? "", "es", {
      sensitivity: "base",
    })
  })
}

function AddExamsModal({
  classroomId,
  assignedIds,
  institutionId,
  onClose,
  onAdded,
}: {
  classroomId: string
  assignedIds: Set<string>
  institutionId: string | undefined
  onClose: () => void
  onAdded: () => void
}) {
  const [exams, setExams] = useState<ExamCatalogRow[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      let query = supabase
        .from("edu_exams")
        .select(
          "id, title, description, exam_type, block, component_key, duration_minutes, institution_id, active",
        )
        .eq("active", true)

      if (institutionId) {
        query = query.or(`institution_id.eq.${institutionId},institution_id.is.null`)
      }

      const { data } = await query
        .order("exam_type", { ascending: true })
        .order("block", { ascending: true })
        .order("title", { ascending: true })

      setExams((data ?? []) as ExamCatalogRow[])
      setLoading(false)
    }

    load()
  }, [institutionId])

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return exams

    return exams.filter((exam) => {
      const haystack = `${exam.title} ${exam.exam_type} ${exam.block ?? ""} ${exam.component_key}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [exams, search])

  const assignExam = async (examId: string) => {
    setAddingId(examId)
    const supabase = createClient()
    await supabase.from("edu_exam_assignments").insert({
      classroom_id: classroomId,
      exam_id: examId,
      active: true,
      order: 0,
    })
    setAddingId(null)
    onAdded()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-[82vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="font-semibold">Agregar examenes al salon</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="border-b px-5 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por titulo, tipo, bloque o component key..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cargando examenes...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No se encontraron examenes
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((exam) => {
                const assigned = assignedIds.has(exam.id)

                return (
                  <div key={exam.id} className="flex items-center gap-3 px-5 py-4 hover:bg-muted/30">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{exam.title}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{exam.exam_type}</span>
                        <span>·</span>
                        <span>{exam.block || "Sin bloque"}</span>
                        {exam.duration_minutes != null ? (
                          <>
                            <span>·</span>
                            <span>{exam.duration_minutes} min</span>
                          </>
                        ) : null}
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">
                        {exam.component_key}
                      </div>
                    </div>

                    {assigned ? (
                      <Badge variant="secondary">Ya asignado</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={addingId === exam.id}
                        onClick={() => assignExam(exam.id)}
                      >
                        {addingId === exam.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Asignar
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TeacherClassroomExamsPage() {
  const params = useParams()
  const classroomId = params.id as string
  const institution = useInstitution()

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [classroomLabel, setClassroomLabel] = useState("Aula")
  const [rows, setRows] = useState<ClassroomExamRow[]>([])
  const [scheduleDrafts, setScheduleDrafts] = useState<
    Record<string, { available_from: string; available_until: string }>
  >({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [previewRow, setPreviewRow] = useState<ClassroomExamRow | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    setLoading(true)

    const [{ data: classroom }, { data, error }] = await Promise.all([
      supabase.from("edu_classrooms").select("grade, section").eq("id", classroomId).single(),
      supabase
        .from("edu_exam_assignments")
        .select(`
          id,
          exam_id,
          active,
          order,
          available_from,
          available_until,
          created_at,
          exam:edu_exams (
            id,
            title,
            description,
            exam_type,
            block,
            component_key,
            duration_minutes,
            institution_id,
            active
          )
        `)
        .eq("classroom_id", classroomId)
        .order("order", { ascending: true })
        .order("created_at", { ascending: true }),
    ])

    if (classroom?.grade) {
      setClassroomLabel(
        `${classroom.grade}${classroom.section ? ` ${classroom.section}` : ""}`.trim(),
      )
    }

    if (error) {
      setRows([])
      setMessage({ type: "error", text: "No se pudieron cargar los examenes." })
      setLoading(false)
      return
    }

    const normalizedRows: ClassroomExamRow[] = ((data ?? []) as any[])
      .map((row) => {
        const exam = Array.isArray(row.exam) ? row.exam[0] : row.exam
        return {
          id: row.id,
          exam_id: row.exam_id,
          active: Boolean(row.active),
          order: Number(row.order ?? 0),
          available_from: row.available_from ?? null,
          available_until: row.available_until ?? null,
          created_at: row.created_at,
          exam: exam ?? null,
        }
      })
      .filter((row) => {
        if (!institution?.id) return true
        return !row.exam?.institution_id || row.exam.institution_id === institution.id
      })

    const sortedRows = sortClassroomExamsByTime(normalizedRows)

    setRows(sortedRows)
    setScheduleDrafts(
      Object.fromEntries(
        sortedRows.map((row) => [
          row.id,
          {
            available_from: toDatetimeInputValue(row.available_from),
            available_until: toDatetimeInputValue(row.available_until),
          },
        ]),
      ),
    )
    setLoading(false)
  }, [classroomId, institution?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(null), 3000)
    return () => clearTimeout(timer)
  }, [message])

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return sortClassroomExamsByTime(rows)

    return sortClassroomExamsByTime(
      rows.filter((row) => {
        const exam = row.exam
        const haystack = `${exam?.title ?? ""} ${exam?.exam_type ?? ""} ${exam?.block ?? ""} ${exam?.component_key ?? ""}`.toLowerCase()
        return haystack.includes(needle)
      }),
    )
  }, [rows, search])

  const assignedIds = useMemo(
    () => new Set(rows.map((row) => row.exam_id)),
    [rows],
  )

  const updateAssignment = async (
    id: string,
    payload: Partial<Pick<ClassroomExamRow, "active" | "available_from" | "available_until" | "order">>,
  ) => {
    const supabase = createClient()
    setUpdatingId(id)

    const { error } = await supabase.from("edu_exam_assignments").update(payload).eq("id", id)

    if (error) {
      setMessage({ type: "error", text: "No se pudo actualizar el examen." })
    } else {
      setMessage({ type: "success", text: "Examen actualizado." })
      await fetchData()
    }

    setUpdatingId(null)
  }

  const deleteAssignment = async (id: string) => {
    const supabase = createClient()
    setUpdatingId(id)

    const { error } = await supabase.from("edu_exam_assignments").delete().eq("id", id)

    if (error) {
      setMessage({ type: "error", text: "No se pudo eliminar el examen del salon." })
    } else {
      setRows((current) => current.filter((row) => row.id !== id))
      setMessage({ type: "success", text: "Examen eliminado del salon." })
    }

    setUpdatingId(null)
  }

  const saveSchedule = async (rowId: string) => {
    const draft = scheduleDrafts[rowId]
    if (!draft) return

    await updateAssignment(rowId, {
      available_from: fromDatetimeInputValue(draft.available_from),
      available_until: fromDatetimeInputValue(draft.available_until),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Examenes del salon"
        description={`Programa y controla examenes para ${classroomLabel}`}
        breadcrumbs={[
          { label: "Mis Clases", href: "/dashboard/teacher" },
          { label: classroomLabel, href: `/dashboard/teacher/classroom/${classroomId}` },
          { label: "Examenes" },
        ]}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar examenes..."
          />
        </div>

        <Button variant="outline" asChild>
          <Link href={`/dashboard/teacher/classroom/${classroomId}/performance/exams`}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>

        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar examenes
        </Button>
      </div>

      {message ? (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            message.type === "error"
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
          )}
        >
          {message.text}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Cargando examenes...
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <div className="font-medium text-muted-foreground">
            {search ? "No se encontraron examenes" : "No hay examenes asignados"}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRows.map((row) => {
            const draft = scheduleDrafts[row.id] ?? {
              available_from: "",
              available_until: "",
            }
            const state = getExamWindowState(row)
            const stateTone =
              state === "open"
                ? "bg-emerald-500/15 text-emerald-700"
                : state === "upcoming"
                  ? "bg-sky-500/15 text-sky-700"
                  : state === "closed"
                    ? "bg-amber-500/15 text-amber-700"
                    : "bg-slate-500/15 text-slate-700"

            return (
              <div key={row.id} className="rounded-2xl border bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">{row.exam?.title ?? "Examen"}</h2>
                      <Badge className={stateTone}>{state}</Badge>
                      {!row.active ? <Badge variant="outline">Inactivo</Badge> : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{row.exam?.exam_type ?? "Sin tipo"}</span>
                      <span>·</span>
                      <span>{row.exam?.block || "Sin bloque"}</span>
                      {row.exam?.duration_minutes != null ? (
                        <>
                          <span>·</span>
                          <span>{row.exam.duration_minutes} min</span>
                        </>
                      ) : null}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {row.exam?.description || "Sin descripcion"}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewRow(row)}
                      disabled={!row.exam?.component_key}
                    >
                      <MonitorPlay className="mr-2 h-4 w-4" />
                      Previsualizar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateAssignment(row.id, { active: !row.active })}
                      disabled={updatingId === row.id}
                    >
                      {row.active ? "Desactivar" : "Activar"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteAssignment(row.id)}
                      disabled={updatingId === row.id}
                    >
                      {updatingId === row.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Orden
                    </label>
                    <Input
                      type="number"
                      defaultValue={row.order}
                      onBlur={(event) =>
                        updateAssignment(row.id, { order: Number(event.target.value || 0) })
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Disponible desde
                    </label>
                    <Input
                      type="datetime-local"
                      value={draft.available_from}
                      onChange={(event) =>
                        setScheduleDrafts((current) => ({
                          ...current,
                          [row.id]: {
                            ...draft,
                            available_from: event.target.value,
                          },
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Disponible hasta
                    </label>
                    <Input
                      type="datetime-local"
                      value={draft.available_until}
                      onChange={(event) =>
                        setScheduleDrafts((current) => ({
                          ...current,
                          [row.id]: {
                            ...draft,
                            available_until: event.target.value,
                          },
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      className="w-full"
                      onClick={() => saveSchedule(row.id)}
                      disabled={updatingId === row.id}
                    >
                      {updatingId === row.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CalendarClock className="mr-2 h-4 w-4" />
                      )}
                      Guardar horario
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Desde: {formatDateTimeLabel(row.available_from)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Hasta: {formatDateTimeLabel(row.available_until)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAddModal ? (
        <AddExamsModal
          classroomId={classroomId}
          assignedIds={assignedIds}
          institutionId={institution?.id}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false)
            fetchData()
            setMessage({ type: "success", text: "Examen asignado correctamente." })
          }}
        />
      ) : null}

      {previewRow?.exam ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <MonitorPlay className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Vista previa del examen</span>
                </div>
                <div className="mt-1 truncate text-sm text-muted-foreground">
                  {previewRow.exam.title}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setPreviewRow(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <ExamRegistry
                componentKey={previewRow.exam.component_key}
                examId={previewRow.exam.id}
                assignmentId={previewRow.id}
                classroomId={classroomId}
                displayTitle={previewRow.exam.title}
                previewMode
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
