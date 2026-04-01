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
  tangentTex: string
  pointTex: string
  slopeTex: string
  correct: string
  wrongs: string[]
  explanationTitle: string
  readingTex: string
  integrationSteps: string[]
  tangencySteps: string[]
  verificationSteps: string[]
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

function signedTerm(n: number) {
  if (n > 0) return `+${n}`
  if (n < 0) return `${n}`
  return ""
}

function signedRounded(n: number) {
  const rounded = Number(n.toFixed(2))
  if (rounded > 0) return `+${rounded}`
  if (rounded < 0) return `${rounded}`
  return ""
}

function lineLatex(m: number, b: number) {
  return `y=${m}x${b >= 0 ? "+" : ""}${b}`
}

function makeOptions(correct: string, wrongs: string[]): Option[] {
  return shuffle(Array.from(new Set([correct, ...wrongs])).slice(0, 5)).map((value) => ({
    value,
    correct: value === correct,
  }))
}

function scenarioInverseCube(): Scenario {
  const a = choice([2, 4, 6, 8])
  const x0 = choice([1, 2])
  const m = choice([-3, -2, -1, 1, 2, 3])
  const y0 = choice([2, 3, 4, 5, 6])
  const c1 = m + a / (2 * x0 * x0)
  const c2 = y0 - a / (2 * x0) - c1 * x0
  const b = y0 - m * x0
  const correct = `y=\\frac{${a / 2}}{x}${c1 >= 0 ? "+" : ""}${c1}x${signedTerm(c2)}`

  return {
    kind: "inverseCube",
    title: "Halle la ecuacion de la curva",
    promptTex: `y''=\\frac{${a}}{x^3}`,
    tangentTex: lineLatex(m, b),
    pointTex: `(${x0};${y0})`,
    slopeTex: `${m}`,
    correct,
    wrongs: [
      `y=-\\frac{${a / 2}}{x}${c1 >= 0 ? "+" : ""}${c1}x${signedTerm(c2)}`,
      `y=\\frac{${a}}{x}${c1 >= 0 ? "+" : ""}${c1}x${signedTerm(c2)}`,
      `y=\\frac{${a / 2}}{x^2}${c1 >= 0 ? "+" : ""}${c1}x${signedTerm(c2)}`,
      `y=\\frac{${a / 2}}{x}${c1 >= 0 ? "+" : ""}${c1 + 1}x${signedTerm(c2)}`,
    ],
    explanationTitle: "Curva racional con tangencia",
    readingTex:
      "La segunda derivada tiene forma de potencia negativa. Eso obliga a integrar dos veces y luego usar que la recta tangente aporta pendiente y punto de contacto.",
    integrationSteps: [
      `y''=${a}x^{-3}`,
      `y'=\\int ${a}x^{-3}\\,dx=-\\frac{${a}}{2}x^{-2}+C_1`,
      `y'= -\\frac{${a / 2}}{x^2}+C_1`,
      `y=\\int \\left(-\\frac{${a / 2}}{x^2}+C_1\\right)dx=\\frac{${a / 2}}{x}+C_1x+C_2`,
    ],
    tangencySteps: [
      `\\text{Tangencia en } (${x0};${y0}) \\text{ con la recta } ${lineLatex(m, b)} \\text{ significa:}`,
      `y'(${x0})=${m}`,
      `y(${x0})=${y0}`,
      `-\\frac{${a / 2}}{(${x0})^2}+C_1=${m} \\Rightarrow C_1=${c1}`,
      `\\frac{${a / 2}}{${x0}}+(${c1})(${x0})+C_2=${y0} \\Rightarrow C_2=${c2}`,
    ],
    verificationSteps: [
      `y''=\\frac{${a}}{x^3}`,
      `y'(${x0})=${m}`,
      `y(${x0})=${y0}`,
    ],
    finalTex: correct,
    feedbackCorrectTex:
      `\\text{Correcto: en un problema de tangencia no basta usar la pendiente; tambien hay que imponer el punto.}`,
    feedbackWrongTex:
      `\\text{Error tipico: integrar bien pero usar solo } y'(${x0})=m \\text{ y olvidar } y(${x0})=${y0}.`,
    warningTex:
      "En las potencias negativas suelen fallarse dos cosas: el signo al integrar y la segunda condicion de tangencia.",
  }
}

