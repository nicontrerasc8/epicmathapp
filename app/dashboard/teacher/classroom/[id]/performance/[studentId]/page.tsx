"use client"

import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { PageHeader, StatCard, StatCardGrid } from "@/components/dashboard/core"

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

export default function StudentPerformanceDetailPage() {
  const params = useParams() as { id?: string; studentId?: string }
  const classroomId = params?.id
  const studentId = params?.studentId

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [rows, setRows] = useState<AttemptRow[]>([])
  const [studentName, setStudentName] = useState<string>("Estudiante")

  const todayISO = new Date().toISOString().slice(0, 10)
  const sevenDaysAgoISO = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const [dateFrom, setDateFrom] = useState<string>(sevenDaysAgoISO)
  const [dateTo, setDateTo] = useState<string>(todayISO)

  useEffect(() => {
    if (!studentId) return

    const supabase = createClient()
    const fetchData = async () => {
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
            .gte("created_at", fromISO)
            .lte("created_at", toISO),
        ])

        if (error) throw error

        const name = `${student?.first_name || ""} ${student?.last_name || ""}`.trim()
        setStudentName(name || "Estudiante")
        setRows((data ?? []) as any[])
      } catch (e) {
        console.error(e)
        setErrorMsg("No se pudieron cargar los datos.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [studentId, dateFrom, dateTo])

  const resumen = useMemo(() => {
    const total = rows.length
    const correctos = rows.filter((r) => r.correct).length
    const incorrectos = total - correctos
    const accuracy = total ? Math.round((correctos / total) * 100) : 0
    return { total, correctos, incorrectos, accuracy }
  }, [rows])

  const attemptsSorted = useMemo(() => {
    return [...rows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [rows])

  const exerciseAgg = useMemo(() => {
    const map = new Map<string, ExerciseAgg>()
    rows.forEach((r) => {
      const exercise = r.exercise
      if (!exercise?.id) return
      const current = map.get(exercise.id) || {
        id: exercise.id,
        label: exercise.description || exercise.id,
        type: exercise.exercise_type || "sin_tipo",
        attempts: 0,
        correct: 0,
        incorrect: 0,
        accuracy: 0,
      }
      current.attempts += 1
      if (r.correct) current.correct += 1
      else current.incorrect += 1
      map.set(exercise.id, current)
    })

    return Array.from(map.values()).map((row) => ({
      ...row,
      accuracy: row.attempts ? Math.round((row.correct / row.attempts) * 100) : 0,
    }))
  }, [rows])

  return (
    <div className="space-y-6">
      <PageHeader
        title={studentName}
        description="Rendimiento por ejercicio"
        breadcrumbs={[
          { label: "Mis Clases", href: "/dashboard/teacher" },
          { label: "Aula", href: `/dashboard/teacher/classroom/${classroomId}` },
          { label: "Rendimiento", href: `/dashboard/teacher/classroom/${classroomId}/performance` },
          { label: "Detalle" },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Desde</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Hasta</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <StatCardGrid columns={3}>
        <StatCard title="Intentos" value={resumen.total} variant="default" />
        <StatCard
          title="Precision"
          value={resumen.accuracy}
          suffix="%"
          variant={resumen.accuracy >= 70 ? "success" : resumen.accuracy >= 50 ? "warning" : "danger"}
        />
        <StatCard title="Incorrectos" value={resumen.incorrectos} variant="default" />
      </StatCardGrid>

      {loading ? (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          Cargando datos...
        </div>
      ) : errorMsg ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
          {errorMsg}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="text-lg font-semibold mb-4">Intentos recientes</h2>
            {attemptsSorted.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No hay intentos en este rango de fechas.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2">Fecha</th>
                      <th className="py-2">Ejercicio</th>
                      <th className="py-2">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attemptsSorted.map((row, idx) => (
                      <tr key={`${row.created_at}-${idx}`} className="border-b last:border-b-0">
                        <td className="py-2">
                          {new Date(row.created_at).toLocaleString()}
                        </td>
                        <td className="py-2">
                          {row.exercise?.description || row.exercise?.id || "Sin descripcion"}
                        </td>
                        <td className="py-2">{row.correct ? "Correcto" : "Incorrecto"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <h2 className="text-lg font-semibold mb-4">Resumen por ejercicio</h2>
            {exerciseAgg.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No hay ejercicios para resumir.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2">Ejercicio</th>
                      <th className="py-2">Intentos</th>
                      <th className="py-2">Precision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exerciseAgg.map((row) => (
                      <tr key={row.id} className="border-b last:border-b-0">
                        <td className="py-2">
                          <div className="font-medium">{row.label}</div>
                          <div className="text-xs text-muted-foreground">{row.type}</div>
                        </td>
                        <td className="py-2">{row.attempts}</td>
                        <td className="py-2">{row.accuracy}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
