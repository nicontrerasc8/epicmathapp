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

type Kind = "Cualitativa" | "Cuantitativa"

type Scenario = {
  variable: string
  exampleValue: string
  kind: Kind
  correct: string
  options: Option[]
}

const VARIABLES: Array<{ variable: string; kind: Kind; exampleGen: () => string }> = [
  { variable: "color del uniforme", kind: "Cualitativa", exampleGen: () => choice(["azul", "blanco", "gris"]) },
  { variable: "número de hermanos", kind: "Cuantitativa", exampleGen: () => String(randInt(0, 6)) },
  { variable: "estatura (cm)", kind: "Cuantitativa", exampleGen: () => String(randInt(135, 185)) },
  { variable: "sección (A, B, C)", kind: "Cualitativa", exampleGen: () => choice(["A", "B", "C"]) },
  { variable: "tiempo de viaje (min)", kind: "Cuantitativa", exampleGen: () => String(randInt(5, 60)) },
]

function generateScenario(): Omit<Scenario, "options"> {
  const v = choice(VARIABLES)
  const exampleValue = v.exampleGen()
  const correct = v.kind
  return {
    variable: v.variable,
    exampleValue,
    kind: v.kind,
    correct,
  }
}

function generateOptions(s: Omit<Scenario, "options">): Option[] {
  const correct = s.correct

  const wrong1 = correct === "Cualitativa" ? "Cuantitativa" : "Cualitativa"
  const wrong2 = "Cualitativa discreta" // distractor típico escolar
  const wrong3 = "Cuantitativa continua" // distractor típico escolar
  const wrong4 = "No es una variable"

  const all = shuffle([
    { value: correct, correct: true },
    { value: wrong1, correct: false },
    { value: wrong2, correct: false },
    { value: wrong3, correct: false },
    { value: wrong4, correct: false },
  ])

  // Evita repetir el correcto si cae igual por casualidad (no debería)
  const seen = new Set<string>()
  const unique: Option[] = []
  for (const o of all) {
    if (seen.has(o.value)) continue
    seen.add(o.value)
    unique.push(o)
  }
  while (unique.length < 5) unique.push({ value: "Cuantitativa (discreta)", correct: false })
  return unique
}

export default function Ej02({
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
          variable: scenario.variable,
          exampleValue: scenario.exampleValue,
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
        title: "Leer qué se observa",
        detail: <span>La variable es la característica que se registra de cada estudiante.</span>,
        icon: Sigma,
        content: (
          <div className="space-y-2">
            <div>
              Variable: <b>{scenario.variable}</b>
            </div>
            <div>
              Ejemplo de dato: <b>{scenario.exampleValue}</b>
            </div>
          </div>
        ),
      },
      {
        title: "Decidir si es numérica o no",
        detail: (
          <span>
            Si se expresa con <b>números</b> y tiene sentido operar (sumar, promediar), es cuantitativa. Si son categorías,
            es cualitativa.
          </span>
        ),
        icon: Divide,
        content: (
          <div className="rounded-lg border bg-background p-3">
            {scenario.kind === "Cuantitativa" ? (
              <div>
                El dato <b>{scenario.exampleValue}</b> es un número que representa una medida/cantidad → <b>Cuantitativa</b>.
              </div>
            ) : (
              <div>
                El dato <b>{scenario.exampleValue}</b> es una categoría (no se promedia) → <b>Cualitativa</b>.
              </div>
            )}
          </div>
        ),
        tip: <span>Si responde “¿cuánto?” suele ser cuantitativa; si responde “¿cuál?” suele ser cualitativa.</span>,
      },
      {
        title: "Conclusión",
        detail: <span>Se clasifica según el tipo de dato que produce.</span>,
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
        title="Ej02 — Tipo de variable"
        prompt={`En el Colegio Cristo Salvador se registra la variable: “${scenario.variable}”. Si para un estudiante se obtiene “${scenario.exampleValue}”, ¿qué tipo de variable es?`}
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