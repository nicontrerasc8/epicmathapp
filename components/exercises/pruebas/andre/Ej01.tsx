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

type Fraction = { num: number; den: number }
type Term = { coeff: Fraction; exp: Fraction }
type Scenario = {
  kind: string
  promptTex: string
  simplifiedTex: string
  ruleTex: string
  correctTex: string
  wrongs: string[]
  explanationTitle: string
  setupSteps: string[]
  integrationSteps: string[]
  verificationSteps: string[]
  finalTex: string
  commonMistakeTex: string
}

function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const r = x % y
    x = y
    y = r
  }
  return x || 1
}

function frac(num: number, den = 1): Fraction {
  if (den === 0) throw new Error("zero denominator")
  if (num === 0) return { num: 0, den: 1 }
  const sign = den < 0 ? -1 : 1
  const g = gcd(num, den)
  return { num: (sign * num) / g, den: Math.abs(den) / g }
}

function addF(a: Fraction, b: Fraction): Fraction {
  return frac(a.num * b.den + b.num * a.den, a.den * b.den)
}

function divF(a: Fraction, b: Fraction): Fraction {
  return frac(a.num * b.den, a.den * b.num)
}

function ftex(f: Fraction): string {
  return f.den === 1 ? String(f.num) : `\\frac{${f.num}}{${f.den}}`
}

function etex(f: Fraction): string {
  return f.den === 1 ? String(f.num) : `\\frac{${f.num}}{${f.den}}`
}

function termTex(term: Term, variable: string): string {
  if (term.coeff.num === 0) return "0"
  if (term.exp.num === 0) return ftex(term.coeff)
  const varTex =
    term.exp.den === 1 && term.exp.num === 1 ? variable : `${variable}^{${etex(term.exp)}}`
  if (term.coeff.num === term.coeff.den) return varTex
  if (term.coeff.num === -term.coeff.den) return `-${varTex}`
  return `${ftex(term.coeff)}${varTex}`
}

function polyTex(terms: Term[], variable: string): string {
  return terms
    .filter((t) => t.coeff.num !== 0)
    .map((t, i) => {
      const tex = termTex(t, variable)
      if (i === 0) return tex
      return tex.startsWith("-") ? ` ${tex}` : `+ ${tex}`
    })
    .join(" ")
}

function integrateTerm(term: Term): Term {
  const next = addF(term.exp, frac(1))
  return { coeff: divF(term.coeff, next), exp: next }
}

function integratePoly(terms: Term[], variable: string): string {
  return `${polyTex(terms.map(integrateTerm), variable)} + C`
}

function makeOptions(correctTex: string, wrongs: string[]): Option[] {
  return shuffle(Array.from(new Set([correctTex, ...wrongs])).slice(0, 5)).map((value) => ({
    value,
    correct: value === correctTex,
  }))
}

function powerRule(variable: string) {
  return `\\int ${variable}^n\\,d${variable}=\\frac{${variable}^{n+1}}{n+1}+C,\\quad n\\neq -1`
}

function scenarioPowerRoot(): Scenario {
  const v = choice(["x", "t", "u"])
  const a = choice([1, 2, 3, 4, 5, 6])
  const coeff = a === 1 ? "" : `${a}`
  const terms = [{ coeff: frac(a), exp: frac(3, 2) }]
  const correctTex = integratePoly(terms, v)
  return {
    kind: "powerRoot",
    promptTex: `\\int ${coeff}${v}\\sqrt{${v}}\\,d${v}`,
    simplifiedTex: `${coeff}${v}^{\\frac{3}{2}}`,
    ruleTex: powerRule(v),
    correctTex,
    wrongs: [
      `${ftex(frac(2 * a, 3))}${v}^{\\frac{3}{2}} + C`,
      `${ftex(frac(a, 5))}${v}^{\\frac{5}{2}} + C`,
      `${ftex(frac(5 * a, 2))}${v}^{\\frac{5}{2}} + C`,
      `${ftex(frac(2 * a, 5))}${v}^{\\frac{5}{2}}`,
    ],
    explanationTitle: "Producto entre variable y raíz",
    setupSteps: [
      `\\sqrt{${v}}=${v}^{\\frac{1}{2}}`,
      `${coeff}${v}\\sqrt{${v}}=${coeff}${v}^{1+\\frac{1}{2}}=${coeff}${v}^{\\frac{3}{2}}`,
      `Así el ejercicio queda como una potencia simple de ${v}.`,
    ],
    integrationSteps: [
      `Tomamos \\; n=\\frac{3}{2}`,
      `Entonces \\; n+1=\\frac{5}{2}`,
      `Dividir entre \\frac{5}{2} es multiplicar por \\frac{2}{5}.`,
    ],
    verificationSteps: [
      `Derivar ${correctTex.replace(" + C", "")} devuelve ${coeff}${v}^{\\frac{3}{2}}`,
      `Y eso coincide con ${coeff}${v}\\sqrt{${v}}.`,
    ],
    finalTex: `\\int ${coeff}${v}\\sqrt{${v}}\\,d${v}=${correctTex}`,
    commonMistakeTex: `No aumentar el exponente a \\frac{5}{2} antes de dividir.`,
  }
}

