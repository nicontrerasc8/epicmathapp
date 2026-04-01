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

function signedTerm(n: number, variable = "") {
  if (n > 0) return `+${n}${variable}`
  if (n < 0) return `${n}${variable}`
  return ""
}

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  const family = choice(["quadraticMR", "linearMR", "cubicMR"] as const)

  if (family === "quadraticMR") {
    // Exactamente del mismo estilo que la imagen
    const a = choice([10, 12, 14, 16, 18])
    const b = choice([6, 8, 10, 12])
    const c = choice([1, 2, 3, 4])

    // MR = a - bq - c q^2
    // R(q) = aq - (b/2)q^2 - (c/3)q^3 + C
    // En economía se suele usar R(0)=0 => C=0
    const rTex = `R(q)=${a}q-${b / 2}q^2-\\frac{${c}}{3}q^3`
    const pTex = `p(q)=${a}-${b / 2}q-\\frac{${c}}{3}q^2`

    return {
      kind: "quadraticMR" as const,
      promptTex: `\\frac{dR}{dq}=${a}-${b}q-${c}q^2`,
      correct: `\\text{Ingreso total: } ${rTex}\\qquad \\text{Demanda: } ${pTex}`,
      explanationTitle: "De ingreso marginal a ingreso total y demanda",
      stepsTex: [
        `\\frac{dR}{dq}=${a}-${b}q-${c}q^2`,
        `R(q)=\\int (${a}-${b}q-${c}q^2)\\,dq`,
        `R(q)=${a}q-\\frac{${b}}{2}q^2-\\frac{${c}}{3}q^3+C`,
        `\\text{Como } R(0)=0, \\text{ entonces } C=0`,
        `R(q)=${a}q-${b / 2}q^2-\\frac{${c}}{3}q^3`,
        `\\text{Además } R(q)=q\\,p(q)`,
        `p(q)=\\frac{R(q)}{q}`,
        `p(q)=${a}-${b / 2}q-\\frac{${c}}{3}q^2`,
      ],
      finalRevenueTex: rTex,
      finalDemandTex: pTex,
      wrongs: [
        `\\text{Ingreso total: } R(q)=${a}q-${b}q^2-${c}q^3\\qquad \\text{Demanda: } p(q)=${a}-${b}q-${c}q^2`,
        `\\text{Ingreso total: } R(q)=${a}-${b / 2}q^2-\\frac{${c}}{3}q^3\\qquad \\text{Demanda: } p(q)=${a}-${b / 2}q-\\frac{${c}}{3}q^2`,
        `\\text{Ingreso total: } ${rTex}\\qquad \\text{Demanda: } p(q)=\\frac{${a}q-${b / 2}q^2-\\frac{${c}}{3}q^3}{q^2}`,
        `\\text{Ingreso total: } R(q)=${a}q-${b / 2}q^2-\\frac{${c}}{2}q^3\\qquad \\text{Demanda: } p(q)=${a}-${b / 2}q-\\frac{${c}}{2}q^2`,
      ],
      feedbackCorrectTex: `\\text{Bien: primero integraste } \\frac{dR}{dq} \\text{ y luego usaste } p(q)=\\frac{R(q)}{q}.`,
      feedbackWrongTex: `\\text{Ojo: } R(q) \\text{ se obtiene integrando y la demanda sale de } R(q)=q\\,p(q).`,
      title: "Halle el ingreso total y la función de demanda",
    }
  }

  if (family === "linearMR") {
    const a = choice([20, 24, 30, 36])
    const b = choice([2, 4, 6, 8])

    const rTex = `R(q)=${a}q-${b / 2}q^2`
    const pTex = `p(q)=${a}-${b / 2}q`

    return {
      kind: "linearMR" as const,
      promptTex: `\\frac{dR}{dq}=${a}-${b}q`,
      correct: `\\text{Ingreso total: } ${rTex}\\qquad \\text{Demanda: } ${pTex}`,
      explanationTitle: "Caso lineal de ingreso marginal",
      stepsTex: [
        `\\frac{dR}{dq}=${a}-${b}q`,
        `R(q)=\\int (${a}-${b}q)\\,dq`,
        `R(q)=${a}q-\\frac{${b}}{2}q^2+C`,
        `\\text{Como } R(0)=0, \\text{ entonces } C=0`,
        `R(q)=${a}q-${b / 2}q^2`,
        `p(q)=\\frac{R(q)}{q}=${a}-${b / 2}q`,
      ],
      finalRevenueTex: rTex,
      finalDemandTex: pTex,
      wrongs: [
        `\\text{Ingreso total: } R(q)=${a}q-${b}q^2\\qquad \\text{Demanda: } p(q)=${a}-${b}q`,
        `\\text{Ingreso total: } R(q)=${a}-${b / 2}q^2\\qquad \\text{Demanda: } p(q)=${a}-${b / 2}q`,
        `\\text{Ingreso total: } ${rTex}\\qquad \\text{Demanda: } p(q)=\\frac{${a}q-${b / 2}q^2}{q^2}`,
        `\\text{Ingreso total: } R(q)=${a}q-${b / 2}q^2+5\\qquad \\text{Demanda: } p(q)=${a}-${b / 2}q`,
      ],
      feedbackCorrectTex: `\\text{Bien: este caso solo requiere integrar una función lineal y dividir entre } q.`,
      feedbackWrongTex: `\\text{Ojo con dos cosas: al integrar } q \\text{ sale } \\frac{q^2}{2}, \\text{ y además } R(0)=0.`,
      title: "Halle el ingreso total y la función de demanda",
    }
  }

  const a = choice([12, 15, 18])
  const b = choice([3, 4, 5])
  const c = choice([2, 3])

  // MR = a - bq^2 - cq^3
  const rTex = `R(q)=${a}q-\\frac{${b}}{3}q^3-\\frac{${c}}{4}q^4`
  const pTex = `p(q)=${a}-\\frac{${b}}{3}q^2-\\frac{${c}}{4}q^3`

  return {
    kind: "cubicMR" as const,
    promptTex: `\\frac{dR}{dq}=${a}-${b}q^2-${c}q^3`,
    correct: `\\text{Ingreso total: } ${rTex}\\qquad \\text{Demanda: } ${pTex}`,
    explanationTitle: "Caso con potencias más altas",
    stepsTex: [
      `\\frac{dR}{dq}=${a}-${b}q^2-${c}q^3`,
      `R(q)=\\int (${a}-${b}q^2-${c}q^3)\\,dq`,
      `R(q)=${a}q-\\frac{${b}}{3}q^3-\\frac{${c}}{4}q^4+C`,
      `\\text{Como } R(0)=0, \\text{ entonces } C=0`,
      `R(q)=${a}q-\\frac{${b}}{3}q^3-\\frac{${c}}{4}q^4`,
      `p(q)=\\frac{R(q)}{q}=${a}-\\frac{${b}}{3}q^2-\\frac{${c}}{4}q^3`,
    ],
    finalRevenueTex: rTex,
    finalDemandTex: pTex,
    wrongs: [
      `\\text{Ingreso total: } R(q)=${a}q-${b}q^3-${c}q^4\\qquad \\text{Demanda: } p(q)=${a}-${b}q^2-${c}q^3`,
      `\\text{Ingreso total: } R(q)=${a}q-\\frac{${b}}{2}q^3-\\frac{${c}}{3}q^4\\qquad \\text{Demanda: } p(q)=${a}-\\frac{${b}}{2}q^2-\\frac{${c}}{3}q^3`,
      `\\text{Ingreso total: } ${rTex}\\qquad \\text{Demanda: } p(q)=\\frac{${a}q-\\frac{${b}}{3}q^3-\\frac{${c}}{4}q^4}{q^2}`,
      `\\text{Ingreso total: } R(q)=${a}q-\\frac{${b}}{3}q^3-\\frac{${c}}{4}q^4+2\\qquad \\text{Demanda: } ${pTex}`,
    ],
    feedbackCorrectTex: `\\text{Bien: integraste término a término y luego dividiste entre } q.`,
    feedbackWrongTex: `\\text{Ojo: para hallar demanda, primero obtén } R(q) \\text{ y recién después usa } p(q)=\\frac{R(q)}{q}.`,
    title: "Halle el ingreso total y la función de demanda",
  }
}

