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
  title: string
  promptTex: string
  correct: string
  wrongs: string[]
  explanationTitle: string
  readingTex: string
  integrationSteps: string[]
  normalizationSteps: string[]
  demandSteps: string[]
  verificationSteps: string[]
  finalRevenueTex: string
  finalDemandTex: string
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

function makeOptions(correct: string, wrongs: string[]): Option[] {
  return shuffle(Array.from(new Set([correct, ...wrongs])).slice(0, 5)).map((value) => ({
    value,
    correct: value === correct,
  }))
}

function pairAnswer(revenueTex: string, demandTex: string) {
  return `\\text{Ingreso total: } ${revenueTex}\\qquad \\text{Demanda: } ${demandTex}`
}

function scenarioLinearMR(): Scenario {
  const a = choice([20, 24, 30, 36, 40])
  const b = choice([2, 4, 6, 8])
  const revenueTex = `R(q)=${a}q-\\frac{${b}}{2}q^2`
  const demandTex = `p(q)=${a}-\\frac{${b}}{2}q`

  return {
    kind: "linearMR",
    title: "Halle el ingreso total y la funcion de demanda",
    promptTex: `\\frac{dR}{dq}=${a}-${b}q`,
    correct: pairAnswer(revenueTex, demandTex),
    wrongs: [
      pairAnswer(`R(q)=${a}q-${b}q^2`, `p(q)=${a}-${b}q`),
      pairAnswer(`R(q)=${a}-\\frac{${b}}{2}q^2`, `p(q)=${a}-\\frac{${b}}{2}q`),
      pairAnswer(revenueTex, `p(q)=\\frac{${a}q-\\frac{${b}}{2}q^2}{q^2}`),
      pairAnswer(`R(q)=${a}q-\\frac{${b}}{2}q^2+5`, demandTex),
    ],
    explanationTitle: "Ingreso marginal lineal",
    readingTex:
      "El dato entregado es el ingreso marginal. Eso no es la demanda ni el ingreso total: primero hay que integrar respecto de q.",
    integrationSteps: [
      `\\frac{dR}{dq}=${a}-${b}q`,
      `R(q)=\\int (${a}-${b}q)\\,dq`,
      `R(q)=${a}q-\\frac{${b}}{2}q^2+C`,
    ],
    normalizationSteps: [
      `\\text{En estos ejercicios se usa la condicion economica } R(0)=0`,
      `R(0)=C=0`,
      `R(q)=${a}q-\\frac{${b}}{2}q^2`,
    ],
    demandSteps: [
      `\\text{Como } R(q)=q\\,p(q), \\text{ despejamos } p(q)=\\frac{R(q)}{q}`,
      `p(q)=\\frac{${a}q-\\frac{${b}}{2}q^2}{q}`,
      `p(q)=${a}-\\frac{${b}}{2}q`,
    ],
    verificationSteps: [
      `R'(q)=${a}-${b}q`,
      `q\\,p(q)=${a}q-\\frac{${b}}{2}q^2`,
    ],
    finalRevenueTex: revenueTex,
    finalDemandTex: demandTex,
    feedbackCorrectTex:
      `\\text{Bien: integraste el ingreso marginal, anulaste la constante con } R(0)=0 \\text{ y luego despejaste la demanda.}`,
    feedbackWrongTex:
      `\\text{Error tipico: tratar } \\frac{dR}{dq} \\text{ como si ya fuera } R(q), \\text{ o dividir por } q^2 \\text{ en lugar de } q.`,
    warningTex:
      "La demanda no sale integrando otra vez; sale al dividir el ingreso total entre q.",
  }
}

