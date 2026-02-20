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
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

type Row = { categoria: string; f: number }
type Scenario = {
  tema: string
  rows: Row[]
  ask: string
  correct: string
  options: Option[]
}

const TEMAS = [
  { tema: "medio de transporte", cats: ["a pie", "bus", "auto", "bicicleta"] },
  { tema: "deporte favorito", cats: ["fútbol", "vóley", "básquet", "natación"] },
  { tema: "color preferido", cats: ["azul", "rojo", "verde", "negro"] },
]

function generateScenario(): Omit<Scenario, "options"> {
  const t = choice(TEMAS)
  const cats = shuffle(t.cats)

  // frecuencias “bonitas”
  const f1 = randInt(6, 18)
  const f2 = randInt(6, 18)
  const f3 = randInt(6, 18)
  const f4 = randInt(6, 18)
  const rows: Row[] = [
    { categoria: cats[0], f: f1 },
    { categoria: cats[1], f: f2 },
    { categoria: cats[2], f: f3 },
    { categoria: cats[3], f: f4 },
  ]

  const askRow = choice(rows)
  const ask = `¿Cuál es la frecuencia absoluta de “${askRow.categoria}”?`
  const correct = String(askRow.f)

  return { tema: t.tema, rows, ask, correct }
}

function generateOptions(s: Omit<Scenario, "options">): Option[] {
  const correct = s.correct
  const fs = s.rows.map(r => r.f)
  const total = fs.reduce((a, b) => a + b, 0)
  const maxF = Math.max(...fs)

  const wrong1 = String(total) // confunde con total
  const wrong2 = String(maxF) // confunde con mayor
  const wrong3 = String(clamp(Number(correct) + randInt(1, 4), 1, 999))
  const wrong4 = String(clamp(Number(correct) - randInt(1, 4), 1, 999))

  const all: Option[] = shuffle([
    { value: correct, correct: true },
    { value: wrong1, correct: false },
    { value: wrong2, correct: false },
    { value: wrong3, correct: false },
    { value: wrong4, correct: false },
  ])

  // únicos
  const seen = new Set<string>()
  const unique: Option[] = []
  for (const o of all) {
    if (seen.has(o.value)) continue
    seen.add(o.value)
    unique.push(o)
  }
  while (unique.length < 5) unique.push({ value: String(randInt(1, 60)), correct: false })
  return unique
}

export default function Ej03({
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
        question: { tema: scenario.tema, ask: scenario.ask, rows: scenario.rows },
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

  const total = scenario.rows.reduce((acc, r) => acc + r.f, 0)

  const explanation = {
    steps: [
      {
        title: "Leer la tabla",
        detail: <span>La frecuencia absoluta (f) es la cantidad de veces que aparece cada categoría.</span>,
        icon: Sigma,
        content: (
          <div className="space-y-2">
            <div className="text-sm">
              Tema: <b>{scenario.tema}</b> (Colegio Cristo Salvador)
            </div>
            <div className="rounded-lg border bg-background p-3">
              <div className="text-sm font-semibold mb-2">Tabla (categoría → f)</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {scenario.rows.map(r => (
                  <div key={r.categoria} className="rounded border bg-white p-2 flex justify-between">
                    <span>{r.categoria}</span>
                    <b>{r.f}</b>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ),
        tip: <span>“Frecuencia absoluta” = conteo directo en la tabla.</span>,
      },
      {
        title: "Ubicar la categoría preguntada",
        detail: <span>Buscamos el valor f que corresponde exactamente a la categoría.</span>,
        icon: Divide,
        content: (
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div>{scenario.ask}</div>
            <div>
              La categoría pedida aparece con frecuencia: <b>{scenario.correct}</b>
            </div>
          </div>
        ),
        tip: <span>No se suma todo: solo se lee el f de esa categoría.</span>,
      },
      {
        title: "Verificación rápida",
        detail: <span>Podemos sumar para saber el total, pero no es la respuesta.</span>,
        icon: ShieldCheck,
        content: (
          <div className="rounded-lg border bg-background p-3 space-y-1">
            <div>Total de estudiantes registrados: <b>{total}</b></div>
            <div>Respuesta (frecuencia pedida): <b>{scenario.correct}</b></div>
          </div>
        ),
      },
    ],
    concluding: scenario.correct,
  }

  return (
    <MathProvider>
      <ExerciseShell
        title="Ej03 — Frecuencia absoluta"
        prompt={
          `En el Colegio Cristo Salvador se registró el ${scenario.tema} de un grupo de estudiantes. ` +
          `Observa la tabla y responde: ${scenario.ask}`
        }
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
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Tabla</div>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            {scenario.rows.map(r => (
              <div key={r.categoria} className="rounded-lg border bg-background p-3 flex justify-between">
                <span>{r.categoria}</span>
                <b>{r.f}</b>
              </div>
            ))}
          </div>
        </div>

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