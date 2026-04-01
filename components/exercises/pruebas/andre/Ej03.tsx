"use client"

import { useMemo, useState } from "react"
import {
  CheckCircle2,
  FunctionSquare,
  ListChecks,
  ShieldCheck,
  Sigma,
} from "lucide-react"

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

type Scenario = {
  kind: string
  promptTex: string
  correct: string
  wrongs: string[]
  explanationTitle: string
  ruleTex: string
  integrationSteps: string[]
  conditionsSteps: string[]
  checkTex: string
  finalTex: string
  feedbackCorrectTex: string
  feedbackWrongTex: string
  warningTex: string
}

function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function signedConst(n: number) {
  return n >= 0 ? `+${n}` : `${n}`
}

function optionSet(correct: string, wrongs: string[]): Option[] {
  return shuffle(Array.from(new Set([correct, ...wrongs])).slice(0, 5)).map((value) => ({
    value,
    correct: value === correct,
  }))
}

function scenarioFirstDerivativePoint(): Scenario {
  const a = choice([1, 2, 3, 4])
  const b = choice([2, 4, 6, 8])
  const c = choice([1, 2, 3, 4, 5])
  const k = choice([1, 2, 3])
  const c0 = choice([-4, -2, 1, 3, 5])
  const val = (a * k ** 3) / 3 + (b * k ** 2) / 2 + c * k + c0
  const correct = `f(x)=\\frac{${a}}{3}x^3+${b / 2}x^2+${c}x${signedConst(c0)}`
  return {
    kind: "firstDerivativePoint",
    promptTex: `f'(x)=${a}x^2+${b}x+${c},\\quad f(${k})=${val}`,
    correct,
    wrongs: [
      `f(x)=\\frac{${a}}{3}x^3+${b / 2}x^2+${c}x`,
      `f(x)=${a}x^3+${b}x^2+${c}x${signedConst(c0)}`,
      `f(x)=\\frac{${a}}{2}x^3+${b}x^2+${c}x${signedConst(c0)}`,
      `f(x)=\\frac{${a}}{3}x^3+${b / 2}x^2+${c}x${signedConst(c0 + 2)}`,
    ],
    explanationTitle: "Hallar f a partir de f'",
    ruleTex: `\\text{Si conocemos } f'(x), \\text{ integramos una vez y aparece una constante } C.`,
    integrationSteps: [
      `f(x)=\\int (${a}x^2+${b}x+${c})\\,dx`,
      `f(x)=\\frac{${a}}{3}x^3+${b / 2}x^2+${c}x+C`,
      `Todavía no conocemos C, por eso usamos la condición numérica.`,
    ],
    conditionsSteps: [
      `f(${k})=\\frac{${a}}{3}(${k})^3+${b / 2}(${k})^2+${c}(${k})+C=${val}`,
      `C=${c0}`,
      `Sustituyendo, queda ${correct.replace("f(x)=", "")}`,
    ],
    checkTex: `f' (x)=${a}x^2+${b}x+${c} \\text{ y } f(${k})=${val}`,
    finalTex: correct,
    feedbackCorrectTex: `\\text{Primero se integra } f'(x) \\text{ y luego se usa } f(${k})=${val} \\text{ para hallar } C.`,
    feedbackWrongTex: `\\text{Error típico: integrar bien pero dejar la constante sin usar la condición } f(${k})=${val}.`,
    warningTex: `No basta integrar. La condición en un punto fija la constante de integración.`,
  }
}

