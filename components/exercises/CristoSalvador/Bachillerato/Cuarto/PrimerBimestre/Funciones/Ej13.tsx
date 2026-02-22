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
   GENERADOR
========================= */

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b !== 0) {
    const t = a % b
    a = b
    b = t
  }
  return a
}

function simplifyFraction(n: number, d: number) {
  const g = gcd(n, d)
  const nn = n / g
  const dd = d / g
  if (dd < 0) return { n: -nn, d: -dd }
  return { n: nn, d: dd }
}

function fractionInline(n: number, d: number): string {
  const f = simplifyFraction(n, d)
  if (f.d === 1) return `${f.n}`
  return `${f.n}/${f.d}`
}

function formatLinear(a: number, b: number): string {
  return `${a}x - y ${b >= 0 ? "+" : "-"} ${Math.abs(b)} = 0`
}

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  for (let i = 0; i < 200; i++) {
    const a = randInt(-5, 5)
    if (a === 0) continue

    const m = a // pendiente original
    const b = randInt(-5, 5)

    return { a: m, b }
  }

  // fallback exacto como imagen
  return { a: 3, b: 5 }
}

/* =========================
   OPCIONES
========================= */

function generateOptions(s: Scenario): Option[] {
  const originalSlope = s.a
  const perpendicularSlope = fractionInline(-1, originalSlope)
  const inverseOnlySlope = fractionInline(1, originalSlope)

  const correct = `y = ${perpendicularSlope}x + 2`

  const wrongSame = `y = ${originalSlope}x - 2`
  const wrongNegativeOnly = `y = ${-originalSlope}x + 4`
  const wrongInverseOnly = `y = ${inverseOnlySlope}x + 1`
  const wrongRandom = `y = 2x + 1`

  const options = [
    { value: correct, correct: true },
    { value: wrongSame, correct: false },
    { value: wrongNegativeOnly, correct: false },
    { value: wrongInverseOnly, correct: false },
    { value: wrongRandom, correct: false },
  ]

  return options.sort(() => Math.random() - 0.5)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function RectaPerpendicularGame({
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
    return {
      ...s,
      options: generateOptions(s),
    }
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
        correctAnswer: `y = ${fractionInline(-1, scenario.a)}x + 2`,
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  const givenTex = formatLinear(scenario.a, scenario.b)

  const slopeTex = `
${scenario.a}x - y + ${scenario.b} = 0
\\Rightarrow y = ${scenario.a}x + ${scenario.b}
`

  const perpTex = `
m_{\\perp} = -\\frac{1}{${scenario.a}} = ${fractionInline(-1, scenario.a)}
`

  return (
    <MathProvider>
      <ExerciseShell
        title="Rectas perpendiculares"
        prompt="¿Cuál podría ser la ecuación de la otra calle?"
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Resolución paso a paso"
              steps={[
                {
                  title: "Hallamos la pendiente original",
                  detail: <span>Despejamos la ecuación para verla en forma pendiente-intersección.</span>,
                  icon: Sigma,
                  content: <MathTex block tex={slopeTex} />,
                },
                {
                  title: "Pendiente perpendicular",
                  detail: <span>La pendiente perpendicular se obtiene con la regla m_perp = -1/m.</span>,
                  icon: Divide,
                  content: <MathTex block tex={perpTex} />,
                },
                {
                  title: "Conclusión",
                  detail: <span>Cualquier recta con esa pendiente será perpendicular a la original.</span>,
                  icon: ShieldCheck,
                  content: (
                    <p>
                      Una recta perpendicular tiene pendiente
                      <b> −1/m </b>.
                    </p>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta: pendiente {fractionInline(-1, scenario.a)}.
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
            Dos calles son perpendiculares. Una está modelada por{" "}
            <MathTex tex={givenTex} />.
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={(op) => <span>{op.value}</span>}
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