function scenarioConstantSecondDerivative(): Scenario {
  const k = choice([2, 3, 4, 5, 6])
  const x0 = choice([0, 1, 2, 3])
  const m = choice([-2, -1, 1, 2, 3, 4])
  const y0 = choice([1, 3, 4, 6, 7])
  const c1 = m - k * x0
  const c2 = y0 - (k / 2) * x0 * x0 - c1 * x0
  const b = y0 - m * x0
  const correct = `y=${k / 2}x^2${c1 >= 0 ? "+" : ""}${c1}x${signedTerm(c2)}`

  return {
    kind: "constantSecondDerivative",
    title: "Halle la ecuacion de la curva",
    promptTex: `y''=${k}`,
    tangentTex: lineLatex(m, b),
    pointTex: `(${x0};${y0})`,
    slopeTex: `${m}`,
    correct,
    wrongs: [
      `y=${k}x^2${c1 >= 0 ? "+" : ""}${c1}x${signedTerm(c2)}`,
      `y=${k / 2}x^2${c1 >= 0 ? "+" : ""}${c1 + 1}x${signedTerm(c2)}`,
      `y=${k / 2}x^2${c1 >= 0 ? "+" : ""}${c1}x`,
      `y=${k}x${c1 >= 0 ? "+" : ""}${c1}${signedTerm(c2)}`,
    ],
    explanationTitle: "Segunda derivada constante",
    readingTex:
      "Si y'' es constante, la curva final debe ser cuadratica. Luego la tangencia fija de manera exacta los terminos lineal y constante.",
    integrationSteps: [
      `y''=${k}`,
      `y'=\\int ${k}\\,dx=${k}x+C_1`,
      `y=\\int (${k}x+C_1)dx=${k / 2}x^2+C_1x+C_2`,
    ],
    tangencySteps: [
      `\\text{La recta tangente es } ${lineLatex(m, b)} \\text{ y su pendiente es } ${m}`,
      `y'(${x0})=${m} \\Rightarrow ${k}(${x0})+C_1=${m}`,
      `C_1=${c1}`,
      `y(${x0})=${y0} \\Rightarrow ${k / 2}(${x0})^2+(${c1})(${x0})+C_2=${y0}`,
      `C_2=${c2}`,
    ],
    verificationSteps: [
      `y''=${k}`,
      `y'(${x0})=${m}`,
      `y(${x0})=${y0}`,
    ],
    finalTex: correct,
    feedbackCorrectTex:
      `\\text{Bien: detectaste que la familia de soluciones es cuadratica y luego ajustaste } C_1 \\text{ y } C_2.`,
    feedbackWrongTex:
      `\\text{Error tipico: escribir bien la familia cuadratica pero no aplicar las dos condiciones de tangencia.}`,
    warningTex:
      "Cuando y'' es constante, el error frecuente es olvidar dividir entre 2 al integrar el termino lineal.",
  }
}

