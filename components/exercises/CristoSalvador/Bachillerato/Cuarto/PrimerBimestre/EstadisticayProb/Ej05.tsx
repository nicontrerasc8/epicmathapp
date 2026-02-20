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
function mean(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

type Scenario = {
  datos: number[]
  contexto: string
  correct: string
  options: Option[]
}

function generateScenario(): Omit<Scenario, "options"> {
  const n = choice([4, 5, 6])
  const datos = Array.from({ length: n }, () => randInt(10, 20)) // notas
  const contexto = choice(["notas de una práctica", "puntos en un quiz", "calificaciones de tareas"])
  const m = mean(datos)
  const correct = m.toFixed(1).endsWith(".0") ? String(Math.round(m)) : m.toFixed(1)
  return { datos, contexto, correct }
}

function generateOptions(s: Omit<Scenario, "options">): Option[] {
  const correct = s.correct
  const nums = s.datos
  const total = nums.reduce((a, b) => a + b, 0)
  const n = nums.length
  const m = total / n

  const wrong1 = String(total) // suma
  const wrong2 = String(n) // cantidad de datos
  const wrong3 = (m + 1).toFixed(1).endsWith(".0") ? String(Math.round(m + 1)) : (m + 1).toFixed(1)
  const wrong4 = (m - 1).toFixed(1).endsWith(".0") ? String(Math.round(m - 1)) : (m - 1).toFixed(1)

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
  while (unique.length < 5) unique.push({ value: String(randInt(10, 20)), correct: false })
  return unique
}

export default function Ej05({
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
        question: { datos: scenario.datos, contexto: scenario.contexto },
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

  const total = scenario.datos.reduce((a, b) => a + b, 0)
  const n = scenario.datos.length
  const m = total / n

  const explanation = {
    steps: [
      {
        title: "Sumar los datos",
        detail: <span>Para la media (promedio), primero sumamos todos los valores.</span>,
        icon: Sigma,
        content: (
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div>Datos: <b>{scenario.datos.join(", ")}</b></div>
            <div>Suma total = <b>{total}</b></div>
          </div>
        ),
        tip: <span>No confundas promedio con “el número que más se repite” (moda).</span>,
      },
      {
        title: "Dividir entre la cantidad de datos",
        detail: <span>Media = (suma total) / (cantidad de datos).</span>,
        icon: Divide,
        content: (
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div>Cantidad de datos: <b>{n}</b></div>
            <div>
              Media = {total} / {n} = <b>{m.toFixed(2)}</b> ≈ <b>{scenario.correct}</b>
            </div>
          </div>
        ),
        tip: <span>Si hay decimal, lo dejamos con 1 decimal o redondeo simple.</span>,
      },
      {
        title: "Conclusión",
        detail: <span>El promedio resume el “valor típico” del conjunto.</span>,
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
        title="Ej05 — Media (promedio)"
        prompt={`En el Colegio Cristo Salvador se registraron estas ${scenario.contexto}: ${scenario.datos.join(
          ", "
        )}. ¿Cuál es la media?`}
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