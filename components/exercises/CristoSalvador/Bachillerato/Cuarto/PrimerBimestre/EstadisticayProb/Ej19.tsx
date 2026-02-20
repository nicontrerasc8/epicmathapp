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
  Ej19 — Combinatoria: elegir un equipo
  - n estudiantes, elegir k
  - Respuesta: C(n,k)
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

function comb(n: number, k: number) {
  if (k < 0 || k > n) return 0
  const kk = Math.min(k, n - k)
  let num = 1
  let den = 1
  for (let i = 1; i <= kk; i++) {
    num *= (n - kk + i)
    den *= i
  }
  return Math.round(num / den)
}

type Scenario = ReturnType<typeof buildScenario>

function buildScenario(exclude: string[]) {
  for (let tries = 0; tries < 700; tries++) {
    const n = randInt(8, 16)
    const k = choice([2, 3, 4, 5])
    if (k >= n) continue

    const correctNum = comb(n, k)
    if (correctNum <= 0) continue

    const signature = `n${n}-k${k}-c${correctNum}`
    if (exclude.includes(signature)) continue

    const correct = `${correctNum}`

    // distractores:
    const perm = (() => {
      // P(n,k) = n*(n-1)*...*(n-k+1)
      let p = 1
      for (let i = 0; i < k; i++) p *= (n - i)
      return p
    })()

    const wrong1 = `${perm}` // confunden combinaciones con permutaciones
    const wrong2 = `${comb(n - 1, k)}` // se olvidan de alguien
    const wrong3 = `${comb(n, k - 1)}` // cambian k
    const wrong4 = `${Math.max(1, correctNum + choice([-10, -6, 6, 10]))}`

    const pool = shuffle([correct, wrong1, wrong2, wrong3, wrong4])

    const uniq: string[] = []
    for (const v of pool) if (!uniq.includes(v)) uniq.push(v)
    while (uniq.length < 5) {
      const extra = `${Math.max(1, correctNum + randInt(-15, 15))}`
      if (!uniq.includes(extra)) uniq.push(extra)
    }

    const options: Option[] = shuffle(uniq.slice(0, 5)).map(v => ({
      value: v,
      correct: v === correct,
    }))

    return { n, k, correctNum, correct, signature, options }
  }

  const n = 10, k = 3
  const correctNum = comb(n, k)
  const correct = `${correctNum}`
  const options: Option[] = shuffle([correct, "120", "45", "210", "100"]).map(v => ({
    value: v,
    correct: v === correct,
  }))
  return { n, k, correctNum, correct, signature: "FB19", options }
}

export default function Ej19({
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
        question: { n: scenario.n, k: scenario.k },
        computed: { combinations: scenario.correctNum },
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

  return (
    <MathProvider>
      <ExerciseShell
        title="Ej19 — Conteo (combinaciones)"
        prompt={`En una clase hay ${scenario.n} estudiantes. ¿De cuántas formas se puede elegir un equipo de ${scenario.k} estudiantes?`}
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
                  title: "Identificar el tipo de conteo",
                  detail: (
                    <span>
                      Elegir un equipo no depende del orden, entonces usamos combinaciones.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\text{Usamos }\\binom{n}{k}\\text{ porque el orden NO importa.}`} />
                      <MathTex block tex={`\\binom{${scenario.n}}{${scenario.k}}`} />
                    </div>
                  ),
                },
                {
                  title: "Calcular la combinación",
                  detail: <span>Aplicamos la fórmula o calculamos directamente.</span>,
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex
                        block
                        tex={`\\binom{${scenario.n}}{${scenario.k}} = ${scenario.correct}`}
                      />
                    </div>
                  ),
                },
                {
                  title: "Respuesta",
                  detail: <span>Formas de elegir el equipo:</span>,
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
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <MathTex block tex={`n=${scenario.n},\\ k=${scenario.k}`} />
            <MathTex block tex={`\\text{Formas} = \\binom{${scenario.n}}{${scenario.k}}`} />
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