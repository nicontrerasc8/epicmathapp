"use client"

import { useMemo, useState } from "react"
import { ShieldCheck } from "lucide-react"

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

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  const bank = [
    {
      prompt: "Si una recta tiene pendiente 0, entonces:",
      correct: "Es paralela al eje x",
      explanation: "Pendiente 0 significa recta horizontal, por eso es paralela al eje x.",
      wrong: [
        "Es vertical",
        "Es perpendicular al eje x",
        "No tiene interseccion con el eje y",
        "Tiene pendiente indefinida",
      ],
    },
    {
      prompt: "Si una recta tiene pendiente indefinida, entonces:",
      correct: "Es vertical",
      explanation: "La pendiente indefinida corresponde a una recta vertical.",
      wrong: [
        "Es paralela al eje x",
        "Tiene pendiente 0",
        "Es horizontal",
        "Siempre pasa por el origen",
      ],
    },
    {
      prompt: "Si una recta tiene pendiente positiva, entonces:",
      correct: "Sube de izquierda a derecha",
      explanation: "Pendiente positiva implica crecimiento al avanzar en x.",
      wrong: [
        "Baja de izquierda a derecha",
        "Es horizontal",
        "Es vertical",
        "No corta ningun eje",
      ],
    },
  ]

  const picked = choice(bank)
  const options: Option[] = shuffle([
    { value: picked.correct, correct: true },
    ...picked.wrong.map(value => ({ value, correct: false })),
  ])

  return {
    ...picked,
    options,
  }
}

export default function InterpretacionPendienteGame({
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
        title="Interpretacion de pendiente"
        prompt={scenario.prompt}
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Explicacion conceptual"
              steps={[
                {
                  title: "Idea clave",
                  detail: <span>Relacionamos el signo o tipo de pendiente con la forma de la recta.</span>,
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-2">
                      <p>{scenario.explanation}</p>
                    </div>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta: <b>{scenario.correct}</b>.
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
            {scenario.prompt}
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
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