function scenarioQuadraticMR(): Scenario {
  const a = choice([10, 12, 14, 16, 18])
  const b = choice([6, 8, 10, 12])
  const c = choice([1, 2, 3, 4])
  const revenueTex = `R(q)=${a}q-\\frac{${b}}{2}q^2-\\frac{${c}}{3}q^3`
  const demandTex = `p(q)=${a}-\\frac{${b}}{2}q-\\frac{${c}}{3}q^2`

  return {
    kind: "quadraticMR",
    title: "Halle el ingreso total y la funcion de demanda",
    promptTex: `\\frac{dR}{dq}=${a}-${b}q-${c}q^2`,
    correct: pairAnswer(revenueTex, demandTex),
    wrongs: [
      pairAnswer(`R(q)=${a}q-${b}q^2-${c}q^3`, `p(q)=${a}-${b}q-${c}q^2`),
      pairAnswer(`R(q)=${a}-\\frac{${b}}{2}q^2-\\frac{${c}}{3}q^3`, demandTex),
      pairAnswer(revenueTex, `p(q)=\\frac{${a}q-\\frac{${b}}{2}q^2-\\frac{${c}}{3}q^3}{q^2}`),
      pairAnswer(`R(q)=${a}q-\\frac{${b}}{2}q^2-\\frac{${c}}{2}q^3`, `p(q)=${a}-\\frac{${b}}{2}q-\\frac{${c}}{2}q^2`),
    ],
    explanationTitle: "Ingreso marginal cuadratico",
    readingTex:
      "Aqui el ingreso marginal es un polinomio de segundo grado. Por eso el ingreso total resultara ser un polinomio de tercer grado.",
    integrationSteps: [
      `\\frac{dR}{dq}=${a}-${b}q-${c}q^2`,
      `R(q)=\\int (${a}-${b}q-${c}q^2)\\,dq`,
      `R(q)=${a}q-\\frac{${b}}{2}q^2-\\frac{${c}}{3}q^3+C`,
    ],
    normalizationSteps: [
      `R(0)=0 \\Rightarrow C=0`,
      `R(q)=${a}q-\\frac{${b}}{2}q^2-\\frac{${c}}{3}q^3`,
      `\\text{Esta es la funcion de ingreso total, no la demanda.}`,
    ],
    demandSteps: [
      `R(q)=q\\,p(q)`,
      `p(q)=\\frac{R(q)}{q}=\\frac{${a}q-\\frac{${b}}{2}q^2-\\frac{${c}}{3}q^3}{q}`,
      `p(q)=${a}-\\frac{${b}}{2}q-\\frac{${c}}{3}q^2`,
    ],
    verificationSteps: [
      `R'(q)=${a}-${b}q-${c}q^2`,
      `q\\,p(q)=${a}q-\\frac{${b}}{2}q^2-\\frac{${c}}{3}q^3`,
    ],
    finalRevenueTex: revenueTex,
    finalDemandTex: demandTex,
    feedbackCorrectTex:
      `\\text{Correcto: primero construiste } R(q) \\text{ integrando, y recien despues obtuviste } p(q).`,
    feedbackWrongTex:
      `\\text{Error tipico: olvidar dividir entre el nuevo exponente al integrar, o calcular la demanda a partir del marginal y no de } R(q).`,
    warningTex:
      "No confundas las tres funciones del problema: ingreso marginal, ingreso total y demanda.",
  }
}