function scenarioReciprocalRoot(): Scenario {
  const v = choice(["x", "t", "m"])
  const a = choice([1, 2, 3, 4, 5])
  const terms = [{ coeff: frac(a), exp: frac(-1, 2) }]
  const correctTex = integratePoly(terms, v)
  return {
    kind: "reciprocalRoot",
    promptTex: `\\int \\frac{${a}}{\\sqrt{${v}}}\\,d${v}`,
    simplifiedTex: `${a}${v}^{-\\frac{1}{2}}`,
    ruleTex: powerRule(v),
    correctTex,
    wrongs: [
      `${ftex(frac(a, 2))}${v}^{\\frac{1}{2}} + C`,
      `${2 * a}\\sqrt{${v}}`,
      `${2 * a}\\sqrt{${v}} + C`,
      `${ftex(frac(2 * a, 3))}${v}^{\\frac{3}{2}} + C`,
    ],
    explanationTitle: "Raíz en el denominador",
    setupSteps: [
      `\\frac{1}{\\sqrt{${v}}}=${v}^{-\\frac{1}{2}}`,
      `El integrando se transforma en ${a}${v}^{-\\frac{1}{2}}`,
      `Ahora sí podemos aplicar la regla de potencia.`,
    ],
    integrationSteps: [
      `Aquí \\; n=-\\frac{1}{2}`,
      `Entonces \\; n+1=\\frac{1}{2}`,
      `Dividir entre \\frac{1}{2} duplica el coeficiente.`,
    ],
    verificationSteps: [
      `La derivada de ${correctTex.replace(" + C", "")} es ${a}${v}^{-\\frac{1}{2}}`,
      `Eso equivale a \\frac{${a}}{\\sqrt{${v}}}.`,
    ],
    finalTex: `\\int \\frac{${a}}{\\sqrt{${v}}}\\,d${v}=${correctTex}`,
    commonMistakeTex: `Olvidar que \\frac{1}{1/2}=2.`,
  }
}

