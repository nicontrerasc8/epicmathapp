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
  Ej12 — Frecuencias 1..5 con f3=x, total N y media dada.
  Pregunta: hallar x.
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
  for (let tries = 0; tries < 500; tries++) {
    const f1 = randInt(2, 10)
    const f2 = randInt(2, 12)
    const f4 = randInt(2, 12)
    const y = randInt(2, 12) // f5
    const N = randInt(30, 60)

    const knownSum = f1 + f2 + f4 + y
    const x = N - knownSum
    if (x < 2 || x > 20) continue

    const knownWeighted = 1 * f1 + 2 * f2 + 4 * f4 + 5 * y
    const totalWeighted = knownWeighted + 3 * x

    const meanRaw = totalWeighted / N
    const mean = Number(meanRaw.toFixed(1))
    if (mean < 2.0 || mean > 4.6) continue

    const signature = `N${N}-f1${f1}-f2${f2}-x${x}-f4${f4}-y${y}-m${mean}`
    if (exclude.includes(signature)) continue

    const d1 = Math.max(1, x + choice([-4, -3, 3, 4]))
    const d2 = Math.max(1, N - (f1 + f2 + f4)) // olvidan restar y
    const d3 = Math.max(1, Math.round((N - (f1 + f2 + f4 + y)) / 2))
    const d4 = Math.max(1, x + choice([-6, 6]))

    const pool = shuffle([x, d1, d2, d3, d4])
    const uniq: number[] = []
    for (const v of pool) if (!uniq.includes(v)) uniq.push(v)
    while (uniq.length < 5) uniq.push(Math.max(1, randInt(2, 20)))

    const options: Option[] = shuffle(uniq.slice(0, 5)).map(v => ({
      value: String(v),
      correct: v === x,
    }))

    return { f1, f2, f4, y, x, N, mean, signature, options }
  }

  // fallback
  const fb = { f1: 6, f2: 8, f4: 9, y: 7, x: 10, N: 40 }
  const mean = Number(((1 * fb.f1 + 2 * fb.f2 + 3 * fb.x + 4 * fb.f4 + 5 * fb.y) / fb.N).toFixed(1))
  const signature = `FB12`
  const options: Option[] = shuffle([fb.x, fb.x + 2, fb.x - 2, fb.x + 5, fb.x - 5].map(v => Math.max(1, v))).map(v => ({
    value: String(v),
    correct: v === fb.x,
  }))
  return { ...fb, mean, signature, options }
}

function tableTex(s: Scenario) {
  return `
\\begin{array}{c|ccccc}
x_i & 1 & 2 & 3 & 4 & 5 \\\\ \\hline
f_i & ${s.f1} & ${s.f2} & x & ${s.f4} & ${s.y}
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
          f1: scenario.f1,
          f2: scenario.f2,
          f4: scenario.f4,
          f5: scenario.y,
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

  const sumF_known = scenario.f1 + scenario.f2 + scenario.f4 + scenario.y
  const sumXF_known = 1 * scenario.f1 + 2 * scenario.f2 + 4 * scenario.f4 + 5 * scenario.y
  const exactTotalXF = 1 * scenario.f1 + 2 * scenario.f2 + 3 * scenario.x + 4 * scenario.f4 + 5 * scenario.y

  return (
    <MathProvider>
      <ExerciseShell
        title="Ej12 — Hallar x con frecuencias y media"
        prompt={`En la tabla se sabe que el total de datos es N=${scenario.N} y la media es ${scenario.mean}. Halla x.`}
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
                  title: "Plantear el total de frecuencias",
                  detail: "La suma de frecuencias debe ser el total: Σfi = N.",
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={texTbl} />
                      <MathTex
                        block
                        tex={`x = N - (f_1+f_2+f_4+f_5) = ${scenario.N} - (${scenario.f1}+${scenario.f2}+${scenario.f4}+${scenario.y})`}
                      />
                      <MathTex block tex={`x = ${scenario.N} - ${sumF_known} = ${scenario.x}`} />
                    </div>
                  ),
                  tip: "Aquí x es la frecuencia del valor 3, por eso se incluye en la suma de frecuencias.",
                },
                {
                  title: "Comprobación con la media",
                  detail: "Comprobamos usando: x̄ = (Σ xi·fi)/N, reemplazando con los datos del escenario.",
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex
                        block
                        tex={`\\sum x_if_i = 1\\cdot${scenario.f1} + 2\\cdot${scenario.f2} + 3\\cdot${scenario.x} + 4\\cdot${scenario.f4} + 5\\cdot${scenario.y}`}
                      />
                      <MathTex block tex={`\\sum x_if_i = ${sumXF_known} + 3\\cdot${scenario.x} = ${exactTotalXF}`} />
                      <MathTex block tex={`\\bar x = \\frac{${exactTotalXF}}{${scenario.N}} = ${scenario.mean}`} />
                    </div>
                  ),
                  tip: "Si la media no coincide, entonces el valor de x no es correcto.",
                },
                {
                  title: "Respuesta",
                  detail: "El valor de la frecuencia buscada es:",
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