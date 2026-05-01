"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { PageHeader } from "@/components/dashboard/core"
import { Badge } from "@/components/ui/badge"
import { FileText, CheckCircle2, Clock3, AlertTriangle } from "lucide-react"
import {
  EXAMEN_FINAL_01_QUESTIONS,
  EXAMEN_PARCIAL_01_QUESTIONS,
} from "@/components/exams/CristoSalvador/Bachillerato/Cuarto/PrimerBimestre/questions"
import {
  getExamEffectivenessPercentage,
  getExamPerformanceClasses,
  getExamPerformanceColor,
  getExamPerformanceLabel,
} from "@/lib/exam-performance"
import { cn } from "@/lib/utils"

type ExamAttemptDetail = {
  exam_id: string
  component_key: string | null
  title: string
  exam_type: string
  score: number | null
  correct_count: number | null
  wrong_count: number | null
  created_at: string | null
  status: string
  answers: Record<string, string> | null
  question_results: ExamQuestionResult[] | null
}

type ExamQuestion = {
  id: string
  title: string
  subtitle: string
  prompt: string
  options: Array<{ key: string; label: string; latex?: string }>
  correctKey: string
  explanation: string
}

type ExamQuestionResult = {
  question_id: string
  title: string
  subtitle: string
  selected_key: string | null
  correct_key: string
  is_correct: boolean
}

