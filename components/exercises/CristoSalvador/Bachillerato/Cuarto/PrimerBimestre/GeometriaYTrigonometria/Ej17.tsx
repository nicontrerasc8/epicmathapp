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
  return arr[randInt(0, arr.length - 1)]
}

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

type Context = { label: string; site: string }
type Concept = "region" | "border" | "vertex" | "triangulation" | "facility"

const CONTEXTS: Context[] = [
  { label: "residuos toxicos", site: "foco contaminante" },
  { label: "servicios publicos", site: "centro de atencion" },
  { label: "planificacion urbana", site: "hospital" },
  { label: "zonas de emergencia", site: "estacion de bomberos" },
  { label: "distribucion logistica", site: "centro de entrega" },
]

const PROMPTS: Record<Concept, string[]> = {
  region: [
    `En "{label}", si tres sitios forman un triangulo, el diagrama de Voronoi permite:`,
    `En un caso de "{label}" con tres {site}s no colineales, Voronoi se usa para:`,
    `Para modelar "{label}", el diagrama de Voronoi ayuda a:`,
  ],
  border: [
    `En "{label}", la frontera entre dos regiones Voronoi representa:`,
    `Si modelas "{label}", la arista entre dos celdas Voronoi es:`,
    `En el contexto de "{label}", un borde Voronoi se interpreta como:`,
  ],
  vertex: [
    `En "{label}", cuando tres sitios forman triangulo, un vertice Voronoi identifica:`,
    `Aplicado a "{label}", un vertice Voronoi corresponde a:`,
    `En un esquema Voronoi para "{label}", el vertice comun describe:`,
  ],
  triangulation: [
    `En "{label}", para pasar de Voronoi a Delaunay se conecta:`,
    `En un modelo de "{label}", la triangulacion de Delaunay se obtiene al:`,
    `Si partes de Voronoi en "{label}", Delaunay relaciona:`,
  ],
  facility: [
    `En "{label}", si quieres asignar cada punto al sitio mas cercano, Voronoi sirve para:`,
    `Para cobertura de "{label}", Voronoi permite decidir:`,
    `En un problema de "{label}", Voronoi apoya la decision de:`,
  ],
}

const CORRECTS: Record<Concept, string[]> = {
  region: [
    "Particionar el plano en celdas donde cada punto queda mas cerca de un sitio que de los demas.",
    "Definir zonas de influencia por distancia minima a cada sitio.",
    "Asignar cada punto al sitio mas cercano y separar el plano por proximidad.",
  ],
  border: [
    "La mediatriz del segmento que une dos sitios, donde ambas distancias son iguales.",
    "El conjunto de puntos equidistantes a dos sitios vecinos.",
    "Una frontera de empate de distancia entre dos sitios.",
  ],
  vertex: [
    "Un punto equidistante a tres sitios, asociado al circuncentro del triangulo.",
    "La interseccion de mediatrices donde se igualan distancias a tres sitios.",
    "El punto Voronoi con equidistancia triple cuando hay tres sitios no colineales.",
  ],
  triangulation: [
    "Los sitios cuyas celdas Voronoi son adyacentes para formar aristas de Delaunay.",
    "Pares de sitios con frontera Voronoi comun para construir Delaunay.",
    "Sitios vecinos en Voronoi, obteniendo triangulos de Delaunay.",
  ],
  facility: [
    "Determinar para cada ubicacion cual sitio de servicio queda mas cercano.",
    "Asignar cobertura territorial segun distancia minima al sitio.",
    "Delimitar zonas de atencion por proximidad al sitio mas cercano.",
  ],
}

const WRONGS: string[] = [
  "Maximizar ganancias sin criterio geometrico.",
  "Calcular derivadas parciales del modelo.",
  "Resolver ecuaciones cuadraticas del contexto.",
  "Medir volumen de solidos geometricos.",
  "Obtener la suma de angulos interiores del triangulo.",
  "Ubicar siempre el baricentro como solucion de cercania.",
  "Forzar regiones de igual area para todos los sitios.",
  "Ordenar sitios por coordenada x sin distancias.",
  "Calcular solo perimetros de triangulos.",
  "Encontrar el punto mas lejano en todos los casos.",
  "Modelar crecimiento exponencial de poblacion.",
  "Determinar el incentro como regla universal.",
]

type Scenario = {
  question: string
  correct: string
  options: Option[]
  concept: Concept
}

function generateScenario(): Scenario {
  const ctx = choice(CONTEXTS)
  const concept = choice(Object.keys(PROMPTS) as Concept[])

  const question = choice(PROMPTS[concept])
    .replace("{label}", ctx.label)
    .replace("{site}", ctx.site)
  const correct = choice(CORRECTS[concept])

  const pool = shuffle(WRONGS.filter(w => w !== correct))
  const options: Option[] = shuffle([
    { value: correct, correct: true },
    ...pool.slice(0, 4).map(value => ({ value, correct: false })),
  ])

  return { question, correct, options, concept }
}

export default function VoronoiIntegradorGame({
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
          context: "voronoi_integrador",
          prompt: scenario.question,
          concept: scenario.concept,
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

  const tex1 = `\\text{Celda Voronoi: puntos mas cercanos a un sitio}`
  const tex2 = `\\text{Borde Voronoi: puntos equidistantes a dos sitios}`
  const tex3 = `\\text{Vertice Voronoi: interseccion de mediatrices}`

  return (
    <MathProvider>
      <ExerciseShell
        title="Aplicaciones y propiedades del diagrama de Voronoi"
        prompt={scenario.question}
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Explicacion integradora"
              steps={[
                {
                  title: "Division en celdas",
                  detail: (
                    <span>
                      Cada celda agrupa puntos cuyo sitio mas cercano es el mismo.
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={tex1} />,
                },
                {
                  title: "Fronteras por equidistancia",
                  detail: (
                    <span>
                      Las fronteras entre celdas se forman donde dos distancias se igualan.
                    </span>
                  ),
                  icon: Divide,
                  content: <MathTex block tex={tex2} />,
                },
                {
                  title: "Vertices y tres sitios",
                  detail: (
                    <span>
                      Un vertice Voronoi aparece cuando coinciden tres mediatrices.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: <MathTex block tex={tex3} />,
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
          renderValue={op => <span className="text-sm">{op.value}</span>}
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
