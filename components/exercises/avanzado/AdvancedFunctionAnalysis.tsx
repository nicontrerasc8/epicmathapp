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

function buildFunction() {
  const slope = randInt(2, 6)
  const intercept = randInt(-8, 8)
  const start = randInt(0, 3)
  const end = start + randInt(3, 6)
  const change = slope * (end - start)
  return { slope, intercept, start, end, change }
}

function buildOptions(correct: number): Option[] {
  const deltas = [-6, -4, -2, 2, 4, 6]
  const candidates = new Set<number>()
  candidates.add(correct)
  while (candidates.size < 4) {
    const candidate = correct + deltas[Math.floor(Math.random() * deltas.length)]
    candidates.add(candidate)
  }
  return Array.from(candidates)
    .map(value => ({ value: value.toString(), correct: value === correct }))
    .sort(() => Math.random() - 0.5)
}

export default function AdvancedFunctionAnalysis({
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
    const data = buildFunction()
    const latex = `f(x) = ${data.slope}x ${data.intercept >= 0 ? '+' : '-'} ${Math.abs(data.intercept)}`
    const question = `f(${data.end}) - f(${data.start})`
    const options = buildOptions(data.change)

    return { ...data, latex, question, options }
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
        correctAnswer: ejercicio.change.toString(),
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
        title="Analisis de funciones"
        prompt="Calcula cuanto cambia el valor de f entre dos instantes y elige la respuesta correcta."
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
                  Paso 1 ? Reconoce la funcion
                </div>
                <p className="text-muted-foreground">
                  El coeficiente de x es la pendiente y el termino independiente da la posicion inicial.
                </p>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2 flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  Paso 2 ? Evalua los extremos
                </div>
                <p className="text-muted-foreground">
                  Sustituye las dos x en la funcion y calcula f(x2) y f(x1) por separado.
                </p>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2">Paso 3 ? Calcula la diferencia</div>
                <p className="text-muted-foreground">
                  Resta f(x1) de f(x2); si la pendiente es positiva, el resultado sera multiplo de la diferencia en x.
                </p>
                <div className="mt-2 rounded-lg border bg-background p-3">
                  <MathTex block tex={`f(${ejercicio.end}) - f(${ejercicio.start}) = ${ejercicio.change}`} />
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground">Funcion</div>
          <div className="mt-2">
            <MathTex block tex={ejercicio.latex} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Queremos {ejercicio.question}.
          </p>
        </div>

        <OptionsGrid
          options={ejercicio.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={op => <span>{op.value}</span>}
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