function scenarioPolynomial(): Scenario {
  const v = choice(["x", "t", "z"])
  const a = choice([1, 2, 3, 4])
  const b = choice([1, 2, 3, 4, 5])
  const c = choice([-5, -3, -2, -1, 1, 2, 3, 4])
  const d = choice([-4, -2, 2, 5])
  const terms = [
    { coeff: frac(a), exp: frac(4) },
    { coeff: frac(-b), exp: frac(2) },
    { coeff: frac(c), exp: frac(1) },
    { coeff: frac(d), exp: frac(0) },
  ]
  const simp = polyTex(terms, v)
  const correctTex = integratePoly(terms, v)
  return {
    kind: "polynomial",
    promptTex: `\\int \\left(${simp}\\right)d${v}`,
    simplifiedTex: simp,
    ruleTex: powerRule(v),
    correctTex,
    wrongs: [
      `${ftex(frac(a, 4))}${v}^4 - ${ftex(frac(b, 2))}${v}^2 ${c >= 0 ? "+" : ""} ${c}${v} ${d >= 0 ? "+" : ""} ${d} + C`,
      `${a}${v}^5 - ${b}${v}^3 ${c >= 0 ? "+" : ""} ${c}${v}^2 ${d >= 0 ? "+" : ""} ${d}${v} + C`,
      `${ftex(frac(a, 5))}${v}^5 - ${ftex(frac(b, 2))}${v}^3 ${c >= 0 ? "+" : ""} ${ftex(frac(c, 2))}${v}^2 ${d >= 0 ? "+" : ""} ${d}${v}`,
      `${ftex(frac(a, 5))}${v}^5 - ${ftex(frac(b, 3))}${v}^3 ${c >= 0 ? "+" : ""} ${ftex(frac(c, 2))}${v}^2 ${d >= 0 ? "+" : ""} ${d}${v} + C`,
    ],
    explanationTitle: "Polinomio de varios términos",
    setupSteps: [
      `No necesitamos expandir ni factorizar: ya es una suma de potencias.`,
      `La integral de una suma es la suma de las integrales.`,
      `Cada término se integra por separado.`,
    ],
    integrationSteps: [
      `\\int ${v}^4 d${v}=\\frac{${v}^5}{5}`,
      `\\int ${v}^2 d${v}=\\frac{${v}^3}{3}`,
      `\\int ${v} d${v}=\\frac{${v}^2}{2}, \\quad \\int 1\\,d${v}=${v}`,
    ],
    verificationSteps: [
      `Al derivar la respuesta reaparece ${simp}`,
      `Cada denominador se cancela con el exponente correspondiente.`,
    ],
    finalTex: `\\int \\left(${simp}\\right)d${v}=${correctTex}`,
    commonMistakeTex: `Integrar bien los términos con ${v} pero olvidar el término constante.`,
  }
}

function scenarioProduct(): Scenario {
  const v = choice(["x", "t"])
  const m = choice([1, 2, 3, 4, 5])
  const n = choice([2, 3, 4, 5, 6])
  const terms = [
    { coeff: frac(1), exp: frac(2) },
    { coeff: frac(n - m), exp: frac(1) },
    { coeff: frac(-m * n), exp: frac(0) },
  ]
  const simp = polyTex(terms, v)
  const correctTex = integratePoly(terms, v)
  return {
    kind: "product",
    promptTex: `\\int (${v}-${m})(${v}+${n})\\,d${v}`,
    simplifiedTex: simp,
    ruleTex: powerRule(v),
    correctTex,
    wrongs: [
      `\\frac{${v}^3}{3} ${n - m >= 0 ? "+" : ""} ${n - m}${v}^2 ${-m * n >= 0 ? "+" : ""} ${-m * n}${v} + C`,
      `\\frac{${v}^2}{2} ${n - m >= 0 ? "+" : ""} ${n - m}${v} ${-m * n >= 0 ? "+" : ""} ${-m * n} + C`,
      `\\frac{${v}^3}{3} ${ftex(frac(n - m, 2))}${v}^2 ${-m * n >= 0 ? "+" : ""} ${-m * n} + C`,
      `\\frac{${v}^3}{3} ${ftex(frac(n + m, 2))}${v}^2 + ${m * n}${v} + C`,
    ],
    explanationTitle: "Producto de binomios",
    setupSteps: [
      `Primero expandimos: (${v}-${m})(${v}+${n})`,
      `La expansión correcta es ${simp}`,
      `Solo después conviene integrar término a término.`,
    ],
    integrationSteps: [
      `Integramos ${v}^2, luego el término lineal y luego el término constante.`,
      `Cada exponente aumenta en una unidad.`,
      `El signo del término independiente debe conservarse.`,
    ],
    verificationSteps: [
      `La derivada de la respuesta devuelve ${simp}`,
      `Y ${simp} es la expansión correcta del producto inicial.`,
    ],
    finalTex: `\\int (${v}-${m})(${v}+${n})\\,d${v}=${correctTex}`,
    commonMistakeTex: `Intentar integrar el producto sin expandirlo.`,
  }
}

