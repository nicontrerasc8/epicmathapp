"use client"

import { useMemo, useState } from "react"
import { ShieldCheck, Sigma, Divide } from "lucide-react"

import { useExerciseEngine } from "@/lib/exercises/useExerciseEngine"
import { useExerciseSubmission } from "@/lib/exercises/useExerciseSubmission"
import { useExerciseTimer } from "@/lib/exercises/useExerciseTimer"
import { computeTrophyGain, WRONG_PENALTY } from "@/lib/exercises/gamification"

import { Option, OptionsGrid } from "@/components/exercises/base/OptionsGrid"
import { MathProvider } from "@/components/exercises/base/MathBlock"
import { ExerciseHud } from "@/components/exercises/base/ExerciseHud"
import { SolutionBox } from "@/components/exercises/base/SolutionBox"
import { ExerciseShell } from "@/components/exercises/base/ExerciseShell"
import { DetailedExplanation } from "@/components/exercises/base/DetailedExplanation"

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
function frac(n: number, d: number) {
  const g = gcd(n, d)
  return `${n / g}/${d / g}`
}

type Scenario = {
  contexto: string
  total: number
  favorables: number
  correct: string
  options: Option[]
}

const CONTEXTS = [
  { contexto: "sacan una ficha roja", item: "roja" },
  { contexto: "eligen una tarjeta azul", item: "azul" },
  { contexto: "toman una bolita verde", item: "verde" },
]

function generateScenario(): Omit<Scenario, "options"> {
  const c = choice(CONTEXTS)

  // total 10–20, favorables 2–(total-2)
  const total = randInt(10, 20)
  const favorables = randInt(2, total - 2)

  const correct = frac(favorables, total)
  return { contexto: c.contexto, total, favorables, correct }
}

function generateOptions(s: Omit<Scenario, "options">): Option[] {
  const correct = s.correct
  const inv = frac(s.total, s.favorables) // error: invierte
  const plus = frac(s.favorables + 1, s.total) // error +1
  const minus = frac(Math.max(1, s.favorables - 1), s.total) // error -1
  const wrongDen = frac(s.favorables, s.total - 1) // cambia total

  const all = shuffle([
    { value: correct, correct: true },
    { value: inv, correct: false },
    { value: plus, correct: false },
    { value: minus, correct: false },
    { value: wrongDen, correct: false },
  ])

  const seen = new Set<string>()
  const unique: Option[] = []
  for (const o of all) {
    if (seen.has(o.value)) continue
    seen.add(o.value)
    unique.push(o)
  }
  while (unique.length < 5) unique.push({ value: frac(randInt(1, 9), randInt(10, 20)), correct: false })
  return unique
}

export default function Ej09({
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
  const trophyPreview = useMemo(() => computeTrophyGain(elapsed), [elapsed])

  const scenario = useMemo(() => {
    const base = generateScenario()
    return { ...base, options: generateOptions(base) }
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
        question: { total: scenario.total, favorables: scenario.favorables, contexto: scenario.contexto },
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

  const explanation = {
    steps: [
      {
        title: "Identificar casos favorables y posibles",
        detail: <span>Probabilidad = favorables / total de posibles.</span>,
        icon: Sigma,
        content: (
          <div className="rounded-lg border bg-background p-3 space-y-1">
            <div>Total de casos posibles: <b>{scenario.total}</b></div>
            <div>Casos favorables: <b>{scenario.favorables}</b></div>
          </div>
        ),
        tip: <span>El denominador siempre es el total de resultados posibles.</span>,
      },
      {
        title: "Formar la fracción y simplificar",
        detail: <span>Escribimos la fracción y reducimos si se puede.</span>,
        icon: Divide,
        content: (
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div>P = {scenario.favorables}/{scenario.total}</div>
            <div>Fracción simplificada: <b>{scenario.correct}</b></div>
          </div>
        ),
        tip: <span>No inviertas la fracción: eso cambia completamente el resultado.</span>,
      },
      {
        title: "Conclusión",
        detail: <span>La probabilidad es un número entre 0 y 1 expresado como fracción.</span>,
        icon: ShieldCheck,
        content: (
          <div className="rounded-lg border bg-background p-3">
            Respuesta: <b>{scenario.correct}</b>
          </div>
        ),
      },
    ],
    concluding: scenario.correct,
  }

  return (
    <MathProvider>
      <ExerciseShell
        title="Ej09 — Probabilidad simple"
        prompt={`En una actividad del Colegio Cristo Salvador, hay ${scenario.total} elementos en total y ${scenario.favorables} cumplen la condición. Si ${scenario.contexto}, ¿cuál es la probabilidad? (responde como fracción simplificada)`}
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Explicación paso a paso"
              steps={explanation.steps}
              concluding={<span>Respuesta final: <b>{explanation.concluding}</b></span>}
            />
          </SolutionBox>
        }
      >
        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={(op) => <span>{op.value}</span>}
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