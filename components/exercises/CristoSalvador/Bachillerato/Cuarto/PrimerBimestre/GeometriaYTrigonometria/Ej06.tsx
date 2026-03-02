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

/* ============================================================
   HELPERS
============================================================ */

type Scenario = ReturnType<typeof generateScenario>

type ChoiceKey = "A" | "B" | "C" | "D" | "E"

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/* ============================================================
   BANCO DE PREGUNTAS (mismo concepto, variantes)
   Correcta: "Regiones equidistantes entre dos puntos"
============================================================ */

const QUESTION_BANK = [
  {
    // Variante 1 (como la imagen)
    prompt:
      "En modelización, las mediatrices permiten determinar:",
    correctText: "Regiones equidistantes entre dos puntos.",
    wrong: [
      "Áreas máximas.",
      "Pendientes paralelas.",
      "Longitudes mínimas.",
      "Triángulos rectángulos.",
    ],
  },
  {
    // Variante 2
    prompt:
      "¿Qué describe mejor a la mediatriz de un segmento en problemas de modelización?",
    correctText: "El conjunto de puntos que están a la misma distancia de los extremos.",
    wrong: [
      "El segmento más largo dentro de una figura.",
      "Una recta paralela al segmento.",
      "Una recta que pasa por un extremo del segmento.",
      "El conjunto de puntos más cercanos a un solo extremo.",
    ],
  },
  {
    // Variante 3
    prompt:
      "Si quieres ubicar puntos que estén igual de lejos de A y B, ¿qué usas?",
    correctText: "La mediatriz del segmento AB.",
    wrong: [
      "Una recta paralela a AB.",
      "La bisectriz de un ángulo.",
      "La diagonal de un cuadrado.",
      "Cualquier recta que pase por A.",
    ],
  },
  {
    // Variante 4
    prompt:
      "La mediatriz es útil porque permite encontrar:",
    correctText: "Zonas donde la distancia a dos puntos es la misma.",
    wrong: [
      "Zonas de área máxima.",
      "Zonas con pendiente cero.",
      "Zonas con mínima longitud.",
      "Zonas con triángulos rectángulos.",
    ],
  },
]

function generateScenario() {
  const q = pickOne(QUESTION_BANK)

  // Construimos opciones A–E y mezclamos el orden
  const all = shuffle([
    { text: q.correctText, correct: true },
    ...q.wrong.map((t) => ({ text: t, correct: false })),
  ]).slice(0, 5)

  // Etiquetar A..E (solo para guardar/analítica si quieres)
  const labels: ChoiceKey[] = ["A", "B", "C", "D", "E"]
  const options = all.map((o, idx) => ({
    value: o.text,
    correct: o.correct,
    label: labels[idx],
  }))

  const correct = options.find((o) => o.correct)!

  return {
    prompt: q.prompt,
    options,
    correctText: correct.value,
    correctLabel: correct.label,
  }
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function MediatrizModelizacionGame({
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
            label: o.label,
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

  // Para mostrar A) B) C) ... como la foto
  function renderOptionLabel(op: (Option & { label?: string }) | any) {
    const label = op.label ? `${op.label}) ` : ""
    // OJO: MathTex lo usamos para consistencia visual, pero aquí es texto normal.
    return <span className="text-sm">{label}{op.value}</span>
  }

  return (
    <MathProvider>
      <ExerciseShell
        title="Mediatriz en modelización"
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
                      La <b>mediatriz</b> de un segmento es la recta que lo corta
                      en su <b>punto medio</b> y es <b>perpendicular</b> a él.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="text-sm text-muted-foreground">
                      Eso implica que cualquier punto sobre la mediatriz está
                      a la misma distancia de los dos extremos del segmento.
                    </div>
                  ),
                },
                {
                  title: "Interpretación en modelización",
                  detail: (
                    <span>
                      Se usa para encontrar <b>regiones/puntos equidistantes</b>{" "}
                      entre dos ubicaciones (por ejemplo, dos puntos A y B).
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="rounded-lg border bg-background p-3 text-sm">
                      Conclusión: la mediatriz determina el conjunto de puntos
                      donde la distancia a A y a B es la misma.
                    </div>
                  ),
                },
                {
                  title: "Respuesta",
                  detail: (
                    <span>
                      La opción correcta es la que menciona{" "}
                      <b>equidistancia</b>.
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
          renderValue={(op: any) => renderOptionLabel(op)}
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