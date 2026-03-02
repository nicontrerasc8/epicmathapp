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

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  // evitar 0 para que siempre exista inversa
  let m = randInt(-6, 6)
  while (m === 0) m = randInt(-6, 6)

  const perpendicularSlope = -1 / m

  // formatear fracciones simples
  function formatSlope(n: number) {
    if (Number.isInteger(n)) return n.toString()
    const sign = n < 0 ? "-" : ""
    const abs = Math.abs(n)
    return `${sign}1/${abs}`
  }

  const correct = formatSlope(perpendicularSlope)

  const wrongOptions = [
    m.toString(),                 // misma pendiente
    (-m).toString(),              // opuesta
    formatSlope(1 / m),           // inversa sin negativo
    "0",                          // distractor típico
    formatSlope(perpendicularSlope * -1), // cambia signo incorrecto
  ]

  const pool = shuffle(wrongOptions).filter(o => o !== correct)

  const options: Option[] = [
    { value: correct, correct: true },
  ]

  for (const w of pool) {
    if (options.length >= 5) break
    options.push({ value: w, correct: false })
  }

  return {
    originalSlope: m,
    perpendicularSlope,
    correct,
    options: shuffle(options),
  }
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function PendienteMediatrizGame({
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

  const { elapsed, startedAtRef } = useExerciseTimer(engine.canAnswer, nonce)

  const scenario = useMemo(() => generateScenario(), [nonce])

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
        correctAnswer: scenario.correct,
        originalSlope: scenario.originalSlope,
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  const ruleTex = `m_{\\perp} = -\\frac{1}{m}`

  const substitutionTex = `
m_{\\perp} = -\\frac{1}{${scenario.originalSlope}}
`

  const resultTex = `
m_{\\perp} = ${scenario.correct}
`

  return (
    <MathProvider>
      <ExerciseShell
        title="Pendiente de la mediatriz"
        prompt="Si la pendiente de un segmento es:"
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
                  title: "Regla de perpendicularidad",
                  detail: (
                    <span>
                      La pendiente de una recta perpendicular es la inversa negativa.
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={ruleTex} />,
                },
                {
                  title: "Sustituir valor",
                  detail: (
                    <span>
                      Reemplazamos la pendiente dada.
                    </span>
                  ),
                  icon: Divide,
                  content: <MathTex block tex={substitutionTex} />,
                },
                {
                  title: "Resultado final",
                  detail: (
                    <span>
                      Simplificamos la expresión.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: <MathTex block tex={resultTex} />,
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta: <b>{scenario.correct}</b>
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

          <div className="rounded-lg border bg-background p-3">
            <div className="text-sm">
              Si la pendiente de un segmento es <b>{scenario.originalSlope}</b>,
              la pendiente de su mediatriz es:
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