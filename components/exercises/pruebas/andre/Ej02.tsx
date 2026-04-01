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
  claimTex: string
  correctReasonTex: string
  derivativeSteps: string[]
  simplificationTex?: string
  ruleTex: string
  warningTex: string
  explanationTitle: string
  correct: string
  wrongs: string[]
  finalTex: string
}

function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function trueFalseOptions(correct: string, wrongs: string[]): Option[] {
  return shuffle([correct, ...shuffle(wrongs).slice(0, 4)]).map((value) => ({
    value,
    correct: value === correct,
  }))
}

function scenarioExpFraction(): Scenario {
  const a = choice([1, 2, 3, 4, 5])
  return {
    kind: "expFraction",
    promptTex: `\\int \\frac{${a}e^t}{(1-e^t)^2}\\,dt`,
    claimTex: `\\frac{${a}}{1-e^t}+C`,
    simplificationTex: `F(t)=${a}(1-e^t)^{-1}`,
    ruleTex: `\\frac{d}{dt}\\left[(g(t))^{-1}\\right]=-\\frac{g'(t)}{(g(t))^2}`,
    correctReasonTex: `\\frac{d}{dt}\\left(\\frac{${a}}{1-e^t}\\right)=\\frac{${a}e^t}{(1-e^t)^2}`,
    derivativeSteps: [
      `F(t)=\\frac{${a}}{1-e^t}=${a}(1-e^t)^{-1}`,
      `F'(t)=${a}\\cdot(-1)(1-e^t)^{-2}\\cdot(-e^t)`,
      `F'(t)=\\frac{${a}e^t}{(1-e^t)^2}`,
    ],
    warningTex: `Hay dos signos negativos que se cancelan. Si se pierde uno, la conclusión cambia.`,
    explanationTitle: "Verificación de una fracción exponencial",
    correct: `\\text{Verdadero}`,
    wrongs: [
      `\\text{Falso: aparece un signo negativo al derivar}`,
      `\\text{Falso: la primitiva correcta es } ${a}(1-e^t)+C`,
      `\\text{Falso: falta derivar el denominador}`,
      `\\text{Falso: debería aparecer un logaritmo}`,
    ],
    finalTex: `\\int \\frac{${a}e^t}{(1-e^t)^2}\\,dt=\\frac{${a}}{1-e^t}+C`,
  }
}

function scenarioExpOverSquare(): Scenario {
  const a = choice([1, 2, 3, 4])
  return {
    kind: "expOverSquare",
    promptTex: `\\int \\frac{${a}e^x}{(1+e^x)^2}\\,dx`,
    claimTex: `-\\frac{${a}}{1+e^x}+C`,
    simplificationTex: `F(x)=-${a}(1+e^x)^{-1}`,
    ruleTex: `\\frac{d}{dx}\\left[(g(x))^{-1}\\right]=-\\frac{g'(x)}{(g(x))^2}`,
    correctReasonTex: `\\frac{d}{dx}\\left(-\\frac{${a}}{1+e^x}\\right)=\\frac{${a}e^x}{(1+e^x)^2}`,
    derivativeSteps: [
      `F(x)=-\\frac{${a}}{1+e^x}=-${a}(1+e^x)^{-1}`,
      `F'(x)=-${a}\\cdot(-1)(1+e^x)^{-2}\\cdot e^x`,
      `F'(x)=\\frac{${a}e^x}{(1+e^x)^2}`,
    ],
    warningTex: `El signo menos de la primitiva es indispensable para que la derivada salga positiva.`,
    explanationTitle: "Verificación racional con exponenciales",
    correct: `\\text{Verdadero}`,
    wrongs: [
      `\\text{Falso: la respuesta correcta es } \\frac{${a}}{1+e^x}+C`,
      `\\text{Falso: la derivada produce } e^{2x}`,
      `\\text{Falso: debería aparecer un logaritmo}`,
      `\\text{Falso: el denominador queda de potencia 1}`,
    ],
    finalTex: `\\int \\frac{${a}e^x}{(1+e^x)^2}\\,dx=-\\frac{${a}}{1+e^x}+C`,
  }
}

