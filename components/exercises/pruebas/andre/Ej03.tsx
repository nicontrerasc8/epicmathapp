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

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function fmtSigned(n: number) {
  return n >= 0 ? `+${n}` : `${n}`
}

function texSigned(n: number) {
  return n >= 0 ? `+ ${n}` : `- ${Math.abs(n)}`
}

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  const type = choice(["firstDerivativePoint", "firstDerivativePositiveDomain", "secondDerivativeAtZero", "secondDerivativeTwoConditions"] as const)

  if (type === "firstDerivativePoint") {
    // Tipo: f'(x)=ax^2+bx+c, f(k)=m
    const a = choice([1, 2, 3, 4])
    const b = choice([2, 4, 6, 8, 10])
    const c = choice([1, 2, 3, 4, 5])
    const k = choice([1, 2])
    const C = choice([-4, -2, 1, 3, 5])
    const valueAtK = a * Math.pow(k, 3) / 3 + b * Math.pow(k, 2) / 2 + c * k + C

    const correctTex = `f(x)=\\frac{${a}}{3}x^3+${b / 2}x^2+${c}x${texSigned(C)}`
    const integratedTex = `f(x)=\\int (${a}x^2+${b}x+${c})\\,dx=\\frac{${a}}{3}x^3+${b / 2}x^2+${c}x+C`

    return {
      kind: "firstDerivativePoint" as const,
      promptTex: `f'(x)=${a}x^2+${b}x+${c},\\quad f(${k})=${valueAtK}`,
      correct: correctTex,
      answerType: "function",
      explanationTitle: "Encontrar f a partir de f'",
      stepsTex: [
        `f(x)=\\int (${a}x^2+${b}x+${c})\\,dx`,
        integratedTex,
        `f(${k})=\\frac{${a}}{3}(${k})^3+${b / 2}(${k})^2+${c}(${k})+C`,
        `f(${k})=${valueAtK}`,
        `C=${C}`,
      ],
      finalTex: correctTex,
      wrongs: [
        `f(x)=\\frac{${a}}{3}x^3+${b / 2}x^2+${c}x`,
        `f(x)=${a}x^3+${b}x^2+${c}x${texSigned(C)}`,
        `f(x)=\\frac{${a}}{2}x^3+${b}x^2+${c}x${texSigned(C)}`,
        `f(x)=\\frac{${a}}{3}x^3+${b / 2}x^2+${c}x${texSigned(C + 2)}`,
      ],
      feedbackCorrectTex: `\\text{Primero se integra } f'(x) \\text{ y luego se usa } f(${k})=${valueAtK} \\text{ para hallar } C.`,
      feedbackWrongTex: `\\text{Ojo: no basta integrar. También hay que reemplazar la condición } f(${k})=${valueAtK}.`,
    }
  }

  if (type === "firstDerivativePositiveDomain") {
    // Tipo: f'(x)=a/x^2, x>0, f(1)=m
    const a = choice([2, 3, 4, 5, 6])
    const C = choice([-3, -1, 1, 2, 4])
    const valueAt1 = -a + C

    const correctTex = `f(x)=-\\frac{${a}}{x}${texSigned(C)}`
    const integratedTex = `f(x)=\\int ${a}x^{-2}\\,dx=${a}\\left(\\frac{x^{-1}}{-1}\\right)+C=-\\frac{${a}}{x}+C`

    return {
      kind: "firstDerivativePositiveDomain" as const,
      promptTex: `f'(x)=\\frac{${a}}{x^2},\\quad x>0,\\quad f(1)=${valueAt1}`,
      correct: correctTex,
      answerType: "function",
      explanationTitle: "Integrar una potencia negativa",
      stepsTex: [
        `f'(x)=\\frac{${a}}{x^2}=${a}x^{-2}`,
        integratedTex,
        `f(1)=-\\frac{${a}}{1}+C=${valueAt1}`,
        `-${a}+C=${valueAt1}`,
        `C=${C}`,
      ],
      finalTex: correctTex,
      wrongs: [
        `f(x)=\\frac{${a}}{x}${texSigned(C)}`,
        `f(x)=-${a}\\ln x${texSigned(C)}`,
        `f(x)=-\\frac{${a}}{x}`,
        `f(x)=-\\frac{${a}}{x}${texSigned(C + 2)}`,
      ],
      feedbackCorrectTex: `\\text{Bien: } x^{-2} \\text{ se integra como } -x^{-1}, \\text{ no como logaritmo.}`,
      feedbackWrongTex: `\\text{Ojo: } \\int x^{-2}dx=-x^{-1}+C. \\text{ Luego usa } f(1).`,
    }
  }

  if (type === "secondDerivativeAtZero") {
    // Tipo: f''(x)=x, f(0)=a, f'(0)=b
    const a0 = choice([-4, -3, -2, 1, 2])
    const b0 = choice([1, 2, 3, 4])
    const correctTex = `f(x)=\\frac{x^3}{6}+${b0}x${texSigned(a0)}`

    return {
      kind: "secondDerivativeAtZero" as const,
      promptTex: `f''(x)=x,\\quad f(0)=${a0},\\quad f'(0)=${b0}`,
      correct: correctTex,
      answerType: "function",
      explanationTitle: "Encontrar f a partir de f''",
      stepsTex: [
        `f''(x)=x`,
        `f'(x)=\\int x\\,dx=\\frac{x^2}{2}+C_1`,
        `f'(0)=\\frac{0^2}{2}+C_1=${b0}`,
        `C_1=${b0}`,
        `f'(x)=\\frac{x^2}{2}+${b0}`,
        `f(x)=\\int \\left(\\frac{x^2}{2}+${b0}\\right)dx=\\frac{x^3}{6}+${b0}x+C_2`,
        `f(0)=C_2=${a0}`,
      ],
      finalTex: correctTex,
      wrongs: [
        `f(x)=\\frac{x^2}{2}+${b0}x${texSigned(a0)}`,
        `f(x)=\\frac{x^3}{3}+${b0}x${texSigned(a0)}`,
        `f(x)=\\frac{x^3}{6}+${b0}`,
        `f(x)=\\frac{x^3}{6}+${b0}x${texSigned(a0 + 2)}`,
      ],
      feedbackCorrectTex: `\\text{Bien: cuando te dan } f''(x), \\text{ debes integrar dos veces.}`,
      feedbackWrongTex: `\\text{Ojo: hay dos constantes. Una sale con } f'(0) \\text{ y otra con } f(0).`,
    }
  }

  // Tipo: f''(x)=2+x^2, f(0)=a, f(1)=b
  const a0 = choice([1, 2, 3])
  const c1 = choice([-2, -1, 1, 2])
  const c2 = a0
  const b1 = 1 + 1 / 12 + c1 + c2 // f(1)
  const b1Tex = Number(b1.toFixed(2))

  const correctTex = `f(x)=x^2+\\frac{x^4}{12}${c1 >= 0 ? `+${c1}x` : `${c1}x`}${texSigned(c2)}`

  return {
    kind: "secondDerivativeTwoConditions" as const,
    promptTex: `f''(x)=2+x^2,\\quad f(0)=${a0},\\quad f(1)=${b1Tex}`,
    correct: correctTex,
    answerType: "function",
    explanationTitle: "Integrar dos veces y usar dos condiciones",
    stepsTex: [
      `f''(x)=2+x^2`,
      `f'(x)=\\int (2+x^2)dx=2x+\\frac{x^3}{3}+C_1`,
      `f(x)=\\int \\left(2x+\\frac{x^3}{3}+C_1\\right)dx=x^2+\\frac{x^4}{12}+C_1x+C_2`,
      `f(0)=C_2=${a0}`,
      `C_2=${a0}`,
      `f(1)=1+\\frac{1}{12}+C_1+${a0}=${b1Tex}`,
      `C_1=${c1}`,
    ],
    finalTex: correctTex,
    wrongs: [
      `f(x)=2x+\\frac{x^3}{3}${c1 >= 0 ? `+${c1}x` : `${c1}x`}${texSigned(c2)}`,
      `f(x)=x^2+\\frac{x^4}{4}${c1 >= 0 ? `+${c1}x` : `${c1}x`}${texSigned(c2)}`,
      `f(x)=x^2+\\frac{x^4}{12}${c1 >= 0 ? `+${c1}x` : `${c1}x`}`,
      `f(x)=x^2+\\frac{x^4}{12}${c1 >= 0 ? `+${c1 + 1}x` : `${c1 + 1}x`}${texSigned(c2)}`,
    ],
    feedbackCorrectTex: `\\text{Bien: integraste dos veces y luego resolviste } C_1 \\text{ y } C_2.`,
    feedbackWrongTex: `\\text{Ojo: al tener } f''(x), \\text{ aparecen dos constantes. Usa ambas condiciones.}`,
  }
}