function scenarioInverseSquare(): Scenario {
  const a = choice([1, 2, 3, 4, 5])
  const x0 = choice([1, 2])
  const m = choice([-2, -1, 1, 2, 3])
  const y0 = choice([2, 3, 5, 6])
  const c1 = m + a / x0
  const c2 = y0 + a * Math.log(x0) - c1 * x0
  const b = y0 - m * x0
  const c2Tex = signedRounded(c2)
  const correct = `y=-${a}\\ln(x)${c1 >= 0 ? "+" : ""}${c1}x${c2Tex}`

  return {
    kind: "inverseSquare",
    title: "Halle la ecuacion de la curva",
    promptTex: `y''=\\frac{${a}}{x^2},\\quad x>0`,
    tangentTex: lineLatex(m, b),
    pointTex: `(${x0};${y0})`,
    slopeTex: `${m}`,
    correct,
    wrongs: [
      `y=${a}\\ln(x)${c1 >= 0 ? "+" : ""}${c1}x${c2Tex}`,
      `y=-${a}\\ln(x)${c1 >= 0 ? "+" : ""}${c1 + 1}x${c2Tex}`,
      `y=-\\frac{${a}}{x}${c1 >= 0 ? "+" : ""}${c1}x${c2Tex}`,
      `y=-${a}\\ln(x)${c1 >= 0 ? "+" : ""}${c1}x`,
    ],
    explanationTitle: "Caso logaritmico por integracion",
    readingTex:
      "Aqui aparece una potencia negativa en y'', pero despues de integrar una vez obtenemos un termino 1/x, cuya siguiente integral ya es logaritmica.",
    integrationSteps: [
      `y''=${a}x^{-2}`,
      `y'=\\int ${a}x^{-2}\\,dx=-${a}x^{-1}+C_1=-\\frac{${a}}{x}+C_1`,
      `y=\\int \\left(-\\frac{${a}}{x}+C_1\\right)dx=-${a}\\ln(x)+C_1x+C_2`,
    ],
    tangencySteps: [
      `\\text{La recta tangente tiene pendiente } ${m}`,
      `y'(${x0})=${m} \\Rightarrow -\\frac{${a}}{${x0}}+C_1=${m}`,
      `C_1=${c1}`,
      `y(${x0})=${y0} \\Rightarrow -${a}\\ln(${x0})+(${c1})(${x0})+C_2=${y0}`,
      `C_2\\approx ${Number(c2.toFixed(2))}`,
    ],
    verificationSteps: [
      `y''=\\frac{${a}}{x^2}`,
      `y'(${x0})=${m}`,
      `y(${x0})=${y0}`,
    ],
    finalTex: correct,
    feedbackCorrectTex:
      `\\text{Correcto: viste el salto de potencia negativa a logaritmo y luego aplicaste toda la tangencia.}`,
    feedbackWrongTex:
      `\\text{Error tipico: dejar } -\\frac{a}{x} \\text{ como si ya fuera y, cuando aun falta integrar una vez mas.}`,
    warningTex:
      "El logaritmo aparece solo en la segunda integracion, no en la primera.",
  }
}

function scenarioExponentialCurve(): Scenario {
  const a = choice([1, 2, 3, 4])
  const x0 = choice([0, 1])
  const m = choice([2, 3, 4, 5, 6])
  const y0 = choice([1, 2, 4, 5, 7])
  const expAtPoint = x0 === 0 ? 1 : Math.E
  const c1 = m - a * expAtPoint
  const c2 = y0 - a * expAtPoint - c1 * x0
  const b = y0 - m * x0
  const c1Tex = Number(c1.toFixed(2))
  const c2Tex = signedRounded(c2)
  const correct = `y=${a}e^x${c1Tex >= 0 ? "+" : ""}${c1Tex}x${c2Tex}`

  return {
    kind: "exponentialCurve",
    title: "Halle la ecuacion de la curva",
    promptTex: `y''=${a}e^x`,
    tangentTex: lineLatex(m, b),
    pointTex: `(${x0};${y0})`,
    slopeTex: `${m}`,
    correct,
    wrongs: [
      `y=${a}e^x${c1Tex >= 0 ? "+" : ""}${c1Tex}x`,
      `y=${a}e^{2x}${c1Tex >= 0 ? "+" : ""}${c1Tex}x${c2Tex}`,
      `y=${a}e^x${c1Tex >= 0 ? "+" : ""}${Number((c1 + 1).toFixed(2))}x${c2Tex}`,
      `y=${a}e^x${c2Tex}`,
    ],
    explanationTitle: "Curva exponencial con tangencia",
    readingTex:
      "La ventaja de e^x es que se conserva al integrar. Eso simplifica la parte estructural y deja la tangencia como la clave para fijar los terminos restantes.",
    integrationSteps: [
      `y''=${a}e^x`,
      `y'=\\int ${a}e^x\\,dx=${a}e^x+C_1`,
      `y=\\int (${a}e^x+C_1)dx=${a}e^x+C_1x+C_2`,
    ],
    tangencySteps: [
      `y'(${x0})=${m} \\Rightarrow ${a}e^{${x0}}+C_1=${m}`,
      `C_1\\approx ${c1Tex}`,
      `y(${x0})=${y0} \\Rightarrow ${a}e^{${x0}}+(${c1Tex})(${x0})+C_2=${y0}`,
      `C_2\\approx ${Number(c2.toFixed(2))}`,
    ],
    verificationSteps: [
      `y''=${a}e^x`,
      `y'(${x0})=${m}`,
      `y(${x0})=${y0}`,
    ],
    finalTex: correct,
    feedbackCorrectTex:
      `\\text{Bien: en la parte exponencial la forma se conserva; el verdadero ajuste estaba en } C_1 \\text{ y } C_2.`,
    feedbackWrongTex:
      `\\text{Error tipico: confundir } ${a}e^x \\text{ con } ${a}e^{2x} \\text{ o perder uno de los terminos lineales.}`,
    warningTex:
      "En problemas exponenciales, casi siempre el fallo no esta en integrar e^x sino en usar mal la tangencia.",
  }
}

