"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { PageHeader } from "@/components/dashboard/core"
import { useInstitution } from "@/components/institution-provider"
import {
  Trophy,
  Flame,
  Users,
  Target,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpenCheck,
  Search,
  ArrowUpDown,
} from "lucide-react"

type AttemptRow = {
  student_id: string
  exercise_id: string
  correct: boolean
  time_seconds: number | null
  created_at: string
}

type GamRow = {
  student_id: string
  exercise_id: string
  attempts: number | null
  correct_attempts: number | null
  wrong_attempts: number | null
  trophies: number | null
  streak: number | null
  last_played_at: string | null
  updated_at: string | null
}

type StudentRow = {
  student_id: string
  name: string
  attempts_30d: number
  correct_30d: number
  incorrect_30d: number
  accuracy_30d: number
  last_attempt_30d: string | null
  avg_time_s_30d: number | null

  // gamification (lifetime / last state)
  trophies: number
  best_streak: number
  last_played_at: string | null
}

type ExerciseRow = {
  exercise_id: string
  label: string
  type: string
  attempts_30d: number
  correct_30d: number
  incorrect_30d: number
  accuracy_30d: number
  students_30d: number
  avg_time_s_30d: number | null

  // gamification
  trophies: number
  best_streak: number
  last_played_at: string | null
}

type SortKeyStudents =
  | "accuracy"
  | "attempts"
  | "correct"
  | "incorrect"
  | "avg_time"
  | "trophies"
  | "streak"
  | "last"
type SortKeyExercises =
  | "attempts"
  | "accuracy"
  | "students"
  | "avg_time"
  | "trophies"
  | "streak"
  | "last"

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function formatDate(d: string | null) {
  if (!d) return "—"
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return "—"
  return dt.toLocaleDateString()
}