function scenarioShiftedSquareOverRoot(): Scenario {
  const v = choice(["y", "u"])
  const b = choice([1, 2, 3, 4, 5])
  const terms = [
    { coeff: frac(1), exp: frac(3, 2) },
    { coeff: frac(-2 * b), exp: frac(1, 2) },
    { coeff: frac(b * b), exp: frac(-1, 2) },
  ]
  const simp = polyTex(terms, v)
  const correctTex = integratePoly(terms, v)
  return {
    kind: "shiftedSquareOverRoot",
    promptTex: `\\int \\frac{(${v}-${b})^2}{\\sqrt{${v}}}\\,d${v}`,
    simplifiedTex: simp,
    ruleTex: powerRule(v),
    correctTex,
    wrongs: [
      `\\frac{2}{5}${v}^{\\frac{5}{2}} ${-2 * b >= 0 ? "+" : ""} ${ftex(frac(-4 * b, 3))}${v}^{\\frac{3}{2}} + ${2 * b * b}\\sqrt{${v}} + C`,
      `\\frac{2}{3}${v}^{\\frac{3}{2}} ${-2 * b >= 0 ? "+" : ""} ${-2 * b}${v}^{\\frac{1}{2}} + ${b * b}${v}^{-\\frac{1}{2}} + C`,
      `\\frac{2}{5}${v}^{\\frac{5}{2}} ${-2 * b >= 0 ? "+" : ""} ${ftex(frac(-2 * b, 3))}${v}^{\\frac{3}{2}} + ${b * b}\\sqrt{${v}}`,
      `\\frac{2}{5}${v}^{\\frac{5}{2}} + ${ftex(frac(4 * b, 3))}${v}^{\\frac{3}{2}} + ${2 * b * b}\\sqrt{${v}} + C`,
    ],
    explanationTitle: "Cuadrado entre raíz",
    setupSteps: [
      `(${v}-${b})^2=${v}^2-${2 * b}${v}+${b * b}`,
      `Luego dividimos término a término entre \\sqrt{${v}}=${v}^{1/2}`,
      `Queda ${simp}.`,
    ],
    integrationSteps: [
      `Ahora la expresión es una suma de potencias de ${v}.`,
      `Integramos ${v}^{3/2}, ${v}^{1/2} y ${v}^{-1/2} por separado.`,
      `El término con exponente negativo genera una raíz en la respuesta final.`,
    ],
    verificationSteps: [
      `Derivando la respuesta obtenemos ${simp}`,
      `Eso coincide con la forma simplificada del integrando.`,
    ],
    finalTex: `\\int \\frac{(${v}-${b})^2}{\\sqrt{${v}}}\\,d${v}=${correctTex}`,
    commonMistakeTex: `Dividir mal por la raíz y no restar \\frac{1}{2} al exponente de cada término.`,
  }
}

function scenarioShiftedPower(): Scenario {
  const v = choice(["x", "t"])
  const a = choice([1, 2, 3, 4, 5])
  const n = choice([2, 3, 4, 5, 6])
  const correctTex = `\\frac{(${v}+${a})^{${n + 1}}}{${n + 1}} + C`
  return {
    kind: "shiftedPower",
    promptTex: `\\int (${v}+${a})^{${n}}\\,d${v}`,
    simplifiedTex: `(${v}+${a})^{${n}}`,
    ruleTex: `\\text{Si } q=${v}+${a},\\; dq=d${v}, \\text{ entonces } \\int q^n\\,dq=\\frac{q^{n+1}}{n+1}+C`,
    correctTex,
    wrongs: [
      `(${v}+${a})^{${n + 1}} + C`,
      `\\frac{(${v}+${a})^{${n}}}{${n}} + C`,
      `\\frac{${v}^{${n + 1}}}{${n + 1}} + C`,
      `\\frac{(${v}+${a})^{${n + 1}}}{${n}} + C`,
    ],
    explanationTitle: "Potencia de binomio trasladado",
    setupSteps: [
      `La estructura pide un cambio directo: q=${v}+${a}.`,
      `Como dq=d${v}, no aparece ningún factor extra.`,
      `La integral queda en forma de potencia simple.`,
    ],
    integrationSteps: [
      `Aumentamos el exponente de ${n} a ${n + 1}.`,
      `Dividimos entre el nuevo exponente ${n + 1}.`,
      `Finalmente regresamos a la variable original.`,
    ],
    verificationSteps: [
      `La derivada de ${correctTex.replace(" + C", "")} es (${v}+${a})^{${n}}`,
      `Eso confirma la respuesta.`,
    ],
    finalTex: `\\int (${v}+${a})^{${n}}\\,d${v}=${correctTex}`,
    commonMistakeTex: `Subir el exponente pero dividir entre ${n} en lugar de ${n + 1}.`,
  }
}

