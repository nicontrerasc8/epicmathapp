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
function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

type Scenario = ReturnType<typeof generateScenario>
type Variation = ReturnType<typeof generateVariation>

function generateScenario() {
  for (let i = 0; i < 200; i++) {
    const x1 = randInt(-8, 8)
    const y1 = randInt(-8, 8)

    let x2 = randInt(-8, 8)
    let y2 = randInt(-8, 8)

    // evitar que A y B sean el mismo punto
    if (x2 === x1 && y2 === y1) continue

    return { x1, y1, x2, y2 }
  }

  // fallback
  return { x1: 2, y1: 3, x2: 6, y2: 11 }
}

function pickUnique(values: string[], count: number): string[] {
  const unique = Array.from(new Set(values))
  return shuffle(unique).slice(0, count)
}

function generateVariation(s: Scenario) {
  const a = `A(${s.x1},${s.y1})`
  const b = `B(${s.x2},${s.y2})`

  const correctBank = [
    `Equidistan de ${a} y ${b}.`,
    `Están a la misma distancia de ${a} y ${b}.`,
    `Cumplen que d(P,${a}) = d(P,${b}).`,
    `Tienen igual distancia a los extremos del segmento.`,
    `Forman el lugar geométrico de puntos equidistantes de ${a} y ${b}.`,
    `Mantienen d(P,A) = d(P,B) para los extremos del segmento.`,
    `Se encuentran a igual distancia de ambos extremos del segmento.`,
    `Verifican igualdad de distancias respecto de los dos extremos.`,
  ]

  const wrongBank = [
    "Tienen la misma pendiente que el segmento.",
    "Son puntos colineales con el segmento.",
    "Están a mayor distancia de uno de los extremos.",
    "Pertenecen siempre al primer cuadrante.",
    "Cumplen que d(P,A) > d(P,B).",
    "Cumplen que d(P,A) < d(P,B).",
    "Forman un triángulo equilátero con los extremos.",
    "Están sobre una recta paralela al segmento.",
    "Tienen ordenada igual al punto medio.",
    "Tienen abscisa igual al extremo A.",
    "Mantienen distancia cero respecto al segmento.",
    "Coinciden solo con el punto medio.",
    "Están a distancia fija de un único extremo.",
    "Dependen de que el segmento sea horizontal.",
    "Dependen de que el segmento sea vertical.",
    "Pasan obligatoriamente por el origen.",
    "Son únicamente los extremos del segmento.",
    "Pertenecen a cualquier recta perpendicular, sin condición extra.",
    "Cumplen que la suma d(P,A)+d(P,B) sea constante.",
    "Cumplen que la diferencia d(P,A)-d(P,B) sea constante no nula.",
    "Son los puntos con pendiente positiva.",
    "Siempre tienen coordenadas enteras.",
    "Forman una circunferencia centrada en A.",
    "Forman una circunferencia centrada en B.",
  ]

  const promptBank = [
    "La mediatriz representa el conjunto de puntos que:",
    "Marca la afirmación correcta sobre los puntos de la mediatriz:",
    "En relación con la mediatriz del segmento, se cumple que los puntos:",
    "¿Qué propiedad cumplen los puntos de la mediatriz?",
    "Selecciona la propiedad que define la mediatriz:",
    "La definición correcta de la mediatriz indica que sus puntos:",
    "¿Cuál describe correctamente el lugar geométrico de la mediatriz?",
    "Respecto de la mediatriz del segmento, los puntos:",
  ]

  const introBank = [
    `Considera el segmento con extremos ${a} y ${b}.`,
    `Tomando el segmento definido por ${a} y ${b}, identifica la propiedad correcta.`,
    `Para el segmento de extremos ${a} y ${b}, evalúa las afirmaciones.`,
    `Sea el segmento con extremos ${a} y ${b}.`,
    `Observa el segmento cuyos extremos son ${a} y ${b}.`,
    `Dado el segmento que une ${a} y ${b}, selecciona la opción válida.`,
    `En el segmento con extremos ${a} y ${b}, la mediatriz cumple que sus puntos:`,
    `Analiza el segmento determinado por ${a} y ${b}.`,
  ]

  const correct = pickUnique(correctBank, 1)[0]
  const wrongs = pickUnique(wrongBank, 4)

  return {
    correct,
    options: shuffle<Option>([
      { value: correct, correct: true },
      ...wrongs.map((value) => ({ value, correct: false })),
    ]),
    prompt: pickUnique(promptBank, 1)[0],
    intro: pickUnique(introBank, 1)[0],
  }
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function MediatrizGame({
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

  const scenario = useMemo(() => {
    const s = generateScenario()
    const v = generateVariation(s)
    return {
      ...s,
      ...v,
    }
  }, [nonce])

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
          type: "mediatriz_definicion",
          A: { x: scenario.x1, y: scenario.y1 },
          B: { x: scenario.x2, y: scenario.y2 },
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

  const defTex = `\\text{Mediatriz}(\\overline{AB}) = \\{ P \\mid d(P,A)=d(P,B) \\}`
  const aTex = `A(${scenario.x1},${scenario.y1})`
  const bTex = `B(${scenario.x2},${scenario.y2})`

  return (
    <MathProvider>
      <ExerciseShell
        title="Mediatriz de un segmento"
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
                  title: "Idea principal",
                  detail: (
                    <span>
                      La mediatriz de un segmento es una recta perpendicular que
                      pasa por su punto medio.
                    </span>
                  ),
                  icon: Sigma,
                },
                {
                  title: "Propiedad clave",
                  detail: (
                    <span>
                      Todo punto <b>P</b> que está en la mediatriz está a la misma
                      distancia de <b>A</b> y <b>B</b>.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="space-y-2">
                      <MathTex block tex={defTex} />
                      <div className="text-sm text-muted-foreground">
                        Aquí: {aTex} y {bTex}
                      </div>
                    </div>
                  ),
                },
                {
                  title: "Respuesta",
                  detail: (
                    <span>
                      Por eso la opción correcta es:{" "}
                      <b>{scenario.correct}</b>
                    </span>
                  ),
                  icon: ShieldCheck,
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta:{" "}
                  <b>{scenario.correct}</b>
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>

          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div className="text-sm">{scenario.intro}</div>
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
          renderValue={(op) => <span>{op.value}</span>}
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
