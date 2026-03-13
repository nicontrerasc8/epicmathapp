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

type Scenario = {
  A: { x: number; y: number }
  B: { x: number; y: number }
  mid: { x: number; y: number }
  correct: string
  mode: "horizontal" | "vertical" | "oblique"
  options: Option[]
}

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function formatLinear(a: number, b: number, c: number) {
  const aTerm = a === 1 ? "x" : a === -1 ? "-x" : `${a}x`
  const bSign = b >= 0 ? "+" : "-"
  const bAbs = Math.abs(b)
  const bTerm = bAbs === 1 ? "y" : `${bAbs}y`
  return `${aTerm} ${bSign} ${bTerm} = ${c}`
}

function buildOptions(correct: string, wrongs: string[]) {
  const pool = shuffle([
    { value: correct, correct: true },
    ...wrongs.map((w) => ({ value: w, correct: false })),
  ])

  const seen = new Set<string>()
  const unique: Option[] = []
  for (const op of pool) {
    if (seen.has(op.value)) continue
    seen.add(op.value)
    unique.push(op)
  }

  while (unique.length < 5) {
    const extra = `${choice(["x", "y"])} = ${randInt(-9, 9)}`
    if (seen.has(extra) || extra === correct) continue
    seen.add(extra)
    unique.push({ value: extra, correct: false })
  }

  return shuffle(unique.slice(0, 5))
}

/* =========================
   GENERADOR DINAMICO
========================= */

function generateScenario(previousMode?: Scenario["mode"]): Scenario {
  const modePool: Scenario["mode"][] = previousMode
    ? ["horizontal", "vertical", "oblique"].filter((m) => m !== previousMode) as Scenario["mode"][]
    : ["horizontal", "vertical", "oblique"]

  const mode = choice(modePool)

  let A: Scenario["A"]
  let B: Scenario["B"]
  let mid: Scenario["mid"]
  let correct: string
  let options: Option[]

  if (mode === "horizontal") {
    const y = randInt(-5, 8)
    const x1 = randInt(-8, 0)
    const x2 = randInt(1, 8)

    A = { x: x1, y }
    B = { x: x2, y }

    mid = { x: (x1 + x2) / 2, y }
    correct = `x = ${mid.x}`
    options = buildOptions(correct, [
      `y = ${mid.y}`,
      `x = ${A.x}`,
      `x = ${B.x}`,
      `x = ${mid.y}`,
      `y = ${A.y}`,
    ])
  } else if (mode === "vertical") {
    const x = randInt(-5, 8)
    const y1 = randInt(-8, 0)
    const y2 = randInt(1, 8)

    A = { x, y: y1 }
    B = { x, y: y2 }

    mid = { x, y: (y1 + y2) / 2 }
    correct = `y = ${mid.y}`
    options = buildOptions(correct, [
      `x = ${mid.x}`,
      `y = ${A.y}`,
      `y = ${B.y}`,
      `y = ${mid.x}`,
      `x = ${A.x}`,
    ])
  } else {
    for (;;) {
      const ax = randInt(-7, 5)
      const ay = randInt(-7, 5)
      const dx = choice([-3, -2, -1, 1, 2, 3])
      const dy = choice([-3, -2, -1, 1, 2, 3])
      if (dx === 0 || dy === 0) continue

      const bx = ax + 2 * dx
      const by = ay + 2 * dy
      if (bx < -9 || bx > 9 || by < -9 || by > 9) continue

      A = { x: ax, y: ay }
      B = { x: bx, y: by }
      mid = { x: ax + dx, y: ay + dy }

      const a = dx
      const b = dy
      const c = a * mid.x + b * mid.y

      const parallelC = dy * mid.x - dx * mid.y
      const throughAC = a * A.x + b * A.y
      const swappedC = a * mid.y + b * mid.x
      const wrongSignC = -c

      correct = formatLinear(a, b, c)
      options = buildOptions(correct, [
        formatLinear(dy, -dx, parallelC),
        formatLinear(a, b, throughAC),
        formatLinear(a, b, swappedC),
        formatLinear(a, b, wrongSignC),
        formatLinear(-a, -b, c),
      ])
      break
    }
  }

  return { A, B, mid, correct, mode, options }
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function MediatrisSegmentoGame({
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
  const [lastMode, setLastMode] = useState<Scenario["mode"] | null>(null)

  const { elapsed, startedAtRef } = useExerciseTimer(engine.canAnswer, nonce)
  const scenario = useMemo(() => generateScenario(lastMode ?? undefined), [nonce, lastMode])
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
        question: {
          A: scenario.A,
          B: scenario.B,
          mode: scenario.mode,
        },
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setLastMode(scenario.mode)
    setNonce((n) => n + 1)
  }

  const promptText = choice([
    "Cual es la ecuacion de la mediatriz?",
    "Halla la mediatriz del segmento AB.",
    "Selecciona la recta mediatriz correcta.",
    "Determina la recta perpendicular por el punto medio.",
  ])

  const midpointTex = `
M\\left(\\frac{${scenario.A.x}+${scenario.B.x}}{2},\\;
\\frac{${scenario.A.y}+${scenario.B.y}}{2}\\right)
=
(${scenario.mid.x}, ${scenario.mid.y})
`

  const orientationTex =
    scenario.mode === "horizontal"
      ? `y_1 = y_2 \\Rightarrow \\text{segmento horizontal} \\Rightarrow \\text{mediatriz vertical}`
      : scenario.mode === "vertical"
        ? `x_1 = x_2 \\Rightarrow \\text{segmento vertical} \\Rightarrow \\text{mediatriz horizontal}`
        : `m_{AB}=\\frac{${scenario.B.y - scenario.A.y}}{${scenario.B.x - scenario.A.x}},\\;
m_{\\perp}= -\\frac{1}{m_{AB}}`

  const equationTex = scenario.correct

  return (
    <MathProvider>
      <ExerciseShell
        title="Mediatriz de un segmento"
        prompt={promptText}
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
                  title: "Calcular el punto medio",
                  detail: (
                    <span>
                      Promediamos las coordenadas de A y B para obtener el punto medio del segmento.
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={midpointTex} />,
                },
                {
                  title: "Identificar orientacion",
                  detail: (
                    <span>
                      En este item puede salir horizontal, vertical u oblicuo.
                      La mediatriz siempre es perpendicular al segmento y pasa por su punto medio.
                    </span>
                  ),
                  icon: Divide,
                  content: <MathTex block tex={orientationTex} />,
                },
                {
                  title: "Escribir la ecuacion",
                  detail: (
                    <span>
                      La mediatriz pasa por el punto medio y toma la forma correspondiente segun la orientacion.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: <MathTex block tex={equationTex} />,
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta: <b>{scenario.correct}</b>
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3">
            La recta pasa por los puntos <b>A({scenario.A.x}, {scenario.A.y})</b> y{" "}
            <b>B({scenario.B.x}, {scenario.B.y})</b>.
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
