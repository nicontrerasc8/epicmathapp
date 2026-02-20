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

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const t = y
    y = x % y
    x = t
  }
  return x || 1
}

function slopeToTex(a: number, b: number) {
  const num = -a
  const den = b
  if (num % den === 0) return `${num / den}`

  const g = gcd(num, den)
  let n = num / g
  let d = den / g
  if (d < 0) {
    n *= -1
    d *= -1
  }
  return `\\frac{${n}}{${d}}`
}

type Scenario = ReturnType<typeof buildScenario>

function buildScenario() {
  for (let i = 0; i < 250; i++) {
    const a = randInt(-8, 8)
    const b = randInt(-8, 8)
    const c = randInt(-10, 10)
    if (a === 0 || b === 0) continue

    const pendiente = slopeToTex(a, b)

    const wrong1 = slopeToTex(-a, b)
    const wrong2 = slopeToTex(a, b)
    const wrong3 = slopeToTex(b, a)
    const wrong4 = `${Math.abs(a)}`

    const options: Option[] = shuffle([
      { value: pendiente, correct: true },
      { value: wrong1, correct: false },
      { value: wrong2, correct: false },
      { value: wrong3, correct: false },
      { value: wrong4, correct: false },
    ])

    return { a, b, c, pendiente, options }
  }

  return {
    a: 5,
    b: 2,
    c: -6,
    pendiente: "-\\frac{5}{2}",
    options: shuffle([
      { value: "-\\frac{5}{2}", correct: true },
      { value: "\\frac{5}{2}", correct: false },
      { value: "-\\frac{2}{5}", correct: false },
      { value: "\\frac{2}{5}", correct: false },
      { value: "5", correct: false },
    ]),
  }
}

export default function PendienteGeneralGame({
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

  const scenario = useMemo(() => buildScenario(), [nonce])

  const trophyPreview = useMemo(() => computeTrophyGain(elapsed), [elapsed])

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
        correctAnswer: scenario.pendiente,
        question: {
          equation: `${scenario.a}x + ${scenario.b}y ${scenario.c >= 0 ? "+" : "-"} ${Math.abs(scenario.c)} = 0`,
        },
        computed: {
          process: "Despejar y para obtener la forma y = mx + b.",
        },
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

  const questionTex = `
\\text{?Cual es la pendiente de la recta } ${scenario.a}x + ${scenario.b}y ${scenario.c >= 0 ? "+" : "-"} ${Math.abs(scenario.c)} = 0?
`

  const step1 = `${scenario.a}x + ${scenario.b}y ${scenario.c >= 0 ? "+" : "-"} ${Math.abs(scenario.c)} = 0`
  const step2 = `${scenario.b}y = ${-scenario.a}x ${-scenario.c >= 0 ? "+" : "-"} ${Math.abs(-scenario.c)}`
  const step3 = `y = ${scenario.pendiente}x ${-scenario.c / scenario.b >= 0 ? "+" : "-"} ${Math.abs(Number((-scenario.c / scenario.b).toFixed(2)))}`

  return (
    <MathProvider>
      <ExerciseShell
        title="Pendiente de una recta en forma general"
        prompt="Selecciona la opcion correcta:"
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
                  title: "Partir de la forma general",
                  detail: (
                    <span>
                      Despejamos y para llevarla a forma <b>y = mx + b</b>.
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={step1} />,
                },
                {
                  title: "Despejar y",
                  detail: (
                    <span>
                      Pasamos el termino en x al otro lado y dividimos entre el coeficiente de y.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <>
                      <MathTex block tex={step2} />
                      <MathTex block tex={step3} />
                    </>
                  ),
                },
                {
                  title: "Identificar la pendiente",
                  detail: (
                    <span>
                      En y = mx + b, la pendiente es el coeficiente de x.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: <MathTex block tex={`m = ${scenario.pendiente}`} />,
                },
              ]}
              concluding={
                <span>
                  Respuesta final: <b>{scenario.pendiente}</b>.
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
            <MathTex block tex={questionTex} />
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