function scenarioNegativePower(): Scenario {
  const a = choice([2, 3, 4, 5, 6])
  const c0 = choice([-3, -1, 1, 2, 4])
  const val = -a + c0
  const correct = `f(x)=-\\frac{${a}}{x}${signedConst(c0)}`
  return {
    kind: "negativePower",
    promptTex: `f'(x)=\\frac{${a}}{x^2},\\quad x>0,\\quad f(1)=${val}`,
    correct,
    wrongs: [
      `f(x)=\\frac{${a}}{x}${signedConst(c0)}`,
      `f(x)=-${a}\\ln x${signedConst(c0)}`,
      `f(x)=-\\frac{${a}}{x}`,
      `f(x)=-\\frac{${a}}{x}${signedConst(c0 + 2)}`,
    ],
    explanationTitle: "Potencia negativa y condición inicial",
    ruleTex: `x^{-2} \\text{ se integra con regla de potencia, no con logaritmo.}`,
    integrationSteps: [
      `f'(x)=\\frac{${a}}{x^2}=${a}x^{-2}`,
      `f(x)=\\int ${a}x^{-2}\\,dx=-${a}x^{-1}+C`,
      `Por tanto, \\; f(x)=-\\frac{${a}}{x}+C`,
    ],
    conditionsSteps: [
      `f(1)=-\\frac{${a}}{1}+C=${val}`,
      `C=${c0}`,
      `Entonces \\; f(x)=-\\frac{${a}}{x}${signedConst(c0)}`,
    ],
    checkTex: `f'(x)=\\frac{${a}}{x^2} \\text{ y } f(1)=${val}`,
    finalTex: correct,
    feedbackCorrectTex: `\\text{Bien: } x^{-2} \\text{ produce } -x^{-1}. \\text{ Luego la condición fija } C.`,
    feedbackWrongTex: `\\text{Error típico: tratar } x^{-2} \\text{ como si su integral fuera logarítmica.}`,
    warningTex: `El logaritmo aparece con exponente -1, no con exponente -2.`,
  }
}

function scenarioSecondDerivativeAtZero(): Scenario {
  const a0 = choice([-4, -3, -2, 1, 2, 3])
  const b0 = choice([1, 2, 3, 4, 5])
  const correct = `f(x)=\\frac{x^3}{6}+${b0}x${signedConst(a0)}`
  return {
    kind: "secondDerivativeAtZero",
    promptTex: `f''(x)=x,\\quad f(0)=${a0},\\quad f'(0)=${b0}`,
    correct,
    wrongs: [
      `f(x)=\\frac{x^2}{2}+${b0}x${signedConst(a0)}`,
      `f(x)=\\frac{x^3}{3}+${b0}x${signedConst(a0)}`,
      `f(x)=\\frac{x^3}{6}+${b0}`,
      `f(x)=\\frac{x^3}{6}+${b0}x${signedConst(a0 + 2)}`,
    ],
    explanationTitle: "Recuperar f desde f''",
    ruleTex: `Si te dan f''(x), debes integrar dos veces. Por eso aparecen dos constantes.`,
    integrationSteps: [
      `f''(x)=x`,
      `f'(x)=\\int x\\,dx=\\frac{x^2}{2}+C_1`,
      `f(x)=\\int \\left(\\frac{x^2}{2}+C_1\\right)dx=\\frac{x^3}{6}+C_1x+C_2`,
    ],
    conditionsSteps: [
      `f'(0)=C_1=${b0}`,
      `f(0)=C_2=${a0}`,
      `Entonces \\; f(x)=\\frac{x^3}{6}+${b0}x${signedConst(a0)}`,
    ],
    checkTex: `f''(x)=x,\\; f'(0)=${b0},\\; f(0)=${a0}`,
    finalTex: correct,
    feedbackCorrectTex: `\\text{Bien: aquí había que integrar dos veces y resolver dos constantes.}`,
    feedbackWrongTex: `\\text{Error típico: integrar dos veces pero usar solo una de las dos condiciones.}`,
    warningTex: `Cuando aparece f''(x), no existe una sola constante: aparecen C_1 y C_2.`,
  }
}

