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
  Ej17 — Media aritmética (datos no agrupados)
  - Genera N datos (8..12)
  - Pide la media con 1 decimal
  - Anti-repetición por signature + history
============================================================ */

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function choice<T>(arr: T[]) {
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
function round1(n: number) {
  return Math.round(n * 10) / 10
}

type Scenario = ReturnType<typeof buildScenario>

function listTex(arr: number[]) {
  return arr.join(", ")
}

function buildScenario(exclude: string[]) {
  for (let tries = 0; tries < 700; tries++) {
    const N = choice([8, 9, 10, 11, 12])
    const minV = randInt(10, 30)
    const maxV = minV + randInt(15, 40)

    const data: number[] = []
    while (data.length < N) {
      const v = randInt(minV, maxV)
      // evita demasiados repetidos seguidos
      if (data.length >= 2 && data[data.length - 1] === v && data[data.length - 2] === v) continue
      data.push(v)
    }

    const sum = data.reduce((s, x) => s + x, 0)
    const mean = round1(sum / N)

    // evita medias “demasiado enteras” repetitivas
    if (mean < 10 || mean > 60) continue

    const signature = `N${N}|min${minV}|max${maxV}|d${data.join("-")}|m${mean}`
    if (exclude.includes(signature)) continue

    // Distractores típicos:
    const wrongNoDivide = sum // confunden media con suma
    const wrongDivideNMinus1 = round1(sum / (N - 1)) // usan N-1
    const wrongDivideNPlus1 = round1(sum / (N + 1)) // usan N+1
    const wrongRoundedBad = Math.round(sum / N) // redondeo a entero (pierde decimal)

    const correctStr = `${mean}`

    const pool = shuffle([
      correctStr,
      `${wrongNoDivide}`,
      `${wrongDivideNMinus1}`,
      `${wrongDivideNPlus1}`,
      `${wrongRoundedBad}`,
    ])

    const uniq: string[] = []
    for (const v of pool) if (!uniq.includes(v)) uniq.push(v)

    while (uniq.length < 5) {
      const extra = `${round1(mean + choice([-2, -1.5, -1, 1, 1.5, 2]))}`
      if (!uniq.includes(extra)) uniq.push(extra)
    }

    const options: Option[] = shuffle(uniq.slice(0, 5)).map(v => ({
      value: v,
      correct: v === correctStr,
    }))

    return {
      N,
      data,
      sum,
      mean,
      correct: correctStr,
      signature,
      options,
    }
  }

  // fallback estable
  const data = [12, 18, 20, 25, 28, 30, 31, 36, 40]
  const N = data.length
  const sum = data.reduce((s, x) => s + x, 0)
  const mean = round1(sum / N)
  const correctStr = `${mean}`
  const options: Option[] = shuffle([correctStr, `${sum}`, "25", "28", "30"]).map(v => ({
    value: v,
    correct: v === correctStr,
  }))
  return { N, data, sum, mean, correct: correctStr, signature: "FB17", options }
}

export default function Ej17({
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
        question: { data: scenario.data, N: scenario.N },
        computed: { sum: scenario.sum, mean: scenario.mean },
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

  const dataTex = listTex(scenario.data)

  return (
    <MathProvider>
      <ExerciseShell
        title="Ej17 — Media aritmética"
        prompt="Halla la media aritmética del conjunto de datos (responde con 1 decimal)."
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
                  title: "Sumar todos los datos",
                  detail: "La media se calcula sumando los datos y luego dividiendo entre la cantidad de datos.",
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\text{Datos: } ${dataTex}`} />
                      <MathTex block tex={`\\sum x_i = ${scenario.sum}`} />
                    </div>
                  ),
                },
                {
                  title: "Dividir entre el número de datos",
                  detail: `Aquí hay N=${scenario.N} datos, por eso dividimos la suma entre ${scenario.N}.`,
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\bar{x}=\\frac{\\sum x_i}{N}=\\frac{${scenario.sum}}{${scenario.N}}`} />
                    </div>
                  ),
                },
                {
                  title: "Redondear a 1 decimal",
                  detail: "Se expresa el resultado con 1 decimal.",
                  icon: ShieldCheck,
                  content: <MathTex block tex={`\\bar{x}=${scenario.correct}`} />,
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