function generateOptions(s: Scenario): Option[] {
  const values = [s.correct, ...shuffle(s.wrongs).slice(0, 4)]
  return shuffle(values).map((value) => ({
    value,
    correct: value === s.correct,
  }))
}

export default function MarginalRevenueGame({
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
          finalRevenueTex: scenario.finalRevenueTex,
          finalDemandTex: scenario.finalDemandTex,
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
        prompt="Integra el ingreso marginal para hallar el ingreso total y luego usa R(q)=q·p(q)."
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
                  title: "Hallar el ingreso total",
                  detail: (
                    <span>
                      Si te dan <MathTex tex="\\frac{dR}{dq}" />, entonces debes integrar respecto de <MathTex tex="q" />.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      {scenario.stepsTex.slice(0, Math.max(4, scenario.stepsTex.length - 3)).map((step, idx) => (
                        <MathTex key={idx} block tex={step} />
                      ))}
                    </div>
                  ),
                },
                {
                  title: "Hallar la función de demanda",
                  detail: (
                    <span>
                      Usamos que <MathTex tex="R(q)=q\\,p(q)" />, así que <MathTex tex="p(q)=\\frac{R(q)}{q}" />.
                    </span>
                  ),
                  icon: FunctionSquare,
                  content: (
                    <div className="space-y-3">
                      {scenario.stepsTex.slice(Math.max(4, scenario.stepsTex.length - 3)).map((step, idx) => (
                        <MathTex key={idx} block tex={step} />
                      ))}
                    </div>
                  ),
                },
                {
                  title: "Escribir las respuestas finales",
                  detail: <span>Debes reportar tanto ingreso total como demanda.</span>,
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\text{Ingreso total: } ${scenario.finalRevenueTex}`} />
                      <MathTex block tex={`\\text{Demanda: } ${scenario.finalDemandTex}`} />
                    </div>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta final:{" "}
                  <MathTex tex={`\\text{Ingreso total: } ${scenario.finalRevenueTex},\\quad \\text{Demanda: } ${scenario.finalDemandTex}`} />
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
          <div className="mt-4 rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 font-medium mb-2">
              <CheckCircle2 className="h-4 w-4" />
              Feedback inmediato
            </div>

            {selected === scenario.correct ? (
              <div className="space-y-2 text-sm">
                <p>Bien hecho. Seguiste correctamente el paso de integrar y luego despejar la demanda.</p>
                <MathTex block tex={scenario.feedbackCorrectTex} />
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p>Aún no. Revisa la integración y recuerda que la demanda sale a partir de \(R(q)=q\,p(q)\).</p>
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