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

/* ============================================================
   HELPERS
============================================================ */

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function choice<T>(arr: T[]) {
  return arr[randInt(0, arr.length - 1)]
}

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function area2(ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
  return ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function fmt(n: number) {
  const value = round2(n)
  if (Math.abs(value) < 1e-9) return "0"
  if (Number.isInteger(value)) return `${value}`
  return `${value}`
}

function uniqueOptions(options: Option[], needed = 5): Option[] {
  const seen = new Set<string>()
  const out: Option[] = []
  for (const op of options) {
    if (seen.has(op.value)) continue
    seen.add(op.value)
    out.push(op)
    if (out.length >= needed) break
  }
  return out
}

type Line = { a: number; b: number; c: number }

type PairKey = "12" | "13" | "23"
type StepKey = "a" | "b" | "c"

function pairLabel(pair: PairKey) {
  if (pair === "12") return "H1H2"
  if (pair === "13") return "H1H3"
  return "H2H3"
}

function eqToTex(eq: Line) {
  const a = fmt(eq.a)
  const bNum = round2(eq.b)
  const cNum = round2(eq.c)
  const b = `${bNum >= 0 ? "+" : ""}${fmt(bNum)}`
  const c = `${cNum >= 0 ? "+" : ""}${fmt(cNum)}`
  return `${a}x${b}y${c}=0`
}

function pointToTex(x: number, y: number) {
  return `(${fmt(x)}, ${fmt(y)})`
}

function lineFromPoints(ax: number, ay: number, bx: number, by: number): Line {
  const mx = (ax + bx) / 2
  const my = (ay + by) / 2
  const dx = bx - ax
  const dy = by - ay

  if (dy === 0) return { a: 1, b: 0, c: -mx }
  if (dx === 0) return { a: 0, b: 1, c: -my }

  const mPerp = -dx / dy
  return { a: mPerp, b: -1, c: my - mPerp * mx }
}

/* ============================================================
   VARIACIONES
============================================================ */

const CONTEXTS = [
  { label: "hospitales", site: "hospital" },
  { label: "estaciones de bomberos", site: "estación" },
  { label: "centros de salud", site: "centro" },
  { label: "puntos de atención", site: "punto" },
  { label: "nodos de emergencia", site: "nodo" },
  { label: "bases de respuesta rápida", site: "base" },
]

const TITLE_TEMPLATES = [
  "Modelización urbana – Voronoi con 3 sitios",
  "Voronoi aplicado – 3 centros urbanos",
  "Distribución territorial con Voronoi",
  "Análisis de cobertura con Voronoi",
]

const STEP_PROMPT_A = [
  "a) Determine la mediatriz solicitada:",
  "a) Escriba la ecuación de la mediatriz indicada:",
  "a) Seleccione la mediatriz correcta del segmento pedido:",
  "a) Calcule la mediatriz del par de sitios indicado:",
]

const STEP_PROMPT_B = [
  "b) Calcule el vértice de Voronoi (intersección de mediatrices):",
  "b) Determine la coordenada del vértice de Voronoi:",
  "b) Halle el punto de intersección de mediatrices:",
  "b) Ubique el punto equidistante de los 3 sitios:",
]

const STEP_PROMPT_C = [
  "c) Interprete el significado del vértice obtenido:",
  "c) ¿Qué representa ese punto en el contexto urbano?:",
  "c) Seleccione la interpretación correcta del vértice:",
  "c) Conceptualmente, ese punto indica que:",
]

const INTERPRET_CORRECT = [
  "Es equidistante de los tres sitios.",
  "Representa un punto con igual distancia a los 3 sitios.",
  "Corresponde al punto equidistante de H1, H2 y H3.",
  "Indica una ubicación con misma distancia a los tres centros.",
  "Es el vértice donde se igualan distancias a los tres sitios.",
]

const INTERPRET_WRONG = [
  "Es el promedio aritmético de coordenadas.",
  "Es el centroide del triángulo de sitios.",
  "Es el sitio más cercano a todos los demás.",
  "Es un punto arbitrario sin significado geométrico.",
  "Siempre coincide con H1.",
  "Siempre pertenece al segmento H1H2.",
  "Minimiza necesariamente el perímetro del triángulo.",
  "Tiene coordenadas enteras en todos los casos.",
  "Es el punto con mayor coordenada x.",
  "Es la intersección de medianas del triángulo.",
]

/* ============================================================
   GENERADOR
============================================================ */

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  let x1 = 2
  let y1 = 4
  let x2 = 8
  let y2 = 4
  let x3 = 5
  let y3 = 10

  for (let i = 0; i < 400; i++) {
    const ax = randInt(-5, 5)
    const ay = randInt(-5, 5)
    const bx = randInt(-5, 5)
    const by = randInt(-5, 5)
    const cx = randInt(-5, 5)
    const cy = randInt(-5, 5)

    if ((ax === bx && ay === by) || (ax === cx && ay === cy) || (bx === cx && by === cy)) continue
    if (area2(ax, ay, bx, by, cx, cy) === 0) continue

    x1 = ax
    y1 = ay
    x2 = bx
    y2 = by
    x3 = cx
    y3 = cy
    break
  }

  const m12 = lineFromPoints(x1, y1, x2, y2)
  const m13 = lineFromPoints(x1, y1, x3, y3)
  const m23 = lineFromPoints(x2, y2, x3, y3)

  const det = m12.a * m13.b - m13.a * m12.b
  const vx = (m13.b * -m12.c - m12.b * -m13.c) / det
  const vy = (m12.a * -m13.c - m13.a * -m12.c) / det

  const pair: PairKey = choice(["12", "13", "23"])
  const targetLine = pair === "12" ? m12 : pair === "13" ? m13 : m23

  const wrongLines = uniqueOptions(
    shuffle([
      { value: eqToTex(m12), correct: pair === "12" },
      { value: eqToTex(m13), correct: pair === "13" },
      { value: eqToTex(m23), correct: pair === "23" },
      { value: `${randInt(1, 3)}x+${randInt(1, 3)}y-${randInt(1, 9)}=0`, correct: false },
      { value: `${randInt(1, 4)}x-${randInt(1, 4)}y+${randInt(-6, 6)}=0`, correct: false },
      { value: `x-${randInt(-4, 6)}=0`, correct: false },
      { value: `y-${randInt(-4, 6)}=0`, correct: false },
    ])
  )

  const optionsA = shuffle(
    uniqueOptions([
      { value: eqToTex(targetLine), correct: true },
      ...wrongLines.filter((o) => o.value !== eqToTex(targetLine)).map((o) => ({ value: o.value, correct: false })),
    ])
  )

  const correctPoint = pointToTex(vx, vy)
  const optionsB = shuffle(
    uniqueOptions([
      { value: correctPoint, correct: true },
      { value: pointToTex(vx + 1, vy), correct: false },
      { value: pointToTex(vx, vy + 1), correct: false },
      { value: pointToTex(vx - 1, vy - 1), correct: false },
      { value: pointToTex(vx + 0.5, vy - 0.5), correct: false },
      { value: pointToTex(0, 0), correct: false },
    ])
  )

  const correctInterpret = choice(INTERPRET_CORRECT)
  const optionsC = shuffle(
    uniqueOptions([
      { value: correctInterpret, correct: true },
      ...shuffle(INTERPRET_WRONG)
        .slice(0, 6)
        .map((v) => ({ value: v, correct: false })),
    ])
  )

  const context = choice(CONTEXTS)

  return {
    context,
    title: choice(TITLE_TEMPLATES),
    x1,
    y1,
    x2,
    y2,
    x3,
    y3,
    m12,
    m13,
    m23,
    targetPair: pair,
    vx: round2(vx),
    vy: round2(vy),
    options: {
      a: optionsA,
      b: optionsB,
      c: optionsC,
    } as Record<StepKey, Option[]>,
    prompts: {
      a: `${choice(STEP_PROMPT_A)} (del segmento ${pairLabel(pair)})`,
      b: choice(STEP_PROMPT_B),
      c: choice(STEP_PROMPT_C),
    } as Record<StepKey, string>,
    correct: {
      a: eqToTex(targetLine),
      b: correctPoint,
      c: correctInterpret,
    } as Record<StepKey, string>,
  }
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function UrbanVoronoiGame({
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
    useExerciseSubmission({ exerciseId, classroomId, sessionId })

  const [nonce, setNonce] = useState(0)
  const [step, setStep] = useState<StepKey>("a")
  const [selected, setSelected] = useState<string | null>(null)

  const { elapsed, startedAtRef } = useExerciseTimer(engine.canAnswer, nonce)

  const scenario: Scenario = useMemo(() => generateScenario(), [nonce])
  const trophyPreview = useMemo(() => computeTrophyGain(elapsed), [elapsed])

  const currentOptions = scenario.options[step]

  async function pickOption(op: Option) {
    if (!engine.canAnswer) return

    const timeSeconds = (Date.now() - startedAtRef.current) / 1000
    setSelected(op.value)
    engine.submit(op.correct)

    await submitAttempt({
      correct: op.correct,
      answer: {
        step,
        selected: op.value,
        correctAnswer: scenario.correct[step],
        triangle: {
          H1: { x: scenario.x1, y: scenario.y1 },
          H2: { x: scenario.x2, y: scenario.y2 },
          H3: { x: scenario.x3, y: scenario.y3 },
        },
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()

    if (step === "a") setStep("b")
    else if (step === "b") setStep("c")
    else {
      setStep("a")
      setNonce((n) => n + 1)
    }
  }

  const texM12 = `M_{12}: ${eqToTex(scenario.m12)}`
  const texM13 = `M_{13}: ${eqToTex(scenario.m13)}`
  const texVertex = `V = ${pointToTex(scenario.vx, scenario.vy)}`

  return (
    <MathProvider>
      <ExerciseShell
        title={scenario.title}
        prompt={scenario.prompts[step]}
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Resolución"
              steps={[
                {
                  title: "Mediatrices",
                  detail: (
                    <span>
                      Se construyen usando punto medio y pendiente perpendicular
                      entre pares de {scenario.context.site}s.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-2">
                      <MathTex block tex={texM12} />
                      <MathTex block tex={texM13} />
                    </div>
                  ),
                },
                {
                  title: "Intersección",
                  detail: (
                    <span>
                      El vértice de Voronoi se obtiene al intersectar dos
                      mediatrices del triángulo de sitios.
                    </span>
                  ),
                  icon: Divide,
                  content: <MathTex block tex={texVertex} />,
                },
                {
                  title: "Interpretación",
                  detail: (
                    <span>
                      Ese punto es equidistante de H1, H2 y H3 en el contexto
                      de {scenario.context.label}.
                    </span>
                  ),
                  icon: ShieldCheck,
                },
              ]}
              concluding={
                <span>
                  Respuesta esperada en este paso: <b>{scenario.correct[step]}</b>
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4 space-y-2">
          <div className="text-sm">
            Contexto: <b>{scenario.context.label}</b>
          </div>
          <div className="text-sm">
            H1({scenario.x1},{scenario.y1}) | H2({scenario.x2},{scenario.y2}) | H3({scenario.x3},{scenario.y3})
          </div>
        </div>

        <OptionsGrid
          options={currentOptions}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
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
