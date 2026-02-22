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

function generateScenario() {
  for (let i = 0; i < 200; i++) {
    const real = randInt(50, 200)
    const variation = randInt(2, 15)
    const reported = real + variation

    const error = (Math.abs(reported - real) / real) * 100
    const errorRounded = Math.round(error)

    if (errorRounded >= 1 && errorRounded <= 20) {
      return {
        real,
        reported,
        difference: reported - real,
        errorRounded,
      }
    }
  }

  // fallback exacto como imagen
  return {
    real: 80,
    reported: 84,
    difference: 4,
    errorRounded: 5,
  }
}

function generateOptions(correct: number): Option[] {
  const wrongDenominator = correct + 1
  const wrongNoAbs = correct - 1 > 0 ? correct - 1 : correct + 2
  const wrongDouble = correct * 2
  const wrongHalf = Math.max(1, Math.round(correct / 2))

  const options = [
    { value: `${correct}\\%`, correct: true },
    { value: `${wrongDenominator}\\%`, correct: false },
    { value: `${wrongNoAbs}\\%`, correct: false },
    { value: `${wrongDouble}\\%`, correct: false },
    { value: `${wrongHalf}\\%`, correct: false },
  ]

  return options.sort(() => Math.random() - 0.5)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function ErrorPorcentualGame({
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
      options: generateOptions(s.errorRounded),
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
        correctAnswer: `${scenario.errorRounded}%`,
        question: {
          real: scenario.real,
          reported: scenario.reported,
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

  const formulaTex = `
\\text{Error \\%} =
\\frac{|\\text{medido} - \\text{real}|}{\\text{real}} \\times 100
`

  const substitutionTex = `
\\frac{|${scenario.reported} - ${scenario.real}|}{${scenario.real}} \\times 100
`

  const calculationTex = `
\\frac{${scenario.difference}}{${scenario.real}} \\times 100
`

  const resultTex = `${scenario.errorRounded}\\%`

  return (
    <MathProvider>
      <ExerciseShell
        title="Error porcentual"
        prompt="¿Cuál es el error porcentual?"
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
                  title: "Usar la fórmula de error porcentual",
                  detail: (
                    <span>
                      Aplicamos la fórmula con valor medido y valor real.
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={formulaTex} />,
                },
                {
                  title: "Sustituir valores",
                  detail: (
                    <span>
                      Reemplazamos los datos del problema y simplificamos la fracción.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={substitutionTex} />
                      <MathTex block tex={calculationTex} />
                    </div>
                  ),
                },
                {
                  title: "Resultado final",
                  detail: (
                    <span>
                      Expresamos el resultado como porcentaje.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: <MathTex block tex={resultTex} />,
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta: <MathTex tex={`${scenario.errorRounded}\\%`} />
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
              El valor exacto de una masa es{" "}
              <b>{scenario.real} g</b> y se reporta como{" "}
              <b>{scenario.reported} g</b>.
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
