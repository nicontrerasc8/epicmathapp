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
function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

type Scenario = ReturnType<typeof generateScenario>
type Variation = ReturnType<typeof generateVariation>

type TriangleKind = "acutangulo" | "rectangulo" | "obtusangulo"
type QuestionFamily = "name" | "property" | "location" | "application"

function area2(ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
  // 2 * area (determinante). Si 0 => colineales
  return ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)
}

function pickUnique(values: string[], count: number): string[] {
  const unique = Array.from(new Set(values))
  return shuffle(unique).slice(0, count)
}

function dist2(x1: number, y1: number, x2: number, y2: number) {
  const dx = x1 - x2
  const dy = y1 - y2
  return dx * dx + dy * dy
}

function classifyTriangle(s: Scenario): TriangleKind {
  const ab2 = dist2(s.ax, s.ay, s.bx, s.by)
  const bc2 = dist2(s.bx, s.by, s.cx, s.cy)
  const ca2 = dist2(s.cx, s.cy, s.ax, s.ay)
  const sides = [ab2, bc2, ca2].sort((a, b) => a - b)
  const sum = sides[0] + sides[1]
  const longest = sides[2]
  if (sum === longest) return "rectangulo"
  if (sum > longest) return "acutangulo"
  return "obtusangulo"
}

function kindLabel(kind: TriangleKind) {
  if (kind === "rectangulo") return "rectangulo"
  if (kind === "obtusangulo") return "obtusangulo"
  return "acutangulo"
}

function generateScenario() {
  for (let i = 0; i < 300; i++) {
    const ax = randInt(-6, 6)
    const ay = randInt(-6, 6)

    let bx = randInt(-6, 6)
    let by = randInt(-6, 6)
    if (bx === ax && by === ay) continue

    let cx = randInt(-6, 6)
    let cy = randInt(-6, 6)
    if ((cx === ax && cy === ay) || (cx === bx && cy === by)) continue

    // evitar puntos colineales
    const a2 = area2(ax, ay, bx, by, cx, cy)
    if (a2 === 0) continue

    return { ax, ay, bx, by, cx, cy }
  }

  // fallback
  return { ax: 0, ay: 0, bx: 4, by: 1, cx: 2, cy: 5 }
}

