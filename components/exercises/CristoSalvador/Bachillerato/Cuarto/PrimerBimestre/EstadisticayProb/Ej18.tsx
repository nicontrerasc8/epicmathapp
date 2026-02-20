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
  Ej18 — Media ponderada (promedio con pesos)
  - 3 evaluaciones (nota y peso)
  - Respuesta con 1 decimal
  - Sin desestructurar tuplas readonly (fix TS)
============================================================ */

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function shuffle<T>(arr: T[]) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function round1(n: number) {
  return Math.round(n * 10) / 10
}
function choiceIndex(len: number) {
  return Math.floor(Math.random() * len)
}

type Scenario = ReturnType<typeof buildScenario>

type WeightSet = { w1: number; w2: number; w3: number }

function buildScenario(exclude: string[]) {
  const weightsPool: WeightSet[] = [
    { w1: 20, w2: 30, w3: 50 },
    { w1: 10, w2: 40, w3: 50 },
    { w1: 25, w2: 25, w3: 50 },
    { w1: 15, w2: 35, w3: 50 },
    { w1: 30, w2: 30, w3: 40 },
  ]

  for (let tries = 0; tries < 700; tries++) {
    const idx = choiceIndex(weightsPool.length)
    const ws = weightsPool[idx]
    const w1 = ws.w1
    const w2 = ws.w2
    const w3 = ws.w3

    const n1 = randInt(8, 20)
    const n2 = randInt(8, 20)
    const n3 = randInt(8, 20)

    const raw = (n1 * w1 + n2 * w2 + n3 * w3) / 100
    const avg = round1(raw)

    if (avg < 9 || avg > 19.8) continue

    const signature = `w${w1}-${w2}-${w3}|n${n1}-${n2}-${n3}|a${avg}`
    if (exclude.includes(signature)) continue

    const correct = `${avg}`

    // Distractores típicos
    const simpleAvg = round1((n1 + n2 + n3) / 3) // ignoran pesos
    const swapped = round1((n1 * w2 + n2 * w1 + n3 * w3) / 100) // intercambian pesos 1-2
    const offBy = round1(avg + (Math.random() < 0.5 ? 0.5 : -0.5)) // error de redondeo/cálculo
    const roundedInt = `${Math.round(raw)}` // redondean a entero

    const pool = shuffle([correct, `${simpleAvg}`, `${swapped}`, `${offBy}`, `${roundedInt}`])

    const uniq: string[] = []
    for (const v of pool) if (!uniq.includes(v)) uniq.push(v)
    while (uniq.length < 5) {
      const extra = `${round1(avg + (Math.random() < 0.5 ? 1 : -1))}`
      if (!uniq.includes(extra)) uniq.push(extra)
    }

    const options: Option[] = shuffle(uniq.slice(0, 5)).map(v => ({
      value: v,
      correct: v === correct,
    }))

    return {
      w1,
      w2,
      w3,
      n1,
      n2,
      n3,
      avg,
      correct,
      signature,
      options,
      computed: { raw },
    }
  }

  // fallback estable
  const w1 = 20,
    w2 = 30,
    w3 = 50
  const n1 = 14,
    n2 = 16,
    n3 = 12
  const raw = (n1 * w1 + n2 * w2 + n3 * w3) / 100
  const avg = round1(raw)
  const correct = `${avg}`
  const options: Option[] = shuffle([correct, "14", "15", "16", "13.5"]).map(v => ({
    value: v,
    correct: v === correct,
  }))

  return {
    w1,
    w2,
    w3,
    n1,
    n2,
    n3,
    avg,
    correct,
    signature: "FB18",
    options,
    computed: { raw },
  }
}

export default function Ej18({
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
    const recent = history.slice(-14)
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
        question: {
          notas: [scenario.n1, scenario.n2, scenario.n3],
          pesos: [scenario.w1, scenario.w2, scenario.w3],
        },
        computed: {
          raw: scenario.computed.raw,
          promedio: scenario.avg,
        },
        options: scenario.options.map(o => o.value),
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setHistory(h => [...h, scenario.signature].slice(-28))
    setNonce(n => n + 1)
  }

  const texFormula = `\\bar{x}=\\frac{n_1w_1+n_2w_2+n_3w_3}{100}`

  return (
    <MathProvider>
      <ExerciseShell
        title="Ej18 — Media ponderada"
        prompt="Un estudiante tiene 3 evaluaciones con pesos. Halla el promedio final (1 decimal)."
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
                  title: "Multiplicar cada nota por su peso",
                  detail: "Se calcula el aporte de cada evaluación según su porcentaje.",
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={texFormula} />
                      <MathTex block tex={`${scenario.n1}\\cdot${scenario.w1}+${scenario.n2}\\cdot${scenario.w2}+${scenario.n3}\\cdot${scenario.w3}`} />
                    </div>
                  ),
                },
                {
                  title: "Sumar aportes y dividir entre 100",
                  detail: `Los pesos suman 100, por eso dividimos entre 100.`,
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\bar{x}=\\frac{${scenario.n1}\\cdot${scenario.w1}+${scenario.n2}\\cdot${scenario.w2}+${scenario.n3}\\cdot${scenario.w3}}{100}`} />
                      <MathTex block tex={`\\bar{x}=${scenario.correct}`} />
                    </div>
                  ),
                },
                {
                  title: "Respuesta",
                  detail: "El promedio final es:",
                  icon: ShieldCheck,
                  content: <MathTex block tex={`${scenario.correct}`} />,
                },
              ]}
              concluding={
                <span>
                  Respuesta final: <b>{scenario.correct}</b>.
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Datos</div>
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <MathTex block tex={`n_1=${scenario.n1},\\ w_1=${scenario.w1}\\%`} />
            <MathTex block tex={`n_2=${scenario.n2},\\ w_2=${scenario.w2}\\%`} />
            <MathTex block tex={`n_3=${scenario.n3},\\ w_3=${scenario.w3}\\%`} />
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={(op) => <MathTex tex={op.value} />}
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