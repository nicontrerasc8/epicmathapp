"use client"

import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
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

  const todayISO = new Date().toISOString().slice(0, 10)
  const sevenDaysAgoISO = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const [dateFrom, setDateFrom] = useState(sevenDaysAgoISO)
  const [dateTo, setDateTo] = useState(todayISO)

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
        <StatCard title="Intentos" value={resumen.total} />
        <StatCard
          title="Precisión"
          value={resumen.accuracy}
          suffix="%"
          variant={insights.level.tone as any}
        />
        <StatCard title="Motivación" value={insights.motivation} />
      </StatCardGrid>

      {/* INSIGHT PEDAGÓGICO */}
      <section className="rounded-2xl border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">🧠 Diagnóstico pedagógico</h2>

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

      {/* TABLAS DE RESPALDO */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Intentos */}
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold mb-4">Intentos recientes</h2>
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
          <h2 className="text-lg font-semibold mb-4">Resumen por ejercicio</h2>
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
