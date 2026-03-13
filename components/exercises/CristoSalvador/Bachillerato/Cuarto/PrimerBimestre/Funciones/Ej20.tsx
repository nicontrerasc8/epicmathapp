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

function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function formatSlope(value: number) {
  return Number(value.toFixed(1)).toString()
}

function buildUniqueOptions(options: Option[]): Option[] {
  const unique = new Map<string, Option>()
  for (const option of options) {
    if (!unique.has(option.value)) {
      unique.set(option.value, option)
    }
  }
  return shuffle(Array.from(unique.values()))
}

type Scenario = ReturnType<typeof buildScenario>

function buildScenario() {
  const pendiente = choice([-2, -1.5, -1.2, -0.8, -0.6, -0.4, 0, 0.5, 1, 1.4, 2.2])
  const absP = Math.abs(pendiente)
  const absTxt = formatSlope(absP)

  let correct = ""
  let explanation = ""

  if (pendiente > 0) {
    correct = `La variable dependiente aumenta ${absTxt} por unidad.`
    explanation =
      "Pendiente positiva indica que cuando la variable independiente aumenta en 1 unidad, la dependiente también aumenta."
  } else if (pendiente < 0) {
    correct = `La variable dependiente disminuye ${absTxt} por unidad.`
    explanation =
      "Pendiente negativa indica que cuando la variable independiente aumenta en 1 unidad, la dependiente disminuye."
  } else {
    correct = "La variable dependiente permanece constante."
    explanation =
      "Pendiente cero indica que no hay cambio en la variable dependiente aunque cambie la independiente."
  }

  const options = buildUniqueOptions([
    { value: correct, correct: true },
    {
      value:
        pendiente === 0
          ? `La variable dependiente aumenta ${absTxt || "1"} por unidad.`
          : `La variable dependiente disminuye ${absTxt} por unidad.`,
      correct: false,
    },
    {
      value:
        pendiente === 0
          ? `La variable dependiente disminuye ${absTxt || "1"} por unidad.`
          : `La variable dependiente aumenta ${absTxt} por unidad.`,
      correct: false,
    },
    { value: "No hay relación lineal entre variables.", correct: false },
    { value: "La relación es cuadrática.", correct: false },
    { value: "La variable dependiente permanece constante.", correct: pendiente === 0 ? true : false },
  ])

  return {
    pendiente,
    absTxt,
    options,
    correct,
    explanation,
  }
}

export default function InterpretacionPendienteGame({
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

  const scenario = useMemo(() => buildScenario(), [nonce])

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
          pendiente: scenario.pendiente,
        },
        computed: {
          interpretacion: scenario.explanation,
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

  const questionTex1 = `
\\text{Una recta tiene pendiente } ${formatSlope(scenario.pendiente)} \\text{ en un contexto económico.}
`

  const questionTex2 = `
\\text{Esto significa que:}
`

  const step1 = `
\\text{La pendiente indica el cambio en la variable dependiente por cada unidad que cambia la variable independiente.}
`

  const step2 = `
\\text{Interpretación: } ${scenario.correct}
`

  return (
    <MathProvider>
      <ExerciseShell
        title="Interpretación de la pendiente"
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
                  title: "Recordar qué representa la pendiente",
                  detail: (
                    <span>
                      La pendiente indica cuánto cambia la variable dependiente por cada unidad que cambia la independiente.
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={step1} />,
                },
                {
                  title: "Analizar el signo",
                  detail: (
                    <span>
                      El signo de la pendiente determina si la relación crece, decrece o se mantiene constante.
                    </span>
                  ),
                  icon: Divide,
                  content: <MathTex block tex={step2} />,
                },
                {
                  title: "Conclusión",
                  detail: (
                    <span>
                      {scenario.correct}
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: <MathTex block tex={`\\text{Interpretacion correcta: } ${scenario.correct}`} />,
                },
              ]}
              concluding={
                <span>
                  Respuesta final: <b>{scenario.correct}</b>
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
            <MathTex block tex={questionTex1} />
            <MathTex block tex={questionTex2} />
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