function scenarioCubicMR(): Scenario {
  const a = choice([12, 15, 18, 21])
  const b = choice([3, 4, 5])
  const c = choice([2, 3, 4])
  const revenueTex = `R(q)=${a}q-\\frac{${b}}{3}q^3-\\frac{${c}}{4}q^4`
  const demandTex = `p(q)=${a}-\\frac{${b}}{3}q^2-\\frac{${c}}{4}q^3`

  return {
    kind: "cubicMR",
    title: "Halle el ingreso total y la funcion de demanda",
    promptTex: `\\frac{dR}{dq}=${a}-${b}q^2-${c}q^3`,
    correct: pairAnswer(revenueTex, demandTex),
    wrongs: [
      pairAnswer(`R(q)=${a}q-${b}q^3-${c}q^4`, `p(q)=${a}-${b}q^2-${c}q^3`),
      pairAnswer(`R(q)=${a}q-\\frac{${b}}{2}q^3-\\frac{${c}}{3}q^4`, `p(q)=${a}-\\frac{${b}}{2}q^2-\\frac{${c}}{3}q^3`),
      pairAnswer(revenueTex, `p(q)=\\frac{${a}q-\\frac{${b}}{3}q^3-\\frac{${c}}{4}q^4}{q^2}`),
      pairAnswer(`R(q)=${a}q-\\frac{${b}}{3}q^3-\\frac{${c}}{4}q^4+2`, demandTex),
    ],
    explanationTitle: "Potencias altas en ingreso marginal",
    readingTex:
      "Aunque aparezcan potencias altas, la idea no cambia: integrar termino a termino, fijar la constante y luego dividir por q.",
    integrationSteps: [
      `\\frac{dR}{dq}=${a}-${b}q^2-${c}q^3`,
      `R(q)=\\int (${a}-${b}q^2-${c}q^3)\\,dq`,
      `R(q)=${a}q-\\frac{${b}}{3}q^3-\\frac{${c}}{4}q^4+C`,
    ],
    normalizationSteps: [
      `R(0)=0 \\Rightarrow C=0`,
      `R(q)=${a}q-\\frac{${b}}{3}q^3-\\frac{${c}}{4}q^4`,
    ],
    demandSteps: [
      `p(q)=\\frac{R(q)}{q}`,
      `p(q)=\\frac{${a}q-\\frac{${b}}{3}q^3-\\frac{${c}}{4}q^4}{q}`,
      `p(q)=${a}-\\frac{${b}}{3}q^2-\\frac{${c}}{4}q^3`,
    ],
    verificationSteps: [
      `R'(q)=${a}-${b}q^2-${c}q^3`,
      `q\\,p(q)=${a}q-\\frac{${b}}{3}q^3-\\frac{${c}}{4}q^4`,
    ],
    finalRevenueTex: revenueTex,
    finalDemandTex: demandTex,
    feedbackCorrectTex:
      `\\text{Bien: respetaste los nuevos divisores al integrar y luego simplificaste bien la demanda.}`,
    feedbackWrongTex:
      `\\text{Error tipico: usar divisores incorrectos como } 2 \\text{ o } 3 \\text{ cuando el exponente nuevo exige } 3 \\text{ y } 4.`,
    warningTex:
      "En polinomios de grado alto, el fallo mas comun es mecanico: integrar sin actualizar bien el exponente y el divisor.",
  }
}

function scenarioAffineMR(): Scenario {
  const a = choice([18, 24, 30])
  const b = choice([3, 4, 6])
  const d = choice([2, 4, 6])
  const revenueTex = `R(q)=${a}q-\\frac{${b}}{2}q^2+${d}q`
  const demandTex = `p(q)=${a}-${b === 1 ? "" : `\\frac{${b}}{2}`}q+${d}`
    .replace(`-${""}q`, `-q`)

  return {
    kind: "affineMR",
    title: "Halle el ingreso total y la funcion de demanda",
    promptTex: `\\frac{dR}{dq}=${a}-${b}q+${d}`,
    correct: pairAnswer(revenueTex, demandTex),
    wrongs: [
      pairAnswer(`R(q)=${a}q-${b}q^2+${d}q`, `p(q)=${a}-${b}q+${d}`),
      pairAnswer(`R(q)=${a}q-\\frac{${b}}{2}q^2+${d}`, demandTex),
      pairAnswer(revenueTex, `p(q)=\\frac{${a}q-\\frac{${b}}{2}q^2+${d}q}{q^2}`),
      pairAnswer(`R(q)=${a}q-\\frac{${b}}{2}q^2+${d}q+3`, demandTex),
    ],
    explanationTitle: "Ingreso marginal con termino constante extra",
    readingTex:
      "El termino constante positivo tambien se integra. No desaparece: produce un termino lineal adicional en el ingreso total.",
    integrationSteps: [
      `\\frac{dR}{dq}=${a}-${b}q+${d}`,
      `R(q)=\\int (${a}-${b}q+${d})\\,dq`,
      `R(q)=${a}q-\\frac{${b}}{2}q^2+${d}q+C`,
    ],
    normalizationSteps: [
      `R(0)=0 \\Rightarrow C=0`,
      `R(q)=${a}q-\\frac{${b}}{2}q^2+${d}q`,
      `\\text{Se pueden combinar los terminos lineales al simplificar la demanda.}`,
    ],
    demandSteps: [
      `p(q)=\\frac{R(q)}{q}`,
      `p(q)=\\frac{${a}q-\\frac{${b}}{2}q^2+${d}q}{q}`,
      `p(q)=${a}-\\frac{${b}}{2}q+${d}`,
    ],
    verificationSteps: [
      `R'(q)=${a}-${b}q+${d}`,
      `q\\,p(q)=${a}q-\\frac{${b}}{2}q^2+${d}q`,
    ],
    finalRevenueTex: revenueTex,
    finalDemandTex: demandTex,
    feedbackCorrectTex:
      `\\text{Correcto: detectaste que el termino constante del marginal agrega otro termino lineal a } R(q).`,
    feedbackWrongTex:
      `\\text{Error tipico: convertir un termino constante en constante de integracion, cuando en realidad produce un termino con } q.`,
    warningTex:
      "No confundas un termino constante del integrando con la constante de integracion.",
  }
}

