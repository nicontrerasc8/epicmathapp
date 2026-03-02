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

/* =========================
   GENERADOR DINÁMICO
========================= */

type Scenario = {
  A: { x: number; y: number }
  B: { x: number; y: number }
  mid: { x: number; y: number }
  correct: string
  orientation: "horizontal" | "vertical"
  options: Option[]
}

function generateScenario(): Scenario {
  const orientation = Math.random() > 0.5 ? "horizontal" : "vertical"

  let A, B, mid, correct

  if (orientation === "horizontal") {
    const y = randInt(-5, 8)
    const x1 = randInt(-8, 0)
    const x2 = randInt(1, 8)

    A = { x: x1, y }
    B = { x: x2, y }

    mid = { x: (x1 + x2) / 2, y }
    correct = `x = ${mid.x}`
  } else {
    const x = randInt(-5, 8)
    const y1 = randInt(-8, 0)
    const y2 = randInt(1, 8)

    A = { x, y: y1 }
    B = { x, y: y2 }

    mid = { x, y: (y1 + y2) / 2 }
    correct = `y = ${mid.y}`
  }

  const wrong1 =
    orientation === "horizontal"
      ? `y = ${mid.y}`
      : `x = ${mid.x}`

  const wrong2 =
    orientation === "horizontal"
      ? `x = ${A.x}`
      : `y = ${A.y}`

  const wrong3 =
    orientation === "horizontal"
      ? `x = ${B.x}`
      : `y = ${B.y}`

  const wrong4 =
    orientation === "horizontal"
      ? `x = ${mid.y}`
      : `y = ${mid.x}`

  const options: Option[] = shuffle([
    { value: correct, correct: true },
    { value: wrong1, correct: false },
    { value: wrong2, correct: false },
    { value: wrong3, correct: false },
    { value: wrong4, correct: false },
  ])

  return { A, B, mid, correct, orientation, options }
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function MediatrisSegmentoGame({
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
        question: {
          A: scenario.A,
          B: scenario.B,
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

  const midpointTex = `
M\\left(\\frac{${scenario.A.x}+${scenario.B.x}}{2},\\;
\\frac{${scenario.A.y}+${scenario.B.y}}{2}\\right)
=
(${scenario.mid.x}, ${scenario.mid.y})
`

  const orientationTex =
    scenario.orientation === "horizontal"
      ? `y_1 = y_2 \\Rightarrow \\text{segmento horizontal} \\Rightarrow \\text{mediatriz vertical}`
      : `x_1 = x_2 \\Rightarrow \\text{segmento vertical} \\Rightarrow \\text{mediatriz horizontal}`

  const equationTex =
    scenario.orientation === "horizontal"
      ? `x = ${scenario.mid.x}`
      : `y = ${scenario.mid.y}`

  return (
    <MathProvider>
      <ExerciseShell
        title="Mediatriz de un segmento"
        prompt="¿Cuál es la ecuación de la mediatriz?"
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
                  title: "Calcular el punto medio",
                  detail: (
                    <span>
                      Promediamos las coordenadas de A y B para obtener el
                      punto medio del segmento.
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={midpointTex} />,
                },
                {
                  title: "Identificar orientación",
                  detail: (
                    <span>
                      Si el segmento es horizontal, su mediatriz es vertical;
                      si es vertical, su mediatriz es horizontal.
                    </span>
                  ),
                  icon: Divide,
                  content: <MathTex block tex={orientationTex} />,
                },
                {
                  title: "Escribir la ecuación",
                  detail: (
                    <span>
                      La mediatriz pasa por el punto medio y toma la forma
                      correspondiente según la orientación.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: <MathTex block tex={equationTex} />,
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
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3">
            La recta pasa por los puntos{" "}
            <b>A({scenario.A.x}, {scenario.A.y})</b> y{" "}
            <b>B({scenario.B.x}, {scenario.B.y})</b>.
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
