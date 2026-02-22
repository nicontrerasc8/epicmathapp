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
function fmtPercent(n: number) {
  return `${n}\\%`
}

/* =========================
   GENERADOR (Error porcentual)
========================= */

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  // Generamos exactos tipo 0.25, 0.40, 0.60, etc.
  const exact = randInt(10, 90) / 100
  const delta = choiceDelta(exact)

  const approx = Number((exact - delta).toFixed(2))

  const errorAbs = Math.abs(exact - approx)
  const errorPercent = Math.round((errorAbs / exact) * 100)

  const questionTex = `
\\text{Un valor exacto es } ${exact.toFixed(2)} 
\\text{ y se aproxima como } ${approx.toFixed(2)}.\\\\
\\text{¿Cuál es el error porcentual?}
`

  const correct = fmtPercent(errorPercent)

  return {
    exact,
    approx,
    errorAbs,
    errorPercent,
    questionTex,
    correct,
  }
}

function choiceDelta(exact: number) {
  // Genera diferencia pequeña coherente
  const options = [0.01, 0.02, 0.03, 0.04]
  return options[Math.floor(Math.random() * options.length)]
}

/* =========================
   OPCIONES
========================= */

function generateOptions(s: Scenario): Option[] {
  const correct = s.correct

  const wrong1 = fmtPercent(s.errorPercent + 2)
  const wrong2 = fmtPercent(s.errorPercent - 2)
  const wrong3 = fmtPercent(Math.round((s.errorAbs / s.approx) * 100)) // error relativo mal calculado
  const wrong4 = fmtPercent(Math.round(s.errorAbs * 100)) // olvidar dividir por exacto

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
        exact: scenario.exact,
        approx: scenario.approx,
        computed: {
          errorAbs: scenario.errorAbs,
          errorPercent: scenario.errorPercent,
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

  return (
    <MathProvider>
      <ExerciseShell
        title="Error porcentual"
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
                  title: "Calcular el error absoluto",
                  detail: (
                    <span>
                      Restamos valor aproximado y exacto, y tomamos valor absoluto.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <MathTex
                      block
                      tex={`|${scenario.exact.toFixed(
                        2
                      )}-${scenario.approx.toFixed(
                        2
                      )}|=${scenario.errorAbs.toFixed(2)}`}
                    />
                  ),
                },
                {
                  title: "Dividir entre el valor exacto",
                  detail: (
                    <span>
                      Convertimos el error absoluto en error relativo respecto al valor exacto.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <MathTex
                      block
                      tex={`\\frac{${scenario.errorAbs.toFixed(
                        2
                      )}}{${scenario.exact.toFixed(
                        2
                      )}}`}
                    />
                  ),
                },
                {
                  title: "Multiplicar por 100%",
                  detail: (
                    <span>
                      Expresamos el resultado final como porcentaje.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: (
                    <MathTex
                      block
                      tex={`${scenario.correct}`}
                    />
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta final: <MathTex tex={scenario.correct} />.
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
