'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

type ExerciseContext = {
  temaId: string | null
  classroomId: string | null
  sessionId: string | null
  studentId: string | null
  loading: boolean
  error: string | null
}

export function useExerciseContext(
  exerciseId: string | null
): ExerciseContext {
  const supabase = createClient()

  const [state, setState] = useState<ExerciseContext>({
    temaId: null,
    classroomId: null,
    sessionId: null,
    studentId: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!exerciseId) {
      console.log('[ExerciseContext] ❌ exerciseId vacío')
      setState(s => ({ ...s, loading: false }))
      return
    }

    let cancelled = false

    async function loadContext() {
      console.group('[ExerciseContext] 🚀 init')
      console.log('exerciseId:', exerciseId)

      try {
        /* =========================
           1️⃣ AUTH → studentId
        ========================= */
        console.group('1️⃣ AUTH')
        const { data: auth, error: authErr } =
          await supabase.auth.getUser()

        console.log('auth:', auth)
        console.log('authErr:', authErr)

        if (authErr || !auth.user) {
          throw new Error('Usuario no autenticado')
        }

        const studentId = auth.user.id
        console.log('studentId:', studentId)
        console.groupEnd()

        /* =========================
           2️⃣ exercise → tema
        ========================= */
        console.group('2️⃣ EXERCISE → TEMA')

        const { data: assignment, error: assignErr } =
          await supabase
            .from('edu_exercise_assignments')
            .select('tema_id')
            .eq('exercise_id', exerciseId)
            .eq('active', true)
            .maybeSingle()

        console.log('assignment row:', assignment)
        console.log('assignErr:', assignErr)

        if (assignErr || !assignment?.tema_id) {
          throw new Error('Ejercicio sin tema asignado')
        }

        const temaId = assignment.tema_id
        console.log('temaId:', temaId)
        console.groupEnd()

        /* =========================
           3️⃣ student → classroom
        ========================= */
        console.group('3️⃣ STUDENT → CLASSROOM')

        const { data: member, error: memberErr } =
          await supabase
            .from('edu_institution_members')
            .select('id, classroom_id, institution_id, role, active')
            .eq('profile_id', studentId)
            .eq('role', 'student')
            .eq('active', true)
            .maybeSingle()

        console.log('member row:', member)
        console.log('memberErr:', memberErr)

        if (!member) {
          console.warn('❌ No hay fila en edu_institution_members para este student')
        }

        if (memberErr || !member?.classroom_id) {
          throw new Error('Alumno sin aula asignada')
        }

        const classroomId = member.classroom_id
        console.log('classroomId:', classroomId)
        console.groupEnd()

        /* =========================
           4️⃣ practice session
        ========================= */
        console.group('4️⃣ PRACTICE SESSION')

        const { data: session, error: sessionErr } =
          await supabase
            .from('edu_practice_sessions')
            .insert({
              student_id: studentId,
              classroom_id: classroomId,
            })
            .select('id')
            .single()

        console.log('session:', session)
        console.log('sessionErr:', sessionErr)

        if (sessionErr || !session?.id) {
          throw new Error('No se pudo crear sesión')
        }

        console.groupEnd()

        if (!cancelled) {
          console.log('✅ CONTEXT OK')
          setState({
            temaId,
            classroomId,
            sessionId: session.id,
            studentId,
            loading: false,
            error: null,
          })
        }
      } catch (err: any) {
        console.error('🔥 ERROR useExerciseContext:', err)

        if (!cancelled) {
          setState(s => ({
            ...s,
            loading: false,
            error: err.message ?? 'Error desconocido',
          }))
        }
      } finally {
        console.groupEnd()
      }
    }

    loadContext()

    return () => {
      cancelled = true
    }
  }, [exerciseId])

  return state
}