function scenarioChainPower(): Scenario {
  const a = choice([2, 3, 4, 5, 6])
  const n = choice([2, 3, 4, 5])
  return {
    kind: "chainPower",
    promptTex: `\\int ${a}x(x^2+1)^{${n}}\\,dx`,
    claimTex: `\\frac{${a}}{${2 * (n + 1)}}(x^2+1)^{${n + 1}}+C`,
    simplificationTex: `F(x)=\\frac{${a}}{${2 * (n + 1)}}(x^2+1)^{${n + 1}}`,
    ruleTex: `\\frac{d}{dx}\\left[(u(x))^m\\right]=m(u(x))^{m-1}u'(x)`,
    correctReasonTex: `\\frac{d}{dx}\\left(\\frac{${a}}{${2 * (n + 1)}}(x^2+1)^{${n + 1}}\\right)=${a}x(x^2+1)^{${n}}`,
    derivativeSteps: [
      `F(x)=\\frac{${a}}{${2 * (n + 1)}}(x^2+1)^{${n + 1}}`,
      `F'(x)=\\frac{${a}}{${2 * (n + 1)}}(${n + 1})(x^2+1)^{${n}}\\cdot 2x`,
      `F'(x)=${a}x(x^2+1)^{${n}}`,
    ],
    warningTex: `Aquí no basta subir el exponente: al derivar también aparece el factor interno 2x.`,
    explanationTitle: "Verificación por regla de la cadena",
    correct: `\\text{Verdadero}`,
    wrongs: [
      `\\text{Falso: falta dividir entre } ${n + 1}`,
      `\\text{Falso: el resultado correcto lleva signo negativo}`,
      `\\text{Falso: el exponente final no cambia}`,
      `\\text{Falso: falta el factor } 2x \\text{ al derivar}`,
    ],
    finalTex: `\\int ${a}x(x^2+1)^{${n}}\\,dx=\\frac{${a}}{${2 * (n + 1)}}(x^2+1)^{${n + 1}}+C`,
  }
}

function scenarioLinearChain(): Scenario {
  const a = choice([2, 3, 4, 5])
  const b = choice([1, 2, 3, 4])
  const n = choice([3, 4, 5, 6])
  return {
    kind: "linearChain",
    promptTex: `\\int ${a}(${a}x+${b})^{${n}}\\,dx`,
    claimTex: `\\frac{(${a}x+${b})^{${n + 1}}}{${n + 1}}+C`,
    simplificationTex: `F(x)=\\frac{(${a}x+${b})^{${n + 1}}}{${n + 1}}`,
    ruleTex: `\\frac{d}{dx}\\left[(ax+b)^m\\right]=m(ax+b)^{m-1}\\cdot a`,
    correctReasonTex: `\\frac{d}{dx}\\left(\\frac{(${a}x+${b})^{${n + 1}}}{${n + 1}}\\right)=${a}(${a}x+${b})^{${n}}`,
    derivativeSteps: [
      `F(x)=\\frac{(${a}x+${b})^{${n + 1}}}{${n + 1}}`,
      `F'(x)=\\frac{1}{${n + 1}}(${n + 1})(${a}x+${b})^{${n}}\\cdot ${a}`,
      `F'(x)=${a}(${a}x+${b})^{${n}}`,
    ],
    warningTex: `La propuesta funciona porque el integrando ya trae el factor exacto de la derivada interna.`,
    explanationTitle: "Potencia con argumento lineal",
    correct: `\\text{Verdadero}`,
    wrongs: [
      `\\text{Falso: faltaría dividir entre } ${a}`,
      `\\text{Falso: el denominador correcto es } ${n}`,
      `\\text{Falso: al derivar aparece un término extra}`,
      `\\text{Falso: la potencia final debería ser } ${n}`,
    ],
    finalTex: `\\int ${a}(${a}x+${b})^{${n}}\\,dx=\\frac{(${a}x+${b})^{${n + 1}}}{${n + 1}}+C`,
  }
}

function scenarioRootChain(): Scenario {
  const a = choice([2, 3, 4, 5])
  const b = choice([1, 2, 3, 4])
  return {
    kind: "rootChain",
    promptTex: `\\int \\frac{${a}}{2\\sqrt{${a}x+${b}}}\\,dx`,
    claimTex: `\\sqrt{${a}x+${b}}+C`,
    simplificationTex: `F(x)=(${a}x+${b})^{\\frac{1}{2}}`,
    ruleTex: `\\frac{d}{dx}\\left[(u(x))^{1/2}\\right]=\\frac{u'(x)}{2\\sqrt{u(x)}}`,
    correctReasonTex: `\\frac{d}{dx}\\left(\\sqrt{${a}x+${b}}\\right)=\\frac{${a}}{2\\sqrt{${a}x+${b}}}`,
    derivativeSteps: [
      `F(x)=(${a}x+${b})^{\\frac{1}{2}}`,
      `F'(x)=\\frac{1}{2}(${a}x+${b})^{-\\frac{1}{2}}\\cdot ${a}`,
      `F'(x)=\\frac{${a}}{2\\sqrt{${a}x+${b}}}`,
    ],
    warningTex: `El factor \\frac{a}{2} viene de combinar la derivada de la raíz con la derivada interna.`,
    explanationTitle: "Cadena con raíz cuadrada",
    correct: `\\text{Verdadero}`,
    wrongs: [
      `\\text{Falso: debería aparecer un logaritmo}`,
      `\\text{Falso: faltaría un factor } ${a}`,
      `\\text{Falso: la primitiva correcta es } \\frac{1}{\\sqrt{${a}x+${b}}}+C`,
      `\\text{Falso: el resultado tiene signo negativo}`,
    ],
    finalTex: `\\int \\frac{${a}}{2\\sqrt{${a}x+${b}}}\\,dx=\\sqrt{${a}x+${b}}+C`,
  }
}

