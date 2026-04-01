"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, Sigma, FunctionSquare, ShieldCheck } from "lucide-react"

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

function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function texSigned(n: number) {
  if (n > 0) return `+${n}`
  if (n < 0) return `${n}`
  return ""
}

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  const family = choice(["inverseCube", "linear", "inverseSquare"] as const)

  if (family === "inverseCube") {
    // y'' = a/x^3
    const a = choice([2, 4, 6, 8])
    const x0 = choice([1, 2])
    const m = choice([-3, -2, -1, 1, 2]) // pendiente de la tangente
    const y0 = choice([2, 3, 4, 5])

    // y'' = a x^-3
    // y' = -(a/2)x^-2 + C1
    // y  = (a/2)x^-1 + C1 x + C2
    const c1 = m + a / (2 * x0 * x0)
    const c2 = y0 - a / (2 * x0) - c1 * x0

    const lineB = y0 - m * x0
    const lineTex = `${m === 1 ? "" : m === -1 ? "-" : m}x${lineB >= 0 ? "+" : ""}${lineB}=y`

    return {
      kind: "inverseCube" as const,
      promptTex: `y''=\\frac{${a}}{x^3}`,
      tangentTex: `y=${m}x${lineB >= 0 ? "+" : ""}${lineB}`,
      pointTex: `(${x0};${y0})`,
      correct: `y=\\frac{${a / 2}}{x}${c1 >= 0 ? "+" : ""}${c1}x${texSigned(c2)}`,
      stepsTex: [
        `y''=${a}x^{-3}`,
        `y'=\\int ${a}x^{-3}\\,dx=-\\frac{${a}}{2}x^{-2}+C_1=-\\frac{${a / 2}}{x^2}+C_1`,
        `y=\\int \\left(-\\frac{${a / 2}}{x^2}+C_1\\right)dx=\\frac{${a / 2}}{x}+C_1x+C_2`,
        `\\text{La recta tangente es } y=${m}x${lineB >= 0 ? "+" : ""}${lineB},\\text{ por tanto su pendiente es } m=${m}`,
        `y'(${x0})=${m}`,
        `-\\frac{${a / 2}}{(${x0})^2}+C_1=${m}`,
        `C_1=${c1}`,
        `y(${x0})=${y0}`,
        `\\frac{${a / 2}}{${x0}}+(${c1})(${x0})+C_2=${y0}`,
        `C_2=${c2}`,
      ],
      finalTex: `y=\\frac{${a / 2}}{x}${c1 >= 0 ? "+" : ""}${c1}x${texSigned(c2)}`,
      wrongs: [
        `y=-\\frac{${a / 2}}{x}${c1 >= 0 ? "+" : ""}${c1}x${texSigned(c2)}`,
        `y=\\frac{${a}}{x}${c1 >= 0 ? "+" : ""}${c1}x${texSigned(c2)}`,
        `y=\\frac{${a / 2}}{x^2}${c1 >= 0 ? "+" : ""}${c1}x${texSigned(c2)}`,
        `y=\\frac{${a / 2}}{x}${c1 >= 0 ? "+" : ""}${c1 + 1}x${texSigned(c2)}`,
      ],
      feedbackCorrectTex: `\\text{Bien: usaste la pendiente de la recta tangente y el punto de tangencia.}`,
      feedbackWrongTex: `\\text{Ojo: ser tangente significa misma pendiente en el punto y además que la curva pasa por ese punto.}`,
      title: "Halle la ecuación de la curva",
      explanationTitle: "Integrar y usar la tangencia",
      lineReadable: lineTex,
    }
  }

  if (family === "linear") {
    // y'' = k
    const k = choice([2, 3, 4, 5])
    const x0 = choice([0, 1, 2])
    const m = choice([-2, -1, 1, 2, 3])
    const y0 = choice([1, 3, 4, 6])

    // y' = kx + C1
    // y = (k/2)x^2 + C1 x + C2
    const c1 = m - k * x0
    const c2 = y0 - (k / 2) * x0 * x0 - c1 * x0
    const b = y0 - m * x0

    return {
      kind: "linear" as const,
      promptTex: `y''=${k}`,
      tangentTex: `y=${m}x${b >= 0 ? "+" : ""}${b}`,
      pointTex: `(${x0};${y0})`,
      correct: `y=${k / 2}x^2${c1 >= 0 ? "+" : ""}${c1}x${texSigned(c2)}`,
      stepsTex: [
        `y''=${k}`,
        `y'=\\int ${k}\\,dx=${k}x+C_1`,
        `y=\\int (${k}x+C_1)dx=${k / 2}x^2+C_1x+C_2`,
        `\\text{La recta tangente tiene pendiente } m=${m}`,
        `y'(${x0})=${m}`,
        `${k}(${x0})+C_1=${m}`,
        `C_1=${c1}`,
        `y(${x0})=${y0}`,
        `${k / 2}(${x0})^2+(${c1})(${x0})+C_2=${y0}`,
        `C_2=${c2}`,
      ],
      finalTex: `y=${k / 2}x^2${c1 >= 0 ? "+" : ""}${c1}x${texSigned(c2)}`,
      wrongs: [
        `y=${k}x^2${c1 >= 0 ? "+" : ""}${c1}x${texSigned(c2)}`,
        `y=${k / 2}x^2${c1 >= 0 ? "+" : ""}${c1 + 1}x${texSigned(c2)}`,
        `y=${k / 2}x^2${c1 >= 0 ? "+" : ""}${c1}x`,
        `y=${k}x${c1 >= 0 ? "+" : ""}${c1}${texSigned(c2)}`,
      ],
      feedbackCorrectTex: `\\text{Bien: integraste dos veces y usaste la pendiente y el punto de tangencia.}`,
      feedbackWrongTex: `\\text{Ojo: la tangencia te da dos datos: } y'(x_0)=m \\text{ y } y(x_0)=y_0.`,
      title: "Halle la ecuación de la curva",
      explanationTitle: "Curva con segunda derivada constante",
      lineReadable: `y=${m}x${b >= 0 ? "+" : ""}${b}`,
    }
  }

  // y'' = a/x^2
  const a = choice([1, 2, 3, 4])
  const x0 = choice([1, 2])
  const m = choice([-2, -1, 1, 2])
  const y0 = choice([2, 3, 5])

  // y' = -a/x + C1
  // y = -a ln(x) + C1 x + C2   (x>0)
  const c1 = m + a / x0
  const c2 = y0 + a * Math.log(x0) - c1 * x0
  const c2Rounded = Number(c2.toFixed(2))
  const b = y0 - m * x0

  return {
    kind: "inverseSquare" as const,
    promptTex: `y''=\\frac{${a}}{x^2},\\quad x>0`,
    tangentTex: `y=${m}x${b >= 0 ? "+" : ""}${b}`,
    pointTex: `(${x0};${y0})`,
    correct: `y=-${a}\\ln(x)${c1 >= 0 ? "+" : ""}${c1}x${texSigned(c2Rounded)}`,
    stepsTex: [
      `y''=${a}x^{-2}`,
      `y'=\\int ${a}x^{-2}\\,dx=-${a}x^{-1}+C_1=-\\frac{${a}}{x}+C_1`,
      `y=\\int \\left(-\\frac{${a}}{x}+C_1\\right)dx=-${a}\\ln(x)+C_1x+C_2`,
      `\\text{La recta tangente tiene pendiente } m=${m}`,
      `y'(${x0})=${m}`,
      `-\\frac{${a}}{${x0}}+C_1=${m}`,
      `C_1=${c1}`,
      `y(${x0})=${y0}`,
      `-${a}\\ln(${x0})+(${c1})(${x0})+C_2=${y0}`,
      `C_2\\approx ${c2Rounded}`,
    ],
    finalTex: `y=-${a}\\ln(x)${c1 >= 0 ? "+" : ""}${c1}x${texSigned(c2Rounded)}`,
    wrongs: [
      `y=${a}\\ln(x)${c1 >= 0 ? "+" : ""}${c1}x${texSigned(c2Rounded)}`,
      `y=-${a}\\ln(x)${c1 >= 0 ? "+" : ""}${c1 + 1}x${texSigned(c2Rounded)}`,
      `y=-\\frac{${a}}{x}${c1 >= 0 ? "+" : ""}${c1}x${texSigned(c2Rounded)}`,
      `y=-${a}\\ln(x)${c1 >= 0 ? "+" : ""}${c1}x`,
    ],
    feedbackCorrectTex: `\\text{Bien: al integrar } x^{-1} \\text{ aparece } \\ln(x).`,
    feedbackWrongTex: `\\text{Ojo: de } y''=\\frac{a}{x^2} \\text{ sale } y'=-\\frac{a}{x}+C_1 \\text{ y luego } y=-a\\ln(x)+C_1x+C_2.`,
    title: "Halle la ecuación de la curva",
    explanationTitle: "Caso con logaritmo",
    lineReadable: `y=${m}x${b >= 0 ? "+" : ""}${b}`,
  }
}

