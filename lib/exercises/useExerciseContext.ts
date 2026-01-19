'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { fetchStudentSession } from '@/lib/student-session-client'
import { useInstitution } from '@/components/institution-provider'

type ExerciseContext = {
  temaId: string | null
  classroomId: string | null
  blockId: string | null
  sessionId: string | null
  studentId: string | null
  loading: boolean
  error: string | null
}

export function useExerciseContext(exerciseId: string | null): ExerciseContext {
  const supabase = createClient()
  const institution = useInstitution()

  const [state, setState] = useState<ExerciseContext>({
    temaId: null,
    classroomId: null,
    blockId: null,
    sessionId: null,
    studentId: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!exerciseId) {
      setState(s => ({ ...s, loading: false }))
      return
    }

    let cancelled = false

    async function loadContext() {
      try {
        const studentSession = await fetchStudentSession()
        const studentId = studentSession?.id

        if (!studentId) {
          throw new Error('Usuario no autenticado')
        }
        if (
          institution?.id &&
          studentSession?.institution_id &&
          studentSession.institution_id !== institution.id
        ) {
          throw new Error('Institucion incorrecta')
        }

        let memberQuery = supabase
          .from('edu_institution_members')
          .select('id, classroom_id, institution_id, role, active, created_at')
          .eq('profile_id', studentId)
          .eq('role', 'student')
          .eq('active', true)

        if (institution?.id) {
          memberQuery = memberQuery.eq('institution_id', institution.id)
        }

        const { data: member } = await memberQuery
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!member?.classroom_id) {
          throw new Error('Alumno sin aula asignada')
        }

        const classroomId = member.classroom_id

        const { data: activeBlocks } = await supabase
          .from('edu_classroom_blocks')
          .select('block_id, started_at')
          .eq('classroom_id', classroomId)
          .eq('active', true)
          .order('started_at', { ascending: false })
          .limit(1)

        const blockId = activeBlocks?.[0]?.block_id ?? null
        if (!blockId) {
          throw new Error('Aula sin bloque activo')
        }

        const { data: assignment, error: assignErr } = await supabase
          .from('edu_classroom_tema_exercises')
          .select(`
            tema_id,
            tema:edu_temas (
              id,
              subblock:edu_academic_subblocks ( block_id )
            )
          `)
          .eq('classroom_id', classroomId)
          .eq('exercise_id', exerciseId)
          .eq('active', true)
          .maybeSingle()

        if (assignErr || !assignment?.tema_id) {
          throw new Error('Ejercicio no asignado al aula')
        }

        const temaId = assignment.tema_id
        const temaBlockId = assignment.tema?.subblock?.block_id ?? null
        if (!temaBlockId || temaBlockId !== blockId) {
          throw new Error('Ejercicio fuera del bloque activo')
        }

        const { data: session, error: sessionErr } = await supabase
          .from('edu_practice_sessions')
          .insert({
            student_id: studentId,
            classroom_id: classroomId,
          })
          .select('id')
          .single()

        if (sessionErr || !session?.id) {
          throw new Error('No se pudo crear sesion')
        }

        if (!cancelled) {
          setState({
            temaId,
            classroomId,
            blockId,
            sessionId: session.id,
            studentId,
            loading: false,
            error: null,
          })
        }
      } catch (err: any) {
        if (!cancelled) {
          setState(s => ({
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