function scenarioTrigChain(): Scenario {
  const a = choice([2, 3, 4, 5])
  return {
    kind: "trigChain",
    promptTex: `\\int ${a}\\cos(${a}x)\\,dx`,
    claimTex: `\\sin(${a}x)+C`,
    simplificationTex: `F(x)=\\sin(${a}x)`,
    ruleTex: `\\frac{d}{dx}[\\sin(u(x))]=\\cos(u(x))u'(x)`,
    correctReasonTex: `\\frac{d}{dx}(\\sin(${a}x))=${a}\\cos(${a}x)`,
    derivativeSteps: [
      `F(x)=\\sin(${a}x)`,
      `F'(x)=\\cos(${a}x)\\cdot ${a}`,
      `F'(x)=${a}\\cos(${a}x)`,
    ],
    warningTex: `El factor ${a} es clave. Si no estuviera en el integrando, la propuesta ya no sería correcta.`,
    explanationTitle: "Cadena trigonométrica simple",
    correct: `\\text{Verdadero}`,
    wrongs: [
      `\\text{Falso: la primitiva correcta es } -\\sin(${a}x)+C`,
      `\\text{Falso: debería ser } \\tan(${a}x)+C`,
      `\\text{Falso: faltaría dividir entre } ${a}`,
      `\\text{Falso: la derivada de seno es seno}`,
    ],
    finalTex: `\\int ${a}\\cos(${a}x)\\,dx=\\sin(${a}x)+C`,
  }
}

function scenarioLogarithmicDerivative(): Scenario {
  const a = choice([2, 3, 4, 5])
  const b = choice([1, 2, 3, 4, 5])
  return {
    kind: "logarithmicDerivative",
    promptTex: `\\int \\frac{${a}}{${a}x+${b}}\\,dx`,
    claimTex: `\\ln(${a}x+${b})+C`,
    simplificationTex: `F(x)=\\ln(${a}x+${b})`,
    ruleTex: `\\frac{d}{dx}[\\ln(u(x))]=\\frac{u'(x)}{u(x)}`,
    correctReasonTex: `\\frac{d}{dx}\\left(\\ln(${a}x+${b})\\right)=\\frac{${a}}{${a}x+${b}}`,
    derivativeSteps: [
      `F(x)=\\ln(${a}x+${b})`,
      `F'(x)=\\frac{(${a}x+${b})'}{${a}x+${b}}`,
      `F'(x)=\\frac{${a}}{${a}x+${b}}`,
    ],
    warningTex: `La propuesta solo funciona así porque el numerador coincide con la derivada exacta del denominador.`,
    explanationTitle: "Derivada de un logaritmo",
    correct: `\\text{Verdadero}`,
    wrongs: [
      `\\text{Falso: debería ser } \\frac{1}{${a}}\\ln(${a}x+${b})+C`,
      `\\text{Falso: el resultado correcto es } \\frac{1}{${a}x+${b}}+C`,
      `\\text{Falso: falta valor absoluto y por eso es incorrecta}`,
      `\\text{Falso: la derivada del logaritmo no usa regla de la cadena}`,
    ],
    finalTex: `\\int \\frac{${a}}{${a}x+${b}}\\,dx=\\ln(${a}x+${b})+C`,
  }
}