function scenarioTrigCurve(): Scenario {
  const a = choice([2, 3, 4])
  const x0 = choice([0, Math.PI / 2] as const)
  const m = choice([-2, -1, 1, 2, 3])
  const y0 = choice([1, 2, 4, 5])
  const c1 = x0 === 0 ? m + a : m
  const c2 = x0 === 0 ? y0 : Number((y0 + a).toFixed(2)) - c1 * (Math.PI / 2)
  const b = Number((y0 - m * x0).toFixed(2))
  const x0Tex = x0 === 0 ? "0" : "\\frac{\\pi}{2}"
  const cosAt = x0 === 0 ? "1" : "0"
  const sinAt = x0 === 0 ? "0" : "1"
  const c2Tex = signedRounded(c2)
  const correct = `y=-${a}\\sin x${c1 >= 0 ? "+" : ""}${Number(c1.toFixed(2))}x${c2Tex}`

  return {
    kind: "trigCurve",
    title: "Halle la ecuacion de la curva",
    promptTex: `y''=${a}\\sin x`,
    tangentTex: lineLatex(m, b),
    pointTex: `(${x0Tex};${y0})`,
    slopeTex: `${m}`,
    correct,
    wrongs: [
      `y=${a}\\sin x${c1 >= 0 ? "+" : ""}${Number(c1.toFixed(2))}x${c2Tex}`,
      `y=-${a}\\cos x${c1 >= 0 ? "+" : ""}${Number(c1.toFixed(2))}x${c2Tex}`,
      `y=-${a}\\sin x${c1 >= 0 ? "+" : ""}${Number((c1 + 1).toFixed(2))}x${c2Tex}`,
      `y=-${a}\\sin x${c1 >= 0 ? "+" : ""}${Number(c1.toFixed(2))}x`,
    ],
    explanationTitle: "Curva trigonometrica y signos",
    readingTex:
      "Con seno y coseno el punto delicado es el signo. La tangencia ayuda a detectar rapido si los terminos constantes quedaron bien fijados.",
    integrationSteps: [
      `y''=${a}\\sin x`,
      `y'=\\int ${a}\\sin x\\,dx=-${a}\\cos x+C_1`,
      `y=\\int (-${a}\\cos x+C_1)dx=-${a}\\sin x+C_1x+C_2`,
    ],
    tangencySteps: [
      `y'(${x0Tex})=${m} \\Rightarrow -${a}\\cos(${x0Tex})+C_1=${m}`,
      `-${a}\\cdot ${cosAt}+C_1=${m} \\Rightarrow C_1=${Number(c1.toFixed(2))}`,
      `y(${x0Tex})=${y0} \\Rightarrow -${a}\\sin(${x0Tex})+(${Number(c1.toFixed(2))})(${x0Tex})+C_2=${y0}`,
      `-${a}\\cdot ${sinAt}+(${Number(c1.toFixed(2))})(${x0Tex})+C_2=${y0}`,
      `C_2\\approx ${Number(c2.toFixed(2))}`,
    ],
    verificationSteps: [
      `y''=${a}\\sin x`,
      `y'(${x0Tex})=${m}`,
      `y(${x0Tex})=${y0}`,
    ],
    finalTex: correct,
    feedbackCorrectTex:
      `\\text{Correcto: aqui era clave conservar el signo negativo al integrar } \\sin x.`,
    feedbackWrongTex:
      `\\text{Error tipico: cambiar } -${a}\\sin x \\text{ por } ${a}\\sin x \\text{ o perder una condicion de tangencia.}`,
    warningTex:
      "En trigonometria, un signo mal puesto suele arruinar toda la verificacion.",
  }
}

