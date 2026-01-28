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
            <div className="space-y-4 text-sm leading-relaxed">
              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Paso 1 - Reconoce el polinomio
                </div>
                <p className="text-muted-foreground">
                  La derivada de C(p) = 2ap + b nos dice como cambia el costo con p.
                </p>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2 flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  Paso 2 - Igualar a cero
                </div>
                <p className="text-muted-foreground">
                  Resuelve 2ap + b = 0 para hallar el punto critico que minimiza el costo.
                </p>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2">Paso 3 ? Verifica el signo</div>
                <p className="text-muted-foreground">
                  Si a &gt; 0, el punto es minimo. Confirma el numero exacto para comunicar la decision.
                </p>
                <div className="mt-2 rounded-lg border bg-background p-3">
                  <MathTex block tex={`p^* = \\frac{-${ejercicio.b}}{2 \\cdot ${ejercicio.a}} = ${ejercicio.optimum}`} />
                </div>
              </div>
            </div>
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
