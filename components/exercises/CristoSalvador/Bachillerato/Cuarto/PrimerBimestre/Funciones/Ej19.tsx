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

function pairTex(x: number, y: number) {
  return `(${x},${y})`
}

/* =========================
   GENERADOR
   y = m1x + b1
   y = m2x + b2
========================= */

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  const m1 = choice([1, 2, 3])
  const m2 = choice([-1, -2, -3])
  const x = choice([1, 2, 3, -1])
  const b1 = choice([0, 1, 2])
  const b2 = choice([5, 6, 7])

  // Forzamos que se intersecten en un punto “bonito”
  // y = m1x + b1
  const y = m1 * x + b1
  // Ajustamos b2 para que coincida en ese punto
  const newB2 = y - m2 * x

  return {
    m1,
    b1,
    m2,
    b2: newB2,
    x,
    y,
    correct: pairTex(x, y),
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

  // errores típicos
  add(pairTex(s.x + 1, s.y), false)
  add(pairTex(s.x, s.y + 2), false)
  add(pairTex(-s.x, s.y), false)
  add(pairTex(s.x, -s.y), false)

  while (opts.length < 5) {
    const extra = pairTex(
      Math.floor(Math.random() * 6) - 2,
      Math.floor(Math.random() * 8) - 2
    )
    if (!seen.has(extra)) add(extra, false)
  }

  return opts.slice(0, 5).sort(() => Math.random() - 0.5)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function InterseccionRectasGame({
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
          line1: `y = ${scenario.m1}x + ${scenario.b1}`,
          line2: `y = ${scenario.m2}x + ${scenario.b2}`,
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
\\text{Las rectas } 
y = ${scenario.m1}x + ${scenario.b1} 
\\text{ y } 
y = ${scenario.m2}x + ${scenario.b2} 
\\text{ se intersectan en:}
`

  const step1 = `
${scenario.m1}x + ${scenario.b1} = ${scenario.m2}x + ${scenario.b2}
`

  const step2 = `
(${scenario.m1} - ${scenario.m2})x = ${scenario.b2 - scenario.b1}
`

  const step3 = `
x = ${scenario.x}
`

  const step4 = `
y = ${scenario.y}
`

  const finalTex = `
\\text{Intersección: } ${scenario.correct}
`

  return (
    <MathProvider>
      <ExerciseShell
        title="Intersección de dos rectas"
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
                  title: "Igualar las ecuaciones",
                  detail: <span>En el punto de intersección ambas rectas tienen el mismo valor de y.</span>,
                  icon: Sigma,
                  content: <MathTex block tex={step1} />,
                },
                {
                  title: "Resolver para x",
                  detail: <span>Aislamos x para obtener la coordenada horizontal del punto común.</span>,
                  icon: Divide,
                  content: (
                    <>
                      <MathTex block tex={step2} />
                      <MathTex block tex={step3} />
                    </>
                  ),
                },
                {
                  title: "Sustituir para hallar y",
                  detail: <span>Reemplazamos el valor de x en una de las rectas para encontrar y.</span>,
                  icon: ShieldCheck,
                  content: (
                    <>
                      <MathTex block tex={step4} />
                      <MathTex block tex={finalTex} />
                    </>
                  ),
                },
              ]}
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3">
            <MathTex block tex={qTex} />
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
