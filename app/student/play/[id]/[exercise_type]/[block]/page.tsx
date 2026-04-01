'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock3,
  PlayCircle,
  XCircle,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { fetchStudentSession } from '@/lib/student-session-client'
import { getExerciseMaxAttempts, hasLimitedAttempts } from '@/lib/exercises/attemptLimits'

type ThemeAssignment = {
  assignmentId: string
  exerciseId: string
  order: number
  componentKey: string | null
}

type AttemptStat = {
  attempts: number
  correctAttempts: number
  lastCorrect: boolean
}

export default function ThemeExercisesPage() {
  const params = useParams<{ id: string; exercise_type: string; block: string }>()
  const classroomId = params.id
  const exerciseType = decodeURIComponent(params.exercise_type)
  const theme = decodeURIComponent(params.block)

  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<ThemeAssignment[]>([])
  const [attemptsByExercise, setAttemptsByExercise] = useState<Record<string, AttemptStat>>({})

  useEffect(() => {
    if (!classroomId || !exerciseType || !theme) return

    let active = true

    const load = async () => {
      setLoading(true)

      const session = await fetchStudentSession()
      if (!session?.student_id) {
        if (!active) return
        setStudentId(null)
        setAssignments([])
        setAttemptsByExercise({})
        setLoading(false)
        return
      }

      setStudentId(session.student_id)

      const { data, error } = await supabase
        .from('edu_exercise_assignments')
        .select(`
          id,
          exercise_id,
          order,
          edu_exercises!inner (
            exercise_type,
            block,
            component_key
          )
        `)
        .eq('classroom_id', classroomId)
        .eq('active', true)

      if (!active) return

      if (error) {
        console.error('Supabase error:', error)
        setAssignments([])
        setAttemptsByExercise({})
        setLoading(false)
        return
      }

      const normalized = (data ?? [])
        .map((row: any) => {
          const exercise = Array.isArray(row.edu_exercises)
            ? row.edu_exercises[0]
            : row.edu_exercises

          if (!exercise) return null
          if (exercise.exercise_type !== exerciseType) return null
          if ((exercise.block ?? 'Sin tema') !== theme) return null

          return {
            assignmentId: row.id,
            exerciseId: row.exercise_id,
            order: Number(row.order ?? 0),
            componentKey: exercise.component_key ?? null,
          } satisfies ThemeAssignment
        })
        .filter((row: ThemeAssignment | null): row is ThemeAssignment => row !== null)
        .sort((a, b) => a.order - b.order)

      setAssignments(normalized)

      if (normalized.length === 0) {
        setAttemptsByExercise({})
        setLoading(false)
        return
      }

      const exerciseIds = normalized.map((row) => row.exerciseId)
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('edu_student_exercises')
        .select('exercise_id, correct, created_at')
        .eq('student_id', session.student_id)
        .eq('classroom_id', classroomId)
        .in('exercise_id', exerciseIds)
        .order('created_at', { ascending: true })

      if (!active) return

      if (attemptsError) {
        console.error('Supabase attempts error:', attemptsError)
        setAttemptsByExercise({})
        setLoading(false)
        return
      }

      const nextStats: Record<string, AttemptStat> = {}
      for (const exerciseId of exerciseIds) {
        nextStats[exerciseId] = {
          attempts: 0,
          correctAttempts: 0,
          lastCorrect: false,
        }
      }

      for (const row of attemptsData ?? []) {
        const stats = nextStats[row.exercise_id]
        if (!stats) continue
        stats.attempts += 1
        if (row.correct) stats.correctAttempts += 1
        stats.lastCorrect = Boolean(row.correct)
      }

      setAttemptsByExercise(nextStats)
      setLoading(false)
    }

    load()
    return () => {
      active = false
    }
  }, [supabase, classroomId, exerciseType, theme])

  const firstPlayableExerciseId = useMemo(() => {
    const limitedAssignments = assignments
      .filter((assignment) => hasLimitedAttempts(assignment.componentKey))
      .map((assignment) => ({
        ...assignment,
        maxAttempts: getExerciseMaxAttempts(assignment.componentKey),
        stats: attemptsByExercise[assignment.exerciseId] ?? {
          attempts: 0,
          correctAttempts: 0,
          lastCorrect: false,
        },
      }))

    const pendingLimited = limitedAssignments.find(
      (assignment) => assignment.stats.attempts < assignment.maxAttempts,
    )

    return pendingLimited?.exerciseId ?? assignments[0]?.exerciseId ?? null
  }, [assignments, attemptsByExercise])

  const finishedCount = useMemo(
    () =>
      assignments.filter(
        (assignment) => (attemptsByExercise[assignment.exerciseId]?.attempts ?? 0) > 0,
      ).length,
    [assignments, attemptsByExercise],
  )

  if (!classroomId || !exerciseType || !theme) {
    return <div className="p-6">Ruta invalida.</div>
  }

  if (loading) {
    return <div className="p-6">Cargando tema...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 px-6 py-10 sm:py-16">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-blue-200 bg-white/90 px-4 py-3">
          <Link
            href={`/student/play/${classroomId}/${encodeURIComponent(exerciseType)}`}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
          <div className="text-right text-sm font-semibold text-slate-700">
            <div className="text-blue-700">{exerciseType}</div>
            <div>
              Tema: <span className="text-emerald-700">{theme}</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border-2 border-blue-200 bg-white/90 p-6 shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900">{theme}</h1>
              <p className="mt-2 text-sm text-slate-600">
                Resuelve los ejercicios en orden. Solo los ejercicios con `component_key`
                que empiezan con CristoSalvador/ tienen un maximo de 3 intentos.
              </p>
            </div>

            {firstPlayableExerciseId ? (
              <Link
                href={`/student/play/${firstPlayableExerciseId}`}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                <PlayCircle className="h-4 w-4" />
                {finishedCount > 0 ? 'Continuar tema' : 'Comenzar tema'}
              </Link>
            ) : (
              <div className="rounded-xl bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-800">
                Tema completado
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border-2 border-blue-200 bg-white/90 p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Progreso del tema</h2>
            <span className="text-sm font-semibold text-slate-600">
              {finishedCount}/{assignments.length} con al menos un intento
            </span>
          </div>

          <div className="space-y-3">
            {assignments.map((assignment, index) => {
              const stats = attemptsByExercise[assignment.exerciseId] ?? {
                attempts: 0,
                correctAttempts: 0,
                lastCorrect: false,
              }

              const maxAttempts = getExerciseMaxAttempts(assignment.componentKey)
              const limitedAttempts = hasLimitedAttempts(assignment.componentKey)
              const exhausted = stats.attempts >= maxAttempts
              const started = stats.attempts > 0
              const isCurrentPlayable = assignment.exerciseId === firstPlayableExerciseId
              const isUnlocked = !limitedAttempts || isCurrentPlayable || started
              const remainingAttempts = limitedAttempts
                ? Math.max(0, maxAttempts - stats.attempts)
                : null

              const statusIcon = stats.lastCorrect ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : exhausted ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : started ? (
                <Clock3 className="h-5 w-5 text-amber-500" />
              ) : (
                <Circle className="h-5 w-5 text-slate-300" />
              )

              return (
                <div
                  key={assignment.assignmentId}
                  className="flex items-center justify-between rounded-2xl border border-blue-100 px-4 py-4"
                >
                  <div className="flex items-center gap-3">
                    {statusIcon}
                    <div>
                      <div className="font-semibold text-slate-900">Ejercicio {index + 1}</div>
                      <div className="text-sm text-slate-600">
                        Intentos: {stats.attempts}
                        {limitedAttempts ? `/${maxAttempts}` : ''}
                        {stats.correctAttempts > 0
                          ? ' · Correcto'
                          : exhausted
                            ? ' · Sin intentos disponibles'
                            : ''}
                      </div>
                      <div className="text-xs text-slate-500">
                        {stats.correctAttempts > 0
                          ? 'Completado correctamente. Puedes revisar el feedback.'
                          : started
                            ? limitedAttempts
                              ? `Intento incorrecto. Te quedan ${remainingAttempts} intento${remainingAttempts === 1 ? '' : 's'}.`
                              : 'Intento incorrecto. Puedes volver a intentarlo.'
                            : !limitedAttempts
                              ? 'Disponible en cualquier momento.'
                            : isCurrentPlayable
                              ? 'Este es el siguiente ejercicio del tema.'
                              : 'Se desbloquea al avanzar en el tema.'}
                      </div>
                    </div>
                  </div>

                  {isUnlocked ? (
                    <Link
                      href={`/student/play/${assignment.exerciseId}`}
                      className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      {started ? 'Continuar' : 'Resolver'}
                    </Link>
                  ) : started ? (
                    <Link
                      href={`/student/play/${assignment.exerciseId}`}
                      className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      Ver feedback
                    </Link>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-500">
                      Bloqueado
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
