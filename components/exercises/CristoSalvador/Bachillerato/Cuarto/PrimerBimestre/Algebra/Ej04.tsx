"use client"

import { useMemo, useState } from "react"
import { Sigma } from "lucide-react"

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

function decimalString(m: number, e: number) {
  const value = m * Math.pow(10, e)
  const decimals = e < 0 ? Math.max(1, Math.abs(e) + 1) : 0
  return value.toFixed(decimals)
}

function scientificTex(m: number, e: number) {
  return `${m} \\times 10^{${e}}`
}

function shiftDecimal(raw: string, shift: number) {
  const negative = raw.startsWith("-")
  const digits = raw.replace("-", "").replace(".", "")
  const dotIndex = raw.includes(".") ? raw.indexOf(".") : raw.length
  let newIndex = dotIndex + shift
  let nextDigits = digits

  if (newIndex <= 0) {
    nextDigits = `${"0".repeat(Math.abs(newIndex))}${nextDigits}`
    newIndex = 0
  } else if (newIndex >= nextDigits.length) {
    nextDigits = `${nextDigits}${"0".repeat(newIndex - nextDigits.length)}`
  }

  const result =
    newIndex === 0
      ? `0.${nextDigits}`
      : newIndex >= nextDigits.length
        ? nextDigits
        : `${nextDigits.slice(0, newIndex)}.${nextDigits.slice(newIndex)}`

  return negative ? `-${result}` : result
}

function uniqueWrongAnswers(correct: string, rawMantissa: string, exponent: number) {
  const candidates = [
    shiftDecimal(rawMantissa, exponent + 1),
    shiftDecimal(rawMantissa, exponent - 1),
    rawMantissa.replace(".", ""),
    rawMantissa,
    correct.startsWith("0.") ? correct.replace("0.", "0.0") : `0.${correct}`,
    exponent < 0 ? correct.replace(".", "") : `${correct}.0`,
    shiftDecimal(rawMantissa, -exponent),
  ]

  const seen = new Set<string>([correct])
  const values: string[] = []

  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) continue
    seen.add(candidate)
    values.push(candidate)
  }

  while (values.length < 4) {
    const extra = shiftDecimal(rawMantissa, exponent + randInt(-3, 3))
    if (!seen.has(extra)) {
      seen.add(extra)
      values.push(extra)
    }
  }

  return values.slice(0, 4)
}

/* =========================
   GENERADOR
========================= */

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  const mantissas = [1.2, 2.3, 3.7, 4.5, 5.2, 6.8, 7.1, 8.4, 9.06]
  const questionStyle = choice(["masa", "numero", "decimal"] as const)
  const m = choice(mantissas)
  const e = choice([-9, -8, -7, -6, -5, -4, -3, 2, 3, 4])
  const rawMantissa = m.toString()
  const correctDecimal = decimalString(m, e)

  return {
    m,
    e,
    rawMantissa,
    questionStyle,
    correctDecimal,
    scientificTex: scientificTex(m, e),
  }
}

function generateOptions(s: Scenario): Option[] {
  const wrongAnswers = uniqueWrongAnswers(s.correctDecimal, s.rawMantissa, s.e)
  return shuffle([
    { value: s.correctDecimal, correct: true },
    ...wrongAnswers.map(value => ({ value, correct: false })),
  ])
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function Ej04MasaDecimal({
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
    return {
      ...s,
      options: generateOptions(s),
    }
  }, [nonce])

  const shiftPlaces = Math.abs(scenario.e)
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
        correctAnswer: scenario.correctDecimal,
        question: {
          m: scenario.m,
          e: scenario.e,
          questionStyle: scenario.questionStyle,
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

  const promptText =
    scenario.questionStyle === "numero"
      ? "Escribe este número en forma decimal."
      : scenario.questionStyle === "decimal"
        ? "¿Cuál es la expresión equivalente en notación decimal?"
        : "¿Cuál es su masa en forma decimal?"

  const detailText =
    scenario.e < 0
      ? `Como el exponente es ${scenario.e}, movemos el punto ${shiftPlaces} lugares hacia la izquierda.`
      : `Como el exponente es ${scenario.e}, movemos el punto ${shiftPlaces} lugares hacia la derecha.`

  return (
    <MathProvider>
      <ExerciseShell
        title="Notación científica"
        prompt={promptText}
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Conversión paso a paso"
              steps={[
                {
                  title: "Identificar el exponente",
                  icon: Sigma,
                  content: <MathTex block tex={scenario.scientificTex} />,
                  detail: <span>{detailText}</span>,
                },
                {
                  title: "Mover el punto decimal",
                  content: <MathTex block tex={`= ${scenario.correctDecimal}`} />,
                  detail: (
                    <span>
                      Partimos de <b>{scenario.rawMantissa}</b> y desplazamos el punto decimal.
                    </span>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta: <b>{scenario.correctDecimal}</b>
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3">
            <MathTex block tex={scenario.scientificTex} />
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
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