function scenarioSecondDerivativeTwoConditions(): Scenario {
  const a0 = choice([1, 2, 3, 4])
  const c1 = choice([-2, -1, 1, 2, 3])
  const c2 = a0
  const valAt1 = Number((1 + 1 / 12 + c1 + c2).toFixed(2))
  const correct = `f(x)=x^2+\\frac{x^4}{12}${c1 >= 0 ? `+${c1}x` : `${c1}x`}${signedConst(c2)}`
  return {
    kind: "secondDerivativeTwoConditions",
    promptTex: `f''(x)=2+x^2,\\quad f(0)=${a0},\\quad f(1)=${valAt1}`,
    correct,
    wrongs: [
      `f(x)=2x+\\frac{x^3}{3}${c1 >= 0 ? `+${c1}x` : `${c1}x`}${signedConst(c2)}`,
      `f(x)=x^2+\\frac{x^4}{4}${c1 >= 0 ? `+${c1}x` : `${c1}x`}${signedConst(c2)}`,
      `f(x)=x^2+\\frac{x^4}{12}${c1 >= 0 ? `+${c1}x` : `${c1}x`}`,
      `f(x)=x^2+\\frac{x^4}{12}${c1 >= 0 ? `+${c1 + 1}x` : `${c1 + 1}x`}${signedConst(c2)}`,
    ],
    explanationTitle: "Dos integraciones y dos condiciones",
    ruleTex: `Primero hallamos f'(x), luego f(x), y recién después usamos las condiciones para despejar las dos constantes.`,
    integrationSteps: [
      `f''(x)=2+x^2`,
      `f'(x)=\\int (2+x^2)dx=2x+\\frac{x^3}{3}+C_1`,
      `f(x)=\\int \\left(2x+\\frac{x^3}{3}+C_1\\right)dx=x^2+\\frac{x^4}{12}+C_1x+C_2`,
    ],
    conditionsSteps: [
      `f(0)=C_2=${a0}`,
      `f(1)=1+\\frac{1}{12}+C_1+${a0}=${valAt1}`,
      `C_1=${c1},\\quad C_2=${c2}`,
    ],
    checkTex: `f''(x)=2+x^2,\\; f(0)=${a0},\\; f(1)=${valAt1}`,
    finalTex: correct,
    feedbackCorrectTex: `\\text{Correcto: integraste dos veces y luego resolviste } C_1 \\text{ y } C_2.`,
    feedbackWrongTex: `\\text{Error típico: obtener bien la forma general y luego equivocarse al sustituir } x=0 \\text{ o } x=1.`,
    warningTex: `Cuando te dan dos condiciones sobre f, normalmente sirven para encontrar las dos constantes de integración.`,
  }
}

function scenarioExponentialDerivative(): Scenario {
  const a = choice([2, 3, 4, 5])
  const c0 = choice([-3, -1, 1, 2, 4])
  const val = a + c0
  const correct = `f(x)=${a}e^x${signedConst(c0)}`
  return {
    kind: "exponentialDerivative",
    promptTex: `f'(x)=${a}e^x,\\quad f(0)=${val}`,
    correct,
    wrongs: [
      `f(x)=${a}e^x`,
      `f(x)=e^{${a}x}${signedConst(c0)}`,
      `f(x)=${a}\\ln x${signedConst(c0)}`,
      `f(x)=${a}e^x${signedConst(c0 + 2)}`,
    ],
    explanationTitle: "Derivada exponencial y condición puntual",
    ruleTex: `La función e^x es especial porque su derivada e integral vuelven a ser e^x.`,
    integrationSteps: [
      `f'(x)=${a}e^x`,
      `f(x)=\\int ${a}e^x dx=${a}e^x+C`,
      `Ahora la constante se determina con la condición dada.`,
    ],
    conditionsSteps: [
      `f(0)=${a}e^0+C=${val}`,
      `${a}+C=${val}`,
      `C=${c0}`,
    ],
    checkTex: `f'(x)=${a}e^x \\text{ y } f(0)=${val}`,
    finalTex: correct,
    feedbackCorrectTex: `\\text{Bien: } \\int e^x dx=e^x, \\text{ y luego se usa la condición para hallar } C.`,
    feedbackWrongTex: `\\text{Error típico: olvidar que } e^0=1 \\text{ al usar } f(0).`,
    warningTex: `No confundas ${a}e^x con e^{${a}x}: son funciones distintas.`,
  }
}

