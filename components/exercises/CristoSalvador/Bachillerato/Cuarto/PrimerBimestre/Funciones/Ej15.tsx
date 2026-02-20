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

function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/* =========================
   GENERADOR
   y = mx + b
   Momento en que se vacía → y = 0
========================= */

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  const m = choice([-2, -3, -4, -5, -6]) // pendiente negativa
  const b = choice([6, 8, 10, 12, 15])

  const xZero = -b / m // cuando y = 0

  const correct = `${xZero} \\text{ min}`

  return {
    m,
    b,
    xZero,
    correct,
  }
}

/* =========================
   OPCIONES
========================= */

function generateOptions(s: Scenario): Option[] {
  const seen = new Set<string>()
  const opts: Option[] = []

  function add(val: string, correct: boolean) {
    if (seen.has(val)) return
    seen.add(val)
    opts.push({ value: val, correct })
  }

  add(s.correct, true)

  // error 1: usar b directamente
  add(`${s.b} \\text{ min}`, false)

  // error 2: usar pendiente como tiempo
  add(`${Math.abs(s.m)} \\text{ min}`, false)

  // error 3: dividir mal (b/m sin signo)
  add(`${Math.abs(s.b / s.m)} \\text{ min}`, false)

  // error 4: sumar en vez de dividir
  add(`${Math.abs(s.b + s.m)} \\text{ min}`, false)

  while (opts.length < 5) {
    const extra = `${Math.floor(Math.random() * 10) + 1} \\text{ min}`
    if (!seen.has(extra)) add(extra, false)
  }

  return opts.slice(0, 5).sort(() => Math.random() - 0.5)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function TanqueVacioGame({
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

  const scenario = useMemo(() => {
    const s = generateScenario()
    return { ...s, options: generateOptions(s) }
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
        question: {
          equation: `y = ${scenario.m}x + ${scenario.b}`,
        },
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  const qTex = `
\\text{La recta } y = ${scenario.m}x + ${scenario.b} 
\\text{ representa la cantidad de agua (litros).}
`
  const qTex2 = `
\\text{¿En qué momento el tanque se vacía?}
`

  const step1 = `
\\text{El tanque se vacía cuando } y = 0.
`

  const step2 = `
0 = ${scenario.m}x + ${scenario.b}
`

  const step3 = `
${scenario.m}x = -${scenario.b}
`

  const step4 = `
x = \\frac{-${scenario.b}}{${scenario.m}} = ${scenario.xZero}
`

  return (
    <MathProvider>
      <ExerciseShell
        title="Momento en que el tanque se vacía"
        prompt="Resuelve:"
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
                  title: "Igualar la función a cero",
                  detail: <span>El tanque está vacío cuando la cantidad de agua es \(y = 0\).</span>,
                  icon: Sigma,
                  content: <MathTex block tex={step1} />,
                },
                {
                  title: "Resolver la ecuación",
                  detail: <span>Despejamos \(x\) para hallar el tiempo en minutos.</span>,
                  icon: Divide,
                  content: (
                    <>
                      <MathTex block tex={step2} />
                      <MathTex block tex={step3} />
                      <MathTex block tex={step4} />
                    </>
                  ),
                },
                {
                  title: "Resultado final",
                  detail: <span>Expresamos el valor obtenido como tiempo de vaciado.</span>,
                  icon: ShieldCheck,
                  content: (
                    <MathTex
                      block
                      tex={`\\text{El tanque se vacía en } ${scenario.correct}`}
                    />
                  ),
                },
              ]}
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <MathTex block tex={qTex} />
            <MathTex block tex={qTex2} />
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
