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

/* =========================
   GENERACIÓN DINÁMICA
========================= */

const diagramSynonyms = [
  "diagrama de Voronoi",
  "teselación de Voronoi",
  "partición de Voronoi",
  "mapa de proximidad tipo Voronoi",
  "descomposición de Voronoi",
]

const questionTemplates = [
  (d: string) => `Al añadir un nuevo sitio a un ${d}:`,
  (d: string) => `Si se inserta un nuevo punto generador en un ${d}, entonces:`,
  (d: string) => `Cuando agregamos un sitio adicional en un ${d}:`,
  (d: string) => `En un ${d}, al incorporar un nuevo sitio, se observa que:`,
  (d: string) => `Si un ${d} recibe un nuevo generador, lo correcto es que:`,
  (d: string) => `Respecto a la actualización de un ${d} con un nuevo sitio:`,
  (d: string) => `Al actualizar un ${d} con un nuevo punto, ocurre que:`,
  (d: string) => `Cuando un ${d} cambia por inserción de un sitio, se cumple que:`,
]

type Scenario = ReturnType<typeof generateScenario>

function pickUnique<T>(arr: T[], count: number): T[] {
  const unique = Array.from(new Set(arr))
  return shuffle(unique).slice(0, count)
}

function generateScenario() {
  const d = choice(diagramSynonyms)
  const prompt = choice(questionTemplates)(d)

  const correctText = choice([
    "Se recalculan mediatrices afectando celdas vecinas",
    "Se ajustan fronteras locales por nuevas mediatrices entre sitios cercanos",
    "Se actualiza localmente la partición: cambian celdas vecinas al nuevo sitio",
    "Se redistribuyen zonas de cercanía y se recalculan límites locales",
    "Se modifica de forma local el diagrama en la vecindad del nuevo sitio",
    "Se crean nuevos bordes de Voronoi en torno al sitio insertado y sus vecinos",
    "Cambian regiones adyacentes porque se recalculan bisectrices locales",
    "La actualización afecta principalmente celdas próximas, no todo el diagrama",
  ])

  const wrongPool = [
    "No cambia nada",
    "Se eliminan todas las celdas",
    "Se modifica solo la celda más cercana",
    "Desaparecen los vértices",
    "Todo el diagrama se reconstruye globalmente siempre",
    "Solo cambian los colores, no las fronteras",
    "Se convierten todas las fronteras en paralelas",
    "Se elimina el sitio más antiguo automáticamente",
    "Todas las celdas pasan a tener la misma área",
    "Se conserva exactamente la misma topología en todos los casos",
    "El número de regiones siempre disminuye",
    "La actualización depende de calcular derivadas parciales",
    "Se reemplaza Voronoi por triangulación sin cambios de celdas",
    "Solo cambia la etiqueta de una región, no su geometría",
    "Se eliminan todas las mediatrices previas",
  ]

  const wrongs = pickUnique(wrongPool.filter((w) => w !== correctText), 4)

  const options: Option[] = shuffle([
    { value: correctText, correct: true },
    ...wrongs.map((w) => ({ value: w, correct: false })),
  ])

  const explanationVariants = [
    {
      step1:
        "Las fronteras de Voronoi se construyen con puntos equidistantes entre pares de sitios.",
      step2:
        "Al insertar un nuevo sitio, las bisectrices con sus vecinos cambian la geometría local.",
      step3:
        "Por eso no se rehace todo: el ajuste principal ocurre en celdas próximas al nuevo sitio.",
    },
    {
      step1:
        "Cada celda contiene puntos más cercanos a un sitio que a los demás.",
      step2:
        "Un sitio nuevo compite por cercanía con algunos vecinos y redefine límites locales.",
      step3:
        "El impacto es de vecindad: cambian bordes y vértices cercanos, no necesariamente todo el plano.",
    },
    {
      step1:
        "En Voronoi, los bordes son mediatrices entre generadores vecinos.",
      step2:
        "Si agregas un generador, aparecen nuevas mediatrices respecto de sitios cercanos.",
      step3:
        "Eso desplaza solo regiones afectadas en la zona de influencia del nuevo punto.",
    },
  ]
  const exp = choice(explanationVariants)

  return {
    diagramName: d,
    prompt,
    correctText,
    options,
    explain: exp,
  }
}

/* ============================================================
   COMPONENTE
============================================================ */

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
        correctAnswer: scenario.correctText,
        diagram: scenario.diagramName,
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  const keyTex = `
\\text{Nuevo sitio} \\Rightarrow 
\\text{recalcular mediatrices locales}
`

  return (
    <MathProvider>
      <ExerciseShell
        title="Actualización en un diagrama de Voronoi"
        prompt="Selecciona la opción correcta"
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Resolución conceptual"
              steps={[
                {
                  title: "Idea clave",
                  detail: (
                    <span>
                      {scenario.explain.step1}
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={keyTex} />,
                },
                {
                  title: "Inserción de un nuevo sitio",
                  detail: (
                    <span>
                      {scenario.explain.step2}
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="text-sm text-muted-foreground">
                      {scenario.explain.step3}
                    </div>
                  ),
                },
                {
                  title: "Conclusión",
                  detail: (
                    <span>
                      La opción correcta es:
                      <b> {scenario.correctText}</b>.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: null,
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
          <div className="text-xs text-muted-foreground mb-2">
            Pregunta
          </div>

          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div className="text-sm">
              {scenario.prompt}
            </div>
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={(op) => (
            <span className="text-sm">{op.value}</span>
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