function scenarioRootMR(): Scenario {
  const a = choice([18, 20, 24])
  const b = choice([2, 3, 4])
  const revenueTex = `R(q)=${a}q-${b}\\,q^{\\frac{3}{2}}`
  const demandTex = `p(q)=${a}-${b}\\sqrt{q}`

  return {
    kind: "rootMR",
    title: "Halle el ingreso total y la funcion de demanda",
    promptTex: `\\frac{dR}{dq}=${a}-\\frac{3${b}}{2}\\sqrt{q}`,
    correct: pairAnswer(revenueTex, demandTex),
    wrongs: [
      pairAnswer(`R(q)=${a}q-\\frac{3${b}}{2}q^{\\frac{3}{2}}`, `p(q)=${a}-\\frac{3${b}}{2}\\sqrt{q}`),
      pairAnswer(`R(q)=${a}q-${b}\\sqrt{q}`, `p(q)=${a}-${b}\\sqrt{q}`),
      pairAnswer(revenueTex, `p(q)=\\frac{${a}q-${b}q^{\\frac{3}{2}}}{q^2}`),
      pairAnswer(`R(q)=${a}q-${b}\\,q^{\\frac{3}{2}}+4`, demandTex),
    ],
    explanationTitle: "Ingreso marginal con radical",
    readingTex:
      "Este caso obliga a usar la regla de potencias fraccionarias. La raiz no debe quedarse igual despues de integrar.",
    integrationSteps: [
      `\\frac{dR}{dq}=${a}-\\frac{3${b}}{2}\\sqrt{q}=${a}-\\frac{3${b}}{2}q^{\\frac{1}{2}}`,
      `R(q)=\\int \\left(${a}-\\frac{3${b}}{2}q^{\\frac{1}{2}}\\right)dq`,
      `R(q)=${a}q-\\frac{3${b}}{2}\\cdot \\frac{q^{\\frac{3}{2}}}{\\frac{3}{2}}+C`,
      `R(q)=${a}q-${b}q^{\\frac{3}{2}}+C`,
    ],
    normalizationSteps: [
      `R(0)=0 \\Rightarrow C=0`,
      `R(q)=${a}q-${b}q^{\\frac{3}{2}}`,
    ],
    demandSteps: [
      `p(q)=\\frac{R(q)}{q}`,
      `p(q)=\\frac{${a}q-${b}q^{\\frac{3}{2}}}{q}`,
      `p(q)=${a}-${b}q^{\\frac{1}{2}}=${a}-${b}\\sqrt{q}`,
    ],
    verificationSteps: [
      `R'(q)=${a}-\\frac{3${b}}{2}\\sqrt{q}`,
      `q\\,p(q)=${a}q-${b}q^{\\frac{3}{2}}`,
    ],
    finalRevenueTex: revenueTex,
    finalDemandTex: demandTex,
    feedbackCorrectTex:
      `\\text{Bien: transformaste la raiz en potencia y la integraste correctamente.}`,
    feedbackWrongTex:
      `\\text{Error tipico: dejar } \\sqrt{q} \\text{ sin cambiar el exponente al integrar.}`,
    warningTex:
      "Las raices se integran como potencias fraccionarias, no como si fueran terminos lineales.",
  }
}

