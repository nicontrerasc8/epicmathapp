"use client"

import { useMemo, useState } from "react"
import { Sigma, Divide, ShieldCheck } from "lucide-react"

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

/* ============================================================
  Ej15 — Probabilidad (urna) con fracción simplificada
============================================================ */

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function shuffle<T>(arr: T[]) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const t = x % y
    x = y
    y = t
  }
  return x
}
function simpFrac(n: number, d: number) {
  const g = gcd(n, d)
  return { n: n / g, d: d / g }
}

type Scenario = ReturnType<typeof buildScenario>

function buildScenario(exclude: string[]) {
  for (let tries = 0; tries < 600; tries++) {
    const r = randInt(4, 14)
    const b = randInt(4, 14)
    const g = randInt(3, 12)
    const total = r + b + g

    const event = choice([
      { key: "roja", label: "roja", favorable: r },
      { key: "azul", label: "azul", favorable: b },
      { key: "verde", label: "verde", favorable: g },
      { key: "no_roja", label: "no roja", favorable: b + g },
    ] as const)

    if (event.favorable === 0 || event.favorable === total) continue

    const simp = simpFrac(event.favorable, total)
    const correct = `\\frac{${simp.n}}{${simp.d}}`

    const signature = `r${r}-b${b}-g${g}-e${event.key}`
    if (exclude.includes(signature)) continue

    const notSimplified = `\\frac{${event.favorable}}{${total}}`
    const complement = `\\frac{${total - event.favorable}}{${total}}`
    const wrongTotal = `\\frac{${event.favorable}}{${Math.max(1, total - 1)}}`
    const plusOne = `\\frac{${Math.min(total, event.favorable + 1)}}{${total}}`

    const pool = shuffle([correct, notSimplified, complement, wrongTotal, plusOne])
    const uniq: string[] = []
    for (const v of pool) if (!uniq.includes(v)) uniq.push(v)
    while (uniq.length < 5) uniq.push(`\\frac{${randInt(1, total - 1)}}{${total}}`)

    const options: Option[] = shuffle(uniq.slice(0, 5)).map(v => ({
      value: v,
      correct: v === correct,
    }))

    return { r, b, g, total, event, favorable: event.favorable, simp, correct, signature, options }
  }

  const r = 6,
    b = 8,
    g = 4
  const total = r + b + g
  const favorable = b
  const simp = simpFrac(favorable, total)
  const correct = `\\frac{${simp.n}}{${simp.d}}`
  const signature = "FB15"
  const options: Option[] = shuffle([
    correct,
    `\\frac{${favorable}}{${total}}`,
    `\\frac{${total - favorable}}{${total}}`,
    `\\frac{${favorable}}{${total - 1}}`,
    `\\frac{${favorable + 1}}{${total}}`,
  ]).map(v => ({ value: v, correct: v === correct }))
  return {
    r,
    b,
    g,
    total,
    event: { key: "azul", label: "azul", favorable } as const,
    favorable,
    simp,
    correct,
    signature,
    options,
  }
}

export default function Ej15({
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
  const [history, setHistory] = useState<string[]>([])

  const { elapsed, startedAtRef } = useExerciseTimer(engine.canAnswer, nonce)
  const trophyPreview = useMemo(() => computeTrophyGain(elapsed), [elapsed])

  const scenario = useMemo(() => {
    const recent = history.slice(-12)
    return buildScenario(recent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce])

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
        question: { red: scenario.r, blue: scenario.b, green: scenario.g, event: scenario.event.key },
        options: scenario.options.map(o => o.value),
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setHistory(h => [...h, scenario.signature].slice(-24))
    setNonce(n => n + 1)
  }

  const eventLabel = scenario.event.label

  return (
    <MathProvider>
      <ExerciseShell
        title="Ej15 — Probabilidad (urna)"
        prompt={`En una urna hay ${scenario.r} rojas, ${scenario.b} azules y ${scenario.g} verdes. Si se extrae 1 bola al azar, ¿cuál es la probabilidad de que sea ${eventLabel}?`}
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Resolución"
              steps={[
                {
                  title: "Identificar favorables y posibles",
                  detail: "Probabilidad: P = favorables / posibles.",
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\text{Posibles} = ${scenario.r}+${scenario.b}+${scenario.g} = ${scenario.total}`} />
                      <MathTex block tex={`\\text{Favorables (${eventLabel})} = ${scenario.favorable}`} />
                    </div>
                  ),
                },
                {
                  title: "Formar la fracción y simplificar",
                  detail: "Se forma la fracción y se reduce si tienen un divisor común.",
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`P(${eventLabel}) = \\frac{${scenario.favorable}}{${scenario.total}}`} />
                      <MathTex block tex={`\\frac{${scenario.favorable}}{${scenario.total}} = \\frac{${scenario.simp.n}}{${scenario.simp.d}}`} />
                    </div>
                  ),
                  tip: "La fracción simplificada es equivalente, pero es la forma final esperada.",
                },
                {
                  title: "Respuesta",
                  detail: "La probabilidad correcta es:",
                  icon: ShieldCheck,
                  content: <MathTex block tex={`P(${eventLabel}) = ${scenario.correct}`} />,
                },
              ]}
              concluding={
                <span>
                  Respuesta final: <b><MathTex tex={scenario.correct} /></b>
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Datos</div>
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <MathTex block tex={`\\text{Rojas}=${scenario.r},\\ \\text{Azules}=${scenario.b},\\ \\text{Verdes}=${scenario.g}`} />
            <MathTex block tex={`\\text{Total}=${scenario.total}`} />
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