function scenarioXPowX(): Scenario {
  return {
    kind: "xPowX",
    promptTex: `\\int x^x(1+\\ln x)\\,dx`,
    claimTex: `x^x+C`,
    simplificationTex: `F(x)=x^x`,
    ruleTex: `\\text{Si } y=x^x, \\text{ entonces } \\ln y=x\\ln x`,
    correctReasonTex: `\\frac{d}{dx}(x^x)=x^x(1+\\ln x)`,
    derivativeSteps: [
      `y=x^x`,
      `\\ln y=x\\ln x`,
      `\\frac{y'}{y}=1+\\ln x`,
      `y'=x^x(1+\\ln x)`,
    ],
    warningTex: `Aquí no basta recordar derivadas usuales: hace falta derivación logarítmica.`,
    explanationTitle: "Derivación logarítmica",
    correct: `\\text{Verdadero}`,
    wrongs: [
      `\\text{Falso: la derivada de } x^x \\text{ es solo } x^x\\ln x`,
      `\\text{Falso: la primitiva correcta es } x^{x+1}+C`,
      `\\text{Falso: debería aparecer } \\ln(x^x)+C`,
      `\\text{Falso: el término } 1+\\ln x \\text{ no surge al derivar}`,
    ],
    finalTex: `\\int x^x(1+\\ln x)\\,dx=x^x+C`,
  }
}

function generateScenario() {
  return choice([
    scenarioExpFraction,
    scenarioExpOverSquare,
    scenarioChainPower,
    scenarioLinearChain,
    scenarioRootChain,
    scenarioTrigChain,
    scenarioLogarithmicDerivative,
    scenarioXPowX,
  ])()
}

function generateOptions(s: Scenario): Option[] {
  return trueFalseOptions(s.correct, s.wrongs)
}

export default function IntegralProofGame({
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
          claimTex: scenario.claimTex,
          kind: scenario.kind,
        },
        explanation: {
          simplificationTex: scenario.simplificationTex,
          derivativeCheck: scenario.correctReasonTex,
          ruleTex: scenario.ruleTex,
          steps: scenario.derivativeSteps,
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
        title="Verifique la integral propuesta"
        prompt="Decide si la igualdad es correcta derivando la primitiva propuesta. El ejercicio cambia bastante entre exponenciales, cadenas, logaritmos, trigonometría y derivación logarítmica."
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
                  title: "1. Leer la propuesta",
                  detail: <span>La idea no es integrar desde cero, sino tomar la expresión propuesta y comprobar si al derivarla reaparece exactamente el integrando.</span>,
                  icon: Sigma,
                  content: (
                    <div className="space-y-2">
                      <MathTex block tex={scenario.promptTex} />
                      <MathTex block tex={`= ${scenario.claimTex}`} />
                      {scenario.simplificationTex && (
                        <MathTex block tex={scenario.simplificationTex} />
                      )}
                    </div>
                  ),
                },
                {
                  title: "2. Elegir la regla",
                  detail: <span>Identificamos qué regla domina la derivación: cadena, potencia, logaritmo, exponencial o una combinación de ellas.</span>,
                  icon: FunctionSquare,
                  content: (
                    <div className="space-y-2">
                      <MathTex block tex={scenario.ruleTex} />
                    </div>
                  ),
                },
                {
                  title: "3. Derivar paso a paso",
                  detail: <span>La verificación buena no salta pasos: mostramos exactamente de dónde salen coeficientes, signos y exponentes.</span>,
                  icon: ListChecks,
                  content: (
                    <div className="space-y-2">
                      {scenario.derivativeSteps.map((step, idx) => (
                        <MathTex key={idx} block tex={step} />
                      ))}
                    </div>
                  ),
                },
                {
                  title: "4. Comparar y concluir",
                  detail: <span>Si la derivada final coincide sin cambiar nada esencial del integrando, entonces la afirmación es verdadera. Si falla un signo o un factor, ya no sirve.</span>,
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-2">
                      <MathTex block tex={scenario.correctReasonTex} />
                      <MathTex block tex={`\\text{Cuidado: } ${scenario.warningTex}`} />
                      <MathTex block tex={scenario.finalTex} />
                    </div>
                  ),
                },
              ]}
              concluding={
                <span>
                  Conclusión: <MathTex tex={scenario.correct} />. La igualdad queda demostrada.
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="mb-3 rounded-lg border bg-card p-3">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            Demostración
          </div>
          <div className="space-y-2 rounded-md border bg-background p-3">
            <MathTex block tex={scenario.promptTex} />
            <MathTex block tex={`= ${scenario.claimTex}`} />
          </div>
        </div>

        <div className="mb-2 text-sm text-muted-foreground">
          Marca la opción correcta:
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
                <p>Correcto. La derivada de la primitiva propuesta reproduce exactamente el integrando.</p>
                <MathTex block tex={scenario.correctReasonTex} />
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p>No. Aquí no basta que “se parezca”; debe coincidir por completo, incluyendo signos, factores y derivada interna.</p>
                <MathTex block tex={`\\text{Punto crítico: } ${scenario.warningTex}`} />
                <MathTex block tex={scenario.correctReasonTex} />
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
