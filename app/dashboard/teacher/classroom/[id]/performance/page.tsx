"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { PageHeader, ChartCard, BarChart, DoughnutChart, chartColors } from "@/components/dashboard/core"
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
  Activity,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
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

function ProgressBar({ value, height = "h-2" }: { value: number; height?: string }) {
  const v = clamp(value, 0, 100)
  const colorClass =
    v >= 80
      ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
      : v >= 60
      ? "bg-gradient-to-r from-amber-500 to-amber-600"
      : "bg-gradient-to-r from-rose-500 to-rose-600"

  return (
    <div className={`${height} w-full rounded-full bg-muted overflow-hidden`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${v}%` }}
      />
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
    <div className="inline-flex rounded-2xl border bg-card p-1 shadow-sm">
      {options.map((o) => {
        const active = o.value === value
        const Icon = o.icon
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={[
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
              active
                ? "bg-foreground text-background shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
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
  const [exporting, setExporting] = useState(false)

  const [tab, setTab] = useState<"students" | "exercises">("students")
  const [query, setQuery] = useState("")
  const [sortStudents, setSortStudents] = useState<SortKeyStudents>("accuracy")
  const [sortExercises, setSortExercises] = useState<SortKeyExercises>("attempts")
  const [descending, setDescending] = useState(true)
  const [currentChartIndex, setCurrentChartIndex] = useState(0)

  useEffect(() => {
    if (!classroomId) return

    const load = async () => {
      setLoading(true)

      const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

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

      const assignmentsQuery = supabase
        .from("edu_exercise_assignments")
        .select("exercise:edu_exercises ( id, description, exercise_type )")
        .eq("classroom_id", classroomId)
        .eq("active", true)

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

      const studentsPerExercise = new Map<string, Set<string>>()
      for (const row of attemptsArr) {
        const set = studentsPerExercise.get(row.exercise_id) || new Set<string>()
        set.add(row.student_id)
        studentsPerExercise.set(row.exercise_id, set)
      }

      studentsPerExercise.forEach((studentSet, exerciseId) => {
        const e = byExercise.get(exerciseId)
        if (e) {
          e.students_30d = studentSet.size
          byExercise.set(exerciseId, e)
        }
      })

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

  const studentsByAccuracy = useMemo(
    () => [...students].sort((a, b) => b.accuracy_30d - a.accuracy_30d),
    [students],
  )

  const studentAccuracyChart = useMemo(
    () => ({
      labels: studentsByAccuracy.map((s, index) =>
        `${index + 1}. ${s.name.split(' ').slice(0, 2).join(' ')}`
      ),
      values: studentsByAccuracy.map((s) => s.accuracy_30d),
      label: "Precisión %",
    }),
    [studentsByAccuracy],
  )

  const exercisesByAttempts = useMemo(
    () => [...exercises].sort((a, b) => b.attempts_30d - a.attempts_30d),
    [exercises],
  )

  const exercisesByAccuracy = useMemo(
    () => [...exercises].sort((a, b) => b.accuracy_30d - a.accuracy_30d),
    [exercises],
  )

  const exerciseAttemptsChart = useMemo(
    () => ({
      labels: exercisesByAttempts.map((e, index) =>
        `${index + 1}. ${e.label.slice(0, 30)}${e.label.length > 30 ? '...' : ''}`
      ),
      values: exercisesByAttempts.map((e) => e.attempts_30d),
      label: "Intentos",
    }),
    [exercisesByAttempts],
  )

  const exerciseAccuracyChart = useMemo(
    () => ({
      labels: exercisesByAccuracy.map((e, index) => 
        `${index + 1}. ${e.label.slice(0, 30)}${e.label.length > 30 ? '...' : ''}`
      ),
      values: exercisesByAccuracy.map((e) => e.accuracy_30d),
      label: "Precisión %",
    }),
    [exercisesByAccuracy],
  )

  const accuracyDistributionData = useMemo(() => {
    const counts = [0, 0, 0]
    students.forEach((s) => {
      if (s.accuracy_30d >= 80) counts[0]++
      else if (s.accuracy_30d >= 60) counts[1]++
      else counts[2]++
    })
    return {
      labels: ["Excelente (≥80%)", "Bueno (60-79%)", "Necesita mejorar (<60%)"],
      values: counts,
    }
  }, [students])

  const charts = [
    {
      id: "student-accuracy",
      title: "Estudiantes por Precisión",
      subtitle: `Todos los estudiantes del aula (${students.length} total)`,
      component: (
        <BarChart
          data={studentAccuracyChart}
          height={520}
          color="accent"
        />
      ),
      hasData: studentAccuracyChart.values.length > 0,
    },
    {
      id: "accuracy-distribution",
      title: "Distribución de Rendimiento",
      subtitle: "Clasificación del aula por nivel de precisión",
      component: (
        <div className="space-y-6">
          <DoughnutChart
            data={accuracyDistributionData}
            height={420}
            showLegend
            colors={[chartColors.secondary, chartColors.primary, chartColors.destructive]}
          />
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div className="rounded-xl border bg-emerald-500/5 p-4">
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {accuracyDistributionData.values[0]}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Excelente</div>
            </div>
            <div className="rounded-xl border bg-amber-500/5 p-4">
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {accuracyDistributionData.values[1]}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Bueno</div>
            </div>
            <div className="rounded-xl border bg-rose-500/5 p-4">
              <div className="text-3xl font-bold text-rose-600 dark:text-rose-400">
                {accuracyDistributionData.values[2]}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">A Mejorar</div>
            </div>
          </div>
        </div>
      ),
      hasData: accuracyDistributionData.values.reduce((a, v) => a + v, 0) > 0,
    },
    {
      id: "exercise-attempts",
      title: "Ejercicios Más Practicados",
      subtitle: `Todos los ejercicios del aula (${exercises.length} total)`,
      component: (
        <BarChart
          data={exerciseAttemptsChart}
          height={520}
          color="secondary"
        />
      ),
      hasData: exerciseAttemptsChart.values.length > 0,
    },
    {
      id: "exercise-accuracy",
      title: "Ejercicios por Precisión",
      subtitle: "Todos los ejercicios ordenados por nivel de dominio",
      component: (
        <BarChart
          data={exerciseAccuracyChart}
          height={520}
          color="primary"
          horizontal
        />
      ),
      hasData: exerciseAccuracyChart.values.length > 0,
    },
  ]

  const currentChart = charts[currentChartIndex]

  const nextChart = () => {
    setCurrentChartIndex((prev) => (prev + 1) % charts.length)
  }

  const prevChart = () => {
    setCurrentChartIndex((prev) => (prev - 1 + charts.length) % charts.length)
  }

  const handleExportToExcel = async () => {
    setExporting(true)
    try {
      const XLSX = await import('xlsx')
      
      const wb = XLSX.utils.book_new()
      
      // Hoja de resumen
      const summaryData = [
        ['REPORTE DE RENDIMIENTO DEL AULA'],
        ['Fecha de generación:', new Date().toLocaleDateString()],
        [''],
        ['RESUMEN GENERAL'],
        ['Total de estudiantes:', totals.activeStudents],
        ['Total de ejercicios:', totals.activeExercises],
        ['Total de intentos:', totals.totalAttempts],
        ['Precisión promedio:', `${totals.accuracy}%`],
        ['Respuestas correctas:', totals.totalCorrect],
        ['Respuestas incorrectas:', totals.totalIncorrect],
        ['Trofeos totales:', totals.totalTrophies],
        ['Mejor racha:', totals.bestStreak],
      ]
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen')
      
      // Hoja de estudiantes
      const studentsData = [
        ['Ranking', 'Nombre', 'Intentos', 'Correctas', 'Incorrectas', 'Precisión %', 'Trofeos', 'Mejor Racha', 'Último Intento'],
        ...filteredStudents.map((s, index) => [
          index + 1,
          s.name,
          s.attempts_30d,
          s.correct_30d,
          s.incorrect_30d,
          s.accuracy_30d,
          s.trophies,
          s.best_streak,
          formatDate(s.last_attempt_30d),
        ]),
      ]
      const wsStudents = XLSX.utils.aoa_to_sheet(studentsData)
      XLSX.utils.book_append_sheet(wb, wsStudents, 'Estudiantes')
      
      // Hoja de ejercicios
      const exercisesData = [
        ['Ranking', 'Ejercicio', 'Tipo', 'Intentos', 'Correctas', 'Incorrectas', 'Precisión %', 'Estudiantes', 'Trofeos', 'Racha'],
        ...filteredExercises.map((e, index) => [
          index + 1,
          e.label,
          e.type,
          e.attempts_30d,
          e.correct_30d,
          e.incorrect_30d,
          e.accuracy_30d,
          e.students_30d,
          e.trophies,
          e.best_streak,
        ]),
      ]
      const wsExercises = XLSX.utils.aoa_to_sheet(exercisesData)
      XLSX.utils.book_append_sheet(wb, wsExercises, 'Ejercicios')
      
      XLSX.writeFile(wb, `Rendimiento_Aula_${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('Error al exportar:', error)
      alert('Hubo un error al exportar los datos')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Rendimiento del Aula"
        description="Análisis detallado de desempeño, participación y gamificación de los últimos 30 días."
        breadcrumbs={[
          { label: "Mis Clases", href: "/dashboard/teacher" },
          { label: "Aula", href: `/dashboard/teacher/classroom/${classroomId}` },
          { label: "Rendimiento" },
        ]}
      />

      {/* Hero KPI */}
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-muted/30 to-background p-8 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.1),transparent_50%)]" />
        <div className="relative">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border bg-background/80 p-3 shadow-lg">
                  <Activity className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    Rendimiento General
                  </div>
                  <div className="text-4xl font-bold tracking-tight">
                    {totals.accuracy}% Precisión
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {totals.totalCorrect} correctas
                </span>
                <span className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-rose-500" />
                  {totals.totalIncorrect} incorrectas
                </span>
                <span className="flex items-center gap-2">
                  <BookOpenCheck className="h-4 w-4" />
                  {totals.totalAttempts} intentos totales
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-2xl border bg-background/80 p-4 text-center shadow-lg backdrop-blur-sm">
                <Users className="mx-auto mb-2 h-5 w-5 text-primary" />
                <div className="text-2xl font-bold">{totals.activeStudents}</div>
                <div className="text-xs text-muted-foreground">Estudiantes</div>
              </div>
              <div className="rounded-2xl border bg-background/80 p-4 text-center shadow-lg backdrop-blur-sm">
                <BookOpenCheck className="mx-auto mb-2 h-5 w-5 text-secondary" />
                <div className="text-2xl font-bold">{totals.activeExercises}</div>
                <div className="text-xs text-muted-foreground">Ejercicios</div>
              </div>
              <div className="rounded-2xl border bg-background/80 p-4 text-center shadow-lg backdrop-blur-sm">
                <Trophy className="mx-auto mb-2 h-5 w-5 text-amber-500" />
                <div className="text-2xl font-bold">{totals.totalTrophies}</div>
                <div className="text-xs text-muted-foreground">Trofeos</div>
              </div>
              <div className="rounded-2xl border bg-background/80 p-4 text-center shadow-lg backdrop-blur-sm">
                <Flame className="mx-auto mb-2 h-5 w-5 text-orange-500" />
                <div className="text-2xl font-bold">{totals.bestStreak}</div>
                <div className="text-xs text-muted-foreground">Mejor Racha</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Carousel */}
      <div className="relative">
        <ChartCard
          title={currentChart.title}
          subtitle={currentChart.subtitle}
          className="shadow-2xl"
        >
          {currentChart.hasData ? (
            <div className="relative">
              {currentChart.component}
              
              <div className="absolute left-0 right-0 top-1/2 flex -translate-y-1/2 items-center justify-between px-4 pointer-events-none">
                <button
                  onClick={prevChart}
                  className="pointer-events-auto rounded-full border bg-background/90 p-3 shadow-xl transition-all hover:scale-110 hover:bg-background hover:shadow-2xl"
                  aria-label="Gráfico anterior"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={nextChart}
                  className="pointer-events-auto rounded-full border bg-background/90 p-3 shadow-xl transition-all hover:scale-110 hover:bg-background hover:shadow-2xl"
                  aria-label="Siguiente gráfico"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-[520px] items-center justify-center">
              <p className="text-sm text-muted-foreground">Sin datos disponibles</p>
            </div>
          )}
          
          <div className="mt-6 flex items-center justify-center gap-2">
            {charts.map((chart, index) => (
              <button
                key={chart.id}
                onClick={() => setCurrentChartIndex(index)}
                className={[
                  "h-2 rounded-full transition-all",
                  index === currentChartIndex
                    ? "w-8 bg-primary"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50",
                ].join(" ")}
                aria-label={`Ver ${chart.title}`}
              />
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-lg md:flex-row md:items-center md:justify-between">
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
            className="inline-flex items-center gap-2 rounded-xl border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:shadow-md"
          >
            <ArrowUpDown className="h-4 w-4" />
            {descending ? "Descendente" : "Ascendente"}
          </button>

          {tab === "students" ? (
            <select
              value={sortStudents}
              onChange={(e) => setSortStudents(e.target.value as SortKeyStudents)}
              className="rounded-xl border bg-background px-4 py-2.5 text-sm font-medium shadow-sm transition-all hover:shadow-md"
            >
              <option value="accuracy">📊 Precisión</option>
              <option value="attempts">📝 Intentos</option>
              <option value="correct">✅ Correctas</option>
              <option value="incorrect">❌ Incorrectas</option>
              <option value="trophies">🏆 Trofeos</option>
              <option value="streak">🔥 Racha</option>
              <option value="last">📅 Último intento</option>
            </select>
          ) : (
            <select
              value={sortExercises}
              onChange={(e) => setSortExercises(e.target.value as SortKeyExercises)}
              className="rounded-xl border bg-background px-4 py-2.5 text-sm font-medium shadow-sm transition-all hover:shadow-md"
            >
              <option value="attempts">📝 Intentos</option>
              <option value="accuracy">📊 Precisión</option>
              <option value="students">👥 Estudiantes</option>
              <option value="trophies">🏆 Trofeos</option>
              <option value="streak">🔥 Racha</option>
              <option value="last">📅 Última actividad</option>
            </select>
          )}

          <button
            onClick={handleExportToExcel}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-xl border bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:bg-emerald-700 hover:shadow-lg disabled:opacity-50"
          >
            {exporting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Exportando...
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4" />
                Exportar a Excel
              </>
            )}
          </button>
        </div>

        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-4 top-3 h-5 w-5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "students" ? "Buscar estudiante..." : "Buscar ejercicio..."}
            className="w-full rounded-xl border bg-background pl-11 pr-4 py-2.5 text-sm shadow-sm transition-all focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Tables */}
      {loading ? (
        <div className="flex h-96 items-center justify-center rounded-3xl border bg-card shadow-lg">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Cargando datos de rendimiento...</p>
          </div>
        </div>
      ) : tab === "students" ? (
        <section className="rounded-3xl border bg-gradient-to-br from-card to-muted/20 p-1 shadow-2xl">
          <div className="overflow-hidden rounded-3xl bg-card">
            <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">Ranking de Estudiantes</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Análisis detallado de desempeño, tiempo y gamificación
                </p>
              </div>
              <div className="rounded-2xl border bg-background px-4 py-2 text-center shadow-sm">
                <div className="text-2xl font-bold">{filteredStudents.length}</div>
                <div className="text-xs text-muted-foreground">
                  {filteredStudents.length === 1 ? "estudiante" : "estudiantes"}
                </div>
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="flex h-96 items-center justify-center">
                <div className="text-center">
                  <Search className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    No hay datos disponibles o no se encontraron coincidencias
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredStudents.map((s, index) => (
                  <button
                    key={s.student_id}
                    type="button"
                    onClick={() =>
                      router.push(
                        `/dashboard/teacher/classroom/${classroomId}/performance/${s.student_id}`
                      )
                    }
                    className="group w-full text-left px-6 py-5 transition-all hover:bg-primary/5 hover:border-l-4 hover:border-l-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/20 to-primary/5 text-xl font-black transition-all group-hover:scale-110 group-hover:shadow-lg group-hover:border-primary/40 group-hover:from-primary/30 group-hover:to-primary/10">
                        {index + 1}
                      </div>

                      <div className="flex-1 space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2">
                            <div className="text-xl font-black text-foreground group-hover:text-primary transition-colors">
                              {s.name}
                            </div>
                            <div className="text-sm text-primary font-semibold group-hover:underline">
                              Ver detalle →
                            </div>
                          </div>
                          <span
                            className={[
                              "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-black uppercase tracking-wide shadow-md ring-2",
                              s.accuracy_30d >= 80
                                ? "bg-emerald-600 text-white ring-emerald-500"
                                : s.accuracy_30d >= 60
                                ? "bg-amber-600 text-white ring-amber-500"
                                : "bg-rose-600 text-white ring-rose-500",
                            ].join(" ")}
                          >
                            <Target className="h-4 w-4" />
                            {s.accuracy_30d}%
                          </span>
                          {s.trophies > 0 && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 text-white px-4 py-1.5 text-sm font-black shadow-md ring-2 ring-amber-500">
                              <Trophy className="h-4 w-4" />
                              {s.trophies}
                            </span>
                          )}
                          {s.best_streak > 0 && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-600 text-white px-4 py-1.5 text-sm font-black shadow-md ring-2 ring-orange-500">
                              <Flame className="h-4 w-4" />
                              {s.best_streak}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="grid gap-3 text-sm md:grid-cols-3">
                            <div className="flex items-center gap-2 rounded-xl border-2 border-primary/30 bg-primary/10 px-4 py-2.5 font-bold">
                              <BookOpenCheck className="h-5 w-5 text-primary" />
                              <span className="text-lg font-black text-primary">{s.attempts_30d}</span>
                              <span className="text-foreground">intentos</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-xl border-2 border-emerald-600/40 bg-emerald-600/20 px-4 py-2.5 font-bold">
                              <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                              <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">{s.correct_30d}</span>
                              <span className="text-foreground">correctas</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-xl border-2 border-rose-600/40 bg-rose-600/20 px-4 py-2.5 font-bold">
                              <XCircle className="h-5 w-5 text-rose-700 dark:text-rose-400" />
                              <span className="text-lg font-black text-rose-700 dark:text-rose-400">{s.incorrect_30d}</span>
                              <span className="text-foreground">incorrectas</span>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <div className="rounded-xl border-2 bg-background px-5 py-3 text-center shadow-md">
                              <div className="text-xs font-bold text-muted-foreground uppercase">Último intento</div>
                              <div className="mt-1 text-base font-black text-foreground">{formatDate(s.last_attempt_30d)}</div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-bold text-foreground">Progreso de precisión</span>
                            <span className="text-lg font-black text-foreground">{s.accuracy_30d}%</span>
                          </div>
                          <ProgressBar value={s.accuracy_30d} height="h-3" />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border bg-gradient-to-br from-card to-muted/20 p-1 shadow-2xl">
          <div className="overflow-hidden rounded-3xl bg-card">
            <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">Análisis de Ejercicios</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Desempeño, participación y métricas de gamificación
                </p>
              </div>
              <div className="rounded-2xl border bg-background px-4 py-2 text-center shadow-sm">
                <div className="text-2xl font-bold">{filteredExercises.length}</div>
                <div className="text-xs text-muted-foreground">
                  {filteredExercises.length === 1 ? "ejercicio" : "ejercicios"}
                </div>
              </div>
            </div>

            {filteredExercises.length === 0 ? (
              <div className="flex h-96 items-center justify-center">
                <div className="text-center">
                  <Search className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    No hay datos disponibles o no se encontraron coincidencias
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredExercises.map((e, index) => (
                  <div
                    key={e.exercise_id}
                    className="group px-6 py-5 transition-all hover:bg-gradient-to-r hover:from-muted/30 hover:to-transparent"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 bg-gradient-to-br from-secondary/10 to-secondary/5 text-lg font-bold">
                        {index + 1}
                      </div>

                      <div className="flex-1 space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="text-lg font-bold text-foreground">{e.label}</div>
                          <span className="inline-flex items-center rounded-full bg-muted/80 px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground shadow-sm ring-1 ring-border">
                            {e.type}
                          </span>
                          <span
                            className={[
                              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide shadow-sm",
                              badgeVariantFromAccuracy(e.accuracy_30d),
                            ].join(" ")}
                          >
                            <Target className="h-3.5 w-3.5" />
                            {e.accuracy_30d}%
                          </span>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                          <div className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2">
                            <Users className="h-4 w-4 text-primary" />
                            <span className="font-semibold">{e.students_30d}</span>
                            <span className="text-xs text-muted-foreground">estudiantes</span>
                          </div>
                          <div className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2">
                            <BookOpenCheck className="h-4 w-4 text-secondary" />
                            <span className="font-semibold">{e.attempts_30d}</span>
                            <span className="text-xs text-muted-foreground">intentos</span>
                          </div>
                          <div className="flex items-center gap-2 rounded-xl border bg-amber-500/5 px-3 py-2">
                            <Trophy className="h-4 w-4 text-amber-600" />
                            <span className="font-semibold">{e.trophies}</span>
                            <span className="text-xs text-muted-foreground">trofeos</span>
                          </div>
                          <div className="flex items-center gap-2 rounded-xl border bg-orange-500/5 px-3 py-2">
                            <Clock className="h-4 w-4 text-orange-600" />
                            <span className="font-semibold">{formatTimeSeconds(e.avg_time_s_30d)}</span>
                            <span className="text-xs text-muted-foreground">promedio</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Nivel de dominio</span>
                              <span className="font-bold">{e.accuracy_30d}%</span>
                            </div>
                            <ProgressBar value={e.accuracy_30d} height="h-2.5" />
                          </div>
                          {e.best_streak > 0 && (
                            <div className="flex items-center gap-2 rounded-xl border bg-orange-500/10 px-4 py-2.5 shadow-sm">
                              <Flame className="h-5 w-5 text-orange-600" />
                              <div>
                                <div className="text-lg font-bold text-orange-600">{e.best_streak}</div>
                                <div className="text-[10px] text-muted-foreground">racha máx</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}