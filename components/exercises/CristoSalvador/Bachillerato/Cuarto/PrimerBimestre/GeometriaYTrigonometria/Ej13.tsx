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

/* =========================
   VARIACIONES (sin cambiar la verdad)
========================= */

const PROMPTS = [
  "Un vértice de Voronoi es el punto donde:",
  "En un diagrama de Voronoi, un vértice es el punto donde:",
  "En la partición de Voronoi, un vértice corresponde al punto donde:",
  "Conceptualmente, un vértice de Voronoi se define como el punto donde:",
]

const CORRECTS = [
  "Se intersectan tres o más mediatrices",
  "Se cortan tres o más mediatrices",
  "Se intersectan al menos tres mediatrices",
  "Se cruzan tres (o más) mediatrices",
]

const WRONG_POOL = [
  "Se cruzan dos aristas",
  "Hay un solo sitio",
  "Se forma un triángulo",
  "Hay distancia mínima",
  "Se intersectan dos mediatrices",
  "Se cruzan dos segmentos cualquiera",
  "El punto está más cerca de un solo sitio",
  "La suma de distancias es mínima",
]

/* =========================
   GENERADOR
========================= */

type Scenario = {
  question: string
  correct: string
  options: Option[]
  explain: {
    step1: string
    step2: string
    step3: string
    conclusion: string
  }
}

function generateScenario(): Scenario {
  const question = choice(PROMPTS)
  const correct = choice(CORRECTS)

  const wrongs = shuffle(WRONG_POOL).filter(w => w !== correct).slice(0, 4)

  const options: Option[] = shuffle([
    { value: correct, correct: true },
    ...wrongs.map(w => ({ value: w, correct: false })),
  ])

  const explain = {
    step1:
      "En un diagrama de Voronoi, las fronteras entre regiones son mediatrices (líneas de puntos equidistantes entre dos sitios).",
    step2:
      "Un vértice aparece cuando se encuentran varias de esas fronteras en un mismo punto.",
    step3:
      "En ese punto, la distancia a tres (o más) sitios es la misma, por eso se intersectan tres o más mediatrices.",
    conclusion: `Entonces, un vértice de Voronoi es el punto donde ${correct.toLowerCase()}.`,
  }

  return { question, correct, options, explain }
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

  // MathTex mini para mantener “mate vibe”
  const propTex = `\\text{Vértice Voronoi: punto equidistante a 3 o más sitios}`
  const eqTex = `PA = PB = PC \\; (\\text{y quizá más})`

  return (
    <MathProvider>
      <ExerciseShell
        title="Vértice de Voronoi"
        prompt={scenario.question}
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
                  title: "Qué son las fronteras en Voronoi",
                  detail: (
                    <span>
                      Las fronteras de Voronoi son líneas donde dos sitios
                      quedan a la misma distancia.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <span className="text-sm block">
                        {scenario.explain.step1}
                      </span>
                      <MathTex block tex={propTex} />
                    </div>
                  ),
                },
                {
                  title: "Cómo se forma un vértice",
                  detail: (
                    <span>
                      Un vértice aparece cuando varias fronteras se cruzan en
                      un mismo punto.
                    </span>
                  ),
                  icon: Divide,
                  content: <span className="text-sm">{scenario.explain.step2}</span>,
                },
                {
                  title: "Propiedad de distancias",
                  detail: (
                    <span>
                      En ese punto, la distancia a tres o más sitios es igual.
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
          renderValue={(op) => <span className="text-sm">{op.value}</span>}
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
