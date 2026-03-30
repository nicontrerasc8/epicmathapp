"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { PageHeader } from "@/components/dashboard/core"
import { Input } from "@/components/ui/input"
import { useInstitution } from "@/components/institution-provider"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

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
  label: string   // "block" del ejercicio = tema
  type: string    // exercise_type
}

type TopicKey = string // label (topic name)

type TopicStats = {
  label: string
  type: string
  exerciseIds: string[]
  totalAttemptable: number   // exercises × students
  correctCount: number
  attemptedCount: number
  effectivenessRate: number  // 0-100
}

type StudentTopicStats = {
  exerciseCount: number
  correctCount: number
  rate: number // 0-100
}

// ─── Effectiveness tiers ──────────────────────────────────────────────────────

type Tier = "red" | "yellow" | "blue" | "green"

function getTier(pct: number): Tier {
  if (pct <= 25) return "red"
  if (pct <= 50) return "yellow"
  if (pct <= 75) return "blue"
  return "green"
}

const TIER_META: Record<Tier, { label: string; dotCls: string; bgCls: string; textCls: string; barCls: string }> = {
  red:    { label: "Crítico",     dotCls: "bg-rose-500",   bgCls: "bg-rose-500/10",   textCls: "text-rose-700 dark:text-rose-300",   barCls: "bg-rose-500" },
  yellow: { label: "En riesgo",   dotCls: "bg-amber-500",  bgCls: "bg-amber-500/10",  textCls: "text-amber-700 dark:text-amber-300",  barCls: "bg-amber-500" },
  blue:   { label: "En progreso", dotCls: "bg-sky-500",    bgCls: "bg-sky-500/10",    textCls: "text-sky-700 dark:text-sky-300",      barCls: "bg-sky-500" },
  green:  { label: "Dominado",    dotCls: "bg-emerald-500",bgCls: "bg-emerald-500/10",textCls: "text-emerald-700 dark:text-emerald-300",barCls: "bg-emerald-500" },
}

// ─── Small components ─────────────────────────────────────────────────────────

function LegendDot({ tier }: { tier: Tier }) {
  return <span className={cn("inline-block h-2.5 w-2.5 rounded-full", TIER_META[tier].dotCls)} />
}

function TierPill({ pct, tier }: { pct: number; tier: Tier }) {
  const m = TIER_META[tier]
  return (
    <span className={cn("inline-block rounded-lg px-2 py-0.5 text-xs font-semibold tabular-nums", m.bgCls, m.textCls)}>
      {pct}%
    </span>
  )
}

function SummaryCard({
  tier,
  count,
  total,
}: {
  tier: Tier
  count: number
  total: number
}) {
  const m = TIER_META[tier]
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const borderTop: Record<Tier, string> = {
    red:    "border-t-rose-500",
    yellow: "border-t-amber-500",
    blue:   "border-t-sky-500",
    green:  "border-t-emerald-500",
  }
  return (
    <div className={cn("rounded-2xl border bg-card pt-0 shadow-sm overflow-hidden border-t-2", borderTop[tier])}>
      <div className="p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{m.label}</p>
        <p className="text-2xl font-semibold text-foreground">{count}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{pct}% del total</p>
      </div>
    </div>
  )
}

