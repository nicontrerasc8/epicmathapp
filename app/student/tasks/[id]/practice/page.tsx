"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { fetchStudentSession, type StudentSessionData } from "@/lib/student-session-client"
import { useInstitution } from "@/components/institution-provider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DynamicAssessment } from "@/components/assessments/DynamicAssessment"

type QuestionRow = {
  id: string
  exercise_id: string
  sort_order: number
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
  classroom_id: string
  content_json: unknown
  settings_json: unknown
  questions: QuestionRow[]
}

function questionTitle(question: QuestionRow, index: number) {
  const exercise = Array.isArray(question.exercise) ? question.exercise[0] : question.exercise
  return exercise?.description || exercise?.component_key || exercise?.block || `Pregunta ${index + 1}`
}

export default function StudentTaskPracticePage() {
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
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [correctMap, setCorrectMap] = useState<Record<string, boolean>>({})
  const [practiceAttemptsUsed, setPracticeAttemptsUsed] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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

      const [{ data, error }, { count, error: attemptsError }] = await Promise.all([
        supabase
          .from("edu_tasks")
          .select(`
            id,
            title,
            classroom_id,
            content_json,
            settings_json,
            questions:edu_task_questions (
              id,
              exercise_id,
              sort_order,
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
          .from("edu_task_practice_sessions")
          .select("*", { count: "exact", head: true })
          .eq("task_id", taskId)
          .eq("student_id", session.student_id)
          .eq("classroom_id", session.classroom_id),
      ])

      if (error || !data) {
        setError(error?.message || "No se encontro la tarea.")
        setLoading(false)
        return
      }
      if (attemptsError) {
        setError(attemptsError.message)
        setLoading(false)
        return
      }

      setTask({
        ...(data as any),
        questions: [...((data as any).questions ?? [])].sort(
          (a: QuestionRow, b: QuestionRow) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
        ),
      } as TaskRow)
      setPracticeAttemptsUsed(count ?? 0)
      setLoading(false)
    }

    load()
  }, [institution?.id, supabase, taskId])

  const savePractice = async () => {
    if (!task || !studentId || !classroomId) return
    if (practiceAttemptsUsed >= 3) {
      setError("Ya usaste los intentos de practica.")
      return
    }
    setSaving(true)
    setError(null)

    try {
      const total = task.questions.length
      const correctCount = task.questions.filter((question) => correctMap[question.id]).length
      const wrongCount = total - correctCount
      const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0
      const { data: session, error: sessionError } = await supabase
        .from("edu_task_practice_sessions")
        .insert({
          task_id: task.id,
          student_id: studentId,
          classroom_id: classroomId,
          mode: "reinforcement",
          total_questions: total,
          correct_count: correctCount,
          wrong_count: wrongCount,
          accuracy,
          ended_at: new Date().toISOString(),
        })
        .select("id")
        .single()

      if (sessionError) throw sessionError

      const elapsed = Math.round((Date.now() - startedAtRef.current) / 1000)
      const answerRows = task.questions.map((question) => ({
        practice_session_id: session.id,
        exercise_id: question.exercise_id,
        answer: answers[question.id] ?? "",
        correct: Boolean(correctMap[question.id]),
        time_seconds: Math.round(elapsed / Math.max(1, total)),
      }))

      const { error: answersError } = await supabase.from("edu_task_practice_answers").insert(answerRows)
      if (answersError) throw answersError
      setPracticeAttemptsUsed((current) => current + 1)
      setSaved(true)
    } catch (error: any) {
      setError(error?.message || "No se pudo guardar la practica.")
    } finally {
      setSaving(false)
    }
  }

  if (!taskId) return <div className="p-6 text-red-500">ID de tarea invalido.</div>
  if (loading) return <div className="p-6">Cargando practica...</div>

  if (error || !task) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border bg-card p-6">
          <p className="text-red-500">{error ?? "No se pudo cargar la practica."}</p>
          <Link href="/student/tasks" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <ArrowLeft className="h-4 w-4" />
            Volver a tareas
          </Link>
        </div>
      </div>
    )
  }

  if (saved) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border bg-card p-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-600" />
          <p className="text-xl font-bold">Practica guardada</p>
          <Link href="/student/tasks" className="mt-5 inline-flex">
            <Button>Volver a tareas</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <Link href={`/student/tasks/${task.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
        <ArrowLeft className="h-4 w-4" />
        Volver a la tarea
      </Link>

      <section className="rounded-2xl border bg-card p-6">
        <h1 className="text-2xl font-black">Practica: {task.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Esta practica es independiente de la entrega formal.</p>
        <p className="mt-2 text-xs text-muted-foreground">Intento {Math.min(practiceAttemptsUsed + 1, 3)} de 3</p>
      </section>

      {practiceAttemptsUsed >= 3 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Ya usaste los intentos de practica.
        </div>
      )}

      {task.content_json ? (
        <DynamicAssessment
          content={task.content_json}
          settings={task.settings_json}
          taskId={task.id}
          classroomId={classroomId ?? undefined}
          studentId={studentId ?? undefined}
          displayTitle={`Practica: ${task.title}`}
          attemptLocked={practiceAttemptsUsed >= 3}
          submitTarget="practice"
        />
      ) : (
        <>
          <section className="space-y-4">
            {task.questions.map((question, index) => (
              <div key={question.id} className="rounded-2xl border bg-card p-5">
                <div className="mb-3">
                  <div className="text-sm font-semibold text-emerald-700">Pregunta {index + 1}</div>
                  <div className="mt-1 font-medium">{questionTitle(question, index)}</div>
                </div>
                <textarea
                  className="min-h-28 w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Resuelve y anota tu procedimiento..."
                  value={answers[question.id] ?? ""}
                  onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                />
                <label className="mt-3 flex items-center gap-3 text-sm">
                  <Checkbox
                    checked={Boolean(correctMap[question.id])}
                    onCheckedChange={(checked) => setCorrectMap((current) => ({ ...current, [question.id]: Boolean(checked) }))}
                  />
                  Lo resolvi correctamente
                </label>
              </div>
            ))}
          </section>

          <div className="flex justify-end">
            <Button onClick={savePractice} disabled={saving || practiceAttemptsUsed >= 3}>
              {saving ? "Guardando..." : "Guardar practica"}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
