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

function choice<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)]
}

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function buildUniqueOptions(correct: string, candidates: string[]): Option[] {
  const uniqueDistractors = Array.from(
    new Set(candidates.filter(candidate => candidate !== correct))
  )

  return shuffle([
    { value: correct, correct: true },
    ...uniqueDistractors.slice(0, 4).map(value => ({ value, correct: false })),
  ])
}

type Scenario = {
  prompt: string
  correct: string
  options: Option[]
  explanation: string
  exampleSet: string
  concept: string
}

function generateScenario(): Scenario {
  const exampleSet = choice([
    "S = {A, B, C}",
    "S = {P1, P2, P3}",
    "S = {S1, S2, S3, S4}",
  ])

  const variants: Scenario[] = [
    {
      prompt: 'En geometria computacional, en una particion de Voronoi, un "sitio" es:',
      correct: "Un punto generador",
      options: buildUniqueOptions("Un punto generador", [
        "Un segmento",
        "Un poligono",
        "Una bisectriz",
        "Una region frontera",
        "Una arista cerrada",
      ]),
      explanation:
        "En Voronoi, los sitios son los puntos de partida que generan las regiones del diagrama.",
      exampleSet,
      concept: "sitio",
    },
    {
      prompt: "En un diagrama de Voronoi, que objeto genera cada celda?",
      correct: "Un sitio o punto generador",
      options: buildUniqueOptions("Un sitio o punto generador", [
        "Una arista del borde",
        "Una mediatriz infinita",
        "Un poligono aleatorio",
        "Un vertice de interseccion",
        "Una circunferencia exterior",
      ]),
      explanation:
        "Cada celda se asocia a un sitio: contiene los puntos del plano mas cercanos a ese generador.",
      exampleSet,
      concept: "generacion_de_celdas",
    },
    {
      prompt: "Una celda de Voronoi representa principalmente:",
      correct: "La region de puntos mas cercanos a un sitio",
      options: buildUniqueOptions("La region de puntos mas cercanos a un sitio", [
        "La region de puntos mas lejanos al sitio",
        "El conjunto de todos los vertices",
        "La interseccion de todas las mediatrices",
        "Una zona equidistante a todos los sitios",
        "El promedio de las coordenadas",
      ]),
      explanation:
        "La definicion de celda se basa en proximidad: agrupa los puntos cuyo sitio mas cercano es el mismo.",
      exampleSet,
      concept: "celda",
    },
    {
      prompt: 'Cuando se habla de "punto generador" en Voronoi, se refiere a:',
      correct: "Un sitio que sirve como referencia de distancia",
      options: buildUniqueOptions("Un sitio que sirve como referencia de distancia", [
        "Una frontera entre dos celdas",
        "Un punto equidistante a tres sitios",
        "La diagonal principal del diagrama",
        "El centro geometrico del plano",
        "Una recta tangente",
      ]),
      explanation:
        "El generador es el sitio desde el cual se comparan distancias para decidir a que celda pertenece cada punto.",
      exampleSet,
      concept: "punto_generador",
    },
  ]

  return choice(variants)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function VoronoiSitioConceptGame({
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

    const timeSeconds = (Date.now() - startedAtRef.current) / 1000
    setSelected(op.value)
    engine.submit(op.correct)

    await submitAttempt({
      correct: op.correct,
      answer: {
        selected: op.value,
        correctAnswer: scenario.correct,
        question: {
          concept: scenario.concept,
          prompt: scenario.prompt,
          exampleSet: scenario.exampleSet,
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

  const keyIdeaTex = `\\text{Sitio} = \\text{punto generador}`
  const exampleTex = `S = \\{\\text{puntos generadores}\\}`

  return (
    <MathProvider>
      <ExerciseShell
        title='Conceptos de Voronoi: "sitio"'
        prompt="Selecciona la definicion correcta"
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Explicacion"
              steps={[
                {
                  title: "Idea clave",
                  detail: (
                    <span>
                      En Voronoi, los sitios y las celdas se entienden a partir de comparaciones de distancia.
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={keyIdeaTex} />,
                },
                {
                  title: "Relacion correcta",
                  detail: <span>{scenario.explanation}</span>,
                  icon: Divide,
                  content: <MathTex block tex={exampleTex} />,
                },
                {
                  title: "Conclusion",
                  detail: (
                    <span>
                      La respuesta correcta para esta pregunta es <b>{scenario.correct}</b>.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: (
                    <div className="text-sm text-muted-foreground">
                      Ejemplo de conjunto de sitios: <b>{scenario.exampleSet}</b>
                    </div>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta: <b>{scenario.correct}</b>
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
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={(op) => (
            <span className="block whitespace-normal break-words text-base leading-relaxed">
              {op.value}
            </span>
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