function EffBar({ pct, tier }: { pct: number; tier: Tier }) {
  return (
    <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={cn("absolute left-0 top-0 h-full rounded-full transition-all", TIER_META[tier].barCls)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

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
  // student_id → exercise_id → { attempts, correctAttempts }
  const [attemptMap, setAttemptMap] = useState<Map<string, Map<string, { attempts: number; correctAttempts: number }>>>(new Map())
  const [query, setQuery] = useState("")
  const [selectedType, setSelectedType] = useState("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active")

  // ── Data load ──────────────────────────────────────────────────────────────

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
          .select(`edu_institution_members!inner(profile_id,active,role,institution_id,edu_profiles(first_name,last_name))`)
          .eq("classroom_id", classroomId)
          .eq("edu_institution_members.role", "student")
          .eq("edu_institution_members.active", true),
        supabase
          .from("edu_exercise_assignments")
          .select(`id,active,order,created_at,exercise:edu_exercises(id,block,exercise_type,institution_id)`)
          .eq("classroom_id", classroomId)
          .order("order", { ascending: true })
          .order("created_at", { ascending: true }),
      ])

      if (classroom?.grade) {
        setClassroomLabel(`${classroom.grade}${classroom.section ? ` ${classroom.section}` : ""}`.trim())
      }
      if (membersError || assignmentsError) {
        setStudents([]); setAssignments([]); setAttemptMap(new Map()); setLoading(false); return
      }

      const nextStudents: StudentRow[] = []
      const studentIds = new Set<string>()
      ;(members || []).forEach((row: any) => {
        const member = Array.isArray(row.edu_institution_members) ? row.edu_institution_members[0] : row.edu_institution_members
        const profile = Array.isArray(member?.edu_profiles) ? member.edu_profiles[0] : member?.edu_profiles
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
          if (institution?.id && exercise.institution_id && exercise.institution_id !== institution.id) return null
          return {
            assignment_id: row.id,
            exercise_id: exercise.id,
            active: Boolean(row.active),
            order: Number(row.order) || 0,
            label: exercise.block?.trim() || "Sin tema",
            type: exercise.exercise_type?.trim() || "Sin tipo",
          } satisfies AssignmentRow
        })
        .filter((r: AssignmentRow | null): r is AssignmentRow => r !== null)

      if (studentIds.size === 0 || nextAssignments.length === 0) {
        setStudents(nextStudents.sort((a, b) => a.name.localeCompare(b.name)))
        setAssignments(nextAssignments)
        setAttemptMap(new Map())
        setLoading(false)
        return
      }

      const exerciseIds = Array.from(new Set(nextAssignments.map((r) => r.exercise_id)))
      const { data: attempts } = await supabase
        .from("edu_student_exercises")
        .select("student_id, exercise_id, correct, created_at")
        .eq("classroom_id", classroomId)
        .in("student_id", Array.from(studentIds))
        .in("exercise_id", exerciseIds)

      const nextMap = new Map<string, Map<string, { attempts: number; correctAttempts: number }>>()
      ;((attempts || []) as AttemptRow[]).forEach((row) => {
        if (!studentIds.has(row.student_id)) return
        const byEx = nextMap.get(row.student_id) || new Map()
        const cur = byEx.get(row.exercise_id) || { attempts: 0, correctAttempts: 0 }
        cur.attempts += 1
        if (row.correct) cur.correctAttempts += 1
        byEx.set(row.exercise_id, cur)
        nextMap.set(row.student_id, byEx)
      })

      setStudents(nextStudents.sort((a, b) => a.name.localeCompare(b.name)))
      setAssignments(nextAssignments)
      setAttemptMap(nextMap)
      setLoading(false)
    }
    load()
  }, [classroomId, supabase, institution?.id])

  // ── Derived data ───────────────────────────────────────────────────────────

  const typeOptions = useMemo(() => Array.from(new Set(assignments.map((a) => a.type))).sort(), [assignments])

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchStatus = statusFilter === "all" ? true : statusFilter === "active" ? a.active : !a.active
      const matchType = selectedType === "all" ? true : a.type === selectedType
      return matchStatus && matchType
    })
  }, [assignments, statusFilter, selectedType])

  const filteredStudents = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return needle ? students.filter((s) => s.name.toLowerCase().includes(needle)) : students
  }, [students, query])

  // ── Build topic stats ──────────────────────────────────────────────────────

  const topicStats: TopicStats[] = useMemo(() => {
    // Group exercises by topic label
    const byTopic = new Map<TopicKey, { type: string; exerciseIds: string[] }>()
    filteredAssignments.forEach((a) => {
      const entry = byTopic.get(a.label) || { type: a.type, exerciseIds: [] }
      if (!entry.exerciseIds.includes(a.exercise_id)) entry.exerciseIds.push(a.exercise_id)
      byTopic.set(a.label, entry)
    })

    return Array.from(byTopic.entries()).map(([label, { type, exerciseIds }]) => {
      let correctCount = 0
      let attemptedCount = 0

      filteredStudents.forEach((s) => {
        const byEx = attemptMap.get(s.student_id)
        exerciseIds.forEach((eid) => {
          const cell = byEx?.get(eid)
          if (cell && cell.attempts > 0) attemptedCount++
          if (cell && cell.correctAttempts > 0) correctCount++
        })
      })

      const totalAttemptable = exerciseIds.length * filteredStudents.length
      const effectivenessRate = totalAttemptable > 0 ? Math.round((correctCount / totalAttemptable) * 100) : 0

      return { label, type, exerciseIds, totalAttemptable, correctCount, attemptedCount, effectivenessRate }
    }).sort((a, b) => a.effectivenessRate - b.effectivenessRate)
  }, [filteredAssignments, filteredStudents, attemptMap])

  // ── Per-student per-topic stats for the matrix ─────────────────────────────

  const studentTopicMatrix: { student: StudentRow; topics: Record<TopicKey, StudentTopicStats> }[] = useMemo(() => {
    return filteredStudents.map((s) => {
      const byEx = attemptMap.get(s.student_id)
      const topics: Record<TopicKey, StudentTopicStats> = {}
      topicStats.forEach(({ label, exerciseIds }) => {
        let correct = 0
        exerciseIds.forEach((eid) => {
          const c = byEx?.get(eid)
          if (c && c.correctAttempts > 0) correct++
        })
        const rate = exerciseIds.length > 0 ? Math.round((correct / exerciseIds.length) * 100) : 0
        topics[label] = { exerciseCount: exerciseIds.length, correctCount: correct, rate }
      })
      return { student: s, topics }
    })
  }, [filteredStudents, topicStats, attemptMap])

  // ── Summary tier counts ────────────────────────────────────────────────────

  const tierCounts = useMemo(() => {
    const counts = { red: 0, yellow: 0, blue: 0, green: 0 }
    studentTopicMatrix.forEach(({ topics }) => {
      topicStats.forEach(({ label }) => {
        const tier = getTier(topics[label]?.rate ?? 0)
        counts[tier]++
      })
    })
    return counts
  }, [studentTopicMatrix, topicStats])

  const totalCells = filteredStudents.length * topicStats.length

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rendimiento del Aula"
        description={`Efectividad por tema para ${classroomLabel}`}
        breadcrumbs={[
          { label: "Mis Clases", href: "/dashboard/teacher" },
          { label: classroomLabel, href: `/dashboard/teacher/classroom/${classroomId}` },
          { label: "Rendimiento" },
        ]}
      />

      {/* Exam dashboard link */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold">Dashboard de exámenes</div>
            <div className="text-sm text-muted-foreground">Revisa el semáforo de rendimiento por examen del salón.</div>
          </div>
          <Link
            href={`/dashboard/teacher/classroom/${classroomId}/performance/exams`}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted/40"
          >
            Ver exámenes
          </Link>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {(["red", "yellow", "blue", "green"] as Tier[]).map((tier) => (
          <div key={tier} className="flex items-center gap-2 text-sm text-muted-foreground">
            <LegendDot tier={tier} />
            <span>
              <span className="font-medium text-foreground">{TIER_META[tier].label}</span>
              {" · "}
              {tier === "red" ? "0–25%" : tier === "yellow" ? "26–50%" : tier === "blue" ? "51–75%" : "76–100%"}
            </span>
          </div>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["red", "yellow", "blue", "green"] as Tier[]).map((tier) => (
          <SummaryCard key={tier} tier={tier} count={tierCounts[tier]} total={totalCells} />
        ))}
      </div>

      {/* Filters */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_240px]">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Buscar alumno</div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre del estudiante..." />
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo</div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
          >
            <option value="all">Todos</option>
            {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Asignaciones</div>
          <div className="flex gap-2">
            {(["all", "active", "inactive"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setStatusFilter(v)}
                className={cn(
                  "flex-1 rounded-xl border px-2 py-2 text-xs font-semibold",
                  statusFilter === v ? "bg-foreground text-background" : "bg-background text-foreground hover:bg-muted/40"
                )}
              >
                {v === "all" ? "Todos" : v === "active" ? "Activos" : "Inactivos"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-3xl border bg-card">
          <p className="text-sm text-muted-foreground">Cargando datos de rendimiento...</p>
        </div>
      ) : topicStats.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-3xl border bg-card">
          <div className="text-center">
            <p className="font-semibold">Sin temas para mostrar</p>
            <p className="mt-1 text-sm text-muted-foreground">Ajusta los filtros o revisa las asignaciones.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Topic effectiveness list */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Efectividad por tema</p>
            <div className="divide-y rounded-3xl border bg-card shadow-sm overflow-hidden">
              {topicStats.map((topic) => {
                const tier = getTier(topic.effectivenessRate)
                const m = TIER_META[tier]
                return (
                  <div key={topic.label} className="grid grid-cols-[1fr_auto] items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("h-2 w-2 rounded-full flex-shrink-0", m.dotCls)} />
                        <span className="text-sm font-semibold truncate">{topic.label}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{topic.type}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <EffBar pct={topic.effectivenessRate} tier={tier} />
                        </div>
                        <span className={cn("text-xs flex-shrink-0", m.textCls)}>{m.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {topic.correctCount} correctos de {topic.totalAttemptable} posibles · {topic.exerciseIds.length} ejercicio{topic.exerciseIds.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className={cn("text-2xl font-semibold tabular-nums", m.textCls)}>
                      {topic.effectivenessRate}%
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Student × Topic matrix */}
          {filteredStudents.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Vista por alumno</p>
              <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
                <div className="overflow-auto">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead>
                      <tr>
                        <th className="sticky left-0 top-0 z-20 min-w-[200px] border-b bg-card px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Alumno
                        </th>
                        {topicStats.map((topic) => (
                          <th
                            key={topic.label}
                            className="sticky top-0 z-10 min-w-[120px] border-b bg-card px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                            title={`${topic.type} · ${topic.label}`}
                          >
                            <div className="line-clamp-2 leading-tight">{topic.label}</div>
                            <div className="mt-0.5 font-normal normal-case text-[11px]">{topic.type}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {studentTopicMatrix.map(({ student, topics }) => {
                        const initials = student.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
                        return (
                          <tr key={student.student_id} className="group">
                            <td className="sticky left-0 z-10 border-b bg-card px-4 py-3 group-hover:bg-muted/20 transition-colors">
                              <button
                                type="button"
                                onClick={() => router.push(`/dashboard/teacher/classroom/${classroomId}/performance/${student.student_id}`)}
                                className="flex items-center gap-2 w-full text-left"
                              >
                                <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                                  {initials}
                                </span>
                                <span className="text-sm font-semibold hover:text-primary transition-colors truncate">
                                  {student.name}
                                </span>
                              </button>
                            </td>
                            {topicStats.map(({ label }) => {
                              const stat = topics[label]
                              const tier = getTier(stat?.rate ?? 0)
                              return (
                                <td key={label} className="border-b px-3 py-3 text-center group-hover:bg-muted/10 transition-colors">
                                  <TierPill pct={stat?.rate ?? 0} tier={tier} />
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}