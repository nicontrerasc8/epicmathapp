"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ClipboardCheck, Clock3, ListTodo, Star } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { fetchStudentSession, type StudentSessionData } from "@/lib/student-session-client"
import { useInstitution } from "@/components/institution-provider"
import { isTaskAvailableNow } from "@/lib/task-availability"

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

export default function StudentTasksPage() {
  const supabase = useMemo(() => createClient(), [])
  const institution = useInstitution()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [attemptsByTask, setAttemptsByTask] = useState<Record<string, number>>({})

  useEffect(() => {
    let active = true

    const load = async () => {
      if (!institution?.id) return
      setLoading(true)

      const studentSession: StudentSessionData | null = await fetchStudentSession(institution.id)
      if (!studentSession?.student_id || !studentSession?.classroom_id) {
        if (!active) return
        setTasks([])
        setAttemptsByTask({})
        setLoading(false)
        return
      }

      const [tasksResult, attemptsResult] = await Promise.all([
        supabase
          .from("edu_tasks")
          .select("id, title, description, task_type, mode, attempts_allowed, duration_minutes, status, available_from, available_until, active, order_index")
          .eq("classroom_id", studentSession.classroom_id)
          .eq("active", true)
          .eq("status", "published")
          .order("order_index", { ascending: true })
          .order("created_at", { ascending: false }),
        supabase
          .from("edu_student_tasks")
          .select("task_id")
          .eq("student_id", studentSession.student_id)
          .eq("classroom_id", studentSession.classroom_id),
      ])

      if (!active) return

      if (tasksResult.error || attemptsResult.error) {
        console.error("Supabase error:", tasksResult.error ?? attemptsResult.error)
        setTasks([])
        setAttemptsByTask({})
        setLoading(false)
        return
      }

      const nextAttempts: Record<string, number> = {}
      for (const row of (attemptsResult.data ?? []) as AttemptRow[]) {
        nextAttempts[row.task_id] = (nextAttempts[row.task_id] ?? 0) + 1
      }

      setAttemptsByTask(nextAttempts)
      setTasks(((tasksResult.data ?? []) as TaskRow[]).filter((task) => isTaskAvailableNow(task)))
      setLoading(false)
    }

    load()

    return () => {
      active = false
    }
  }, [institution?.id, supabase])

  const availableTasks = useMemo(() => {
    return tasks
      .filter((task) => (attemptsByTask[task.id] ?? 0) < task.attempts_allowed)
      .sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0))
  }, [attemptsByTask, tasks])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-blue-50">
        <div className="space-y-3 text-center">
          <ListTodo className="mx-auto h-14 w-14 animate-pulse text-emerald-600" />
          <p className="text-lg font-semibold text-slate-900">Cargando tareas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-4 text-center">
          <h1 className="text-5xl font-black tracking-tight text-slate-900">Tus Tareas</h1>
          <p className="text-slate-600">Aqui veras tus tareas publicadas y sus practicas.</p>
        </header>

        {availableTasks.length === 0 ? (
          <div className="rounded-3xl border-2 border-emerald-200 bg-white/90 py-20 text-center shadow-lg">
            <Star className="mx-auto mb-4 h-16 w-16 text-emerald-400" />
            <p className="text-2xl font-bold text-slate-900">No tienes tareas pendientes</p>
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
                    className="block h-full rounded-3xl border-2 border-emerald-200 bg-white p-6 shadow-lg transition hover:-translate-y-1 hover:border-emerald-400"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="rounded-xl bg-emerald-100 p-3">
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
                        <h2 className="text-xl font-bold text-slate-900">{task.title}</h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Tarea Â· {attemptsUsed}/{task.attempts_allowed} intento
                        </p>
                      </div>

                      {task.description && <p className="line-clamp-3 text-sm text-slate-600">{task.description}</p>}

                      <div className="pt-2 text-sm font-semibold text-emerald-700">Abrir tarea</div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

