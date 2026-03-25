'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { fetchStudentSession } from '@/lib/student-session-client'
import { useInstitution } from '@/components/institution-provider'

type ExerciseContext = {
  classroomId: string | null
  sessionId: string | null
  studentId: string | null
  attemptsUsed: number
  correctAttempts: number
  latestAttemptAnswer: any | null
  latestAttemptCorrect: boolean | null
  maxAttempts: number
  blocked: boolean
  topic: string | null
  block: string | null
  blockOrder: number | null
  nextExerciseId: string | null
  loading: boolean
  error: string | null
}

const MAX_EXERCISE_ATTEMPTS = 3

export function useExerciseContext(exerciseId: string | null): ExerciseContext {
  const supabase = createClient()
  const institution = useInstitution()

  const [state, setState] = useState<ExerciseContext>({
    classroomId: null,
    sessionId: null,
    studentId: null,
    attemptsUsed: 0,
    correctAttempts: 0,
    latestAttemptAnswer: null,
    latestAttemptCorrect: null,
    maxAttempts: MAX_EXERCISE_ATTEMPTS,
    blocked: false,
    topic: null,
    block: null,
    blockOrder: null,
    nextExerciseId: null,
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
          .select(`
            id,
            order,
            edu_exercises!inner (
              exercise_type,
              block
            )
          `)
          .eq('classroom_id', classroomId)
          .eq('exercise_id', exerciseId)
          .eq('active', true)
          .maybeSingle()

        const assignmentRow = Array.isArray(assignment) ? assignment[0] : assignment

        if (assignErr || !assignmentRow?.id) {
          throw new Error('Ejercicio no asignado al aula')
        }

        const currentExercise = Array.isArray(assignmentRow.edu_exercises)
          ? assignmentRow.edu_exercises[0]
          : assignmentRow.edu_exercises

        const topic = currentExercise?.exercise_type ?? null
        const block = currentExercise?.block ?? null
        const blockOrder = Number(assignmentRow.order ?? 0) || null

        const { data: attemptsData, error: attemptsErr } = await supabase
          .from('edu_student_exercises')
          .select('correct, answer, created_at')
          .eq('student_id', studentId)
          .eq('classroom_id', classroomId)
          .eq('exercise_id', exerciseId)
          .order('created_at', { ascending: true })

        if (attemptsErr) {
          throw new Error('No se pudieron verificar los intentos del ejercicio')
        }

        const attemptsUsed = attemptsData?.length ?? 0
        const correctAttempts =
          attemptsData?.filter((row) => Boolean(row.correct)).length ?? 0
        const latestAttempt = attemptsData?.[attemptsData.length - 1] ?? null
        const blocked = attemptsUsed >= MAX_EXERCISE_ATTEMPTS
        let nextExerciseId: string | null = null

        if (topic && block) {
          const { data: blockAssignments, error: blockErr } = await supabase
            .from('edu_exercise_assignments')
            .select(`
              exercise_id,
              order,
              edu_exercises!inner (
                exercise_type,
                block
              )
            `)
            .eq('classroom_id', classroomId)
            .eq('active', true)
            .order('order', { ascending: true })

          if (blockErr) {
            throw new Error('No se pudo cargar el bloque del ejercicio')
          }

          const normalizedAssignments = (blockAssignments ?? [])
            .map((row: any) => {
              const rowExercise = Array.isArray(row.edu_exercises)
                ? row.edu_exercises[0]
                : row.edu_exercises

              if (!rowExercise) return null
              if (rowExercise.exercise_type !== topic) return null
              if ((rowExercise.block ?? null) !== block) return null

              return {
                exerciseId: row.exercise_id as string,
                order: Number(row.order ?? 0),
              }
            })
            .filter((row: { exerciseId: string; order: number } | null): row is { exerciseId: string; order: number } => row !== null)

          const currentIndex = normalizedAssignments.findIndex(
            (row) => row.exerciseId === exerciseId,
          )

          if (currentIndex >= 0) {
            nextExerciseId =
              normalizedAssignments[currentIndex + 1]?.exerciseId ?? null
          }
        }

        if (!cancelled) {
          setState({
            classroomId,
            sessionId: null,
            studentId,
            attemptsUsed,
            correctAttempts,
            latestAttemptAnswer: latestAttempt?.answer ?? null,
            latestAttemptCorrect: latestAttempt ? Boolean(latestAttempt.correct) : null,
            maxAttempts: MAX_EXERCISE_ATTEMPTS,
            blocked,
            topic,
            block,
            blockOrder,
            nextExerciseId,
            loading: false,
            error: blocked ? null : null,
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
