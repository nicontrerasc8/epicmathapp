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

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}
function par(n: number) {
  return n < 0 ? `(${n})` : `${n}`
}
function texPow(sym: "x" | "y", exp: number) {
  if (exp === 1) return sym
  return `${sym}^{${exp}}`
}
function monoTex(expX: number, expY: number) {
  return `${texPow("x", expX)}${texPow("y", expY)}`
}

/* =========================
   ESCENARIO (el de la imagen)
   (x^{-2}y^{3})^{-2} (xy^{-1})^{3} / (x^{-1}y^{2})
========================= */

type Scenario = ReturnType<typeof buildScenario>

function buildScenario() {
  // datos fijos (según imagen)
  const a = -2,
    b = 3,
    n1 = -2
  const c = 1,
    d = -1,
    n2 = 3
  const denX = -1,
    denY = 2

  // (x^a y^b)^n1
  const p1x = a * n1 // 4
  const p1y = b * n1 // -6

  // (x^c y^d)^n2
  const p2x = c * n2 // 3
  const p2y = d * n2 // -3

  // numerador: multiplicación (se suman exponentes)
  const numX = p1x + p2x // 7
  const numY = p1y + p2y // -9

  // división por x^{denX} y^{denY}: se restan exponentes
  const finalX = numX - denX // 7 - (-1) = 8
  const finalY = numY - denY // -9 - 2 = -11

  const exprTex =
    "\\frac{\\left(x^{-2}y^{3}\\right)^{-2}\\left(xy^{-1}\\right)^{3}}{x^{-1}y^{2}}"

  const correct = monoTex(finalX, finalY)

  return {
    a,
    b,
    n1,
    c,
    d,
    n2,
    denX,
    denY,
    exprTex,
    // parciales
    p1x,
    p1y,
    p2x,
    p2y,
    numX,
    numY,
    finalX,
    finalY,
    correct,
  }
}

/* =========================
   OPCIONES (A–E)
   (incluyo distractor x^6 y^-5 porque en tu imagen aparece como clave,
    pero aquí marco como correcta la simplificación algebraica del enunciado.)
========================= */

function buildOptions(s: Scenario): Option[] {
  const correct = s.correct

  const wrong1 = monoTex(s.numX, s.numY) // olvidar dividir entre el denominador
  const wrong2 = monoTex(s.numX - 1, s.numY) // tratar x^{-1} como x^{+1} (error de signo)
  const wrong3 = monoTex(s.finalX, s.numY) // olvidar restar el y^2
  const wrong4 = monoTex(6, -5) // la “clave” que aparece en la imagen (distractor aquí)

  const all: Option[] = [
    { value: correct, correct: true },
    { value: wrong1, correct: false },
    { value: wrong2, correct: false },
    { value: wrong3, correct: false },
    { value: wrong4, correct: false },
  ]

  // por si algún distractor coincide raro (no debería), filtra duplicados
  const seen = new Set<string>()
  const unique: Option[] = []
  for (const o of all) {
    if (seen.has(o.value)) continue
    seen.add(o.value)
    unique.push(o)
  }

  // relleno de emergencia
  while (unique.length < 5) {
    const extra = monoTex(s.finalX + 1, s.finalY + 2)
    if (!seen.has(extra) && extra !== correct) {
      unique.push({ value: extra, correct: false })
      seen.add(extra)
    }
  }

  return shuffle(unique).slice(0, 5)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function LeyesExponentesEnterosQ1Game({
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
    const s = buildScenario()
    return { ...s, options: buildOptions(s) }
  }, [nonce])

  const trophyPreview = useMemo(() => computeTrophyGain(elapsed), [elapsed])

  const letters = ["A", "B", "C", "D", "E"] as const
  const correctIndex = scenario.options.findIndex(o => o.correct)
  const correctLetter = correctIndex >= 0 ? letters[correctIndex] : "—"

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
        correctLetter,
        expressionTex: scenario.exprTex,
        question: {
          a: scenario.a,
          b: scenario.b,
          n1: scenario.n1,
          c: scenario.c,
          d: scenario.d,
          n2: scenario.n2,
          denX: scenario.denX,
          denY: scenario.denY,
        },
        computed: {
          pow1: { x: scenario.p1x, y: scenario.p1y },
          pow2: { x: scenario.p2x, y: scenario.p2y },
          numerator: { x: scenario.numX, y: scenario.numY },
          final: { x: scenario.finalX, y: scenario.finalY },
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

  const step1Tex = `\\left(x^{${scenario.a}}y^{${scenario.b}}\\right)^{${scenario.n1}}
= x^{${par(scenario.a)}\\cdot ${par(scenario.n1)}}\\,y^{${par(scenario.b)}\\cdot ${par(scenario.n1)}}
= x^{${scenario.p1x}}y^{${scenario.p1y}}`

  const step2Tex = `\\left(x^{${scenario.c}}y^{${scenario.d}}\\right)^{${scenario.n2}}
= x^{${par(scenario.c)}\\cdot ${par(scenario.n2)}}\\,y^{${par(scenario.d)}\\cdot ${par(scenario.n2)}}
= x^{${scenario.p2x}}y^{${scenario.p2y}}`

  const step3Tex = `\\text{Numerador: }x^{${scenario.p1x}}y^{${scenario.p1y}}\\cdot x^{${scenario.p2x}}y^{${scenario.p2y}}
= x^{${scenario.p1x}+${scenario.p2x}}\\,y^{${par(scenario.p1y)}+${par(scenario.p2y)}}
= x^{${scenario.numX}}y^{${scenario.numY}}`

  const step4Tex = `\\frac{x^{${scenario.numX}}y^{${scenario.numY}}}{x^{${scenario.denX}}y^{${scenario.denY}}}
= x^{${scenario.numX}-${par(scenario.denX)}}\\,y^{${par(scenario.numY)}-${par(scenario.denY)}}
= x^{${scenario.finalX}}y^{${scenario.finalY}}`

  return (
    <MathProvider>
      <ExerciseShell
        title="Leyes de exponentes con exponentes enteros"
        prompt="Simplifica la expresión. La respuesta correcta es:"
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
                  title: "Aplicar potencia a cada paréntesis",
                  detail: (
                    <span>
                      Regla: <MathTex tex={`(x^p y^q)^n=x^{p\\cdot n}y^{q\\cdot n}`} />.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={scenario.exprTex} />
                      <MathTex block tex={step1Tex} />
                      <MathTex block tex={step2Tex} />
                    </div>
                  ),
                },
                {
                  title: "Multiplicar el numerador",
                  detail: (
                    <span>
                      Al multiplicar potencias de la misma base, los exponentes se <b>suman</b>.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={step3Tex} />
                    </div>
                  ),
                  tip: (
                    <span>
                      Ej.: <MathTex tex={`y^{-6}\\cdot y^{-3}=y^{-9}`} />.
                    </span>
                  ),
                },
                {
                  title: "Dividir entre el denominador",
                  detail: (
                    <span>
                      Al dividir potencias de la misma base, los exponentes se <b>restan</b>.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={step4Tex} />
                    </div>
                  ),
                  tip: (
                    <span>
                      Ojo con el signo: <MathTex tex={`7-(-1)=8`} />.
                    </span>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta final: <b>{scenario.correct}</b> (opción <b>{correctLetter}</b>).
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3">
            <MathTex block tex={scenario.exprTex} />
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