function formatTimeSeconds(avg: number | null) {
  if (avg == null || Number.isNaN(avg)) return "—"
  const s = Math.round(avg)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}m ${r}s`
}

function badgeVariantFromAccuracy(acc: number) {
  if (acc >= 80) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20"
  if (acc >= 60) return "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20"
  return "bg-rose-500/15 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/20"
}

function ProgressBar({ value }: { value: number }) {
  const v = clamp(value, 0, 100)
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full bg-foreground/80"
        style={{ width: `${v}%` }}
      />
    </div>
  )
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "default",
}: {
  title: string
  value: React.ReactNode
  subtitle?: string
  icon: any
  tone?: "default" | "good" | "warn" | "bad"
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-500/20 bg-emerald-500/5"
      : tone === "warn"
      ? "border-amber-500/20 bg-amber-500/5"
      : tone === "bad"
      ? "border-rose-500/20 bg-rose-500/5"
      : "border-border bg-card"
  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
          {subtitle ? (
            <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
          ) : null}
        </div>
        <div className="rounded-xl border bg-background/60 p-2">
          <Icon className="h-5 w-5 text-foreground/80" />
        </div>
      </div>
    </div>
  )
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; icon?: any }[]
}) {
  return (
    <div className="inline-flex rounded-2xl border bg-card p-1">
      {options.map((o) => {
        const active = o.value === value
        const Icon = o.icon
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={[
              "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {Icon ? <Icon className="h-4 w-4" /> : null}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export default function PerformancePage() {
  const params = useParams() as { id?: string }
  const classroomId = params?.id
  const institution = useInstitution()
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [exercises, setExercises] = useState<ExerciseRow[]>([])

  const [tab, setTab] = useState<"students" | "exercises">("students")
  const [query, setQuery] = useState("")
  const [sortStudents, setSortStudents] = useState<SortKeyStudents>("accuracy")
  const [sortExercises, setSortExercises] = useState<SortKeyExercises>("attempts")
  const [descending, setDescending] = useState(true)

  useEffect(() => {
    if (!classroomId) return

    const load = async () => {
      setLoading(true)

      const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      // 1) miembros (estudiantes)
      let membersQuery = supabase
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
        .eq("edu_institution_members.active", true)

      if (institution?.id) {
        membersQuery = membersQuery.eq("edu_institution_members.institution_id", institution.id)
      }

      // 2) asignaciones (ejercicios del aula)
      const assignmentsQuery = supabase
        .from("edu_exercise_assignments")
        .select("exercise:edu_exercises ( id, description, exercise_type )")
        .eq("classroom_id", classroomId)
        .eq("active", true)

      // 3) intentos últimos 30 días
      const attemptsQuery = supabase
        .from("edu_student_exercises")
        .select("student_id, exercise_id, correct, time_seconds, created_at")
        .eq("classroom_id", classroomId)
        .gte("created_at", since30)

      const [{ data: members, error: membersErr }, { data: assignments, error: assErr }, { data: attempts, error: attErr }] =
        await Promise.all([membersQuery, assignmentsQuery, attemptsQuery])

      if (membersErr || assErr || attErr) {
        console.error({ membersErr, assErr, attErr })
      }

      const studentIds = new Set<string>()
      ;(members || []).forEach((row: any) => {
        const member = Array.isArray(row.edu_institution_members)
          ? row.edu_institution_members[0]
          : row.edu_institution_members
        if (member?.profile_id) studentIds.add(member.profile_id)
      })

      const exerciseIds = new Set<string>()
      ;(assignments || []).forEach((row: any) => {
        const ex = Array.isArray(row.exercise) ? row.exercise[0] : row.exercise
        if (ex?.id) exerciseIds.add(ex.id)
      })

      // 4) gamificación (filtrada por estudiantes y ejercicios del aula)
      // Nota: in() con arrays vacíos rompe, por eso controlamos.
      let gamRows: GamRow[] = []
      if (studentIds.size > 0 && exerciseIds.size > 0) {
        const { data: gam, error: gamErr } = await supabase
          .from("edu_student_gamification")
          .select(
            "student_id, exercise_id, attempts, correct_attempts, wrong_attempts, trophies, streak, last_played_at, updated_at"
          )
          .in("student_id", Array.from(studentIds))
          .in("exercise_id", Array.from(exerciseIds))

        if (gamErr) console.error(gamErr)
        gamRows = (gam || []) as GamRow[]
      }

      // Maps
      const studentNameMap = new Map<string, string>()
      ;(members || []).forEach((row: any) => {
        const member = Array.isArray(row.edu_institution_members)
          ? row.edu_institution_members[0]
          : row.edu_institution_members
        const profile = Array.isArray(member?.edu_profiles) ? member?.edu_profiles[0] : member?.edu_profiles
        const fullName = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim()
        if (member?.profile_id) {
          studentNameMap.set(member.profile_id, fullName || member.profile_id)
        }
      })

      const exerciseMap = new Map<string, { label: string; type: string }>()
      ;(assignments || []).forEach((row: any) => {
        const exercise = Array.isArray(row.exercise) ? row.exercise[0] : row.exercise
        if (!exercise?.id) return
        exerciseMap.set(exercise.id, {
          label: exercise.description || exercise.id,
          type: exercise.exercise_type || "sin_tipo",
        })
      })

      // Build aggregates (30d attempts)
      const byStudent = new Map<string, StudentRow>()
      const byExercise = new Map<string, ExerciseRow>()
      const attemptsArr = (attempts || []) as AttemptRow[]

      for (const row of attemptsArr) {
        const studentName = studentNameMap.get(row.student_id) || row.student_id
        const exInfo = exerciseMap.get(row.exercise_id) || { label: row.exercise_id, type: "sin_tipo" }

        const s = byStudent.get(row.student_id) || {
          student_id: row.student_id,
          name: studentName,
          attempts_30d: 0,
          correct_30d: 0,
          incorrect_30d: 0,
          accuracy_30d: 0,
          last_attempt_30d: null,
          avg_time_s_30d: null,
          trophies: 0,
          best_streak: 0,
          last_played_at: null,
        }

        const e = byExercise.get(row.exercise_id) || {
          exercise_id: row.exercise_id,
          label: exInfo.label,
          type: exInfo.type,
          attempts_30d: 0,
          correct_30d: 0,
          incorrect_30d: 0,
          accuracy_30d: 0,
          students_30d: 0,
          avg_time_s_30d: null,
          trophies: 0,
          best_streak: 0,
          last_played_at: null,
        }

        s.attempts_30d += 1
        e.attempts_30d += 1

        if (row.correct) {
          s.correct_30d += 1
          e.correct_30d += 1
        } else {
          s.incorrect_30d += 1
          e.incorrect_30d += 1
        }

        if (row.time_seconds != null) {
          // running average (simple)
          s.avg_time_s_30d =
            s.avg_time_s_30d == null
              ? row.time_seconds
              : (s.avg_time_s_30d * (s.attempts_30d - 1) + row.time_seconds) / s.attempts_30d

          e.avg_time_s_30d =
            e.avg_time_s_30d == null
              ? row.time_seconds
              : (e.avg_time_s_30d * (e.attempts_30d - 1) + row.time_seconds) / e.attempts_30d
        }

        if (!s.last_attempt_30d || new Date(row.created_at) > new Date(s.last_attempt_30d)) {
          s.last_attempt_30d = row.created_at
        }

        byStudent.set(row.student_id, s)
        byExercise.set(row.exercise_id, e)
      }

      // students count per exercise (30d)
      const studentsPerExercise = new Map<string, Set<string>>()
      for (const row of attemptsArr) {
        const set = studentsPerExercise.get(row.exercise_id) || new Set<string>()
        set.add(row.student_id)
        studentsPerExercise.set(row.exercise_id, set)
      }


      // Apply gamification
      // student aggregates: sum trophies across exercises, best streak max, last played max
      const gamByStudent = new Map<string, { trophies: number; best_streak: number; last: string | null }>()
      const gamByExercise = new Map<string, { trophies: number; best_streak: number; last: string | null }>()
      for (const g of gamRows) {
        const t = g.trophies ?? 0
        const st = g.streak ?? 0
        const lp = g.last_played_at || g.updated_at || null

        const sAgg = gamByStudent.get(g.student_id) || { trophies: 0, best_streak: 0, last: null }
        sAgg.trophies += t
        sAgg.best_streak = Math.max(sAgg.best_streak, st)
        if (lp && (!sAgg.last || new Date(lp) > new Date(sAgg.last))) sAgg.last = lp
        gamByStudent.set(g.student_id, sAgg)

        const eAgg = gamByExercise.get(g.exercise_id) || { trophies: 0, best_streak: 0, last: null }
        eAgg.trophies += t
        eAgg.best_streak = Math.max(eAgg.best_streak, st)
        if (lp && (!eAgg.last || new Date(lp) > new Date(eAgg.last))) eAgg.last = lp
        gamByExercise.set(g.exercise_id, eAgg)
      }

      const studentsList = Array.from(byStudent.values()).map((s) => {
        const acc = s.attempts_30d ? Math.round((s.correct_30d / s.attempts_30d) * 100) : 0
        const g = gamByStudent.get(s.student_id)
        return {
          ...s,
          accuracy_30d: acc,
          trophies: g?.trophies ?? 0,
          best_streak: g?.best_streak ?? 0,
          last_played_at: g?.last ?? null,
        }
      })

      const exercisesList = Array.from(byExercise.values()).map((e) => {
        const acc = e.attempts_30d ? Math.round((e.correct_30d / e.attempts_30d) * 100) : 0
        const g = gamByExercise.get(e.exercise_id)
        return {
          ...e,
          accuracy_30d: acc,
          trophies: g?.trophies ?? 0,
          best_streak: g?.best_streak ?? 0,
          last_played_at: g?.last ?? null,
        }
      })

      setStudents(studentsList)
      setExercises(exercisesList)
      setLoading(false)
    }

    load()
  }, [classroomId, supabase, institution?.id])

  // KPIs
  const totals = useMemo(() => {
    const totalAttempts = students.reduce((a, s) => a + s.attempts_30d, 0)
    const totalCorrect = students.reduce((a, s) => a + s.correct_30d, 0)
    const totalIncorrect = students.reduce((a, s) => a + s.incorrect_30d, 0)
    const accuracy = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0

    const avgTimeAll = (() => {
      const times = students.map((s) => s.avg_time_s_30d).filter((x): x is number => x != null)
      if (times.length === 0) return null
      const sum = times.reduce((a, b) => a + b, 0)
      return sum / times.length
    })()

    const totalTrophies = students.reduce((a, s) => a + s.trophies, 0)
    const bestStreak = students.reduce((a, s) => Math.max(a, s.best_streak), 0)

    return {
      totalAttempts,
      totalCorrect,
      totalIncorrect,
      accuracy,
      avgTimeAll,
      totalTrophies,
      bestStreak,
      activeStudents: students.length,
      activeExercises: exercises.length,
    }
  }, [students, exercises])

  // Filters + sorting
  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q
      ? students.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.student_id.toLowerCase().includes(q)
        )
      : students

    const get = (s: StudentRow) => {
      switch (sortStudents) {
        case "accuracy":
          return s.accuracy_30d
        case "attempts":
          return s.attempts_30d
        case "correct":
          return s.correct_30d
        case "incorrect":
          return s.incorrect_30d
        case "avg_time":
          return s.avg_time_s_30d ?? -1
        case "trophies":
          return s.trophies
        case "streak":
          return s.best_streak
        case "last":
          return s.last_attempt_30d ? new Date(s.last_attempt_30d).getTime() : 0
        default:
          return s.accuracy_30d
      }
    }

    return [...base].sort((a, b) => {
      const va = get(a)
      const vb = get(b)
      const diff = va > vb ? 1 : va < vb ? -1 : 0
      return descending ? -diff : diff
    })
  }, [students, query, sortStudents, descending])

  const filteredExercises = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q
      ? exercises.filter(
          (e) =>
            e.label.toLowerCase().includes(q) ||
            e.exercise_id.toLowerCase().includes(q) ||
            e.type.toLowerCase().includes(q)
        )
      : exercises

    const get = (e: ExerciseRow) => {
      switch (sortExercises) {
        case "attempts":
          return e.attempts_30d
        case "accuracy":
          return e.accuracy_30d
        case "students":
          return e.students_30d
        case "avg_time":
          return e.avg_time_s_30d ?? -1
        case "trophies":
          return e.trophies
        case "streak":
          return e.best_streak
        case "last":
          return e.last_played_at ? new Date(e.last_played_at).getTime() : 0
        default:
          return e.attempts_30d
      }
    }

    return [...base].sort((a, b) => {
      const va = get(a)
      const vb = get(b)
      const diff = va > vb ? 1 : va < vb ? -1 : 0
      return descending ? -diff : diff
    })
  }, [exercises, query, sortExercises, descending])

  const accuracyTone =
    totals.accuracy >= 80 ? "good" : totals.accuracy >= 60 ? "warn" : "bad"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rendimiento del Aula"
        description="Últimos 30 días: desempeño, participación y gamificación."
        breadcrumbs={[
          { label: "Mis Clases", href: "/dashboard/teacher" },
          { label: "Aula", href: `/dashboard/teacher/classroom/${classroomId}` },
          { label: "Rendimiento" },
        ]}
      />

      {/* Layout: Left KPI rail (vertical) + Main */}
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* LEFT KPI RAIL */}
        <aside className="space-y-4">
          <div className="rounded-2xl border bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),transparent_60%),linear-gradient(180deg,rgba(255,255,255,0.7),rgba(255,255,255,0.2))] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Pulso general</div>
                <div className="mt-1 text-lg font-semibold tracking-tight">
                  Aula activa (30 días)
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Precisión</span>
                    <span className="font-medium text-foreground">{totals.accuracy}%</span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={totals.accuracy} />
                  </div>
                </div>
              </div>
              <div className="rounded-xl border bg-background/60 p-2">
                <Target className="h-5 w-5 text-foreground/80" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border bg-card p-3">
                <div className="text-xs text-muted-foreground">Estudiantes</div>
                <div className="mt-1 font-semibold">{totals.activeStudents}</div>
              </div>
              <div className="rounded-xl border bg-card p-3">
                <div className="text-xs text-muted-foreground">Ejercicios</div>
                <div className="mt-1 font-semibold">{totals.activeExercises}</div>
              </div>
            </div>
          </div>

          <KpiCard
            title="Intentos (30 días)"
            value={totals.totalAttempts}
            subtitle="Total de interacciones registradas"
            icon={BookOpenCheck}
          />
          <KpiCard
            title="Precisión (30 días)"
            value={`${totals.accuracy}%`}
            subtitle={`${totals.totalCorrect} correctas • ${totals.totalIncorrect} incorrectas`}
            icon={CheckCircle2}
            tone={accuracyTone}
          />
  
          <KpiCard
            title="Trofeos (gamificación)"
            value={totals.totalTrophies}
            subtitle="Suma del aula (según estado actual)"
            icon={Trophy}
            tone={totals.totalTrophies >= 20 ? "good" : "default"}
          />

        </aside>

        {/* MAIN */}
        <main className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Segmented
                value={tab}
                onChange={(v) => setTab(v as any)}
                options={[
                  { value: "students", label: "Estudiantes", icon: Users },
                  { value: "exercises", label: "Ejercicios", icon: BookOpenCheck },
                ]}
              />

              <button
                onClick={() => setDescending((d) => !d)}
                className="inline-flex items-center gap-2 rounded-xl border bg-background px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowUpDown className="h-4 w-4" />
                {descending ? "Desc" : "Asc"}
              </button>

              {tab === "students" ? (
                <select
                  value={sortStudents}
                  onChange={(e) => setSortStudents(e.target.value as SortKeyStudents)}
                  className="rounded-xl border bg-background px-3 py-2 text-sm"
                >
                  <option value="accuracy">Orden: Precisión</option>
                  <option value="attempts">Orden: Intentos</option>
                  <option value="correct">Orden: Correctas</option>
                  <option value="incorrect">Orden: Incorrectas</option>
                  
                  <option value="trophies">Orden: Trofeos</option>
                  <option value="streak">Orden: Racha</option>
                  <option value="last">Orden: Último intento</option>
                </select>
              ) : (
                <select
                  value={sortExercises}
                  onChange={(e) => setSortExercises(e.target.value as SortKeyExercises)}
                  className="rounded-xl border bg-background px-3 py-2 text-sm"
                >
                  <option value="attempts">Orden: Intentos</option>
                  <option value="accuracy">Orden: Precisión</option>
                  <option value="students">Orden: Estudiantes</option>
                  
                  <option value="trophies">Orden: Trofeos</option>
                  <option value="streak">Orden: Racha</option>
                  <option value="last">Orden: Última actividad</option>
                </select>
              )}
            </div>

            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tab === "students" ? "Buscar estudiante..." : "Buscar ejercicio / tipo..."}
                className="w-full rounded-xl border bg-background pl-9 pr-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
              Cargando rendimiento...
            </div>
          ) : tab === "students" ? (
            <section className="rounded-2xl border bg-card">
              <div className="flex items-center justify-between gap-3 border-b p-4">
                <div>
                  <h2 className="text-lg font-semibold">Ranking de Estudiantes</h2>
                  <p className="text-sm text-muted-foreground">
                    Precisión, participación, tiempo y gamificación (trofeos/racha).
                  </p>
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">
                  No hay intentos registrados (o la búsqueda no encontró coincidencias).
                </div>
              ) : (
                <div className="divide-y">
                  {filteredStudents.map((s) => (
                    <button
                      key={s.student_id}
                      type="button"
                      onClick={() =>
                        router.push(
                          `/dashboard/teacher/classroom/${classroomId}/performance/${s.student_id}`
                        )
                      }
                      className="w-full text-left p-4 hover:bg-muted/30 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate font-semibold">{s.name}</div>

                            <span
                              className={[
                                "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs",
                                badgeVariantFromAccuracy(s.accuracy_30d),
                              ].join(" ")}
                            >
                              <Target className="h-3.5 w-3.5" />
                              {s.accuracy_30d}%
                            </span>

                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                              <Trophy className="h-3.5 w-3.5" />
                              {s.trophies}
                            </span>

                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                              <Flame className="h-3.5 w-3.5" />
                              {s.best_streak}
                            </span>
                          </div>

                          <div className="mt-2">
                            <ProgressBar value={s.accuracy_30d} />
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <BookOpenCheck className="h-3.5 w-3.5" />
                              {s.attempts_30d} intentos
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {s.correct_30d} correctas
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <XCircle className="h-3.5 w-3.5" />
                              {s.incorrect_30d} incorrectas
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {formatTimeSeconds(s.avg_time_s_30d)}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 md:w-[260px]">
                          <div className="rounded-xl border bg-background p-3">
                            <div className="text-[11px] text-muted-foreground">Último intento (30d)</div>
                            <div className="mt-1 text-sm font-semibold">{formatDate(s.last_attempt_30d)}</div>
                          </div>
                          <div className="rounded-xl border bg-background p-3">
                            <div className="text-[11px] text-muted-foreground">Última actividad (gamif.)</div>
                            <div className="mt-1 text-sm font-semibold">{formatDate(s.last_played_at)}</div>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="rounded-2xl border bg-card">
              <div className="flex items-center justify-between gap-3 border-b p-4">
                <div>
                  <h2 className="text-lg font-semibold">Rendimiento por Ejercicio</h2>
                  <p className="text-sm text-muted-foreground">
                    Intentos, precisión, alumnos únicos y señales de gamificación.
                  </p>
                </div>
              </div>

              {filteredExercises.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">
                  No hay ejercicios con intentos (o la búsqueda no encontró coincidencias).
                </div>
              ) : (
                <div className="divide-y">
                  {filteredExercises.map((e) => (
                    <div key={e.exercise_id} className="p-4 hover:bg-muted/30 transition">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate font-semibold">{e.label}</div>

                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                              {e.type}
                            </span>

                            <span
                              className={[
                                "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs",
                                badgeVariantFromAccuracy(e.accuracy_30d),
                              ].join(" ")}
                            >
                              <Target className="h-3.5 w-3.5" />
                              {e.accuracy_30d}%
                            </span>

                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                              <Users className="h-3.5 w-3.5" />
                              {e.students_30d}
                            </span>

                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                              <Trophy className="h-3.5 w-3.5" />
                              {e.trophies}
                            </span>

                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                              <Flame className="h-3.5 w-3.5" />
                              {e.best_streak}
                            </span>
                          </div>

                          <div className="mt-2">
                            <ProgressBar value={e.accuracy_30d} />
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <BookOpenCheck className="h-3.5 w-3.5" />
                              {e.attempts_30d} intentos
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {e.correct_30d} correctas
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <XCircle className="h-3.5 w-3.5" />
                              {e.incorrect_30d} incorrectas
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {formatTimeSeconds(e.avg_time_s_30d)}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:w-[260px]">
                          <div className="rounded-xl border bg-background p-3">
                            <div className="text-[11px] text-muted-foreground">Última actividad (gamif.)</div>
                            <div className="mt-1 text-sm font-semibold">{formatDate(e.last_played_at)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  )
}