function scenarioInverseMR(): Scenario {
  const a = choice([16, 20, 24])
  const b = choice([4, 6, 8])
  const revenueTex = `R(q)=${a}q-${b}\\ln(q)+${b}\\ln(1)`
  const demandTex = `p(q)=${a}-\\frac{${b}\\ln(q)}{q}`

  return {
    kind: "inverseMR",
    title: "Halle el ingreso total y la funcion de demanda",
    promptTex: `\\frac{dR}{dq}=${a}-\\frac{${b}}{q},\\quad q>0`,
    correct: pairAnswer(`R(q)=${a}q-${b}\\ln(q)`, demandTex),
    wrongs: [
      pairAnswer(`R(q)=${a}q-\\frac{${b}}{q}`, `p(q)=${a}-\\frac{${b}}{q^2}`),
      pairAnswer(`R(q)=${a}q+${b}\\ln(q)`, `p(q)=${a}+\\frac{${b}\\ln(q)}{q}`),
      pairAnswer(`R(q)=${a}q-${b}\\ln(q)+3`, demandTex),
      pairAnswer(`R(q)=${a}q-${b}\\ln(q)`, `p(q)=\\frac{${a}q-${b}\\ln(q)}{q^2}`),
    ],
    explanationTitle: "Ingreso marginal con termino inverso",
    readingTex:
      "Este es un caso especial porque aparece 1/q. Su integral no sigue la regla de potencia habitual: produce un logaritmo.",
    integrationSteps: [
      `\\frac{dR}{dq}=${a}-\\frac{${b}}{q}`,
      `R(q)=\\int \\left(${a}-\\frac{${b}}{q}\\right)dq`,
      `R(q)=${a}q-${b}\\ln(q)+C`,
    ],
    normalizationSteps: [
      `\\text{Aqui se trabaja con } q>0 \\text{ para que } \\ln(q) \\text{ tenga sentido}`,
      `\\text{La parte estructural importante es } R(q)=${a}q-${b}\\ln(q)`,
    ],
    demandSteps: [
      `p(q)=\\frac{R(q)}{q}`,
      `p(q)=\\frac{${a}q-${b}\\ln(q)}{q}`,
      `p(q)=${a}-\\frac{${b}\\ln(q)}{q}`,
    ],
    verificationSteps: [
      `R'(q)=${a}-\\frac{${b}}{q}`,
      `q\\,p(q)=${a}q-${b}\\ln(q)`,
    ],
    finalRevenueTex: `R(q)=${a}q-${b}\\ln(q)`,
    finalDemandTex: demandTex,
    feedbackCorrectTex:
      `\\text{Correcto: reconociste que } \\int \\frac{1}{q}dq=\\ln(q).`,
    feedbackWrongTex:
      `\\text{Error tipico: integrar } \\frac{1}{q} \\text{ como si diera } -\\frac{1}{q}.`,
    warningTex:
      "El logaritmo aparece solo cuando el exponente es -1; no se usa la regla de potencia comun.",
  }
}

