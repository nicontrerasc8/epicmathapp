"use client"

import { useMemo, useState } from "react"
import { Sigma, Divide, ShieldCheck } from "lucide-react"

import { useExerciseEngine } from "@/lib/exercises/useExerciseEngine"
import { useExerciseSubmission } from "@/lib/exercises/useExerciseSubmission"
import { useExerciseTimer } from "@/lib/exercises/useExerciseTimer"
import { computeTrophyGain, WRONG_PENALTY } from "@/lib/exercises/gamification"

import { Option, OptionsGrid } from "@/components/exercises/base/OptionsGrid"
import { MathProvider, MathTex } from "@/components/exercises/base/MathBlock"
import { ExerciseHud } from "@/components/exercises/base/ExerciseHud"
import { SolutionBox } from "@/components/exercises/base/SolutionBox"
import { ExerciseShell } from "@/components/exercises/base/ExerciseShell"
import { DetailedExplanation } from "@/components/exercises/base/DetailedExplanation"

/* ============================================================
  Ej16 — Mediana con datos no agrupados (N par o impar)
============================================================ */

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

type Scenario = ReturnType<typeof buildScenario>

function buildScenario(exclude: string[]) {
  for (let tries = 0; tries < 600; tries++) {
    const n = choice([9, 10, 11, 12, 13]) // mezcla par e impar
    const minV = randInt(10, 30)
    const maxV = minV + randInt(20, 45)

    // genera datos con repetidos suaves
    const data: number[] = []
    while (data.length < n) {
      const v = randInt(minV, maxV)
      // para evitar escenarios demasiado “planos”
      if (data.length >= 2 && data.slice(-2).every(x => x === v) && Math.random() < 0.7) continue
      data.push(v)
    }

    const sorted = [...data].sort((a, b) => a - b)
    const N = sorted.length
    const median =
      N % 2 === 1 ? sorted[(N - 1) / 2] : Number(((sorted[N / 2 - 1] + sorted[N / 2]) / 2).toFixed(1))

    const signature = `N${N}-min${minV}-max${maxV}-d${sorted.join(",")}`
    if (exclude.includes(signature)) continue

    // distractores típicos
    const wrong1 = sorted[Math.floor((N - 1) / 2)] // el “central” aunque sea par
    const wrong2 = sorted[Math.min(N - 1, Math.floor(N / 2))] // otro central
    const wrong3 = Number(((sorted[0] + sorted[N - 1]) / 2).toFixed(1)) // semisuma extremos (confunden con media de extremos)
    const wrong4 = Number((sorted.reduce((s, x) => s + x, 0) / N).toFixed(1)) // media

    const pool = shuffle([median, wrong1, wrong2, wrong3, wrong4].map(x => Number(x)))
    const uniq: number[] = []
    for (const v of pool) if (!uniq.includes(v)) uniq.push(v)
    while (uniq.length < 5) uniq.push(randInt(minV, maxV))

    const correctStr = String(median)
    const options: Option[] = shuffle(uniq.slice(0, 5)).map(v => ({
      value: String(v),
      correct: String(v) === correctStr,
    }))

    return { data, sorted, N, median, signature, options, correctStr }
  }

  // fallback
  const data = [12, 18, 20, 25, 25, 28, 30, 31, 33, 40]
  const sorted = [...data].sort((a, b) => a - b)
  const N = sorted.length
  const median = Number(((sorted[N / 2 - 1] + sorted[N / 2]) / 2).toFixed(1))
  const correctStr = String(median)
  const signature = "FB16"
  const options: Option[] = shuffle([median, 25, 28, 26.5, 27.5].map(String)).map(v => ({
    value: v,
    correct: v === correctStr,
  }))
  return { data, sorted, N, median, signature, options, correctStr }
}

function listTex(arr: number[]) {
  return arr.join(", ")
}

export default function Ej16({
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
  const [history, setHistory] = useState<string[]>([])

  const { elapsed, startedAtRef } = useExerciseTimer(engine.canAnswer, nonce)
  const trophyPreview = useMemo(() => computeTrophyGain(elapsed), [elapsed])

  const scenario = useMemo(() => {
    const recent = history.slice(-12)
    return buildScenario(recent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        correctAnswer: scenario.correctStr,
        question: { data: scenario.data },
        options: scenario.options.map(o => o.value),
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setHistory(h => [...h, scenario.signature].slice(-24))
    setNonce(n => n + 1)
  }

  const dataTex = listTex(scenario.data)
  const sortedTex = listTex(scenario.sorted)

  const midA = scenario.N % 2 === 1 ? (scenario.N + 1) / 2 : scenario.N / 2
  const midB = scenario.N % 2 === 1 ? (scenario.N + 1) / 2 : scenario.N / 2 + 1

  return (
    <MathProvider>
      <ExerciseShell
        title="Ej16 — Mediana (datos no agrupados)"
        prompt="Halla la mediana del conjunto de datos."
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Resolución"
              steps={[
                {
                  title: "Ordenar los datos",
                  detail: "Primero se ordena el conjunto de menor a mayor.",
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\text{Datos: } ${dataTex}`} />
                      <MathTex block tex={`\\text{Ordenados: } ${sortedTex}`} />
                    </div>
                  ),
                },
                {
                  title: "Ubicar la(s) posición(es) central(es)",
                  detail:
                    "Si N es impar, la mediana es el dato en la posición (N+1)/2. Si N es par, es el promedio de las posiciones N/2 y N/2+1.",
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`N = ${scenario.N}`} />
                      <MathTex block tex={`\\text{Posiciones centrales: } ${midA}\\ \\text{y}\\ ${midB}`} />
                    </div>
                  ),
                },
                {
                  title: "Calcular la mediana",
                  detail: "Se toma el dato central (o se promedian los dos centrales).",
                  icon: ShieldCheck,
                  content: <MathTex block tex={`\\text{Mediana} = ${scenario.median}`} />,
                },
              ]}
              concluding={
                <span>
                  Respuesta final: <b>{scenario.median}</b>.
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Datos</div>
          <div className="rounded-lg border bg-background p-3">
            <MathTex block tex={`\\{ ${dataTex} \\}`} />
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={op => <MathTex tex={op.value} />}
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