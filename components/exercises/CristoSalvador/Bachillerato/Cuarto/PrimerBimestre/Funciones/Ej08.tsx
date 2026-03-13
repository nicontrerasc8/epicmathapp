"use client"

import { useMemo, useState } from "react"
import { ShieldCheck, Sigma, Divide } from "lucide-react"

import { useExerciseEngine } from "@/lib/exercises/useExerciseEngine"
import { useExerciseSubmission } from "@/lib/exercises/useExerciseSubmission"
import { useExerciseTimer } from "@/lib/exercises/useExerciseTimer"
import { computeTrophyGain, WRONG_PENALTY } from "@/lib/exercises/gamification"

import { type Option, OptionsGrid } from "@/components/exercises/base/OptionsGrid"
import { MathProvider, MathTex } from "@/components/exercises/base/MathBlock"
import { ExerciseHud } from "@/components/exercises/base/ExerciseHud"
import { SolutionBox } from "@/components/exercises/base/SolutionBox"
import { ExerciseShell } from "@/components/exercises/base/ExerciseShell"
import { DetailedExplanation } from "@/components/exercises/base/DetailedExplanation"

/* =========================
   HELPERS
========================= */

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

/* =========================
   GENERADOR
   Forma de la recta
========================= */

type Scenario = ReturnType<typeof generateScenario>

type FormName =
  | "General"
  | "Pendiente–intersección"
  | "Punto–pendiente"
  | "Segmentaria"
  | "Vectorial"

type FormScenario = {
  exprTex: string
  correct: FormName
  recognitionText: string
  elementsText: string
  ruleText: string
}

function generateScenario() {
  const m = randInt(-5, 5) || 2
  const x0 = randInt(-5, 5)
  const y0 = randInt(-5, 5)
  const b = randInt(-6, 6)
  const A = randInt(-6, 6) || 3
  const B = randInt(-6, 6) || -2
  const C = randInt(-10, 10)
  const a = randInt(-9, 9) || 3
  const c = randInt(-9, 9) || -4
  const v1 = randInt(-6, 6) || 2
  const v2 = randInt(-6, 6) || -3

  const forms: FormScenario[] = [
    {
      exprTex: `y ${y0 >= 0 ? "-" : "+"} ${Math.abs(y0)} = ${m}(x ${
        x0 >= 0 ? "-" : "+"
      } ${Math.abs(x0)})`,
      correct: "Punto–pendiente",
      recognitionText: "Tiene el patrón y - y_0 = m(x - x_0).",
      elementsText:
        "m representa la pendiente y (x_0, y_0) un punto de la recta.",
      ruleText: "La forma punto–pendiente es: y - y₀ = m(x - x₀).",
    },
    {
      exprTex: `y = ${m}x ${b >= 0 ? "+" : "-"} ${Math.abs(b)}`,
      correct: "Pendiente–intersección",
      recognitionText: "Se ajusta al modelo y = mx + b.",
      elementsText:
        "m es la pendiente y b es la intersección con el eje y.",
      ruleText:
        "La forma pendiente–intersección es: y = mx + b.",
    },
    {
      exprTex: `${A}x ${B >= 0 ? "+" : "-"} ${Math.abs(B)}y ${
        C >= 0 ? "+" : "-"
      } ${Math.abs(C)} = 0`,
      correct: "General",
      recognitionText: "Coincide con la estructura Ax + By + C = 0.",
      elementsText:
        "A, B y C son constantes reales, con A y B no ambos nulos.",
      ruleText: "La forma general es: Ax + By + C = 0.",
    },
    {
      exprTex: `\\frac{x}{${a}} + \\frac{y}{${c}} = 1`,
      correct: "Segmentaria",
      recognitionText: "Está escrita como suma de interceptos igual a 1.",
      elementsText:
        "Los denominadores son los interceptos en los ejes x e y.",
      ruleText: "La forma segmentaria es: x/a + y/b = 1.",
    },
    {
      exprTex: `\\begin{pmatrix}x\\\\y\\end{pmatrix} = \\begin{pmatrix}${x0}\\\\${y0}\\end{pmatrix} + t\\begin{pmatrix}${v1}\\\\${v2}\\end{pmatrix}`,
      correct: "Vectorial",
      recognitionText:
        "Aparece un punto base más un parámetro multiplicando un vector dirección.",
      elementsText:
        "El vector dirección marca la orientación y t es un parámetro real.",
      ruleText:
        "La forma vectorial es: r⃗ = r⃗₀ + t·v⃗.",
    },
  ]

  return forms[randInt(0, forms.length - 1)]
}

function generateOptions(correct: FormName): Option[] {
  const all: Option[] = [
    { value: "General", correct: correct === "General" },
    {
      value: "Pendiente–intersección",
      correct: correct === "Pendiente–intersección",
    },
    {
      value: "Punto–pendiente",
      correct: correct === "Punto–pendiente",
    },
    { value: "Segmentaria", correct: correct === "Segmentaria" },
    { value: "Vectorial", correct: correct === "Vectorial" },
  ]

  return shuffle(all)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function FormaRectaGame({
  exerciseId,
  classroomId,
  sessionId,
}: {
  exerciseId: string
  classroomId: string
  sessionId?: string
}) {
  const engine = useExerciseEngine({ maxAttempts: 1 })
  const { studentId, gami, gamiLoading, submitAttempt } =
    useExerciseSubmission({
      exerciseId,
      classroomId,
      sessionId,
    })

  const [nonce, setNonce] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)

  const { elapsed, startedAtRef } = useExerciseTimer(
    engine.canAnswer,
    nonce
  )

  const scenario = useMemo(() => {
    const s = generateScenario()
    return { ...s, options: generateOptions(s.correct) }
  }, [nonce])

  const trophyPreview = useMemo(
    () => computeTrophyGain(elapsed),
    [elapsed]
  )

  async function pickOption(op: Option) {
    if (!engine.canAnswer) return

    const timeSeconds =
      (Date.now() - startedAtRef.current) / 1000
    setSelected(op.value)
    engine.submit(op.correct)

    await submitAttempt({
      correct: op.correct,
      answer: {
        selected: op.value,
        correctAnswer: scenario.correct,
        question: {
          expression: scenario.exprTex,
        },
        computed: {
          rule: scenario.ruleText,
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

  const questionTex = `\\text{La ecuación } ${scenario.exprTex} \\text{ está expresada en forma:}`

  return (
    <MathProvider>
      <ExerciseShell
        title="Formas de la ecuación de la recta"
        prompt="Selecciona la opción correcta:"
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Guía paso a paso"
              steps={[
                {
                  title: "Reconocer la estructura",
                  detail: (
                    <span>
                      {scenario.recognitionText}
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={scenario.exprTex} />
                    </div>
                  ),
                },
                {
                  title: "Identificar sus elementos",
                  detail: (
                    <span>
                      {scenario.elementsText}
                    </span>
                  ),
                  icon: Divide,
                },
                {
                  title: "Conclusión",
                  detail: (
                    <span>
                      Por lo tanto, la ecuación está en forma
                      <b> {scenario.correct}</b>.
                    </span>
                  ),
                  icon: ShieldCheck,
                },
              ]}
              concluding={
                <span>
                  Respuesta final:{" "}
                  <b>{scenario.correct}</b>.
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">
            Pregunta
          </div>
          <div className="rounded-lg border bg-background p-3">
            <MathTex block tex={questionTex} />
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={op => (
            <MathTex tex={`\\text{${op.value}}`} />
          )}
        />

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