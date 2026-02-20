"use client"

import { useMemo, useState } from "react"
import { ShieldCheck, Sigma, Divide } from "lucide-react"

import { useExerciseEngine } from "@/lib/exercises/useExerciseEngine"
import { useExerciseSubmission } from "@/lib/exercises/useExerciseSubmission"
import { useExerciseTimer } from "@/lib/exercises/useExerciseTimer"
import { computeTrophyGain, WRONG_PENALTY } from "@/lib/exercises/gamification"

import { Option, OptionsGrid } from "@/components/exercises/base/OptionsGrid"
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
   GENERADOR (Recta con pendiente y punto)
========================= */

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  const m = randInt(2, 6) // pendiente positiva
  const x0 = randInt(-3, 3)
  const y0 = randInt(-5, 5)

  const b = y0 - m * x0

  const questionTex = `
\\text{¿Cuál es la ecuación de la recta con pendiente } ${m} 
\\text{ que pasa por el punto } (${x0}, ${y0})?
`

  const correct = `y=${m}x${b >= 0 ? "+" + b : b}`

  return {
    m,
    x0,
    y0,
    b,
    questionTex,
    correct,
  }
}

/* =========================
   OPCIONES
========================= */

function generateOptions(s: Scenario): Option[] {
  const correct = s.correct

  const wrong1 = `y=${s.m}x${s.b + 2 >= 0 ? "+" + (s.b + 2) : s.b + 2}`
  const wrong2 = `y=-${s.m}x${s.b >= 0 ? "+" + s.b : s.b}`
  const wrong3 = `y=${s.m}x`
  const wrong4 = `y=${s.m}x${s.b - 2 >= 0 ? "+" + (s.b - 2) : s.b - 2}`

  const all: Option[] = [
    { value: correct, correct: true },
    { value: wrong1, correct: false },
    { value: wrong2, correct: false },
    { value: wrong3, correct: false },
    { value: wrong4, correct: false },
  ]

  const unique = Array.from(
    new Map(all.map(o => [o.value, o])).values()
  )

  return shuffle(unique).slice(0, 5)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function EcuacionRectaGame({
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
    return { ...s, options: generateOptions(s) }
  }, [nonce])

  const trophyPreview = useMemo(
    () => computeTrophyGain(elapsed),
    [elapsed]
  )

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
        m: scenario.m,
        point: [scenario.x0, scenario.y0],
        b: scenario.b,
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

  return (
    <MathProvider>
      <ExerciseShell
        title="Ecuación de la recta"
        prompt="Resolver:"
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
                  title: "Usar la forma y = mx + b",
                  detail: (
                    <span>
                      Partimos de la forma general de la recta con pendiente conocida.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <MathTex
                      block
                      tex={`y = ${scenario.m}x + b`}
                    />
                  ),
                },
                {
                  title: "Sustituir el punto dado",
                  detail: (
                    <span>
                      Reemplazamos el punto <b>({scenario.x0}, {scenario.y0})</b> para hallar <MathTex tex={`b`} />.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <MathTex
                      block
                      tex={`${scenario.y0} = ${scenario.m}(${scenario.x0}) + b`}
                    />
                  ),
                },
                {
                  title: "Despejar b",
                  detail: (
                    <span>
                      Aislamos el término independiente.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: (
                    <MathTex
                      block
                      tex={`b = ${scenario.b}`}
                    />
                  ),
                },
                {
                  title: "Escribir la ecuación final",
                  detail: (
                    <span>
                      Sustituimos el valor de <MathTex tex={`b`} /> en la ecuación de la recta.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: (
                    <MathTex
                      block
                      tex={scenario.correct}
                    />
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
            <MathTex block tex={scenario.questionTex} />
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={op => <MathTex tex={op.value} />}
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
