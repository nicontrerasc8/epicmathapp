// Ej13.tsx
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
  Ej13 — Mediana con lista de datos (N par o impar).
  ✅ Datos cambian (sin repetición)
  ✅ Explicación ajustada al N y al ordenamiento del caso
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
    const N = choice([9, 11, 13, 10, 12, 14]) // mezcla par/impar
    const base = randInt(8, 25)

    // datos con repetición moderada
    const data: number[] = []
    for (let i = 0; i < N; i++) data.push(base + randInt(-6, 10))
    const sorted = [...data].sort((a, b) => a - b)

    let median: number
    if (N % 2 === 1) {
      median = sorted[(N - 1) / 2]
    } else {
      const a = sorted[N / 2 - 1]
      const b = sorted[N / 2]
      median = Number(((a + b) / 2).toFixed(1))
    }

    const signature = `N${N}-${sorted.join(",")}`
    if (exclude.includes(signature)) continue

    const correct = String(median)

    const d1 = String(sorted[Math.max(0, Math.floor(N / 2) - 1)]) // confunden posición
    const d2 = String(sorted[Math.min(N - 1, Math.floor(N / 2))])
    const d3 = String(Number((sorted[0] + sorted[N - 1]) / 2).toFixed(1)) // “promedio extremos”
    const d4 = String(Number((sorted.reduce((s, x) => s + x, 0) / N).toFixed(1))) // confunden con media

    const pool = shuffle([correct, d1, d2, d3, d4])
    const uniq: string[] = []
    for (const v of pool) if (!uniq.includes(v)) uniq.push(v)
    while (uniq.length < 5) uniq.push(String(randInt(base - 5, base + 12)))

    const options: Option[] = shuffle(uniq.slice(0, 5)).map(v => ({
      value: v,
      correct: v === correct,
    }))

    return { N, data, sorted, median, signature, options, correct }
  }

  // fallback
  const data = [12, 15, 15, 18, 20, 21, 21, 22, 25, 28]
  const sorted = [...data].sort((a, b) => a - b)
  const N = data.length
  const median = (sorted[N / 2 - 1] + sorted[N / 2]) / 2
  const correct = String(median)
  const signature = "FB13"
  const options: Option[] = shuffle([correct, "20", "21", "18", "22"]).map(v => ({ value: v, correct: v === correct }))
  return { N, data, sorted, median, signature, options, correct }
}

function listTex(arr: number[]) {
  return `\\{\\,${arr.join(",\\ ")}\\,\\}`
}

export default function Ej13({
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
        correctAnswer: scenario.correct,
        question: { N: scenario.N, data: scenario.data },
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

  const N = scenario.N
  const sorted = scenario.sorted

  const posTex =
    N % 2 === 1
      ? `\\text{Como }N=${N}\\text{ es impar, la mediana está en la posición }\\frac{N+1}{2}=${(N + 1) / 2}.`
      : `\\text{Como }N=${N}\\text{ es par, la mediana es el promedio de las posiciones }\\frac{N}{2}=${N / 2}\\text{ y }\\left(\\frac{N}{2}+1\\right)=${N / 2 + 1}.`

  const medTex =
    N % 2 === 1
      ? `\\tilde{x} = x_{\\left(\\frac{${N}+1}{2}\\right)} = ${scenario.median}`
      : `\\tilde{x} = \\frac{x_{${N / 2}} + x_{${N / 2 + 1}}}{2} = ${scenario.median}`

  return (
    <MathProvider>
      <ExerciseShell
        title="Ej13 — Mediana de un conjunto de datos"
        prompt="Calcula la mediana del conjunto de datos:"
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
                  title: "Ordenar los datos de menor a mayor",
                  detail: <span>La mediana se calcula sobre la lista ordenada.</span>,
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\text{Datos: }${listTex(scenario.data)}`} />
                      <MathTex block tex={`\\text{Ordenados: }${listTex(sorted)}`} />
                    </div>
                  ),
                  tip: <span>Si no ordenas, puedes elegir una “mediana” incorrecta aunque tengas buena fórmula.</span>,
                },
                {
                  title: "Ubicar la(s) posición(es) central(es)",
                  detail: <span>Depende de si \(N\) es par o impar.</span>,
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={posTex} />
                      {N % 2 === 0 && (
                        <MathTex
                          block
                          tex={`x_{${N / 2}}=${sorted[N / 2 - 1]},\\quad x_{${N / 2 + 1}}=${sorted[N / 2]}`}
                        />
                      )}
                    </div>
                  ),
                },
                {
                  title: "Calcular la mediana",
                  detail: <span>Aplicamos la definición exactamente con los valores del caso.</span>,
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={medTex} />
                      <MathTex block tex={`\\Rightarrow\\ \\tilde{x} = ${scenario.median}`} />
                    </div>
                  ),
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
            <MathTex block tex={listTex(scenario.data)} />
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