function scenarioTrigDerivative(): Scenario {
  const a = choice([2, 3, 4, 5])
  const c0 = choice([-2, -1, 1, 3, 4])
  const val = c0
  const correct = `f(x)=-${a}\\cos x${signedConst(c0)}`
  return {
    kind: "trigDerivative",
    promptTex: `f'(x)=${a}\\sin x,\\quad f(0)=${val}`,
    correct,
    wrongs: [
      `f(x)=${a}\\cos x${signedConst(c0)}`,
      `f(x)=-${a}\\sin x${signedConst(c0)}`,
      `f(x)=-${a}\\cos x`,
      `f(x)=-${a}\\cos x${signedConst(c0 + 2)}`,
    ],
    explanationTitle: "Integral trigonométrica con condición",
    ruleTex: `\\int \\sin x\\,dx=-\\cos x + C`,
    integrationSteps: [
      `f'(x)=${a}\\sin x`,
      `f(x)=\\int ${a}\\sin x\\,dx=-${a}\\cos x+C`,
      `Ahora usamos la condición en x=0.`,
    ],
    conditionsSteps: [
      `f(0)=-${a}\\cos 0+C=${val}`,
      `-${a}+C=${val}`,
      `C=${c0}`,
    ],
    checkTex: `f'(x)=${a}\\sin x \\text{ y } f(0)=${val}`,
    finalTex: correct,
    feedbackCorrectTex: `\\text{Correcto: la integral de seno es } -\\cos x, \\text{ no } \\cos x.`,
    feedbackWrongTex: `\\text{Error típico: perder el signo negativo en } \\int \\sin x dx.`,
    warningTex: `Con trigonometría, el signo es tan importante como la forma de la función.`,
  }
}

function scenarioMixedSecondDerivative(): Scenario {
  const b0 = choice([1, 2, 3, 4])
  const a0 = choice([-3, -2, 1, 2, 4])
  const correct = `f(x)=\\frac{x^4}{12}+x^2+${b0}x${signedConst(a0)}`
  return {
    kind: "mixedSecondDerivative",
    promptTex: `f''(x)=x^2+2,\\quad f'(0)=${b0},\\quad f(0)=${a0}`,
    correct,
    wrongs: [
      `f(x)=\\frac{x^3}{3}+2x+${b0}x${signedConst(a0)}`,
      `f(x)=\\frac{x^4}{4}+x^2+${b0}x${signedConst(a0)}`,
      `f(x)=\\frac{x^4}{12}+x^2+${b0}`,
      `f(x)=\\frac{x^4}{12}+x^2+${b0}x${signedConst(a0 + 2)}`,
    ],
    explanationTitle: "Segundo orden con parte polinómica",
    ruleTex: `Hay que integrar dos veces: una para pasar de f'' a f' y otra para pasar de f' a f.`,
    integrationSteps: [
      `f''(x)=x^2+2`,
      `f'(x)=\\frac{x^3}{3}+2x+C_1`,
      `f(x)=\\frac{x^4}{12}+x^2+C_1x+C_2`,
    ],
    conditionsSteps: [
      `f'(0)=C_1=${b0}`,
      `f(0)=C_2=${a0}`,
      `Entonces \\; f(x)=\\frac{x^4}{12}+x^2+${b0}x${signedConst(a0)}`,
    ],
    checkTex: `f''(x)=x^2+2,\\; f'(0)=${b0},\\; f(0)=${a0}`,
    finalTex: correct,
    feedbackCorrectTex: `\\text{Bien: la parte difícil era recordar que las condiciones se aplican en niveles distintos, una sobre } f' \\text{ y otra sobre } f.`,
    feedbackWrongTex: `\\text{Error típico: usar ambas condiciones sobre la misma expresión en lugar de una sobre } f' \\text{ y otra sobre } f.`,
    warningTex: `Siempre revisa si la condición fue dada para f o para f'.`,
  }
}

