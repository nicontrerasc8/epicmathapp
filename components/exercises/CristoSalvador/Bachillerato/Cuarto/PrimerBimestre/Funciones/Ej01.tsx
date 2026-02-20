"use client"

import { useMemo, useState } from "react"
import { ShieldCheck, Sigma, Divide } from "lucide-react"

import { useExerciseEngine } from "@/lib/exercises/useExerciseEngine"
import { useExerciseSubmission } from "@/lib/exercises/useExerciseSubmission"
import { useExerciseTimer } from "@/lib/exercises/useExerciseTimer"
import { computeTrophyGain, WRONG_PENALTY } from "@/lib/exercises/gamification"

import { type Option, OptionsGrid } from "@/components/exercises/base/OptionsGrid"
import { MathProvider, MathTex } from "@/components/exercises/base/MathBlock"
import { ExerciseHud } from "@/components/exercises/base/ExerciseHud"
import { SolutionBox } from "@/components/exercises/base/SolutionBox"
import { ExerciseShell } from "@/components/exercises/base/ExerciseShell"
import { DetailedExplanation } from "@/components/exercises/base/DetailedExplanation"

/* =========================
   HELPERS
========================= */

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  for (let i = 0; i < 200; i++) {
    const x1 = randInt(-5, 5)
    const y1 = randInt(-5, 10)

    let x2 = randInt(-5, 10)
    while (x2 === x1) x2 = randInt(-5, 10)

    const slope = randInt(-4, 6)
    const y2 = y1 + slope * (x2 - x1)

    if (Math.abs(slope) <= 8) {
      return { x1, y1, x2, y2, slope }
    }
  }

  // fallback exacto como imagen
  return { x1: 2, y1: 3, x2: 6, y2: 11, slope: 2 }
}

function generateOptions(slope: number): Option[] {
  const wrongInverse = slope !== 0 ? Math.round(1 / slope) : 1
  const wrongAbs = Math.abs(slope)
  const wrongPlusOne = slope + 1
  const wrongDouble = slope * 2

  const options = [
    { value: slope.toString(), correct: true },
    { value: wrongInverse.toString(), correct: false },
    { value: wrongAbs.toString(), correct: false },
    { value: wrongPlusOne.toString(), correct: false },
    { value: wrongDouble.toString(), correct: false },
  ]

  // quitar duplicados
  const seen = new Set<string>()
  const unique: Option[] = []
  for (const o of options) {
    if (seen.has(o.value)) continue
    seen.add(o.value)
    unique.push(o)
  }

  while (unique.length < 5) {
    const extra = (slope + randInt(-3, 3)).toString()
    if (!seen.has(extra)) {
      unique.push({ value: extra, correct: false })
      seen.add(extra)
    }
  }

  return unique.sort(() => Math.random() - 0.5)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function PendienteRectaGame({
  exerciseId,
  classroomId,
  sessionId,
}: {
  exerciseId: string
  classroomId: string
  sessionId?: string
}) {
  const engine = useExerciseEngine({ maxAttempts: 1 })
  const { studentId, gami, gamiLoading, submitAttempt } =
    useExerciseSubmission({
      exerciseId,
      classroomId,
      sessionId,
    })

  const [nonce, setNonce] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)

  const { elapsed, startedAtRef } = useExerciseTimer(
    engine.canAnswer,
    nonce
  )

  const scenario = useMemo(() => {
    const s = generateScenario()
    return {
      ...s,
      options: generateOptions(s.slope),
    }
  }, [nonce])

  const trophyPreview = useMemo(() => computeTrophyGain(elapsed), [elapsed])

  async function pickOption(op: Option) {
    if (!engine.canAnswer) return

    const timeSeconds = (Date.now() - startedAtRef.current) / 1000
    setSelected(op.value)
    engine.submit(op.correct)

    await submitAttempt({
      correct: op.correct,
      answer: {
        selected: op.value,
        correctAnswer: scenario.slope,
        question: {
          x1: scenario.x1,
          y1: scenario.y1,
          x2: scenario.x2,
          y2: scenario.y2,
        },
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  const formulaTex = `m = \\frac{y_2 - y_1}{x_2 - x_1}`

  const substitutionTex = `
m = \\frac{${scenario.y2} - ${scenario.y1}}{${scenario.x2} - ${scenario.x1}}
`

  const calcTex = `
m = \\frac{${scenario.y2 - scenario.y1}}{${scenario.x2 - scenario.x1}} = ${scenario.slope}
`

  return (
    <MathProvider>
      <ExerciseShell
        title="Pendiente de una recta"
        prompt="¿Cuál es la pendiente?"
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Resolución paso a paso"
              steps={[
                {
                  title: "Usar fórmula de pendiente",
                  detail: (
                    <span>
                      Aplicamos la fórmula de pendiente entre dos puntos.
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={formulaTex} />,
                },
                {
                  title: "Sustituir valores",
                  detail: (
                    <span>
                      Reemplazamos las coordenadas dadas en la fracción.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={substitutionTex} />
                    </div>
                  ),
                },
                {
                  title: "Calcular",
                  detail: (
                    <span>
                      Simplificamos la fracción para obtener la pendiente final.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: <MathTex block tex={calcTex} />,
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta: <b>{scenario.slope}</b>
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">
            Pregunta
          </div>

          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div className="text-sm">
              La recta pasa por los puntos{" "}
              <b>({scenario.x1}, {scenario.y1})</b> y{" "}
              <b>({scenario.x2}, {scenario.y2})</b>.
            </div>
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={(op) => <MathTex tex={op.value} />}
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
