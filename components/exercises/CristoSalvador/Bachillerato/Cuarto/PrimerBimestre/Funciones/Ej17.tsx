"use client"

import { useMemo, useState } from "react"
import { ShieldCheck, Sigma } from "lucide-react"

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
    const initial = randInt(2000, 8000)
    const decrease = randInt(50, 300)

    return {
      initial,
      decrease,
      slope: -decrease,
    }
  }

  // fallback exacto como imagen
  return {
    initial: 5000,
    decrease: 150,
    slope: -150,
  }
}

/* =========================
   OPCIONES
========================= */

function generateOptions(s: Scenario): Option[] {
  const correct = `C = ${s.slope}x + ${s.initial}`

  const wrongPositive = `C = ${s.decrease}x + ${s.initial}`
  const wrongSwap = `C = ${s.initial}x - ${s.decrease}`
  const wrongIntercept = `C = ${s.slope}x - ${s.initial}`
  const wrongMixed = `C = ${s.decrease}x - ${s.initial}`

  const options = [
    { value: correct, correct: true },
    { value: wrongPositive, correct: false },
    { value: wrongSwap, correct: false },
    { value: wrongIntercept, correct: false },
    { value: wrongMixed, correct: false },
  ]

  return options.sort(() => Math.random() - 0.5)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function ModeloLinealDisminucionGame({
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
        correctAnswer: `C = ${scenario.slope}x + ${scenario.initial}`,
        question: {
          initial: scenario.initial,
          decrease: scenario.decrease,
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

  const explanationTex = `
C(x) = mx + b
`

  const substitutionTex = `
m = -${scenario.decrease}, \\quad b = ${scenario.initial}
`

  return (
    <MathProvider>
      <ExerciseShell
        title="Modelo lineal"
        prompt="¿Cuál modelo representa la situación?"
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
                  title: "Identificar pendiente",
                  detail: <span>Si los clientes disminuyen cada mes, la pendiente debe ser negativa.</span>,
                  icon: Sigma,
                  content: (
                    <p>
                      Disminuye {scenario.decrease} clientes por mes → pendiente negativa.
                    </p>
                  ),
                },
                {
                  title: "Modelo general",
                  detail: <span>Usamos la forma lineal C(x)=mx+b con m y b según el enunciado.</span>,
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={explanationTex} />
                      <MathTex block tex={substitutionTex} />
                    </div>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta:{" "}
                  <b>C = {scenario.slope}x + {scenario.initial}</b>
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
              Una empresa disminuye {scenario.decrease} clientes por mes.
              Actualmente tiene {scenario.initial} clientes.
            </div>
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
