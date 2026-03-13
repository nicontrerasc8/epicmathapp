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

type Scenario = ReturnType<typeof buildScenario>

function buildScenario(exclude: string[]) {
  for (let tries = 0; tries < 700; tries++) {
    const unknownIndex = choice([1, 2, 3, 4, 5] as const) // valor xi con frecuencia desconocida
    const frequencies = [randInt(2, 10), randInt(2, 12), randInt(2, 12), randInt(2, 12), randInt(2, 12)]
    const x = frequencies[unknownIndex - 1]

    const N = frequencies.reduce((acc, v) => acc + v, 0)
    if (N < 30 || N > 60) continue

    const weighted = frequencies.reduce((acc, v, idx) => acc + (idx + 1) * v, 0)
    const mean = Number((weighted / N).toFixed(1))
    if (mean < 2.0 || mean > 4.8) continue

    const signature = `u${unknownIndex}-N${N}-x${x}-m${mean}`
    if (exclude.includes(signature)) continue

    const knownSum = N - x
    const knownWeighted = weighted - unknownIndex * x

    const d1 = Math.max(1, x + choice([-4, -3, 3, 4] as const))
    const d2 = Math.max(1, Math.round((mean * N - knownWeighted) / Math.max(1, unknownIndex + 1))) // divide por xi incorrecto
    const d3 = Math.max(1, N - (knownSum - choice([2, 3, 4] as const))) // error al sumar conocidos
    const d4 = Math.max(1, x + choice([-6, 6, -8, 8] as const))

    const candidateNumbers = [x, d1, d2, d3, d4]
    const seen = new Set<number>()
    const unique: number[] = []
    for (const value of shuffle(candidateNumbers)) {
      if (seen.has(value)) continue
      seen.add(value)
      unique.push(value)
    }
    while (unique.length < 5) {
      const extra = Math.max(1, x + randInt(-10, 10))
      if (!seen.has(extra)) {
        seen.add(extra)
        unique.push(extra)
      }
    }

    const options: Option[] = shuffle(unique.slice(0, 5)).map(value => ({
      value: String(value),
      correct: value === x,
    }))

    return {
      values: [1, 2, 3, 4, 5] as const,
      frequencies,
      unknownIndex,
      x,
      N,
      mean,
      weighted,
      knownSum,
      knownWeighted,
      signature,
      options,
    }
  }

  const values = [1, 2, 3, 4, 5] as const
  const frequencies = [6, 8, 10, 9, 7]
  const unknownIndex = 3 as const
  const x = frequencies[unknownIndex - 1]
  const N = frequencies.reduce((a, b) => a + b, 0)
  const weighted = frequencies.reduce((acc, v, idx) => acc + (idx + 1) * v, 0)
  const mean = Number((weighted / N).toFixed(1))
  const knownSum = N - x
  const knownWeighted = weighted - unknownIndex * x
  const options: Option[] = shuffle([x, x + 2, x - 2, x + 5, x - 5].map(v => Math.max(1, v))).map(v => ({
    value: String(v),
    correct: v === x,
  }))
  return { values, frequencies, unknownIndex, x, N, mean, weighted, knownSum, knownWeighted, signature: "FB12", options }
}

function tableTex(s: Scenario) {
  const fTex = s.values
    .map(value => (value === s.unknownIndex ? "x" : String(s.frequencies[value - 1])))
    .join(" & ")
  return `
\\begin{array}{c|ccccc}
x_i & 1 & 2 & 3 & 4 & 5 \\\\ \\hline
f_i & ${fTex}
\\end{array}
`
}

export default function Ej12({
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
        correctAnswer: String(scenario.x),
        question: {
          N: scenario.N,
          mean: scenario.mean,
          unknownXi: scenario.unknownIndex,
          frequencies: scenario.frequencies.map((f, i) => (i + 1 === scenario.unknownIndex ? "x" : f)),
        },
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

  const texTbl = tableTex(scenario)
  const sumEquation = `${scenario.knownSum} + x = ${scenario.N}`
  const meanEquation = `\\bar x = \\frac{${scenario.knownWeighted} + ${scenario.unknownIndex}x}{${scenario.N}} = ${scenario.mean}`

  return (
    <MathProvider>
      <ExerciseShell
        title="Hallar x con frecuencias y media"
        prompt={`En la tabla, la frecuencia desconocida corresponde a x_i=${scenario.unknownIndex}. Se sabe que N=${scenario.N} y la media es ${scenario.mean}. Halla x.`}
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
                  title: "Usar la suma de frecuencias",
                  detail: "La suma total de frecuencias debe ser N.",
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={texTbl} />
                      <MathTex block tex={`\\sum f_i = N`} />
                      <MathTex block tex={sumEquation} />
                      <MathTex block tex={`x = ${scenario.N} - ${scenario.knownSum} = ${scenario.x}`} />
                    </div>
                  ),
                },
                {
                  title: "Comprobar con la media",
                  detail: "Verificamos con la fórmula de la media ponderada.",
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={meanEquation} />
                      <MathTex block tex={`\\bar x = \\frac{${scenario.weighted}}{${scenario.N}} = ${scenario.mean}`} />
                    </div>
                  ),
                },
                {
                  title: "Respuesta",
                  detail: "La frecuencia desconocida es:",
                  icon: ShieldCheck,
                  content: <MathTex block tex={`x = ${scenario.x}`} />,
                },
              ]}
              concluding={<span>Respuesta final: <b>x = {scenario.x}</b>.</span>}
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Tabla</div>
          <div className="rounded-lg border bg-background p-3">
            <MathTex block tex={texTbl} />
          </div>
          <div className="text-sm text-muted-foreground mt-3">
            Datos: <b>N = {scenario.N}</b> y <b>media = {scenario.mean}</b>.
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
