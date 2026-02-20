"use client"

import { useMemo, useState } from "react"
import { ShieldCheck, Sigma, Divide } from "lucide-react"

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

/* =========================
   HELPERS
========================= */

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}
function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/* =========================
   ESCENARIO FIJO (como imagen)
========================= */

type Scenario = {
  m: number
  x0: number
  y0: number
  b: number
  xCut: number
  correct: string
  questionTex: string
}

function generateScenario(): Scenario {
  for (let i = 0; i < 200; i++) {
    const m = choice([-4, -3, -2, -1, 1, 2, 3, 4])
    const xCut = choice([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5])
    const x0 = choice([-4, -3, -2, -1, 0, 1, 2, 3, 4, 5])
    if (x0 === xCut) continue

    // y = m(x - xCut) => pasa por (xCut, 0)
    const y0 = m * (x0 - xCut)
    const b = -m * xCut

    if (Math.abs(y0) > 20 || y0 === 0) continue

    const correct = `(${xCut},0)`
    const questionTex = `
\\text{La recta que pasa por } (${x0},${y0}) 
\\text{ y tiene pendiente } ${m} 
\\text{ corta al eje X en:}
`

    return { m, x0, y0, b, xCut, correct, questionTex }
  }

  // fallback estable
  return {
    m: -1,
    x0: 3,
    y0: 2,
    b: 5,
    xCut: 5,
    correct: "(5,0)",
    questionTex: `
\\text{La recta que pasa por } (3,2) 
\\text{ y tiene pendiente } -1 
\\text{ corta al eje X en:}
`,
  }
}

/* =========================
   OPCIONES
========================= */

function generateOptions(s: Scenario): Option[] {
  const seen = new Set<string>()
  const options: Option[] = []

  function add(value: string, correct: boolean) {
    if (seen.has(value)) return
    seen.add(value)
    options.push({ value, correct })
  }

  add(s.correct, true)
  add(`(${s.xCut + 1},0)`, false)
  add(`(${s.xCut - 1},0)`, false)
  add(`(0,${s.xCut})`, false)
  add(`(0,${-s.xCut})`, false)

  while (options.length < 5) {
    const extra = `(${choice([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6])},0)`
    if (extra !== s.correct) add(extra, false)
  }

  return shuffle(options)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function CorteEjeXGame({
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

  const { elapsed, startedAtRef } = useExerciseTimer(
    engine.canAnswer,
    nonce
  )

  const scenario = useMemo(() => {
    const s = generateScenario()
    return { ...s, options: generateOptions(s) }
  }, [nonce])

  const trophyPreview = useMemo(
    () => computeTrophyGain(elapsed),
    [elapsed]
  )

  async function pickOption(op: Option) {
    if (!engine.canAnswer) return

    const timeSeconds =
      (Date.now() - startedAtRef.current) / 1000

    setSelected(op.value)
    engine.submit(op.correct)

    await submitAttempt({
      correct: op.correct,
      answer: {
        selected: op.value,
        correctAnswer: scenario.correct,
        m: scenario.m,
        point: [scenario.x0, scenario.y0],
        b: scenario.b,
        options: scenario.options.map(o => o.value),
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  return (
    <MathProvider>
      <ExerciseShell
        title="Intersección con el eje X"
        prompt="Resolver:"
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Guía paso a paso"
              steps={[
                {
                  title: "Encontrar la ecuación de la recta",
                  detail: <span>Usamos la forma pendiente-intersección y luego hallamos el valor de b.</span>,
                  icon: Sigma,
                  content: (
                    <MathTex
                      block
                      tex={`y = ${scenario.m}x + b`}
                    />
                  ),
                },
                {
                  title: `Sustituir el punto (${scenario.x0},${scenario.y0})`,
                  detail: <span>Reemplazamos las coordenadas del punto para despejar b.</span>,
                  icon: Divide,
                  content: (
                    <MathTex
                      block
                      tex={`${scenario.y0} = ${scenario.m}(${scenario.x0}) + b \\Rightarrow b = ${scenario.b}`}
                    />
                  ),
                },
                {
                  title: "Buscar el corte con el eje X",
                  detail: <span>En el eje X se cumple y = 0, por eso resolvemos para x.</span>,
                  icon: ShieldCheck,
                  content: (
                    <MathTex
                      block
                      tex={`0 = ${scenario.m}x + ${scenario.b} \\Rightarrow x = ${scenario.xCut}`}
                    />
                  ),
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
          <div className="text-xs text-muted-foreground mb-2">
            Pregunta
          </div>
          <div className="rounded-lg border bg-background p-3">
            <MathTex block tex={scenario.questionTex} />
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={op => <span>{op.value}</span>}
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

