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
   GENERACIÓN DINÁMICA
========================= */

const diagramSynonyms = [
  "diagrama de Voronoi",
  "teselación de Voronoi",
  "partición de Voronoi",
]

const questionTemplates = [
  (d: string) => `Al añadir un nuevo sitio a un ${d}:`,
  (d: string) => `Si se inserta un nuevo sitio en un ${d}, entonces:`,
  (d: string) => `Cuando agregamos un punto generador en un ${d}:`,
  (d: string) => `En un ${d}, al introducir un nuevo sitio:`,
  (d: string) => `Si ampliamos un ${d} con un sitio adicional:`,
]

const explanationTemplates = [
  () =>
    "Al añadir un sitio, se deben recalcular las mediatrices entre el nuevo punto y los existentes, afectando principalmente las celdas vecinas.",
  () =>
    "Un nuevo punto generador altera las fronteras cercanas: las mediatrices cambian y se ajustan las regiones vecinas.",
  () =>
    "Solo las celdas cercanas al nuevo sitio se ven modificadas, ya que las mediatrices se recalculan localmente.",
]

function generateScenario() {
  const d = choice(diagramSynonyms)
  const prompt = choice(questionTemplates)(d)

  const correct =
    "Se recalculan mediatrices afectando celdas vecinas"

  const distractorBank = [
    "No cambia nada",
    "Se eliminan todas las celdas",
    "Se modifica solo la celda más cercana",
    "Desaparecen los vértices",
    "Todas las regiones se redibujan completamente",
    "Se convierte en un diagrama de Delaunay",
    "Se eliminan todas las aristas",
  ]

  const distractors = shuffle(distractorBank)
    .filter((x) => x !== correct)
    .slice(0, 4)

  const options: Option[] = shuffle([
    { value: correct, correct: true },
    ...distractors.map((v) => ({ value: v, correct: false })),
  ])

  const explanation = choice(explanationTemplates)()

  return {
    diagramName: d,
    prompt,
    correct,
    options,
    explanation,
  }
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function VoronoiInsertGame({
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
        title="Actualización dinámica en un diagrama de Voronoi"
        prompt="Selecciona la afirmación correcta"
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Explicación conceptual"
              steps={[
                {
                  title: "Idea clave",
                  detail: (
                    <span>
                      En Voronoi, cada frontera depende de mediatrices entre sitios.
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={keyTex} />,
                },
                {
                  title: "¿Qué ocurre al insertar un sitio?",
                  detail: <span>{scenario.explanation}</span>,
                  icon: Divide,
                  content: (
                    <div className="text-sm text-muted-foreground">
                      El efecto es local, no global.
                    </div>
                  ),
                },
                {
                  title: "Conclusión",
                  detail: (
                    <span>
                      Por eso, la opción correcta es:
                      <b> {scenario.correct}</b>.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: null,
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
          <div className="text-xs text-muted-foreground mb-2">
            Pregunta
          </div>

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