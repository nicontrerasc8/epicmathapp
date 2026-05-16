import { notFound } from "next/navigation"
import { BarChart3, CheckCircle2, ClipboardList, ListTodo, Target, Users } from "lucide-react"
import { PageHeader, StatCard, StatCardGrid } from "@/components/dashboard/core"
import { requireInstitution } from "@/lib/institution"
import { createClient } from "@/utils/supabase/server"

type Student = {
  id: string
  name: string
}

type Task = {
  id: string
  title: string
  status: string
  active: boolean
  attempts_allowed: number
  available_from: string | null
  available_until: string | null
}

type TaskAttempt = {
  task_id: string
  student_id: string
  score: number | string | null
  max_score: number | string | null
  correct_count: number | null
  wrong_count: number | null
  submitted_at: string | null
}

type PracticeSession = {
  task_id: string
  student_id: string
  accuracy: number | string | null
  correct_count: number | null
  total_questions: number | null
  ended_at: string | null
}

function asNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function average(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value))
  if (valid.length === 0) return null
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length)
}

function formatPercent(value: number | null) {
  return value == null ? "-" : `${value}%`
}

function formatDate(value: string | null) {
  if (!value) return "Sin fecha"
  return new Date(value).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default async function TeacherTaskPerformancePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: classroomId } = await params
  const institution = await requireInstitution()
  const supabase = await createClient()

  const { data: classroom } = await supabase
    .from("edu_classrooms")
    .select("id, grade, section, academic_year")
    .eq("id", classroomId)
    .eq("institution_id", institution.id)
    .maybeSingle()

  if (!classroom) notFound()

  const [
    { data: studentRows },
    { data: taskRows },
    { data: attemptRows },
    { data: practiceRows },
  ] = await Promise.all([
    supabase
      .from("edu_classroom_members")
      .select(`
        edu_institution_members!inner (
          active,
          role,
          institution_id,
          profile:edu_profiles ( id, first_name, last_name )
        )
      `)
      .eq("classroom_id", classroomId)
      .eq("edu_institution_members.institution_id", institution.id)
      .eq("edu_institution_members.role", "student")
      .eq("edu_institution_members.active", true),
    supabase
      .from("edu_tasks")
      .select("id, title, status, active, attempts_allowed, available_from, available_until")
      .eq("classroom_id", classroomId)
      .eq("active", true)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("edu_student_tasks")
      .select("task_id, student_id, score, max_score, correct_count, wrong_count, submitted_at")
      .eq("classroom_id", classroomId)
      .eq("status", "submitted"),
    supabase
      .from("edu_task_practice_sessions")
      .select("task_id, student_id, accuracy, correct_count, total_questions, ended_at")
      .eq("classroom_id", classroomId),
  ])

  const students: Student[] = ((studentRows ?? []) as any[])
    .map((row) => {
      const member = Array.isArray(row.edu_institution_members)
        ? row.edu_institution_members[0]
        : row.edu_institution_members
      const profile = Array.isArray(member?.profile) ? member.profile[0] : member?.profile
      if (!profile?.id) return null
      return {
        id: profile.id,
        name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Estudiante",
      }
    })
    .filter((student): student is Student => Boolean(student))
    .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }))

  const tasks = ((taskRows ?? []) as Task[])
  const attempts = ((attemptRows ?? []) as TaskAttempt[])
  const practices = ((practiceRows ?? []) as PracticeSession[])

  const totalExpected = students.length * tasks.length
  const completionRate = totalExpected > 0 ? Math.round((attempts.length / totalExpected) * 100) : 0
  const avgTaskScore = average(attempts.map((attempt) => asNumber(attempt.score)))
  const avgPracticeAccuracy = average(practices.map((practice) => asNumber(practice.accuracy)))
  const completedPracticeCount = practices.filter((practice) => asNumber(practice.accuracy) >= 100).length
  const classroomLabel = `${classroom.grade}${classroom.section ? ` ${classroom.section}` : ""}`.trim()

  const taskSummaries = tasks.map((task) => {
    const taskAttempts = attempts.filter((attempt) => attempt.task_id === task.id)
    const taskPractices = practices.filter((practice) => practice.task_id === task.id)

    return {
      task,
      submitted: taskAttempts.length,
      pending: Math.max(0, students.length - taskAttempts.length),
      avgScore: average(taskAttempts.map((attempt) => asNumber(attempt.score))),
      practiceAttempts: taskPractices.length,
      practiceCompleted: taskPractices.filter((practice) => asNumber(practice.accuracy) >= 100).length,
      avgPractice: average(taskPractices.map((practice) => asNumber(practice.accuracy))),
    }
  })

  const studentSummaries = students.map((student) => {
    const studentAttempts = attempts.filter((attempt) => attempt.student_id === student.id)
    const studentPractices = practices.filter((practice) => practice.student_id === student.id)
    const bestPractice = average(
      tasks.map((task) => {
        const values = studentPractices
          .filter((practice) => practice.task_id === task.id)
          .map((practice) => asNumber(practice.accuracy))
        return values.length ? Math.max(...values) : NaN
      }),
    )

    return {
      student,
      submitted: studentAttempts.length,
      pending: Math.max(0, tasks.length - studentAttempts.length),
      avgScore: average(studentAttempts.map((attempt) => asNumber(attempt.score))),
      practiceAttempts: studentPractices.length,
      practiceCompleted: studentPractices.filter((practice) => asNumber(practice.accuracy) >= 100).length,
      bestPractice,
    }
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard de tareas"
        description={`Entregas, practicas y avance de ${classroomLabel}`}
        breadcrumbs={[
          { label: "Mis Clases", href: "/dashboard/teacher" },
          { label: classroomLabel, href: `/dashboard/teacher/classroom/${classroomId}` },
          { label: "Tareas" },
        ]}
      />

      <StatCardGrid columns={4}>
        <StatCard title="Tareas activas" value={tasks.length} icon={ListTodo} variant="primary" />
        <StatCard title="Entregas" value={attempts.length} icon={ClipboardList} variant="success" />
        <StatCard title="Avance" value={completionRate} suffix="%" icon={Target} variant="warning" />
        <StatCard title="Practicas" value={practices.length} icon={BarChart3} variant="primary" />
      </StatCardGrid>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-sm text-muted-foreground">Promedio tareas</div>
          <div className="mt-2 text-3xl font-bold">{formatPercent(avgTaskScore)}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-sm text-muted-foreground">Promedio practicas</div>
          <div className="mt-2 text-3xl font-bold">{formatPercent(avgPracticeAccuracy)}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-sm text-muted-foreground">Practicas al 100%</div>
          <div className="mt-2 text-3xl font-bold">{completedPracticeCount}</div>
        </div>
      </div>

      <section className="rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold">Resumen por tarea</h2>
          <p className="text-sm text-muted-foreground">Entregas oficiales y practicas derivadas.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Tarea</th>
                <th className="px-4 py-3">Ventana</th>
                <th className="px-4 py-3">Entregas</th>
                <th className="px-4 py-3">Pendientes</th>
                <th className="px-4 py-3">Prom. tarea</th>
                <th className="px-4 py-3">Practicas</th>
                <th className="px-4 py-3">Prom. practica</th>
                <th className="px-4 py-3">100%</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {taskSummaries.map((item) => (
                <tr key={item.task.id}>
                  <td className="px-4 py-3 font-medium">{item.task.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(item.task.available_from)} - {formatDate(item.task.available_until)}
                  </td>
                  <td className="px-4 py-3">{item.submitted}</td>
                  <td className="px-4 py-3">{item.pending}</td>
                  <td className="px-4 py-3">{formatPercent(item.avgScore)}</td>
                  <td className="px-4 py-3">{item.practiceAttempts}</td>
                  <td className="px-4 py-3">{formatPercent(item.avgPractice)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      {item.practiceCompleted}
                    </span>
                  </td>
                </tr>
              ))}
              {taskSummaries.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-muted-foreground" colSpan={8}>
                    No hay tareas activas para esta aula.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold">Resumen por estudiante</h2>
          <p className="text-sm text-muted-foreground">Avance individual en tareas y practicas.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Estudiante</th>
                <th className="px-4 py-3">Entregadas</th>
                <th className="px-4 py-3">Pendientes</th>
                <th className="px-4 py-3">Prom. tarea</th>
                <th className="px-4 py-3">Intentos practica</th>
                <th className="px-4 py-3">Practicas 100%</th>
                <th className="px-4 py-3">Mejor practica</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {studentSummaries.map((item) => (
                <tr key={item.student.id}>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 font-medium">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {item.student.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">{item.submitted}</td>
                  <td className="px-4 py-3">{item.pending}</td>
                  <td className="px-4 py-3">{formatPercent(item.avgScore)}</td>
                  <td className="px-4 py-3">{item.practiceAttempts}</td>
                  <td className="px-4 py-3">{item.practiceCompleted}</td>
                  <td className="px-4 py-3">{formatPercent(item.bestPractice)}</td>
                </tr>
              ))}
              {studentSummaries.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-muted-foreground" colSpan={7}>
                    No hay estudiantes activos en esta aula.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
