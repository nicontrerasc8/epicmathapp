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
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function fmtMoneyComma(n: number, decimals = 2) {
  // Siempre con coma decimal, como en las imágenes: 3,46
  return n.toFixed(decimals).replace(".", ",")
}

function truncateTo2(n: number) {
  return Math.trunc(n * 100) / 100
}

function roundTo2(n: number) {
  // redondeo “normal” a 2 decimales
  return Math.round(n * 100) / 100
}

/* =========================
   GENERADOR (redondeo de dinero)
========================= */

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  // Queremos algo tipo 3,4578 (4 decimales) como la imagen
  // Para hacerlo variado, generamos 4 decimales y obligamos que NO termine en 00.
  let soles = 0
  let decimals = 4

  for (let tries = 0; tries < 200; tries++) {
    const intPart = randInt(0, 99) // puede ser 0..99 soles
    const d1 = randInt(0, 9)
    const d2 = randInt(0, 9)
    const d3 = randInt(0, 9)
    const d4 = randInt(0, 9)

    // evitamos cosas demasiado triviales: que los 3er decimal sea siempre 0
    if (d3 === 0 && d4 === 0) continue

    soles = Number(`${intPart}.${d1}${d2}${d3}${d4}`)
    decimals = 4
    break
  }

  // fallback si algo raro
  if (soles === 0) soles = 3.4578

  const shown = fmtMoneyComma(soles, decimals)
  const rounded = roundTo2(soles)
  const truncated = truncateTo2(soles)

  const thirdDecimal = Math.floor((Math.abs(soles) * 1000) % 10) // 3er decimal

  return {
    soles,
    shown,
    rounded,
    truncated,
    thirdDecimal,
    answerShown: `S/ ${fmtMoneyComma(rounded, 2)}`,
  }
}

/* =========================
   OPCIONES (A-E)
   Trampas típicas:
   - truncar en vez de redondear
   - usar 3 decimales
   - redondear al entero
   - “subir/bajar” mal cuando el 3er decimal es 5
========================= */

function generateOptions(s: Scenario): Option[] {
  const correct = s.answerShown

  const seen = new Set<string>()
  const opts: Option[] = []

  function add(val: string, isCorrect: boolean) {
    if (seen.has(val)) return
    seen.add(val)
    opts.push({ value: val, correct: isCorrect })
  }

  add(correct, true)

  // A) truncado a 2 decimales
  add(`S/ ${fmtMoneyComma(s.truncated, 2)}`, false)

  // B) 3 decimales (confusión: “hasta 3 decimales”)
  add(`S/ ${fmtMoneyComma(s.soles, 3)}`, false)

  // C) redondeo al entero
  add(`S/ ${Math.round(s.soles)}`, false)

  // D) “redondeo al revés”: si debería subir, baja; si debería bajar, sube
  {
    const base = truncateTo2(s.soles)
    const shouldUp = s.thirdDecimal >= 5
    const wrong = shouldUp ? base : base + 0.01
    add(`S/ ${fmtMoneyComma(wrong, 2)}`, false)
  }

  // Si por coincidencia se duplicó algo (raro), rellenamos
  while (opts.length < 5) {
    const extra = `S/ ${fmtMoneyComma(roundTo2(s.soles + (choice([-2, -1, 1, 2]) * 0.01)), 2)}`
    if (!seen.has(extra) && extra !== correct) add(extra, false)
  }

  // Mezcla A–E
  return opts.slice(0, 5).sort(() => Math.random() - 0.5)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function RedondeoDineroGame({
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
        correctAnswer: scenario.answerShown,
        question: {
          interestGenerated: scenario.shown,
          paysDecimals: 2,
        },
        computed: {
          thirdDecimal: scenario.thirdDecimal,
          rounded: scenario.rounded,
          truncated: scenario.truncated,
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

  const q1 = `\\text{El interés generado en una cuenta bancaria es } ${scenario.shown} \\text{ soles.}`
  const q2 = `\\text{Si el banco paga hasta dos decimales, ¿cuánto recibirá el cliente?}`

  const step1 = `\\text{Queremos 2 decimales (centavos). Miramos el 3er decimal.}`
  const step2 = `\\text{Número: } ${scenario.shown}`
  const step3 = `\\text{3er decimal } = ${scenario.thirdDecimal}. \\;\\; \\text{Si es } \\ge 5 \\text{, sube el 2do decimal.}`
  const step4 = `\\text{Resultado pagado: } ${scenario.answerShown}`

  return (
    <MathProvider>
      <ExerciseShell
        title="Redondeo de dinero a 2 decimales"
        prompt="Resuelve:"
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
                  title: "Identificar a cuántos decimales se paga",
                  detail: (
                    <span>
                      “Hasta 2 decimales” significa <b>centavos</b>.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={q1} />
                      <MathTex block tex={q2} />
                    </div>
                  ),
                },
                {
                  title: "Mirar el 3er decimal para decidir",
                  detail: (
                    <span>
                      El <b>3er decimal</b> decide si el 2do decimal se queda igual o sube.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={step1} />
                      <MathTex block tex={step2} />
                      <MathTex block tex={step3} />
                    </div>
                  ),
                  tip: (
                    <span>
                      Si el 3er decimal es 0–4, no cambia. Si es 5–9, sube 1 al 2do decimal.
                    </span>
                  ),
                },
                {
                  title: "Escribir el monto final",
                  detail: <span>Ese es el valor que recibirá el cliente.</span>,
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={step4} />
                    </div>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta final: <b>{scenario.answerShown}</b>.
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3">
            <MathTex block tex={q1} />
            <MathTex block tex={q2} />
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={op => <MathTex tex={`\\text{${op.value}}`} />}
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