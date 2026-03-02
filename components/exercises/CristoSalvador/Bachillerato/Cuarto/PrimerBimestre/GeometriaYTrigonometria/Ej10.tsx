"use client"

import { useMemo, useState } from "react"
import { ShieldCheck, Sigma, Divide } from "lucide-react"

import { useExerciseEngine } from "@/lib/exercises/useExerciseEngine"
import { useExerciseSubmission } from "@/lib/exercises/useExerciseSubmission"
import { useExerciseTimer } from "@/lib/exercises/useExerciseTimer"
import { computeTrophyGain, WRONG_PENALTY } from "@/lib/exercises/gamification"

import { type Option, OptionsGrid } from "@/components/exercises/base/OptionsGrid"
import { MathProvider } from "@/components/exercises/base/MathBlock"
import { ExerciseHud } from "@/components/exercises/base/ExerciseHud"
import { SolutionBox } from "@/components/exercises/base/SolutionBox"
import { ExerciseShell } from "@/components/exercises/base/ExerciseShell"
import { DetailedExplanation } from "@/components/exercises/base/DetailedExplanation"

/* ============================================================
   HELPERS
============================================================ */

type ChoiceKey = "A" | "B" | "C" | "D" | "E"
type Scenario = ReturnType<typeof generateScenario>

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}
function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/* ============================================================
   BANCO DE VARIACIONES
   Correcta SIEMPRE: "Fórmula de distancia + pendiente perpendicular"
============================================================ */

type BankItem = {
  prompt: string
  correct: string
  wrong: string[]
  // opcional: mini-explicación contextual distinta por variante
  explainHint?: string
}

const BANK: BankItem[] = [
  {
    // Como tu imagen
    prompt: "La ecuación general de una mediatriz se obtiene combinando:",
    correct: "Fórmula de distancia y pendiente perpendicular",
    wrong: ["Área y volumen", "Derivadas", "Probabilidad", "Estadística descriptiva"],
    explainHint:
      "La mediatriz se define por puntos equidistantes a A y B (distancia) y es perpendicular al segmento AB (pendiente perpendicular).",
  },
  {
    prompt: "Para construir la ecuación de la mediatriz de un segmento AB se usa:",
    correct: "Distancia entre puntos + condición de perpendicularidad",
    wrong: [
      "Teorema de Pitágoras + área de triángulos",
      "Reglas de derivación",
      "Media y desviación estándar",
      "Conteo de casos favorables",
    ],
    explainHint:
      "Se usan dos ideas: equidistancia (distancias iguales) y perpendicularidad al segmento.",
  },
  {
    prompt: "En términos de herramientas matemáticas, una mediatriz se modela con:",
    correct: "Igualdad de distancias y recta perpendicular",
    wrong: [
      "Volumen de sólidos",
      "Integrales definidas",
      "Distribuciones de probabilidad",
      "Tablas de frecuencias",
    ],
    explainHint:
      "La mediatriz: puntos con la misma distancia a dos puntos, y recta perpendicular al segmento que los une.",
  },
  {
    prompt: "¿Qué dos conceptos permiten deducir la ecuación de la mediatriz?",
    correct: "Equidistancia (distancia) y perpendicularidad (pendiente)",
    wrong: [
      "Área y perímetro",
      "Derivadas e integrales",
      "Probabilidad y combinatoria",
      "Promedio y moda",
    ],
    explainHint:
      "Equidistancia → distancia a A = distancia a B. Perpendicularidad → pendiente recíproca negativa.",
  },
]

/* ============================================================
   GENERACIÓN DE ESCENARIO
============================================================ */

function generateScenario() {
  const item = pickOne(BANK)

  // Armamos opciones y mezclamos (siempre 5: 1 correcta + 4 incorrectas)
  const mixed = shuffle([
    { text: item.correct, correct: true },
    ...shuffle(item.wrong).slice(0, 4).map((t) => ({ text: t, correct: false })),
  ])

  const labels: ChoiceKey[] = ["A", "B", "C", "D", "E"]
  const options = mixed.map((o, idx) => ({
    value: o.text,
    correct: o.correct,
    label: labels[idx],
  }))

  const correctOpt = options.find((o) => o.correct)!

  return {
    prompt: item.prompt,
    options,
    correctText: correctOpt.value,
    correctLabel: correctOpt.label,
    explainHint: item.explainHint ?? "",
  }
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function EcuacionMediatrizConceptoGame({
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

  const scenario: Scenario = useMemo(() => generateScenario(), [nonce])

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
        correctAnswer: scenario.correctText,
        question: {
          prompt: scenario.prompt,
          options: scenario.options.map((o) => ({
            label: (o as any).label,
            text: o.value,
          })),
          correctLabel: scenario.correctLabel,
        },
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce((n) => n + 1)
  }

  // Render tipo "A) ...."
  function renderOption(op: any) {
    const label = op.label ? `${op.label}) ` : ""
    return <span className="text-sm">{label}{op.value}</span>
  }

  return (
    <MathProvider>
      <ExerciseShell
        title="Ecuación de la mediatriz"
        prompt={scenario.prompt}
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Explicación"
              steps={[
                {
                  title: "Idea 1: equidistancia",
                  detail: (
                    <span>
                      La mediatriz es el conjunto de puntos que están a la{" "}
                      <b>misma distancia</b> de <b>A</b> y <b>B</b>.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="text-sm text-muted-foreground">
                      Se plantea como: distancia(P, A) = distancia(P, B).
                    </div>
                  ),
                },
                {
                  title: "Idea 2: perpendicularidad",
                  detail: (
                    <span>
                      Además, la mediatriz es <b>perpendicular</b> al segmento AB.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="text-sm text-muted-foreground">
                      Eso se traduce en pendiente perpendicular (recíproca negativa).
                    </div>
                  ),
                },
                {
                  title: "Conclusión",
                  detail: (
                    <span>
                      Por eso, la ecuación se obtiene combinando{" "}
                      <b>distancia</b> y <b>pendiente perpendicular</b>.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: (
                    <div className="rounded-lg border bg-background p-3 text-sm">
                      {scenario.explainHint || (
                        <span>
                          Respuesta correcta: <b>{scenario.correctText}</b>
                        </span>
                      )}
                    </div>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta: <b>{scenario.correctLabel}</b>
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>

          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div className="text-sm">{scenario.prompt}</div>
          </div>
        </div>

        <OptionsGrid
          options={scenario.options as any}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={(op: any) => renderOption(op)}
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