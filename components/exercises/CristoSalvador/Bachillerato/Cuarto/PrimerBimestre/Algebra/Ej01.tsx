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

function almostInt(n: number) {
  return Math.abs(n - Math.round(n)) < 1e-9
}

function fmtMantissa(n: number) {
  const x = Number(n.toFixed(1))
  return almostInt(x) ? String(Math.round(x)) : String(x)
}

function texDecimal(n: number) {
  return fmtMantissa(n).replace(".", "{,}")
}

function texScientific(m: number, e: number) {
  return `${texDecimal(m)} \\times 10^{${e}}`
}

function normalizeScientific(m: number, e: number, decimals = 1) {
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

  mm = Number(mm.toFixed(decimals))
  if (mm >= 10) {
    mm /= 10
    ee += 1
    mm = Number(mm.toFixed(decimals))
  }

  return { m: mm, e: ee }
}

function mulPow10Tex(a: number, k: number) {
  const aa = Number(a.toFixed(1))
  const aStr = almostInt(aa) ? String(Math.round(aa)) : String(aa)
  return `${aStr} \\times 10^{${k}}`
}

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  for (let tries = 0; tries < 250; tries++) {
    const a1 = randInt(2, 9) + choice([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9])
    const a2 = randInt(2, 9)
    const a3 = randInt(1, 9) + choice([0.2, 0.4, 0.6, 0.8])
    const k1 = randInt(2, 7)
    const k2 = randInt(-6, -1)
    const k3 = randInt(1, 4)

    const rawMantissa = (a1 * a2) / a3
    const rawExponent = k1 + k2 - k3
    const norm = normalizeScientific(rawMantissa, rawExponent, 1)

    if (!(norm.m >= 1 && norm.m < 10)) continue
    if (Math.abs(norm.e) > 9) continue

    return {
      a1: Number(a1.toFixed(1)),
      a2,
      a3: Number(a3.toFixed(1)),
      k1,
      k2,
      k3,
      rawMantissa: Number(rawMantissa.toFixed(2)),
      rawExponent,
      normM: norm.m,
      normE: norm.e,
      correct: texScientific(norm.m, norm.e),
    }
  }

  const norm = normalizeScientific(6, 0, 1)
  return {
    a1: 3.6,
    a2: 2,
    a3: 1.2,
    k1: 5,
    k2: -3,
    k3: 2,
    rawMantissa: 6,
    rawExponent: 0,
    normM: norm.m,
    normE: norm.e,
    correct: texScientific(norm.m, norm.e),
  }
}

function generateOptions(s: Scenario): Option[] {
  const correct = texScientific(s.normM, s.normE)
  const candidates = [
    correct,
    texScientific(s.normM, s.normE + 1),
    texScientific(s.normM, s.normE - 1),
    texScientific(Number((s.normM / 10).toFixed(1)), s.normE + 1),
    texScientific(Number((s.normM * 10).toFixed(1)), s.normE - 1),
    texScientific(Number((s.normM + 1).toFixed(1)), s.normE),
    texScientific(Number((s.normM - 1 > 0 ? s.normM - 1 : s.normM + 0.4).toFixed(1)), s.normE),
    texScientific(s.normM, s.rawExponent),
  ]

  const seen = new Set<string>()
  const unique: Option[] = []

  for (const value of shuffle(candidates)) {
    if (seen.has(value)) continue
    seen.add(value)
    unique.push({ value, correct: value === correct })
  }

  while (unique.length < 5) {
    const extra = texScientific(s.normM, s.normE + randInt(-4, 4))
    if (!seen.has(extra) && extra !== correct) {
      seen.add(extra)
      unique.push({ value: extra, correct: false })
    }
  }

  return shuffle(unique.slice(0, 5))
}

export default function NotacionCientificaGame({
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
        correctAnswer: scenario.correct,
        question: {
          a1: scenario.a1,
          a2: scenario.a2,
          a3: scenario.a3,
          k1: scenario.k1,
          k2: scenario.k2,
          k3: scenario.k3,
        },
        computed: {
          rawMantissa: scenario.rawMantissa,
          rawExponent: scenario.rawExponent,
          normalized: { m: scenario.normM, e: scenario.normE },
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

  const exprTex = `
\\frac{
  (${mulPow10Tex(scenario.a1, scenario.k1)})
  (${mulPow10Tex(scenario.a2, scenario.k2)})
}{
  ${mulPow10Tex(scenario.a3, scenario.k3)}
}
`

  return (
    <MathProvider>
      <ExerciseShell
        title="Operaciones con números de la forma a×10^k"
        prompt="El valor de la expresión, expresado en notación científica, es:"
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
                  title: "Separar mantisas y potencias de 10",
                  detail: <span>Operamos mantisas por un lado y exponentes por otro.</span>,
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={exprTex} />
                      <MathTex block tex={`\\text{Mantisa} = \\frac{${scenario.a1} \\cdot ${scenario.a2}}{${scenario.a3}}`} />
                      <MathTex block tex={`\\text{Exponentes} = ${scenario.k1} + (${scenario.k2}) - ${scenario.k3}`} />
                    </div>
                  ),
                },
                {
                  title: "Calcular el resultado intermedio",
                  detail: <span>Resolvemos la parte numérica y la potencia de 10.</span>,
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\frac{${scenario.a1} \\cdot ${scenario.a2}}{${scenario.a3}} = ${scenario.rawMantissa}`} />
                      <MathTex block tex={`${scenario.k1} + (${scenario.k2}) - ${scenario.k3} = ${scenario.rawExponent}`} />
                      <MathTex block tex={`${scenario.rawMantissa} \\times 10^{${scenario.rawExponent}}`} />
                    </div>
                  ),
                },
                {
                  title: "Normalizar a notación científica",
                  detail: <span>La mantisa debe cumplir <MathTex tex={`1 \\le m < 10`} />.</span>,
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\text{Resultado (normalizado)} = ${scenario.correct}`} />
                      <MathTex block tex={`1 \\le ${texDecimal(scenario.normM)} < 10`} />
                    </div>
                  ),
                },
              ]}
              concluding={<span>Respuesta final: <MathTex tex={scenario.correct} />.</span>}
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3">
            <MathTex block tex={exprTex} />
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