function generateScenario(): Scenario {
  return choice([
    scenarioLinearMR,
    scenarioQuadraticMR,
    scenarioCubicMR,
    scenarioAffineMR,
    scenarioRootMR,
    scenarioInverseMR,
  ])()
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
    const nextScenario = generateScenario()
    return {
      ...nextScenario,
      options: makeOptions(nextScenario.correct, nextScenario.wrongs),
    }
  }, [nonce])

  const trophyPreview = useMemo(() => computeTrophyGain(elapsed), [elapsed])

  async function pickOption(option: Option) {
    if (!engine.canAnswer) return

    const timeSeconds = (Date.now() - startedAtRef.current) / 1000
    setSelected(option.value)
    engine.submit(option.correct)

    await submitAttempt({
      correct: option.correct,
      answer: {
        selected: option.value,
        correctAnswer: scenario.correct,
        question: {
          promptTex: scenario.promptTex,
          kind: scenario.kind,
        },
        explanation: {
          readingTex: scenario.readingTex,
          integrationSteps: scenario.integrationSteps,
          normalizationSteps: scenario.normalizationSteps,
          demandSteps: scenario.demandSteps,
          verificationSteps: scenario.verificationSteps,
          warningTex: scenario.warningTex,
          finalRevenueTex: scenario.finalRevenueTex,
          finalDemandTex: scenario.finalDemandTex,
        },
        options: scenario.options.map((item) => item.value),
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce((value) => value + 1)
  }

  return (
    <MathProvider>
      <ExerciseShell
        title={scenario.title}
        prompt="A partir del ingreso marginal, encuentra el ingreso total y luego la demanda usando R(q)=q p(q). El ejercicio cambia entre casos lineales, polinomicos, radicales y logaritmicos."
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
                  title: "1. Leer que te estan dando",
                  detail: (
                    <span>
                      El enunciado entrega ingreso marginal, es decir{" "}
                      <MathTex tex="\\frac{dR}{dq}" />. Eso significa que la primera tarea es
                      recuperar <MathTex tex="R(q)" /> por integracion.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-2">
                      <MathTex block tex={scenario.promptTex} />
                      <div className="text-sm text-muted-foreground">{scenario.readingTex}</div>
                    </div>
                  ),
                },
                {
                  title: "2. Hallar el ingreso total",
                  detail: (
                    <span>
                      Se integra respecto de <MathTex tex="q" /> y luego se fija la constante con la
                      condicion economica habitual.
                    </span>
                  ),
                  icon: FunctionSquare,
                  content: (
                    <div className="space-y-2">
                      {scenario.integrationSteps.map((step, index) => (
                        <MathTex key={index} block tex={step} />
                      ))}
                      {scenario.normalizationSteps.map((step, index) => (
                        <MathTex key={`norm-${index}`} block tex={step} />
                      ))}
                    </div>
                  ),
                },
                {
                  title: "3. Pasar de ingreso total a demanda",
                  detail: (
                    <span>
                      No se integra otra vez. Se usa la relacion comercial{" "}
                      <MathTex tex="R(q)=q p(q)" /> y se despeja <MathTex tex="p(q)" />.
                    </span>
                  ),
                  icon: ListChecks,
                  content: (
                    <div className="space-y-2">
                      {scenario.demandSteps.map((step, index) => (
                        <MathTex key={index} block tex={step} />
                      ))}
                    </div>
                  ),
                },
                {
                  title: "4. Verificar y reportar",
                  detail: (
                    <span>
                      La respuesta final debe incluir ambas funciones y pasar dos chequeos: que la
                      derivada del ingreso total recupere el marginal y que <MathTex tex="q p(q)" />{" "}
                      reproduzca <MathTex tex="R(q)" />.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-2">
                      {scenario.verificationSteps.map((step, index) => (
                        <MathTex key={index} block tex={step} />
                      ))}
                      <MathTex block tex={`\\text{Cuidado: } ${scenario.warningTex}`} />
                      <MathTex block tex={`\\text{Ingreso total: } ${scenario.finalRevenueTex}`} />
                      <MathTex block tex={`\\text{Demanda: } ${scenario.finalDemandTex}`} />
                    </div>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta final:{" "}
                  <MathTex
                    tex={`\\text{Ingreso total: } ${scenario.finalRevenueTex},\\quad \\text{Demanda: } ${scenario.finalDemandTex}`}
                  />
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

        <div className="mb-2 text-sm text-muted-foreground">Marca la opcion correcta:</div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={(option) => <MathTex tex={option.value} />}
        />

        {engine.status !== "idle" && (
          <div className="mt-3 rounded-lg border bg-card p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Feedback inmediato
            </div>

            {selected === scenario.correct ? (
              <div className="space-y-2 text-sm">
                <p>
                  Correcto. Primero recuperaste el ingreso total y despues obtuviste la demanda con
                  la relacion adecuada.
                </p>
                <MathTex block tex={scenario.feedbackCorrectTex} />
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p>
                  No. Revisa si realmente integraste el marginal y si la demanda la calculaste a
                  partir de <MathTex tex="R(q)" />, no directamente desde <MathTex tex="\\frac{dR}{dq}" />.
                </p>
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
