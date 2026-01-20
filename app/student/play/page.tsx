'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { fetchStudentSession } from '@/lib/student-session-client'
import Link from 'next/link'
import { motion } from 'framer-motion'

type AssignmentRow = {
  id: string
  exercise_id: string
  ordering: number | null
  exercise: {
    id: string
    exercise_type: string
    description: string | null
  } | null
}

export default function StudentDashboardPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const studentSession = await fetchStudentSession()
      if (!studentSession?.id) {
        setLoading(false)
        return
      }

      const { data: member } = await supabase
        .from('edu_institution_members')
        .select('classroom_id')
        .eq('profile_id', studentSession.id)
        .eq('role', 'student')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!member?.classroom_id) {
        setLoading(false)
        return
      }

      const classroomId = member.classroom_id

      const { data, error } = await supabase
        .from('edu_exercise_assignments')
        .select(`
          id,
          exercise_id,
          ordering,
          exercise:edu_exercises ( id, exercise_type, description )
        `)
        .eq('classroom_id', classroomId)
        .eq('active', true)
   

      if (error) {
        console.error(error)
        setAssignments([])
        setLoading(false)
        return
      }

      setAssignments((data ?? []) as any[])
      setLoading(false)
    }

    load()
  }, [supabase])

  const sortedAssignments = useMemo(() => {
    return [...assignments].sort((a, b) => {
      const aOrder = a.ordering ?? Number.MAX_SAFE_INTEGER
      const bOrder = b.ordering ?? Number.MAX_SAFE_INTEGER
      if (aOrder !== bOrder) return aOrder - bOrder
      return a.exercise_id.localeCompare(b.exercise_id)
    })
  }, [assignments])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground text-lg animate-pulse">
          Cargando practica academica...
        </span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6 sm:p-10">
      <div className="max-w-6xl mx-auto space-y-10">
        <header>
          <h1 className="text-3xl font-bold">Practica academica</h1>
          <p className="text-muted-foreground">
            Ejercicios asignados a tu aula
          </p>
        </header>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border bg-card p-6"
        >
          {sortedAssignments.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              No hay ejercicios asignados en este momento.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sortedAssignments.map((assignment, index) => {
                const exercise = assignment.exercise
                const label =
                  exercise?.description ||
                  exercise?.id ||
                  `Ejercicio ${index + 1}`

                return (
                  <Link
                    key={assignment.id}
                    href={`/student/play/${assignment.exercise_id}`}
                    className="rounded-lg border p-4 text-center hover:shadow-md transition"
                  >
                    <div className="text-sm text-muted-foreground">
                      {assignment.ordering ?? index + 1}
                    </div>
                    <div className="font-semibold mt-1">{label}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {exercise?.exercise_type || 'sin_tipo'}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </motion.section>
      </div>
    </div>
  )
}
