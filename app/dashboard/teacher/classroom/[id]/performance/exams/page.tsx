"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  Users,
  TrendingUp,
  BookOpen,
} from "lucide-react"

import { createClient } from "@/utils/supabase/client"
import { PageHeader } from "@/components/dashboard/core/PageHeader"
import { cn } from "@/lib/utils"
import {
  getExamEffectivenessPercentage,
  getExamPerformanceColor,
  getExamPerformanceLabel,
} from "@/lib/exam-performance"

type ExamAttemptRow = {
  exam_id: string
  student_id: string
  score: number | null
  correct_count: number | null
  wrong_count: number | null
  created_at: string
}

type ExamCardRow = {
  assignment_id: string
  exam_id: string
  title: string
  exam_type: string
  active: boolean
  order: number
}

type ExamSummary = {
  assignment_id: string
  exam_id: string
  title: string
  exam_type: string
  active: boolean
  order: number
  totalStudents: number
  completedStudents: number
  pendingStudents: number
  averageScore: number | null
  green: number
  blue: number
  yellow: number
  red: number
  correctCount: number
  wrongCount: number
  color: "green" | "blue" | "yellow" | "red"
  buckets: {
    green: StudentBucketItem[]
    blue: StudentBucketItem[]
    yellow: StudentBucketItem[]
    red: StudentBucketItem[]
  }
}

type StudentBucketItem = {
  id: string
  name: string
  effectiveness: number | null
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="mx-auto max-w-md px-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          {icon ?? <FileText className="h-6 w-6" />}
        </div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string
  value: ReactNode
  icon: ReactNode
  hint?: string
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {label}
          </p>
          <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</div>
          {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>
    </div>
  )
}

function BadgeTone({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: "green" | "blue" | "yellow" | "red" | "neutral"
}) {
  const styles =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : tone === "blue"
        ? "bg-sky-50 text-sky-700 ring-sky-200"
        : tone === "yellow"
          ? "bg-amber-50 text-amber-700 ring-amber-200"
          : tone === "red"
            ? "bg-rose-50 text-rose-700 ring-rose-200"
            : "bg-slate-100 text-slate-700 ring-slate-200"

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
        styles,
      )}
    >
      {children}
    </span>
  )
}

function SemaforoDot({
  tone,
}: {
  tone: "green" | "blue" | "yellow" | "red"
}) {
  const styles =
    tone === "green"
      ? "bg-emerald-500"
      : tone === "blue"
        ? "bg-sky-500"
        : tone === "yellow"
          ? "bg-amber-400"
          : "bg-rose-500"

  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", styles)} />
}

