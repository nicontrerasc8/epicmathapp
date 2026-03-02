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

// Para mostrar 2.5 como 5/2 en TeX (opcional pero queda pro)
function toFractionTeX(n: number) {
  if (Number.isInteger(n)) return n.toString()
  // Solo soportamos .5 para este ejercicio (porque x1+x2 y y1+y2 pueden ser impares)
  const doubled = n * 2
  if (Number.isInteger(doubled)) return `\\frac{${doubled}}{2}`
  // fallback decimal
  return n.toString()
}

/* =========================
   ESCENARIO (como la imagen)
   Horizontal: A(x1, y) y B(x2, y)
   Mediatriz: x = (x1+x2)/2
========================= */

type Scenario = {
  A: { x: number; y: number }
  B: { x: number; y: number }
  midX: number
  correct: string
  options: Option[]
}

function generateScenario(): Scenario {
  // Para que se parezca a la foto: segmento horizontal sobre y=0 (pero lo hacemos variable)
  const y = randInt(-1, 3)

  // x1 < x2 y separados
  const x1 = randInt(-2, 3)
  const x2 = randInt(x1 + 2, x1 + 8)

  const A = { x: x1, y }
  const B = { x: x2, y }
  const midX = (x1 + x2) / 2

  const correct = `x = ${midX}`

  // Opciones tipo imagen (x=mid, y=mid, x=x1, y=y, x=x2)
  const raw: Option[] = [
    { value: `x = ${midX}`, correct: true },
    { value: `y = ${midX}`, correct: false },
    { value: `x = ${x1}`, correct: false },
    { value: `y = ${y}`, correct: false },
    { value: `x = ${x2}`, correct: false },
  ]

  // quitar duplicados por si cae algo raro
  const seen = new Set<string>()
  const unique: Option[] = []
  for (const o of raw) {
    if (seen.has(o.value)) continue
    seen.add(o.value)
    unique.push(o)
  }

  while (unique.length < 5) {
    const extra = `x = ${midX + randInt(-3, 3)}`
    if (!seen.has(extra)) {
      unique.push({ value: extra, correct: false })
      seen.add(extra)
    }
  }

  return { A, B, midX, correct, options: shuffle(unique).slice(0, 5) }
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function MediatrisSegmentoHorizontalGame({
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
          A: scenario.A,
          B: scenario.B,
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

  // TeX explicación
  const midpointXTex = `x_M = \\frac{x_1 + x_2}{2}`
  const subsTex = `x_M = \\frac{${scenario.A.x} + ${scenario.B.x}}{2}`
  const calcTex = `x_M = ${toFractionTeX((scenario.A.x + scenario.B.x) / 2)}`
  const whyVerticalTex = `y_1 = y_2 \\Rightarrow \\text{segmento horizontal} \\Rightarrow \\text{mediatriz vertical}`
  const answerTex = `x = x_M = ${toFractionTeX(scenario.midX)}`

  return (
    <MathProvider>
      <ExerciseShell
        title="Mediatriz de un segmento"
        prompt="La mediatriz del segmento que une A y B es:"
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Resolución paso a paso"
              steps={[
                {
                  title: "Calcular el punto medio (en x)",
                  detail: (
                    <span>
                      Para un segmento horizontal, basta hallar la mitad entre{" "}
                      <b>x₁</b> y <b>x₂</b>.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={midpointXTex} />
                      <MathTex block tex={subsTex} />
                      <MathTex block tex={calcTex} />
                    </div>
                  ),
                },
                {
                  title: "Concluir orientación",
                  detail: (
                    <span>
                      Como los dos puntos tienen el mismo <b>y</b>, el segmento es
                      horizontal y su mediatriz es una recta vertical.
                    </span>
                  ),
                  icon: Divide,
                  content: <MathTex block tex={whyVerticalTex} />,
                },
                {
                  title: "Ecuación de la mediatriz",
                  detail: (
                    <span>
                      Si es vertical y pasa por el punto medio, queda{" "}
                      <b>x = x_M</b>.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: <MathTex block tex={answerTex} />,
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
            <div className="text-sm">
              La mediatriz del segmento que une{" "}
              <b>
                A({scenario.A.x}, {scenario.A.y})
              </b>{" "}
              y{" "}
              <b>
                B({scenario.B.x}, {scenario.B.y})
              </b>{" "}
              es:
            </div>
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={(op) => <MathTex tex={op.value} />}
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