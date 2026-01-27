"use client"

import { useParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { FormEvent } from "react"
import { createClient } from "@/utils/supabase/client"
import { PageHeader, StatCard, StatCardGrid } from "@/components/dashboard/core"

/* =========================
   TIPOS
========================= */
type AttemptRow = {
  correct: boolean
  created_at: string
  exercise: {
    id: string
    description: string | null
    exercise_type: string
  } | null
}

type ExerciseAgg = {
  id: string
  label: string
  type: string
  attempts: number
  correct: number
  incorrect: number
  accuracy: number
}

type AssignmentRow = {
  id: string
  exercise_id: string | null
  exercise: {
    id: string
    description: string | null
    exercise_type: string | null
  } | null
}

type FeedbackRow = {
  id: string
  comment: string
  created_at: string
  assignment_id: string
  teacher_id: string
  assignment: {
    exercise_id: string | null
    exercise: {
      id: string
      description: string | null
      exercise_type: string | null
    } | null
  } | null
}

/* =========================
   HELPERS PEDAGÓGICOS
========================= */
function getStudentLevel(accuracy: number, attempts: number) {
  if (attempts < 5) return { label: "Datos insuficientes", tone: "default" }
  if (accuracy >= 85) return { label: "Dominio alto", tone: "success" }
  if (accuracy >= 65) return { label: "En progreso", tone: "warning" }
  return { label: "En riesgo", tone: "danger" }
}

function getMotivationTag(attempts: number, accuracy: number) {
  if (attempts >= 15 && accuracy >= 70) return "🔥 Motivado"
  if (attempts >= 8) return "🙂 Estable"
  return "⚠️ Riesgo de desmotivación"
}

/* =========================
   PAGE
========================= */
export default function StudentPerformanceDetailPage() {
  const params = useParams() as { id?: string; studentId?: string }
  const classroomId = params?.id
  const studentId = params?.studentId

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [rows, setRows] = useState<AttemptRow[]>([])
  const [studentName, setStudentName] = useState("Estudiante")
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [feedbackRows, setFeedbackRows] = useState<FeedbackRow[]>([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [commentForm, setCommentForm] = useState({
    assignmentId: "",
    comment: "",
  })
  const [commentStatus, setCommentStatus] = useState<{
    tone: "error" | "success"
    message: string
  } | null>(null)
  const [commentBusy, setCommentBusy] = useState(false)

  const todayISO = new Date().toISOString().slice(0, 10)
  const thirtyDaysAgoISO = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const [dateFrom, setDateFrom] = useState(thirtyDaysAgoISO)
  const [dateTo, setDateTo] = useState(todayISO)

  const fetchAssignmentsAndFeedback = useCallback(async () => {
    if (!studentId || !classroomId) return

    const supabase = createClient()
    setFeedbackLoading(true)
    setFeedbackError(null)

    try {
      const [assignmentsResult, feedbackResult] = await Promise.all([
        supabase
          .from("edu_exercise_assignments")
          .select(
            "id, exercise_id, exercise:edu_exercises ( id, description, exercise_type )",
          )
          .eq("classroom_id", classroomId)
          .eq("active", true),
        supabase
          .from("edu_assignment_feedback")
          .select(
            "id, comment, created_at, assignment_id, teacher_id, assignment:edu_exercise_assignments ( exercise_id, exercise:edu_exercises ( id, description, exercise_type ) )",
          )
          .eq("student_id", studentId)
          .order("created_at", { ascending: false }),
      ])

      if (assignmentsResult.error) throw assignmentsResult.error
      if (feedbackResult.error) throw feedbackResult.error

      setAssignments((assignmentsResult.data ?? []) as any[])
      setFeedbackRows((feedbackResult.data ?? []) as any[])
    } catch (e) {
      console.error(e)
      setFeedbackError("No se pudieron cargar comentarios del docente.")
    } finally {
      setFeedbackLoading(false)
    }
  }, [studentId, classroomId])

  useEffect(() => {
    fetchAssignmentsAndFeedback()
  }, [fetchAssignmentsAndFeedback])

  /* =========================
     FETCH
  ========================= */
  useEffect(() => {
    if (!studentId || !classroomId) return

    const supabase = createClient()

    const load = async () => {
      setLoading(true)
      setErrorMsg(null)

      try {
        const fromISO = new Date(dateFrom + "T00:00:00.000Z").toISOString()
        const toISO = new Date(dateTo + "T23:59:59.999Z").toISOString()

        const [{ data: student }, { data, error }] = await Promise.all([
          supabase
            .from("edu_profiles")
            .select("first_name, last_name")
            .eq("id", studentId)
            .single(),
          supabase
            .from("edu_student_exercises")
            .select(`
              correct,
              created_at,
              exercise:edu_exercises ( id, description, exercise_type )
            `)
            .eq("student_id", studentId)
            .eq("classroom_id", classroomId)
            .gte("created_at", fromISO)
            .lte("created_at", toISO),
        ])

        if (error) throw error

        setStudentName(
          `${student?.first_name || ""} ${student?.last_name || ""}`.trim() ||
            "Estudiante"
        )
        setRows((data ?? []) as any[])
      } catch (e) {
        console.error(e)
        setErrorMsg("No se pudieron cargar los datos del alumno.")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [studentId, classroomId, dateFrom, dateTo])

  const handleCommentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCommentStatus(null)

    if (!studentId || !classroomId) return

    const comment = commentForm.comment.trim()
    if (!commentForm.assignmentId || !comment) {
      setCommentStatus({
        tone: "error",
        message: "Selecciona un ejercicio y escribe un comentario.",
      })
      return
    }

    try {
      setCommentBusy(true)
      const supabase = createClient()
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser()

      if (userErr || !user) {
        throw new Error("No se pudo validar tu sesion.")
      }

      const { error } = await supabase.from("edu_assignment_feedback").insert({
        assignment_id: commentForm.assignmentId,
        student_id: studentId,
        teacher_id: user.id,
        comment,
      })

      if (error) throw error

      setCommentForm({ assignmentId: "", comment: "" })
      setCommentStatus({
        tone: "success",
        message: "Comentario guardado.",
      })
      await fetchAssignmentsAndFeedback()
    } catch (e: any) {
      setCommentStatus({
        tone: "error",
        message: e?.message ?? "No se pudo guardar el comentario.",
      })
    } finally {
      setCommentBusy(false)
    }
  }

  /* =========================
     RESÚMENES
  ========================= */
  const resumen = useMemo(() => {
    const total = rows.length
    const correctos = rows.filter(r => r.correct).length
    const incorrectos = total - correctos
    const accuracy = total ? Math.round((correctos / total) * 100) : 0
    return { total, correctos, incorrectos, accuracy }
  }, [rows])

  const attemptsSorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      ),
    [rows]
  )

  const exerciseAgg = useMemo<ExerciseAgg[]>(() => {
    const map = new Map<string, ExerciseAgg>()

    rows.forEach(r => {
      const e = r.exercise
      if (!e?.id) return

      const current = map.get(e.id) || {
        id: e.id,
        label: e.description || e.id,
        type: e.exercise_type,
        attempts: 0,
        correct: 0,
        incorrect: 0,
        accuracy: 0,
      }

      current.attempts++
      r.correct ? current.correct++ : current.incorrect++
      map.set(e.id, current)
    })

    return Array.from(map.values()).map(r => ({
      ...r,
      accuracy: r.attempts
        ? Math.round((r.correct / r.attempts) * 100)
        : 0,
    }))
  }, [rows])

  /* =========================
     INSIGHTS PEDAGÓGICOS
  ========================= */
  const insights = useMemo(() => {
    const level = getStudentLevel(resumen.accuracy, resumen.total)
    const motivation = getMotivationTag(resumen.total, resumen.accuracy)

    const critical = exerciseAgg.filter(
      e => e.accuracy < 60 && e.attempts >= 3
    )
    const reinforce = exerciseAgg.filter(
      e => e.accuracy >= 60 && e.accuracy < 75
    )
    const strong = exerciseAgg.filter(e => e.accuracy >= 85)

    return { level, motivation, critical, reinforce, strong }
  }, [resumen, exerciseAgg])

  const assignmentOptions = useMemo(() => {
    return [...assignments]
      .map((assignment) => {
        const exercise = assignment.exercise
        const label =
          exercise?.description || exercise?.id || assignment.exercise_id || "Ejercicio"
        const type = exercise?.exercise_type || "sin_tipo"
        return {
          id: assignment.id,
          label,
          type,
        }
      })
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [assignments])

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="space-y-6">
      <PageHeader
        title={studentName}
        description="Perfil de aprendizaje del alumno"
        breadcrumbs={[
          { label: "Mis Clases", href: "/dashboard/teacher" },
          { label: "Aula", href: `/dashboard/teacher/classroom/${classroomId}` },
          {
            label: "Rendimiento",
            href: `/dashboard/teacher/classroom/${classroomId}/performance`,
          },
          { label: "Alumno" },
        ]}
      />

      {/* FILTRO FECHAS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="text-sm text-muted-foreground">Desde</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Hasta</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* KPIs */}
      <StatCardGrid columns={3}>
        <StatCard title="Intentos (30 días)" value={resumen.total} />
        <StatCard
          title="Precisión (30 días)"
          value={resumen.accuracy}
          suffix="%"
          variant={insights.level.tone as any}
        />
        <StatCard title="Motivación (30 días)" value={insights.motivation} />
      </StatCardGrid>

      {/* INSIGHT PEDAGÓGICO */}
      <section className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">🧠 Diagnóstico pedagógico (30 días)</h2>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border p-4">
            <div className="text-xs text-muted-foreground">Nivel actual</div>
            <div className="mt-1 text-xl font-semibold">
              {insights.level.label}
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="text-xs text-muted-foreground">Motivación</div>
            <div className="mt-1 text-xl font-semibold">
              {insights.motivation}
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="text-xs text-muted-foreground">Precisión global</div>
            <div className="mt-1 text-xl font-semibold">
              {resumen.accuracy}%
            </div>
          </div>
        </div>

        {insights.critical.length > 0 && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
            <b>⚠️ Temas críticos</b>
            <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
              {insights.critical.map(t => (
                <li key={t.id}>
                  {t.label} ({t.accuracy}%)
                </li>
              ))}
            </ul>
          </div>
        )}

        {insights.reinforce.length > 0 && (
          <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
            <b>📘 Temas a reforzar</b>
            <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
              {insights.reinforce.map(t => (
                <li key={t.id}>
                  {t.label} ({t.accuracy}%)
                </li>
              ))}
            </ul>
          </div>
        )}

        {insights.strong.length > 0 && (
          <div className="rounded-xl border border-success/40 bg-success/10 p-4">
            <b>🏆 Fortalezas</b>
            <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
              {insights.strong.map(t => (
                <li key={t.id}>
                  {t.label} ({t.accuracy}%)
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* PLAN DOCENTE */}
      <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-3">🎯 Plan sugerido</h2>

        <p className="text-sm text-muted-foreground">
          Para la próxima semana, se recomienda que <b>{studentName}</b> refuerce:
        </p>

        <ul className="list-disc pl-5 mt-3 text-sm space-y-1">
          {insights.critical.slice(0, 2).map(t => (
            <li key={t.id}>
              <b>{t.label}</b>: ejercicios guiados con feedback inmediato.
            </li>
          ))}
          {insights.reinforce.slice(0, 1).map(t => (
            <li key={t.id}>
              <b>{t.label}</b>: práctica autónoma diaria.
            </li>
          ))}
        </ul>

        <p className="mt-3 text-xs text-muted-foreground">
          💡 Recomendación generada automáticamente a partir del desempeño real
          del alumno.
        </p>
      </section>

      {/* COMENTARIOS DOCENTE */}
      <section className="rounded-2xl border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Comentarios del docente</h2>
          <span className="text-xs text-muted-foreground">
            Visible para el estudiante
          </span>
        </div>

        <form onSubmit={handleCommentSubmit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-1">
              <label className="text-sm text-muted-foreground">
                Ejercicio asignado
              </label>
              <select
                value={commentForm.assignmentId}
                onChange={(e) =>
                  setCommentForm((s) => ({ ...s, assignmentId: e.target.value }))
                }
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                disabled={assignmentOptions.length === 0}
              >
                <option value="">Selecciona ejercicio</option>
                {assignmentOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} ({option.type})
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-muted-foreground">
                Comentario
              </label>
              <textarea
                rows={3}
                value={commentForm.comment}
                onChange={(e) =>
                  setCommentForm((s) => ({ ...s, comment: e.target.value }))
                }
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Escribe una observacion para el estudiante..."
              />
            </div>
          </div>
          {commentStatus && (
            <p
              className={
                commentStatus.tone === "error"
                  ? "text-sm text-destructive"
                  : "text-sm text-green-600"
              }
            >
              {commentStatus.message}
            </p>
          )}
          <div>
            <button
              type="submit"
              disabled={commentBusy || assignmentOptions.length === 0}
              className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition disabled:opacity-60"
            >
              {commentBusy ? "Guardando..." : "Guardar comentario"}
            </button>
          </div>
        </form>

        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="text-sm font-medium">Historial de comentarios</div>
          {feedbackLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Cargando comentarios...
            </p>
          ) : feedbackError ? (
            <p className="mt-2 text-sm text-destructive">{feedbackError}</p>
          ) : feedbackRows.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Aun no hay comentarios registrados.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {feedbackRows.map((row) => {
                const exercise = row.assignment?.exercise
                const label =
                  exercise?.description ||
                  exercise?.id ||
                  row.assignment?.exercise_id ||
                  "Ejercicio"
                const type = exercise?.exercise_type || "sin_tipo"
                const when = new Date(row.created_at)
                const whenLabel = Number.isNaN(when.getTime())
                  ? row.created_at
                  : when.toLocaleString("es-PE", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })

                return (
                  <div
                    key={row.id}
                    className="rounded-lg border bg-background p-3"
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {label} ({type})
                      </span>
                      <span>{whenLabel}</span>
                    </div>
                    <p className="mt-2 text-sm whitespace-pre-wrap">
                      {row.comment}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* TABLAS DE RESPALDO */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Intentos */}
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold mb-4">Intentos recientes (30 días)</h2>
          {attemptsSorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay intentos en este rango.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Fecha</th>
                  <th>Ejercicio</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {attemptsSorted.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td>{r.exercise?.description || r.exercise?.id}</td>
                    <td>{r.correct ? "✔️" : "❌"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Resumen */}
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold mb-4">Resumen por ejercicio (30 días)</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Ejercicio</th>
                <th>Intentos</th>
                <th>Precisión</th>
              </tr>
            </thead>
            <tbody>
              {exerciseAgg.map(r => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2">
                    <b>{r.label}</b>
                    <div className="text-xs text-muted-foreground">
                      {r.type}
                    </div>
                  </td>
                  <td>{r.attempts}</td>
                  <td>{r.accuracy}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}
