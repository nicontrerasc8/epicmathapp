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
   GENERADOR
========================= */

type Scenario = {
  m: number
  questionTex: string
  correct: string
}

function generateScenario(): Scenario {
  const den = choice([2, 3, 4, 5, 6])
  const num = choice([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5])
  const m = num / den
  const mTex = `\\frac{${num}}{${den}}`
  const b = choice([-7, -5, -3, -1, 1, 3, 5, 7])

  const perpNum = -den
  const perpDen = num
  const correct = perpDen === 1
    ? `${perpNum}`
    : perpDen === -1
      ? `${-perpNum}`
      : `\\frac{${perpNum}}{${perpDen}}`

  const questionTex = `
\\text{La recta perpendicular a } y = ${mTex}x ${b >= 0 ? "+" : "-"} ${Math.abs(b)}
\\text{ tiene pendiente:}
`

  return {
    m,
    questionTex,
    correct,
  }
}

/* =========================
   OPCIONES
========================= */

function generateOptions(s: Scenario): Option[] {
  const correct = s.correct
  const wrongSame = `${Number(s.m.toFixed(3))}`
  const wrongOpposite = `${Number((-s.m).toFixed(3))}`
  const wrongInverse = s.m === 0 ? "1" : `${Number((1 / s.m).toFixed(3))}`
  const wrongNegInverse = s.m === 0 ? "-1" : `${Number((-1 / s.m).toFixed(3))}`

  const all: Option[] = [
    { value: correct, correct: true },
    { value: wrongSame, correct: false },
    { value: wrongOpposite, correct: false },
    { value: wrongInverse, correct: false },
    { value: wrongNegInverse, correct: false },
  ]

  const seen = new Set<string>()
  const unique: Option[] = []
  for (const o of all) {
    if (seen.has(o.value)) continue
    seen.add(o.value)
    unique.push(o)
  }
  while (unique.length < 5) {
    const extra = `${choice([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6])}`
    if (!seen.has(extra)) {
      unique.push({ value: extra, correct: false })
      seen.add(extra)
    }
  }

  return shuffle(unique)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function PendientePerpendicularGame({
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
        mOriginal: scenario.m,
        mPerpendicular: scenario.correct,
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
        title="Pendiente de recta perpendicular"
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
                  title: "Identificar la pendiente original",
                  detail: (
                    <span>
                      La recta dada tiene pendiente <MathTex tex={`m_1=\\frac{1}{3}`} />.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <MathTex
                      block
                      tex={`m = \\frac{1}{3}`}
                    />
                  ),
                },
                {
                  title: "Usar la regla de perpendicularidad",
                  detail: (
                    <span>
                      Para rectas perpendiculares, el producto de pendientes es <MathTex tex={`-1`} />.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <MathTex
                      block
                      tex={`m_1 \\cdot m_2 = -1`}
                    />
                  ),
                },
                {
                  title: "Calcular la pendiente perpendicular",
                  detail: (
                    <span>
                      Tomamos el recíproco y cambiamos el signo: <MathTex tex={`m_2=-\\frac{1}{m_1}`} />.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: (
                    <MathTex
                      block
                      tex={`m_2 = -\\frac{1}{m_1} = -\\frac{1}{\\frac{1}{3}} = -3`}
                    />
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta final: <b>-3</b>.
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