function scenarioLinearFirstDerivative(): Scenario {
  const a = choice([1, 2, 3, 4])
  const d = choice([-3, -1, 1, 2])
  const x0 = choice([1, 2, 3])
  const m = choice([-2, -1, 1, 2, 3])
  const y0 = choice([2, 4, 5, 7])
  const c1 = m - (a * x0 * x0 + d)
  const c2 = y0 - (a * x0 ** 3) / 3 - d * x0 - c1 * x0
  const b = y0 - m * x0
  const correct = `y=\\frac{${a}}{3}x^3${d >= 0 ? "+" : ""}${d}x${c1 >= 0 ? "+" : ""}${c1}x${signedTerm(
    c2
  )}`.replace(`${d >= 0 ? "+" : ""}${d}x${c1 >= 0 ? "+" : ""}${c1}x`, `${d + c1 >= 0 ? "+" : ""}${d + c1}x`)

  return {
    kind: "linearFirstDerivative",
    title: "Halle la ecuacion de la curva",
    promptTex: `y''=${a}x+${d}`,
    tangentTex: lineLatex(m, b),
    pointTex: `(${x0};${y0})`,
    slopeTex: `${m}`,
    correct,
    wrongs: [
      `y=\\frac{${a}}{2}x^3${d + c1 >= 0 ? "+" : ""}${d + c1}x${signedTerm(c2)}`,
      `y=\\frac{${a}}{3}x^3${d + c1 + 1 >= 0 ? "+" : ""}${d + c1 + 1}x${signedTerm(c2)}`,
      `y=\\frac{${a}}{3}x^3${d + c1 >= 0 ? "+" : ""}${d + c1}x`,
      `y=${a}x^2${d + c1 >= 0 ? "+" : ""}${d + c1}x${signedTerm(c2)}`,
    ],
    explanationTitle: "Segunda derivada lineal",
    readingTex:
      "Si y'' es lineal, al integrar dos veces la curva final debe ser cubica. La tangencia se usa despues, no antes.",
    integrationSteps: [
      `y''=${a}x+${d}`,
      `y'=\\int (${a}x+${d})dx=\\frac{${a}}{2}x^2+${d}x+C_1`,
      `y=\\int \\left(\\frac{${a}}{2}x^2+${d}x+C_1\\right)dx=\\frac{${a}}{6}x^3+\\frac{${d}}{2}x^2+C_1x+C_2`,
      `\\text{En esta familia la forma general es cubica.}`,
    ],
    tangencySteps: [
      `y'(${x0})=${m} \\Rightarrow \\frac{${a}}{2}(${x0})^2+${d}(${x0})+C_1=${m}`,
      `C_1=${c1}`,
      `y(${x0})=${y0} \\Rightarrow \\frac{${a}}{6}(${x0})^3+\\frac{${d}}{2}(${x0})^2+(${c1})(${x0})+C_2=${y0}`,
      `C_2=${c2}`,
      `\\text{Sustituyendo y simplificando se obtiene la expresion final.}`,
    ],
    verificationSteps: [
      `y''=${a}x+${d}`,
      `y'(${x0})=${m}`,
      `y(${x0})=${y0}`,
    ],
    finalTex: correct,
    feedbackCorrectTex:
      `\\text{Bien: reconociste que una segunda derivada lineal genera una curva cubica.}`,
    feedbackWrongTex:
      `\\text{Error tipico: integrar mal los coeficientes y perder los factores } \\frac{1}{2} \\text{ o } \\frac{1}{6}.`,
    warningTex:
      "Cuando integras dos veces una expresion lineal, revisa con cuidado los divisores nuevos en cada paso.",
  }
}

