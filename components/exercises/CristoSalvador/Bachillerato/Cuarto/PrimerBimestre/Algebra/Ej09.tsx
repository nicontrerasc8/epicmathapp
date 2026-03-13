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

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function texThousands(n: number) {
  const s = Math.round(n).toString()
  const parts: string[] = []
  let i = s.length
  while (i > 3) {
    parts.unshift(s.slice(i - 3, i))
    i -= 3
  }
  parts.unshift(s.slice(0, i))
  return parts.join("\\,")
}

function texDecComma(n: number, decimals = 2) {
  let s = Number(n.toFixed(decimals)).toString()
  if (s.includes("e") || s.includes("E")) s = n.toFixed(decimals)
  if (!s.includes(".")) return s
  const [a, b] = s.split(".")
  return `${a}{,}${b}`
}

function fracTex(numTex: string, denTex: string) {
  return `t = \\frac{${numTex}}{${denTex}}`
}

function yearsTex(value: number) {
  return `t \\approx ${texDecComma(value, 2)}\\ \\text{años}`
}

/* =========================
   GENERADOR
========================= */

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  for (let tries = 0; tries < 250; tries++) {
    const P0 = choice([30000, 40000, 50000, 60000, 70000, 80000, 90000])
    const ratio = choice([1.2, 1.25, 1.3, 1.4, 1.5, 1.6, 1.75, 1.8, 2, 2.25])
    const Pt = Math.round(P0 * ratio)
    const k = choice([0.01, 0.02, 0.03, 0.04, 0.05, 0.06])
    const promptStyle = choice(["directo", "modelo", "objetivo"] as const)
    const answerStyle = choice(["ratio", "quotient", "approx"] as const)

    if (Pt <= P0 || ratio <= 1) continue

    const approxYears = Math.log(ratio) / k

    return {
      P0,
      Pt,
      ratio,
      k,
      promptStyle,
      answerStyle,
      P0Tex: texThousands(P0),
      PtTex: texThousands(Pt),
      ratioTex: texDecComma(ratio, 2),
      ratioMinus1: ratio - 1,
      ratioMinus1Tex: texDecComma(ratio - 1, 2),
      kTex: texDecComma(k, 2),
      approxYears,
      approxYearsTex: texDecComma(approxYears, 2),
    }
  }

  const ratio = 1.6
  const k = 0.03
  return {
    P0: 50000,
    Pt: 80000,
    ratio,
    k,
    promptStyle: "directo" as const,
    answerStyle: "ratio" as const,
    P0Tex: texThousands(50000),
    PtTex: texThousands(80000),
    ratioTex: "1{,}6",
    ratioMinus1: 0.6,
    ratioMinus1Tex: "0{,}6",
    kTex: "0{,}03",
    approxYears: Math.log(ratio) / k,
    approxYearsTex: texDecComma(Math.log(ratio) / k, 2),
  }
}

/* =========================
   OPCIONES
========================= */

function buildCorrectValue(s: Scenario) {
  if (s.answerStyle === "quotient") {
    return fracTex(`\\ln\\left(\\frac{${s.PtTex}}{${s.P0Tex}}\\right)`, s.kTex)
  }
  if (s.answerStyle === "approx") {
    return yearsTex(s.approxYears)
  }
  return fracTex(`\\ln\\left(${s.ratioTex}\\right)`, s.kTex)
}

