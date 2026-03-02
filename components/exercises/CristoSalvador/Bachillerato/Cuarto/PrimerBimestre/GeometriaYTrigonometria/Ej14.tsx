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
   BANCO DE VARIACIONES (concepto Voronoi)
   Correcta SIEMPRE: "Región más cercana a un sitio específico"
============================================================ */

type BankItem = {
  prompt: string
  correct: string
  wrong: string[]
  explainHint?: string
}

const BANK: BankItem[] = [
  {
    // Como la foto
    prompt: "Una celda de Voronoi representa:",
    correct: "Región más cercana a un sitio específico",
    wrong: [
      "Región más alejada",
      "Región equidistante a todos los sitios",
      "Área triangular fija",
      "Zona aleatoria",
    ],
    explainHint:
      "Cada celda agrupa todos los puntos del plano que están más cerca de un “sitio” (punto generador) que de cualquier otro.",
  },
  {
    prompt: "En un diagrama de Voronoi, cada región corresponde a:",
    correct: "Puntos cuya distancia mínima es a un sitio (punto) particular",
    wrong: [
      "Puntos cuya distancia máxima es a un sitio particular",
      "Puntos equidistantes a todos los sitios a la vez",
      "Un triángulo dibujado alrededor de cada sitio",
      "Un conjunto de puntos al azar",
    ],
    explainHint:
      "La regla es “más cerca de este sitio que de los demás”.",
  },
  {
    prompt: "¿Qué describe mejor una celda de Voronoi?",
    correct: "El área de influencia de un sitio: lo que le queda más cerca que a otros",
    wrong: [
      "El área que queda más lejos de un sitio",
      "La región equidistante a todos los sitios",
      "Una figura siempre triangular",
      "Una región sin criterio de distancia",
    ],
    explainHint:
      "Voronoi particiona el plano por cercanía (distancia).",
  },
  {
    prompt: "Si tienes varios puntos “sitio”, una celda de Voronoi es:",
    correct: "La región donde ese sitio es el más cercano",
    wrong: [
      "La región donde ese sitio es el más lejano",
      "La región donde todos los sitios están a la misma distancia",
      "Una región con área constante",
      "Una región que cambia aleatoriamente",
    ],
    explainHint:
      "Se usa para asignar cada lugar al punto (sitio) más cercano.",
  },
]

/* ============================================================
   GENERACIÓN DE ESCENARIO
============================================================ */

function generateScenario() {
  const item = pickOne(BANK)

  // 1 correcta + 4 incorrectas (siempre 5 opciones)
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

export default function VoronoiCellConceptGame({
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

  function renderOption(op: any) {
    const label = op.label ? `${op.label}) ` : ""
    return <span className="text-sm">{label}{op.value}</span>
  }

  return (
    <MathProvider>
      <ExerciseShell
        title="Celdas de Voronoi"
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
                  title: "Idea clave",
                  detail: (
                    <span>
                      Un diagrama de Voronoi divide el plano en regiones según{" "}
                      <b>cercanía</b>.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="text-sm text-muted-foreground">
                      Cada región corresponde a un “sitio” (punto generador).
                    </div>
                  ),
                },
                {
                  title: "¿Qué es una celda?",
                  detail: (
                    <span>
                      Una celda contiene todos los puntos que están{" "}
                      <b>más cerca</b> de su sitio que de cualquier otro.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="rounded-lg border bg-background p-3 text-sm">
                      {scenario.explainHint}
                    </div>
                  ),
                },
                {
                  title: "Respuesta",
                  detail: (
                    <span>
                      La opción correcta es la que dice “más cercana a un sitio”.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: (
                    <div className="text-sm">
                      Respuesta correcta: <b>{scenario.correctText}</b>
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