function scenarioCosineCurve(): Scenario {
  const a = choice([1, 2, 3])
  const x0 = choice([0, Math.PI] as const)
  const m = choice([-2, -1, 1, 2])
  const y0 = choice([1, 3, 4, 6])
  const x0Tex = x0 === 0 ? "0" : "\\pi"
  const sinAt = x0 === 0 ? 0 : 0
  const cosAt = x0 === 0 ? 1 : -1
  const c1 = m - a * sinAt
  const c2 = y0 + a * cosAt - c1 * x0
  const b = Number((y0 - m * x0).toFixed(2))
  const correct = `y=-${a}\\cos x${c1 >= 0 ? "+" : ""}${Number(c1.toFixed(2))}x${signedRounded(c2)}`

  return {
    kind: "cosineCurve",
    title: "Halle la ecuacion de la curva",
    promptTex: `y''=${a}\\cos x`,
    tangentTex: lineLatex(m, b),
    pointTex: `(${x0Tex};${y0})`,
    slopeTex: `${m}`,
    correct,
    wrongs: [
      `y=${a}\\cos x${c1 >= 0 ? "+" : ""}${Number(c1.toFixed(2))}x${signedRounded(c2)}`,
      `y=${a}\\sin x${c1 >= 0 ? "+" : ""}${Number(c1.toFixed(2))}x${signedRounded(c2)}`,
      `y=-${a}\\cos x${c1 >= 0 ? "+" : ""}${Number((c1 + 1).toFixed(2))}x${signedRounded(c2)}`,
      `y=-${a}\\cos x${c1 >= 0 ? "+" : ""}${Number(c1.toFixed(2))}x`,
    ],
    explanationTitle: "Curva con segunda derivada coseno",
    readingTex:
      "Esta familia mezcla trigonometria con tangencia. El punto mas delicado es no confundir la cadena coseno -> seno -> menos coseno al integrar dos veces.",
    integrationSteps: [
      `y''=${a}\\cos x`,
      `y'=\\int ${a}\\cos x\\,dx=${a}\\sin x+C_1`,
      `y=\\int (${a}\\sin x+C_1)dx=-${a}\\cos x+C_1x+C_2`,
    ],
    tangencySteps: [
      `y'(${x0Tex})=${m} \\Rightarrow ${a}\\sin(${x0Tex})+C_1=${m}`,
      `${a}\\cdot ${sinAt}+C_1=${m} \\Rightarrow C_1=${Number(c1.toFixed(2))}`,
      `y(${x0Tex})=${y0} \\Rightarrow -${a}\\cos(${x0Tex})+(${Number(c1.toFixed(2))})(${x0Tex})+C_2=${y0}`,
      `-${a}\\cdot (${cosAt})+(${Number(c1.toFixed(2))})(${x0Tex})+C_2=${y0}`,
      `C_2\\approx ${Number(c2.toFixed(2))}`,
    ],
    verificationSteps: [
      `y''=${a}\\cos x`,
      `y'(${x0Tex})=${m}`,
      `y(${x0Tex})=${y0}`,
    ],
    finalTex: correct,
    feedbackCorrectTex:
      `\\text{Correcto: respetaste bien la cadena de integracion trigonometrica y luego usaste la tangencia completa.}`,
    feedbackWrongTex:
      `\\text{Error tipico: cambiar el orden seno-coseno o perder el signo de } -${a}\\cos x.`,
    warningTex:
      "Si al final tu funcion no vuelve a producir y'' al derivar dos veces, la cadena trigonometrica quedo mal armada.",
  }
}