function generateOptions(s: Scenario): Option[] {
  const correct = buildCorrectValue(s)
  const approxWrong1 = yearsTex(s.approxYears + choice([-2.5, -1.5, 1.5, 2.5]))
  const approxWrong2 = yearsTex(Math.log(s.ratioMinus1) / s.k)
  const exactRatio = fracTex(`\\ln\\left(${s.ratioTex}\\right)`, s.kTex)
  const exactQuotient = fracTex(`\\ln\\left(\\frac{${s.PtTex}}{${s.P0Tex}}\\right)`, s.kTex)
  const wrongLnMinus1 = fracTex(`\\ln\\left(${s.ratioMinus1Tex}\\right)`, s.kTex)
  const wrongNoLn = fracTex(`${s.ratioTex}`, s.kTex)
  const wrongMissingDivide = `t = \\ln\\left(\\frac{${s.PtTex}}{${s.P0Tex}}\\right)`
  const wrongLnTarget = fracTex(`\\ln\\left(${s.PtTex}\\right)`, s.kTex)
  const wrongK = fracTex(`\\ln\\left(${s.ratioTex}\\right)`, texDecComma(s.k + choice([-0.02, -0.01, 0.01, 0.02]), 2))

  const pool = [
    exactRatio,
    exactQuotient,
    yearsTex(s.approxYears),
    approxWrong1,
    approxWrong2,
    wrongLnMinus1,
    wrongNoLn,
    wrongMissingDivide,
    wrongLnTarget,
    wrongK,
  ]

  const seen = new Set<string>()
  const unique: Option[] = []

  unique.push({ value: correct, correct: true })
  seen.add(correct)

  for (const value of shuffle(pool)) {
    if (seen.has(value)) continue
    seen.add(value)
    unique.push({ value, correct: false })
    if (unique.length === 5) break
  }

  while (unique.length < 5) {
    const extra = yearsTex(s.approxYears + randInt(3, 6))
    if (!seen.has(extra)) {
      seen.add(extra)
      unique.push({ value: extra, correct: false })
    }
  }

  return shuffle(unique)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function ModeloExponencialPoblacionGame({
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
      correct: buildCorrectValue(s),
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
          P0: scenario.P0,
          Pt: scenario.Pt,
          k: scenario.k,
          promptStyle: scenario.promptStyle,
          answerStyle: scenario.answerStyle,
        },
        computed: {
          ratio: scenario.ratio,
          ratioMinus1: scenario.ratioMinus1,
          approxYears: scenario.approxYears,
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

  const modelTex = String.raw`P(t)=${scenario.P0Tex}\,e^{${scenario.kTex}t}`
  const eqTex = String.raw`${scenario.PtTex}=${scenario.P0Tex}\,e^{${scenario.kTex}t}`
  const divTex = String.raw`\frac{${scenario.PtTex}}{${scenario.P0Tex}}=e^{${scenario.kTex}t}`
  const ratioTex = String.raw`\frac{${scenario.PtTex}}{${scenario.P0Tex}}=${scenario.ratioTex}`
  const lnTex = String.raw`\ln\left(\frac{${scenario.PtTex}}{${scenario.P0Tex}}\right)=${scenario.kTex}\,t`
  const solveTex = String.raw`t=\frac{\ln\left(\frac{${scenario.PtTex}}{${scenario.P0Tex}}\right)}{${scenario.kTex}}=\frac{\ln\left(${scenario.ratioTex}\right)}{${scenario.kTex}}`
  const approxTex = String.raw`t\approx ${scenario.approxYearsTex}`

  const promptText =
    scenario.promptStyle === "modelo"
      ? `Según el modelo mostrado, ¿en qué tiempo se alcanza ${scenario.PtTex} habitantes?`
      : scenario.promptStyle === "objetivo"
        ? `Si la población parte de ${scenario.P0Tex} habitantes, ¿cuándo llegará a ${scenario.PtTex}?`
        : `La población de una ciudad sigue el modelo indicado. ¿Después de cuántos años alcanzará ${scenario.PtTex} habitantes?`

  return (
    <MathProvider>
      <ExerciseShell
        title="Modelo exponencial de población"
        prompt="¿Después de cuántos años la población alcanzará el valor indicado?"
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
                  title: "Plantear la ecuación",
                  detail: <span>Reemplazamos el valor objetivo en el modelo.</span>,
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={String.raw`\text{Modelo: } ${modelTex}`} />
                      <MathTex block tex={String.raw`\text{Buscamos } t \text{ cuando } P(t)=${scenario.PtTex}`} />
                      <MathTex block tex={eqTex} />
                    </div>
                  ),
                },
                {
                  title: "Despejar el exponencial",
                  detail: <span>Dividimos entre la población inicial para aislar la potencia.</span>,
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={divTex} />
                      <MathTex block tex={ratioTex} />
                    </div>
                  ),
                },
                {
                  title: "Aplicar logaritmo y despejar t",
                  detail: <span>Usamos logaritmo natural para bajar el exponente.</span>,
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={lnTex} />
                      <MathTex block tex={solveTex} />
                      {scenario.answerStyle === "approx" ? <MathTex block tex={approxTex} /> : null}
                    </div>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta final: <MathTex tex={scenario.correct} />.
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>

          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div className="text-sm">La población de una ciudad sigue el modelo:</div>
            <MathTex block tex={modelTex} />
            <div className="text-sm">{promptText}</div>
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
