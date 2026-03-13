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

function choice<T>(arr: readonly T[]): T {
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
  contexto: string
  datos: number[]
  ordenados: number[]
  medianaText: string
  correct: string
  options: Option[]
}

function median(nums: number[]) {
  const sorted = [...nums].sort((a, b) => a - b)
  const n = sorted.length
  if (n % 2 === 1) {
    const center = sorted[Math.floor(n / 2)]
    return { sorted, medStr: String(center), detail: `Como hay ${n} datos (impar), la mediana es el valor central: ${center}.` }
  }

  const left = sorted[n / 2 - 1]
  const right = sorted[n / 2]
  const med = (left + right) / 2
  const medStr = med % 1 === 0 ? String(med) : med.toFixed(1)
  return { sorted, medStr, detail: `Como hay ${n} datos (par), la mediana es el promedio de ${left} y ${right}.` }
}

function generateBase() {
  const n = choice([5, 6, 7, 8, 9, 10] as const)
  const range = choice([
    { min: 8, max: 22 },
    { min: 10, max: 30 },
    { min: 20, max: 45 },
  ] as const)

  const contexto = choice([
    "tiempos (minutos) de una actividad",
    "puntajes en una práctica",
    "edades registradas en un grupo",
    "distancias (km) recorridas",
  ] as const)

  const datos = Array.from({ length: n }, () => randInt(range.min, range.max))
  const m = median(datos)
  return {
    contexto,
    datos,
    ordenados: m.sorted,
    medianaText: m.detail,
    correct: m.medStr,
  }
}

function generateOptions(base: Omit<Scenario, "options">): Option[] {
  const sorted = base.ordenados
  const n = sorted.length
  const correct = base.correct
  const asNum = Number(correct)

  const wrongMin = sorted[0]
  const wrongMax = sorted[n - 1]
  const wrongUnsortedMiddle = base.datos[Math.floor(n / 2)]
  const wrongCenterOnly = n % 2 === 0 ? sorted[n / 2] : sorted[Math.floor(n / 2)] + 1
  const wrongNeighbor = asNum + choice([-2, -1, 1, 2] as const)

  const candidates = [asNum, wrongMin, wrongMax, wrongUnsortedMiddle, wrongCenterOnly, wrongNeighbor]
  const seen = new Set<number>()
  const unique: number[] = []

  for (const value of shuffle(candidates)) {
    if (seen.has(value)) continue
    seen.add(value)
    unique.push(value)
  }

  while (unique.length < 5) {
    const extra = randInt(sorted[0], sorted[n - 1] + 3)
    if (!seen.has(extra)) {
      seen.add(extra)
      unique.push(extra)
    }
  }

  return shuffle(unique.slice(0, 5)).map(value => ({
    value: value % 1 === 0 ? String(value) : value.toFixed(1),
    correct: value === asNum,
  }))
}

export default function Ej06({
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
    const base = generateBase()
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
        question: { contexto: scenario.contexto, datos: scenario.datos },
        computed: { ordenados: scenario.ordenados },
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

  const n = scenario.datos.length

  const explanation = {
    steps: [
      {
        title: "Ordenar los datos",
        detail: <span>La mediana siempre se calcula con la lista ordenada de menor a mayor.</span>,
        icon: Sigma,
        content: (
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div>Datos: <b>{scenario.datos.join(", ")}</b></div>
            <div>Ordenados: <b>{scenario.ordenados.join(", ")}</b></div>
          </div>
        ),
      },
      {
        title: "Tomar el valor central",
        detail: <span>Si hay cantidad impar, es un solo valor; si hay par, es el promedio de dos valores centrales.</span>,
        icon: Divide,
        content: (
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div>{scenario.medianaText}</div>
            <div>Mediana = <b>{scenario.correct}</b></div>
          </div>
        ),
      },
      {
        title: "Conclusión",
        detail: <span>Esa mediana divide el conjunto en dos mitades.</span>,
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
        title="Mediana"
        prompt={`En el Colegio Cristo Salvador se registraron ${n} valores de ${scenario.contexto}: ${scenario.datos.join(", ")}. ¿Cuál es la mediana?`}
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
          renderValue={op => <span>{op.value}</span>}
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
