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

type Scenario = ReturnType<typeof generateScenario>

/* =========================
   GENERACIÓN (muchas variaciones)
========================= */

const siteSynonyms = [
  "sitio",
  "punto sitio",
  "sitio generador",
  "punto de sitio",
]

const diagramSynonyms = [
  "diagrama de Voronoi",
  "teselación de Voronoi",
  "partición de Voronoi",
]

const questionTemplates = [
  (d: string, s: string) => `En un ${d}, un “${s}” es:`,
  (d: string, s: string) => `En un ${d}, ¿qué significa “${s}”?`,
  (d: string, s: string) => `En un ${d}, el término “${s}” se refiere a:`,
  (d: string, s: string) => `Si hablamos de un ${d}, un “${s}” corresponde a:`,
  (d: string, s: string) => `En geometría computacional, en un ${d}, un “${s}” es:`,
]

const explanationTemplates = [
  () =>
    "En Voronoi, los sitios son los puntos que “generan” las regiones: cada celda contiene los puntos más cercanos a un sitio.",
  () =>
    "Un sitio es un punto generador: a partir de esos puntos se construyen las celdas (regiones) del diagrama.",
  () =>
    "Los sitios son los puntos de referencia. El diagrama separa el plano según cuál sitio queda más cerca.",
]

function generateScenario() {
  const d = choice(diagramSynonyms)
  const s = choice(siteSynonyms)
  const prompt = choice(questionTemplates)(d, s)

  // Respuesta correcta fija (concepto)
  const correct = "Un punto generador"

  // Banco de distractores (varía el set)
  const distractorBank = [
    "Una arista",
    "Un vértice",
    "Una celda",
    "Una pendiente",
    "Una bisectriz",
    "Un segmento",
    "Un polígono",
    "Una región frontera",
    "Una circunferencia",
  ]

  // Elegir 4 distractores aleatorios sin repetir
  const distractors = shuffle(distractorBank)
    .filter((x) => x !== correct)
    .slice(0, 4)

  const options: Option[] = shuffle([
    { value: correct, correct: true },
    ...distractors.map((v) => ({ value: v, correct: false })),
  ])

  // Variación de explicación
  const explanation = choice(explanationTemplates)()

  // Para dar “mini ejemplo” de sitios (sin dibujar)
  const sampleSites = [
    `S = {A, B, C}`,
    `S = {P_1, P_2, P_3}`,
    `S = {S_1, S_2, S_3, S_4}`,
  ]
  const exampleSet = choice(sampleSites)

  return {
    diagramName: d,
    siteWord: s,
    prompt,
    correct,
    options,
    explanation,
    exampleSet,
  }
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
          diagram: scenario.diagramName,
          siteTerm: scenario.siteWord,
          prompt: scenario.prompt,
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

  // MathTex: solo para resaltar términos, sin hacer diagrama
  const keyIdeaTex = `\\text{Sitio} = \\text{punto generador}`
  const exampleTex = `S = \\{\\text{puntos generadores}\\}`

  return (
    <MathProvider>
      <ExerciseShell
        title='Conceptos de Voronoi: “sitio”'
        prompt="Selecciona la definición correcta"
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
                      En Voronoi, un “sitio” es el punto que genera una región.
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={keyIdeaTex} />,
                },
                {
                  title: "¿Por qué?",
                  detail: <span>{scenario.explanation}</span>,
                  icon: Divide,
                  content: <MathTex block tex={exampleTex} />,
                },
                {
                  title: "Conclusión",
                  detail: (
                    <span>
                      Por eso, la respuesta correcta es <b>{scenario.correct}</b>.
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
          renderValue={(op) => <MathTex tex={`\\text{${op.value}}`} />}
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