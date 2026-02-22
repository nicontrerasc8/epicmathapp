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
   HELPERS
========================= */

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

/* =========================
   GENERADOR (tema: M = log10(I/I0))
========================= */

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  // En la imagen: M=6 (clásico). Igual lo hacemos variable pero "bonito".
  const M = choice([2, 3, 4, 5, 6, 7, 8])
  const ratioPow = `10^{${M}}` // I/I0

  const equationTex = `M=\\log_{10}\\left(\\frac{I}{I_0}\\right)`
  const questionTex = `\\text{Un sismo tiene magnitud } ${M}.\\ \\text{¿Cuántas veces mayor es su intensidad respecto a } I_0\\text{?}`

  const correct = `${ratioPow}\\ \\text{veces}`

  return {
    M,
    ratioPow,
    equationTex,
    questionTex,
    correct,
  }
}

/* =========================
   OPCIONES (A–E tipo imagen)
========================= */

function generateOptions(s: Scenario): Option[] {
  const correct = s.correct

  const wrongLinear = `${s.M}\\ \\text{veces}` // error: confundir log con proporción lineal
  const wrongTimes10 = `${10 * s.M}\\ \\text{veces}` // error: “multiplico por 10”
  const wrongPowMinus = `10^{-${s.M}}\\ \\text{veces}` // error: signo
  const wrongE = `e^{${s.M}}\\ \\text{veces}` // error: base e

  const all: Option[] = [
    { value: wrongLinear, correct: false },
    { value: wrongTimes10, correct: false },
    { value: correct, correct: true },
    { value: wrongPowMinus, correct: false },
    { value: wrongE, correct: false },
  ]

  // asegurar 5 únicas
  const seen = new Set<string>()
  const unique: Option[] = []
  for (const o of all) {
    if (seen.has(o.value)) continue
    seen.add(o.value)
    unique.push(o)
  }
  while (unique.length < 5) {
    const extra = `10^{${s.M + randInt(1, 3)}}\\ \\text{veces}`
    if (!seen.has(extra) && extra !== correct) {
      unique.push({ value: extra, correct: false })
      seen.add(extra)
    }
  }

  return shuffle(unique).slice(0, 5)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function MagnitudSismoLog10Game({
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

  const scenario = useMemo(() => {
    const s = generateScenario()
    return { ...s, options: generateOptions(s) }
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
          formula: "M = log10(I/I0)",
          M: scenario.M,
        },
        computed: {
          ratio: `I/I_0 = 10^{${scenario.M}}`,
        },
        options: scenario.options.map(o => o.value),
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
        title="Logaritmos (base 10) — Magnitud de un sismo"
        prompt="Resuelve:"
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Guía paso a paso"
              steps={[
                {
                  title: "Identificar la fórmula y el dato",
                  detail: (
                    <span>
                      Te dan la relación entre magnitud e intensidad:
                      <MathTex tex={`M=\\log_{10}\\left(\\frac{I}{I_0}\\right)`} />.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={scenario.equationTex} />
                      <MathTex block tex={`M=${scenario.M}`} />
                      <MathTex block tex={`\\text{Buscamos }\\ \\frac{I}{I_0}`} />
                    </div>
                  ),
                },
                {
                  title: "Quitar el logaritmo (pasar a potencia de 10)",
                  detail: (
                    <span>
                      Si <MathTex tex={`M=\\log_{10}(A)`} />, entonces <MathTex tex={`A=10^M`} />.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex
                        block
                        tex={`${scenario.M}=\\log_{10}\\left(\\frac{I}{I_0}\\right)`}
                      />
                      <MathTex block tex={`\\frac{I}{I_0}=10^{${scenario.M}}`} />
                    </div>
                  ),
                  tip: (
                    <span>
                      Error típico: pensar que “<MathTex tex={`M=6`} />” significa “6 veces”. En log base 10, cada +1 multiplica por 10.
                    </span>
                  ),
                },
                {
                  title: "Interpretar el resultado como “veces”",
                  detail: (
                    <span>
                      <MathTex tex={`\\frac{I}{I_0}`} /> ya significa “cuántas veces mayor es”
                      <MathTex tex={`\\ I`} /> respecto a <MathTex tex={`I_0`} />.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\frac{I}{I_0}=10^{${scenario.M}}`} />
                      <MathTex block tex={`\\Rightarrow\\ ${scenario.correct}`} />
                    </div>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta final: <MathTex tex={scenario.correct} />.
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3 space-y-3">
            <MathTex block tex={scenario.equationTex} />
            <MathTex block tex={scenario.questionTex} />
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
