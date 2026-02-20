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
  datos: number[]
  ordenados: number[]
  mediana: string
  correct: string
  options: Option[]
}

function median(nums: number[]) {
  const a = [...nums].sort((x, y) => x - y)
  const n = a.length
  if (n % 2 === 1) return { sorted: a, med: a[Math.floor(n / 2)], medStr: String(a[Math.floor(n / 2)]) }
  const mid1 = a[n / 2 - 1]
  const mid2 = a[n / 2]
  const med = (mid1 + mid2) / 2
  const medStr = med.toFixed(1).endsWith(".0") ? String(Math.round(med)) : med.toFixed(1)
  return { sorted: a, med, medStr, mid1, mid2 }
}

function generateScenario(): Omit<Scenario, "options"> {
  const n = choice([5, 6, 7, 8]) // pares e impares
  const datos = Array.from({ length: n }, () => randInt(8, 22))
  const m = median(datos)

  let medianaExplain = ""
  if (n % 2 === 1) {
    medianaExplain = `Como hay ${n} datos (impar), la mediana es el valor central: ${m.medStr}.`
  } else {
    medianaExplain = `Como hay ${n} datos (par), la mediana es el promedio de los dos centrales: ${m.mid1} y ${m.mid2}.`
  }

  return {
    datos,
    ordenados: m.sorted,
    mediana: medianaExplain,
    correct: m.medStr,
  }
}

function generateOptions(s: Omit<Scenario, "options">): Option[] {
  const correct = s.correct
  const sorted = s.ordenados
  const n = sorted.length

  const wrong1 = String(sorted[0]) // mínimo
  const wrong2 = String(sorted[n - 1]) // máximo

  // errores típicos: tomar "del medio" sin ordenar / tomar uno de los dos centrales mal
  const wrong3 = String(s.datos[Math.floor(n / 2)])
  const wrong4 = n % 2 === 0 ? String(sorted[n / 2]) : String(sorted[Math.floor(n / 2)] + 1)

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
  while (unique.length < 5) unique.push({ value: String(randInt(8, 22)), correct: false })
  return unique
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
        detail: <span>La mediana se encuentra con los datos ordenados de menor a mayor.</span>,
        icon: Sigma,
        content: (
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div>Datos: <b>{scenario.datos.join(", ")}</b></div>
            <div>Ordenados: <b>{scenario.ordenados.join(", ")}</b></div>
          </div>
        ),
        tip: <span>Si no ordenas, puedes elegir un “centro” incorrecto.</span>,
      },
      {
        title: "Tomar el/los valor(es) central(es)",
        detail: <span>Si n es impar: un centro. Si n es par: promedio de dos centros.</span>,
        icon: Divide,
        content: (
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div>{scenario.mediana}</div>
            <div>Mediana = <b>{scenario.correct}</b></div>
          </div>
        ),
        tip: <span>Centro significa “misma cantidad a la izquierda y a la derecha”.</span>,
      },
      {
        title: "Conclusión",
        detail: <span>La mediana divide el conjunto en dos mitades.</span>,
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
        title="Ej06 — Mediana"
        prompt={`En el Colegio Cristo Salvador se registraron ${n} valores: ${scenario.datos.join(
          ", "
        )}. ¿Cuál es la mediana?`}
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