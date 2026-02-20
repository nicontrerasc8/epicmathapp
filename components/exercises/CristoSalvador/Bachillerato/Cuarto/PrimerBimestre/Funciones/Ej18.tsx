"use client"

import { useMemo, useState } from "react"
import { ShieldCheck, Sigma, Divide } from "lucide-react"

import { useExerciseEngine } from "@/lib/exercises/useExerciseEngine"
import { useExerciseSubmission } from "@/lib/exercises/useExerciseSubmission"
import { useExerciseTimer } from "@/lib/exercises/useExerciseTimer"
import { computeTrophyGain, WRONG_PENALTY } from "@/lib/exercises/gamification"

import { type Option, OptionsGrid } from "@/components/exercises/base/OptionsGrid"
import { MathProvider } from "@/components/exercises/base/MathBlock"
import { ExerciseHud } from "@/components/exercises/base/ExerciseHud"
import { SolutionBox } from "@/components/exercises/base/SolutionBox"
import { ExerciseShell } from "@/components/exercises/base/ExerciseShell"
import { DetailedExplanation } from "@/components/exercises/base/DetailedExplanation"

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

type Statement = { value: string; correct: boolean }
type Scenario = { question: string; options: Statement[]; correct: string }

const TRUE_STATEMENTS = [
  "Si dos rectas son paralelas, sus pendientes son iguales.",
  "Si dos rectas son perpendiculares, el producto de pendientes es -1.",
  "Una recta horizontal tiene pendiente 0.",
  "Una recta vertical tiene pendiente indefinida.",
]

const FALSE_STATEMENTS = [
  "Si dos rectas tienen el mismo corte en y, siempre son paralelas.",
  "Si dos rectas son perpendiculares, sus pendientes siempre suman 0.",
  "Una recta horizontal tiene pendiente indefinida.",
  "Una recta vertical tiene pendiente 0.",
  "Si una recta tiene pendiente negativa, entonces es vertical.",
  "Dos rectas con pendientes distintas nunca se intersectan.",
]

function generateScenario(): Scenario {
  const correct = choice(TRUE_STATEMENTS)
  const wrongPool = shuffle([...FALSE_STATEMENTS]).slice(0, 4)

  const options: Statement[] = shuffle([
    { value: correct, correct: true },
    ...wrongPool.map(value => ({ value, correct: false })),
  ])

  return {
    question: "Selecciona la afirmacion verdadera sobre rectas.",
    options,
    correct,
  }
}

export default function PropiedadesRectasGame({
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

    const timeSeconds =
      (Date.now() - startedAtRef.current) / 1000

    setSelected(op.value)
    engine.submit(op.correct)

    await submitAttempt({
      correct: op.correct,
      answer: {
        selected: op.value,
        correctAnswer: scenario.correct,
        options: scenario.options.map(o => o.value),
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  const options: Option[] = scenario.options

  return (
    <MathProvider>
      <ExerciseShell
        title="Propiedades de rectas"
        prompt="Selecciona la opcion correcta:"
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Explicacion"
              steps={[
                {
                  title: "Recordemos conceptos clave",
                  detail: <span>Usamos reglas basicas de pendientes para validar cada afirmacion.</span>,
                  icon: Sigma,
                  content: (
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Rectas paralelas: misma pendiente.</li>
                      <li>Rectas perpendiculares: producto de pendientes igual a -1.</li>
                      <li>Recta horizontal: pendiente 0.</li>
                      <li>Recta vertical: pendiente indefinida.</li>
                    </ul>
                  ),
                },
                {
                  title: "Analizamos las opciones",
                  detail: <span>Solo una afirmacion respeta estas reglas al mismo tiempo.</span>,
                  icon: Divide,
                  content: (
                    <div className="space-y-2">
                      <p>Comparando las alternativas, la correcta es:</p>
                      <p><b>{scenario.correct}</b></p>
                    </div>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta final: <b>{scenario.correct}</b>.
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
            {scenario.question}
          </div>
        </div>

        <OptionsGrid
          options={options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={(op) => <span>{op.value}</span>}
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
