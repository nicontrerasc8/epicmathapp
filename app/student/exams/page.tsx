"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ClipboardList, Clock3, FileText, Star } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { fetchStudentSession } from "@/lib/student-session-client"
import type { StudentSessionData } from "@/lib/student-session-client"
import { useInstitution } from "@/components/institution-provider"
import { isExamAvailableNow } from "@/lib/exam-availability"

type ExamAssignmentRow = {
  id: string
  exam_id: string
  order: number | string | null
  active: boolean
  available_from: string | null
  available_until: string | null
  edu_exams: {
    id: string
    title: string
    description: string | null
    exam_type: string
    block: string | null
    component_key: string
    duration_minutes: number | null
  }
}

type ExamQueryRow = {
  id: string
  exam_id: string
  order: number | string | null
  active: boolean
  available_from: string | null
  available_until: string | null
  edu_exams:
    | {
        id: string
        title: string
        description: string | null
        exam_type: string
        block: string | null
        component_key: string
        duration_minutes: number | null
      }
    | {
        id: string
        title: string
        description: string | null
        exam_type: string
        block: string | null
        component_key: string
        duration_minutes: number | null
      }[]
    | null
}

type StudentExamAttemptRow = {
  exam_id: string
}

export default function StudentExamsPage() {
  const supabase = useMemo(() => createClient(), [])
  const institution = useInstitution()

  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<ExamAssignmentRow[]>([])
  const [classroomId, setClassroomId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      if (!institution?.id) return
      setLoading(true)

      const studentSession: StudentSessionData | null = await fetchStudentSession()
      if (!studentSession?.student_id || !studentSession?.classroom_id) {
        if (!active) return
        setAssignments([])
        setClassroomId(null)
        setLoading(false)
        return
      }

      setClassroomId(studentSession.classroom_id)

      const [assignmentResult, attemptsResult] = await Promise.all([
        supabase
          .from("edu_exam_assignments")
          .select(`
            id,
            exam_id,
            order,
            active,
            available_from,
            available_until,
            edu_exams!inner (
              id,
              title,
              description,
              exam_type,
              block,
              component_key,
              duration_minutes
            )
          `)
          .eq("classroom_id", studentSession.classroom_id)
          .eq("active", true),
        supabase
          .from("edu_student_exams")
          .select("exam_id")
          .eq("student_id", studentSession.student_id)
          .eq("classroom_id", studentSession.classroom_id),
      ])

      if (!active) return

      if (assignmentResult.error || attemptsResult.error) {
        console.error(
          "Supabase error:",
          assignmentResult.error ?? attemptsResult.error,
        )
        setAssignments([])
        setLoading(false)
        return
      }

      const attemptedExamIds = new Set(
        ((attemptsResult.data ?? []) as StudentExamAttemptRow[]).map(
          (attempt) => attempt.exam_id,
        ),
      )

      const normalizedAssignments = ((assignmentResult.data ?? []) as ExamQueryRow[])
        .map((assignment) => {
          const exam = Array.isArray(assignment.edu_exams)
            ? assignment.edu_exams[0]
            : assignment.edu_exams

          if (!exam) return null

          return {
            id: assignment.id,
            exam_id: assignment.exam_id,
            order: assignment.order,
            active: assignment.active,
            available_from: assignment.available_from,
            available_until: assignment.available_until,
            edu_exams: exam,
          } satisfies ExamAssignmentRow
        })
        .filter((assignment): assignment is ExamAssignmentRow => Boolean(assignment))
        .filter((assignment) => !attemptedExamIds.has(assignment.exam_id))
        .filter((assignment) => isExamAvailableNow(assignment))

      setAssignments(normalizedAssignments)
      setLoading(false)
    }

    load()

    return () => {
      active = false
    }
  }, [institution?.id, supabase])

  const sortedAssignments = useMemo(() => {
    return [...assignments].sort((a, b) => {
      const orderA = Number(a.order ?? 0)
      const orderB = Number(b.order ?? 0)
      if (orderA !== orderB) return orderA - orderB

      return (a.edu_exams.title || "").localeCompare(b.edu_exams.title || "", "es", {
        sensitivity: "base",
      })
    })
  }, [assignments])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-white to-blue-50">
        <div className="space-y-3 text-center">
          <ClipboardList className="mx-auto h-14 w-14 animate-pulse text-amber-600" />
          <p className="text-lg font-semibold text-slate-900">Cargando examenes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-blue-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-4 text-center">
          <h1 className="text-5xl font-black tracking-tight text-slate-900">Tus Examenes</h1>
          <p className="text-slate-600">Aqui veras solo los examenes pendientes.</p>
        </header>

        {sortedAssignments.length === 0 || !classroomId ? (
          <div className="rounded-3xl border-2 border-amber-200 bg-white/90 py-20 text-center shadow-lg">
            <Star className="mx-auto mb-4 h-16 w-16 text-amber-400" />
            <p className="text-2xl font-bold text-slate-900">No tienes examenes pendientes</p>
            <p className="mt-2 text-slate-600">Los examenes ya rendidos no vuelven a mostrarse aqui.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {sortedAssignments.map((assignment, index) => (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
              >
                <Link
                  href={`/student/exams/${assignment.exam_id}`}
                  className="block h-full rounded-3xl border-2 border-amber-200 bg-white p-6 shadow-lg transition hover:-translate-y-1 hover:border-amber-400"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="rounded-xl bg-amber-100 p-3">
                        <FileText className="h-6 w-6 text-amber-700" />
                      </div>
                      {assignment.edu_exams.duration_minutes != null && (
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Clock3 className="h-4 w-4" />
                          {assignment.edu_exams.duration_minutes} min
                        </div>
                      )}
                    </div>

                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {assignment.edu_exams.title}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {assignment.edu_exams.exam_type || "Sin tipo"}
                        {" · "}
                        {assignment.edu_exams.block || "Sin bloque"}
                      </p>
                    </div>

                    {assignment.edu_exams.description && (
                      <p className="line-clamp-3 text-sm text-slate-600">
                        {assignment.edu_exams.description}
                      </p>
                    )}

                    <div className="pt-2 text-sm font-semibold text-amber-700">Abrir examen</div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
