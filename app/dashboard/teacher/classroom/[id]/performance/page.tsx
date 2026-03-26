"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { PageHeader } from "@/components/dashboard/core"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useInstitution } from "@/components/institution-provider"
import {
  AlertTriangle,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  Clock3,
  Search,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"

type AttemptRow = {
  student_id: string
  exercise_id: string
  correct: boolean
  created_at: string
}

type StudentRow = {
  student_id: string
  name: string
}

type AssignmentRow = {
  assignment_id: string
  exercise_id: string
  active: boolean
  order: number
  label: string
  type: string
}

type CellAggregate = {
  attempts: number
  correctAttempts: number
  lastAttempt: string | null
}

type CellState = "green" | "blue" | "yellow" | "red"

type AssignmentStatusFilter = "all" | "active" | "inactive"

function formatDate(value: string | null) {
  if (!value) return "Sin intentos"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Sin intentos"
  return date.toLocaleDateString("es-PE")
}

function buildCellState(cell: CellAggregate | undefined): CellState {
  const attempts = cell?.attempts ?? 0
  const correctAttempts = cell?.correctAttempts ?? 0

  if (correctAttempts > 0) return "green"
  if (attempts === 0) return "yellow"
  if (attempts >= 3) return "red"
  return "blue"
}

function getCellClasses(state: CellState) {
  if (state === "green") {
    return "border-emerald-300 bg-emerald-500/20 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
  }
  if (state === "blue") {
    return "border-sky-300 bg-sky-500/20 text-sky-900 dark:border-sky-800 dark:bg-sky-500/20 dark:text-sky-200"
  }
  if (state === "red") {
    return "border-rose-300 bg-rose-500/20 text-rose-900 dark:border-rose-800 dark:bg-rose-500/20 dark:text-rose-200"
  }
  return "border-amber-300 bg-amber-500/20 text-amber-900 dark:border-amber-800 dark:bg-amber-500/20 dark:text-amber-200"
}

function getCellLabel(state: CellState, cell: CellAggregate | undefined) {
  const attempts = cell?.attempts ?? 0
  const correctAttempts = cell?.correctAttempts ?? 0

  if (state === "green") return `OK ${correctAttempts}`
  if (state === "red") return `${Math.min(attempts, 3)}/3`
  if (state === "blue") return `${attempts}/3`
  return "0/3"
}

function getCellDescription(state: CellState) {
  if (state === "green") return "Resuelto"
  if (state === "blue") return "En proceso"
  if (state === "red") return "Agotado"
  return "Sin iniciar"
}

function StatusLegendItem({
  colorClass,
  title,
  description,
}: {
  colorClass: string
  title: string
  description: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm">
      <div className={cn("h-4 w-4 rounded-full", colorClass)} />
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  title,
  value,
  tone,
}: {
  icon: typeof Users
  title: string
  value: number
  tone: string
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={cn("rounded-xl p-2", tone)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
        </div>
      </div>
    </div>
  )
}

export default function PerformancePage() {
  const params = useParams() as { id?: string }
  const classroomId = params?.id
  const router = useRouter()
  const institution = useInstitution()
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [classroomLabel, setClassroomLabel] = useState("Aula")
  const [students, setStudents] = useState<StudentRow[]>([])
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [attemptMap, setAttemptMap] = useState<Map<string, Map<string, CellAggregate>>>(new Map())
  const [query, setQuery] = useState("")
  const [selectedType, setSelectedType] = useState("all")
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<AssignmentStatusFilter>("active")

  useEffect(() => {
    if (!classroomId) return

    const load = async () => {
      setLoading(true)

      const [
        { data: classroom },
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
              institution_id,
              edu_profiles ( first_name, last_name )
            )
          `)
          .eq("classroom_id", classroomId)
          .eq("edu_institution_members.role", "student")
          .eq("edu_institution_members.active", true),
        supabase
          .from("edu_exercise_assignments")
          .select(`
            id,
            active,
            order,
            created_at,
            exercise:edu_exercises ( id, block, exercise_type, institution_id )
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

      if (membersError || assignmentsError) {
        console.error({ membersError, assignmentsError })
        setStudents([])
        setAssignments([])
        setAttemptMap(new Map())
        setLoading(false)
        return
      }

      const nextStudents: StudentRow[] = []
      const studentIds = new Set<string>()

      ;(members || []).forEach((row: any) => {
        const member = Array.isArray(row.edu_institution_members)
          ? row.edu_institution_members[0]
          : row.edu_institution_members
        const profile = Array.isArray(member?.edu_profiles)
          ? member.edu_profiles[0]
          : member?.edu_profiles

        if (!member?.profile_id) return
        if (institution?.id && member.institution_id !== institution.id) return

        studentIds.add(member.profile_id)
        nextStudents.push({
          student_id: member.profile_id,
          name: `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() || member.profile_id,
        })
      })

      const nextAssignments: AssignmentRow[] = (assignmentRows || [])
        .map((row: any) => {
          const exercise = Array.isArray(row.exercise) ? row.exercise[0] : row.exercise
          if (!exercise?.id) return null
          if (
            institution?.id &&
            exercise.institution_id &&
            exercise.institution_id !== institution.id
          ) {
            return null
          }

          return {
            assignment_id: row.id,
            exercise_id: exercise.id,
            active: Boolean(row.active),
            order: Number(row.order) || 0,
            label: exercise.block?.trim() || "Sin tema",
            type: exercise.exercise_type?.trim() || "Sin tipo",
          } satisfies AssignmentRow
        })
        .filter((row: AssignmentRow | null): row is AssignmentRow => row !== null)

      if (studentIds.size === 0 || nextAssignments.length === 0) {
        setStudents(nextStudents.sort((a, b) => a.name.localeCompare(b.name)))
        setAssignments(nextAssignments)
        setAttemptMap(new Map())
        setLoading(false)
        return
      }

      const exerciseIds = Array.from(new Set(nextAssignments.map((row) => row.exercise_id)))
      const { data: attempts, error: attemptsError } = await supabase
        .from("edu_student_exercises")
        .select("student_id, exercise_id, correct, created_at")
        .eq("classroom_id", classroomId)
        .in("student_id", Array.from(studentIds))
        .in("exercise_id", exerciseIds)
        .order("created_at", { ascending: true })

      if (attemptsError) {
        console.error(attemptsError)
      }

      const nextAttemptMap = new Map<string, Map<string, CellAggregate>>()

      ;((attempts || []) as AttemptRow[]).forEach((row) => {
        if (!studentIds.has(row.student_id)) return

        const byExercise = nextAttemptMap.get(row.student_id) || new Map<string, CellAggregate>()
        const current = byExercise.get(row.exercise_id) || {
          attempts: 0,
          correctAttempts: 0,
          lastAttempt: null,
        }

        current.attempts += 1
        if (row.correct) current.correctAttempts += 1
        current.lastAttempt = row.created_at

        byExercise.set(row.exercise_id, current)
        nextAttemptMap.set(row.student_id, byExercise)
      })

      setStudents(nextStudents.sort((a, b) => a.name.localeCompare(b.name)))
      setAssignments(nextAssignments)
      setAttemptMap(nextAttemptMap)
      setLoading(false)
    }

    load()
  }, [classroomId, supabase, institution?.id])

  const exerciseTypeOptions = useMemo(() => {
    return Array.from(new Set(assignments.map((assignment) => assignment.type)))
      .sort((a, b) => a.localeCompare(b))
  }, [assignments])

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      const matchesStatus =
        assignmentStatusFilter === "all"
          ? true
          : assignmentStatusFilter === "active"
            ? assignment.active
            : !assignment.active

      const matchesType = selectedType === "all" ? true : assignment.type === selectedType

      return matchesStatus && matchesType
    })
  }, [assignments, assignmentStatusFilter, selectedType])

  const filteredStudents = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return students
    return students.filter((student) => student.name.toLowerCase().includes(needle))
  }, [students, query])

  const matrixRows = useMemo(() => {
    return filteredStudents.map((student) => {
      const byExercise = attemptMap.get(student.student_id) || new Map<string, CellAggregate>()

      let green = 0
      let blue = 0
      let yellow = 0
      let red = 0

      const cells = filteredAssignments.map((assignment) => {
        const aggregate = byExercise.get(assignment.exercise_id)
        const state = buildCellState(aggregate)

        if (state === "green") green += 1
        else if (state === "blue") blue += 1
        else if (state === "yellow") yellow += 1
        else red += 1

        return {
          assignment,
          aggregate,
          state,
        }
      })

      return {
        student,
        cells,
        green,
        blue,
        yellow,
        red,
      }
    })
  }, [filteredStudents, filteredAssignments, attemptMap])

  const totals = useMemo(() => {
    let green = 0
    let blue = 0
    let yellow = 0
    let red = 0

    matrixRows.forEach((row) => {
      green += row.green
      blue += row.blue
      yellow += row.yellow
      red += row.red
    })

    return {
      students: filteredStudents.length,
      assignments: filteredAssignments.length,
      green,
      blue,
      yellow,
      red,
    }
  }, [filteredStudents.length, filteredAssignments.length, matrixRows])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rendimiento del Aula"
        description={`Vista directa por alumno y ejercicio para ${classroomLabel}`}
        breadcrumbs={[
          { label: "Mis Clases", href: "/dashboard/teacher" },
          { label: classroomLabel, href: `/dashboard/teacher/classroom/${classroomId}` },
          { label: "Rendimiento" },
        ]}
      />

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard
          icon={Users}
          title="Estudiantes"
          value={totals.students}
          tone="bg-slate-500/15 text-slate-700 dark:text-slate-300"
        />
        <SummaryCard
          icon={BookOpenCheck}
          title="Ejercicios"
          value={totals.assignments}
          tone="bg-violet-500/15 text-violet-700 dark:text-violet-300"
        />
        <SummaryCard
          icon={CheckCircle2}
          title="Verde"
          value={totals.green}
          tone="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
        />
        <SummaryCard
          icon={Clock3}
          title="Azul"
          value={totals.blue}
          tone="bg-sky-500/15 text-sky-700 dark:text-sky-300"
        />
        <SummaryCard
          icon={Brain}
          title="Amarillo"
          value={totals.yellow}
          tone="bg-amber-500/15 text-amber-700 dark:text-amber-300"
        />
        <SummaryCard
          icon={AlertTriangle}
          title="Rojo"
          value={totals.red}
          tone="bg-rose-500/15 text-rose-700 dark:text-rose-300"
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-4">
        <StatusLegendItem
          colorClass="bg-emerald-500"
          title="Verde"
          description="El alumno ya resolvió ese ejercicio."
        />
        <StatusLegendItem
          colorClass="bg-sky-500"
          title="Azul"
          description="Tiene intentos, pero todavía no lo resolvió."
        />
        <StatusLegendItem
          colorClass="bg-amber-500"
          title="Amarillo"
          description="Todavía no empezó ese ejercicio."
        />
        <StatusLegendItem
          colorClass="bg-rose-500"
          title="Rojo"
          description="Ya gastó los 3 intentos y no lo resolvió."
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Buscar alumno
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nombre del estudiante..."
            />
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Categoría
          </div>
          <select
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value)}
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
          >
            <option value="all">Todas</option>
            {exerciseTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Asignaciones
          </div>
          <div className="flex gap-2">
            {(["all", "active", "inactive"] as AssignmentStatusFilter[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAssignmentStatusFilter(value)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm font-semibold capitalize",
                  assignmentStatusFilter === value
                    ? "bg-foreground text-background"
                    : "bg-background text-foreground hover:bg-muted/40",
                )}
              >
                {value === "all" ? "Todos" : value === "active" ? "Activos" : "Inactivos"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-80 items-center justify-center rounded-3xl border bg-card">
          <div className="text-sm text-muted-foreground">Cargando matriz de intentos...</div>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="flex h-80 items-center justify-center rounded-3xl border bg-card">
          <div className="text-center">
            <div className="text-base font-semibold">No hay ejercicios para mostrar</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Ajusta los filtros o revisa las asignaciones del salón.
            </div>
          </div>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="flex h-80 items-center justify-center rounded-3xl border bg-card">
          <div className="text-center">
            <div className="text-base font-semibold">No hay alumnos que coincidan</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Prueba con otra búsqueda.
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border bg-card shadow-xl">
          <div className="border-b px-6 py-4">
            <div className="text-lg font-semibold">Matriz Alumno × Ejercicio</div>
            <div className="text-sm text-muted-foreground">
              Cada celda muestra el estado real del alumno en ese ejercicio, considerando el máximo de 3 intentos.
            </div>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-20 min-w-[260px] border-b bg-card px-4 py-4 text-left">
                    Alumno
                  </th>
                  {filteredAssignments.map((assignment, index) => (
                    <th
                      key={assignment.assignment_id}
                      className="sticky top-0 z-10 min-w-[110px] border-b bg-card px-3 py-4 text-center align-top"
                      title={`${assignment.type} · ${assignment.label}`}
                    >
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        Ejercicio {index + 1}
                      </div>
                      <div className="mt-1 line-clamp-2 text-sm font-semibold">
                        {assignment.label}
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {assignment.type}
                      </div>
                      {!assignment.active && (
                        <Badge variant="outline" className="mt-2 text-[10px]">
                          Inactivo
                        </Badge>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {matrixRows.map((row) => (
                  <tr key={row.student.student_id}>
                    <td className="sticky left-0 z-10 border-b bg-card px-4 py-4 align-top">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/dashboard/teacher/classroom/${classroomId}/performance/${row.student.student_id}`,
                          )
                        }
                        className="w-full text-left"
                      >
                        <div className="font-semibold hover:text-primary">{row.student.name}</div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300">
                            V {row.green}
                          </Badge>
                          <Badge className="bg-sky-500/15 text-sky-700 hover:bg-sky-500/15 dark:text-sky-300">
                            A {row.blue}
                          </Badge>
                          <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300">
                            M {row.yellow}
                          </Badge>
                          <Badge className="bg-rose-500/15 text-rose-700 hover:bg-rose-500/15 dark:text-rose-300">
                            R {row.red}
                          </Badge>
                        </div>
                      </button>
                    </td>

                    {row.cells.map(({ assignment, aggregate, state }) => (
                      <td key={`${row.student.student_id}-${assignment.assignment_id}`} className="border-b px-3 py-3">
                        <div
                          className={cn(
                            "rounded-2xl border px-3 py-3 text-center shadow-sm",
                            getCellClasses(state),
                          )}
                          title={`${getCellDescription(state)} · Intentos: ${aggregate?.attempts ?? 0}/3 · Último: ${formatDate(aggregate?.lastAttempt ?? null)}`}
                        >
                          <div className="text-xs font-semibold uppercase tracking-wide">
                            {getCellDescription(state)}
                          </div>
                          <div className="mt-1 text-base font-bold">
                            {getCellLabel(state, aggregate)}
                          </div>
                          <div className="mt-1 text-[11px] opacity-80">
                            {formatDate(aggregate?.lastAttempt ?? null)}
                          </div>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
