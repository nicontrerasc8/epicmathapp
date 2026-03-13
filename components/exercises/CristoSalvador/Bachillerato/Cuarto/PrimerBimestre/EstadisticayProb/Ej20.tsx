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

function choice<T>(arr: readonly T[]) {
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

type EventType = "sum_eq" | "sum_ge" | "sum_le" | "sum_even"

function countFavorable(type: EventType, target: number) {
  let c = 0
  for (let i = 1; i <= 6; i++) {
    for (let j = 1; j <= 6; j++) {
      const s = i + j
      if (type === "sum_eq" && s === target) c++
      if (type === "sum_ge" && s >= target) c++
      if (type === "sum_le" && s <= target) c++
      if (type === "sum_even" && s % 2 === 0) c++
    }
  }
  return c
}

type Scenario = ReturnType<typeof buildScenario>

function buildScenario(exclude: string[]) {
  const kinds: EventType[] = ["sum_eq", "sum_ge", "sum_le", "sum_even"]
  for (let tries = 0; tries < 700; tries++) {
    const type = choice(kinds)
    const target =
      type === "sum_eq"
        ? choice([4, 5, 6, 7, 8, 9, 10, 11] as const)
        : type === "sum_ge"
          ? choice([7, 8, 9, 10] as const)
          : type === "sum_le"
            ? choice([4, 5, 6, 7] as const)
            : 0

    const favorable = countFavorable(type, target)
    const total = 36
    const simp = simpFrac(favorable, total)
    const correct = `\\frac{${simp.n}}{${simp.d}}`
    const signature = `${type}-${target}-${favorable}-${simp.n}/${simp.d}`
    if (exclude.includes(signature)) continue

    const wrong1 = `\\frac{${favorable}}{36}` // sin simplificar
    const wrong2 = `\\frac{${Math.max(1, favorable - 1)}}{36}`
    const wrong3 = `\\frac{${Math.min(35, favorable + 1)}}{36}`
    const wrong4 = type === "sum_even" ? `\\frac{1}{3}` : `\\frac{1}{6}`

    const pool = shuffle([correct, wrong1, wrong2, wrong3, wrong4])
    const uniq: string[] = []
    for (const value of pool) if (!uniq.includes(value)) uniq.push(value)

    while (uniq.length < 5) {
      const a = choice([1, 2, 3, 4, 5, 6] as const)
      const b = choice([6, 12, 18, 24, 36] as const)
      const s = simpFrac(a, b)
      const tex = `\\frac{${s.n}}{${s.d}}`
      if (!uniq.includes(tex)) uniq.push(tex)
    }

    const options: Option[] = shuffle(uniq.slice(0, 5)).map(value => ({
      value,
      correct: value === correct,
    }))

    const promptText =
      type === "sum_eq"
        ? `Se lanzan 2 dados. Halla la probabilidad de que la suma sea ${target}.`
        : type === "sum_ge"
          ? `Se lanzan 2 dados. Halla la probabilidad de que la suma sea al menos ${target}.`
          : type === "sum_le"
            ? `Se lanzan 2 dados. Halla la probabilidad de que la suma sea a lo más ${target}.`
            : `Se lanzan 2 dados. Halla la probabilidad de obtener una suma par.`

    const eventTex =
      type === "sum_eq"
        ? `\\text{Evento: } i+j=${target}`
        : type === "sum_ge"
          ? `\\text{Evento: } i+j\\ge ${target}`
          : type === "sum_le"
            ? `\\text{Evento: } i+j\\le ${target}`
            : `\\text{Evento: } i+j\\text{ es par}`

    return { type, target, favorable, total, simp, correct, signature, options, promptText, eventTex }
  }

  const type: EventType = "sum_eq"
  const target = 7
  const favorable = countFavorable(type, target)
  const total = 36
  const simp = simpFrac(favorable, total)
  const correct = `\\frac{${simp.n}}{${simp.d}}`
  const options: Option[] = shuffle([correct, "\\frac{6}{36}", "\\frac{5}{36}", "\\frac{7}{36}", "\\frac{1}{3}"]).map(value => ({
    value,
    correct: value === correct,
  }))
  return {
    type,
    target,
    favorable,
    total,
    simp,
    correct,
    signature: "FB20",
    options,
    promptText: `Se lanzan 2 dados. Halla la probabilidad de que la suma sea 7.`,
    eventTex: `\\text{Evento: } i+j=7`,
  }
}

export default function Ej20({
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
    const recent = history.slice(-14)
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
        question: {
          experiment: "2 dados",
          eventType: scenario.type,
          target: scenario.target,
          total: scenario.total,
        },
        computed: {
          favorable: scenario.favorable,
          simplified: scenario.simp,
        },
        options: scenario.options.map(o => o.value),
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setHistory(h => [...h, scenario.signature].slice(-28))
    setNonce(n => n + 1)
  }

  return (
    <MathProvider>
      <ExerciseShell
        title="Probabilidad con 2 dados"
        prompt={scenario.promptText}
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
                  title: "Definir casos posibles",
                  detail: <span>Dos dados generan 36 resultados equiprobables.</span>,
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\text{Posibles}=6\\cdot 6=36`} />
                      <MathTex block tex={scenario.eventTex} />
                    </div>
                  ),
                },
                {
                  title: "Contar casos favorables",
                  detail: <span>Contamos los resultados que cumplen el evento.</span>,
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\text{Favorables}=${scenario.favorable}`} />
                      <MathTex block tex={`P=\\frac{${scenario.favorable}}{36}`} />
                    </div>
                  ),
                },
                {
                  title: "Simplificar",
                  detail: <span>Reducimos la fracción a su mínima expresión.</span>,
                  icon: ShieldCheck,
                  content: <MathTex block tex={`P=${scenario.correct}`} />,
                },
              ]}
              concluding={
                <span>
                  Respuesta final: <b><MathTex tex={scenario.correct} /></b>.
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <MathTex block tex={scenario.eventTex} />
            <MathTex block tex={`\\text{Posibles}=36`} />
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
