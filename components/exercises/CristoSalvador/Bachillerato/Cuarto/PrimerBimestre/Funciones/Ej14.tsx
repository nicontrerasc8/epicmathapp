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

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function buildQuestionTex(a0: number, ma: number, b0: number, mb: number) {
  return [
    "\\text{Dos planes de internet tienen costos mensuales:}",
    `\\text{Plan A: } C_A = ${a0} + ${ma}x`,
    `\\text{Plan B: } C_B = ${b0} + ${mb}x`,
    "\\text{¿Para qué cantidad de consumo }x\\text{ ambos planes cuestan lo mismo?}",
  ].join("\\\\")
}

function buildUniqueOptions(correct: number, distractors: number[]): Option[] {
  const uniqueDistractors = Array.from(
    new Set(
      distractors.filter(value => Number.isFinite(value) && value > 0 && value !== correct)
    )
  )

  while (uniqueDistractors.length < 4) {
    const candidate = randInt(Math.max(1, correct - 8), correct + 12)
    if (candidate !== correct && !uniqueDistractors.includes(candidate)) {
      uniqueDistractors.push(candidate)
    }
  }

  return shuffle([
    { value: `${correct}`, correct: true },
    ...uniqueDistractors.slice(0, 4).map(value => ({ value: `${value}`, correct: false })),
  ])
}

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  for (let i = 0; i < 300; i++) {
    const a0 = randInt(30, 120)
    const b0 = randInt(20, 100)
    const ma = randInt(2, 10)
    const mb = randInt(2, 10)
    if (ma === mb) continue

    const diff0 = b0 - a0
    const diffM = ma - mb
    if (diffM === 0 || diff0 % diffM !== 0) continue

    const x = diff0 / diffM
    if (x <= 0 || x > 60) continue

    const questionTex = buildQuestionTex(a0, ma, b0, mb)
    const correct = `${x}`
    const options = buildUniqueOptions(x, [
      x + 1,
      x + 2,
      x + 3,
      x - 1,
      x - 2,
      Math.abs(diff0),
      Math.abs(diffM),
      a0,
      b0,
      ma + mb,
    ])

    return { a0, b0, ma, mb, x, questionTex, correct, options }
  }

  return {
    a0: 80,
    b0: 40,
    ma: 5,
    mb: 8,
    x: 20,
    questionTex: buildQuestionTex(80, 5, 40, 8),
    correct: "20",
    options: buildUniqueOptions(20, [10, 12, 15, 25, 18, 22]),
  }
}

export default function IgualarPlanesInternetGame({
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

    const timeSeconds =
      (Date.now() - startedAtRef.current) / 1000

    setSelected(op.value)
    engine.submit(op.correct)

    await submitAttempt({
      correct: op.correct,
      answer: {
        selected: op.value,
        correctAnswer: scenario.correct,
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

  const step1 = `${scenario.a0} + ${scenario.ma}x = ${scenario.b0} + ${scenario.mb}x`
  const step2 = `${scenario.a0} - ${scenario.b0} = ${scenario.mb}x - ${scenario.ma}x`
  const step3 = `${scenario.a0 - scenario.b0} = ${scenario.mb - scenario.ma}x \\Rightarrow x = ${scenario.x}`

  return (
    <MathProvider>
      <ExerciseShell
        title="Igualación de funciones lineales"
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
                  title: "Igualar los costos",
                  detail: <span>Planteamos la igualdad entre ambos modelos de costo.</span>,
                  icon: Sigma,
                  content: <MathTex block tex={step1} />,
                },
                {
                  title: "Pasar términos semejantes",
                  detail: <span>Reagrupamos constantes y términos con x en lados opuestos.</span>,
                  icon: Divide,
                  content: <MathTex block tex={step2} />,
                },
                {
                  title: "Resolver",
                  detail: <span>Dividimos entre el coeficiente de x para hallar el consumo.</span>,
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
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3 space-y-1 overflow-x-auto">
            <MathTex block tex={`\\text{Dos planes de internet tienen costos mensuales:}`} />
            <MathTex block tex={`\\text{Plan A: } C_A = ${scenario.a0} + ${scenario.ma}x`} />
            <MathTex block tex={`\\text{Plan B: } C_B = ${scenario.b0} + ${scenario.mb}x`} />
            <MathTex block tex={`\\text{¿Para qué cantidad de consumo }x\\text{ ambos planes cuestan lo mismo?}`} />
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={op => <span>{op.value}</span>}
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
