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

function pct(n: number) {
  return `${Math.round(n)}%`
}

type AskKind = "favorables" | "no_favorables"
type Scenario = {
  total: number
  favorables: number
  noFavorables: number
  contexto: string
  askKind: AskKind
  ask: string
  correct: string
  correctNum: number
  options: Option[]
}

function generateScenario(): Omit<Scenario, "options"> {
  const total = randInt(25, 60)
  const favorables = randInt(6, total - 6)
  const noFavorables = total - favorables

  const contexto = choice([
    "prefieren recreo deportivo",
    "llegan en bus",
    "prefieren clases en la mañana",
    "eligen futbol en educacion fisica",
    "participan en el club de lectura",
    "usan bicicleta para llegar",
  ] as const)

  const askKind = choice(["favorables", "no_favorables"] as const)
  const relFav = Math.round((favorables / total) * 100)
  const relNoFav = 100 - relFav

  const ask =
    askKind === "favorables"
      ? choice([
          `¿Que porcentaje representa el grupo que ${contexto}?`,
          `¿Cual es la frecuencia relativa (%) de quienes ${contexto}?`,
          `¿Que porcentaje del total cumple la condicion: "${contexto}"?`,
        ] as const)
      : choice([
          `¿Que porcentaje NO ${contexto}?`,
          `¿Cual es la frecuencia relativa (%) del grupo que no cumple "${contexto}"?`,
          `¿Que porcentaje corresponde a quienes no ${contexto}?`,
        ] as const)

  const correctNum = askKind === "favorables" ? relFav : relNoFav
  const correct = pct(correctNum)

  return { total, favorables, noFavorables, contexto, askKind, ask, correct, correctNum }
}

function generateOptions(s: Omit<Scenario, "options">): Option[] {
  const favPct = Math.round((s.favorables / s.total) * 100)
  const noFavPct = 100 - favPct
  const inverse = clamp(Math.round((s.total / s.favorables) * 100), 1, 99)
  const shiftedUp = clamp(Math.round(((s.favorables + 1) / s.total) * 100), 1, 99)
  const shiftedDown = clamp(Math.round(((s.favorables - 1) / s.total) * 100), 1, 99)
  const wrongDen = clamp(Math.round((s.favorables / (s.total + 5)) * 100), 1, 99)
  const randomNear = clamp(s.correctNum + choice([-8, -6, -4, 4, 6, 8] as const), 1, 99)

  const candidates = [
    s.correctNum,
    s.askKind === "favorables" ? noFavPct : favPct,
    inverse,
    shiftedUp,
    shiftedDown,
    wrongDen,
    randomNear,
  ]

  const seen = new Set<number>()
  const unique: number[] = []
  for (const value of shuffle(candidates)) {
    if (seen.has(value)) continue
    seen.add(value)
    unique.push(value)
  }

  while (unique.length < 5) {
    const extra = randInt(5, 95)
    if (!seen.has(extra)) {
      seen.add(extra)
      unique.push(extra)
    }
  }

  return shuffle(
    unique.slice(0, 5).map(value => ({
      value: pct(value),
      correct: value === s.correctNum,
    }))
  )
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
        question: {
          total: scenario.total,
          favorables: scenario.favorables,
          noFavorables: scenario.noFavorables,
          contexto: scenario.contexto,
          askKind: scenario.askKind,
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

  const relFav = Math.round((scenario.favorables / scenario.total) * 100)
  const relNoFav = 100 - relFav

  const explanation = {
    steps: [
      {
        title: "Identificar total y grupo de interes",
        detail: <span>Frecuencia relativa (%) = (grupo / total) x 100.</span>,
        icon: Sigma,
        content: (
          <div className="rounded-lg border bg-background p-3 space-y-1">
            <div>Total: <b>{scenario.total}</b></div>
            <div>Grupo que cumple la condicion: <b>{scenario.favorables}</b></div>
            <div>Grupo que no cumple: <b>{scenario.noFavorables}</b></div>
          </div>
        ),
      },
      {
        title: "Aplicar la formula",
        detail: <span>Calculamos el porcentaje segun lo que pregunta el enunciado.</span>,
        icon: Divide,
        content: (
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div>
              Favorables: {scenario.favorables}/{scenario.total} x 100 = <b>{relFav}%</b>
            </div>
            <div>
              No favorables: {scenario.noFavorables}/{scenario.total} x 100 = <b>{relNoFav}%</b>
            </div>
          </div>
        ),
      },
      {
        title: "Conclusión",
        detail: <span>Tomamos el porcentaje que corresponde al tipo de pregunta.</span>,
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
        title="Frecuencia relativa (%)"
        prompt={`En el Colegio Cristo Salvador, de ${scenario.total} estudiantes, ${scenario.favorables} ${scenario.contexto}. ${scenario.ask}`}
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
