"use client"

import { useMemo, useState } from "react"
import { ShieldCheck, Sigma } from "lucide-react"

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

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function sciTex(m: number, e: number) {
  return `${m} \\times 10^{${e}}`
}

type Scenario = ReturnType<typeof scenarioP3>

function scenarioP3() {
  for (let tries = 0; tries < 200; tries++) {
    const a1 = choice([2, 3, 4, 5, 6, 7, 8, 9])
    const k1 = randInt(-4, 6)
    const a2 = choice([2, 3, 4, 5, 6, 7, 8])
    const k2 = randInt(-7, 4)

    const mantissa = a1 * a2
    const exponent = k1 + k2

    if (mantissa >= 10 || Math.abs(exponent) > 10) continue

    const correct = sciTex(mantissa, exponent)
    const exprTex = `(${a1} \\times 10^{${k1}})(${a2} \\times 10^{${k2}})`

    return {
      a1,
      k1,
      a2,
      k2,
      mantissa,
      exponent,
      correct,
      exprTex,
      options: buildOptions(mantissa, exponent),
    }
  }

  return {
    a1: 3,
    k1: 4,
    a2: 2,
    k2: -6,
    mantissa: 6,
    exponent: -2,
    correct: "6 \\times 10^{-2}",
    exprTex: `(3 \\times 10^{4})(2 \\times 10^{-6})`,
    options: buildOptions(6, -2),
  }
}

function buildOptions(mantissa: number, exponent: number): Option[] {
  const correct = sciTex(mantissa, exponent)
  const candidates = [
    correct,
    sciTex(mantissa, -exponent),
    sciTex(mantissa, exponent + 2),
    sciTex(Number((mantissa / 10).toFixed(1)), exponent + 1),
    sciTex(mantissa * 10, exponent - 1),
    sciTex(mantissa + 1, exponent),
    sciTex(mantissa, exponent - 2),
  ]

  const seen = new Set<string>()
  const unique: Option[] = []
  for (const value of candidates) {
    if (seen.has(value)) continue
    seen.add(value)
    unique.push({ value, correct: value === correct })
  }

  return shuffle(unique.slice(0, 5))
}

export default function NotacionCientificaPregunta3Game({
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

  const scenario = useMemo(() => scenarioP3(), [nonce])
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
          type: "notacion_cientifica_p3",
          expr_tex: scenario.exprTex,
        },
        computed: {
          mantissa: scenario.mantissa,
          exponent: scenario.exponent,
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

  return (
    <MathProvider>
      <ExerciseShell
        title="Operaciones con números de la forma a×10^k - Pregunta 3"
        prompt="Calcular y expresar en notación científica:"
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
                  title: "Multiplicar las mantisas",
                  detail: <span>Multiplicamos los números que están antes de la potencia de 10.</span>,
                  icon: Sigma,
                  content: <MathTex block tex={`${scenario.a1} \\cdot ${scenario.a2} = ${scenario.mantissa}`} />,
                },
                {
                  title: "Sumar los exponentes",
                  detail: <span>En multiplicación, los exponentes de 10 se suman.</span>,
                  icon: Sigma,
                  content: <MathTex block tex={`${scenario.k1} + (${scenario.k2}) = ${scenario.exponent}`} />,
                },
                {
                  title: "Escribir en notación científica",
                  detail: <span>La mantisa ya queda entre 1 y 10, así que el resultado ya está normalizado.</span>,
                  icon: ShieldCheck,
                  content: <MathTex block tex={scenario.correct} />,
                },
              ]}
              concluding={<span>Respuesta correcta: <MathTex tex={scenario.correct} />.</span>}
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Expresión</div>
          <div className="rounded-lg border bg-background p-3">
            <MathTex block tex={scenario.exprTex} />
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