function generateScenario(): Scenario {
  return choice([
    scenarioInverseCube,
    scenarioConstantSecondDerivative,
    scenarioInverseSquare,
    scenarioExponentialCurve,
    scenarioTrigCurve,
    scenarioLinearFirstDerivative,
    scenarioCosineCurve,
  ])()
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
          tangentTex: scenario.tangentTex,
          pointTex: scenario.pointTex,
          kind: scenario.kind,
        },
        explanation: {
          readingTex: scenario.readingTex,
          integrationSteps: scenario.integrationSteps,
          tangencySteps: scenario.tangencySteps,
          verificationSteps: scenario.verificationSteps,
          warningTex: scenario.warningTex,
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
        title={scenario.title}
        prompt="Integra dos veces y usa la tangencia completa: misma pendiente y mismo punto. El ejercicio cambia entre familias racionales, cuadraticas, cubicas, logaritmicas, exponenciales y trigonometricas."
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
                  title: "1. Leer bien la tangencia",
                  detail: (
                    <span>
                      Antes de calcular, hay que traducir el enunciado: tangencia significa misma
                      pendiente y mismo punto de contacto.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-2">
                      <MathTex block tex={scenario.promptTex} />
                      <MathTex block tex={`\\text{Recta tangente: } ${scenario.tangentTex}`} />
                      <MathTex block tex={`\\text{Punto de tangencia: } ${scenario.pointTex}`} />
                      <MathTex block tex={`\\text{Pendiente de la recta: } ${scenario.slopeTex}`} />
                      <div className="text-sm text-muted-foreground">{scenario.readingTex}</div>
                    </div>
                  ),
                },
                {
                  title: "2. Integrar dos veces",
                  detail: (
                    <span>
                      Primero se recupera la forma general de la curva. Recién después conviene usar
                      las condiciones de tangencia.
                    </span>
                  ),
                  icon: FunctionSquare,
                  content: (
                    <div className="space-y-2">
                      {scenario.integrationSteps.map((step, index) => (
                        <MathTex key={index} block tex={step} />
                      ))}
                    </div>
                  ),
                },
                {
                  title: "3. Hallar las constantes",
                  detail: (
                    <span>
                      La recta tangente aporta una ecuación para la pendiente y el punto de
                      tangencia aporta otra para la posición.
                    </span>
                  ),
                  icon: ListChecks,
                  content: (
                    <div className="space-y-2">
                      {scenario.tangencySteps.map((step, index) => (
                        <MathTex key={index} block tex={step} />
                      ))}
                    </div>
                  ),
                },
                {
                  title: "4. Verificar y concluir",
                  detail: (
                    <span>
                      La respuesta final debe pasar las tres comprobaciones: segunda derivada
                      correcta, pendiente correcta y punto correcto.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-2">
                      {scenario.verificationSteps.map((step, index) => (
                        <MathTex key={index} block tex={step} />
                      ))}
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
          <div className="space-y-2 rounded-md border bg-background p-3">
            <MathTex block tex={scenario.promptTex} />
            <MathTex
              block
              tex={`\\text{Tangente a la recta } ${scenario.tangentTex} \\text{ en el punto } ${scenario.pointTex}`}
            />
          </div>
        </div>

        <div className="mb-2 text-sm text-muted-foreground">
          Marca la ecuacion correcta de la curva:
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
          <div className="mt-3 rounded-lg border bg-card p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Feedback inmediato
            </div>

            {selected === scenario.correct ? (
              <div className="space-y-2 text-sm">
                <p>
                  Correcto. La curva elegida satisface la segunda derivada y además cumple las dos
                  condiciones de tangencia.
                </p>
                <MathTex block tex={scenario.feedbackCorrectTex} />
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p>
                  No. Revisa si integraste dos veces con cuidado y si usaste tanto la pendiente
                  como el punto de contacto.
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