function generateOptions(s: Scenario): Option[] {
  const values = [s.correct, ...shuffle(s.wrongs).slice(0, 4)]
  return shuffle(values).map((value) => ({
    value,
    correct: value === s.correct,
  }))
}

export default function CurveEquationGame({
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
          promptTex: scenario.promptTex,
          tangentTex: scenario.tangentTex,
          pointTex: scenario.pointTex,
          kind: scenario.kind,
        },
        explanation: {
          steps: scenario.stepsTex,
          finalTex: scenario.finalTex,
        },
        options: scenario.options.map((o) => o.value),
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce((n) => n + 1)
  }

  return (
    <MathProvider>
      <ExerciseShell
        title={scenario.title}
        prompt="Integra dos veces y usa que la curva es tangente a la recta dada en el punto indicado."
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title={scenario.explanationTitle}
              steps={[
                {
                  title: "Integrar la segunda derivada",
                  detail: (
                    <span>
                      Como te dan <MathTex tex="y''" />, primero hallas <MathTex tex="y'" /> y luego <MathTex tex="y" />.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={scenario.promptTex} />
                    </div>
                  ),
                },
                {
                  title: "Usar la tangencia",
                  detail: (
                    <span>
                      Ser tangente en un punto significa dos cosas: misma pendiente y mismo punto.
                    </span>
                  ),
                  icon: FunctionSquare,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\text{Recta tangente: } ${scenario.tangentTex}`} />
                      <MathTex block tex={`\\text{Punto de tangencia: } ${scenario.pointTex}`} />
                      {scenario.stepsTex.map((step, idx) => (
                        <MathTex key={idx} block tex={step} />
                      ))}
                    </div>
                  ),
                },
                {
                  title: "Escribir la ecuación final",
                  detail: <span>La curva final debe cumplir la segunda derivada y la condición de tangencia.</span>,
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={scenario.finalTex} />
                    </div>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta final: <MathTex tex={scenario.finalTex} />
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Problema</div>
          <div className="rounded-lg border bg-background p-3 space-y-3">
            <MathTex block tex={scenario.promptTex} />
            <MathTex block tex={`\\text{Tangente a la recta } ${scenario.tangentTex} \\text{ en el punto } ${scenario.pointTex}`} />
          </div>
        </div>

        <div className="mb-3 text-sm text-muted-foreground">
          Marca la ecuación correcta de la curva:
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={(op) => <MathTex tex={op.value} />}
        />

        {engine.status !== "idle" && (
          <div className="mt-4 rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 font-medium mb-2">
              <CheckCircle2 className="h-4 w-4" />
              Feedback inmediato
            </div>

            {selected === scenario.correct ? (
              <div className="space-y-2 text-sm">
                <p>Bien hecho. Usaste correctamente las dos condiciones de tangencia.</p>
                <MathTex block tex={scenario.feedbackCorrectTex} />
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p>Aún no. Revisa la integración y recuerda qué significa “ser tangente”.</p>
                <MathTex block tex={scenario.feedbackWrongTex} />
              </div>
            )}
          </div>
        )}

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