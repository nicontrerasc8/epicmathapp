"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, CheckCircle2, ListTodo } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { fetchStudentSession, type StudentSessionData } from "@/lib/student-session-client"
import { useInstitution } from "@/components/institution-provider"
import { isTaskAvailableNow } from "@/lib/task-availability"
import { Button } from "@/components/ui/button"
import { DynamicAssessment } from "@/components/assessments/DynamicAssessment"

type QuestionRow = {
  id: string
  exercise_id: string
  sort_order: number
  points: number
  exercise:
    | {
        id: string
        exercise_type: string | null
        block: string | null
        description: string | null
        component_key: string | null
      }
    | {
        id: string
        exercise_type: string | null
        block: string | null
        description: string | null
        component_key: string | null
      }[]
    | null
}

type TaskRow = {
  id: string
  title: string
  description: string | null
  mode: string
  attempts_allowed: number
  duration_minutes: number | null
  status: string
  active: boolean
  classroom_id: string
  available_from: string | null
  available_until: string | null
  content_json: unknown
  settings_json: unknown
  questions: QuestionRow[]
}

type AttemptRow = {
  id: string
  attempt_number: number
  answers: Record<string, string> | null
  status: string
  submitted_at: string | null
}

function questionTitle(question: QuestionRow, index: number) {
  const exercise = Array.isArray(question.exercise) ? question.exercise[0] : question.exercise
  return exercise?.description || exercise?.component_key || exercise?.block || `Pregunta ${index + 1}`
}

