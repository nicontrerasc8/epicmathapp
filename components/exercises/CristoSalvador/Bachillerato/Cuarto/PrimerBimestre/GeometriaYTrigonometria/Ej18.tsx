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

/* ============================================================
   HELPERS
============================================================ */

type Fraction = { n: number; d: number }
type Step = 1 | 2 | 3

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function choice<T>(arr: T[]) {
  return arr[randInt(0, arr.length - 1)]
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

function simplifyFraction(n: number, d: number): Fraction {
  if (d === 0) return { n: 0, d: 1 }
  const sign = d < 0 ? -1 : 1
  const nn = n * sign
  const dd = Math.abs(d)
  const g = gcd(nn, dd)
  return { n: nn / g, d: dd / g }
}

function fracToTex(f: Fraction) {
  if (f.d === 1) return `${f.n}`
  if (f.n < 0) return `-\\frac{${Math.abs(f.n)}}{${f.d}}`
  return `\\frac{${f.n}}{${f.d}}`
}

function axisMinus(value: number, axis: "x" | "y") {
  return value >= 0 ? `${axis}-${value}` : `${axis}+${Math.abs(value)}`
}

function pointToTex(x: number, y: number) {
  return `\\left(${x},${y}\\right)`
}

function pointEquationTex(m: Fraction, x0: number, y0: number) {
  return `${axisMinus(y0, "y")}=${fracToTex(m)}\\left(${axisMinus(x0, "x")}\\right)`
}

function uniqueValues(options: Option[], needed = 5): Option[] {
  const seen = new Set<string>()
  const result: Option[] = []

  for (const op of options) {
    if (seen.has(op.value)) continue
    seen.add(op.value)
    result.push(op)
    if (result.length >= needed) break
  }

  return result
}

/* ============================================================
   VARIACIONES
============================================================ */

const PROMPTS = [
  "Resuelve paso a paso la mediatriz del segmento dado.",
  "Calcula la mediatriz en 3 pasos: punto medio, pendiente y ecuación.",
  "Determina la mediatriz del segmento siguiendo el proceso completo.",
  "Encuentra la recta mediatriz aplicando el método paso a paso.",
  "Del segmento AB, halla punto medio, pendiente y ecuación de la mediatriz.",
]

const STEP_TEXT: Record<Step, string[]> = {
  1: [
    "a) Halle el punto medio.",
    "a) Determine el punto medio del segmento AB.",
    "a) Calcule el punto medio entre A y B.",
    "a) ¿Cuál es el punto medio del segmento?",
  ],
  2: [
    "b) Determine la pendiente de AB.",
    "b) Calcule la pendiente del segmento AB.",
    "b) ¿Cuál es el valor de m para la recta AB?",
    "b) Obtenga la pendiente de la recta que une A y B.",
  ],
  3: [
    "c) Obtenga la ecuación de la mediatriz.",
    "c) Escriba la ecuación de la mediatriz en forma punto-pendiente.",
    "c) Con el punto medio y la pendiente perpendicular, halle la ecuación.",
    "c) Determine la recta mediatriz del segmento AB.",
  ],
}

/* ============================================================
   GENERADOR
============================================================ */

type Scenario = {
  A: { x: number; y: number }
  B: { x: number; y: number }
  midpoint: { x: number; y: number }
  slopeAB: Fraction
  slopePerp: Fraction
  equationCorrectTex: string
  prompt: string
  stepPrompt: Record<Step, string>
  options: Record<Step, Option[]>
}

function generateScenario(): Scenario {
  const vectors: Array<{ vx: number; vy: number }> = [
    { vx: 1, vy: 1 },
    { vx: 1, vy: 2 },
    { vx: 2, vy: 1 },
    { vx: 1, vy: 3 },
    { vx: 3, vy: 1 },
    { vx: 2, vy: 3 },
    { vx: 3, vy: 2 },
    { vx: -1, vy: 2 },
    { vx: -2, vy: 1 },
    { vx: -3, vy: 2 },
    { vx: 2, vy: -1 },
    { vx: 3, vy: -2 },
  ]

  let mx = 1
  let my = 3
  let v = vectors[0]

  for (let i = 0; i < 200; i++) {
    const candidateMx = randInt(-4, 4)
    const candidateMy = randInt(-4, 4)
    const candidateV = choice(vectors)

    const ax = candidateMx - candidateV.vx
    const ay = candidateMy - candidateV.vy
    const bx = candidateMx + candidateV.vx
    const by = candidateMy + candidateV.vy

    if (Math.abs(ax) > 9 || Math.abs(ay) > 9 || Math.abs(bx) > 9 || Math.abs(by) > 9) {
      continue
    }

    mx = candidateMx
    my = candidateMy
    v = candidateV
    break
  }

  const A = { x: mx - v.vx, y: my - v.vy }
  const B = { x: mx + v.vx, y: my + v.vy }
  const midpoint = { x: mx, y: my }

  const slopeAB = simplifyFraction(B.y - A.y, B.x - A.x)
  const slopePerp = simplifyFraction(-slopeAB.d, slopeAB.n)
  const equationCorrectTex = pointEquationTex(slopePerp, midpoint.x, midpoint.y)

  const midpointCorrect = pointToTex(midpoint.x, midpoint.y)
  const midpointOptions = uniqueValues(
    shuffle([
      { value: midpointCorrect, correct: true },
      { value: pointToTex(midpoint.x + 1, midpoint.y), correct: false },
      { value: pointToTex(midpoint.x - 1, midpoint.y), correct: false },
      { value: pointToTex(midpoint.x, midpoint.y + 1), correct: false },
      { value: pointToTex(midpoint.x, midpoint.y - 1), correct: false },
      { value: pointToTex(A.x + B.x, A.y + B.y), correct: false },
    ])
  )

  const oppositeSlope = simplifyFraction(-slopeAB.n, slopeAB.d)
  const reciprocalSlope = simplifyFraction(slopeAB.d, slopeAB.n)
  const slopeOptions = uniqueValues(
    shuffle([
      { value: fracToTex(slopeAB), correct: true },
      { value: fracToTex(oppositeSlope), correct: false },
      { value: fracToTex(slopePerp), correct: false },
      { value: fracToTex(reciprocalSlope), correct: false },
      { value: "0", correct: false },
      { value: "1", correct: false },
    ])
  )

  const wrongEq1 = pointEquationTex(slopeAB, midpoint.x, midpoint.y)
  const wrongEq2 = pointEquationTex(simplifyFraction(-slopePerp.n, slopePerp.d), midpoint.x, midpoint.y)
  const wrongEq3 = pointEquationTex(slopePerp, midpoint.x + 1, midpoint.y)
  const wrongEq4 = pointEquationTex(slopePerp, midpoint.x, midpoint.y + 1)

  const equationOptions = uniqueValues(
    shuffle([
      { value: equationCorrectTex, correct: true },
      { value: wrongEq1, correct: false },
      { value: wrongEq2, correct: false },
      { value: wrongEq3, correct: false },
      { value: wrongEq4, correct: false },
    ])
  )

  return {
    A,
    B,
    midpoint,
    slopeAB,
    slopePerp,
    equationCorrectTex,
    prompt: choice(PROMPTS),
    stepPrompt: {
      1: choice(STEP_TEXT[1]),
      2: choice(STEP_TEXT[2]),
      3: choice(STEP_TEXT[3]),
    },
    options: {
      1: midpointOptions,
      2: slopeOptions,
      3: equationOptions,
    },
  }
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function MediatrizFullProcessGame({
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

  const [step, setStep] = useState<Step>(1)
  const [nonce, setNonce] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)

  const { elapsed, startedAtRef } = useExerciseTimer(engine.canAnswer, nonce)

  const scenario = useMemo(() => generateScenario(), [nonce])
  const trophyPreview = useMemo(() => computeTrophyGain(elapsed), [elapsed])

  async function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelected(op.value)

    if (!op.correct) {
      engine.submit(false)
      await submitAttempt({
        correct: false,
        answer: { step, selected: op.value },
        timeSeconds: (Date.now() - startedAtRef.current) / 1000,
      })
      return
    }

    if (step < 3) {
      setStep((s) => (s === 1 ? 2 : 3))
      setSelected(null)
      return
    }

    engine.submit(true)
    await submitAttempt({
      correct: true,
      answer: {
        A: scenario.A,
        B: scenario.B,
        midpoint: scenario.midpoint,
        slopeAB: fracToTex(scenario.slopeAB),
        slopePerp: fracToTex(scenario.slopePerp),
        equation: scenario.equationCorrectTex,
      },
      timeSeconds: (Date.now() - startedAtRef.current) / 1000,
    })
  }

  function siguiente() {
    setSelected(null)
    setStep(1)
    engine.reset()
    setNonce((n) => n + 1)
  }

  const midpointTex = `M = \\left(\\frac{${scenario.A.x}+${scenario.B.x}}{2},\\frac{${scenario.A.y}+${scenario.B.y}}{2}\\right) = ${pointToTex(scenario.midpoint.x, scenario.midpoint.y)}`
  const slopeTex = `m = \\frac{${scenario.B.y}-${scenario.A.y}}{${scenario.B.x}-(${scenario.A.x})} = ${fracToTex(scenario.slopeAB)}`
  const perpTex = `m_{\\perp} = -\\frac{1}{m} = ${fracToTex(scenario.slopePerp)}`

  return (
    <MathProvider>
      <ExerciseShell
        title="Mediatriz completa: punto medio, pendiente y ecuación"
        prompt={scenario.prompt}
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Resolución completa"
              steps={[
                {
                  title: "1) Punto medio",
                  detail: (
                    <span>
                      Promediamos las coordenadas de A y B para hallar el
                      punto medio.
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={midpointTex} />,
                },
                {
                  title: "2) Pendiente de AB",
                  detail: (
                    <span>
                      Calculamos la pendiente del segmento AB con la razón
                      de cambios en y y en x.
                    </span>
                  ),
                  icon: Divide,
                  content: <MathTex block tex={slopeTex} />,
                },
                {
                  title: "3) Pendiente perpendicular y ecuación",
                  detail: (
                    <span>
                      La mediatriz es perpendicular a AB y pasa por el
                      punto medio.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={perpTex} />
                      <MathTex block tex={scenario.equationCorrectTex} />
                    </div>
                  ),
                },
              ]}
              concluding={
                <span>
                  Ecuación final: <b>{scenario.equationCorrectTex}</b>
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-sm">
            Dados los puntos <b>A({scenario.A.x},{scenario.A.y})</b> y <b>B({scenario.B.x},{scenario.B.y})</b>:
          </div>
          <div className="mt-2 text-sm">{scenario.stepPrompt[step]}</div>
        </div>

        <OptionsGrid
          options={scenario.options[step]}
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