function normalizeExamComponentKey(componentKey: string | null) {
  if (!componentKey) return null

  return componentKey
    .replace(/\\/g, "/")
    .replace(/^components\/exams\//i, "")
    .replace(/\.tsx$/i, "")
    .trim()
    .toLowerCase()
}

function getExamQuestions(componentKey: string | null): ExamQuestion[] {
  const normalizedKey = normalizeExamComponentKey(componentKey)
  const legacyAlias = normalizedKey?.replace(
    /^cristosalvador\/bachillerato\/cuarto\/primerbimestre\//,
    "cristo/examenes/cuarto/primer-bimestre/",
  )
  const compactKey = normalizedKey?.replace(/[^a-z0-9]/g, "") ?? ""
  const compactAlias = legacyAlias?.replace(/[^a-z0-9]/g, "") ?? ""

  if (
    normalizedKey === "cristo/examenes/cuarto/primer-bimestre/examen-parcial-01" ||
    legacyAlias === "cristo/examenes/cuarto/primer-bimestre/examen-parcial-01" ||
    compactKey.endsWith("examenparcial01") ||
    compactAlias.endsWith("examenparcial01")
  ) {
    return EXAMEN_PARCIAL_01_QUESTIONS
  }

  if (
    normalizedKey === "cristo/examenes/cuarto/primer-bimestre/examen-final-01" ||
    legacyAlias === "cristo/examenes/cuarto/primer-bimestre/examen-final-01" ||
    compactKey.endsWith("examenfinal01") ||
    compactAlias.endsWith("examenfinal01")
  ) {
    return EXAMEN_FINAL_01_QUESTIONS
  }

  return []
}

function getOptionLabel(question: ExamQuestion, key: string | null | undefined) {
  if (!key) return "Sin respuesta"
  const option = question.options.find((item) => item.key === key)
  const value = option?.latex ?? option?.label ?? key
  return `${key}) ${value}`
}

function getWrongQuestions(row: ExamAttemptDetail) {
  if (Array.isArray(row.question_results) && row.question_results.length > 0) {
    return row.question_results
      .filter((item) => !item.is_correct)
      .map((item) => ({
        question: {
          id: item.question_id,
          title: item.title,
          subtitle: item.subtitle,
          prompt: "",
          options: [],
          correctKey: item.correct_key,
          explanation: "",
        },
        selectedKey: item.selected_key,
      }))
  }

  const questions = getExamQuestions(row.component_key)
  if (!row.answers || questions.length === 0) return []

  return questions
    .map((question) => ({
      question,
      selectedKey: row.answers?.[question.id] ?? null,
    }))
    .filter((item) => item.selectedKey !== item.question.correctKey)
}

export default function TeacherStudentExamPerformanceDetailPage() {
  const params = useParams() as { id?: string; studentId?: string }
  const classroomId = params.id ?? ""
  const studentId = params.studentId ?? ""
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [studentName, setStudentName] = useState("Estudiante")
  const [classroomLabel, setClassroomLabel] = useState("Aula")
  const [rows, setRows] = useState<ExamAttemptDetail[]>([])

  useEffect(() => {
    if (!classroomId || !studentId) return

    const load = async () => {
      setLoading(true)

      const [{ data: student }, { data: classroom }, { data: assignments }, { data: attempts }] =
        await Promise.all([
          supabase.from("edu_profiles").select("first_name, last_name").eq("id", studentId).single(),
          supabase.from("edu_classrooms").select("grade, section").eq("id", classroomId).single(),
          supabase
            .from("edu_exam_assignments")
            .select(`
              exam_id,
              exam:edu_exams (
                id,
                title,
                exam_type,
                component_key
              )
            `)
            .eq("classroom_id", classroomId)
            .eq("active", true),
          supabase
            .from("edu_student_exams")
            .select(`
              exam_id,
              score,
              correct_count,
              wrong_count,
              created_at,
              status,
              answers,
              question_results
            `)
            .eq("classroom_id", classroomId)
            .eq("student_id", studentId)
            .order("created_at", { ascending: false }),
        ])

      setStudentName(`${student?.first_name || ""} ${student?.last_name || ""}`.trim() || "Estudiante")
      if (classroom?.grade) {
        setClassroomLabel(`${classroom.grade}${classroom.section ? ` ${classroom.section}` : ""}`.trim())
      }

      const latestByExam = new Map<string, any>()
      ;((attempts ?? []) as any[]).forEach((attempt) => {
        if (!latestByExam.has(attempt.exam_id)) {
          latestByExam.set(attempt.exam_id, attempt)
        }
      })

      const detailRows: ExamAttemptDetail[] = ((assignments ?? []) as any[]).map((row) => {
        const exam = Array.isArray(row.exam) ? row.exam[0] : row.exam
        const attempt = latestByExam.get(row.exam_id)

        return {
          exam_id: row.exam_id,
          component_key: exam?.component_key ?? null,
          title: exam?.title ?? "Examen",
          exam_type: exam?.exam_type ?? "Sin tipo",
          score: attempt?.score ?? null,
          correct_count: attempt?.correct_count ?? null,
          wrong_count: attempt?.wrong_count ?? null,
          created_at: attempt?.created_at ?? null,
          status: attempt?.status ?? "pending",
          answers: attempt?.answers ?? null,
          question_results: attempt?.question_results ?? null,
        }
      })

      setRows(detailRows)
      setLoading(false)
    }

    load()
  }, [classroomId, studentId, supabase])

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const effectiveness = getExamEffectivenessPercentage({
          score: row.score,
          correctCount: row.correct_count,
          wrongCount: row.wrong_count,
        })
        const color = getExamPerformanceColor(effectiveness)
        acc[color] += 1
        return acc
      },
      { green: 0, blue: 0, yellow: 0, red: 0 },
    )
  }, [rows])

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Examenes de ${studentName}`}
        description={`Semaforo de rendimiento para ${classroomLabel}`}
        breadcrumbs={[
          { label: "Mis Clases", href: "/dashboard/teacher" },
          { label: classroomLabel, href: `/dashboard/teacher/classroom/${classroomId}` },
          { label: "Dashboard examenes", href: `/dashboard/teacher/classroom/${classroomId}/performance/exams` },
          { label: studentName },
        ]}
      />

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4 shadow-sm"><div className="text-2xl font-bold text-emerald-700">{summary.green}</div><div className="text-xs uppercase tracking-wide text-muted-foreground">Verde</div></div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm"><div className="text-2xl font-bold text-sky-700">{summary.blue}</div><div className="text-xs uppercase tracking-wide text-muted-foreground">Azul</div></div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm"><div className="text-2xl font-bold text-amber-700">{summary.yellow}</div><div className="text-xs uppercase tracking-wide text-muted-foreground">Amarillo</div></div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm"><div className="text-2xl font-bold text-rose-700">{summary.red}</div><div className="text-xs uppercase tracking-wide text-muted-foreground">Rojo</div></div>
      </div>

      {loading ? (
        <div className="flex h-80 items-center justify-center rounded-3xl border bg-card">
          <div className="text-sm text-muted-foreground">Cargando rendimiento de examenes...</div>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex h-80 items-center justify-center rounded-3xl border bg-card">
          <div className="text-sm text-muted-foreground">No hay examenes asignados para este alumno.</div>
        </div>
      ) : (
        <div className="grid gap-4">
          {rows.map((row) => {
            const effectiveness = getExamEffectivenessPercentage({
              score: row.score,
              correctCount: row.correct_count,
              wrongCount: row.wrong_count,
            })
            const color = getExamPerformanceColor(effectiveness)
            const wrongQuestions = getWrongQuestions(row)
            const hasQuestionBank = getExamQuestions(row.component_key).length > 0
            const Icon =
              color === "green"
                ? CheckCircle2
                : color === "blue"
                  ? Clock3
                  : color === "yellow"
                    ? FileText
                    : AlertTriangle

            return (
              <div key={row.exam_id} className={cn("rounded-2xl border p-5 shadow-sm", getExamPerformanceClasses(color))}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <h2 className="text-lg font-semibold">{row.title}</h2>
                    </div>
                    <div className="mt-1 text-sm opacity-80">{row.exam_type}</div>
                  </div>

                  <Badge className="w-fit bg-white/40 text-current hover:bg-white/40">
                    {getExamPerformanceLabel(effectiveness)}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-5">
                  <div className="rounded-xl border border-current/20 bg-white/30 p-3">
                    <div className="text-xs uppercase tracking-wide opacity-80">Estado</div>
                    <div className="mt-1 font-semibold">{row.status}</div>
                  </div>
                  <div className="rounded-xl border border-current/20 bg-white/30 p-3">
                    <div className="text-xs uppercase tracking-wide opacity-80">Resultado</div>
                    <div className="mt-1 font-semibold">
                      {row.correct_count ?? 0} correctas / {row.wrong_count ?? 0} incorrectas
                    </div>
                  </div>
                  <div className="rounded-xl border border-current/20 bg-white/30 p-3">
                    <div className="text-xs uppercase tracking-wide opacity-80">Color</div>
                    <div className="mt-1 font-semibold">{getExamPerformanceLabel(effectiveness)}</div>
                  </div>
                  <div className="rounded-xl border border-current/20 bg-white/30 p-3">
                    <div className="text-xs uppercase tracking-wide opacity-80">Efectividad</div>
                    <div className="mt-1 font-semibold">
                      {effectiveness != null ? `${effectiveness}%` : "Sin evidencia"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-current/20 bg-white/30 p-3">
                    <div className="text-xs uppercase tracking-wide opacity-80">Ultimo envio</div>
                    <div className="mt-1 font-semibold">
                      {row.created_at ? new Date(row.created_at).toLocaleString("es-PE") : "Pendiente"}
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-current/20 bg-white/30 p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold">Preguntas falladas</div>
                      <div className="text-xs opacity-80">
                        Preguntas donde la respuesta enviada no coincide con la clave correcta.
                      </div>
                    </div>
                    <Badge className="w-fit bg-white/40 text-current hover:bg-white/40">
                      {wrongQuestions.length} pregunta{wrongQuestions.length === 1 ? "" : "s"}
                    </Badge>
                  </div>

                  {!row.answers ? (
                    <div className="mt-3 rounded-xl border border-current/10 bg-white/40 px-4 py-3 text-sm opacity-80">
                      El alumno todavia no ha enviado este examen.
                    </div>
                  ) : !hasQuestionBank ? (
                    <div className="mt-3 rounded-xl border border-current/10 bg-white/40 px-4 py-3 text-sm opacity-80">
                      Este examen no tiene un banco de preguntas registrado para mostrar el detalle.
                    </div>
                  ) : wrongQuestions.length === 0 ? (
                    <div className="mt-3 rounded-xl border border-current/10 bg-white/40 px-4 py-3 text-sm font-medium">
                      No tuvo errores en este examen.
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {wrongQuestions.map(({ question }) => (
                        <Badge key={question.id} className="bg-white/40 text-current hover:bg-white/40">
                          {question.title}
                          {question.subtitle ? ` - ${question.subtitle}` : ""}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