export default function StudentTaskPage() {
  const params = useParams()
  const taskId = typeof params.id === "string" ? params.id : null
  const supabase = useMemo(() => createClient(), [])
  const institution = useInstitution()
  const startedAtRef = useRef(Date.now())

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [task, setTask] = useState<TaskRow | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [classroomId, setClassroomId] = useState<string | null>(null)
  const [attempts, setAttempts] = useState<AttemptRow[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!institution?.id || !taskId) return
      setLoading(true)
      setError(null)

      const session: StudentSessionData | null = await fetchStudentSession(institution.id)
      if (!session?.student_id || !session?.classroom_id) {
        setError("No se encontro una sesion valida del estudiante.")
        setLoading(false)
        return
      }

      setStudentId(session.student_id)
      setClassroomId(session.classroom_id)

      const [{ data, error: taskError }, { data: attemptData, error: attemptError }] = await Promise.all([
        supabase
          .from("edu_tasks")
          .select(`
            id,
            title,
            description,
            mode,
            attempts_allowed,
            duration_minutes,
            status,
            active,
            classroom_id,
            available_from,
            available_until,
            content_json,
            settings_json,
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
          .eq("id", taskId)
          .eq("classroom_id", session.classroom_id)
          .maybeSingle(),
        supabase
          .from("edu_student_tasks")
          .select("id, attempt_number, answers, status, submitted_at")
          .eq("task_id", taskId)
          .eq("student_id", session.student_id)
          .eq("classroom_id", session.classroom_id)
          .order("attempt_number", { ascending: false }),
      ])

      if (taskError || !data) {
        setError(taskError?.message || "No se encontro la tarea asignada.")
        setLoading(false)
        return
      }
      if (attemptError) {
        setError(attemptError.message)
        setLoading(false)
        return
      }

      const normalizedTask = {
        ...(data as any),
        questions: [...((data as any).questions ?? [])].sort(
          (a: QuestionRow, b: QuestionRow) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
        ),
      } as TaskRow

      setTask(normalizedTask)
      setAttempts((attemptData ?? []) as AttemptRow[])
      setLoading(false)
    }

    load()
  }, [institution?.id, supabase, taskId])

  const attemptsUsed = attempts.length
  const canSubmit = task && isTaskAvailableNow(task) && attemptsUsed < task.attempts_allowed
  const latestAttempt = attempts[0] ?? null

  const submitTask = async () => {
    if (!task || !studentId || !classroomId || !canSubmit) return
    setSubmitting(true)
    setError(null)

    try {
      const maxScore = task.questions.reduce((acc, question) => acc + Number(question.points ?? 1), 0)
      const { error } = await supabase.from("edu_student_tasks").insert({
        task_id: task.id,
        student_id: studentId,
        classroom_id: classroomId,
        attempt_number: attemptsUsed + 1,
        answers,
        max_score: maxScore,
        time_seconds: Math.round((Date.now() - startedAtRef.current) / 1000),
        submitted_at: new Date().toISOString(),
        status: "submitted",
      })
      if (error) throw error
      setSubmitted(true)
    } catch (error: any) {
      setError(error?.message || "No se pudo entregar la tarea.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!taskId) return <div className="p-6 text-red-500">ID de tarea invalido.</div>
  if (loading) return <div className="p-6">Cargando tarea...</div>

  if (error || !task) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border bg-card p-6">
          <p className="text-red-500">{error ?? "No se pudo cargar la tarea."}</p>
          <Link href="/student/tasks" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <ArrowLeft className="h-4 w-4" />
            Volver a tareas
          </Link>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border bg-card p-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-600" />
          <p className="text-xl font-bold">Tarea entregada</p>
          <div className="mt-5 flex justify-center gap-3">
            <Link href="/student/tasks">
              <Button variant="outline">Volver</Button>
            </Link>
            <Link href={`/student/tasks/${task.id}/practice`}>
              <Button>Practicar</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!canSubmit) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border bg-card p-6">
          <p className="text-lg font-semibold text-slate-900">
            {latestAttempt ? "Ya entregaste esta tarea." : "Esta tarea no esta disponible."}
          </p>
          {latestAttempt?.submitted_at && (
            <p className="mt-2 text-sm text-slate-600">Ultima entrega: {new Date(latestAttempt.submitted_at).toLocaleString("es-PE")}</p>
          )}
          <div className="mt-5 flex gap-3">
            <Link href="/student/tasks">
              <Button variant="outline">Volver</Button>
            </Link>
            <Link href={`/student/tasks/${task.id}/practice`}>
              <Button>Practicar</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <Link href="/student/tasks" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
        <ArrowLeft className="h-4 w-4" />
        Volver a tareas
      </Link>

      <section className="rounded-2xl border bg-card p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-100 p-3">
            <ListTodo className="h-6 w-6 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-2xl font-black">{task.title}</h1>
            {task.description && <p className="mt-2 text-sm text-muted-foreground">{task.description}</p>}
            <p className="mt-2 text-xs text-muted-foreground">
              Intento {attemptsUsed + 1} de {task.attempts_allowed}
            </p>
          </div>
        </div>
      </section>

      {task.content_json ? (
        <DynamicAssessment
          content={task.content_json}
          settings={task.settings_json}
          taskId={task.id}
          classroomId={classroomId ?? undefined}
          studentId={studentId ?? undefined}
          displayTitle={task.title}
          submitTarget="task"
        />
      ) : (
        <section className="space-y-4">
          {task.questions.map((question, index) => (
            <div key={question.id} className="rounded-2xl border bg-card p-5">
              <div className="mb-3">
                <div className="text-sm font-semibold text-emerald-700">Pregunta {index + 1}</div>
                <div className="mt-1 font-medium">{questionTitle(question, index)}</div>
              </div>
              <textarea
                className="min-h-28 w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Escribe tu respuesta o procedimiento..."
                value={answers[question.id] ?? ""}
                onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
              />
            </div>
          ))}
        </section>
      )}

      {!task.content_json && (
        <div className="flex justify-end gap-3">
          <Link href={`/student/tasks/${task.id}/practice`}>
            <Button type="button" variant="outline">Practicar aparte</Button>
          </Link>
          <Button onClick={submitTask} disabled={submitting}>
            {submitting ? "Entregando..." : "Entregar tarea"}
          </Button>
        </div>
      )}
    </div>
  )
}
