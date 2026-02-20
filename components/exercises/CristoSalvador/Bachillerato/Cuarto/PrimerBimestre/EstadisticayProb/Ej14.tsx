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
  Ej14 — Media aproximada con datos agrupados (intervalos + fi)
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

type Interval = { Li: number; Ls: number; fi: number; mi: number }
type Scenario = ReturnType<typeof buildScenario>

function buildScenario(exclude: string[]) {
  for (let tries = 0; tries < 450; tries++) {
    const k = choice([4, 5])
    const width = choice([5, 6, 8, 10])
    const start = randInt(20, 60)

    const intervals: Interval[] = []
    let current = start
    for (let i = 0; i < k; i++) {
      const Li = current
      const Ls = current + width
      const fi = randInt(3, 12)
      const mi = (Li + Ls) / 2
      intervals.push({ Li, Ls, fi, mi })
      current = Ls
    }

    const N = intervals.reduce((s, it) => s + it.fi, 0)
    if (N < 20 || N > 55) continue

    const sumMFi = intervals.reduce((s, it) => s + it.mi * it.fi, 0)
    const mean = Number((sumMFi / N).toFixed(1))

    const signature = `k${k}-w${width}-s${start}-N${N}-m${mean}-${intervals.map(it => it.fi).join(",")}`
    if (exclude.includes(signature)) continue

    const correct = String(mean)

    const d1 = String(Number((mean + choice([-2.0, -1.5, 1.5, 2.0])).toFixed(1)))
    const d2 = String(Number((sumMFi / (N + choice([-3, 3, 5]))).toFixed(1)))
    const d3 = String(Number((intervals.reduce((s, it) => s + it.Li, 0) / k).toFixed(1)))
    const d4 = String(Number((intervals.reduce((s, it) => s + it.mi, 0) / k).toFixed(1)))

    const pool = shuffle([correct, d1, d2, d3, d4])
    const uniq: string[] = []
    for (const v of pool) if (!uniq.includes(v)) uniq.push(v)
    while (uniq.length < 5) uniq.push(String(Number((mean + randInt(-3, 3)).toFixed(1))))

    const options: Option[] = shuffle(uniq.slice(0, 5)).map(v => ({
      value: v,
      correct: v === correct,
    }))

    return { intervals, N, sumMFi: Number(sumMFi.toFixed(1)), mean, signature, options, correct }
  }

  const intervals: Interval[] = [
    { Li: 20, Ls: 30, fi: 6, mi: 25 },
    { Li: 30, Ls: 40, fi: 9, mi: 35 },
    { Li: 40, Ls: 50, fi: 7, mi: 45 },
    { Li: 50, Ls: 60, fi: 4, mi: 55 },
  ]
  const N = intervals.reduce((s, it) => s + it.fi, 0)
  const sumMFi = intervals.reduce((s, it) => s + it.mi * it.fi, 0)
  const mean = Number((sumMFi / N).toFixed(1))
  const correct = String(mean)
  const signature = "FB14"
  const options: Option[] = shuffle([correct, "39.5", "41.0", "37.5", "42.5"]).map(v => ({ value: v, correct: v === correct }))
  return { intervals, N, sumMFi: Number(sumMFi.toFixed(1)), mean, signature, options, correct }
}

function groupedTableTex(s: Scenario) {
  const rows = s.intervals.map(it => `${it.Li}-${it.Ls} & ${it.fi} & ${it.mi}`).join(" \\\\ ")
  return `
\\begin{array}{c|c|c}
\\text{Intervalo} & f_i & m_i\\\\ \\hline
${rows}
\\end{array}
`
}

export default function Ej14({
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
        question: { N: scenario.N, intervals: scenario.intervals },
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

  const texTbl = groupedTableTex(scenario)
  const sumFiTex = scenario.intervals.map(it => it.fi).join(" + ")
  const sumMFiTex = scenario.intervals.map(it => `${it.mi}\\cdot${it.fi}`).join(" + ")

  return (
    <MathProvider>
      <ExerciseShell
        title="Ej14 — Media con datos agrupados"
        prompt="Halla la media aproximada usando marcas de clase."
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
                  title: "Calcular marcas de clase",
                  detail: "Para cada intervalo: mi = (Li + Ls) / 2.",
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={texTbl} />
                      <MathTex
                        block
                        tex={`\\text{Ejemplo: }m_1=\\frac{${scenario.intervals[0].Li}+${scenario.intervals[0].Ls}}{2}=${scenario.intervals[0].mi}`}
                      />
                    </div>
                  ),
                },
                {
                  title: "Calcular N y Σ(mi·fi)",
                  detail: "Sumamos las frecuencias y el producto de marca por frecuencia.",
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`N = \\sum f_i = ${sumFiTex} = ${scenario.N}`} />
                      <MathTex block tex={`\\sum (m_i f_i) = ${sumMFiTex} = ${scenario.sumMFi}`} />
                    </div>
                  ),
                  tip: "No se promedian las marcas directamente; deben ir multiplicadas por su frecuencia.",
                },
                {
                  title: "Aplicar la fórmula de la media",
                  detail: "Media aproximada: x̄ ≈ (Σ mi·fi) / N.",
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\bar x \\approx \\frac{${scenario.sumMFi}}{${scenario.N}} = ${scenario.mean}`} />
                      <MathTex block tex={`\\Rightarrow\\ \\bar x \\approx ${scenario.mean}`} />
                    </div>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta final: <b>{scenario.mean}</b>.
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Tabla de intervalos</div>
          <div className="rounded-lg border bg-background p-3">
            <MathTex block tex={texTbl} />
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