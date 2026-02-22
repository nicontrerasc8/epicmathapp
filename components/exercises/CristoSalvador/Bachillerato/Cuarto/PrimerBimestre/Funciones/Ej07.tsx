"use client"

import { useMemo, useState } from "react"
import { ShieldCheck, Sigma, Divide } from "lucide-react"

import { useExerciseEngine } from "@/lib/exercises/useExerciseEngine"
import { useExerciseSubmission } from "@/lib/exercises/useExerciseSubmission"
import { useExerciseTimer } from "@/lib/exercises/useExerciseTimer"
import { computeTrophyGain, WRONG_PENALTY } from "@/lib/exercises/gamification"

import { type Option, OptionsGrid } from "@/components/exercises/base/OptionsGrid"
import { MathProvider, MathTex } from "@/components/exercises/base/MathBlock"
import { ExerciseHud } from "@/components/exercises/base/ExerciseHud"
import { SolutionBox } from "@/components/exercises/base/SolutionBox"
import { ExerciseShell } from "@/components/exercises/base/ExerciseShell"
import { DetailedExplanation } from "@/components/exercises/base/DetailedExplanation"

/* =========================
   HELPERS
========================= */

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function simplifyFraction(n: number, d: number) {
  const g = gcd(n, d)
  const nn = n / g
  const dd = d / g
  if (dd < 0) return { n: -nn, d: -dd }
  return { n: nn, d: dd }
}

function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b !== 0) {
    const t = a % b
    a = b
    b = t
  }
  return a
}

function fracTex(n: number, d: number) {
  if (d === 1) return `${n}`
  return `\\frac{${n}}{${d}}`
}

function lineTex(m: string | number, b: number) {
  if (b === 0) return `y = ${m}x`
  return `y = ${m}x ${b > 0 ? "+" : "-"} ${Math.abs(b)}`
}

/* =========================
   GENERADOR
========================= */

function generateScenario() {
  const m = randInt(1, 5) * (Math.random() > 0.5 ? 1 : -1)
  const c = randInt(-5, 5)
  const b0Pool = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]
  const b0 = b0Pool[randInt(0, b0Pool.length - 1)]

  const perp = simplifyFraction(-1, m)
  const correct = lineTex(fracTex(perp.n, perp.d), b0)

  return {
    m,
    c,
    b0,
    perp,
    correct,
  }
}

/* =========================
   OPCIONES
========================= */

function generateOptions(s: ReturnType<typeof generateScenario>): Option[] {
  const { m, b0, perp, correct } = s

  const wrong1 = lineTex(m, b0)
  const wrong2 = lineTex(-m, b0)
  const wrong3 = lineTex(fracTex(perp.n, perp.d), 0)
  const wrong4 = lineTex(fracTex(perp.n, perp.d), m)

  const raw: Option[] = [
    { value: correct, correct: true },
    { value: wrong1, correct: false },
    { value: wrong2, correct: false },
    { value: wrong3, correct: false },
    { value: wrong4, correct: false },
  ]

  const seen = new Set<string>()
  const options: Option[] = []
  for (const op of raw) {
    if (seen.has(op.value)) continue
    seen.add(op.value)
    options.push(op)
  }

  const perpSlope = fracTex(perp.n, perp.d)
  const candidateIntercepts = [
    b0 - 3,
    b0 - 2,
    b0 - 1,
    b0 + 1,
    b0 + 2,
    b0 + 3,
    2,
    -2,
  ]

  for (const intercept of candidateIntercepts) {
    if (options.length >= 5) break
    const extra = lineTex(perpSlope, intercept)
    if (seen.has(extra) || extra === correct) continue
    seen.add(extra)
    options.push({ value: extra, correct: false })
  }

  return options.sort(() => Math.random() - 0.5)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function RectasPerpendicularesGame({
  exerciseId,
  classroomId,
  sessionId,
}: {
  exerciseId: string
  classroomId: string
  sessionId?: string
}) {
  const engine = useExerciseEngine({ maxAttempts: 1 })

  const { studentId, gami, gamiLoading, submitAttempt } =
    useExerciseSubmission({
      exerciseId,
      classroomId,
      sessionId,
    })

  const [nonce, setNonce] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)

  const { elapsed, startedAtRef } = useExerciseTimer(engine.canAnswer, nonce)

  const scenario = useMemo(() => {
    const generated = generateScenario()
    return {
      ...generated,
      options: generateOptions(generated),
    }
  }, [nonce])

  const trophyPreview = useMemo(() => computeTrophyGain(elapsed), [elapsed])

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
        baseSlope: scenario.m,
        intercept: scenario.c,
        pointY: scenario.b0,
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce((n) => n + 1)
  }

  const baseTex = lineTex(scenario.m, scenario.c)
  const pointTex = `\\left(0, ${scenario.b0}\\right)`
  const perpSlopeTex = fracTex(scenario.perp.n, scenario.perp.d)

  return (
    <MathProvider>
      <ExerciseShell
        title="Rectas Perpendiculares"
        prompt="Encuentra la ecuacion:"
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Guia paso a paso"
              steps={[
                {
                  title: "Identificar pendiente original",
                  detail: "Primero identificamos la pendiente de la recta dada.",
                  icon: Sigma,
                  content: <MathTex block tex={baseTex} />,
                },
                {
                  title: "Pendiente perpendicular",
                  detail: "La pendiente perpendicular es el inverso aditivo recíproco.",
                  icon: Divide,
                  content: (
                    <>
                      <MathTex block tex={`m_1 = ${scenario.m}`} />
                      <MathTex block tex={`m_2 = -\\frac{1}{m_1} = ${perpSlopeTex}`} />
                    </>
                  ),
                },
                {
                  title: "Usar forma pendiente-interseccion",
                  detail: "Usamos la forma y = mx + b con la pendiente perpendicular y el punto dado.",
                  icon: ShieldCheck,
                  content: (
                    <>
                      <MathTex block tex={`y = mx + b`} />
                      <MathTex block tex={`b = ${scenario.b0}`} />
                      <MathTex block tex={lineTex(perpSlopeTex, scenario.b0)} />
                    </>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta final: <MathTex tex={scenario.correct} />
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div className="text-sm">
              Cual es la recta que pasa por <MathTex tex={pointTex} /> y es perpendicular a{" "}
              <MathTex tex={baseTex} />?
            </div>
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
