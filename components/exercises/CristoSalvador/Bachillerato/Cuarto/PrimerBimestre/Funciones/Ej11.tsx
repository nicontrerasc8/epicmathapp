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
function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/* =========================
   GENERADOR
   C(x) = mx + b
   dados dos puntos
========================= */

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  // Generamos pendiente "bonita"
  const m = choice([10, 15, 18, 20, 25])
  const b = choice([100, 200, 300, 450])

  const x1 = choice([40, 50, 60])
  const x2 = choice([100, 120, 150])

  const y1 = m * x1 + b
  const y2 = m * x2 + b

  const correct = `C = ${m}x ${b >= 0 ? "+" : "-"} ${Math.abs(b)}`

  return {
    x1,
    x2,
    y1,
    y2,
    m,
    b,
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

  // Error 1: pendiente incorrecta (usar diferencia sin dividir)
  add(`C = ${s.y2 - s.y1}x + ${s.b}`, false)

  // Error 2: pendiente correcta pero b mal
  add(`C = ${s.m}x + ${s.y1}`, false)

  // Error 3: intercambiar pendiente
  add(`C = ${s.b}x + ${s.m}`, false)

  // Error 4: dividir mal (usar x2 en vez de diferencia)
  add(`C = ${Math.round((s.y2 - s.y1) / s.x2)}x + ${s.b}`, false)

  while (opts.length < 5) {
    const extra = `C = ${randInt(5, 30)}x + ${randInt(50, 500)}`
    if (!seen.has(extra)) add(extra, false)
  }

  return opts.slice(0, 5).sort(() => Math.random() - 0.5)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function ModeloLinealGame({
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
          point1: [scenario.x1, scenario.y1],
          point2: [scenario.x2, scenario.y2],
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

  const qTex1 = `
\\text{El costo total } C \\text{ está dado por una relación lineal.}
`
  const qTex2 = `
\\text{Se sabe que producir } ${scenario.x1} \\text{ camisetas cuesta } ${scenario.y1}.
`
  const qTex3 = `
\\text{Y producir } ${scenario.x2} \\text{ camisetas cuesta } ${scenario.y2}.
`
  const qTex4 = `
\\text{¿Cuál es el modelo lineal correcto?}
`

  const step1 = `
m = \\frac{${scenario.y2} - ${scenario.y1}}{${scenario.x2} - ${scenario.x1}}
= ${scenario.m}
`

  const step3 = `
${scenario.y1} = ${scenario.m}(${scenario.x1}) + b
`

  const finalTex = `
C = ${scenario.m}x + ${scenario.b}
`

  return (
    <MathProvider>
      <ExerciseShell
        title="Modelo lineal a partir de dos puntos"
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
                  title: "Calcular la pendiente",
                  detail: <span>Aplicamos la fórmula de pendiente con los dos puntos dados.</span>,
                  icon: Sigma,
                  content: <MathTex block tex={step1} />,
                },
                {
                  title: "Usar la forma C = mx + b",
                  detail: <span>Sustituimos un punto para hallar el término independiente.</span>,
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`C = mx + b`} />
                      <MathTex block tex={step3} />
                      <MathTex block tex={`b = ${scenario.b}`} />
                    </div>
                  ),
                },
                {
                  title: "Modelo final",
                  detail: <span>Escribimos el modelo lineal completo.</span>,
                  icon: ShieldCheck,
                  content: <MathTex block tex={finalTex} />,
                },
              ]}
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <MathTex block tex={qTex1} />
            <MathTex block tex={qTex2} />
            <MathTex block tex={qTex3} />
            <MathTex block tex={qTex4} />
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
