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

function fracTex(n: number, d: number) {
  if (d === 1) return `${n}`
  if (d === -1) return `${-n}`
  return `\\frac{${n}}{${d}}`
}

/* =========================
   GENERADOR (pendiente)
   Forma: ax + by + c = 0
   Pendiente m = -a/b
========================= */

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  let a = 0
  let b = 0

  // Evitamos b=0 (sería recta vertical)
  while (b === 0) {
    a = choice([-4, -3, -2, -1, 1, 2, 3, 4])
    b = choice([-4, -3, -2, -1, 1, 2, 3, 4])
  }

  const c = randInt(-10, 10)

  const slopeNum = -a
  const slopeDen = b

  return {
    a,
    b,
    c,
    slopeNum,
    slopeDen,
    correct: fracTex(slopeNum, slopeDen),
  }
}

/* =========================
   OPCIONES (A–E)
   Trampas típicas:
   - a/b
   - -b/a
   - b/a
   - solo a o b
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

  // Error 1: a/b
  add(fracTex(s.a, s.b), false)

  // Error 2: -b/a
  add(fracTex(-s.b, s.a), false)

  // Error 3: b/a
  add(fracTex(s.b, s.a), false)

  // Error 4: solo a
  add(`${s.a}`, false)

  while (opts.length < 5) {
    const extra = `${randInt(-5, 5)}`
    if (!seen.has(extra)) add(extra, false)
  }

  return opts.slice(0, 5).sort(() => Math.random() - 0.5)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function PendienteRectaGame({
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
          a: scenario.a,
          b: scenario.b,
          c: scenario.c,
        },
        computed: {
          slope: scenario.correct,
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

  const eqTex = `${scenario.a}x ${scenario.b >= 0 ? "+" : "-"} ${Math.abs(
    scenario.b
  )}y ${scenario.c >= 0 ? "+" : "-"} ${Math.abs(scenario.c)} = 0`

  const step1 = `\\text{Forma general: } ax + by + c = 0`
  const step2 = `\\text{Despejamos } y:`
  const despejeTex = `
${scenario.a}x ${scenario.b >= 0 ? "+" : "-"} ${Math.abs(
    scenario.b
  )}y ${scenario.c >= 0 ? "+" : "-"} ${Math.abs(scenario.c)} = 0
`
  const slopeTex = `
m = -\\frac{a}{b} = -\\frac{${scenario.a}}{${scenario.b}} = ${scenario.correct}
`

  return (
    <MathProvider>
      <ExerciseShell
        title="Pendiente de una recta"
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
                  title: "Usar la fórmula de la pendiente",
                  detail: (
                    <span>
                      Para una recta en forma general <b>ax + by + c = 0</b>.
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={step1} />,
                },
                {
                  title: "Aplicar la fórmula",
                  detail: (
                    <span>
                      La pendiente es <b>m = -a/b</b>.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={despejeTex} />
                      <MathTex block tex={slopeTex} />
                    </div>
                  ),
                },
                {
                  title: "Resultado final",
                  detail: <span>Esa es la pendiente.</span>,
                  icon: ShieldCheck,
                  content: (
                    <MathTex
                      block
                      tex={`\\text{Pendiente: } ${scenario.correct}`}
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
          <div className="rounded-lg border bg-background p-3">
            <MathTex block tex={`\\text{La recta } ${eqTex} \\text{ tiene pendiente:}`} />
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