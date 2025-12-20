'use client'

import { ExerciseRegistry } from '@/components/exercises'
import { useParams } from 'next/navigation'


export default function TemaPlayPage() {
  const { id } = useParams()

  if (!id || typeof id !== 'string') {
    return <div className="p-6">ID inválido</div>
  }

  return <ExerciseRegistry temaPeriodoId={id} />
}
