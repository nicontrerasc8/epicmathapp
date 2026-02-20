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
function pct(n: number) {
  return `${Math.round(n)}%`
}

type Scenario = {
  total: number
  favorables: number
  contexto: string
  correct: string
  options: Option[]
}

function generateScenario(): Omit<Scenario, "options"> {
  const total = randInt(25, 45)
  const favorables = randInt(6, total - 5)

  const contexto = choice([
    "prefieren recreo deportivo",
    "llegan en bus",
    "prefieren clases en la mañana",
    "eligen fútbol en educación física",
  ])

  const rel = (favorables / total) * 100
  const correct = pct(rel)

  return { total, favorables, contexto, correct }
}

function generateOptions(s: Omit<Scenario, "options">): Option[] {
  const correct = s.correct

  // errores típicos
  const wrong1 = pct((s.total / s.favorables) * 100) // invierte
  const wrong2 = pct(((s.favorables + 1) / s.total) * 100)
  const wrong3 = pct(((s.favorables - 1) / s.total) * 100)
  const wrong4 = pct((s.favorables / (s.total + 5)) * 100)

  const all: Option[] = shuffle([
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
  while (unique.length < 5) unique.push({ value: pct(randInt(5, 95)), correct: false })
  return unique
}

export default function Ej04({
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

  const rel = (scenario.favorables / scenario.total) * 100

  const explanation = {
    steps: [
      {
        title: "Identificar total y favorables",
        detail: <span>Para frecuencia relativa usamos: (favorables / total) × 100.</span>,
        icon: Sigma,
        content: (
          <div className="rounded-lg border bg-background p-3 space-y-1">
            <div>Total: <b>{scenario.total}</b></div>
            <div>Favorables: <b>{scenario.favorables}</b></div>
          </div>
        ),
        tip: <span>“Favorables” es el grupo que cumple la condición.</span>,
      },
      {
        title: "Aplicar la fórmula",
        detail: <span>Convertimos la fracción a porcentaje multiplicando por 100.</span>,
        icon: Divide,
        content: (
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div>
              Frecuencia relativa = <b>{scenario.favorables}</b> / <b>{scenario.total}</b> × 100
            </div>
            <div>
              = {scenario.favorables}/{scenario.total} × 100 ≈ <b>{Math.round(rel)}%</b>
            </div>
          </div>
        ),
        tip: <span>Si inviertes la fracción, el porcentaje se dispara y sale mal.</span>,
      },
      {
        title: "Conclusión",
        detail: <span>El porcentaje representa qué parte del total cumple la condición.</span>,
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
        title="Ej04 — Frecuencia relativa (%)"
        prompt={`En el Colegio Cristo Salvador, de ${scenario.total} estudiantes, ${scenario.favorables} ${scenario.contexto}. ¿Qué porcentaje representa?`}
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