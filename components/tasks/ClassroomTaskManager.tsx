"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useInstitution } from "@/components/institution-provider"
import { PageHeader, RowActionsMenu, StatusBadge } from "@/components/dashboard/core"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  formatTaskDateTime,
  fromDatetimeInputValue,
  toDatetimeInputValue,
} from "@/lib/task-availability"
import { TaskPreview } from "@/components/tasks/TaskPreview"
import { parseAssessmentText, stringifyJson, withGeneratedPractice } from "@/lib/assessment-json"

type Message = { type: "success" | "error"; text: string }

type ExerciseOption = {
  id: string
  exercise_type: string | null
  block: string | null
  description: string | null
  component_key: string | null
}

type TaskQuestion = {
  id: string
  exercise_id: string
  sort_order: number
  points: number
  exercise?: ExerciseOption | ExerciseOption[] | null
}

type TaskRow = {
  id: string
  title: string
  description: string | null
  task_type: "task" | "homework" | "quiz"
  mode: "exam" | "practice"
  attempts_allowed: number
  duration_minutes: number | null
  status: "draft" | "published" | "closed" | "archived"
  available_from: string | null
  available_until: string | null
  content_json: unknown
  settings_json: unknown
  active: boolean
  order_index: number
  questions: TaskQuestion[]
  practice_count?: number
  practice_avg_accuracy?: number | null
  practice_completed_count?: number
}

const EMPTY_FORM = {
  title: "",
  description: "",
  duration_minutes: "",
  available_from: "",
  available_until: "",
  content_json: "",
}

const TASK_SETTINGS = {
  mode: "task",
  attemptsAllowed: 1,
  practiceAttemptsAllowed: 3,
  showScore: true,
  showReview: true,
  practiceEnabled: true,
}

