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

type Point = { x: number; y: number }
type Mode = "find_midpoint" | "find_A" | "find_B"
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

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function pointTex(p: Point) {
  return `(${p.x},${p.y})`
}

function optionsFromPoint(correct: Point, wrongPoints: Point[]) {
  const correctRaw = pointTex(correct)
  const raw = shuffle([correct, ...wrongPoints]).map((p) => pointTex(p))
  const seen = new Set<string>()
  const out: Option[] = []

  for (const value of raw) {
    if (seen.has(value)) continue
    seen.add(value)
    out.push({ value, correct: value === correctRaw })
  }

  while (out.length < 5) {
    const extra = pointTex({ x: correct.x + randInt(-3, 3), y: correct.y + randInt(-3, 3) })
    if (seen.has(extra) || extra === correctRaw) continue
    seen.add(extra)
    out.push({ value: extra, correct: false })
  }

  return { correctRaw, options: shuffle(out.slice(0, 5)) }
}

/* =========================
   GENERADOR DINAMICO
========================= */

function generateScenario() {
  const mode = choice<Mode>(["find_midpoint", "find_A", "find_B"])

  const a: Point = { x: randInt(-8, 8), y: randInt(-8, 12) }
  let b: Point = { x: randInt(-8, 12), y: randInt(-8, 12) }
  while (b.x === a.x && b.y === a.y) b = { x: randInt(-8, 12), y: randInt(-8, 12) }

  const m = midpoint(a, b)
  // para mantener respuestas enteras en opciones, regeneramos si midpoint no es entero
  if (!Number.isInteger(m.x) || !Number.isInteger(m.y)) return generateScenario()

  if (mode === "find_midpoint") {
    const wrongs: Point[] = [
      { x: m.x + 1, y: m.y },
      { x: m.x, y: m.y + 1 },
      { x: m.x - 1, y: m.y },
      { x: a.x + b.x, y: a.y + b.y }, // olvidar dividir entre 2
    ]
    const built = optionsFromPoint(m, wrongs)
    return {
      mode,
      A: a,
      B: b,
      M: m,
      prompt: "Cual es el punto medio del segmento AB?",
      correctRaw: built.correctRaw,
      options: built.options,
      solveTex: `M=\\left(\\frac{${a.x}+${b.x}}{2},\\frac{${a.y}+${b.y}}{2}\\right)=(${m.x},${m.y})`,
    }
  }

  if (mode === "find_A") {
    // M y B conocidos => A = (2Mx-Bx, 2My-By)
    const target = { x: 2 * m.x - b.x, y: 2 * m.y - b.y }
    const wrongs: Point[] = [
      { x: 2 * m.x + b.x, y: 2 * m.y + b.y },
      { x: b.x, y: b.y },
      { x: m.x, y: m.y },
      { x: target.x + 1, y: target.y - 1 },
    ]
    const built = optionsFromPoint(target, wrongs)
    return {
      mode,
      A: a,
      B: b,
      M: m,
      prompt: "Se conoce M y B. Cual es el punto A?",
      correctRaw: built.correctRaw,
      options: built.options,
      solveTex: `A=(2M_x-B_x,\\,2M_y-B_y)=(${2 * m.x}-${b.x},\\,${2 * m.y}-${b.y})=(${target.x},${target.y})`,
    }
  }

  // find_B
  const target = { x: 2 * m.x - a.x, y: 2 * m.y - a.y }
  const wrongs: Point[] = [
    { x: 2 * m.x + a.x, y: 2 * m.y + a.y },
    { x: a.x, y: a.y },
    { x: m.x, y: m.y },
    { x: target.x - 1, y: target.y + 1 },
  ]
  const built = optionsFromPoint(target, wrongs)
  return {
    mode,
    A: a,
    B: b,
    M: m,
    prompt: "Se conoce A y M. Cual es el punto B?",
    correctRaw: built.correctRaw,
    options: built.options,
    solveTex: `B=(2M_x-A_x,\\,2M_y-A_y)=(${2 * m.x}-${a.x},\\,${2 * m.y}-${a.y})=(${target.x},${target.y})`,
  }
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function PuntoMedioGame({
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
        correctAnswer: scenario.correctRaw,
        question: {
          mode: scenario.mode,
          A: scenario.A,
          B: scenario.B,
          M: scenario.M,
        },
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce((n) => n + 1)
  }

  const formulaTex = `M=\\left(\\frac{x_1+x_2}{2},\\frac{y_1+y_2}{2}\\right)`

  const questionLine =
    scenario.mode === "find_midpoint"
      ? `Dados\\ A${pointTex(scenario.A)}\\ \\text{y}\\ B${pointTex(scenario.B)},\\ \\text{hallar}\\ M.`
      : scenario.mode === "find_A"
        ? `Dado\\ M${pointTex(scenario.M)}\\ \\text{y}\\ B${pointTex(scenario.B)},\\ \\text{hallar}\\ A.`
        : `Dado\\ A${pointTex(scenario.A)}\\ \\text{y}\\ M${pointTex(scenario.M)},\\ \\text{hallar}\\ B.`

  return (
    <MathProvider>
      <ExerciseShell
        title="Punto medio y extremo faltante"
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
                  title: "Formula base",
                  detail: (
                    <span>
                      Usamos la formula de punto medio y, si falta un extremo, despejamos coordenada a coordenada.
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={formulaTex} />,
                },
                {
                  title: "Sustitucion",
                  detail: (
                    <span>
                      Reemplazamos los datos del ejercicio.
                    </span>
                  ),
                  icon: Divide,
                  content: <MathTex block tex={questionLine} />,
                },
                {
                  title: "Calculo final",
                  detail: (
                    <span>
                      Operamos y obtenemos el punto pedido.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: <MathTex block tex={scenario.solveTex} />,
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta: <b>{scenario.correctRaw}</b>
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <MathTex block tex={questionLine} />
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
