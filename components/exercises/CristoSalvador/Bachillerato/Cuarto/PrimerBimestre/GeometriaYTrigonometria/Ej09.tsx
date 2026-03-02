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
function choice<T>(arr: T[]) {
  return arr[randInt(0, arr.length - 1)]
}
function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

/* =========================
   BANCO DE VARIACIONES
========================= */

type ContextCase = {
  // Prompt visible
  prompt: (a: string, b: string) => string
  // Respuesta correcta (siempre idea de mediatriz: frontera equidistante)
  correct: (a: string, b: string) => string
}

const PLACES = [
  "hospitales",
  "colegios",
  "comisarías",
  "bomberos",
  "bibliotecas",
  "parques",
  "centros de salud",
  "estaciones de metro",
  "paraderos",
  "postes de serenazgo",
] as const

const CASES: ContextCase[] = [
  {
    prompt: (a, b) =>
      `En un contexto real, ¿qué podría representar la mediatriz entre dos ${a} y ${b}?`,
    correct: (a, b) => `La frontera de puntos equidistantes entre los dos ${a} y ${b}`,
  },
  {
    prompt: (a, b) =>
      `Si hay dos ${a} y ${b}, la mediatriz del segmento que los une se interpreta como:`,
    correct: (a, b) => `La línea que separa las zonas igual de cercanas a ambos ${a} y ${b}`,
  },
  {
    prompt: (a, b) =>
      `En un mapa de la ciudad, la mediatriz entre un ${a} y un ${b} puede usarse para:`,
    correct: (a, b) => `Definir la frontera donde la distancia al ${a} y al ${b} es la misma`,
  },
]

/* =========================
   GENERADOR DEL EJERCICIO
========================= */

type Scenario = {
  entityA: string
  entityB: string
  question: string
  correct: string
  options: Option[]
  explain: {
    step1: string
    step2: string
    step3: string
    conclusion: string
  }
}

function generateScenario(): Scenario {
  // Elegimos un tipo de lugar y lo ponemos en singular para el texto
  const plural = choice([...PLACES])
  // A y B: mismo tipo para que sea consistente con la idea (dos hospitales, dos colegios, etc.)
  const a = plural // lo usamos tal cual (plural)
  const b = plural

  const template = choice(CASES)
  const question = template.prompt(a, b)
  const correct = template.correct(a, b)

  // Distractores (variantes conceptuales)
  const wrongPool = [
    "La trayectoria más larga entre dos puntos",
    "Un eje de simetría horizontal",
    "Una función exponencial",
    "Un área triangular",
    "La ruta más rápida siempre",
    "La distancia mínima a ambos lugares",
    "La suma de las distancias a ambos puntos",
    "Una línea paralela al eje X sin relación",
    "Un conjunto de puntos más cercanos a uno solo",
  ]

  // Elegimos 4 distractores distintos
  const wrongs = shuffle(wrongPool).slice(0, 4)

  const options: Option[] = shuffle([
    { value: correct, correct: true },
    ...wrongs.map((w) => ({ value: w, correct: false })),
  ])

  const explain = {
    step1: "Definición: la mediatriz de un segmento es la recta perpendicular que pasa por su punto medio.",
    step2: "Propiedad clave: cualquier punto sobre la mediatriz está a la misma distancia de los dos extremos del segmento.",
    step3: `Interpretación: en un mapa, esa recta funciona como frontera entre zonas igualmente cercanas a ambos ${a}.`,
    conclusion: `Por eso, la mediatriz puede representar la frontera equidistante entre dos ${a}.`,
  }

  return { entityA: a, entityB: b, question, correct, options, explain }
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function MediatrisContextoRealGame({
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

  const { elapsed, startedAtRef } = useExerciseTimer(engine.canAnswer, nonce)

  const scenario = useMemo(() => generateScenario(), [nonce])
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
          context: "mediatriz_contexto_real",
          entity: scenario.entityA,
          prompt: scenario.question,
        },
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce((n) => n + 1)
  }

  // TeX simple (opcional) para mantener estilo “mate”
  const defTex = `\\text{Mediatriz: recta perpendicular que pasa por el punto medio}`
  const propTex = `\\forall P \\in \\text{mediatriz},\\; PA = PB`
  const conclusionTex = `\\text{Frontera equidistante entre dos puntos (o dos lugares)}`

  return (
    <MathProvider>
      <ExerciseShell
        title="Mediatriz en contexto real"
        prompt={scenario.question}
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Explicación"
              steps={[
                {
                  title: "Definición",
                  detail: <span>{scenario.explain.step1}</span>,
                  icon: Sigma,
                  content: <MathTex block tex={defTex} />,
                },
                {
                  title: "Propiedad",
                  detail: <span>{scenario.explain.step2}</span>,
                  icon: Divide,
                  content: <MathTex block tex={propTex} />,
                },
                {
                  title: "Interpretación real",
                  detail: <span>{scenario.explain.step3}</span>,
                  icon: ShieldCheck,
                  content: <MathTex block tex={conclusionTex} />,
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta: <b>{scenario.correct}</b>
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3 text-sm">
            {scenario.question}
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          // aquí NO hace falta MathTex porque es texto normal
          renderValue={(op) => <span className="text-sm">{op.value}</span>}
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