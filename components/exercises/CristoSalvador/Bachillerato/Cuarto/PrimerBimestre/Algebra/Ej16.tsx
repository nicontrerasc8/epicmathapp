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
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

// ES: decimal con coma (89,96)
function formatDecimalComma(n: number, decimals = 2) {
  return n.toFixed(decimals).replace(".", ",")
}

/* =========================
   GENERADOR
   Redondeo a entero (velocidad)
========================= */

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  // Genera un valor con 2 decimales y cercanos a 2 cifras para que se parezca a la imagen
  const base = randInt(40, 140)
  const dec = randInt(0, 99) / 100
  const v = Number((base + dec).toFixed(2))

  const unidad = Math.floor(v)
  const centesimas = Math.round((v - unidad) * 100) // 0..99
  const decimalPart = v - unidad

  const rounded = Math.round(v)

  // opciones típicas
  const optA = rounded - 1
  const optB = rounded + 1
  const optC = rounded
  const optD = unidad // “truncar” (error típico)
  const optE = rounded - 2

  // asegura rango razonable
  const candidates = [optA, optB, optC, optD, optE].map(x => clamp(x, 0, 250))

  return {
    v,
    unidad,
    centesimas,
    decimalPart,
    rounded,
    candidates,
  }
}

function generateOptions(s: Scenario): Option[] {
  // hacemos 5 opciones únicas (por si coinciden truncado y redondeo cuando .00)
  const seen = new Set<number>()
  const opts: number[] = []
  for (const x of s.candidates) {
    if (!seen.has(x)) {
      seen.add(x)
      opts.push(x)
    }
  }
  // rellena si faltan
  while (opts.length < 5) {
    const extra = clamp(s.rounded + randInt(-4, 4), 0, 250)
    if (!seen.has(extra)) {
      seen.add(extra)
      opts.push(extra)
    }
  }

  const shuffled = shuffle(opts).slice(0, 5)
  return shuffled.map(x => ({
    value: `${x} \\text{ km/h}`,
    correct: x === s.rounded,
  }))
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function RedondeoVelocidadGame({
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
        correctAnswer: `${scenario.rounded} km/h`,
        question: {
          speed: scenario.v,
        },
        computed: {
          units: scenario.unidad,
          decimalPart: Number((scenario.v - scenario.unidad).toFixed(2)),
          rule: "Si la parte decimal es ≥ 0.5 se redondea hacia arriba; si es < 0.5, hacia abajo.",
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

  const speedStr = formatDecimalComma(scenario.v, 2)

  const questionTex = `\\text{La velocidad de un automóvil se calcula como } ${speedStr}\\,\\text{km/h.}`
  const questionTex2 = `\\text{Si el tablero muestra la velocidad como número entero, ¿qué valor aparecerá?}`

  const dec = Number((scenario.v - scenario.unidad).toFixed(2))
  const decisionTex =
    dec >= 0.5
      ? `\\text{Como } ${dec}\\ge 0.5, \\text{ se redondea hacia arriba.}`
      : `\\text{Como } ${dec}< 0.5, \\text{ se redondea hacia abajo.}`

  return (
    <MathProvider>
      <ExerciseShell
        title="Redondeo a número entero (contexto: velocidad)"
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
                  title: "Identificar la parte entera y la parte decimal",
                  detail: <span>Para redondear, miramos la parte decimal (décimas/centésimas).</span>,
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={questionTex} />
                      <MathTex block tex={`\\text{Parte entera} = ${scenario.unidad}`} />
                      <MathTex block tex={`\\text{Parte decimal} = ${dec}`} />
                    </div>
                  ),
                },
                {
                  title: "Aplicar la regla de redondeo",
                  detail: (
                    <span>
                      Regla: si la parte decimal es <b>≥ 0.5</b>, sube al siguiente entero; si es <b>&lt; 0.5</b>, baja.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={decisionTex} />
                    </div>
                  ),
                },
                {
                  title: "Escribir el entero que mostrará el tablero",
                  detail: <span>Ese es el número entero final.</span>,
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\text{Resultado: } ${scenario.rounded}\\,\\text{km/h}`} />
                    </div>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta final: <b>{scenario.rounded} km/h</b>.
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <MathTex block tex={questionTex} />
            <MathTex block tex={questionTex2} />
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={op => <MathTex tex={op.value} />}
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