function scenarioNestedRadical(): Scenario {
  const v = choice(["x", "t"])
  const terms = [{ coeff: frac(1), exp: frac(7, 8) }]
  const correctTex = integratePoly(terms, v)
  return {
    kind: "nestedRadical",
    promptTex: `\\int \\sqrt{${v}\\sqrt{${v}\\sqrt{${v}}}}\\,d${v}`,
    simplifiedTex: `${v}^{\\frac{7}{8}}`,
    ruleTex: powerRule(v),
    correctTex,
    wrongs: [
      `\\frac{8}{7}${v}^{\\frac{7}{8}} + C`,
      `\\frac{8}{15}${v}^{\\frac{15}{8}}`,
      `\\frac{15}{8}${v}^{\\frac{15}{8}} + C`,
      `\\frac{8}{15}${v}^{\\frac{8}{15}} + C`,
    ],
    explanationTitle: "Radicales anidados",
    setupSteps: [
      `Primero: \\sqrt{${v}}=${v}^{1/2}`,
      `Luego: \\sqrt{${v}\\sqrt{${v}}}=${v}^{3/4}`,
      `Finalmente: \\sqrt{${v}\\cdot ${v}^{3/4}}=${v}^{7/8}`,
    ],
    integrationSteps: [
      `Integramos ${v}^{7/8}.`,
      `El nuevo exponente es 15/8.`,
      `Dividir entre 15/8 equivale a multiplicar por 8/15.`,
    ],
    verificationSteps: [
      `La derivada de ${correctTex.replace(" + C", "")} devuelve ${v}^{7/8}`,
      `Eso coincide con la forma simplificada del radical anidado.`,
    ],
    finalTex: `\\int \\sqrt{${v}\\sqrt{${v}\\sqrt{${v}}}}\\,d${v}=${correctTex}`,
    commonMistakeTex: `Sumar mal exponentes al simplificar los radicales internos.`,
  }
}

function scenarioRationalPolynomial(): Scenario {
  const a = choice([2, 3, 4, 5, 6])
  const b = choice([1, 2, 3, 4, 5])
  const c = choice([-9, -7, -5, 3, 5, 7])
  const terms = [
    { coeff: frac(a), exp: frac(2) },
    { coeff: frac(b), exp: frac(-2) },
    { coeff: frac(c), exp: frac(-3) },
  ]
  const simp = polyTex(terms, "x")
  const correctTex = integratePoly(terms, "x")
  return {
    kind: "rationalPolynomial",
    promptTex: `\\int \\frac{${a}x^5 + ${b}x ${c >= 0 ? "+" : ""} ${c}}{x^3}\\,dx`,
    simplifiedTex: simp,
    ruleTex: powerRule("x"),
    correctTex,
    wrongs: [
      `${ftex(frac(a, 3))}x^3 ${b >= 0 ? "+" : ""} ${b}x^{-1} ${c >= 0 ? "+" : ""} ${c}x^{-2} + C`,
      `${ftex(frac(a, 3))}x^3 - ${b}x^{-1} ${c >= 0 ? "+" : ""} ${ftex(frac(c, -2))}x^{-2} + C`,
      `${ftex(frac(a, 2))}x^2 - ${b}x^{-1} ${c >= 0 ? "+" : ""} ${ftex(frac(c, -2))}x^{-2} + C`,
      `${ftex(frac(a, 3))}x^3 - ${b}x^{-1} ${c >= 0 ? "+" : ""} ${ftex(frac(c, -2))}x^{-2}`,
    ],
    explanationTitle: "Cociente algebraico",
    setupSteps: [
      `Dividimos cada término del numerador entre x^3.`,
      `Así obtenemos ${simp}.`,
      `A partir de allí ya no hay un cociente, sino una suma de potencias.`,
    ],
    integrationSteps: [
      `\\int x^2 dx=\\frac{x^3}{3}`,
      `\\int x^{-2} dx=-x^{-1}`,
      `\\int x^{-3} dx=-\\frac{x^{-2}}{2}`,
    ],
    verificationSteps: [
      `Derivar la respuesta reconstruye ${simp}.`,
      `Eso coincide con la simplificación correcta de la fracción original.`,
    ],
    finalTex: `\\int \\frac{${a}x^5 + ${b}x ${c >= 0 ? "+" : ""} ${c}}{x^3}\\,dx=${correctTex}`,
    commonMistakeTex: `Restar mal exponentes al dividir por x^3.`,
  }
}

