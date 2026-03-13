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

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function choice<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function formatDecimalComma(n: number, decimals = 2) {
  return n.toFixed(decimals).replace(".", ",")
}

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  const contexts = [
    {
      noun: "La velocidad de un automóvil se calcula como",
      unit: "km/h",
      question: "Si el tablero muestra la velocidad como número entero, ¿qué valor aparecerá?",
      min: 40,
      max: 140,
    },
    {
      noun: "La temperatura registrada en una cámara es",
      unit: "°C",
      question: "Si el visor solo muestra enteros, ¿qué valor aparecerá?",
      min: 10,
      max: 45,
    },
    {
      noun: "La masa de una maleta es",
      unit: "kg",
      question: "Si la balanza redondea a número entero, ¿qué valor mostrará?",
      min: 8,
      max: 38,
    },
    {
      noun: "La distancia recorrida por un ciclista es",
      unit: "km",
      question: "Si se redondea al entero más cercano, ¿qué valor queda?",
      min: 3,
      max: 120,
    },
  ] as const

  const context = choice(contexts)
  const base = randInt(context.min, context.max)
  const dec = randInt(1, 99) / 100
  const v = Number((base + dec).toFixed(2))
  const unidad = Math.floor(v)
  const decimalPart = Number((v - unidad).toFixed(2))
  const rounded = Math.round(v)

  return {
    context,
    v,
    unidad,
    decimalPart,
    rounded,
  }
}

function generateOptions(s: Scenario): Option[] {
  const candidates = [
    s.rounded,
    s.unidad,
    s.rounded + 1,
    s.rounded - 1,
    s.rounded + 2,
    s.rounded - 2,
    s.decimalPart >= 0.5 ? s.unidad : s.unidad + 1,
  ].map(value => clamp(value, 0, 250))

  const seen = new Set<number>()
  const options: number[] = []

  for (const value of shuffle(candidates)) {
    if (seen.has(value)) continue
    seen.add(value)
    options.push(value)
    if (options.length === 5) break
  }

  while (options.length < 5) {
    const extra = clamp(s.rounded + randInt(-4, 4), 0, 250)
    if (!seen.has(extra)) {
      seen.add(extra)
      options.push(extra)
    }
  }

  return shuffle(
    options.map(value => ({
      value: `${value} \\text{ ${s.context.unit}}`,
      correct: value === s.rounded,
    }))
  )
}

export default function RedondeoVelocidadGame({
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
        correctAnswer: `${scenario.rounded} ${scenario.context.unit}`,
        question: {
          value: scenario.v,
          unit: scenario.context.unit,
          context: scenario.context.noun,
        },
        computed: {
          units: scenario.unidad,
          decimalPart: scenario.decimalPart,
          rule: "Si la parte decimal es >= 0.5 se redondea hacia arriba; si es < 0.5, hacia abajo.",
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

  const valueStr = formatDecimalComma(scenario.v, 2)
  const questionTex = `\\text{${scenario.context.noun} } ${valueStr}\\,\\text{${scenario.context.unit}.}`
  const questionTex2 = `\\text{${scenario.context.question}}`
  const decisionTex =
    scenario.decimalPart >= 0.5
      ? `\\text{Como } ${scenario.decimalPart}\\ge 0.5, \\text{ se redondea hacia arriba.}`
      : `\\text{Como } ${scenario.decimalPart}< 0.5, \\text{ se redondea hacia abajo.}`

  return (
    <MathProvider>
      <ExerciseShell
        title="Redondeo a número entero"
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
                  title: "Identificar la parte entera y la parte decimal",
                  detail: <span>Para redondear, miramos la parte decimal.</span>,
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={questionTex} />
                      <MathTex block tex={`\\text{Parte entera} = ${scenario.unidad}`} />
                      <MathTex block tex={`\\text{Parte decimal} = ${scenario.decimalPart}`} />
                    </div>
                  ),
                },
                {
                  title: "Aplicar la regla de redondeo",
                  detail: <span>Si la parte decimal es mayor o igual a 0.5, se sube; si no, se baja.</span>,
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={decisionTex} />
                    </div>
                  ),
                },
                {
                  title: "Escribir el entero final",
                  detail: <span>Ese es el valor entero que se mostrará.</span>,
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\text{Resultado: } ${scenario.rounded}\\,\\text{${scenario.context.unit}}`} />
                    </div>
                  ),
                },
              ]}
              concluding={<span>Respuesta final: <b>{scenario.rounded} {scenario.context.unit}</b>.</span>}
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <MathTex block tex={questionTex} />
            <MathTex block tex={questionTex2} />
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
