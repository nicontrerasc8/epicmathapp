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

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

/* ============================================================
   GENERADOR DE ESCENARIO DINÁMICO
   (Garantiza pendiente entera y mediatriz entera)
============================================================ */

function generateScenario() {
  for (let i = 0; i < 200; i++) {
    const x1 = randInt(-5, 5)
    const y1 = randInt(-5, 5)

    let dx = randInt(1, 6)
    let mSegmento = randInt(-4, 4)

    if (mSegmento === 0) continue // evitamos división por 0 en mediatriz

    const dy = mSegmento * dx

    const x2 = x1 + dx
    const y2 = y1 + dy

    const mMediatriz = -1 / mSegmento

    // Queremos que la mediatriz sea entera
    if (Number.isInteger(mMediatriz)) {
      return {
        x1,
        y1,
        x2,
        y2,
        mSegmento,
        mMediatriz,
      }
    }
  }

  // fallback seguro
  return {
    x1: 1,
    y1: 2,
    x2: 5,
    y2: 6,
    mSegmento: 1,
    mMediatriz: -1,
  }
}

function generateOptions(correct: number): Option[] {
  const options: Option[] = [
    { value: correct.toString(), correct: true },
    { value: (-correct).toString(), correct: false },
    { value: (correct + 1).toString(), correct: false },
    { value: (correct - 1).toString(), correct: false },
    { value: "0", correct: false },
  ]

  // eliminar duplicados
  const seen = new Set<string>()
  const unique: Option[] = []

  for (const o of options) {
    if (!seen.has(o.value)) {
      seen.add(o.value)
      unique.push(o)
    }
  }

  return unique.sort(() => Math.random() - 0.5)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function PendienteMediatrizGame({
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

  const { elapsed, startedAtRef } = useExerciseTimer(
    engine.canAnswer,
    nonce
  )

  const scenario = useMemo(() => {
    const s = generateScenario()
    return {
      ...s,
      options: generateOptions(s.mMediatriz),
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
        correctAnswer: scenario.mMediatriz,
        question: {
          x1: scenario.x1,
          y1: scenario.y1,
          x2: scenario.x2,
          y2: scenario.y2,
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

  /* ================= TEX ================= */

  const formulaTex = `m = \\frac{y_2 - y_1}{x_2 - x_1}`
  const sustitucionTex = `
m = \\frac{${scenario.y2} - ${scenario.y1}}{${scenario.x2} - ${scenario.x1}}
`
  const calcSegmentoTex = `
m = ${scenario.mSegmento}
`
  const mediatrizTex = `
m_{\\text{mediatriz}} = -\\frac{1}{${scenario.mSegmento}} = ${scenario.mMediatriz}
`

  return (
    <MathProvider>
      <ExerciseShell
        title="Pendiente de la mediatriz"
        prompt="¿Cuál es la pendiente de la mediatriz del segmento?"
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
                  title: "Calcular pendiente del segmento",
                  detail: <span>Usamos la fórmula de pendiente.</span>,
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={formulaTex} />
                      <MathTex block tex={sustitucionTex} />
                      <MathTex block tex={calcSegmentoTex} />
                    </div>
                  ),
                },
                {
                  title: "Aplicar perpendicularidad",
                  detail: (
                    <span>
                      La mediatriz es perpendicular, así que usamos el
                      recíproco negativo.
                    </span>
                  ),
                  icon: Divide,
                  content: <MathTex block tex={mediatrizTex} />,
                },
                {
                  title: "Respuesta final",
                  detail: (
                    <span>
                      La pendiente correcta es{" "}
                      <b>{scenario.mMediatriz}</b>.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: (
                    <MathTex
                      block
                      tex={`m = ${scenario.mMediatriz}`}
                    />
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta: <b>{scenario.mMediatriz}</b>
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
              El segmento une los puntos{" "}
              <b>({scenario.x1}, {scenario.y1})</b> y{" "}
              <b>({scenario.x2}, {scenario.y2})</b>.
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