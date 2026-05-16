"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ClipboardCheck,
  Clock3,
  FileText,
  GraduationCap,
  ListTodo,
  Star,
} from "lucide-react"
import { useInstitution } from "@/components/institution-provider"
import { isExamAvailableNow } from "@/lib/exam-availability"
import { fetchStudentSession, type StudentSessionData } from "@/lib/student-session-client"
import { isTaskAvailableNow } from "@/lib/task-availability"
import { createClient } from "@/utils/supabase/client"

type ClassroomRow = {
  grade: string
  section: string | null
  academic_year: number
}

type TaskRow = {
  id: string
  title: string
  description: string | null
  task_type: string
  mode: string
  attempts_allowed: number
  duration_minutes: number | null
  status: string
  available_from: string | null
  available_until: string | null
  active: boolean
  order_index: number | string | null
}

type AttemptRow = {
  task_id: string
}

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
  edu_exams: ExamAssignmentRow["edu_exams"] | ExamAssignmentRow["edu_exams"][] | null
}

type StudentExamAttemptRow = {
  exam_id: string
}

export default function StudentDashboard() {
  const supabase = useMemo(() => createClient(), [])
  const institution = useInstitution()

  const [loading, setLoading] = useState(true)
  const [studentSession, setStudentSession] = useState<StudentSessionData | null>(null)
  const [classroom, setClassroom] = useState<ClassroomRow | null>(null)
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [attemptsByTask, setAttemptsByTask] = useState<Record<string, number>>({})
  const [examAssignments, setExamAssignments] = useState<ExamAssignmentRow[]>([])

  useEffect(() => {
    let active = true

    const load = async () => {
      if (!institution?.id) return

      setLoading(true)

      const session = await fetchStudentSession(institution.id)
      if (!active) return

      setStudentSession(session)

      if (!session?.student_id || !session?.classroom_id) {
        setClassroom(null)
        setTasks([])
        setAttemptsByTask({})
        setExamAssignments([])
        setLoading(false)
        return
      }

      const [
        classroomResult,
        tasksResult,
        taskAttemptsResult,
        examAssignmentsResult,
        examAttemptsResult,
      ] = await Promise.all([
        supabase
          .from("edu_classrooms")
          .select("grade, section, academic_year")
          .eq("id", session.classroom_id)
          .maybeSingle(),
        supabase
          .from("edu_tasks")
          .select("id, title, description, task_type, mode, attempts_allowed, duration_minutes, status, available_from, available_until, active, order_index")
          .eq("classroom_id", session.classroom_id)
          .eq("active", true)
          .eq("status", "published")
          .order("order_index", { ascending: true })
          .order("created_at", { ascending: false }),
        supabase
          .from("edu_student_tasks")
          .select("task_id")
          .eq("student_id", session.student_id)
          .eq("classroom_id", session.classroom_id),
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
          .eq("classroom_id", session.classroom_id)
          .eq("active", true),
        supabase
          .from("edu_student_exams")
          .select("exam_id")
          .eq("student_id", session.student_id)
          .eq("classroom_id", session.classroom_id),
      ])

      if (!active) return

      const firstError =
        classroomResult.error ??
        tasksResult.error ??
        taskAttemptsResult.error ??
        examAssignmentsResult.error ??
        examAttemptsResult.error

      if (firstError) {
        console.error("Supabase error:", firstError)
        setClassroom(null)
        setTasks([])
        setAttemptsByTask({})
        setExamAssignments([])
        setLoading(false)
        return
      }

      const nextAttempts: Record<string, number> = {}
      for (const row of (taskAttemptsResult.data ?? []) as AttemptRow[]) {
        nextAttempts[row.task_id] = (nextAttempts[row.task_id] ?? 0) + 1
      }

      const attemptedExamIds = new Set(
        ((examAttemptsResult.data ?? []) as StudentExamAttemptRow[]).map(
          (attempt) => attempt.exam_id,
        ),
      )

      const normalizedExamAssignments = ((examAssignmentsResult.data ?? []) as ExamQueryRow[])
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

      setClassroom((classroomResult.data as ClassroomRow | null) ?? null)
      setAttemptsByTask(nextAttempts)
      setTasks(((tasksResult.data ?? []) as TaskRow[]).filter((task) => isTaskAvailableNow(task)))
      setExamAssignments(normalizedExamAssignments)
      setLoading(false)
    }

    load()

    return () => {
      active = false
    }
  }, [institution?.id, supabase])

  const displayName = useMemo(() => {
    if (!studentSession) return "Estudiante"
    return (
      studentSession.first_name?.trim() ||
      studentSession.last_name?.trim() ||
      studentSession.email?.trim() ||
      "Estudiante"
    )
  }, [studentSession])

  const availableTasks = useMemo(() => {
    return tasks
      .filter((task) => (attemptsByTask[task.id] ?? 0) < task.attempts_allowed)
      .sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0))
  }, [attemptsByTask, tasks])

  const sortedExamAssignments = useMemo(() => {
    return [...examAssignments].sort((a, b) => {
      const orderA = Number(a.order ?? 0)
      const orderB = Number(b.order ?? 0)
      if (orderA !== orderB) return orderA - orderB

      return (a.edu_exams.title || "").localeCompare(b.edu_exams.title || "", "es", {
        sensitivity: "base",
      })
    })
  }, [examAssignments])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-amber-50">
        <div className="space-y-3 text-center">
          <ListTodo className="mx-auto h-14 w-14 animate-pulse text-emerald-600" />
          <p className="text-lg font-semibold text-slate-900">Cargando pendientes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-white shadow-sm">
            <GraduationCap className="h-7 w-7 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Hola, {displayName}!
            </h1>
            {classroom ? (
              <p className="mt-3 text-slate-600">
                Estas en el grado <strong>{classroom.grade}</strong>
                {classroom.section ? ` ${classroom.section}` : ""} del ano{" "}
                <strong>{classroom.academic_year}</strong>.
              </p>
            ) : (
              <p className="mt-3 text-slate-600">Aun no tienes un aula asignada.</p>
            )}
          </div>
        </header>

        <section className="space-y-5">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Tus Tareas</h2>
            <p className="mt-1 text-slate-600">Aqui veras tus tareas publicadas y sus practicas.</p>
          </div>

          {availableTasks.length === 0 ? (
            <div className="rounded-lg border-2 border-emerald-200 bg-white/90 py-14 text-center shadow-sm">
              <Star className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
              <p className="text-xl font-bold text-slate-900">No tienes tareas pendientes</p>
              <p className="mt-2 text-slate-600">Las tareas publicadas por tu docente apareceran aqui.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {availableTasks.map((task, index) => {
                const attemptsUsed = attemptsByTask[task.id] ?? 0

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                  >
                    <Link
                      href={`/student/tasks/${task.id}`}
                      className="block h-full rounded-lg border-2 border-emerald-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-400"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="rounded-md bg-emerald-100 p-3">
                            <ClipboardCheck className="h-6 w-6 text-emerald-700" />
                          </div>
                          {task.duration_minutes != null && (
                            <div className="flex items-center gap-1 text-sm text-slate-500">
                              <Clock3 className="h-4 w-4" />
                              {task.duration_minutes} min
                            </div>
                          )}
                        </div>

                        <div>
                          <h3 className="text-xl font-bold text-slate-900">{task.title}</h3>
                          <p className="mt-1 text-sm text-slate-500">
                            Tarea - {attemptsUsed}/{task.attempts_allowed} intento
                          </p>
                        </div>

                        {task.description && (
                          <p className="line-clamp-3 text-sm text-slate-600">{task.description}</p>
                        )}

                        <div className="pt-2 text-sm font-semibold text-emerald-700">Abrir tarea</div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          )}
        </section>

        <section className="space-y-5">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Tus Examenes</h2>
            <p className="mt-1 text-slate-600">Aqui veras solo los examenes pendientes.</p>
          </div>

          {sortedExamAssignments.length === 0 ? (
            <div className="rounded-lg border-2 border-amber-200 bg-white/90 py-14 text-center shadow-sm">
              <Star className="mx-auto mb-4 h-12 w-12 text-amber-400" />
              <p className="text-xl font-bold text-slate-900">No tienes examenes pendientes</p>
              <p className="mt-2 text-slate-600">Los examenes ya rendidos no vuelven a mostrarse aqui.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {sortedExamAssignments.map((assignment, index) => (
                <motion.div
                  key={assignment.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                >
                  <Link
                    href={`/student/exams/${assignment.exam_id}`}
                    className="block h-full rounded-lg border-2 border-amber-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-amber-400"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="rounded-md bg-amber-100 p-3">
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
                        <h3 className="text-xl font-bold text-slate-900">
                          {assignment.edu_exams.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {assignment.edu_exams.exam_type || "Sin tipo"}
                          {" - "}
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
        </section>
      </div>
    </div>
  )
}
