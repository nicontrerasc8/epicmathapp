"use client"

import { useParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { FormEvent } from "react"
import { createClient } from "@/utils/supabase/client"
import { PageHeader } from "@/components/dashboard/core"
import {
  Trophy,
  Flame,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BookOpenCheck,
  Calendar,
  MessageSquare,
  Send,
  Award,
  Activity,
  Zap,
  Brain,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  FileSpreadsheet,
  ChevronUp,
  ChevronDownCircle,
} from "lucide-react"

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
  active: boolean | null
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

type AdnRow = {
  student_id: string
  classroom_id: string
  ritmo: string
  tolerancia_error: string
  persistencia: string
  uso_pistas: string
  reaccion_feedback: string
  estilo_aprendizaje: string
  total_attempts: number
}

const ADN_PROFILE_ORDER = ["explorador", "equilibrado", "pensador", "cauteloso", "impulsivo", "en_observacion"] as const
type AdnProfileKey = (typeof ADN_PROFILE_ORDER)[number]
const ADN_PROFILE_LABELS: Record<AdnProfileKey, string> = {
  explorador: "🦊 Explorador",
  equilibrado: "🧠 Equilibrado",
  pensador: "🐢 Pensador",
  cauteloso: "🐼 Cauteloso",
  impulsivo: "⚡ Impulsivo",
  en_observacion: "👀 En observación",
}
const ADN_PROFILE_BADGE: Record<AdnProfileKey, string> = {
  explorador: "bg-emerald-600 text-white",
  equilibrado: "bg-sky-600 text-white",
  pensador: "bg-amber-600 text-white",
  cauteloso: "bg-rose-500 text-white",
  impulsivo: "bg-violet-600 text-white",
  en_observacion: "bg-slate-700 text-white",
}

function normalizeTraitName(key: string) {
  const k = key.toLowerCase()
  if (k === "ritmo") return "Ritmo"
  if (k === "persistencia") return "Persistencia"
  if (k === "uso_pistas") return "Uso de pistas"
  if (k === "tolerancia_error") return "Tolerancia al error"
  if (k === "reaccion_feedback") return "Reacción al feedback"
  return key
}

function normalizeTraitValue(val?: string | null) {
  if (!val) return "Desconocido"
  const v = val.toLowerCase().trim()
  if (v === "rápido" || v === "rapido") return "Rápido"
  if (v === "lento") return "Lento"
  if (v === "medio") return "Medio"
  if (v === "alta") return "Alta"
  if (v === "media") return "Media"
  if (v === "baja") return "Baja"
  if (v === "independiente") return "Independiente"
  if (v === "equilibrado") return "Equilibrado"
  if (v === "dependiente") return "Dependiente"
  if (v === "ignora") return "Ignora"
  if (v === "mejora") return "Mejora"
  if (v === "neutro") return "Neutro"
  if (v === "desconocido") return "Desconocido"
  return val
}

/* =========================
   HELPERS PEDAGÓGICOS
========================= */
function getStudentLevel(accuracy: number, attempts: number) {
  if (attempts < 5) return { label: "Datos insuficientes", tone: "default", icon: Activity }
  if (accuracy >= 85) return { label: "Dominio alto", tone: "success", icon: Trophy }
  if (accuracy >= 65) return { label: "En progreso", tone: "warning", icon: TrendingUp }
  return { label: "En riesgo", tone: "danger", icon: AlertTriangle }
}

function getMotivationTag(attempts: number, accuracy: number) {
  if (attempts >= 15 && accuracy >= 70) return { label: "Muy motivado", icon: Flame, color: "text-orange-600" }
  if (attempts >= 8) return { label: "Estable", icon: Activity, color: "text-blue-600" }
  return { label: "Necesita apoyo", icon: AlertTriangle, color: "text-amber-600" }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
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
      <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${v}%` }} />
    </div>
  )
}

/* =========================
   HELPERS UI (TABLAS)
========================= */
type PageSize = 5 | 10

function formatAttemptDateTime(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function normalizeText(v: string) {
  return v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

function PaginationBar({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  label,
}: {
  total: number
  page: number
  pageSize: PageSize
  onPageChange: (p: number) => void
  onPageSizeChange: (s: PageSize) => void
  label?: string
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = clamp(page, 1, pageCount)

  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const end = Math.min(total, safePage * pageSize)

  const canPrev = safePage > 1
  const canNext = safePage < pageCount

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {label ? (
          <span className="rounded-lg border bg-muted/30 px-2.5 py-1 text-xs font-black text-muted-foreground">
            {label}
          </span>
        ) : null}

        <span className="text-xs text-muted-foreground">
          Mostrando <span className="font-bold text-foreground">{start}</span>–<span className="font-bold text-foreground">{end}</span>{" "}
          de <span className="font-bold text-foreground">{total}</span>
        </span>

        <div className="ml-0 flex items-center gap-2 sm:ml-2">
          <span className="text-xs font-medium text-muted-foreground">Filas</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange((Number(e.target.value) as PageSize) ?? 10)}
            className="h-9 rounded-xl border-2 bg-background px-2 text-xs font-bold transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={!canPrev}
          className="inline-flex h-9 items-center gap-1 rounded-xl border-2 bg-background px-3 text-xs font-black transition-all hover:bg-muted/30 disabled:opacity-50"
          title="Primera página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={!canPrev}
          className="inline-flex h-9 items-center gap-1 rounded-xl border-2 bg-background px-3 text-xs font-black transition-all hover:bg-muted/30 disabled:opacity-50"
          title="Anterior"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>

        <div className="rounded-xl border-2 bg-background px-3 py-2 text-xs font-black">
          {safePage} / {pageCount}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={!canNext}
          className="inline-flex h-9 items-center gap-1 rounded-xl border-2 bg-background px-3 text-xs font-black transition-all hover:bg-muted/30 disabled:opacity-50"
          title="Siguiente"
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(pageCount)}
          disabled={!canNext}
          className="inline-flex h-9 items-center gap-1 rounded-xl border-2 bg-background px-3 text-xs font-black transition-all hover:bg-muted/30 disabled:opacity-50"
          title="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/* =========================
   PAGE
========================= */
export default function StudentPerformanceDetailPage() {
  const params = useParams() as { id?: string; studentId?: string }
  const classroomId = params?.id
  const studentId = params?.studentId

  const [exportingExcel, setExportingExcel] = useState(false)

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [rows, setRows] = useState<AttemptRow[]>([])
  const [studentName, setStudentName] = useState("Estudiante")

  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [feedbackRows, setFeedbackRows] = useState<FeedbackRow[]>([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [assignmentsLoaded, setAssignmentsLoaded] = useState(false)
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<"active" | "inactive">("active")
  const [adnProfile, setAdnProfile] = useState<AdnRow | null>(null)

  const [commentForm, setCommentForm] = useState({ assignmentId: "", comment: "" })
  const [commentStatus, setCommentStatus] = useState<{ tone: "error" | "success"; message: string } | null>(null)
  const [commentBusy, setCommentBusy] = useState(false)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [attemptsExpanded, setAttemptsExpanded] = useState(false)
  const [summaryExpanded, setSummaryExpanded] = useState(false)

  const fetchAssignmentsAndFeedback = useCallback(async () => {
    if (!studentId || !classroomId) return

    const supabase = createClient()
    setFeedbackLoading(true)
    setFeedbackError(null)
    setAssignmentsLoaded(false)

    try {
      const [assignmentsResult, feedbackResult] = await Promise.all([
        supabase
          .from("edu_exercise_assignments")
        .select("id, exercise_id, active, exercise:edu_exercises ( id, description, exercise_type )")
          .eq("classroom_id", classroomId)
          .eq("active", true),
        supabase
          .from("edu_assignment_feedback")
          .select(
            "id, comment, created_at, assignment_id, teacher_id, assignment:edu_exercise_assignments ( exercise_id, exercise:edu_exercises ( id, description, exercise_type ) )"
          )
          .eq("student_id", studentId)
          .order("created_at", { ascending: false }),
      ])

      if (assignmentsResult.error) throw assignmentsResult.error
      if (feedbackResult.error) throw feedbackResult.error

      setAssignments((assignmentsResult.data ?? []) as any[])
      setAssignmentsLoaded(true)
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
     FETCH (TODO EL HISTÓRICO)
  ========================= */
  useEffect(() => {
    if (!studentId || !classroomId) return

    const supabase = createClient()

    const load = async () => {
      setLoading(true)
      setErrorMsg(null)

      try {
        const [{ data: student }, { data, error }, { data: adnData, error: adnErr }] = await Promise.all([
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
            .order("created_at", { ascending: false }),
          supabase
            .from("edu_student_learning_adn_view")
            .select(
              "student_id, classroom_id, ritmo, tolerancia_error, persistencia, uso_pistas, reaccion_feedback, estilo_aprendizaje, total_attempts"
            )
            .eq("student_id", studentId)
            .eq("classroom_id", classroomId)
            .maybeSingle(),
        ])

        if (error) throw error
        if (adnErr) console.error(adnErr)

        setStudentName(`${student?.first_name || ""} ${student?.last_name || ""}`.trim() || "Estudiante")
        setRows((data ?? []) as any[])
        setAdnProfile((adnData ?? null) as AdnRow | null)
      } catch (e) {
        console.error(e)
        setErrorMsg("No se pudieron cargar los datos del alumno.")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [studentId, classroomId])

  const handleCommentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCommentStatus(null)

    if (!studentId || !classroomId) return

    const comment = commentForm.comment.trim()
    if (!commentForm.assignmentId || !comment) {
      setCommentStatus({ tone: "error", message: "Selecciona un ejercicio y escribe un comentario." })
      return
    }

    try {
      setCommentBusy(true)
      const supabase = createClient()
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser()

      if (userErr || !user) throw new Error("No se pudo validar tu sesion.")

      const { error } = await supabase.from("edu_assignment_feedback").insert({
        assignment_id: commentForm.assignmentId,
        student_id: studentId,
        teacher_id: user.id,
        comment,
      })

      if (error) throw error

      setCommentForm({ assignmentId: "", comment: "" })
      setCommentStatus({ tone: "success", message: "Comentario guardado correctamente." })
      await fetchAssignmentsAndFeedback()
    } catch (e: any) {
      setCommentStatus({ tone: "error", message: e?.message ?? "No se pudo guardar el comentario." })
    } finally {
      setCommentBusy(false)
    }
  }

  const assignmentExerciseIds = useMemo(() => {
    const set = new Set<string>()
    assignments.forEach((assignment) => {
      const id = assignment.exercise?.id || assignment.exercise_id
      if (!id) return
      const isActive = assignment.active ?? true
      const matchesFilter = assignmentStatusFilter === "active" ? isActive : !isActive
      if (matchesFilter) set.add(id)
    })
    return set
  }, [assignments, assignmentStatusFilter])

  /* =========================
     RESÚMENES
  ========================= */
  const relevantRows = useMemo(() => {
    if (!assignmentsLoaded) return rows
    if (assignmentExerciseIds.size === 0) return []
    return rows.filter((row) => {
      const id = row.exercise?.id
      return id ? assignmentExerciseIds.has(id) : false
    })
  }, [rows, assignmentsLoaded, assignmentExerciseIds])

  const resumen = useMemo(() => {
    const total = relevantRows.length
    const correctos = relevantRows.filter((r) => r.correct).length
    const incorrectos = total - correctos
    const accuracy = total ? Math.round((correctos / total) * 100) : 0
    return { total, correctos, incorrectos, accuracy }
  }, [relevantRows])

  const attemptsSorted = useMemo(() => {
    // ya vienen ordenados, pero aseguramos por si acaso
    return [...relevantRows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [relevantRows])

  const exerciseAgg = useMemo<ExerciseAgg[]>(() => {
    const map = new Map<string, ExerciseAgg>()

    relevantRows.forEach((r) => {
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
      accuracy: r.attempts ? Math.round((r.correct / r.attempts) * 100) : 0,
    }))
  }, [relevantRows])

  /* =========================
     INSIGHTS PEDAGÓGICOS
  ========================= */
  const studentProfileKey: AdnProfileKey = useMemo(() => {
    const estilo = (adnProfile?.estilo_aprendizaje || "en_observacion").toLowerCase()
    if (ADN_PROFILE_ORDER.includes(estilo as AdnProfileKey)) {
      return estilo as AdnProfileKey
    }
    return "en_observacion"
  }, [adnProfile])

  const profileInfo = useMemo(() => {
    const attempts = adnProfile?.total_attempts ?? 0
    const label = ADN_PROFILE_LABELS[studentProfileKey]
    const badgeClass = ADN_PROFILE_BADGE[studentProfileKey]
    const traits = [
      { key: "ritmo", value: normalizeTraitValue(adnProfile?.ritmo) },
      { key: "persistencia", value: normalizeTraitValue(adnProfile?.persistencia) },
      { key: "uso_pistas", value: normalizeTraitValue(adnProfile?.uso_pistas) },
      { key: "tolerancia_error", value: normalizeTraitValue(adnProfile?.tolerancia_error) },
      { key: "reaccion_feedback", value: normalizeTraitValue(adnProfile?.reaccion_feedback) },
    ].map((trait) => ({
      label: normalizeTraitName(trait.key),
      value: trait.value,
    }))

    return {
      label,
      badgeClass,
      attempts,
      traits,
    }
  }, [adnProfile, studentProfileKey])

  const insights = useMemo(() => {
    const level = getStudentLevel(resumen.accuracy, resumen.total)
    const motivation = getMotivationTag(resumen.total, resumen.accuracy)

    const critical = exerciseAgg.filter(e => e.accuracy < 60 && e.attempts >= 3)
    const reinforce = exerciseAgg.filter(e => e.accuracy >= 60 && e.accuracy < 75)
    const strong = exerciseAgg.filter(e => e.accuracy >= 85)

    return { level, motivation, critical, reinforce, strong }
  }, [resumen, exerciseAgg])

  const assignmentOptions = useMemo(() => {
    return [...assignments]
      .map((assignment) => {
        const exercise = assignment.exercise
        const label = exercise?.description || exercise?.id || assignment.exercise_id || "Ejercicio"
        const type = exercise?.exercise_type || "sin_tipo"
        return { id: assignment.id, label, type }
      })
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [assignments])

  const LevelIcon = insights.level.icon
  const MotivationIcon = insights.motivation.icon

  /* =========================
     TABLAS: FILTROS + PAGINACIÓN
  ========================= */
  const [attemptsSearch, setAttemptsSearch] = useState("")
  const [attemptsPageSize, setAttemptsPageSize] = useState<PageSize>(10)
  const [attemptsPage, setAttemptsPage] = useState(1)

  const filteredAttempts = useMemo(() => {
    const q = normalizeText(attemptsSearch)
    if (!q) return attemptsSorted
    return attemptsSorted.filter((r) => {
      const label = r.exercise?.description || r.exercise?.id || ""
      const type = r.exercise?.exercise_type || ""
      const result = r.correct ? "correcto" : "incorrecto"
      const hay = normalizeText(`${label} ${type} ${result}`)
      return hay.includes(q)
    })
  }, [attemptsSorted, attemptsSearch])

  useEffect(() => {
    setAttemptsPage(1)
  }, [attemptsSearch, attemptsPageSize])

  const attemptsPageCount = Math.max(1, Math.ceil(filteredAttempts.length / attemptsPageSize))
  useEffect(() => {
    if (attemptsPage > attemptsPageCount) setAttemptsPage(attemptsPageCount)
  }, [attemptsPage, attemptsPageCount])

  const attemptsPaged = useMemo(() => {
    const start = (attemptsPage - 1) * attemptsPageSize
    return filteredAttempts.slice(start, start + attemptsPageSize)
  }, [filteredAttempts, attemptsPage, attemptsPageSize])

  const [summarySearch, setSummarySearch] = useState("")
  const [summaryPageSize, setSummaryPageSize] = useState<PageSize>(10)
  const [summaryPage, setSummaryPage] = useState(1)

  const exerciseAggSorted = useMemo(() => {
    // diagnóstico: más intentos primero
    return [...exerciseAgg].sort((a, b) => b.attempts - a.attempts)
  }, [exerciseAgg])

  const filteredSummary = useMemo(() => {
    const q = normalizeText(summarySearch)
    if (!q) return exerciseAggSorted
    return exerciseAggSorted.filter((r) => {
      const hay = normalizeText(`${r.label} ${r.type}`)
      return hay.includes(q)
    })
  }, [exerciseAggSorted, summarySearch])

  useEffect(() => {
    setSummaryPage(1)
  }, [summarySearch, summaryPageSize])

  const summaryPageCount = Math.max(1, Math.ceil(filteredSummary.length / summaryPageSize))
  useEffect(() => {
    if (summaryPage > summaryPageCount) setSummaryPage(summaryPageCount)
  }, [summaryPage, summaryPageCount])

  const summaryPaged = useMemo(() => {
    const start = (summaryPage - 1) * summaryPageSize
    return filteredSummary.slice(start, start + summaryPageSize)
  }, [filteredSummary, summaryPage, summaryPageSize])

  const handleExportToExcel = useCallback(async () => {
    if (exportingExcel) return

    setExportingExcel(true)
    try {
      const XLSX = await import("xlsx")

      const attemptsData = [
        ["Fecha y Hora", "Ejercicio", "Tipo", "Resultado"],
        ...filteredAttempts.map((attempt) => {
          const label = attempt.exercise?.description || attempt.exercise?.id || "Ejercicio"
          const type = attempt.exercise?.exercise_type || "sin_tipo"
          const result = attempt.correct ? "Correcto" : "Incorrecto"
          return [formatAttemptDateTime(attempt.created_at), label, type, result]
        }),
      ]

      const summaryData = [
        ["Ejercicio", "Tipo", "Intentos", "Correctos", "Incorrectos", "Precisión"],
        ...filteredSummary.map((row) => [
          row.label,
          row.type,
          String(row.attempts),
          String(row.correct),
          String(row.incorrect),
          `${row.accuracy}%`,
        ]),
      ]

      const workbook = XLSX.utils.book_new()
      const wsAttempts = XLSX.utils.aoa_to_sheet(attemptsData)
      XLSX.utils.book_append_sheet(workbook, wsAttempts, "Intentos")
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(workbook, wsSummary, "Resumen")

      const safeName = (studentName || "estudiante").replace(/[^a-zA-Z0-9]/g, "_")
      const fileName = `detalle_${safeName}_${new Date().toISOString().split("T")[0]}.xlsx`
      XLSX.writeFile(workbook, fileName)
    } catch (error) {
      console.error("Error exportando a Excel", error)
    } finally {
      setExportingExcel(false)
    }
  }, [exportingExcel, filteredAttempts, filteredSummary, studentName])

  /* =========================
     RENDER
  ========================= */
  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Cargando perfil del estudiante...</p>
        </div>
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <p className="text-sm text-destructive">{errorMsg}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={studentName}
        description="Perfil de aprendizaje y análisis de rendimiento"
        breadcrumbs={[
          { label: "Mis Clases", href: "/dashboard/teacher" },
          { label: "Aula", href: `/dashboard/teacher/classroom/${classroomId}` },
          { label: "Rendimiento", href: `/dashboard/teacher/classroom/${classroomId}/performance` },
          { label: studentName },
        ]}
      />

      {/* Hero Stats */}
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-primary/5 to-background p-8 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.1),transparent_50%)]" />
        <div className="relative">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl border bg-background/80 p-3 shadow-lg">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <div>
              <div className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Diagnóstico Pedagógico
              </div>
              <div className="text-3xl font-bold tracking-tight">{studentName}</div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border bg-background/80 p-5 shadow-lg backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Intentos Totales
                  </div>
                  <div className="mt-2 text-3xl font-bold">{resumen.total}</div>
                </div>
                <BookOpenCheck className="h-8 w-8 text-primary" />
              </div>
            </div>

            <div
              className={`rounded-2xl border p-5 shadow-lg backdrop-blur-sm ${
                resumen.accuracy >= 80
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : resumen.accuracy >= 60
                  ? "bg-amber-500/10 border-amber-500/30"
                  : "bg-rose-500/10 border-rose-500/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Precisión Global
                  </div>
                  <div className="mt-2 text-3xl font-bold">{resumen.accuracy}%</div>
                </div>
                <Target className="h-8 w-8 text-primary" />
              </div>
            </div>

            <div className="rounded-2xl border bg-background/80 p-5 shadow-lg backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Nivel Actual
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <LevelIcon className="h-5 w-5" />
                    <span className="text-lg font-bold">{insights.level.label}</span>
                  </div>
                </div>
                <Award className="h-8 w-8 text-amber-500" />
              </div>
            </div>

            <div className="rounded-2xl border bg-background/80 p-5 shadow-lg backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Motivación
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <MotivationIcon className={`h-5 w-5 ${insights.motivation.color}`} />
                    <span className="text-lg font-bold">{insights.motivation.label}</span>
                  </div>
                </div>
                <Zap className="h-8 w-8 text-orange-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ADN Perfil */}
      <div className="rounded-3xl border bg-card p-6 shadow-xl">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border bg-background p-3">
            <Brain className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black">Perfil del estudiante</h2>
            <p className="text-sm text-muted-foreground">Tipo de perfil y rasgos pedagógicos</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,minmax(220px,0.5fr)] items-center">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Tipo de perfil</span>
            <div className={`text-2xl font-black ${profileInfo.badgeClass} p-4 rounded-xl`}>{profileInfo.label}</div>
            <span className="text-sm text-muted-foreground">{profileInfo.attempts} intentos registrados</span>
            <p className="mt-2 text-xs text-muted-foreground">
              Perfil calculado sobre los intentos más recientes para darte contexto rápido.
            </p>
          </div>

          <div className="space-y-3">
            {adnProfile ? (
              profileInfo.traits.map((trait) => (
                <div key={trait.label} className="flex items-center justify-between rounded-2xl border px-4 py-2 text-sm">
                  <span className="text-muted-foreground">{trait.label}</span>
                  <span className="font-semibold text-foreground">{trait.value}</span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border px-4 py-6 text-center text-sm text-muted-foreground">
                ADN en observación. Registra al menos 5 intentos para ver el perfil completo.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Insights Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {insights.critical.length > 0 && (
          <div className="rounded-3xl border-2 border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-rose-500/5 p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-rose-600 p-2.5">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-black">Temas Críticos</h3>
            </div>
            <div className="space-y-3">
              {insights.critical.map((t) => (
                <div key={t.id} className="rounded-xl border-2 border-rose-600/30 bg-background p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-foreground">{t.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{t.type}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-rose-600">{t.accuracy}%</div>
                      <div className="text-xs text-muted-foreground">{t.attempts} intentos</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={t.accuracy} height="h-2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {insights.reinforce.length > 0 && (
          <div className="rounded-3xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-amber-600 p-2.5">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-black">Para Reforzar</h3>
            </div>
            <div className="space-y-3">
              {insights.reinforce.map((t) => (
                <div key={t.id} className="rounded-xl border-2 border-amber-600/30 bg-background p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-foreground">{t.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{t.type}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-amber-600">{t.accuracy}%</div>
                      <div className="text-xs text-muted-foreground">{t.attempts} intentos</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={t.accuracy} height="h-2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {insights.strong.length > 0 && (
          <div className="rounded-3xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-600 p-2.5">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-black">Fortalezas</h3>
            </div>
            <div className="space-y-3">
              {insights.strong.map((t) => (
                <div key={t.id} className="rounded-xl border-2 border-emerald-600/30 bg-background p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-foreground">{t.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{t.type}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-emerald-600">{t.accuracy}%</div>
                      <div className="text-xs text-muted-foreground">{t.attempts} intentos</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={t.accuracy} height="h-2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Plan */}
      <div className="rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-primary p-3">
            <Target className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black">Plan de Acción Sugerido</h2>
            <p className="text-sm text-muted-foreground">Recomendaciones basadas en el rendimiento histórico</p>
          </div>
        </div>

        {insights.critical.length === 0 && insights.reinforce.length === 0 ? (
          <div className="rounded-2xl border-2 bg-background p-6 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-600" />
            <p className="text-lg font-bold">¡Excelente trabajo!</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {studentName} mantiene un buen rendimiento en todos los ejercicios.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.critical.slice(0, 2).map((t, idx) => (
              <div key={t.id} className="rounded-2xl border-2 bg-background p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-lg font-black text-white">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-lg">{t.label}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      <strong>Prioridad alta:</strong> Ejercicios guiados con feedback inmediato. Considerar sesiones
                      de refuerzo individualizadas.
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {insights.reinforce.slice(0, 1).map((t, idx) => (
              <div key={t.id} className="rounded-2xl border-2 bg-background p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-lg font-black text-white">
                    {insights.critical.length + idx + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-lg">{t.label}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      <strong>Práctica regular:</strong> Asignar ejercicios adicionales para consolidar conocimientos.
                      Práctica autónoma diaria de 10-15 minutos.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 rounded-2xl border bg-primary/5 p-4">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Nota:</strong> Plan generado automáticamente basado en el análisis histórico. Ajustar al contexto
            del estudiante.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border bg-card p-6 shadow-xl">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-black">Comentarios del docente</h2>
            <p className="text-sm text-muted-foreground">
              Abre el historial y agrega una nueva observación sin salir de la vista.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary transition hover:bg-primary/10"
          >
            <MessageSquare className="h-4 w-4" />
            Ver comentarios
          </button>
        </div>
      </div>

      {feedbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setFeedbackModalOpen(false)}
          />
          <div
            className="relative h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl border bg-card p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black">Comentarios del docente</h3>
                <p className="text-sm text-muted-foreground">Registra observaciones y revisa el historial.</p>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackModalOpen(false)}
                className="rounded-full border border-muted/50 px-3 py-1 text-xs uppercase tracking-wider text-muted-foreground transition hover:bg-muted/10"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCommentSubmit} className="mb-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-bold text-foreground">Ejercicio asignado</label>
                  <select
                    value={commentForm.assignmentId}
                    onChange={(e) => setCommentForm((s) => ({ ...s, assignmentId: e.target.value }))}
                    className="mt-2 h-12 w-full rounded-xl border-2 bg-background px-4 text-sm font-medium transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                  <label className="text-sm font-bold text-foreground">Comentario</label>
                  <textarea
                    rows={4}
                    value={commentForm.comment}
                    onChange={(e) => setCommentForm((s) => ({ ...s, comment: e.target.value }))}
                    className="mt-2 w-full rounded-xl border-2 bg-background px-4 py-3 text-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Escribe una observación constructiva para el estudiante..."
                  />
                </div>
              </div>

              {commentStatus && (
                <div
                  className={`rounded-xl border-2 p-4 ${
                    commentStatus.tone === "error"
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
                  }`}
                >
                  <p className="font-bold">{commentStatus.message}</p>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={commentBusy || assignmentOptions.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-primary bg-primary px-6 py-3 text-sm font-black text-white shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {commentBusy ? "Guardando..." : "Enviar Comentario"}
                </button>
              </div>
            </form>

            <div className="rounded-2xl border-2 bg-muted/30 p-6">
              <h3 className="mb-4 text-lg font-black">Historial de Comentarios</h3>

              {feedbackLoading ? (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">Cargando comentarios...</p>
                </div>
              ) : feedbackError ? (
                <div className="rounded-xl border-2 border-destructive/30 bg-destructive/10 p-4">
                  <p className="text-sm font-bold text-destructive">{feedbackError}</p>
                </div>
              ) : feedbackRows.length === 0 ? (
                <div className="py-8 text-center">
                  <MessageSquare className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Aún no hay comentarios registrados para este estudiante.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {feedbackRows.map((row) => {
                    const exercise = row.assignment?.exercise
                    const label = exercise?.description || exercise?.id || row.assignment?.exercise_id || "Ejercicio"
                    const type = exercise?.exercise_type || "sin_tipo"
                    const when = new Date(row.created_at)
                    const whenLabel = Number.isNaN(when.getTime())
                      ? row.created_at
                      : when.toLocaleString("es-PE", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })

                    return (
                      <div key={row.id} className="rounded-xl border-2 bg-background p-5 shadow-md transition-all hover:shadow-lg">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                                {label}
                              </span>
                              <span className="rounded-lg bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                                {type}
                              </span>
                            </div>
                            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{row.comment}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {whenLabel}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================
          DATA TABLES (MEJORADAS)
      ========================== */}
      <div className="grid gap-6">
        {/* Recent Attempts */}
        <div className="rounded-3xl border-2 bg-card p-6 shadow-xl">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-black">Intentos</h2>
            <button
              type="button"
              onClick={() => setAttemptsExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
            >
              {attemptsExpanded ? "Ocultar detalles" : "Mostrar detalles"}
              {attemptsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDownCircle className="h-4 w-4" />}
            </button>
          </div>

          {!attemptsExpanded ? (
            <div className="rounded-2xl border px-4 py-6 text-sm text-muted-foreground">
              {filteredAttempts.length
                ? `Hay ${filteredAttempts.length} intentos visibles (usa el filtro para afinar).`
                : "No hay intentos registrados o aplicados al filtro actual."}
            </div>
          ) : (
            <>
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={attemptsSearch}
                      onChange={(e) => setAttemptsSearch(e.target.value)}
                      placeholder="Buscar ejercicio, tipo o resultado..."
                      className="h-10 w-64 max-w-full rounded-xl border-2 bg-background pl-9 pr-3 text-xs font-medium transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-muted-foreground">Mostrar:</span>
                    <button
                      type="button"
                      onClick={() => setAssignmentStatusFilter("active")}
                      className={[
                        "rounded-full px-3 py-1 text-xs font-semibold transition",
                        assignmentStatusFilter === "active"
                          ? "bg-primary text-white"
                          : "bg-muted/20 text-muted-foreground",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      Activos
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignmentStatusFilter("inactive")}
                      className={[
                        "rounded-full px-3 py-1 text-xs font-semibold transition",
                        assignmentStatusFilter === "inactive"
                          ? "bg-primary text-white"
                          : "bg-muted/20 text-muted-foreground",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      Inactivos
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExportToExcel}
                  disabled={exportingExcel || filteredAttempts.length === 0}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border-2 border-primary bg-primary/10 px-3 text-xs font-black text-primary transition-all hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {exportingExcel ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-4 w-4" />
                      Exportar Excel
                    </>
                  )}
                </button>
              </div>

              <div className="mb-4">
                <PaginationBar
                  total={filteredAttempts.length}
                  page={attemptsPage}
                  pageSize={attemptsPageSize}
                  onPageChange={setAttemptsPage}
                  onPageSizeChange={setAttemptsPageSize}
                  label="Intentos"
                />
              </div>

              {filteredAttempts.length === 0 ? (
                <div className="rounded-2xl border-2 bg-muted/20 py-12 text-center">
                  <Activity className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    {attemptsSearch ? "No hay resultados con ese filtro." : "No hay intentos registrados."}
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border-2">
                  <div className="max-h-[520px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-card">
                        <tr className="border-b-2 text-left">
                          <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-muted-foreground">
                            Fecha y Hora
                          </th>
                          <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-muted-foreground">
                            Ejercicio
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-muted-foreground">
                            Resultado
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {attemptsPaged.map((r, i) => {
                          const label = r.exercise?.description || r.exercise?.id || "Ejercicio"
                          const type = r.exercise?.exercise_type || "sin_tipo"
                          return (
                            <tr key={i} className="border-b transition-colors hover:bg-muted/30">
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                {formatAttemptDateTime(r.created_at)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-bold">{label}</div>
                                <div className="text-xs text-muted-foreground">{type}</div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {r.correct ? (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-black text-white">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Correcto
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1 text-xs font-black text-white">
                                    <XCircle className="h-3.5 w-3.5" />
                                    Incorrecto
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <PaginationBar
                  total={filteredAttempts.length}
                  page={attemptsPage}
                  pageSize={attemptsPageSize}
                  onPageChange={setAttemptsPage}
                  onPageSizeChange={setAttemptsPageSize}
                />
              </div>
            </>
          )}
        </div>

        {/* Exercise Summary */}
        <div className="rounded-3xl border-2 bg-card p-6 shadow-xl">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-black">Resumen por Ejercicio</h2>
            <button
              type="button"
              onClick={() => setSummaryExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
            >
              {summaryExpanded ? "Ocultar detalles" : "Mostrar detalles"}
              {summaryExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDownCircle className="h-4 w-4" />}
            </button>
          </div>

          {!summaryExpanded ? (
            <div className="rounded-2xl border px-4 py-6 text-sm text-muted-foreground">
              {filteredSummary.length
                ? `Se analizan ${filteredSummary.length} ejercicios distintos.`
                : "No hay ejercicios registrados o el filtro los oculta."}
            </div>
          ) : (
            <>
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={summarySearch}
                    onChange={(e) => setSummarySearch(e.target.value)}
                    placeholder="Buscar por nombre o tipo..."
                    className="h-10 w-64 max-w-full rounded-xl border-2 bg-background pl-9 pr-3 text-xs font-medium transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="mb-4">
                <PaginationBar
                  total={filteredSummary.length}
                  page={summaryPage}
                  pageSize={summaryPageSize}
                  onPageChange={setSummaryPage}
                  onPageSizeChange={setSummaryPageSize}
                  label="Ejercicios"
                />
              </div>

              {filteredSummary.length === 0 ? (
                <div className="rounded-2xl border-2 bg-muted/20 py-12 text-center">
                  <BookOpenCheck className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    {summarySearch ? "No hay resultados con ese filtro." : "No hay datos de ejercicios."}
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border-2">
                  <div className="max-h-[520px] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-card">
                        <tr className="border-b-2 text-left">
                          <th className="px-4 py-3 text-xs font-black uppercase tracking-wide text-muted-foreground">
                            Ejercicio
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-muted-foreground">
                            Intentos
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-muted-foreground">
                            Precisión
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {summaryPaged.map((r) => (
                          <tr key={r.id} className="border-b transition-colors hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <div className="font-bold">{r.label}</div>
                              <div className="text-xs text-muted-foreground">{r.type}</div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                                <Activity className="h-3 w-3" />
                                {r.attempts}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-black text-white ${
                                  r.accuracy >= 80 ? "bg-emerald-600" : r.accuracy >= 60 ? "bg-amber-600" : "bg-rose-600"
                                }`}
                              >
                                <Target className="h-3 w-3" />
                                {r.accuracy}%
                              </span>

                              <div className="mt-2">
                                <ProgressBar value={r.accuracy} height="h-2" />
                              </div>

                              <div className="mt-2 text-[11px] text-muted-foreground">
                                {r.correct} ✔ / {r.incorrect} ✖
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <PaginationBar
                  total={filteredSummary.length}
                  page={summaryPage}
                  pageSize={summaryPageSize}
                  onPageChange={setSummaryPage}
                  onPageSizeChange={setSummaryPageSize}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
