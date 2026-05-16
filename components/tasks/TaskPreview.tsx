"use client"

import { DynamicAssessment } from "@/components/assessments/DynamicAssessment"
import { getPracticeAssessmentContent, normalizeAssessmentContent } from "@/lib/assessment-json"

type ExercisePreview = {
  id: string
  exercise_type: string | null
  block: string | null
  description: string | null
  component_key: string | null
}

export type TaskPreviewQuestion = {
  id: string
  exercise_id: string
  sort_order: number
  points?: number | null
  exercise?: ExercisePreview | ExercisePreview[] | null
}

export type TaskPreviewData = {
  id: string
  title: string
  description: string | null
  task_type: string
  mode: string
  attempts_allowed: number
  duration_minutes: number | null
  status: string
  available_from: string | null
  available_until: string | null
  content_json?: unknown
  settings_json?: unknown
  questions: TaskPreviewQuestion[]
}

function getExercise(question: TaskPreviewQuestion) {
  return Array.isArray(question.exercise) ? question.exercise[0] : question.exercise
}

function questionTitle(question: TaskPreviewQuestion, index: number) {
  const exercise = getExercise(question)
  return exercise?.description || exercise?.component_key || exercise?.block || `Pregunta ${index + 1}`
}

function questionMeta(question: TaskPreviewQuestion) {
  const exercise = getExercise(question)
  if (!exercise) return question.exercise_id
  return `${exercise.exercise_type ?? "Sin tipo"} · ${exercise.block ?? "Sin bloque"} · ${question.exercise_id}`
}

export function TaskPreview({ task }: { task: TaskPreviewData }) {
  if (task.content_json) {
    const content = normalizeAssessmentContent(task.content_json, task.title)
    const practiceEnabled = content.practice?.enabled ?? true
    const practiceContent = getPracticeAssessmentContent(content, `Practica: ${task.title}`)

    return (
      <div className="space-y-6">
        <DynamicAssessment
          content={content}
          settings={task.settings_json}
          displayTitle={task.title}
          previewMode
          submitTarget="none"
        />

        {practiceEnabled && (
          <section className="rounded-2xl border bg-emerald-50/50 p-5">
            <div className="mb-4">
              <div className="text-sm font-semibold text-slate-900">Practica derivada</div>
              <p className="text-xs text-muted-foreground">
                Usa preguntas similares con datos cambiados y guarda hasta 3 intentos.
              </p>
            </div>
            <DynamicAssessment
              content={practiceContent}
              settings={{ ...(typeof task.settings_json === "object" && task.settings_json ? task.settings_json : {}), mode: "practice" }}
              displayTitle={practiceContent.title || `Practica: ${task.title}`}
              previewMode
              submitTarget="none"
            />
          </section>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Vista previa de tarea
            </p>
            <h1 className="mt-1 text-2xl font-black text-slate-900">{task.title}</h1>
            {task.description && (
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{task.description}</p>
            )}
          </div>
          <div className="rounded-xl border bg-background px-3 py-2 text-xs text-muted-foreground">
            {task.task_type} · {task.mode} · {task.status}
          </div>
        </div>

        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Intentos</div>
            <div className="font-semibold">{task.attempts_allowed}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Duracion</div>
            <div className="font-semibold">{task.duration_minutes ?? "Sin limite"} min</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Preguntas</div>
            <div className="font-semibold">{task.questions.length}</div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="text-sm font-semibold text-slate-900">Entrega formal</div>
        {task.questions.map((question, index) => (
          <div key={question.id} className="rounded-2xl border bg-card p-5">
            <div className="mb-3">
              <div className="text-sm font-semibold text-emerald-700">Pregunta {index + 1}</div>
              <div className="mt-1 font-medium">{questionTitle(question, index)}</div>
              <div className="mt-1 text-xs text-muted-foreground">{questionMeta(question)}</div>
            </div>
            <div className="min-h-24 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Campo de respuesta del estudiante
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Practica derivada</div>
          <p className="text-xs text-muted-foreground">
            La practica usa las mismas preguntas, se guarda aparte y no reemplaza la entrega.
          </p>
        </div>
        {task.questions.map((question, index) => (
          <div key={`practice-${question.id}`} className="rounded-2xl border bg-emerald-50/50 p-5">
            <div className="mb-3">
              <div className="text-sm font-semibold text-emerald-700">Practica {index + 1}</div>
              <div className="mt-1 font-medium">{questionTitle(question, index)}</div>
            </div>
            <div className="min-h-20 rounded-md border bg-white px-3 py-2 text-sm text-muted-foreground">
              Resolucion de practica
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm text-muted-foreground">
              <span className="h-4 w-4 rounded border" />
              Lo resolvi correctamente
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
