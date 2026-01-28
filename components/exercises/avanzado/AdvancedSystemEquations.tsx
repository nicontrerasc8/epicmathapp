'use client'

import { useMemo, useState } from 'react'
import { Timer, ShieldCheck } from 'lucide-react'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { MathProvider, MathTex } from '../base/MathBlock'
import { ExerciseHud } from '../base/ExerciseHud'
import { OptionsGrid, type Option } from '../base/OptionsGrid'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { useExerciseSubmission } from '@/lib/exercises/useExerciseSubmission'
import { useExerciseTimer } from '@/lib/exercises/useExerciseTimer'
import { computeTrophyGain, WRONG_PENALTY } from '@/lib/exercises/gamification'

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function ensureNonZero(value: number, fallback = 1) {
  return value === 0 ? fallback : value
}

function buildSystem() {
  const xTrue = randInt(-4, 4)
  const yTrue = randInt(-4, 4)
  const baseA = randInt(-5, 5)
  const baseB = randInt(-5, 5)
  const a1 = ensureNonZero(baseA, 2)
  const b1 = ensureNonZero(baseB, 3)
  const a2 = ensureNonZero(randInt(-5, 5), -2)
  const b2 = ensureNonZero(randInt(-5, 5), 4)

  const c1 = a1 * xTrue + b1 * yTrue
  const c2 = a2 * xTrue + b2 * yTrue

  return {
    xTrue,
    yTrue,
    a1,
    b1,
    c1,
    a2,
    b2,
    c2,
  }
}

function buildOptions(correctPair: [number, number]): Option[] {
  const [x, y] = correctPair
  const variations: Array<[number, number]> = [
    [x + 1, y - 1],
    [x - 2, y + 2],
    [x + 2, y + 1],
  ]
  const options = [
    { value: `(${x}, ${y})`, correct: true },
    ...variations.map(([xi, yi]) => ({ value: `(${xi}, ${yi})`, correct: false })),
  ]
  return options.sort(() => Math.random() - 0.5)
}

export default function AdvancedSystemEquations({
  exerciseId,
  classroomId,
  sessionId,
}: {
  exerciseId: string
  classroomId: string
  sessionId?: string
}) {
  const engine = useExerciseEngine({ maxAttempts: 1 })
  const { studentId, gami, gamiLoading, submitAttempt } = useExerciseSubmission({
    exerciseId,
    classroomId,
    sessionId,
  })

  const [nonce, setNonce] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const { elapsed, startedAtRef } = useExerciseTimer(engine.canAnswer, nonce)

  const ejercicio = useMemo(() => {
    const data = buildSystem()
    const correctPair: [number, number] = [data.xTrue, data.yTrue]
    return {
      ...data,
      latex: `\\begin{cases}${data.a1}x + ${data.b1}y = ${data.c1}\\\\${data.a2}x + ${data.b2}y = ${data.c2}\\end{cases}`,
      options: buildOptions(correctPair),
      correctPair,
    }
  }, [nonce])

  const trophyPreview = useMemo(() => computeTrophyGain(elapsed), [elapsed])

  async function pickOption(option: Option) {
    if (!engine.canAnswer) return
    const timeSeconds = (Date.now() - startedAtRef.current) / 1000
    setSelected(option.value)
    engine.submit(option.correct)

    await submitAttempt({
      correct: option.correct,
      answer: {
        selected: option.value,
        correctAnswer: `(${ejercicio.correctPair[0]}, ${ejercicio.correctPair[1]})`,
        latex: ejercicio.latex,
        options: ejercicio.options.map(o => o.value),
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  return (
    <MathProvider>
      <ExerciseShell
        title="Sistema lineal"
        prompt="Resuelve el sistema y elige las coordenadas correctas (x, y)."
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <div className="space-y-4 text-sm leading-relaxed">
              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Paso 1 Identifica cada ecuaci�n
                </div>
                <p className="text-muted-foreground">
                  Trabaja con ambas igualdades y conserva la notaci�n para saber que combina con que.
                </p>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2 flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  Paso 2 - Usa sumas o sustituci�n
                </div>
                <p className="text-muted-foreground">
                  Elige eliminar una variable sumando multiplicadas las ecuaciones o sustituye un valor aislado.
                </p>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2">Paso 3 - Verifica</div>
                <p className="text-muted-foreground">
                  Sustituye la pareja final en ambas ecuaciones para confirmar que ambas igualdades se mantienen.
                </p>
                <div className="mt-2 rounded-lg border bg-background p-3">
                  <MathTex block tex={`(${ejercicio.correctPair[0]}, ${ejercicio.correctPair[1]})`} />
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground">Contexto</div>
          <div className="mt-2">
            <MathTex block tex={ejercicio.latex} />
          </div>
        </div>

        <OptionsGrid
          options={ejercicio.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={op => (
            <span>{op.value}</span>
          )}
        />

        <div className="mt-6">
          <ExerciseHud
            elapsed={elapsed}
            trophyPreview={trophyPreview}
            gami={gami}
            gamiLoading={gamiLoading}
            studentId={studentId}
            wrongPenalty={WRONG_PENALTY}
            status={engine.status}
          />
        </div>
      </ExerciseShell>
    </MathProvider>
  )
}



