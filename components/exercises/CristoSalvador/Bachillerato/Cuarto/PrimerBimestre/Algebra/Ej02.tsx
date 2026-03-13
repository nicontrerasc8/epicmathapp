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

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function fmtComma(n: number, decimals = 1) {
  const s = n.toFixed(decimals).replace(/\.0$/, "")
  return s.replace(".", ",")
}

function texDec(n: number, decimals = 1) {
  return fmtComma(n, decimals).replace(",", "{,}")
}

function sciTexComma(m: number, e: number) {
  return `${texDec(m, 1)} \\times 10^{${e}}`
}

function normalizeScientific(m: number, e: number) {
  let mm = m
  let ee = e

  while (mm >= 10) {
    mm /= 10
    ee += 1
  }
  while (mm < 1) {
    mm *= 10
    ee -= 1
  }

  return { m: Number(mm.toFixed(1)), e: ee }
}

type Scenario = ReturnType<typeof scenarioP2>

function scenarioP2() {
  for (let tries = 0; tries < 200; tries++) {
    const a1 = choice([1.2, 1.5, 2.4, 3.2, 4.8, 5.4, 6.3, 7.2, 8.1])
    const k1 = randInt(-5, 4)
    const a2 = choice([2, 3, 4, 5, 6, 7, 8])
    const k2 = randInt(-4, 6)
    const a3 = choice([1.2, 1.5, 2, 2.5, 3, 4, 5, 6])
    const k3 = randInt(-3, 4)

    const numMantissa = Number((a1 * a2).toFixed(2))
    const numExp = k1 + k2
    const rawMantissa = Number((numMantissa / a3).toFixed(2))
    const rawExp = numExp - k3
    const norm = normalizeScientific(rawMantissa, rawExp)

    if (!(norm.m >= 1 && norm.m < 10)) continue
    if (Math.abs(norm.e) > 8) continue

    const correct = sciTexComma(norm.m, norm.e)
    const options = buildOptions(norm.m, norm.e)
    const exprTex = `
\\frac{
  (${fmtComma(a1)} \\times 10^{${k1}})
  (${fmtComma(a2, 0)} \\times 10^{${k2}})
}{
  ${fmtComma(a3)} \\times 10^{${k3}}
}
`

    return {
      a1,
      k1,
      a2,
      k2,
      a3,
      k3,
      numMantissa,
      numExp,
      rawMantissa,
      rawExp,
      normMantissa: norm.m,
      normExp: norm.e,
      correct,
      options,
      exprTex,
    }
  }

  const normMantissa = 2.4
  const normExp = 0
  return {
    a1: 4.8,
    k1: -3,
    a2: 3,
    k2: 5,
    a3: 6,
    k3: 2,
    numMantissa: 14.4,
    numExp: 2,
    rawMantissa: 2.4,
    rawExp: 0,
    normMantissa,
    normExp,
    correct: sciTexComma(normMantissa, normExp),
    options: buildOptions(normMantissa, normExp),
    exprTex: `
\\frac{
  (4,8 \\times 10^{-3})
  (3 \\times 10^{5})
}{
  6 \\times 10^{2}
}
`,
  }
}

function buildOptions(m: number, e: number): Option[] {
  const correct = sciTexComma(m, e)
  const candidates = [
    correct,
    sciTexComma(m, e + 1),
    sciTexComma(m, e - 1),
    sciTexComma(Number((m * 10).toFixed(1)), e - 1),
    sciTexComma(Number((m / 10).toFixed(1)), e + 1),
    sciTexComma(Number((m + 1).toFixed(1)), e),
    sciTexComma(Number((m - 1 > 0 ? m - 1 : m + 0.5).toFixed(1)), e),
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

export default function NotacionCientificaPregunta2Game({
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

  const scenario = useMemo(() => scenarioP2(), [nonce])
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
          type: "notacion_cientifica_p2",
          expr_tex: scenario.exprTex,
        },
        computed: {
          numMantissa: scenario.numMantissa,
          numExp: scenario.numExp,
          resultMantissa: scenario.rawMantissa,
          resultExp: scenario.rawExp,
          normalized: { m: scenario.normMantissa, e: scenario.normExp },
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
        title="Operaciones con números de la forma a×10^k - Pregunta 2"
        prompt="El valor de la expresión, expresado en notación científica, es:"
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
                  title: "Multiplicar el numerador",
                  detail: (
                    <span>
                      Multiplicamos las mantisas y sumamos los exponentes.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={scenario.exprTex} />
                      <MathTex block tex={`\\text{Mantisa: } ${texDec(scenario.a1)}\\cdot ${texDec(scenario.a2, 0)} = ${texDec(scenario.numMantissa, 2)}`} />
                      <MathTex block tex={`\\text{Exponente: } ${scenario.k1} + (${scenario.k2}) = ${scenario.numExp}`} />
                    </div>
                  ),
                },
                {
                  title: "Dividir entre el denominador",
                  detail: (
                    <span>
                      Dividimos mantisas y restamos exponentes.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\frac{${texDec(scenario.numMantissa, 2)}}{${texDec(scenario.a3)}} = ${texDec(scenario.rawMantissa, 2)}`} />
                      <MathTex block tex={`${scenario.numExp} - ${scenario.k3} = ${scenario.rawExp}`} />
                    </div>
                  ),
                },
                {
                  title: "Normalizar",
                  detail: (
                    <span>
                      La mantisa debe cumplir <MathTex tex={`1 \\le m < 10`} />.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`${texDec(scenario.rawMantissa, 2)} \\times 10^{${scenario.rawExp}}`} />
                      <MathTex block tex={scenario.correct} />
                    </div>
                  ),
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
