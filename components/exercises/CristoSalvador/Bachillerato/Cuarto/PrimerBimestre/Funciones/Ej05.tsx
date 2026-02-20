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
   GENERADOR
========================= */

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  for (let i = 0; i < 200; i++) {
    const m = randInt(-5, 5)
    if (m === 0) continue

    const x = randInt(-5, 5)
    const y = randInt(-10, 10)

    const b = y - m * x

    if (Math.abs(b) <= 20) {
      return { m, x, y, b }
    }
  }

  // fallback exacto como imagen
  return { m: -4, x: 2, y: 1, b: 9 }
}

/* =========================
   OPCIONES
========================= */

function generateOptions(s: Scenario): Option[] {
  const correct = `y = ${s.m}x ${s.b >= 0 ? "+ " + s.b : "- " + Math.abs(s.b)}`

  const wrongSignSlope = `y = ${-s.m}x ${s.b >= 0 ? "+ " + s.b : "- " + Math.abs(s.b)}`
  const wrongB = `y = ${s.m}x ${s.b + 2 >= 0 ? "+ " + (s.b + 2) : "- " + Math.abs(s.b + 2)}`
  const wrongBoth = `y = ${-s.m}x ${s.b - 2 >= 0 ? "+ " + (s.b - 2) : "- " + Math.abs(s.b - 2)}`
  const wrongRandom = `y = ${s.m}x ${s.b - 4 >= 0 ? "+ " + (s.b - 4) : "- " + Math.abs(s.b - 4)}`

  const options = [
    { value: correct, correct: true },
    { value: wrongSignSlope, correct: false },
    { value: wrongB, correct: false },
    { value: wrongBoth, correct: false },
    { value: wrongRandom, correct: false },
  ]

  return options.sort(() => Math.random() - 0.5)
}

/* ============================================================
   COMPONENTE
============================================================ */

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

  const { elapsed, startedAtRef } = useExerciseTimer(
    engine.canAnswer,
    nonce
  )

  const scenario = useMemo(() => {
    const s = generateScenario()
    return {
      ...s,
      options: generateOptions(s),
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
        correctAnswer: `y = ${scenario.m}x + ${scenario.b}`,
        question: {
          m: scenario.m,
          x: scenario.x,
          y: scenario.y,
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

  const formulaTex = `y = mx + b`
  const substitutionTex = `
${scenario.y} = ${scenario.m}(${scenario.x}) + b
`
  const solveTex = `
${scenario.y} = ${scenario.m * scenario.x} + b
`
  const resultTex = `
b = ${scenario.b}
`

  return (
    <MathProvider>
      <ExerciseShell
        title="Recta paralela"
        prompt="¿Cuál es la ecuación de la recta paralela que pasa por el punto dado?"
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
                  title: "Las rectas paralelas tienen la misma pendiente",
                  detail: (
                    <span>
                      Si dos rectas son paralelas, comparten el mismo valor de <MathTex tex={`m`} />.
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={`m = ${scenario.m}`} />,
                },
                {
                  title: "Usar forma y = mx + b",
                  detail: (
                    <span>
                      Sustituimos el punto <b>({scenario.x}, {scenario.y})</b> en la forma general para hallar <MathTex tex={`b`} />.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={formulaTex} />
                      <MathTex block tex={substitutionTex} />
                      <MathTex block tex={solveTex} />
                      <MathTex block tex={resultTex} />
                    </div>
                  ),
                },
                {
                  title: "Ecuación final",
                  detail: (
                    <span>
                      Escribimos la recta con la pendiente y el intercepto encontrados.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: (
                    <MathTex
                      block
                      tex={`y = ${scenario.m}x ${
                        scenario.b >= 0
                          ? "+ " + scenario.b
                          : "- " + Math.abs(scenario.b)
                      }`}
                    />
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta:{" "}
                  <b>
                    y = {scenario.m}x{" "}
                    {scenario.b >= 0
                      ? "+ " + scenario.b
                      : "- " + Math.abs(scenario.b)}
                  </b>
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
              ¿Cuál es la ecuación de la recta paralela a{" "}
              <b>y = {scenario.m}x + 3</b> que pasa por el punto{" "}
              <b>({scenario.x}, {scenario.y})</b>?
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
