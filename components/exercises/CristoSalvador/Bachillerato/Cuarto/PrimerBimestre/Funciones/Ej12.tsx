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

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

type Scenario = ReturnType<typeof buildScenario>

function buildScenario() {
  for (let i = 0; i < 250; i++) {
    const m = randInt(-5, 5)
    if (m === 0) continue

    const x1 = randInt(-4, 4)
    let x2 = randInt(-4, 4)
    while (x2 === x1) x2 = randInt(-4, 4)

    const y1 = randInt(-8, 8)
    const y2 = y1 + m * (x2 - x1)
    if (Math.abs(y2) > 20) continue

    const bNueva = randInt(-8, 8)
    const correct = `y = ${m}x ${bNueva >= 0 ? "+" : "-"} ${Math.abs(bNueva)}`

    const options: Option[] = shuffle([
      { value: correct, correct: true },
      { value: `y = ${-m}x ${bNueva >= 0 ? "+" : "-"} ${Math.abs(bNueva)}`, correct: false },
      { value: `y = ${m + (m > 0 ? 1 : -1)}x ${bNueva >= 0 ? "+" : "-"} ${Math.abs(bNueva)}`, correct: false },
      { value: `y = ${m}x ${bNueva + 2 >= 0 ? "+" : "-"} ${Math.abs(bNueva + 2)}`, correct: false },
      { value: `y = ${m}x ${bNueva - 2 >= 0 ? "+" : "-"} ${Math.abs(bNueva - 2)}`, correct: false },
    ])

    return { x1, y1, x2, y2, pendiente: m, bNueva, correct, options }
  }

  return {
    x1: 1,
    y1: 2,
    x2: 5,
    y2: 10,
    pendiente: 2,
    bNueva: -3,
    correct: "y = 2x - 3",
    options: shuffle([
      { value: "y = 2x - 3", correct: true },
      { value: "y = 4x - 3", correct: false },
      { value: "y = -2x - 3", correct: false },
      { value: "y = 3x - 3", correct: false },
      { value: "y = \\frac{1}{2}x - 3", correct: false },
    ]),
  }
}

export default function RectaParalelaGame({
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

  const scenario: Scenario = useMemo(() => buildScenario(), [nonce])

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
        question: {
          points: [
            { x: scenario.x1, y: scenario.y1 },
            { x: scenario.x2, y: scenario.y2 },
          ],
          yIntercept: scenario.bNueva,
        },
        computed: {
          pendiente: scenario.pendiente,
          formulaPendiente: "(y2 - y1)/(x2 - x1)",
        },
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

  const step1 = `
m = \\frac{${scenario.y2}-${scenario.y1}}{${scenario.x2}-${scenario.x1}}
= ${scenario.pendiente}
`

  const step2 = `
\\text{Rectas paralelas tienen la misma pendiente } m=${scenario.pendiente}.
`

  const step3 = `
\\text{Como la interseccion es } ${scenario.bNueva},
\\text{ la ecuacion es } ${scenario.correct}.
`

  return (
    <MathProvider>
      <ExerciseShell
        title="Rectas paralelas"
        prompt="Selecciona la opción correcta:"
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Guía paso a paso"
              steps={[
                {
                  title: "Calcular la pendiente de la recta dada",
                  detail: (
                    <span>
                      Usamos la fórmula de la pendiente:
                      <b> (y2 - y1)/(x2 - x1)</b>.
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={step1} />,
                },
                {
                  title: "Usar propiedad de paralelismo",
                  detail: (
                    <span>
                      Las rectas paralelas tienen la misma pendiente.
                    </span>
                  ),
                  icon: Divide,
                  content: <MathTex block tex={step2} />,
                },
                {
                  title: "Formar la ecuación",
                  detail: (
                    <span>
                      Forma pendiente-intersección: <b>y = mx + b</b>.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: <MathTex block tex={step3} />,
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
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <p className="text-sm leading-relaxed break-words">
              Una recta tiene intersección en <b>y = {scenario.bNueva}</b> y es paralela a la recta que pasa por{" "}
              <b>({scenario.x1}, {scenario.y1})</b> y <b>({scenario.x2}, {scenario.y2})</b>.{" "}
              ¿Cuál es su ecuación?
            </p>
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={op => (
            <MathTex tex={op.value} />
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
