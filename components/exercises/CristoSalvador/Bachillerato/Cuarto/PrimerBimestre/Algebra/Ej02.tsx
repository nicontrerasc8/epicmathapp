"use client"

import { useMemo, useState } from "react"
import { ShieldCheck, Sigma, Divide } from "lucide-react"

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
   HELPERS (coma decimal)
========================= */
function fmtComma(n: number, decimals = 1) {
  const s = n.toFixed(decimals).replace(/\.0$/, "")
  return s.replace(".", ",")
}
function sciTexComma(m: number, e: number) {
  return `${fmtComma(m, 1)} \\times 10^{${e}}`
}

/* =========================
   ESCENARIO (Pregunta 2)
   (4,8×10^-3)(3×10^5) / (6×10^2)
========================= */
function scenarioP2() {
  const a1 = 4.8,
    k1 = -3
  const a2 = 3,
    k2 = 5
  const a3 = 6,
    k3 = 2

  // Paso 1: multiplicación en numerador
  const numMantissa = a1 * a2 // 14.4
  const numExp = k1 + k2 // 2

  // Paso 2: división por el denominador
  const rawMantissa = numMantissa / a3 // 2.4
  const rawExp = numExp - k3 // 0

  const correct = sciTexComma(rawMantissa, rawExp) // 2,4×10^0

  const options: Option[] = [
    { value: sciTexComma(2.4, 0), correct: true },  // A
    { value: sciTexComma(2.4, -1), correct: false }, // B
    { value: sciTexComma(2.4, 1), correct: false },  // C
    { value: sciTexComma(24, -1), correct: false },  // D (equivalente pero NO normalizado)
    { value: sciTexComma(0.24, 1), correct: false }, // E (equivalente pero NO normalizado)
  ]

  const exprTex = `
\\frac{
  (${fmtComma(a1)} \\times 10^{${k1}})
  (${fmtComma(a2)} \\times 10^{${k2}})
}{
  ${fmtComma(a3, 0)} \\times 10^{${k3}}
}
`

  return {
    a1, k1,
    a2, k2,
    a3, k3,
    numMantissa,
    numExp,
    rawMantissa,
    rawExp,
    correct,
    options,
    exprTex,
  }
}

/* ============================================================
   COMPONENTE
============================================================ */
export default function NotacionCientificaPregunta2Game({
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

  const scenario = useMemo(() => scenarioP2(), [nonce])
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
          type: "notacion_cientifica_p2",
          expr_tex: scenario.exprTex,
        },
        computed: {
          numMantissa: scenario.numMantissa,
          numExp: scenario.numExp,
          resultMantissa: scenario.rawMantissa,
          resultExp: scenario.rawExp,
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
    // (si quieres que “Siguiente” pase a otro ítem, acá lo conectas a navegación)
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  return (
    <MathProvider>
      <ExerciseShell
        title="Operaciones con números de la forma a×10^k — Pregunta 2"
        prompt="El valor de la expresión, expresado en notación científica, es:"
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
                  title: "Multiplicar el numerador",
                  detail: (
                    <span>
                      Multiplicamos las mantisas y <b>sumamos</b> los exponentes:
                      <MathTex tex={`(a\\times10^m)(b\\times10^n)=(ab)\\times10^{m+n}`} />.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={scenario.exprTex} />
                      <MathTex
                        block
                        tex={`\\text{Mantisa: } ${fmtComma(scenario.a1)}\\cdot ${fmtComma(scenario.a2)} = ${fmtComma(
                          scenario.numMantissa
                        )}`}
                      />
                      <MathTex
                        block
                        tex={`\\text{Exponente: } ${scenario.k1} + (${scenario.k2}) = ${scenario.numExp}`}
                      />
                      <MathTex
                        block
                        tex={`${fmtComma(scenario.numMantissa)} \\times 10^{${scenario.numExp}}`}
                      />
                    </div>
                  ),
                },
                {
                  title: "Dividir entre el denominador",
                  detail: (
                    <span>
                      Dividimos mantisas y <b>restamos</b> exponentes:
                      <MathTex tex={`\\frac{10^p}{10^q}=10^{p-q}`} />.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex
                        block
                        tex={`\\frac{${fmtComma(scenario.numMantissa)} \\times 10^{${scenario.numExp}}}{${fmtComma(
                          scenario.a3,
                          0
                        )} \\times 10^{${scenario.k3}}}
= \\left(\\frac{${fmtComma(scenario.numMantissa)}}{${fmtComma(scenario.a3, 0)}}\\right) \\times 10^{${scenario.numExp} - ${scenario.k3}}`}
                      />
                      <MathTex
                        block
                        tex={`\\frac{${fmtComma(scenario.numMantissa)}}{${fmtComma(scenario.a3, 0)}} = ${fmtComma(
                          scenario.rawMantissa
                        )}`}
                      />
                      <MathTex
                        block
                        tex={`${scenario.numExp} - ${scenario.k3} = ${scenario.rawExp}`}
                      />
                    </div>
                  ),
                },
                {
                  title: "Verificar notación científica",
                  detail: (
                    <span>
                      En notación científica la mantisa cumple <b>\(1 \\le m &lt; 10\)</b>. Aquí \(m={fmtComma(
                        scenario.rawMantissa
                      )}\) ya está en el rango.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\text{Respuesta: } ${scenario.correct}`} />
                      <MathTex block tex={`1 \\le ${fmtComma(scenario.rawMantissa)} < 10`} />
                    </div>
                  ),
                  tip: (
                    <span>
                      \(24\\times10^{-1}\) y \(0,24\\times10^{1}\) valen lo mismo, pero <b>no</b> están normalizadas
                      (mantisa 24 &ge; 10 o 0,24 &lt; 1).
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
          options={scenario.options} // NO shuffle: queda A–E como la imagen
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
