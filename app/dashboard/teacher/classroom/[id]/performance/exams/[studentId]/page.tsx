"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { PageHeader } from "@/components/dashboard/core"
import { Badge } from "@/components/ui/badge"
import { FileText, CheckCircle2, Clock3, AlertTriangle } from "lucide-react"
import {
  getExamEffectivenessPercentage,
  getExamPerformanceClasses,
  getExamPerformanceColor,
  getExamPerformanceLabel,
} from "@/lib/exam-performance"
import { cn } from "@/lib/utils"

type ExamAttemptDetail = {
  exam_id: string
  title: string
  exam_type: string
  score: number | null
  correct_count: number | null
  wrong_count: number | null
  created_at: string | null
  status: string
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
                exam_type
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
              status
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
          title: exam?.title ?? "Examen",
          exam_type: exam?.exam_type ?? "Sin tipo",
          score: attempt?.score ?? null,
          correct_count: attempt?.correct_count ?? null,
          wrong_count: attempt?.wrong_count ?? null,
          created_at: attempt?.created_at ?? null,
          status: attempt?.status ?? "pending",
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
