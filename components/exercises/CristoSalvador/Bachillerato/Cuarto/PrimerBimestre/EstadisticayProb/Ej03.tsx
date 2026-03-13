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

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

type Row = { categoria: string; f: number }

type Scenario = {
  tema: string
  rows: Row[]
  ask: string
  correct: string
  answerType: "frequency" | "category"
  options: Option[]
}

const TEMAS = [
  { tema: "medio de transporte", cats: ["a pie", "bus", "auto", "bicicleta"] },
  { tema: "deporte favorito", cats: ["fútbol", "vóley", "básquet", "natación"] },
  { tema: "color preferido", cats: ["azul", "rojo", "verde", "negro"] },
  { tema: "fruta favorita", cats: ["manzana", "pera", "uva", "plátano"] },
] as const

function uniqueFrequencies() {
  const values = new Set<number>()
  while (values.size < 4) values.add(randInt(6, 20))
  return shuffle(Array.from(values))
}

function generateScenario(): Omit<Scenario, "options"> {
  const t = choice(TEMAS)
  const cats = shuffle([...t.cats])
  const freqs = uniqueFrequencies()

  const rows: Row[] = [
    { categoria: cats[0], f: freqs[0] },
    { categoria: cats[1], f: freqs[1] },
    { categoria: cats[2], f: freqs[2] },
    { categoria: cats[3], f: freqs[3] },
  ]

  const answerType = choice(["frequency", "category"] as const)

  if (answerType === "category") {
    const askRow = choice(rows)
    return {
      tema: t.tema,
      rows,
      answerType,
      ask: `¿Qué categoría tiene frecuencia absoluta ${askRow.f}?`,
      correct: askRow.categoria,
    }
  }

  const askRow = choice(rows)
  return {
    tema: t.tema,
    rows,
    answerType,
    ask: `¿Cuál es la frecuencia absoluta de "${askRow.categoria}"?`,
    correct: String(askRow.f),
  }
}

function generateOptions(s: Omit<Scenario, "options">): Option[] {
  if (s.answerType === "category") {
    return shuffle(
      s.rows.map(r => ({
        value: r.categoria,
        correct: r.categoria === s.correct,
      }))
    )
  }

  const correct = s.correct
  const fs = s.rows.map(r => r.f)
  const total = fs.reduce((a, b) => a + b, 0)
  const maxF = Math.max(...fs)
  const minF = Math.min(...fs)

  const candidates = [
    Number(correct),
    total,
    maxF,
    minF,
    clamp(Number(correct) + randInt(1, 4), 1, 999),
    clamp(Number(correct) - randInt(1, 4), 1, 999),
  ]

  const seen = new Set<number>()
  const unique: number[] = []
  for (const value of shuffle(candidates)) {
    if (seen.has(value)) continue
    seen.add(value)
    unique.push(value)
  }
  while (unique.length < 5) {
    const extra = randInt(1, 60)
    if (!seen.has(extra)) {
      seen.add(extra)
      unique.push(extra)
    }
  }

  return shuffle(
    unique.slice(0, 5).map(value => ({
      value: String(value),
      correct: String(value) === correct,
    }))
  )
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
        question: { tema: scenario.tema, ask: scenario.ask, rows: scenario.rows, answerType: scenario.answerType },
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
        detail: <span>La frecuencia absoluta es la cantidad que aparece junto a cada categoría.</span>,
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
      },
      {
        title: "Ubicar el dato pedido",
        detail: <span>Buscamos directamente la categoría o la frecuencia según la pregunta.</span>,
        icon: Divide,
        content: (
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div>{scenario.ask}</div>
            <div>
              Respuesta: <b>{scenario.correct}</b>
            </div>
          </div>
        ),
        tip: <span>No hace falta sumar todo, salvo si quieres verificar el total.</span>,
      },
      {
        title: "Verificación rápida",
        detail: <span>El total sirve como comprobación, pero no siempre es lo que se pide.</span>,
        icon: ShieldCheck,
        content: (
          <div className="rounded-lg border bg-background p-3 space-y-1">
            <div>Total registrado: <b>{total}</b></div>
            <div>Respuesta pedida: <b>{scenario.correct}</b></div>
          </div>
        ),
      },
    ],
    concluding: scenario.correct,
  }

  return (
    <MathProvider>
      <ExerciseShell
        title="Frecuencia absoluta"
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
