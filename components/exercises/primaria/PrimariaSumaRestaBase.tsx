'use client'

import { useMemo, useState } from 'react'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

type Operation = 'suma' | 'resta'

type ExerciseConfig = {
  title: string
  prompt: string
  minA: number
  maxA: number
  minB: number
  maxB: number
  operation: Operation | 'mixta'
  allowNegative?: boolean
}

type Option = {
  value: number
  correct: boolean
}

type ExerciseProps = {
  exerciseId: string
  classroomId: string
  sessionId?: string
  config: ExerciseConfig
}

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function buildExercise(config: ExerciseConfig) {
  const operation =
    config.operation === 'mixta' ? choice<Operation>(['suma', 'resta']) : config.operation

  let a = randInt(config.minA, config.maxA)
  let b = randInt(config.minB, config.maxB)

  if (operation === 'resta' && !config.allowNegative && a < b) {
    ;[a, b] = [b, a]
  }

  const symbol = operation === 'suma' ? '+' : '-'
  const correct = operation === 'suma' ? a + b : a - b

  return { a, b, operation, symbol, correct }
}

function buildOptions(correct: number, minAnswer = 0): Option[] {
  const set = new Set<number>()
  set.add(correct)

  const deltas = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]
  let safety = 0

  while (set.size < 4 && safety < 40) {
    const delta = choice(deltas)
    const candidate = correct + delta
    if (candidate >= minAnswer) {
      set.add(candidate)
    }
    safety += 1
  }

  while (set.size < 4) {
    const candidate = Math.max(minAnswer, correct + randInt(-9, 9))
    set.add(candidate)
  }

  return Array.from(set)
    .sort(() => Math.random() - 0.5)
    .map(value => ({ value, correct: value === correct }))
}

export function PrimariaSumaRestaBase({
  exerciseId,
  classroomId,
  sessionId,
  config,
}: ExerciseProps) {
  const engine = useExerciseEngine({ maxAttempts: 1 })
  const [nonce, setNonce] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)

  const ejercicio = useMemo(() => {
    const core = buildExercise(config)
    const options = buildOptions(core.correct, 0)
    return { ...core, options }
  }, [config, nonce])

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelected(op.value)
    engine.submit(op.correct)

    persistExerciseOnce({
      exerciseId,
      classroomId,
      sessionId,
      correct: op.correct,
      answer: {
        selected: op.value,
        correctAnswer: ejercicio.correct,
        operation: ejercicio.operation,
        a: ejercicio.a,
        b: ejercicio.b,
        options: ejercicio.options.map(o => o.value),
      },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  return (
    <ExerciseShell
      title={config.title}
      prompt={config.prompt}
      status={engine.status}
      attempts={engine.attempts}
      maxAttempts={engine.maxAttempts}
      onVerify={() => {}}
      onNext={siguiente}
      solution={
        <SolutionBox>
          <div className="space-y-3 text-sm leading-relaxed">
            <div className="rounded-lg border bg-white p-3">
              <div className="font-semibold mb-2">Paso 1 - Resuelve la operacion</div>
              <div className="text-muted-foreground">
                {ejercicio.a} {ejercicio.symbol} {ejercicio.b} = {ejercicio.correct}
              </div>
            </div>
            <div className="rounded-lg border bg-white p-3">
              <div className="font-semibold mb-2">Paso 2 - Marca la respuesta correcta</div>
              <div className="text-muted-foreground">
                La opcion correcta es {ejercicio.correct}.
              </div>
            </div>
          </div>
        </SolutionBox>
      }
    >
      <div className="rounded-xl border bg-white p-4 mb-4 text-center">
        <div className="text-sm text-muted-foreground mb-2">Operacion</div>
        <div className="text-2xl font-semibold">
          {ejercicio.a} {ejercicio.symbol} {ejercicio.b} = ?
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {ejercicio.options.map(op => {
          const isSelected = selected === op.value
          const showCorrect = engine.status !== 'idle' && op.correct
          const showWrong = engine.status === 'revealed' && isSelected && !op.correct

          return (
            <button
              key={op.value}
              type="button"
              disabled={!engine.canAnswer}
              onClick={() => pickOption(op)}
              className={[
                'border rounded-xl p-4 text-center transition',
                'hover:shadow-sm hover:-translate-y-0.5',
                isSelected && 'ring-2 ring-primary',
                showCorrect && 'bg-green-400',
                showWrong && 'bg-red-400',
                !engine.canAnswer && 'opacity-80 cursor-not-allowed',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="text-xl font-semibold">{op.value}</div>
            </button>
          )
        })}
      </div>
    </ExerciseShell>
  )
}


