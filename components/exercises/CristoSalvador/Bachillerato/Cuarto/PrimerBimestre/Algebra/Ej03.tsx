"use client"

import { useMemo, useState } from "react"
import { ShieldCheck, Sigma } from "lucide-react"

import { useExerciseEngine } from "@/lib/exercises/useExerciseEngine"
import { useExerciseSubmission } from "@/lib/exercises/useExerciseSubmission"
import { useExerciseTimer } from "@/lib/exercises/useExerciseTimer"
import { computeTrophyGain, WRONG_PENALTY } from "@/lib/exercises/gamification"

import { Option, OptionsGrid } from "@/components/exercises/base/OptionsGrid"
import { MathProvider, MathTex } from "@/components/exercises/base/MathBlock"
import { ExerciseHud } from "@/components/exercises/base/ExerciseHud"
import { SolutionBox } from "@/components/exercises/base/SolutionBox"
import { ExerciseShell } from "@/components/exercises/base/ExerciseShell"
import { DetailedExplanation } from "@/components/exercises/base/DetailedExplanation"

/* =========================
   ESCENARIO (Pregunta 3)
   (3×10^4)(2×10^-6)
========================= */
function scenarioP3() {
  const a1 = 3
  const k1 = 4
  const a2 = 2
  const k2 = -6

  const mantissa = a1 * a2 // 6
  const exponent = k1 + k2 // -2

  const correct = `${mantissa} \\times 10^{${exponent}}` // 6×10^-2

  const exprTex = `(${a1} \\times 10^{${k1}})(${a2} \\times 10^{${k2}})`

  // Opciones A–E como la imagen (incluye equivalentes NO normalizados)
  const options: Option[] = [
    { value: `6 \\times 10^{-2}`, correct: true }, // A
    { value: `6 \\times 10^{2}`, correct: false }, // B
    { value: `6 \\times 10^{-10}`, correct: false }, // C
    { value: `0{,}6 \\times 10^{-1}`, correct: false }, // D (equivalente, no normalizado)
    { value: `60 \\times 10^{-3}`, correct: false }, // E (equivalente, no normalizado)
  ]

  return {
    a1,
    k1,
    a2,
    k2,
    mantissa,
    exponent,
    correct,
    exprTex,
    options,
  }
}

/* ============================================================
   COMPONENTE
============================================================ */
export default function NotacionCientificaPregunta3Game({
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

  const scenario = useMemo(() => scenarioP3(), [nonce])
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
          type: "notacion_cientifica_p3",
          expr_tex: scenario.exprTex,
        },
        computed: {
          mantissa: scenario.mantissa,
          exponent: scenario.exponent,
        },
        options: scenario.options.map(o => o.value),
        extra: {
          time_seconds: Math.floor(timeSeconds),
          trophy_preview: computeTrophyGain(timeSeconds),
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

  return (
    <MathProvider>
      <ExerciseShell
        title="Operaciones con números de la forma a×10^k — Pregunta 3"
        prompt="Calcular y expresar en notación científica:"
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
                  title: "Multiplicar las mantisas",
                  detail: (
                    <span>
                      Multiplicamos los números que están antes del \(10^k\).
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={`${scenario.a1} \\cdot ${scenario.a2} = ${scenario.mantissa}`} />,
                },
                {
                  title: "Sumar los exponentes",
                  detail: (
                    <span>
                      En multiplicación, los exponentes de 10 <b>se suman</b>.
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={`${scenario.k1} + (${scenario.k2}) = ${scenario.exponent}`} />,
                },
                {
                  title: "Escribir en notación científica",
                  detail: (
                    <span>
                      La mantisa debe cumplir \(1 \\le m &lt; 10\). Aquí \(m=6\) sí cumple.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: <MathTex block tex={scenario.correct} />,
                  tip: (
                    <span>
                      \(6 \\times 10^{-1}\) y \(60 \\times 10^{-3}\) valen lo mismo, pero no están normalizadas.
                    </span>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta: <b>{scenario.correct}</b> (opción A).
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Expresión</div>
          <div className="rounded-lg border bg-background p-3">
            <MathTex block tex={scenario.exprTex} />
          </div>
        </div>

        <OptionsGrid
          options={scenario.options} // orden A–E como la imagen
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
