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

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

type Scenario = ReturnType<typeof generateScenario>

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function isHalfInt(n: number) {
  // enteros o .5
  const r = Math.round(n * 2) / 2
  return Math.abs(n - r) < 1e-9
}

function formatHalfOrInt(n: number) {
  // n será entero o x.5
  if (Math.abs(n - Math.round(n)) < 1e-9) return `${Math.round(n)}`
  const sign = n < 0 ? "-" : ""
  const abs = Math.abs(n)
  const whole = Math.floor(abs)
  return `${sign}${whole}.5`
}

function scenarioPointString(x: number, y: number) {
  // Usamos punto decimal para evitar ambigüedad con el separador de coordenadas.
  const fx = isHalfInt(x) ? formatHalfOrInt(x) : `${x}`
  const fy = isHalfInt(y) ? formatHalfOrInt(y) : `${y}`
  return `(${fx},${fy})`
}

function generateScenario() {
  // Queremos que el punto medio salga "bonito": entero o .5 (para opciones estilo (1,5))
  for (let i = 0; i < 300; i++) {
    const ax = randInt(-8, 8)
    const ay = randInt(-8, 12)

    let bx = randInt(-8, 12)
    let by = randInt(-8, 12)

    // evitar que sea el mismo punto
    if (bx === ax && by === ay) continue

    const m = midpoint({ x: ax, y: ay }, { x: bx, y: by })

    // forzamos que midpoint tenga coords enteras o .5
    if (!isHalfInt(m.x) || !isHalfInt(m.y)) continue

    const correctRaw = scenarioPointString(m.x, m.y)

    // generar distractores típicos
    const wrong1 = scenarioPointString(m.x + 1, m.y) // x + 1
    const wrong2 = scenarioPointString(m.x, m.y + 1) // y + 1
    const wrong3 = scenarioPointString(m.x - 1, m.y) // x - 1
    const wrong4 = scenarioPointString(m.x, m.y - 1) // y - 1

    // también distractor: promedio mal hecho (sin dividir entre 2)
    const sumWrong = scenarioPointString(ax + bx, ay + by)

    // armar pool y quitar duplicados
    const pool = shuffle([wrong1, wrong2, wrong3, wrong4, sumWrong])

    const opts: Option[] = [{ value: correctRaw, correct: true }]
    const seen = new Set<string>([correctRaw])

    for (const w of pool) {
      if (opts.length >= 5) break
      if (seen.has(w)) continue
      opts.push({ value: w, correct: false })
      seen.add(w)
    }

    // si aún faltan, mete opciones cercanas aleatorias
    while (opts.length < 5) {
      const dx = randInt(-2, 2)
      const dy = randInt(-2, 2)
      const extra = scenarioPointString(m.x + dx, m.y + dy)
      if (!seen.has(extra)) {
        opts.push({ value: extra, correct: false })
        seen.add(extra)
      }
    }

    return {
      ax,
      ay,
      bx,
      by,
      mx: m.x,
      my: m.y,
      correctRaw,
      options: shuffle(opts),
    }
  }

  // fallback
  const ax = -2,
    ay = 3,
    bx = 4,
    by = 7
  const m = midpoint({ x: ax, y: ay }, { x: bx, y: by })
  const correctRaw = scenarioPointString(m.x, m.y)
  const options = shuffle<Option>([
    { value: correctRaw, correct: true },
    { value: "(2,5)", correct: false },
    { value: "(1,4)", correct: false },
    { value: "(3,5)", correct: false },
    { value: "(0,5)", correct: false },
  ])

  return { ax, ay, bx, by, mx: m.x, my: m.y, correctRaw, options }
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function PuntoMedioGame({
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
        correctAnswer: scenario.correctRaw,
        question: {
          A: { x: scenario.ax, y: scenario.ay },
          B: { x: scenario.bx, y: scenario.by },
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

  const formulaTex = `M = \\left(\\frac{x_1+x_2}{2},\\ \\frac{y_1+y_2}{2}\\right)`

  const substitutionTex = `
M = \\left(\\frac{${scenario.ax}+${scenario.bx}}{2},\\ \\frac{${scenario.ay}+${scenario.by}}{2}\\right)
`

  const calcTex = `
M = \\left(\\frac{${scenario.ax + scenario.bx}}{2},\\ \\frac{${scenario.ay + scenario.by}}{2}\\right)
= \\left(${scenario.mx},${scenario.my}\\right)
`

  return (
    <MathProvider>
      <ExerciseShell
        title="Punto medio entre dos puntos"
        prompt="¿Cuál es el punto medio?"
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Resolución paso a paso"
              steps={[
                {
                  title: "Usar la fórmula del punto medio",
                  detail: (
                    <span>
                      El punto medio se obtiene promediando las coordenadas x e y.
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={formulaTex} />,
                },
                {
                  title: "Sustituir valores",
                  detail: (
                    <span>
                      Reemplazamos A(x₁,y₁) y B(x₂,y₂) en la fórmula.
                    </span>
                  ),
                  icon: Divide,
                  content: <MathTex block tex={substitutionTex} />,
                },
                {
                  title: "Calcular",
                  detail: (
                    <span>
                      Sumamos y dividimos entre 2 cada coordenada.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: <MathTex block tex={calcTex} />,
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta: <b>{scenario.correctRaw}</b>
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>

          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div className="text-sm">
              El punto medio de{" "}
              <b>
                A({scenario.ax}, {scenario.ay})
              </b>{" "}
              y{" "}
              <b>
                B({scenario.bx}, {scenario.by})
              </b>{" "}
              es:
            </div>

            <div className="text-xs text-muted-foreground">
              (Elige la opción correcta)
            </div>
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          // aquí tus options son strings tipo "(1,5)" como en la imagen
          // MathTex igual lo renderiza (no requiere \\left \\right)
          renderValue={(op) => <MathTex tex={op.value} />}
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
