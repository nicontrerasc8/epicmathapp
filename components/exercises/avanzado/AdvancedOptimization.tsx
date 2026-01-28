'use client'

import { useMemo, useState } from 'react'
import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { MathProvider, MathTex } from '../base/MathBlock'
import { DetailedExplanation } from '../base/DetailedExplanation'
import { ExerciseHud } from '../base/ExerciseHud'
import { OptionsGrid, type Option } from '../base/OptionsGrid'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { useExerciseSubmission } from '@/lib/exercises/useExerciseSubmission'
import { useExerciseTimer } from '@/lib/exercises/useExerciseTimer'
import { computeTrophyGain, WRONG_PENALTY } from '@/lib/exercises/gamification'

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function buildCostCurve() {
  const a = randInt(1, 3)
  const optimum = randInt(3, 7)
  const b = -2 * a * optimum
  const c = randInt(15, 45)
  return { a, b, c, optimum }
}

function buildOptions(correct: number): Option[] {
  const offsets = [-3, -1, 1, 2]
  const values = new Set<number>()
  values.add(correct)
  offsets.forEach(offset => values.add(correct + offset))
  return Array.from(values)
    .map(value => ({ value: value.toString(), correct: value === correct }))
    .sort(() => Math.random() - 0.5)
}

export default function AdvancedOptimization({
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
    const data = buildCostCurve()
    const latex = `${data.a}p^2 + ${data.b}p + ${data.c}`
    const options = buildOptions(data.optimum)
    return { ...data, latex, options }
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
        correctAnswer: ejercicio.optimum.toString(),
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
        title="Optimizacion cuadratica"
        prompt="Encuentra el precio que minimiza el costo y selecciona la opcion correcta."
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Optimización cuadrática paso a paso"
              steps={[
                {
                  title: '¿Qué buscamos?',
                  detail: 'Encontramos el vértice de la parábola de costo y comunicamos el precio óptimo.',
                  content: (
                    <MathTex block tex={`${ejercicio.a}p^2 + ${ejercicio.b}p + ${ejercicio.c}`} />
                  ),
                },
                {
                  title: 'Deriva para el cambio',
                  detail: 'Aplicamos la derivada 2ap + b para medir la pendiente del costo.',
                  content: <MathTex block tex={`\\frac{dC}{dp} = 2 \\cdot ${ejercicio.a}p + ${ejercicio.b}`} />,
                },
                {
                  title: 'Resuelve el punto crítico',
                  detail: `Iguala la derivada a cero. El valor resultante minimiza el costo porque a > 0.`,
                  content: (
                    <MathTex
                      block
                      tex={`p^* = \\frac{-${ejercicio.b}}{2 \\cdot ${ejercicio.a}} = ${ejercicio.optimum}`}
                    />
                  ),
                },
                {
                  title: 'Verificación',
                  detail: 'Confirma que el punto crítico se encuentra en el punto más bajo de la curva.',
                  content: <MathTex block tex={`C(${ejercicio.optimum}) = ${ejercicio.a * ejercicio.optimum ** 2 + ejercicio.b * ejercicio.optimum + ejercicio.c}`} />,
                  tip: 'Si ves un valor mayor a la respuesta se trata de un distractor por exceso de precio.',
                },
              ]}
              concluding={`La respuesta correcta es ${ejercicio.optimum}, que coincide con el mínimo costo del ejercicio.`}
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground">Costo</div>
          <div className="mt-2">
            <MathTex block tex={ejercicio.latex} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Derivada, iguala a cero y resuelve para p.
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
