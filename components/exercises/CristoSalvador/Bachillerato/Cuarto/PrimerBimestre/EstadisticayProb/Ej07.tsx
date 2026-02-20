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
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function countsMap(nums: number[]) {
  const m = new Map<number, number>()
  for (const x of nums) m.set(x, (m.get(x) ?? 0) + 1)
  return m
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr))
}

/* =========================
   SCENARIO
========================= */
type Scenario = {
  datos: number[]
  moda: number
  freqModa: number
  tabla: Array<{ v: number; f: number }>
  correct: string
  options: Option[]
}

function generateScenario(): Omit<Scenario, "options"> {
  // Construimos un set base (4 valores distintos)
  const baseVals = shuffle([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]).slice(0, 4)
  const moda = choice(baseVals)
  const otros = baseVals.filter(v => v !== moda)

  // frecuencia moda: 4 o 5 (para que sea única con claridad)
  const fModa = choice([4, 5])

  const datos: number[] = []

  // mete moda repetida
  for (let i = 0; i < fModa; i++) datos.push(moda)

  // mete otros con freq 1 o 2 (nunca iguala a fModa)
  for (const v of otros) {
    const f = choice([1, 2])
    for (let i = 0; i < f; i++) datos.push(v)
  }

  // si quedó muy corto, agregamos más de "otros" cuidando NO empatar la moda
  const targetLen = choice([10, 11, 12])
  let guard = 0
  while (datos.length < targetLen && guard < 200) {
    guard++
    const v = choice(otros)
    const current = datos.filter(x => x === v).length
    if (current + 1 >= fModa) continue
    datos.push(v)
  }

  const shuffled = shuffle(datos)
  const cmap = countsMap(shuffled)

  // ✅ FIX: NO usamos for..of sobre cmap.entries()
  const entries = Array.from(cmap.entries()) // [number, number][]
  const tabla = entries
    .map(([v, f]) => ({ v, f }))
    .sort((a, b) => a.v - b.v)

  const freqModa = (cmap.get(moda) ?? 0)

  return {
    datos: shuffled,
    moda,
    freqModa,
    tabla,
    correct: String(moda),
  }
}

function generateOptions(s: Omit<Scenario, "options">): Option[] {
  const correct = s.correct
  const nums = s.datos

  const minV = Math.min(...nums)
  const maxV = Math.max(...nums)
  const sum = nums.reduce((a, b) => a + b, 0)
  const avg = sum / nums.length
  const avgStr = avg.toFixed(1).endsWith(".0") ? String(Math.round(avg)) : avg.toFixed(1)

  const near = String(Number(correct) + choice([-2, -1, 1, 2]))

  const raw = [
    { value: correct, correct: true },
    { value: String(minV), correct: false },
    { value: String(maxV), correct: false },
    { value: avgStr, correct: false },
    { value: near, correct: false },
  ]

  const values = shuffle(uniq(raw.map(r => r.value))).slice(0, 5)

  // reconstruye manteniendo la correcta
  const opts: Option[] = values.map(v => ({ value: v, correct: v === correct }))
  while (opts.length < 5) {
    const extra = String(randInt(10, 22))
    if (!opts.some(o => o.value === extra)) opts.push({ value: extra, correct: false })
  }

  return shuffle(opts)
}

/* =========================
   COMPONENT
========================= */
export default function Ej07({
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
        computed: { tabla: scenario.tabla, moda: scenario.moda, freqModa: scenario.freqModa },
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
        title: "Contar repeticiones",
        detail: <span>La moda es el valor que aparece más veces. Por eso contamos frecuencias.</span>,
        icon: Sigma,
        content: (
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div className="text-sm">
              Datos: <b>{scenario.datos.join(", ")}</b>
            </div>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              {scenario.tabla.map(r => (
                <div key={r.v} className="rounded border bg-white p-2 flex justify-between">
                  <span>{r.v}</span>
                  <b>f={r.f}</b>
                </div>
              ))}
            </div>
          </div>
        ),
        tip: <span>No confundas: promedio ≠ moda.</span>,
      },
      {
        title: "Elegir la frecuencia mayor",
        detail: <span>El valor con la frecuencia más alta es la moda.</span>,
        icon: Divide,
        content: (
          <div className="rounded-lg border bg-background p-3 space-y-1">
            <div>La mayor frecuencia es <b>{scenario.freqModa}</b>.</div>
            <div>Corresponde al valor <b>{scenario.moda}</b>.</div>
          </div>
        ),
        tip: <span>Si dos valores empatan, habría dos modas. Aquí es una sola.</span>,
      },
      {
        title: "Respuesta",
        detail: <span>La moda resume el valor más común.</span>,
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
        title="Ej07 — Moda"
        prompt={`En el Colegio Cristo Salvador se registraron estos valores: ${scenario.datos.join(
          ", "
        )}. ¿Cuál es la moda?`}
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