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

function formatTimesTex(kind: "power" | "plain" | "ratio", m: number) {
  if (kind === "plain") return `${10 ** m}\\ \\text{veces}`
  if (kind === "ratio") return `\\frac{I}{I_0}=10^{${m}}`
  return `10^{${m}}\\ \\text{veces}`
}

/* =========================
   GENERADOR
========================= */

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  const M = choice([2, 3, 4, 5, 6, 7, 8])
  const questionStyle = choice(["sismo", "formula", "comparacion"] as const)
  const answerStyle = choice(["power", "plain", "ratio"] as const)

  const equationTex = `M=\\log_{10}\\left(\\frac{I}{I_0}\\right)`
  const correct = formatTimesTex(answerStyle, M)

  const questionTex =
    questionStyle === "formula"
      ? `\\text{Si }M=${M}\\text{ en }M=\\log_{10}\\left(\\frac{I}{I_0}\\right),\\ \\text{¿cuál es }\\frac{I}{I_0}\\text{?}`
      : questionStyle === "comparacion"
        ? `\\text{La magnitud de un sismo es }${M}.\\ \\text{¿Qué factor multiplica a }I_0\\text{ para obtener }I\\text{?}`
        : `\\text{Un sismo tiene magnitud }${M}.\\ \\text{¿Cuántas veces mayor es su intensidad respecto a }I_0\\text{?}`

  return {
    M,
    equationTex,
    questionTex,
    answerStyle,
    questionStyle,
    correct,
  }
}

/* =========================
   OPCIONES
========================= */

function generateOptions(s: Scenario): Option[] {
  const candidates = [
    s.correct,
    formatTimesTex("power", s.M + 1),
    formatTimesTex("power", s.M - 1),
    formatTimesTex("power", -s.M),
    `${s.M}\\ \\text{veces}`,
    `${10 * s.M}\\ \\text{veces}`,
    `e^{${s.M}}\\ \\text{veces}`,
    formatTimesTex("plain", Math.max(1, s.M)),
    formatTimesTex("ratio", s.M),
    formatTimesTex("ratio", s.M + 1),
  ]

  const seen = new Set<string>()
  const unique: Option[] = []

  for (const value of shuffle(candidates)) {
    if (seen.has(value)) continue
    seen.add(value)
    unique.push({ value, correct: value === s.correct })
  }

  if (!unique.some(option => option.correct)) {
    unique.unshift({ value: s.correct, correct: true })
  }

  const filtered = unique.filter((option, index, arr) => {
    if (option.correct) return true
    return arr.findIndex(other => other.value === option.value) === index
  })

  const withCorrectFirst = filtered.some(option => option.correct)
    ? filtered
    : [{ value: s.correct, correct: true }, ...filtered]

  const finalOptions: Option[] = []
  const finalSeen = new Set<string>()

  for (const option of withCorrectFirst) {
    if (finalSeen.has(option.value)) continue
    finalSeen.add(option.value)
    finalOptions.push(option)
    if (finalOptions.length === 5) break
  }

  while (finalOptions.length < 5) {
    const extraPow = s.M + randInt(2, 4)
    const extra = formatTimesTex(choice(["power", "plain", "ratio"] as const), extraPow)
    if (!finalSeen.has(extra) && extra !== s.correct) {
      finalSeen.add(extra)
      finalOptions.push({ value: extra, correct: false })
    }
  }

  return shuffle(finalOptions)
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
          questionStyle: scenario.questionStyle,
          answerStyle: scenario.answerStyle,
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
        title="Logaritmos (base 10) - Magnitud de un sismo"
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
                      La relación es <MathTex tex={`M=\\log_{10}\\left(\\frac{I}{I_0}\\right)`} />.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={scenario.equationTex} />
                      <MathTex block tex={`M=${scenario.M}`} />
                      <MathTex block tex={`\\text{Buscamos }\\frac{I}{I_0}`} />
                    </div>
                  ),
                },
                {
                  title: "Quitar el logaritmo",
                  detail: (
                    <span>
                      Si <MathTex tex={`M=\\log_{10}(A)`} />, entonces <MathTex tex={`A=10^M`} />.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`${scenario.M}=\\log_{10}\\left(\\frac{I}{I_0}\\right)`} />
                      <MathTex block tex={`\\frac{I}{I_0}=10^{${scenario.M}}`} />
                    </div>
                  ),
                },
                {
                  title: "Interpretar el resultado",
                  detail: (
                    <span>
                      Ese cociente indica cuántas veces mayor es la intensidad.
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
          renderValue={op => <MathTex tex={op.value} />}
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
