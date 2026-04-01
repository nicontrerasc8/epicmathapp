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

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  const type = choice(["expFraction", "xPowX", "chainPower", "expOverSquare"] as const)

  if (type === "expFraction") {
    const a = choice([1, 2, 3, 4])
    return {
      kind: "expFraction" as const,
      a,
      promptTex: `\\int \\frac{${a}e^t}{(1-e^t)^2}\\,dt`,
      claimTex: `\\frac{${a}}{1-e^t}+C`,
      correctReasonTex: `\\frac{d}{dt}\\left(\\frac{${a}}{1-e^t}\\right)=\\frac{${a}e^t}{(1-e^t)^2}`,
      derivativeSteps: [
        `F(t)=\\frac{${a}}{1-e^t}=${a}(1-e^t)^{-1}`,
        `F'(t)=${a}\\cdot(-1)(1-e^t)^{-2}\\cdot(-e^t)`,
        `F'(t)=\\frac{${a}e^t}{(1-e^t)^2}`,
      ],
      correct: `\\text{Verdadero}`,
      wrongs: [
        `\\text{Falso: falta derivar el denominador}`,
        `\\text{Falso: el resultado correcto es } ${a}(1-e^t)+C`,
        `\\text{Falso: debe ser } \\ln(1-e^t)+C`,
        `\\text{Falso: la derivada da signo negativo}`,
      ],
      explanationTitle: "Verificación por derivación",
      finalTex: `\\int \\frac{${a}e^t}{(1-e^t)^2}\\,dt=\\frac{${a}}{1-e^t}+C`,
    }
  }

  if (type === "xPowX") {
    return {
      kind: "xPowX" as const,
      promptTex: `\\int x^x(1+\\ln x)\\,dx`,
      claimTex: `x^x+C`,
      correctReasonTex: `\\frac{d}{dx}(x^x)=x^x(1+\\ln x)`,
      derivativeSteps: [
        `y=x^x`,
        `\\ln y=x\\ln x`,
        `\\frac{y'}{y}=1+\\ln x`,
        `y'=x^x(1+\\ln x)`,
      ],
      correct: `\\text{Verdadero}`,
      wrongs: [
        `\\text{Falso: } \\int x^x\\,dx=x^x+C`,
        `\\text{Falso: el resultado es } x^{x+1}+C`,
        `\\text{Falso: el resultado es } \\ln(x^x)+C`,
        `\\text{Falso: la derivada de } x^x \\text{ es solo } x^x\\ln x`,
      ],
      explanationTitle: "Verificación usando derivación logarítmica",
      finalTex: `\\int x^x(1+\\ln x)\\,dx=x^x+C`,
    }
  }

  if (type === "chainPower") {
    const a = choice([2, 3, 4, 5])
    const n = choice([2, 3, 4])
    return {
      kind: "chainPower" as const,
      a,
      n,
      promptTex: `\\int ${a}x\\,(x^2+1)^{${n}}\\,dx`,
      claimTex: `\\frac{${a}}{${2 * (n + 1)}}(x^2+1)^{${n + 1}}+C`,
      correctReasonTex: `\\frac{d}{dx}\\left(\\frac{${a}}{${2 * (n + 1)}}(x^2+1)^{${n + 1}}\\right)=${a}x(x^2+1)^{${n}}`,
      derivativeSteps: [
        `F(x)=\\frac{${a}}{${2 * (n + 1)}}(x^2+1)^{${n + 1}}`,
        `F'(x)=\\frac{${a}}{${2 * (n + 1)}}(${n + 1})(x^2+1)^{${n}}\\cdot 2x`,
        `F'(x)=${a}x(x^2+1)^{${n}}`,
      ],
      correct: `\\text{Verdadero}`,
      wrongs: [
        `\\text{Falso: falta dividir entre } ${n + 1}`,
        `\\text{Falso: debe multiplicarse por } 2x \\text{ al derivar}`,
        `\\text{Falso: el exponente final no cambia}`,
        `\\text{Falso: el resultado es } (x^2+1)^{${n}}+C`,
      ],
      explanationTitle: "Verificación por regla de la cadena",
      finalTex: `\\int ${a}x(x^2+1)^{${n}}\\,dx=\\frac{${a}}{${2 * (n + 1)}}(x^2+1)^{${n + 1}}+C`,
    }
  }

  const a = choice([1, 2, 3])
  return {
    kind: "expOverSquare" as const,
    a,
    promptTex: `\\int \\frac{${a}e^x}{(1+e^x)^2}\\,dx`,
    claimTex: `-\\frac{${a}}{1+e^x}+C`,
    correctReasonTex: `\\frac{d}{dx}\\left(-\\frac{${a}}{1+e^x}\\right)=\\frac{${a}e^x}{(1+e^x)^2}`,
    derivativeSteps: [
      `F(x)=-\\frac{${a}}{1+e^x}=-${a}(1+e^x)^{-1}`,
      `F'(x)=-${a}\\cdot(-1)(1+e^x)^{-2}\\cdot e^x`,
      `F'(x)=\\frac{${a}e^x}{(1+e^x)^2}`,
    ],
    correct: `\\text{Verdadero}`,
    wrongs: [
      `\\text{Falso: el signo correcto es negativo en la primitiva}`,
      `\\text{Falso: la respuesta correcta es } \\frac{${a}}{1+e^x}+C`,
      `\\text{Falso: la derivada produce } e^{2x}`,
      `\\text{Falso: debe aparecer un logaritmo}`,
    ],
    explanationTitle: "Verificación con estructura racional exponencial",
    finalTex: `\\int \\frac{${a}e^x}{(1+e^x)^2}\\,dx=-\\frac{${a}}{1+e^x}+C`,
  }
}

