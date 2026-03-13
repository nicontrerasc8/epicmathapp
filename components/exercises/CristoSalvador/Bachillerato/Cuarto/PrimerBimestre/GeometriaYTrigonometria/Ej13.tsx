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

function choice<T>(arr: T[]) {
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
  question: string
  correct: string
  options: Option[]
  explain: {
    title: string
    step1: string
    step2: string
    step3: string
    conclusion: string
  }
}

function generateScenario(): Scenario {
  const variants: Scenario[] = [
    {
      question: "En la particion de Voronoi, un vertice corresponde al punto donde:",
      correct: "Se intersectan tres o mas mediatrices",
      options: buildUniqueOptions("Se intersectan tres o mas mediatrices", [
        "Se intersectan dos mediatrices",
        "Hay un solo sitio",
        "Se forma un triangulo",
        "Hay distancia minima",
        "Se cruzan dos aristas",
      ]),
      explain: {
        title: "Interseccion de fronteras",
        step1:
          "Las fronteras de Voronoi se forman con mediatrices entre pares de sitios.",
        step2:
          "Un vertice aparece cuando varias de esas fronteras coinciden en un mismo punto.",
        step3:
          "En ese caso, concurren tres o mas mediatrices.",
        conclusion:
          "Por eso, un vertice de Voronoi es una interseccion de tres o mas mediatrices.",
      },
    },
    {
      question: "Que propiedad de distancia caracteriza a un vertice de Voronoi?",
      correct: "Es equidistante de al menos tres sitios",
      options: buildUniqueOptions("Es equidistante de al menos tres sitios", [
        "Es mas cercano a un solo sitio",
        "Tiene distancia cero a todos los sitios",
        "Minimiza la suma de distancias",
        "Es equidistante de exactamente dos sitios",
        "Coincide con el sitio central",
      ]),
      explain: {
        title: "Propiedad de distancias",
        step1:
          "Cada arista de Voronoi contiene puntos equidistantes a dos sitios.",
        step2:
          "Cuando varias aristas se encuentran, el punto comun mantiene igualdad de distancia con mas sitios.",
        step3:
          "En un vertice, la igualdad se da respecto de al menos tres sitios.",
        conclusion:
          "La propiedad clave es ser equidistante de al menos tres sitios.",
      },
    },
    {
      question: "En un diagrama de Voronoi, un vertice suele aparecer como:",
      correct: "El encuentro de tres fronteras de regiones",
      options: buildUniqueOptions("El encuentro de tres fronteras de regiones", [
        "El centro de una sola region",
        "La union de dos sitios",
        "El borde exterior obligatorio del diagrama",
        "La diagonal del triangulo de sitios",
        "El promedio de coordenadas",
      ]),
      explain: {
        title: "Estructura local",
        step1:
          "Las regiones de Voronoi quedan separadas por fronteras entre sitios vecinos.",
        step2:
          "Un vertice marca el punto donde varias regiones se tocan.",
        step3:
          "Geometricamente, eso se ve como el encuentro de tres fronteras.",
        conclusion:
          "Por eso la descripcion correcta es el encuentro de tres fronteras de regiones.",
      },
    },
    {
      question: "Cual afirmacion describe correctamente un vertice de Voronoi?",
      correct: "Es un punto comun a tres regiones vecinas",
      options: buildUniqueOptions("Es un punto comun a tres regiones vecinas", [
        "Pertenece siempre al interior de una sola region",
        "Es un sitio generador del diagrama",
        "Solo aparece si hay cuatro sitios",
        "Es una arista horizontal",
        "Siempre esta en el centro del plano",
      ]),
      explain: {
        title: "Relacion entre regiones",
        step1:
          "Cada region contiene los puntos mas cercanos a un sitio generador.",
        step2:
          "Cuando varias regiones comparten un mismo punto, se forma un vertice.",
        step3:
          "Tipicamente ese punto es comun a tres regiones vecinas.",
        conclusion:
          "Entonces, un vertice de Voronoi es un punto comun a tres regiones vecinas.",
      },
    },
  ]

  return choice(variants)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function VoronoiVertexConceptGame({
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
          context: "voronoi_vertex_definition",
          prompt: scenario.question,
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

  const propTex = `\\text{Vertice Voronoi: punto equidistante a 3 o mas sitios}`
  const eqTex = `PA = PB = PC \\; (\\text{y quiza mas})`

  return (
    <MathProvider>
      <ExerciseShell
        title="Vertice de Voronoi"
        prompt={scenario.question}
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
                  title: scenario.explain.title,
                  detail: (
                    <span>
                      Las fronteras de Voronoi aparecen a partir de relaciones de equidistancia entre sitios.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <span className="text-sm block">{scenario.explain.step1}</span>
                      <MathTex block tex={propTex} />
                    </div>
                  ),
                },
                {
                  title: "Como se forma",
                  detail: (
                    <span>
                      Un vertice surge cuando varias fronteras coinciden en un mismo punto.
                    </span>
                  ),
                  icon: Divide,
                  content: <span className="text-sm">{scenario.explain.step2}</span>,
                },
                {
                  title: "Propiedad geometrica",
                  detail: (
                    <span>
                      En ese punto, tres o mas sitios quedan a la misma distancia.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <span className="text-sm block">{scenario.explain.step3}</span>
                      <MathTex block tex={eqTex} />
                    </div>
                  ),
                },
              ]}
              concluding={
                <span>
                  {scenario.explain.conclusion} Respuesta correcta: <b>{scenario.correct}</b>
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3 text-sm">
            {scenario.question}
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={(op) => (
            <span className="block whitespace-normal break-words text-sm leading-relaxed">
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
