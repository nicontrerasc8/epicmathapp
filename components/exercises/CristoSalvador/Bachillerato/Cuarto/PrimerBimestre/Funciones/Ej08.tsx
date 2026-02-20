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
   Forma de la recta
========================= */

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  const m = randInt(-5, 5) || 2
  const x0 = randInt(-5, 5)
  const y0 = randInt(-5, 5)

  const exprTex = `y ${y0 >= 0 ? "-" : "+"} ${Math.abs(y0)} = ${m}(x ${
    x0 >= 0 ? "-" : "+"
  } ${Math.abs(x0)})`

  return {
    m,
    x0,
    y0,
    exprTex,
    correct: "Punto–pendiente",
  }
}

function generateOptions(correct: string): Option[] {
  const all: Option[] = [
    { value: "General", correct: false },
    { value: "Pendiente–intersección", correct: false },
    { value: "Punto–pendiente", correct: true },
    { value: "Segmentaria", correct: false },
    { value: "Vectorial", correct: false },
  ]

  return shuffle(all)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function FormaRectaGame({
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
    return { ...s, options: generateOptions(s.correct) }
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
        question: {
          expression: scenario.exprTex,
        },
        computed: {
          rule:
            "La forma punto–pendiente es: y - y₀ = m(x - x₀).",
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

  const questionTex = `\\text{La ecuación } ${scenario.exprTex} \\text{ está expresada en forma:}`

  return (
    <MathProvider>
      <ExerciseShell
        title="Formas de la ecuación de la recta"
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
                  title: "Reconocer la estructura",
                  detail: (
                    <span>
                      La ecuación tiene la forma
                      <b> y − y₀ = m(x − x₀)</b>.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex
                        block
                        tex={`y - y_0 = m(x - x_0)`}
                      />
                      <MathTex block tex={scenario.exprTex} />
                    </div>
                  ),
                },
                {
                  title: "Identificar sus elementos",
                  detail: (
                    <span>
                      m es la pendiente, y (x₀, y₀) es un punto de la recta.
                    </span>
                  ),
                  icon: Divide,
                },
                {
                  title: "Conclusión",
                  detail: (
                    <span>
                      Por lo tanto, está en forma
                      <b> punto–pendiente</b>.
                    </span>
                  ),
                  icon: ShieldCheck,
                },
              ]}
              concluding={
                <span>
                  Respuesta final:{" "}
                  <b>{scenario.correct}</b>.
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
            <MathTex block tex={questionTex} />
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={op => (
            <MathTex tex={`\\text{${op.value}}`} />
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