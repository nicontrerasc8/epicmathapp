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

type Fraction = { num: number; den: number }
type Style = "direct" | "equation" | "points"
type Scenario = ReturnType<typeof generateScenario>

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const t = x % y
    x = y
    y = t
  }
  return x || 1
}

function simplify(f: Fraction): Fraction {
  const sign = f.den < 0 ? -1 : 1
  const num = f.num * sign
  const den = Math.abs(f.den)
  const g = gcd(num, den)
  return { num: num / g, den: den / g }
}

function neg(f: Fraction): Fraction {
  return { num: -f.num, den: f.den }
}

function inv(f: Fraction): Fraction {
  return simplify({ num: f.den, den: f.num })
}

function fracTex(f: Fraction): string {
  const s = simplify(f)
  if (s.den === 1) return `${s.num}`
  const sign = s.num < 0 ? "-" : ""
  return `${sign}\\frac{${Math.abs(s.num)}}{${s.den}}`
}

function equationSlopeTex(m: Fraction, b: number): string {
  const mTex = fracTex(m)
  if (b === 0) return `y = ${mTex}x`
  return b > 0 ? `y = ${mTex}x + ${b}` : `y = ${mTex}x - ${Math.abs(b)}`
}

function randomSlope(): Fraction {
  const useInteger = Math.random() < 0.55
  if (useInteger) {
    let n = randInt(-7, 7)
    while (n === 0) n = randInt(-7, 7)
    return { num: n, den: 1 }
  }
  let num = randInt(-7, 7)
  while (num === 0) num = randInt(-7, 7)
  const den = randInt(2, 6)
  return simplify({ num, den })
}

function makeOptions(correct: string, candidates: string[]): Option[] {
  const seen = new Set<string>()
  const base: Option[] = []
  const all = shuffle([correct, ...candidates])
  for (const v of all) {
    if (seen.has(v)) continue
    seen.add(v)
    base.push({ value: v, correct: v === correct })
  }
  while (base.length < 5) {
    const extra = `${choice(["-", ""])}\\frac{${randInt(1, 5)}}{${choice([2, 3, 4, 5, 6])}}`
    if (seen.has(extra) || extra === correct) continue
    seen.add(extra)
    base.push({ value: extra, correct: false })
  }
  return shuffle(base.slice(0, 5))
}

/* =========================
   GENERADOR DINAMICO
========================= */

function generateScenario() {
  const m = randomSlope()
  const mPerp = simplify(neg(inv(m)))
  const style = choice<Style>(["direct", "equation", "points"])

  const mTex = fracTex(m)
  const correct = fracTex(mPerp)

  const wrongCandidates = [
    fracTex(m),
    fracTex(neg(m)),
    fracTex(inv(m)),
    fracTex(neg(inv(mPerp))), // vuelve a m
    fracTex(neg(mPerp)),
    "0",
  ]
  const options = makeOptions(correct, wrongCandidates)

  let prompt = ""
  let stemTex = ""
  let points: { x1: number; y1: number; x2: number; y2: number } | null = null

  if (style === "direct") {
    prompt = "Si la pendiente de un segmento es:"
    stemTex = `m = ${mTex}`
  } else if (style === "equation") {
    const b = randInt(-6, 6)
    prompt = "Si una recta tiene ecuacion:"
    stemTex = equationSlopeTex(m, b)
  } else {
    // Construimos dos puntos con pendiente m (dx multiplo de denominador)
    const k = randInt(1, 3)
    const dx = m.den * k
    const dy = m.num * k
    const x1 = randInt(-6, 4)
    const y1 = randInt(-6, 4)
    const x2 = x1 + dx
    const y2 = y1 + dy
    points = { x1, y1, x2, y2 }
    prompt = "El segmento une los puntos:"
    stemTex = `A(${x1},${y1}),\\ B(${x2},${y2})`
  }

  return {
    style,
    originalSlope: m,
    originalSlopeTex: mTex,
    perpendicularSlope: mPerp,
    perpendicularSlopeTex: correct,
    prompt,
    stemTex,
    points,
    options,
  }
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function PendienteMediatrizGame({
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
  const scenario: Scenario = useMemo(() => generateScenario(), [nonce])
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
        correctAnswer: scenario.perpendicularSlopeTex,
        originalSlope: scenario.originalSlopeTex,
        style: scenario.style,
        points: scenario.points,
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce((n) => n + 1)
  }

  const ruleTex = `m_{\\perp} = -\\frac{1}{m}`
  const substitutionTex = `m_{\\perp} = -\\frac{1}{${scenario.originalSlopeTex}}`
  const resultTex = `m_{\\perp} = ${scenario.perpendicularSlopeTex}`

  return (
    <MathProvider>
      <ExerciseShell
        title="Pendiente de la mediatriz"
        prompt={scenario.prompt}
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Resolucion paso a paso"
              steps={[
                {
                  title: "Regla de perpendicularidad",
                  detail: <span>La pendiente de una recta perpendicular es la inversa negativa.</span>,
                  icon: Sigma,
                  content: <MathTex block tex={ruleTex} />,
                },
                {
                  title: "Sustituir valor de m",
                  detail: <span>Aplicamos la regla con la pendiente dada.</span>,
                  icon: Divide,
                  content: <MathTex block tex={substitutionTex} />,
                },
                {
                  title: "Resultado final",
                  detail: <span>Simplificamos la fraccion.</span>,
                  icon: ShieldCheck,
                  content: <MathTex block tex={resultTex} />,
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta: <b>{scenario.perpendicularSlopeTex}</b>
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <MathTex block tex={scenario.stemTex} />
            <div className="text-sm">La pendiente de su mediatriz es:</div>
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
