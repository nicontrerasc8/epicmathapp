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
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

// formatea con separador de miles (coma) como tu imagen: 125,783
function formatThousands(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

/* =========================
   GENERADOR
   "Aproximar N a la decena más cercana"
========================= */

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  // hacemos que sea de 3+ dígitos, con unidades "interesantes"
  const n = randInt(10_000, 999_999)

  const units = n % 10
  const tensBase = n - units
  const rounded = units >= 5 ? tensBase + 10 : tensBase

  // algunas trampas típicas
  const wrongDown = tensBase
  const wrongUp = tensBase + 10
  const wrongHundred = Math.round(n / 100) * 100 // confundir con centena
  const wrongSame = n // no redondear

  return {
    n,
    units,
    tensBase,
    rounded,
    wrongDown,
    wrongUp,
    wrongHundred,
    wrongSame,
  }
}

function generateOptions(s: Scenario): Option[] {
  // la correcta siempre es el redondeo a decena
  const correctValue = s.rounded

  const distractors = new Set<number>()
  // agrega opciones típicas, evitando duplicados y evitando que choque con la correcta
  ;[s.wrongDown, s.wrongUp, s.wrongHundred, s.wrongSame].forEach(v => {
    if (v !== correctValue) distractors.add(v)
  })

  // si faltan distractores (por coincidencias raras), rellena cerca
  while (distractors.size < 4) {
    const delta = choice([-30, -20, -10, 10, 20, 30])
    const v = correctValue + delta
    if (v !== correctValue && v > 0) distractors.add(v)
  }

  const allNums = shuffle([correctValue, ...Array.from(distractors).slice(0, 4)])

  return allNums.map(v => ({
    value: formatThousands(v),
    correct: v === correctValue,
  }))
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function AproximarDecenaGame({
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
        correctAnswer: formatThousands(scenario.rounded),
        question: {
          n: scenario.n,
        },
        computed: {
          units: scenario.units,
          tensBase: scenario.tensBase,
          rule: "A la decena más cercana: si la unidad es 0–4 baja, si es 5–9 sube.",
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

  // TeX “bonito” para el enunciado
  const questionTex = `\\text{Aproximar } ${formatThousands(scenario.n)} \\text{ a la decena más cercana.}`

  const tensBelow = scenario.tensBase
  const tensAbove = scenario.tensBase + 10
  const distanceDown = scenario.n - tensBelow
  const distanceUp = tensAbove - scenario.n

  return (
    <MathProvider>
      <ExerciseShell
        title="Aproximación a la decena más cercana"
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
                  title: "Mirar la cifra de las unidades",
                  detail: (
                    <span>
                      Para aproximar a la <b>decena</b>, solo importa la cifra de las <b>unidades</b>.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={questionTex} />
                      <MathTex
                        block
                        tex={`\\text{Unidad de } ${formatThousands(scenario.n)} \\text{ es } ${scenario.units}.`}
                      />
                    </div>
                  ),
                },
                {
                  title: "Aplicar la regla 0–4 baja, 5–9 sube",
                  detail: (
                    <span>
                      Si la unidad es 0,1,2,3,4 se redondea hacia abajo; si es 5,6,7,8,9 se redondea hacia arriba.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\text{Decena inferior: } ${formatThousands(tensBelow)}`} />
                      <MathTex block tex={`\\text{Decena superior: } ${formatThousands(tensAbove)}`} />
                      <MathTex
                        block
                        tex={`\\text{Distancias: } ${formatThousands(
                          scenario.n
                        )}-${formatThousands(tensBelow)}=${distanceDown},\\quad ${formatThousands(
                          tensAbove
                        )}-${formatThousands(scenario.n)}=${distanceUp}`}
                      />
                    </div>
                  ),
                  tip: (
                    <span>
                      También puedes hacerlo rápido: si la unidad es ≥ 5, sube a la siguiente decena.
                    </span>
                  ),
                },
                {
                  title: "Escribir el resultado",
                  detail: <span>Elegimos la decena más cercana.</span>,
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\text{Resultado: } ${formatThousands(scenario.rounded)}`} />
                    </div>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta final: <b>{formatThousands(scenario.rounded)}</b>.
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
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
          // aquí las opciones son números “texto”, pero igual lo renderizamos con MathTex para consistencia
          renderValue={(op) => <MathTex tex={`\\text{${op.value}}`} />}
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