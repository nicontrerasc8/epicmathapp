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

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

/* =========================
   GENERADOR
   Intersección con eje Y
   y = mx + b  →  intersección: (0, b)
========================= */

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  const m = randInt(-5, 5) || 2 // evita 0
  const b = randInt(-10, 10)

  const correct = `(0, ${b})`

  const distractors = [
    `(${b}, 0)`,         // confundir con eje X
    `(0, ${m})`,         // usar pendiente
    `(${m}, ${b})`,      // punto cualquiera
    `(${b}, ${m})`,      // invertido
  ]

  return {
    m,
    b,
    correct,
    distractors,
  }
}

function generateOptions(s: Scenario): Option[] {
  const all: Option[] = [
    { value: s.correct, correct: true },
    ...s.distractors.map(d => ({ value: d, correct: false })),
  ]

  return shuffle(all)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function InterseccionEjeYGame({
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

  const scenario = useMemo(() => {
    const s = generateScenario()
    return { ...s, options: generateOptions(s) }
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
        correctAnswer: scenario.correct,
        question: {
          m: scenario.m,
          b: scenario.b,
        },
        computed: {
          rule: "La intersección con el eje Y se obtiene cuando x = 0.",
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

  const questionTex = `\\text{¿Cuál es la intersección con el eje } y \\text{ de la recta } y=${scenario.m}x ${scenario.b >= 0 ? "+" : ""}${scenario.b}?`

  return (
    <MathProvider>
      <ExerciseShell
        title="Intersección con el eje Y"
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
                  title: "Recordar la forma y = mx + b",
                  detail: (
                    <span>
                      En la ecuación de la recta, el término independiente <b>b</b> es la intersección con el eje Y.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`y = mx + b`} />
                    </div>
                  ),
                },
                {
                  title: "Evaluar en x = 0",
                  detail: (
                    <span>
                      Para hallar la intersección con el eje Y, reemplazamos <b>x = 0</b>.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`y = ${scenario.m}(0) + ${scenario.b}`} />
                      <MathTex block tex={`y = ${scenario.b}`} />
                    </div>
                  ),
                },
                {
                  title: "Escribir el punto",
                  detail: <span>El punto es (0, b).</span>,
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`(0, ${scenario.b})`} />
                    </div>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta final: <b>(0, {scenario.b})</b>.
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3">
            <MathTex block tex={questionTex} />
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={op => <MathTex tex={`\\text{${op.value}}`} />}
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