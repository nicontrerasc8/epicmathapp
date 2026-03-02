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
type Variation = ReturnType<typeof generateVariation>

function area2(ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
  // 2 * área (determinante). Si 0 => colineales
  return ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)
}

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function pickUnique(values: string[], count: number): string[] {
  const unique = Array.from(new Set(values))
  return shuffle(unique).slice(0, count)
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

  const promptBank = [
    "La intersección de las mediatrices de un triángulo determina:",
    "¿Qué punto notable se obtiene al cortar las tres mediatrices?",
    "Si trazas las mediatrices de los tres lados, su punto común es:",
    "El punto equidistante de los tres vértices se llama:",
    "Las mediatrices de un triángulo concurren en:",
    "¿Cómo se denomina el centro de la circunferencia que pasa por A, B y C?",
    "En el triángulo, el centro de la circunferencia circunscrita es:",
    "¿Qué nombre recibe el punto donde se cruzan las mediatrices?",
  ]

  const introBank = [
    `Considera el triángulo con vértices ${a}, ${b} y ${c}.`,
    `Trabaja con el triángulo definido por ${a}, ${b} y ${c}.`,
    `Sea el triángulo cuyos vértices son ${a}, ${b} y ${c}.`,
    `En el triángulo de vértices ${a}, ${b} y ${c}, analiza sus mediatrices.`,
    `Dado el triángulo con puntos ${a}, ${b} y ${c}, responde:`,
    `Para el triángulo formado por ${a}, ${b} y ${c}, identifica el punto notable.`,
    `En la figura triangular con vértices ${a}, ${b} y ${c}, se pide:`,
    `Tomando como vértices ${a}, ${b} y ${c}, selecciona la opción correcta.`,
  ]

  const correctBank = [
    "El circuncentro",
    "Circuncentro",
    "El centro de la circunferencia circunscrita",
    "El punto equidistante de los tres vértices (circuncentro)",
    "El centro del círculo que pasa por los tres vértices",
    "El punto de concurrencia de las mediatrices: circuncentro",
  ]

  const wrongBank = [
    "El baricentro",
    "El incentro",
    "El ortocentro",
    "El punto medio de un lado",
    "La bisectriz principal",
    "El centroide",
    "El centro de masa del triángulo",
    "El punto donde se cruzan las alturas",
    "El punto donde se cruzan las medianas",
    "El punto donde se cruzan las bisectrices",
    "El centro del círculo inscrito",
    "El vértice de mayor ángulo",
    "El punto más cercano al lado mayor",
    "El punto de pendiente nula",
    "El centro del rectángulo envolvente",
    "El punto de intersección de las diagonales",
    "El centro del lado más largo",
    "No existe un punto común",
    "Un punto cualquiera del plano",
  ]

  const correctText = pickOne(correctBank)
  const wrongChoices = pickUnique(
    wrongBank.filter((w) => w !== correctText),
    4
  )

  return {
    prompt: pickOne(promptBank),
    intro: pickOne(introBank),
    correctText,
    options: shuffle<Option>([
      { value: correctText, correct: true },
      ...wrongChoices.map((value) => ({ value, correct: false })),
    ]),
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

  const keyIdeaTex = `
\\text{Si } P \\text{ está en la mediatriz de } \\overline{AB},\\; d(P,A)=d(P,B).
`
  const circumcenterTex = `
\\text{La intersección de las 3 mediatrices es el } \\mathbf{circuncentro}
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
              title="Explicación"
              steps={[
                {
                  title: "Qué hace una mediatriz",
                  detail: (
                    <span>
                      La mediatriz de un lado del triángulo reúne los puntos que están a igual distancia
                      de los extremos de ese lado.
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={keyIdeaTex} />,
                },
                {
                  title: "Qué pasa al cruzar las mediatrices",
                  detail: (
                    <span>
                      El punto donde se intersectan las mediatrices queda a la misma distancia de los
                      tres vértices del triángulo.
                    </span>
                  ),
                  icon: Divide,
                },
                {
                  title: "Conclusión",
                  detail: (
                    <span>
                      Ese punto es el centro de la circunferencia que pasa por los 3 vértices:
                      el <b>circuncentro</b>.
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
            <div className="text-sm">
              {scenario.intro}
            </div>
            <div className="text-sm">
              {scenario.prompt}
            </div>
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
