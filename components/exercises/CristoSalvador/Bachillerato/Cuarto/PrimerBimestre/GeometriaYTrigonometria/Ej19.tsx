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

function uniquePick<T>(arr: readonly T[], count: number): T[] {
  const unique = Array.from(new Set(arr))
  return shuffle(unique).slice(0, count)
}

type Concept = "local_update" | "equidistance" | "neighbors" | "stability"

const DIAGRAM_NAMES = [
  "diagrama de Voronoi",
  "teselacion de Voronoi",
  "particion de Voronoi",
  "mapa de proximidad tipo Voronoi",
  "descomposicion de Voronoi",
] as const

const CONTEXTS = [
  { label: "residuos toxicos", site: "foco contaminante" },
  { label: "servicios publicos", site: "centro de atencion" },
  { label: "planificacion urbana", site: "hospital" },
  { label: "zonas de emergencia", site: "estacion de bomberos" },
  { label: "red de reparto", site: "punto logistico" },
] as const

const QUESTION_BANK: Record<Concept, string[]> = {
  local_update: [
    `Al añadir un nuevo sitio a un {diagram} en "{label}":`,
    `Si se inserta un nuevo punto generador en un {diagram}, entonces:`,
    `Cuando agregamos un sitio adicional en un {diagram} aplicado a "{label}":`,
  ],
  equidistance: [
    `En un {diagram} para "{label}", un vertice Voronoi representa:`,
    `Si tres sitios de "{label}" forman un triangulo, un vertice Voronoi indica:`,
    `En el modelo "{label}", el punto donde se cruzan tres fronteras Voronoi es:`,
  ],
  neighbors: [
    `En "{label}", dos celdas Voronoi comparten borde cuando:`,
    `Dentro de un {diagram}, la adyacencia entre celdas significa que:`,
    `En un {diagram} aplicado a "{label}", dos regiones vecinas implican:`,
  ],
  stability: [
    `Respecto a la estabilidad de un {diagram} ante insertar un sitio en "{label}":`,
    `Sobre la actualizacion de un {diagram} con un nuevo generador:`,
    `Si un {diagram} recibe un nuevo sitio, la afirmacion correcta es:`,
  ],
}

const CORRECT_BANK: Record<Concept, string[]> = {
  local_update: [
    "Se recalculan mediatrices y cambian principalmente celdas cercanas al nuevo sitio.",
    "La actualizacion es local: se ajustan fronteras en la vecindad del sitio insertado.",
    "Aparecen nuevos bordes cerca del nuevo sitio y se redistribuyen regiones adyacentes.",
  ],
  equidistance: [
    "Un punto equidistante a tres sitios (interseccion de mediatrices).",
    "El punto de equidistancia triple asociado al circuncentro del triangulo de sitios.",
    "Un vertice donde se igualan distancias a tres sitios vecinos.",
  ],
  neighbors: [
    "Los dos sitios de esas celdas son vecinos y tienen puntos equidistantes entre ellos.",
    "Existe una frontera de empate de distancia entre los dos sitios generadores.",
    "Los sitios correspondientes comparten una mediatriz activa en la particion.",
  ],
  stability: [
    "No siempre se reconstruye todo; el cambio principal afecta regiones proximas.",
    "La topologia puede cambiar localmente, pero no obliga a rehacer globalmente todo el plano.",
    "La insercion modifica adyacencias cercanas al nuevo sitio de forma local.",
  ],
}

const WRONG_POOL = [
  "No cambia nada del diagrama.",
  "Se eliminan todas las celdas existentes.",
  "Solo cambia el color de una region, no la geometria.",
  "Todas las celdas quedan con la misma area.",
  "Siempre hay que reconstruir globalmente el diagrama completo.",
  "Desaparecen todos los vertices Voronoi al insertar un sitio.",
  "La actualizacion depende de calcular derivadas parciales.",
  "Las fronteras Voronoi se vuelven paralelas entre si.",
  "Se reemplaza Voronoi por estadistica descriptiva.",
  "La insercion no puede afectar adyacencias entre celdas.",
  "La distancia deja de ser criterio de construccion.",
  "El resultado correcto siempre es el baricentro del triangulo.",
  "La solucion es calcular la mediana de coordenadas.",
  "Toda frontera pasa a ser horizontal.",
  "El numero de regiones siempre disminuye.",
] as const

type Scenario = {
  diagramName: string
  prompt: string
  correctText: string
  options: Option[]
  explain: {
    step1: string
    step2: string
    step3: string
  }
}

function generateScenario(): Scenario {
  const context = choice(CONTEXTS)
  const diagramName = choice(DIAGRAM_NAMES)
  const concept = choice(Object.keys(QUESTION_BANK) as Concept[])

  const prompt = choice(QUESTION_BANK[concept])
    .replace("{diagram}", diagramName)
    .replace("{label}", context.label)
    .replace("{site}", context.site)

  const correctText = choice(CORRECT_BANK[concept])
  const wrongs = uniquePick(
    WRONG_POOL.filter(value => value !== correctText),
    4
  )

  const options: Option[] = shuffle([
    { value: correctText, correct: true },
    ...wrongs.map(value => ({ value, correct: false })),
  ])

  const explain = {
    step1: "Un diagrama de Voronoi usa distancia minima para separar el plano en celdas de influencia.",
    step2: "Las fronteras son mediatrices entre sitios vecinos, y sus intersecciones forman vertices.",
    step3:
      concept === "equidistance"
        ? "Cuando confluyen tres fronteras, el vertice es equidistante a tres sitios."
        : "Al insertar un sitio o analizar vecindad, los cambios y relaciones se interpretan de forma local.",
  }

  return { diagramName, prompt, correctText, options, explain }
}

export default function VoronoiInsertGameStyled({
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
        correctAnswer: scenario.correctText,
        diagram: scenario.diagramName,
        prompt: scenario.prompt,
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
  const tex3 = `PA = PB = PC`

  return (
    <MathProvider>
      <ExerciseShell
        title="Actualizacion en un diagrama de Voronoi"
        prompt="Selecciona la opcion correcta"
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Resolucion conceptual"
              steps={[
                {
                  title: "Estructura base del diagrama",
                  detail: <span>{scenario.explain.step1}</span>,
                  icon: Sigma,
                  content: <MathTex block tex={tex1} />,
                },
                {
                  title: "Fronteras y vertices",
                  detail: <span>{scenario.explain.step2}</span>,
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={tex2} />
                      <MathTex block tex={tex3} />
                    </div>
                  ),
                },
                {
                  title: "Conclusión",
                  detail: <span>{scenario.explain.step3}</span>,
                  icon: ShieldCheck,
                  content: (
                    <div className="text-sm text-muted-foreground">
                      Opcion correcta: <b>{scenario.correctText}</b>
                    </div>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta: <b>{scenario.correctText}</b>
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3 text-sm">
            {scenario.prompt}
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
