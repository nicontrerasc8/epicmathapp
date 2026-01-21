'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { fetchStudentSession } from '@/lib/student-session-client'
import { useInstitution } from '@/components/institution-provider'

type ExerciseContext = {
  classroomId: string | null
  sessionId: string | null
  studentId: string | null
  loading: boolean
  error: string | null
}

export function useExerciseContext(exerciseId: string | null): ExerciseContext {
  const supabase = createClient()
  const institution = useInstitution()

  const [state, setState] = useState<ExerciseContext>({
    classroomId: null,
    sessionId: null,
    studentId: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!exerciseId) {
      setState((s) => ({ ...s, loading: false }))
      return
    }

    let cancelled = false

    async function loadContext() {
      try {
        const studentSession = await fetchStudentSession(institution?.id)
        const studentId = studentSession?.student_id

        if (!studentId) {
          throw new Error('Usuario no autenticado')
        }

        const classroomId = studentSession?.classroom_id ?? null

        if (!classroomId) {
          throw new Error('Alumno sin aula asignada')
        }

        const { data: assignment, error: assignErr } = await supabase
          .from('edu_exercise_assignments')
          .select('id')
          .eq('classroom_id', classroomId)
          .eq('exercise_id', exerciseId)
          .eq('active', true)
          .maybeSingle()

        if (assignErr || !assignment?.id) {
          throw new Error('Ejercicio no asignado al aula')
        }

        if (!cancelled) {
          setState({
            classroomId,
            sessionId: null,
            studentId,
            loading: false,
            error: null,
          })
        }
      } catch (err: any) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            loading: false,
            error: err.message ?? 'Error desconocido',
          }))
        }
      }
    }

    loadContext()

    return () => {
      cancelled = true
    }
  }, [exerciseId, institution?.id, supabase])

  return state
}
