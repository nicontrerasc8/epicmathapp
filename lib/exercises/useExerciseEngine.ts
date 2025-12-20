'use client'

import { useState } from 'react'

export type ExerciseStatus = 'idle' | 'ok' | 'revealed'

type EngineConfig = {
  maxAttempts?: number
}

export function useExerciseEngine(config?: EngineConfig) {
  const maxAttempts = config?.maxAttempts ?? 3

  const [attempts, setAttempts] = useState(0)
  const [status, setStatus] = useState<ExerciseStatus>('idle')

  function submit(isCorrect: boolean) {
    if (status !== 'idle') return

    if (isCorrect) {
      setStatus('ok')
      return
    }

    const nextAttempts = attempts + 1
    setAttempts(nextAttempts)

    if (nextAttempts >= maxAttempts) {
      setStatus('revealed')
    }
  }

  function reset() {
    setAttempts(0)
    setStatus('idle')
  }

  return {
    // estado
    status,
    attempts,
    maxAttempts,

    // acciones
    submit,
    reset,

    // helpers
    isFinished: status === 'ok' || status === 'revealed',
    canAnswer: status === 'idle',
  }
}
