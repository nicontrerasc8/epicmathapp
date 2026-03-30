"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { fetchStudentSession } from "@/lib/student-session-client"
import type { StudentSessionData } from "@/lib/student-session-client"
import { useInstitution } from "@/components/institution-provider"
import { ExamRegistry } from "@/components/exams"
import { isExamAvailableNow } from "@/lib/exam-availability"

type ExamRow = {
  assignment_id: string
  id: string
  title: string
  component_key: string
  available_from: string | null
  available_until: string | null
  active: boolean
}

export default function StudentExamPlayPage() {
  const params = useParams()
  const examId = typeof params.id === "string" ? params.id : null
  const supabase = useMemo(() => createClient(), [])
  const institution = useInstitution()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [classroomId, setClassroomId] = useState<string | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [exam, setExam] = useState<ExamRow | null>(null)
  const [attemptLocked, setAttemptLocked] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!institution?.id || !examId) return
      setLoading(true)
      setError(null)

      const session: StudentSessionData | null = await fetchStudentSession(institution.id)
      if (!session?.student_id || !session?.classroom_id) {
        setError("No se encontro una sesion valida del estudiante.")
        setLoading(false)
        return
      }

      setClassroomId(session.classroom_id)
      setStudentId(session.student_id)

      const [{ data, error: queryError }, { data: attemptData, error: attemptError }] =
        await Promise.all([
          supabase
            .from("edu_exam_assignments")
            .select(`
              id,
              exam_id,
              active,
              available_from,
              available_until,
              edu_exams!inner (
                id,
                title,
                component_key
              )
            `)
            .eq("classroom_id", session.classroom_id)
            .eq("exam_id", examId)
            .eq("active", true)
            .maybeSingle(),
          supabase
            .from("edu_student_exams")
            .select("id")
            .eq("student_id", session.student_id)
            .eq("classroom_id", session.classroom_id)
            .eq("exam_id", examId)
            .limit(1),
        ])

      if (queryError || !data) {
        setError(queryError?.message || "No se encontro el examen asignado para este salon.")
        setLoading(false)
        return
      }

      if (attemptError) {
        setError(attemptError.message)
        setLoading(false)
        return
      }

      const currentExam = Array.isArray((data as any).edu_exams)
        ? (data as any).edu_exams[0] ?? null
        : (data as any).edu_exams

      if (!currentExam?.id) {
        setError("El examen no tiene un componente configurado.")
        setLoading(false)
        return
      }

      setExam({
        assignment_id: (data as any).id,
        id: currentExam.id,
        title: currentExam.title,
        component_key: currentExam.component_key,
        available_from: (data as any).available_from ?? null,
        available_until: (data as any).available_until ?? null,
        active: Boolean((data as any).active),
      })
      setAttemptLocked(Boolean(attemptData?.length))
      setLoading(false)
    }

    load()
  }, [institution?.id, examId, supabase])

  if (!examId) {
    return <div className="p-6 text-red-500">ID de examen invalido.</div>
  }

  if (loading) {
    return <div className="p-6">Cargando examen...</div>
  }

  if (error || !classroomId || !exam) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border bg-card p-6">
          <p className="text-red-500">{error ?? "No se pudo cargar el examen."}</p>
          <Link href="/student/exams" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <ArrowLeft className="h-4 w-4" />
            Volver a examenes
          </Link>
        </div>
      </div>
    )
  }

  if (attemptLocked) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border bg-card p-6">
          <p className="text-slate-900">Este examen ya fue rendido.</p>
          <p className="mt-2 text-sm text-slate-600">
            El sistema registró un intento en la base de datos y no permite volver a abrirlo.
          </p>
          <Link href="/student/exams" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <ArrowLeft className="h-4 w-4" />
            Volver a examenes
          </Link>
        </div>
      </div>
    )
  }

  if (!isExamAvailableNow(exam)) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border bg-card p-6">
          <p className="text-slate-900">Este examen no esta disponible en este momento.</p>
          <p className="mt-2 text-sm text-slate-600">
            Tu docente definio una ventana de tiempo y ahora esta fuera de ese rango.
          </p>
          <Link href="/student/exams" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <ArrowLeft className="h-4 w-4" />
            Volver a examenes
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="mx-auto flex max-w-5xl px-4 pt-4">
        <Link href="/student/exams" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <ArrowLeft className="h-4 w-4" />
          Volver a examenes
        </Link>
      </div>

      <ExamRegistry
        componentKey={exam.component_key}
        examId={exam.id}
        assignmentId={exam.assignment_id}
        classroomId={classroomId}
        studentId={studentId ?? undefined}
        displayTitle={exam.title}
      />
    </div>
  )
}
