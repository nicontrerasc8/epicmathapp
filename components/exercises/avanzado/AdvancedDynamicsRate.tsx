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

function buildMotion() {
  const initial = randInt(1, 5)
  const rate = randInt(2, 6)
  const timeStart = randInt(0, 2)
  const timeEnd = timeStart + randInt(2, 4)
  const delta = rate * (timeEnd - timeStart)
  return { initial, rate, timeStart, timeEnd, delta }
}

function buildOptions(correct: number): Option[] {
  const offsets = [-5, -3, -1, 1, 3, 5]
  const set = new Set<number>()
  set.add(correct)
  offsets.forEach(offset => set.add(correct + offset))
  return Array.from(set)
    .map(value => ({ value: value.toString(), correct: value === correct }))
    .sort(() => Math.random() - 0.5)
}

export default function AdvancedDynamicsRate({
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
    const data = buildMotion()
    const totalChange = data.rate * (data.timeEnd - data.timeStart)
    const options = buildOptions(totalChange)
    return { ...data, totalChange, options }
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
        correctAnswer: ejercicio.totalChange.toString(),
        latex: `${ejercicio.rate} \cdot (${ejercicio.timeEnd} - ${ejercicio.timeStart})`,
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
        title="Fenomenos dinamicos"
        prompt="Calcula cuanta distancia extra recorre el objeto entre dos instantes."
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
                  Paso 1 ? Interpreta la tasa
                </div>
                <p className="text-muted-foreground">
                  La tasa indica cuanto cambia la variable por unidad de tiempo. Multiplica por el intervalo para la suma real.
                </p>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2 flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  Paso 2 ? Calcula el incremento
                </div>
                <p className="text-muted-foreground">
                  Usa el intervalo (t2 - t1) y multiplica por la tasa para obtener la variacion del movimiento.
                </p>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2">Paso 3 ? Relaciona con posicion final</div>
                <p className="text-muted-foreground">
                  Suma la variacion al valor inicial para confirmar que la intuicion coincide con el modelo.
                </p>
                <div className="mt-2 rounded-lg border bg-background p-3">
                  <MathTex
                    block
                    tex={`\Delta = ${ejercicio.rate} \cdot (${ejercicio.timeEnd} - ${ejercicio.timeStart}) = ${ejercicio.totalChange}`}
                  />
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground">Escenario</div>
          <p className="text-sm text-muted-foreground">
            Partimos de {ejercicio.initial} unidades con una tasa de {ejercicio.rate} unidades por segundo.
          </p>
          <p className="text-sm text-muted-foreground">
            Queremos el cambio entre t = {ejercicio.timeStart} y t = {ejercicio.timeEnd}.
          </p>
        </div>

        <OptionsGrid options={ejercicio.options} selectedValue={selected} status={engine.status} canAnswer={engine.canAnswer} onSelect={pickOption} />

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
