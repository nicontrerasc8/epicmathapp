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

function round2(n: number) {
  return Math.round(n * 100) / 100
}

/* =========================
   GENERADOR (error porcentual)
========================= */

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  // Generamos valores “bonitos”
  const real = choice([100, 120, 150, 200, 250, 300, 400])
  const errorAbs = choice([5, 10, 12, 15, 20, 25])

  const direction = choice([-1, 1]) // subestimación o sobreestimación
  const estimate = real + direction * errorAbs

  const errorPercent = round2((Math.abs(estimate - real) / real) * 100)

  return {
    real,
    estimate,
    errorPercent,
    correct: `${errorPercent} %`,
  }
}

/* =========================
   OPCIONES (A–E)
   Trampas típicas:
   - dividir entre estimado
   - usar diferencia sin valor absoluto
   - error relativo inverso
   - sumar en vez de dividir
========================= */

function generateOptions(s: Scenario): Option[] {
  const seen = new Set<string>()
  const options: Option[] = []

  function add(val: string, correct: boolean) {
    if (seen.has(val)) return
    seen.add(val)
    options.push({ value: val, correct })
  }

  add(s.correct, true)

  // 1) dividir entre estimado
  const wrong1 = round2((Math.abs(s.estimate - s.real) / s.estimate) * 100)
  add(`${wrong1} %`, false)

  // 2) diferencia directa en %
  add(`${Math.abs(s.estimate - s.real)} %`, false)

  // 3) error relativo inverso
  const wrong3 = round2((s.real / s.estimate) * 100)
  add(`${wrong3} %`, false)

  // 4) sumar porcentajes
  const wrong4 = round2((s.estimate / s.real) * 100)
  add(`${wrong4} %`, false)

  while (options.length < 5) {
    const extra = `${randInt(1, 20)} %`
    if (!seen.has(extra) && extra !== s.correct) add(extra, false)
  }

  return options.slice(0, 5).sort(() => Math.random() - 0.5)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function ErrorPorcentualGame({
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
          real: scenario.real,
          estimate: scenario.estimate,
        },
        computed: {
          errorPercent: scenario.errorPercent,
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

  const q1 = `\\text{El precio real de un producto es S/ ${scenario.real},}`
  const q2 = `\\text{pero una estimación lo fija en S/ ${scenario.estimate}.}`
  const q3 = `\\text{¿Cuál es el error porcentual?}`

  const formulaTex = `
\\text{Error \\%} =
\\frac{|\\text{Estimado} - \\text{Real}|}{\\text{Real}} \\times 100
`

  const calcTex = `
\\frac{|${scenario.estimate} - ${scenario.real}|}{${scenario.real}} \\times 100
= ${scenario.correct}
`

  return (
    <MathProvider>
      <ExerciseShell
        title="Cálculo de error porcentual"
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
                  title: "Usar la fórmula del error porcentual",
                  detail: (
                    <span>
                      Se compara el valor estimado con el real.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={formulaTex} />
                    </div>
                  ),
                },
                {
                  title: "Sustituir valores",
                  detail: (
                    <span>
                      Se usa valor absoluto para que el error sea positivo.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={calcTex} />
                    </div>
                  ),
                },
                {
                  title: "Resultado final",
                  detail: <span>Ese es el error porcentual.</span>,
                  icon: ShieldCheck,
                  content: (
                    <MathTex block tex={`\\text{Respuesta: } ${scenario.correct}`} />
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
            <MathTex block tex={q1} />
            <MathTex block tex={q2} />
            <MathTex block tex={q3} />
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={op => <MathTex tex={`\\text{${op.value}}`} />}
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