function StudentBucket({
  title,
  count,
  students,
  tone,
  onSelect,
}: {
  title: string
  count: number
  students: StudentBucketItem[]
  tone: "green" | "blue" | "yellow" | "red"
  onSelect: (studentId: string) => void
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SemaforoDot tone={tone} />
          <span className="text-base font-semibold text-slate-800">{title}</span>
        </div>
        <BadgeTone tone={tone}>
          {count} alumno{count === 1 ? "" : "s"}
        </BadgeTone>
      </div>

      {students.length === 0 ? (
        <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-400">Sin alumnos</div>
      ) : (
        <div className="max-h-64 space-y-2.5 overflow-auto pr-1">
          {students.map((student) => (
            <button
              key={`${title}-${student.id}`}
              type="button"
              onClick={() => onSelect(student.id)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-base font-medium leading-6 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <span>{student.name}</span>
              <span className="shrink-0 text-sm font-semibold text-slate-500">
                {student.effectiveness != null ? `${student.effectiveness}%` : "Pend."}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ProgressStack({
  green,
  blue,
  yellow,
  red,
  total,
}: {
  green: number
  blue: number
  yellow: number
  red: number
  total: number
}) {
  const safeTotal = Math.max(total, 1)

  return (
    <div>
      <div className="flex h-5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
        <div className="bg-emerald-500" style={{ width: `${(green / safeTotal) * 100}%` }} />
        <div className="bg-sky-500" style={{ width: `${(blue / safeTotal) * 100}%` }} />
        <div className="bg-amber-400" style={{ width: `${(yellow / safeTotal) * 100}%` }} />
        <div className="bg-rose-500" style={{ width: `${(red / safeTotal) * 100}%` }} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <BadgeTone tone="green">Verde {green}</BadgeTone>
        <BadgeTone tone="blue">Azul {blue}</BadgeTone>
        <BadgeTone tone="yellow">Amarillo {yellow}</BadgeTone>
        <BadgeTone tone="red">Rojo {red}</BadgeTone>
      </div>
    </div>
  )
}

function ExamCard({ item }: { item: ExamSummary }) {
  const params = useParams() as { id?: string }
  const classroomId = params.id ?? ""
  const router = useRouter()
  const average = item.averageScore ?? 0
  const statusTone = getExamPerformanceColor(average)

  return (
    <section className="group rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <BadgeTone>{item.exam_type}</BadgeTone>
            {item.active ? (
              <BadgeTone tone="green">Activo</BadgeTone>
            ) : (
              <BadgeTone tone="red">Inactivo</BadgeTone>
            )}
          </div>

          <h3 className="mt-1 text-3xl font-black leading-tight tracking-tight text-slate-900">
            {item.title}
          </h3>
          <p className="mt-2 text-base text-slate-500">
            {item.completedStudents} de {item.totalStudents} alumnos completaron este examen
          </p>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-base font-medium text-slate-500">Efectividad</div>
          <div className="mt-1 text-6xl font-black tracking-tight text-slate-900">{average}%</div>
          <div className="mt-2">
            <BadgeTone tone={statusTone}>{getExamPerformanceLabel(average)}</BadgeTone>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-[24px] bg-slate-50 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Participación
          </div>
          <div className="mt-3 text-4xl font-black text-slate-900">
            {item.completedStudents}/{item.totalStudents}
          </div>
          <div className="mt-2 text-base text-slate-500">
            {item.pendingStudents} pendiente{item.pendingStudents === 1 ? "" : "s"}
          </div>
        </div>

        <div className="rounded-[24px] bg-slate-50 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Correctas
          </div>
          <div className="mt-3 text-4xl font-black text-slate-900">{item.correctCount}</div>
          <div className="mt-2 text-base text-slate-500">Respuestas correctas acumuladas</div>
        </div>

        <div className="rounded-[24px] bg-slate-50 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Incorrectas
          </div>
          <div className="mt-3 text-4xl font-black text-slate-900">{item.wrongCount}</div>
          <div className="mt-2 text-base text-slate-500">Respuestas incorrectas acumuladas</div>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-base font-semibold text-slate-800">Distribución por semáforo</h4>
          <span className="text-base text-slate-500">Total: {item.totalStudents}</span>
        </div>
        <ProgressStack
          green={item.green}
          blue={item.blue}
          yellow={item.yellow}
          red={item.red}
          total={item.totalStudents}
        />
      </div>

      <div className="mt-8 grid gap-4 xl:grid-cols-2">
        <StudentBucket
          title="Verde"
          count={item.buckets.green.length}
          students={item.buckets.green}
          tone="green"
          onSelect={(studentId) =>
            router.push(`/dashboard/teacher/classroom/${classroomId}/performance/exams/${studentId}`)
          }
        />
        <StudentBucket
          title="Azul"
          count={item.buckets.blue.length}
          students={item.buckets.blue}
          tone="blue"
          onSelect={(studentId) =>
            router.push(`/dashboard/teacher/classroom/${classroomId}/performance/exams/${studentId}`)
          }
        />
        <StudentBucket
          title="Amarillo"
          count={item.buckets.yellow.length}
          students={item.buckets.yellow}
          tone="yellow"
          onSelect={(studentId) =>
            router.push(`/dashboard/teacher/classroom/${classroomId}/performance/exams/${studentId}`)
          }
        />
        <StudentBucket
          title="Rojo"
          count={item.buckets.red.length}
          students={item.buckets.red}
          tone="red"
          onSelect={(studentId) =>
            router.push(`/dashboard/teacher/classroom/${classroomId}/performance/exams/${studentId}`)
          }
        />
      </div>
    </section>
  )
}

export default function TeacherExamPerformancePage() {
  const params = useParams() as { id?: string }
  const classroomId = params.id ?? ""
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [classroomLabel, setClassroomLabel] = useState("Aula")
  const [studentCount, setStudentCount] = useState(0)
  const [summaries, setSummaries] = useState<ExamSummary[]>([])

  useEffect(() => {
    if (!classroomId) return

    let active = true

    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        const [
          { data: classroom, error: classroomError },
          { data: members, error: membersError },
          { data: assignmentRows, error: assignmentsError },
        ] = await Promise.all([
          supabase.from("edu_classrooms").select("grade, section").eq("id", classroomId).single(),
          supabase
            .from("edu_classroom_members")
            .select(`
              edu_institution_members!inner (
                profile_id,
                active,
                role,
                edu_profiles ( first_name, last_name )
              )
            `)
            .eq("classroom_id", classroomId)
            .eq("edu_institution_members.role", "student")
            .eq("edu_institution_members.active", true),
          supabase
            .from("edu_exam_assignments")
            .select(`
              id,
              active,
              order,
              exam:edu_exams (
                id,
                title,
                exam_type
              )
            `)
            .eq("classroom_id", classroomId)
            .order("order", { ascending: true })
            .order("created_at", { ascending: true }),
        ])

        if (classroomError) throw classroomError
        if (membersError) throw membersError
        if (assignmentsError) throw assignmentsError

        const nextClassroomLabel = classroom?.grade
          ? `${classroom.grade}${classroom.section ? ` ${classroom.section}` : ""}`.trim()
          : "Aula"

        const students = ((members ?? []) as any[])
          .map((row) => {
            const member = Array.isArray(row.edu_institution_members)
              ? row.edu_institution_members[0]
              : row.edu_institution_members
            const profile = Array.isArray(member?.edu_profiles)
              ? member.edu_profiles[0]
              : member?.edu_profiles

            return {
              id: member?.profile_id as string | undefined,
              name:
                `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() ||
                (member?.profile_id as string),
            }
          })
          .filter((value): value is { id: string; name: string } => Boolean(value.id))

        const studentIds = students.map((student) => student.id)
        const studentNameById = new Map(students.map((student) => [student.id, student.name]))

        const exams: ExamCardRow[] = ((assignmentRows ?? []) as any[])
          .map((row) => {
            const exam = Array.isArray(row.exam) ? row.exam[0] : row.exam
            if (!exam?.id) return null

            return {
              assignment_id: row.id,
              exam_id: exam.id,
              title: exam.title ?? "Examen",
              exam_type: exam.exam_type ?? "Sin tipo",
              active: Boolean(row.active),
              order: Number(row.order ?? 0),
            } satisfies ExamCardRow
          })
          .filter((row: ExamCardRow | null): row is ExamCardRow => Boolean(row))

        const latestAttemptsByExamStudent = new Map<string, ExamAttemptRow>()

        if (studentIds.length > 0 && exams.length > 0) {
          const { data: attemptsData, error: attemptsError } = await supabase
            .from("edu_student_exams")
            .select("exam_id, student_id, score, correct_count, wrong_count, created_at")
            .eq("classroom_id", classroomId)
            .in("student_id", studentIds)
            .in(
              "exam_id",
              exams.map((exam) => exam.exam_id),
            )
            .order("created_at", { ascending: false })

          if (attemptsError) throw attemptsError

          ;((attemptsData ?? []) as ExamAttemptRow[]).forEach((attempt) => {
            const key = `${attempt.exam_id}::${attempt.student_id}`
            if (!latestAttemptsByExamStudent.has(key)) {
              latestAttemptsByExamStudent.set(key, attempt)
            }
          })
        }

        const nextSummaries: ExamSummary[] = exams.map((exam) => {
          const attempts = Array.from(latestAttemptsByExamStudent.values()).filter(
            (attempt) => attempt.exam_id === exam.exam_id,
          )

          let green = 0
          let blue = 0
          let yellow = 0
          let red = 0
          let correctCount = 0
          let wrongCount = 0

          const buckets = {
            green: [] as StudentBucketItem[],
            blue: [] as StudentBucketItem[],
            yellow: [] as StudentBucketItem[],
            red: [] as StudentBucketItem[],
          }

          for (const attempt of attempts) {
            const effectiveness = getExamEffectivenessPercentage({
              score: attempt.score,
              correctCount: attempt.correct_count,
              wrongCount: attempt.wrong_count,
            })

            const color = getExamPerformanceColor(effectiveness)

            if (color === "green") green += 1
            else if (color === "blue") blue += 1
            else if (color === "yellow") yellow += 1
            else red += 1

            const studentName = studentNameById.get(attempt.student_id) ?? attempt.student_id
            buckets[color].push({
              id: attempt.student_id,
              name: studentName,
              effectiveness,
            })

            correctCount += attempt.correct_count ?? 0
            wrongCount += attempt.wrong_count ?? 0
          }

          const pendingStudents = Math.max(0, studentIds.length - attempts.length)
          red += pendingStudents

          for (const student of students) {
            const attempt = attempts.find((item) => item.student_id === student.id)
            if (!attempt) {
              buckets.red.push({
                id: student.id,
                name: student.name,
                effectiveness: null,
              })
            }
          }

          const averageScore = getExamEffectivenessPercentage({
            correctCount,
            wrongCount,
          })

          return {
            assignment_id: exam.assignment_id,
            exam_id: exam.exam_id,
            title: exam.title,
            exam_type: exam.exam_type,
            active: exam.active,
            order: exam.order,
            totalStudents: studentIds.length,
            completedStudents: attempts.length,
            pendingStudents,
            averageScore,
            green,
            blue,
            yellow,
            red,
            correctCount,
            wrongCount,
            color: getExamPerformanceColor(averageScore),
            buckets,
          }
        })

        if (!active) return

        setClassroomLabel(nextClassroomLabel)
        setStudentCount(studentIds.length)
        setSummaries(nextSummaries)
      } catch (err) {
        console.error(err)
        if (!active) return
        setSummaries([])
        setStudentCount(0)
        setError("No se pudo cargar el dashboard de exámenes.")
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [classroomId, supabase])

  const totals = useMemo(() => {
    return summaries.reduce(
      (acc, item) => {
        acc.green += item.green
        acc.blue += item.blue
        acc.yellow += item.yellow
        acc.red += item.red
        acc.completed += item.completedStudents
        acc.pending += item.pendingStudents
        return acc
      },
      {
        green: 0,
        blue: 0,
        yellow: 0,
        red: 0,
        completed: 0,
        pending: 0,
      },
    )
  }, [summaries])

  return (
    <div className="space-y-8 bg-slate-50/70">
      <PageHeader
        title="Dashboard de exámenes"
        description={`Resumen visual del rendimiento y avance de ${classroomLabel}`}
        breadcrumbs={[
          { label: "Mis Clases", href: "/dashboard/teacher" },
          { label: classroomLabel, href: `/dashboard/teacher/classroom/${classroomId}` },
          { label: "Exámenes", href: `/dashboard/teacher/classroom/${classroomId}/exams` },
          { label: "Dashboard" },
        ]}
      />

      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.4fr_1fr]">
          <div className="p-7 sm:p-8">
            <BadgeTone>Vista general</BadgeTone>
            <h2 className="mt-4 max-w-2xl text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Rendimiento por examen del aula {classroomLabel}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Visualiza qué exámenes van bien, cuáles requieren atención y qué alumnos están en
              riesgo o todavía no participan.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <BadgeTone tone="green">Verde 75–100%</BadgeTone>
              <BadgeTone tone="blue">Azul 50–75%</BadgeTone>
              <BadgeTone tone="yellow">Amarillo 25–50%</BadgeTone>
              <BadgeTone tone="red">Rojo 0–25% o pendiente</BadgeTone>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 p-7 sm:p-8 lg:border-l lg:border-t-0">
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Estado general
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {summaries.length} exámenes analizados
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <div className="text-sm text-slate-500">Completados</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{totals.completed}</div>
                </div>
                <div className="rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <div className="text-sm text-slate-500">Pendientes</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{totals.pending}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Alumnos"
          value={studentCount}
          hint="Activos en esta aula"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Exámenes"
          value={summaries.length}
          hint="Asignados al aula"
          icon={<BookOpen className="h-5 w-5" />}
        />
        <StatCard
          label="En verde"
          value={totals.green}
          hint="Buen desempeño"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <StatCard
          label="En rojo"
          value={totals.red}
          hint="Riesgo o sin resolver"
          icon={<AlertCircle className="h-5 w-5" />}
        />
      </section>

      {loading ? (
        <EmptyState
          icon={<Clock3 className="h-6 w-6" />}
          title="Cargando dashboard"
          description="Estamos obteniendo los exámenes, alumnos y resultados más recientes."
        />
      ) : error ? (
        <EmptyState
          icon={<AlertCircle className="h-6 w-6" />}
          title="Ocurrió un problema"
          description={error}
        />
      ) : summaries.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No hay exámenes asignados"
          description="Cuando el aula tenga exámenes, aquí verás el rendimiento consolidado."
        />
      ) : (
        <section className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Detalle por examen</h3>
              <p className="text-base text-slate-500">
                Tarjetas limpias, foco en avance, efectividad y alumnos por nivel.
              </p>
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm sm:flex">
              <TrendingUp className="h-4 w-4" />
              Vista comparativa
            </div>
          </div>

          <div className="grid gap-6">
            {summaries.map((item) => (
              <ExamCard key={item.assignment_id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