export function ClassroomTaskManager({
  classroomId,
  owner,
}: {
  classroomId: string
  owner: "admin" | "teacher"
}) {
  const supabase = useMemo(() => createClient(), [])
  const institution = useInstitution()
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<Message | null>(null)
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [search, setSearch] = useState("")
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<TaskRow | null>(null)
  const [previewing, setPreviewing] = useState<TaskRow | null>(null)
  const [practiceStats, setPracticeStats] = useState<Record<string, { count: number; avgAccuracy: number | null; completed: number }>>({})

  const base =
    owner === "admin"
      ? `/dashboard/admin/classrooms/${classroomId}`
      : `/dashboard/teacher/classroom/${classroomId}`

  const loadTasks = async () => {
    const { data, error } = await supabase
      .from("edu_tasks")
      .select(`
        id,
        title,
        description,
        task_type,
        mode,
        attempts_allowed,
        duration_minutes,
        status,
        available_from,
        available_until,
        content_json,
        settings_json,
        active,
        order_index,
        questions:edu_task_questions (
          id,
          exercise_id,
          sort_order,
          points,
          exercise:edu_exercises (
            id,
            exercise_type,
            block,
            description,
            component_key
          )
        )
      `)
      .eq("classroom_id", classroomId)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: false })

    if (error) throw error

    const taskIds = ((data ?? []) as any[]).map((row) => row.id)
    const nextPracticeStats: Record<string, { count: number; avgAccuracy: number | null; completed: number }> = {}

    if (taskIds.length > 0) {
      const { data: practiceData, error: practiceError } = await supabase
        .from("edu_task_practice_sessions")
        .select("task_id, accuracy")
        .in("task_id", taskIds)

      if (practiceError) throw practiceError

      for (const row of (practiceData ?? []) as { task_id: string; accuracy: number | string | null }[]) {
        const stat = nextPracticeStats[row.task_id] ?? { count: 0, avgAccuracy: null, completed: 0 }
        const accuracy = row.accuracy == null ? null : Number(row.accuracy)
        stat.count += 1
        if (accuracy != null && Number.isFinite(accuracy)) {
          const previousTotal = (stat.avgAccuracy ?? 0) * stat.completed
          stat.completed += 1
          stat.avgAccuracy = Math.round((previousTotal + accuracy) / stat.completed)
        }
        nextPracticeStats[row.task_id] = stat
      }
    }

    setPracticeStats(nextPracticeStats)

    setTasks(
      ((data ?? []) as any[]).map((row) => ({
        ...row,
        practice_count: nextPracticeStats[row.id]?.count ?? 0,
        practice_avg_accuracy: nextPracticeStats[row.id]?.avgAccuracy ?? null,
        practice_completed_count: nextPracticeStats[row.id]?.completed ?? 0,
        questions: [...(row.questions ?? [])].sort(
          (a: TaskQuestion, b: TaskQuestion) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
        ),
      })) as TaskRow[],
    )
  }

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        await loadTasks()
      } catch (error: any) {
        setMessage({ type: "error", text: error?.message || "No se pudieron cargar las tareas." })
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [classroomId, institution?.id])

  const filteredTasks = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return tasks
    return tasks.filter((task) =>
      `${task.title} ${task.description ?? ""} ${task.task_type} ${task.mode} ${task.status}`
        .toLowerCase()
        .includes(needle),
    )
  }, [tasks, search])

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditing(null)
  }

  const openEdit = (task: TaskRow) => {
    setEditing(task)
    setForm({
      title: task.title,
      description: task.description ?? "",
      duration_minutes: task.duration_minutes != null ? String(task.duration_minutes) : "",
      available_from: toDatetimeInputValue(task.available_from),
      available_until: toDatetimeInputValue(task.available_until),
      content_json: task.content_json ? stringifyJson(task.content_json) : "",
    })
  }

  const saveTask = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage(null)
    setSaving(true)

    try {
      if (!form.title.trim()) throw new Error("Ingresa un titulo para la tarea.")
      const contentJson = form.content_json.trim()
        ? parseAssessmentText(form.content_json, form.title.trim())
        : null
      if (!contentJson) {
        throw new Error("Pega contenido JSON para la tarea.")
      }
      const contentWithPractice = withGeneratedPractice(contentJson, form.title.trim())

      const payload = {
        classroom_id: classroomId,
        institution_id: institution?.id ?? null,
        title: form.title.trim(),
        description: form.description.trim() || null,
        task_type: "task" as TaskRow["task_type"],
        mode: "exam" as TaskRow["mode"],
        attempts_allowed: 1,
        duration_minutes: form.duration_minutes.trim() ? Number(form.duration_minutes) : null,
        status: "published" as TaskRow["status"],
        available_from: fromDatetimeInputValue(form.available_from),
        available_until: fromDatetimeInputValue(form.available_until),
        content_json: contentWithPractice,
        settings_json: TASK_SETTINGS,
        active: true,
      }

      const taskId = editing?.id ?? crypto.randomUUID()

      if (editing) {
        const { error } = await supabase.from("edu_tasks").update(payload).eq("id", taskId)
        if (error) throw error
        const { error: deleteError } = await supabase.from("edu_task_questions").delete().eq("task_id", taskId)
        if (deleteError) throw deleteError
      } else {
        const { error } = await supabase.from("edu_tasks").insert({ id: taskId, ...payload })
        if (error) throw error
      }

      await loadTasks()
      resetForm()
      setMessage({ type: "success", text: editing ? "Tarea actualizada con practica derivada." : "Tarea creada con practica derivada." })
    } catch (error: any) {
      setMessage({ type: "error", text: error?.message || "No se pudo guardar la tarea." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tareas"
        description="Crea tareas por aula pegando contenido JSON y habilita su practica."
        breadcrumbs={[
          { label: owner === "admin" ? "Admin" : "Mis Clases", href: owner === "admin" ? "/dashboard/admin" : "/dashboard/teacher" },
          { label: "Aula", href: base },
          { label: "Tareas" },
        ]}
      />

      {message && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-3 rounded-xl border bg-card p-4">
          <Input
            placeholder="Buscar tareas..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {loading ? (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">Cargando tareas...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">No hay tareas creadas.</div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <div key={task.id} className="rounded-lg border px-4 py-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="font-semibold">{task.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Tarea - {task.content_json ? "JSON dinamico" : `${task.questions.length} pregunta${task.questions.length === 1 ? "" : "s"}`} - 1 intento - practica 3 intentos
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Disponible: {formatTaskDateTime(task.available_from)} - {formatTaskDateTime(task.available_until)}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border bg-background px-2.5 py-1">
                          Practicas: {practiceStats[task.id]?.count ?? task.practice_count ?? 0}
                        </span>
                        <span className="rounded-full border bg-background px-2.5 py-1">
                          Promedio: {practiceStats[task.id]?.avgAccuracy ?? task.practice_avg_accuracy ?? "-"}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full border px-2.5 py-1 text-xs font-medium">{task.status}</span>
                      <StatusBadge active={task.active} />
                      <RowActionsMenu
                        actions={[
                          { label: "Previsualizar", onClick: () => setPreviewing(task) },
                          { label: "Editar", onClick: () => openEdit(task) },
                          {
                            label: task.active ? "Desactivar" : "Activar",
                            onClick: async () => {
                              await supabase.from("edu_tasks").update({ active: !task.active }).eq("id", task.id)
                              await loadTasks()
                            },
                          },
                          {
                            label: "Eliminar",
                            variant: "destructive",
                            onClick: async () => {
                              await supabase.from("edu_tasks").delete().eq("id", task.id)
                              await loadTasks()
                            },
                          },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <form onSubmit={saveTask} className="space-y-4 rounded-xl border bg-card p-4">
          <div className="font-semibold">{editing ? "Editar tarea" : "Nueva tarea"}</div>

          <Input placeholder="Titulo" value={form.title} onChange={(event) => setForm((s) => ({ ...s, title: event.target.value }))} />
          <textarea
            className="min-h-20 w-full rounded-md border bg-white px-3 py-2 text-sm"
            placeholder="Descripcion"
            value={form.description}
            onChange={(event) => setForm((s) => ({ ...s, description: event.target.value }))}
          />

          <Input placeholder="Duracion minutos" value={form.duration_minutes} onChange={(event) => setForm((s) => ({ ...s, duration_minutes: event.target.value }))} />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs text-muted-foreground">
              Desde
              <Input type="datetime-local" value={form.available_from} onChange={(event) => setForm((s) => ({ ...s, available_from: event.target.value }))} />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Hasta
              <Input type="datetime-local" value={form.available_until} onChange={(event) => setForm((s) => ({ ...s, available_until: event.target.value }))} />
            </label>
          </div>

          <div className="space-y-3">
            <textarea
              className="min-h-72 w-full rounded-md border bg-white px-3 py-2 font-mono text-xs"
              placeholder="content_json: pega { questions: [...] }, un arreglo, o export const TAREA_01_QUESTIONS = [...]"
              value={form.content_json}
              onChange={(event) => setForm((s) => ({ ...s, content_json: event.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-3">
            {editing && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear tarea"}
            </Button>
          </div>
        </form>
      </div>

      {previewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <div className="text-lg font-semibold">Previsualizacion de tarea</div>
                <div className="text-sm text-muted-foreground">
                  Incluye entrega formal y practica derivada.
                </div>
              </div>
              <Button type="button" variant="outline" onClick={() => setPreviewing(null)}>
                Cerrar
              </Button>
            </div>
            <div className="overflow-y-auto p-5">
              <TaskPreview task={previewing} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
