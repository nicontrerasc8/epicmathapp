'use client'

import { useParams } from 'next/navigation'
import { ExerciseRegistry } from '@/components/exercises'
import { useExerciseContext } from '@/lib/exercises/useExerciseContext'


export default function TemaPlayPage() {
  const { id } = useParams()
  const exerciseId = typeof id === 'string' ? id : null

  const {
    temaId,
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

  if (error || !temaId || !classroomId) {
    return (
      <div className="p-6 text-red-500">
        {error ?? 'Error cargando contexto'}
      </div>
    )
  }

  return (
    <ExerciseRegistry
      exerciseId={exerciseId}
      temaId={temaId}
      classroomId={classroomId}
      sessionId={sessionId ?? undefined}
    />
  )
}
