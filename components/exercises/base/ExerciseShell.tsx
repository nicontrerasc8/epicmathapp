'use client'

import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type ExerciseStatus = 'idle' | 'ok' | 'revealed'

type Props = {
  title: string
  prompt: string
  status: ExerciseStatus
  attempts: number
  maxAttempts: number
  onVerify?: () => void
  onNext?: () => void
  children: ReactNode
  solution?: ReactNode
}

export function ExerciseShell({
  title,
  prompt,
  status,
  attempts,
  maxAttempts,
  onVerify,
  onNext,
  children,
  solution,
}: Props) {
  const isFinished = status === 'ok' || status === 'revealed'
  const progress =
    maxAttempts > 0 ? Math.min(1, attempts / maxAttempts) : 0

  return (
    <div
      className="min-h-screen bg-background text-foreground p-6"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at top, rgba(59,130,246,.08), transparent 40%), radial-gradient(ellipse at bottom, rgba(250,204,21,.08), transparent 40%)',
      }}
    >
      <h1 className="text-2xl font-bold mb-4 text-center">{title}</h1>

      <div className="mx-auto max-w-3xl bg-card rounded-2xl shadow p-6 space-y-6">
        {/* Prompt */}
        <p className="text-lg text-center whitespace-pre-line">
          {prompt}
        </p>

        {/* Barra de intentos */}
        {maxAttempts > 0 && (
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-2 bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}

        {/* Contenido del ejercicio */}
        {children}

        {/* Botones */}
        <div className="flex items-center justify-center gap-4">
          {!isFinished && onVerify && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onVerify}
              className="px-6 py-2 rounded-lg shadow bg-primary text-primary-foreground hover:opacity-90"
            >
              Verificar
            </motion.button>
          )}

          {isFinished && onNext && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onNext}
              className="px-6 py-2 rounded-lg shadow bg-primary text-primary-foreground hover:opacity-90"
            >
              Siguiente
            </motion.button>
          )}
        </div>

        {/* Solución */}
        <AnimatePresence>
          {solution && isFinished && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {solution}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
