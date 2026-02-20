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

type Scenario = {
  prendas1: string
  prendas2: string
  n1: number
  n2: number
  total: number
  correct: string
  options: Option[]
}

const PARES = [
  { p1: "polos", p2: "pantalones" },
  { p1: "gorras", p2: "casacas" },
  { p1: "zapatillas", p2: "medias" },
  { p1: "camisas", p2: "corbatas" },
]

function generateScenario(): Omit<Scenario, "options"> {
  const p = choice(PARES)
  const n1 = randInt(3, 7)
  const n2 = randInt(2, 6)
  const total = n1 * n2
  return { prendas1: p.p1, prendas2: p.p2, n1, n2, total, correct: String(total) }
}

function generateOptions(s: Omit<Scenario, "options">): Option[] {
  const correct = s.correct
  const wrong1 = String(s.n1 + s.n2) // suma (error típico)
  const wrong2 = String(s.n1 * s.n2 + s.n1) // agrega uno
  const wrong3 = String(Math.abs(s.n1 - s.n2)) // diferencia
  const wrong4 = String(s.n1 * (s.n2 + 1)) // aumenta una opción

  const all = shuffle([
    { value: correct, correct: true },
    { value: wrong1, correct: false },
    { value: wrong2, correct: false },
    { value: wrong3, correct: false },
    { value: wrong4, correct: false },
  ])

  const seen = new Set<string>()
  const unique: Option[] = []
  for (const o of all) {
    if (seen.has(o.value)) continue
    seen.add(o.value)
    unique.push(o)
  }
  while (unique.length < 5) unique.push({ value: String(randInt(6, 42)), correct: false })
  return unique
}

export default function Ej10({
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
        question: { n1: scenario.n1, n2: scenario.n2, prendas1: scenario.prendas1, prendas2: scenario.prendas2 },
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
        title: "Identificar las elecciones por etapa",
        detail: <span>Cuando hay dos elecciones independientes, se multiplican las opciones.</span>,
        icon: Sigma,
        content: (
          <div className="rounded-lg border bg-background p-3 space-y-1">
            <div>Opciones de {scenario.prendas1}: <b>{scenario.n1}</b></div>
            <div>Opciones de {scenario.prendas2}: <b>{scenario.n2}</b></div>
          </div>
        ),
        tip: <span>Si eliges 1 de cada grupo, usas el principio multiplicativo.</span>,
      },
      {
        title: "Multiplicar",
        detail: <span>Total de combinaciones = n1 × n2.</span>,
        icon: Divide,
        content: (
          <div className="rounded-lg border bg-background p-3 space-y-1">
            <div>Total = {scenario.n1} × {scenario.n2}</div>
            <div>Total = <b>{scenario.total}</b></div>
          </div>
        ),
        tip: <span>Sumar (n1 + n2) es un error común: sumar sirve cuando eliges “uno u otro”, no ambos.</span>,
      },
      {
        title: "Conclusión",
        detail: <span>El resultado cuenta todas las combinaciones posibles.</span>,
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
        title="Ej10 — Principio multiplicativo"
        prompt={`En el Colegio Cristo Salvador, un estudiante puede elegir 1 ${scenario.prendas1} entre ${scenario.n1} opciones y 1 ${scenario.prendas2} entre ${scenario.n2} opciones. ¿Cuántas combinaciones diferentes puede formar?`}
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