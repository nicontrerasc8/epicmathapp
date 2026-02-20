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
function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr))
}

type Scenario = {
  datos: number[]
  minV: number
  maxV: number
  rango: number
  correct: string
  options: Option[]
}

function generateScenario(): Omit<Scenario, "options"> {
  const n = choice([8, 9, 10, 11])
  const base = randInt(12, 25)

  // hacemos datos con dispersión controlada (para que se vea bonito)
  const datos = Array.from({ length: n }, () => base + randInt(-7, 9))

  const minV = Math.min(...datos)
  const maxV = Math.max(...datos)
  const rango = maxV - minV

  return { datos: shuffle(datos), minV, maxV, rango, correct: String(rango) }
}

function generateOptions(s: Omit<Scenario, "options">): Option[] {
  const correct = s.correct

  const sumWrong = String(s.maxV + s.minV) // confunde con suma
  const maxWrong = String(s.maxV) // confunde con máximo
  const minWrong = String(s.minV) // confunde con mínimo
  const offByOne = String((s.maxV - s.minV) + choice([-1, 1, 2, -2])) // error típico

  const raw = [
    { value: correct, correct: true },
    { value: sumWrong, correct: false },
    { value: maxWrong, correct: false },
    { value: minWrong, correct: false },
    { value: offByOne, correct: false },
  ]

  const values = shuffle(uniq(raw.map(r => r.value))).slice(0, 5)
  const opts: Option[] = values.map(v => ({ value: v, correct: v === correct }))
  while (opts.length < 5) {
    const extra = String(randInt(1, 30))
    if (!opts.some(o => o.value === extra)) opts.push({ value: extra, correct: false })
  }
  return shuffle(opts)
}

export default function Ej08({
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
        question: { datos: scenario.datos },
        computed: { min: scenario.minV, max: scenario.maxV, rango: scenario.rango },
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
        title: "Encontrar mínimo y máximo",
        detail: <span>El rango usa solo el menor y el mayor valor del conjunto.</span>,
        icon: Sigma,
        content: (
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div className="text-sm">
              Datos: <b>{scenario.datos.join(", ")}</b>
            </div>
            <div>Mínimo = <b>{scenario.minV}</b></div>
            <div>Máximo = <b>{scenario.maxV}</b></div>
          </div>
        ),
        tip: <span>Ordenar (mentalmente) ayuda a ver rápido los extremos.</span>,
      },
      {
        title: "Calcular el rango",
        detail: <span>Rango = máximo − mínimo.</span>,
        icon: Divide,
        content: (
          <div className="rounded-lg border bg-background p-3 space-y-1">
            <div>Rango = {scenario.maxV} − ({scenario.minV})</div>
            <div>Rango = <b>{scenario.rango}</b></div>
          </div>
        ),
        tip: <span>Siempre es una resta, no una suma.</span>,
      },
      {
        title: "Respuesta",
        detail: <span>El rango mide cuánto varían los datos entre el menor y el mayor.</span>,
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
        title="Ej08 — Rango"
        prompt={`En el Colegio Cristo Salvador se registraron estos datos: ${scenario.datos.join(
          ", "
        )}. ¿Cuál es el rango?`}
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