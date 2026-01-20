'use client'

import { useParams } from 'next/navigation'
import { ExerciseRegistry } from '@/components/exercises'
import { useExerciseContext } from '@/lib/exercises/useExerciseContext'


export default function ExercisePlayPage() {
  const { id } = useParams()
  const exerciseId = typeof id === 'string' ? id : null

  const {
    classroomId,
    sessionId,
    loading,
    error,
  } = useExerciseContext(exerciseId)

  if (!exerciseId) {
    return <div className="p-6">ID inválido</div>
  }

  if (loading) {
    return <div className="p-6">Cargando ejercicio…</div>
  }

  if (error || !classroomId) {
    return (
      <div className="p-6 text-red-500">
        {error ?? 'Error cargando contexto'}
      </div>
    )
  }

  return (
    <ExerciseRegistry
      exerciseId={exerciseId}
      classroomId={classroomId}
      sessionId={sessionId ?? undefined}
    />
  )
}