function generateVariation(s: Scenario) {
  const a = `A(${s.ax},${s.ay})`
  const b = `B(${s.bx},${s.by})`
  const c = `C(${s.cx},${s.cy})`

  const triangleKind = classifyTriangle(s)
  const fam = choice<QuestionFamily>(["name", "property", "location", "application"])

  const introBank = [
    `Considera el triangulo con vertices ${a}, ${b} y ${c}.`,
    `Trabaja con el triangulo definido por ${a}, ${b} y ${c}.`,
    `Sea el triangulo cuyos vertices son ${a}, ${b} y ${c}.`,
    `En el triangulo de vertices ${a}, ${b} y ${c}, responde.`,
  ]

  let prompt = ""
  let correctText = ""
  let wrongPool: string[] = []

  if (fam === "name") {
    prompt = choice([
      "Las mediatrices de un triangulo concurren en:",
      "El punto donde se cruzan las tres mediatrices se llama:",
      "La interseccion de mediatrices determina:",
    ])
    correctText = choice([
      "Circuncentro",
      "El circuncentro",
      "El centro de la circunferencia circunscrita",
    ])
    wrongPool = [
      "Incentro",
      "Baricentro",
      "Ortocentro",
      "El punto medio de un lado",
      "No existe punto comun",
      "Centroide",
    ]
  } else if (fam === "property") {
    prompt = choice([
      "La propiedad correcta del punto de interseccion de mediatrices es:",
      "Respecto al circuncentro, se cumple que:",
      "Si P es el circuncentro de ABC, entonces:",
    ])
    correctText = choice([
      "PA = PB = PC",
      "Es equidistante de los tres vertices",
      "Sus distancias a A, B y C son iguales",
    ])
    wrongPool = [
      "Esta a igual distancia de los tres lados",
      "Siempre coincide con el ortocentro",
      "Siempre coincide con el baricentro",
      "PA + PB = PC",
      "Solo es equidistante de dos vertices",
      "Divide cada lado en razon 2:1",
    ]
  } else if (fam === "location") {
    prompt = `Si el triangulo es ${kindLabel(triangleKind)}, la posicion del circuncentro suele estar:`
    if (triangleKind === "acutangulo") correctText = "Dentro del triangulo"
    else if (triangleKind === "rectangulo") correctText = "En el punto medio de la hipotenusa"
    else correctText = "Fuera del triangulo"
    wrongPool = [
      "Siempre dentro del triangulo",
      "Siempre fuera del triangulo",
      "En el baricentro",
      "En el incentro",
      "Sobre cualquier mediana",
      "En un vertice del triangulo",
    ]
  } else {
    prompt = choice([
      "Para construir la circunferencia que pasa por A, B y C, primero se debe hallar:",
      "El centro de la circunferencia circunscrita se obtiene con:",
      "Para ubicar el centro del circulo por tres vertices no colineales, se usan:",
    ])
    correctText = choice([
      "La interseccion de dos mediatrices (equivale a las tres)",
      "El circuncentro del triangulo",
      "Las mediatrices de los lados del triangulo",
    ])
    wrongPool = [
      "La interseccion de las bisectrices",
      "La interseccion de las medianas",
      "La interseccion de las alturas",
      "La suma de longitudes de los lados",
      "El punto medio de la base",
      "El centro del rectangulo envolvente",
    ]
  }

  const wrongChoices = pickUnique(wrongPool.filter((w) => w !== correctText), 4)
  const options: Option[] = shuffle([
    { value: correctText, correct: true },
    ...wrongChoices.map((value) => ({ value, correct: false })),
  ])

  const explain = {
    step1:
      "La mediatriz de un lado contiene los puntos que estan a igual distancia de sus extremos.",
    step2:
      "Al cruzar mediatrices de un triangulo aparece un punto unico ligado a la circunferencia circunscrita.",
    step3:
      fam === "location"
        ? `En triangulos ${kindLabel(triangleKind)}, la ubicacion del circuncentro cambia segun el tipo del triangulo.`
        : "Ese punto es equidistante de los tres vertices A, B y C.",
  }

  return {
    intro: choice(introBank),
    prompt,
    correctText,
    options,
    family: fam,
    triangleKind,
    explain,
  }
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function CircuncentroMediatricesGame({
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
    const v: Variation = generateVariation(s)
    return { ...s, ...v }
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
        correctAnswer: scenario.correctText,
        question: {
          type: "interseccion_mediatrices_triangulo",
          family: scenario.family,
          prompt: scenario.prompt,
          triangle: {
            A: { x: scenario.ax, y: scenario.ay },
            B: { x: scenario.bx, y: scenario.by },
            C: { x: scenario.cx, y: scenario.cy },
          },
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

  const keyIdeaTex = `\\text{Si } P \\text{ esta en la mediatriz de } \\overline{AB},\\; d(P,A)=d(P,B).`
  const circumcenterTex = `
\\text{La interseccion de las 3 mediatrices es el } \\mathbf{circuncentro}
\\text{ (centro de la circunferencia circunscrita).}
`

  return (
    <MathProvider>
      <ExerciseShell
        title="Circuncentro y mediatrices"
        prompt={scenario.prompt}
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Explicacion"
              steps={[
                {
                  title: "Que hace una mediatriz",
                  detail: (
                    <span>
                      {scenario.explain.step1}
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={keyIdeaTex} />,
                },
                {
                  title: "Cruce de mediatrices",
                  detail: (
                    <span>
                      {scenario.explain.step2}
                    </span>
                  ),
                  icon: Divide,
                },
                {
                  title: "Conclusion",
                  detail: (
                    <span>
                      {scenario.explain.step3}
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: <MathTex block tex={circumcenterTex} />,
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta: <b>{scenario.correctText}</b>
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>

          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div className="text-sm">{scenario.intro}</div>
            <div className="text-sm">{scenario.prompt}</div>
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={(op) => <span>{op.value}</span>}
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