function generateOptions(s: Scenario): Option[] {
  const values = [s.correct, ...shuffle(s.wrongs).slice(0, 4)]
  return shuffle(values).map(value => ({
    value,
    correct: value === s.correct,
  }))
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
          claimTex: scenario.claimTex,
          kind: scenario.kind,
        },
        explanation: {
          derivativeCheck: scenario.correctReasonTex,
          steps: scenario.derivativeSteps,
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
        title="Pruebe que la integral propuesta es correcta"
        prompt="Verifica si la igualdad dada es verdadera."
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
                  title: "Identificar la primitiva propuesta",
                  detail: <span>Tomamos la expresión del lado derecho y la derivamos.</span>,
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`F=${scenario.claimTex.replace("+C", "")}`} />
                      <MathTex block tex={`\\text{Queremos comprobar que } F' = \\text{integrando}`} />
                    </div>
                  ),
                },
                {
                  title: "Derivar paso a paso",
                  detail: <span>Aplicamos regla de la cadena, derivación logarítmica o potencia, según el caso.</span>,
                  icon: FunctionSquare,
                  content: (
                    <div className="space-y-3">
                      {scenario.derivativeSteps.map((step, idx) => (
                        <MathTex key={idx} block tex={step} />
                      ))}
                    </div>
                  ),
                },
                {
                  title: "Comparar con el integrando",
                  detail: <span>Si la derivada coincide exactamente, la afirmación queda probada.</span>,
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={scenario.correctReasonTex} />
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
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Demostración</div>
          <div className="rounded-lg border bg-background p-3 space-y-3">
            <MathTex block tex={scenario.promptTex} />
            <MathTex block tex={`= ${scenario.claimTex}`} />
          </div>
        </div>

        <div className="mb-3 text-sm text-muted-foreground">
          Marca la opción correcta sobre la afirmación:
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
                <p>Bien. La manera correcta de probarlo es derivar la respuesta propuesta.</p>
                <MathTex block tex={scenario.correctReasonTex} />
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p>No. En este tipo de ejercicio no basta “parecerse”: hay que derivar exactamente la primitiva propuesta.</p>
                <p>Pregunta clave: ¿la derivada del lado derecho reproduce todo el integrando, incluyendo signos, factores y potencias?</p>
                <MathTex block tex={scenario.correctReasonTex} />
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