function generateScenario() {
  return choice([
    scenarioFirstDerivativePoint,
    scenarioNegativePower,
    scenarioSecondDerivativeAtZero,
    scenarioSecondDerivativeTwoConditions,
    scenarioExponentialDerivative,
    scenarioTrigDerivative,
    scenarioMixedSecondDerivative,
  ])()
}

function generateOptions(s: Scenario): Option[] {
  return optionSet(s.correct, s.wrongs)
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
          promptTex: scenario.promptTex,
          kind: scenario.kind,
        },
        explanation: {
          ruleTex: scenario.ruleTex,
          integrationSteps: scenario.integrationSteps,
          conditionsSteps: scenario.conditionsSteps,
          checkTex: scenario.checkTex,
          warningTex: scenario.warningTex,
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
        title="Encuentre la función f"
        prompt="Recupera la función correcta integrando y usando las condiciones dadas. El ejercicio cambia entre casos con f', f'', potencias negativas, exponenciales y trigonometría."
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
                  title: "1. Identificar qué te dieron",
                  detail: <span>Lo primero es mirar si el problema entrega <MathTex tex="f'(x)" /> o <MathTex tex="f''(x)" />, porque eso decide cuántas veces habrá que integrar.</span>,
                  icon: Sigma,
                  content: (
                    <div className="space-y-2">
                      <MathTex block tex={scenario.promptTex} />
                      <MathTex block tex={scenario.ruleTex} />
                    </div>
                  ),
                },
                {
                  title: "2. Integrar la expresión",
                  detail: <span>En esta etapa se obtiene la forma general de la función, con una o dos constantes según el orden de la derivada dada.</span>,
                  icon: FunctionSquare,
                  content: (
                    <div className="space-y-2">
                      {scenario.integrationSteps.map((step, idx) => (
                        <MathTex key={idx} block tex={step} />
                      ))}
                    </div>
                  ),
                },
                {
                  title: "3. Aplicar las condiciones",
                  detail: <span>Las condiciones numéricas no son adorno: sirven para fijar exactamente las constantes de integración.</span>,
                  icon: ListChecks,
                  content: (
                    <div className="space-y-2">
                      {scenario.conditionsSteps.map((step, idx) => (
                        <MathTex key={idx} block tex={step} />
                      ))}
                    </div>
                  ),
                },
                {
                  title: "4. Verificar la respuesta",
                  detail: <span>La función final debe cumplir simultáneamente la derivada pedida y todas las condiciones dadas.</span>,
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-2">
                      <MathTex block tex={scenario.checkTex} />
                      <MathTex block tex={`\\text{Cuidado: } ${scenario.warningTex}`} />
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
        <div className="mb-3 rounded-lg border bg-card p-3">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            Problema
          </div>
          <div className="rounded-md border bg-background p-3">
            <MathTex block tex={scenario.promptTex} />
          </div>
        </div>

        <div className="mb-2 text-sm text-muted-foreground">
          Marca la función correcta:
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
          <div className="mt-3 rounded-lg border bg-card p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Feedback inmediato
            </div>

            {selected === scenario.correct ? (
              <div className="space-y-2 text-sm">
                <p>Correcto. La estructura, la integración y el uso de las condiciones quedaron bien aplicados.</p>
                <MathTex block tex={scenario.feedbackCorrectTex} />
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p>No. Revisa cuántas veces debías integrar y sobre qué expresión debías aplicar cada condición.</p>
                <MathTex block tex={scenario.feedbackWrongTex} />
              </div>
            )}
          </div>
        )}

        <div className="mt-4">
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
