"use client"

import { useMemo, useState } from "react"
import { MathTex } from "@/components/exercises/base/MathBlock"

type Scenario = {
  type: "power" | "product" | "sqrt" | "division"
  question: string
  correct: string
  steps: string[]
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateScenario(): Scenario {
  const type = ["power", "product", "sqrt", "division"][
    randInt(0, 3)
  ] as Scenario["type"]

  // 1️⃣ POTENCIAS
  if (type === "power") {
    const n = randInt(2, 5)

    return {
      type,
      question: `\\int x^{${n}} dx`,
      correct: `\\frac{x^{${n + 1}}}{${n + 1}} + C`,
      steps: [
        "Usamos la regla: ∫xⁿ dx = xⁿ⁺¹ / (n+1)",
        `n = ${n}`,
        `Resultado: x^{${n + 1}} / ${n + 1}`
      ]
    }
  }

  // 2️⃣ PRODUCTO
  if (type === "product") {
    const a = randInt(1, 5)
    const b = randInt(1, 5)

    return {
      type,
      question: `\\int (x+${a})(x+${b}) dx`,
      correct: `\\frac{x^3}{3} + \\frac{${a + b}}{2}x^2 + ${a * b}x + C`,
      steps: [
        "Expandimos: (x+a)(x+b)",
        `x² + ${(a + b)}x + ${a * b}`,
        "Integramos término a término"
      ]
    }
  }

  // 3️⃣ RAÍCES
  if (type === "sqrt") {
    const n = randInt(1, 4)

    return {
      type,
      question: `\\int x^{1/${n}} dx`,
      correct: `\\frac{x^{${1 + 1 / n}}}{${1 + 1 / n}} + C`,
      steps: [
        "Convertimos raíz a potencia",
        `x^(1/${n})`,
        "Aplicamos regla de potencias"
      ]
    }
  }

  // 4️⃣ DIVISIÓN
  const n = randInt(2, 5)

  return {
    type: "division",
    question: `\\int \\frac{x^{${n}}}{x} dx`,
    correct: `\\frac{x^{${n}}}{${n}} + C`,
    steps: [
      "Simplificamos: x^n / x = x^(n-1)",
      `n = ${n}`,
      "Aplicamos regla de potencia"
    ]
  }
}

function generateOptions(correct: string) {
  return [
    correct,
    correct.replace("+ C", ""),
    correct.replace("x", "x^2"),
    correct.replace("1", "2"),
    "\\ln x + C"
  ].sort(() => Math.random() - 0.5)
}

export default function IntegralesGame() {
  const [selected, setSelected] = useState<string | null>(null)
  const [showSolution, setShowSolution] = useState(false)
  const [nonce, setNonce] = useState(0)

  const scenario = useMemo(() => generateScenario(), [nonce])
  const options = useMemo(
    () => generateOptions(scenario.correct),
    [scenario]
  )

  function selectOption(op: string) {
    setSelected(op)
    setShowSolution(true)
  }

  function next() {
    setSelected(null)
    setShowSolution(false)
    setNonce(n => n + 1)
  }

  return (
    <div className="p-6 bg-white rounded-xl border space-y-4">
      <h2 className="text-lg font-semibold">
        Calcula la integral:
      </h2>

      <MathTex block tex={scenario.question} />

      <div className="grid grid-cols-2 gap-3">
        {options.map((op, i) => (
          <button
            key={i}
            onClick={() => selectOption(op)}
            className={`p-3 border rounded-lg ${
              selected === op
                ? op === scenario.correct
                  ? "bg-green-100"
                  : "bg-red-100"
                : "bg-gray-50"
            }`}
          >
            <MathTex tex={op} />
          </button>
        ))}
      </div>

      {showSolution && (
        <div className="p-4 border rounded-lg bg-gray-50">
          <h3 className="font-semibold mb-2">
            🧠 Explicación paso a paso
          </h3>

          {scenario.steps.map((step, i) => (
            <p key={i}>• {step}</p>
          ))}

          <div className="mt-2 font-bold">
            Respuesta: <MathTex tex={scenario.correct} />
          </div>
        </div>
      )}

      <button
        onClick={next}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg"
      >
        Siguiente
      </button>
    </div>
  )
}