function generateOptions(s: Scenario): Option[] {
  const values = [s.correct, ...shuffle(s.wrongs).slice(0, 4)]
  return shuffle(values).map(value => ({
    value,
    correct: value === s.correct,
  }))
}

export default function FindFunctionGame({
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
          kind: scenario.kind,
        },
        explanation: {
          steps: scenario.stepsTex,
          finalTex: scenario.finalTex,
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
        title="Encuentre la función f"
        prompt="Integra y usa las condiciones dadas para hallar la función correcta."
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
                  title: "Integrar la derivada dada",
                  detail: (
                    <span>
                      Si te dan <MathTex tex="f'(x)" /> integras una vez.  
                      Si te dan <MathTex tex="f''(x)" /> integras dos veces.
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
                  title: "Usar las condiciones para hallar las constantes",
                  detail: <span>Reemplaza los valores dados para encontrar la constante o constantes.</span>,
                  icon: FunctionSquare,
                  content: (
                    <div className="space-y-3">
                      {scenario.stepsTex.map((step, idx) => (
                        <MathTex key={idx} block tex={step} />
                      ))}
                    </div>
                  ),
                },
                {
                  title: "Escribir la función final",
                  detail: <span>La respuesta correcta debe cumplir tanto la derivada como las condiciones dadas.</span>,
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
          </div>
        </div>

        <div className="mb-3 text-sm text-muted-foreground">
          Marca la función correcta:
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={op => <MathTex tex={op.value} />}
        />

        {engine.status !== "idle" && (
          <div className="mt-4 rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 font-medium mb-2">
              <CheckCircle2 className="h-4 w-4" />
              Feedback inmediato
            </div>

            {selected === scenario.correct ? (
              <div className="space-y-2 text-sm">
                <p>Bien hecho. La idea era integrar y luego usar la condición para hallar la constante.</p>
                <MathTex block tex={scenario.feedbackCorrectTex} />
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p>Aún no. Revisa si integraste bien y si aplicaste todas las condiciones.</p>
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