function generateScenario(): Scenario {
  return choice([
    scenarioPowerRoot,
    scenarioReciprocalRoot,
    scenarioPolynomial,
    scenarioProduct,
    scenarioShiftedSquareOverRoot,
    scenarioShiftedPower,
    scenarioNestedRadical,
    scenarioRationalPolynomial,
  ])()
}

export default function IntegralesIndefinidasEj01({
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
    const next = generateScenario()
    return { ...next, options: makeOptions(next.correctTex, next.wrongs) }
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
        correctAnswer: scenario.correctTex,
        question: {
          promptTex: scenario.promptTex,
          simplifiedTex: scenario.simplifiedTex,
          kind: scenario.kind,
        },
        explanation: {
          ruleTex: scenario.ruleTex,
          setupSteps: scenario.setupSteps,
          integrationSteps: scenario.integrationSteps,
          verificationSteps: scenario.verificationSteps,
          commonMistakeTex: scenario.commonMistakeTex,
          finalTex: scenario.finalTex,
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
        title="Calcule la integral indefinida"
        prompt="Selecciona la primitiva correcta. El ejercicio varía entre radicales, productos, cocientes, binomios y potencias."
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
                  title: "Analizar la forma del integrando",
                  detail: <span>Antes de integrar, primero identificamos si conviene simplificar raíces, expandir productos o transformar un cociente.</span>,
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={scenario.promptTex} />
                      <MathTex block tex={`\\text{Forma más útil: } ${scenario.simplifiedTex}`} />
                    </div>
                  ),
                },
                {
                  title: "Preparar el ejercicio",
                  detail: <span>En esta etapa dejamos el integrando listo para aplicar una regla estándar.</span>,
                  icon: ListChecks,
                  content: (
                    <div className="space-y-3">
                      {scenario.setupSteps.map((step, index) => (
                        <MathTex key={index} block tex={step} />
                      ))}
                    </div>
                  ),
                },
                {
                  title: "Aplicar la integración",
                  detail: <span>Aumentamos el exponente, dividimos entre el nuevo exponente y cuidamos signos y coeficientes.</span>,
                  icon: FunctionSquare,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={scenario.ruleTex} />
                      {scenario.integrationSteps.map((step, index) => (
                        <MathTex key={index} block tex={step} />
                      ))}
                    </div>
                  ),
                },
                {
                  title: "Verificar y cerrar",
                  detail: <span>La respuesta correcta debe derivarse de vuelta al integrando simplificado y siempre incluir la constante de integración.</span>,
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      {scenario.verificationSteps.map((step, index) => (
                        <MathTex key={index} block tex={step} />
                      ))}
                      <MathTex block tex={`\\text{Error frecuente: } ${scenario.commonMistakeTex}`} />
                      <MathTex block tex={scenario.finalTex} />
                    </div>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta: <MathTex tex={scenario.correctTex} />
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="mb-4 rounded-xl border bg-card p-4">
          <div className="mb-2 text-xs text-muted-foreground">Integral propuesta</div>
          <div className="rounded-lg border bg-background p-3">
            <MathTex block tex={scenario.promptTex} />
          </div>
        </div>

        <div className="mb-3 text-sm text-muted-foreground">
          Marca la antiderivada correcta:
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={(option) => <MathTex tex={option.value} />}
        />

        {engine.status !== "idle" && (
          <div className="mt-4 rounded-xl border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Feedback inmediato
            </div>

            {selected === scenario.correctTex ? (
              <div className="space-y-2 text-sm">
                <p>Correcto. Identificaste bien la estructura y aplicaste la integración adecuada.</p>
                <MathTex block tex={`\\text{Forma útil: } ${scenario.simplifiedTex}`} />
                <MathTex block tex={scenario.correctTex} />
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p>No. En esta clase de ejercicios casi siempre conviene transformar primero el integrando.</p>
                <MathTex block tex={`\\text{Forma útil: } ${scenario.simplifiedTex}`} />
                <MathTex block tex={`\\text{Error frecuente: } ${scenario.commonMistakeTex}`} />
                <MathTex block tex={scenario.correctTex} />
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
