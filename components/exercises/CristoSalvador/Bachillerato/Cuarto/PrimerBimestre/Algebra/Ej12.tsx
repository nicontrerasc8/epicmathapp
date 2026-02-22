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
  return arr[Math.floor(Math.random() * arr.length)]
}

function texDec(n: number) {
  return n.toString().replace(".", "{,}")
}

function fracTex(num: string, den: string) {
  return `t = \\frac{${num}}{${den}}`
}

/* =========================
   GENERADOR
   M(t) = M0 e^{-kt}
========================= */

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  for (let i = 0; i < 250; i++) {
    const M0 = choice([100, 150, 200, 300, 400])
    const factor = choice([0.25, 0.2, 0.5, 0.1])
    const Mt = M0 * factor
    const k = choice([0.2, 0.3, 0.4, 0.5])

    if (Mt <= 0) continue

    return {
      M0,
      Mt,
      k,
      factor,
      ratio: M0 / Mt,
      kTex: texDec(k),
      factorTex: texDec(factor),
    }
  }

  // fallback EXACTO como imagen
  return {
    M0: 200,
    Mt: 50,
    k: 0.5,
    factor: 0.25,
    ratio: 4,
    kTex: "0{,}5",
    factorTex: "0{,}25",
  }
}

/* =========================
   OPCIONES
========================= */

function generateOptions(s: Scenario): Option[] {
  const correct = fracTex(`\\ln(${s.ratio})`, s.kTex)

  const wrongLnInverse = fracTex(`\\ln(${s.factorTex})`, s.kTex) // ln(0.25)
  const wrongNoDivide = `t = \\ln(${s.ratio})` // olvidan dividir
  const wrongNoLn = fracTex(`${s.ratio}`, s.kTex) // sin ln
  const wrongSign = fracTex(`-\\ln(${s.ratio})`, s.kTex) // signo incorrecto

  const options = [
    { value: correct, correct: true },
    { value: wrongLnInverse, correct: false },
    { value: wrongNoDivide, correct: false },
    { value: wrongNoLn, correct: false },
    { value: wrongSign, correct: false },
  ]

  return options.sort(() => Math.random() - 0.5)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function DecaimientoRadioactivoGame({
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
      options: generateOptions(s),
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
        correctAnswer: fracTex(`\\ln(${scenario.ratio})`, scenario.kTex),
        question: {
          M0: scenario.M0,
          Mt: scenario.Mt,
          k: scenario.k,
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

  const modelTex = `M(t) = ${scenario.M0}e^{-${scenario.kTex}t}`

  const eqTex = `${scenario.Mt} = ${scenario.M0}e^{-${scenario.kTex}t}`

  const divTex = `\\frac{${scenario.Mt}}{${scenario.M0}} = e^{-${scenario.kTex}t}`

  const lnTex = `\\ln\\left(\\frac{${scenario.Mt}}{${scenario.M0}}\\right) = -${scenario.kTex}t`

  const solveTex = `t = \\frac{-\\ln\\left(\\frac{${scenario.Mt}}{${scenario.M0}}\\right)}{${scenario.kTex}} = \\frac{\\ln(${scenario.ratio})}{${scenario.kTex}}`

  return (
    <MathProvider>
      <ExerciseShell
        title="Modelo de decaimiento radiactivo"
        prompt="¿Después de cuánto tiempo la masa se reducirá al valor indicado?"
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
                  title: "Plantear ecuación",
                  detail: (
                    <span>
                      Sustituimos el valor objetivo de masa en el modelo de decaimiento.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={modelTex} />
                      <MathTex block tex={eqTex} />
                    </div>
                  ),
                },
                {
                  title: "Despejar exponencial",
                  detail: (
                    <span>
                      Dividimos entre <MathTex tex={`${scenario.M0}`} /> y aplicamos <MathTex tex={`\\ln`} /> para bajar el exponente.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={divTex} />
                      <MathTex block tex={lnTex} />
                    </div>
                  ),
                },
                {
                  title: "Aplicar logaritmo natural",
                  detail: (
                    <span>
                      Ordenamos la expresión y despejamos <MathTex tex={`t`} />.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={solveTex} />
                    </div>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta final: <MathTex tex={fracTex(`\\ln(${scenario.ratio})`, scenario.kTex)} />
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
              La masa de una sustancia radiactiva está dada por:
            </div>
            <MathTex block tex={modelTex} />
            <div className="text-sm">
              ¿Cuándo se reducirá a <MathTex tex={`${scenario.Mt}`} /> unidades?
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
