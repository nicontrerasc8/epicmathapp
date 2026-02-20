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

type Scenario = {
  grado: string
  poblacion: number
  muestra: number
  correct: string
  options: Option[]
}

function generateScenario(): Omit<Scenario, "options"> {
  const grado = choice(["4.º", "5.º", "3.º"])
  const poblacion = randInt(80, 180)
  const muestra = randInt(18, Math.min(45, poblacion - 1))

  return {
    grado,
    poblacion,
    muestra,
    correct: `La muestra es ${muestra} estudiantes.`,
  }
}

function generateOptions(s: Omit<Scenario, "options">): Option[] {
  const correct = s.correct

  const wrong1 = `La muestra es ${s.poblacion} estudiantes.` // confunde con población
  const wrong2 = `La población es ${s.muestra} estudiantes.` // invierte
  const wrong3 = `La población es ${s.poblacion + s.muestra} estudiantes.` // suma rara
  const wrong4 = `La muestra es ${Math.max(1, s.muestra - randInt(1, 4))} estudiantes.` // cercano

  const all: Option[] = shuffle([
    { value: correct, correct: true },
    { value: wrong1, correct: false },
    { value: wrong2, correct: false },
    { value: wrong3, correct: false },
    { value: wrong4, correct: false },
  ])

  // evita duplicados raros
  const seen = new Set<string>()
  const unique: Option[] = []
  for (const o of all) {
    if (seen.has(o.value)) continue
    seen.add(o.value)
    unique.push(o)
  }
  while (unique.length < 5) {
    unique.push({ value: `La muestra es ${s.muestra + randInt(1, 6)} estudiantes.`, correct: false })
  }

  return unique
}

export default function Ej01({
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
        question: {
          grado: scenario.grado,
          poblacion: scenario.poblacion,
          muestra: scenario.muestra,
        },
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
        title: "Identificar la población",
        detail: <span>La <b>población</b> es el grupo total que se desea estudiar.</span>,
        icon: Sigma,
        content: (
          <div className="space-y-2">
            <div>En el {scenario.grado} hay <b>{scenario.poblacion}</b> estudiantes en total.</div>
            <div className="rounded-lg border bg-background p-3">
              <b>Población:</b> {scenario.poblacion} estudiantes
            </div>
          </div>
        ),
        tip: <span>Palabras clave: “total”, “todos”, “completo”.</span>,
      },
      {
        title: "Identificar la muestra",
        detail: <span>La <b>muestra</b> es la parte seleccionada para encuestar u observar.</span>,
        icon: ShieldCheck,
        content: (
          <div className="space-y-2">
            <div>Se seleccionó a <b>{scenario.muestra}</b> estudiantes para la encuesta.</div>
            <div className="rounded-lg border bg-background p-3">
              <b>Muestra:</b> {scenario.muestra} estudiantes
            </div>
          </div>
        ),
        tip: <span>Palabras clave: “se elige”, “se selecciona”, “se encuesta a”.</span>,
      },
    ],
    concluding: scenario.correct,
  }

  return (
    <MathProvider>
      <ExerciseShell
        title="Ej01 — Población y muestra"
        prompt={`En el ${scenario.grado} del Colegio Cristo Salvador hay ${scenario.poblacion} estudiantes. Se elige al azar a ${scenario.muestra} para una encuesta. ¿Cuál es la muestra?`}
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