"use client"

import { useMemo, useState } from "react"
import { ShieldCheck, Sigma, Divide } from "lucide-react"

import { useExerciseEngine } from "@/lib/exercises/useExerciseEngine"
import { useExerciseSubmission } from "@/lib/exercises/useExerciseSubmission"
import { useExerciseTimer } from "@/lib/exercises/useExerciseTimer"
import { computeTrophyGain, WRONG_PENALTY } from "@/lib/exercises/gamification"

import { Option, OptionsGrid } from "@/components/exercises/base/OptionsGrid"
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

function fmtComma(n: number, decimals: number) {
  // formato con coma decimal (es-PE) sin separador de miles
  return n.toLocaleString("es-PE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: false,
  })
}

function toTexDecimal(s: string) {
  return s.replace(",", "{,}")
}

function roundTo(n: number, decimals: number) {
  const p = 10 ** decimals
  return Math.round(n * p) / p
}

function floorTo(n: number, decimals: number) {
  const p = 10 ** decimals
  return Math.floor(n * p) / p
}

/* =========================
   GENERADOR (tema: redondeo a 2 decimales)
========================= */

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  // Genera valores tipo 12,486 g (3 decimales)
  const integerPart = randInt(5, 90)
  const d1 = randInt(0, 9)
  const d2 = randInt(0, 9)
  const d3 = randInt(0, 9)

  const value3 = Number(`${integerPart}.${d1}${d2}${d3}`)
  const rounded2 = roundTo(value3, 2)

  // Forzamos caso interesante (a veces d3 < 5 no cambia, pero igual vale)
  // Igual lo dejamos: es buen ejercicio para ambos.
  const questionTex = `\\text{Un laboratorio registra la masa de una sustancia como } ${fmtComma(
    value3,
    3
  ).replace(",", "{,")}\\,\\text{g}.\\\\
\\text{Si el instrumento mide con precisión de dos decimales, ¿qué valor debe reportarse?}`

  const correct = `${toTexDecimal(fmtComma(rounded2, 2))}\\,\\text{g}`

  return {
    value3,
    rounded2,
    questionTex,
    correct,
    d1,
    d2,
    d3,
  }
}

/* =========================
   OPCIONES (A–E tipo imagen)
========================= */

function generateOptions(s: Scenario): Option[] {
  const correct = s.correct

  // Trampas típicas:
  // 1) truncar (no redondear)
  const trunc2 = floorTo(s.value3, 2)
  const wrongTrunc = `${toTexDecimal(fmtComma(trunc2, 2))}\\,\\text{g}`

  // 2) redondear a 1 decimal
  const round1 = roundTo(s.value3, 1)
  const wrong1dec = `${toTexDecimal(fmtComma(round1, 1))}\\,\\text{g}`

  // 3) redondeo mal por mirar la centésima en vez de la milésima
  //    (si d2 >= 5 "subo", sino "bajo") => incorrecto
  const fakeUp =
    s.d2 >= 5
      ? `${toTexDecimal(fmtComma(roundTo(Number(`${Math.floor(s.value3)}.${s.d1}${s.d2}0`), 2), 2))}\\,\\text{g}`
      : `${toTexDecimal(fmtComma(floorTo(s.value3, 2), 2))}\\,\\text{g}`

  // 4) inventar 2 decimales distintos (±0.01)
  const plus01 = `${toTexDecimal(fmtComma(s.rounded2 + 0.01, 2))}\\,\\text{g}`
  const minus01 = `${toTexDecimal(fmtComma(s.rounded2 - 0.01, 2))}\\,\\text{g}`

  const candidates: Option[] = [
    { value: correct, correct: true },
    { value: wrongTrunc, correct: false },
    { value: wrong1dec, correct: false },
    { value: fakeUp, correct: false },
    { value: choice([plus01, minus01]), correct: false },
  ]

  // Unique + shuffle
  const seen = new Set<string>()
  const unique: Option[] = []
  for (const o of candidates) {
    if (seen.has(o.value)) continue
    seen.add(o.value)
    unique.push(o)
  }

  // Relleno si faltara alguna (raro)
  while (unique.length < 5) {
    const extra = `${toTexDecimal(fmtComma(s.rounded2 + choice([-0.02, 0.02, 0.03, -0.03]), 2))}\\,\\text{g}`
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

export default function RedondeoPrecisionInstrumentoGame({
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
        correctAnswer: scenario.correct,
        question: {
          valueReported: fmtComma(scenario.value3, 3),
          precisionDecimals: 2,
          unit: "g",
        },
        computed: {
          rule: "Mirar la milésima (3er decimal). Si es ≥ 5, subir la centésima; si es < 5, se queda.",
          rounded: fmtComma(scenario.rounded2, 2),
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

  const valueTex = toTexDecimal(fmtComma(scenario.value3, 3))
  const intPart = Math.floor(scenario.value3).toString()
  const d1 = scenario.d1
  const d2 = scenario.d2
  const d3 = scenario.d3

  return (
    <MathProvider>
      <ExerciseShell
        title="Redondeo y precisión del instrumento"
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
                  title: "Entender qué significa “precisión de 2 decimales”",
                  detail: (
                    <span>
                      Se debe reportar el número con <b>dos cifras decimales</b> (centésimas).
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\text{Medición: } ${valueTex}\\,\\text{g}`} />
                      <MathTex block tex={`\\text{Reportar con 2 decimales: } \\_\\_ , \\_\\_\\,\\text{g}`} />
                    </div>
                  ),
                },
                {
                  title: "Mirar el 3er decimal (milésima)",
                  detail: (
                    <span>
                      Para redondear a 2 decimales, se mira el <b>tercer decimal</b>: si es{" "}
                      <MathTex tex={`\\ge 5`} />, sube la centésima; si es <MathTex tex={`<5`} />, se queda igual.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex
                        block
                        tex={`${intPart}{,}${d1}${d2}${d3}\\,\\text{g}`}
                      />
                      <MathTex
                        block
                        tex={`\\text{Como la milésima es } ${d3},\\ \\text{entonces } ${d3} ${d3 >= 5 ? "\\ge" : "<"} 5.`}
                      />
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg border bg-background p-2">
                          <div className="text-xs text-muted-foreground">Décima</div>
                          <div className="text-lg font-semibold">{d1}</div>
                        </div>
                        <div className="rounded-lg border bg-background p-2">
                          <div className="text-xs text-muted-foreground">Centésima</div>
                          <div className="text-lg font-semibold">{d2}</div>
                        </div>
                        <div className="rounded-lg border bg-background p-2">
                          <div className="text-xs text-muted-foreground">Milésima</div>
                          <div className="text-lg font-semibold">{d3}</div>
                        </div>
                      </div>
                    </div>
                  ),
                  tip: (
                    <span>
                      Ojo: <b>no</b> es “cortar” (truncar). Es <b>redondear</b>.
                    </span>
                  ),
                },
                {
                  title: "Escribir el valor reportado con 2 decimales",
                  detail: <span>Aplicamos la regla y dejamos exactamente 2 decimales.</span>,
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\text{Valor reportado} = ${scenario.correct}`} />
                    </div>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta final: <b>{scenario.correct}</b>.
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div className="text-sm">Un laboratorio registra la masa de una sustancia como:</div>
            <MathTex block tex={`${valueTex}\\,\\text{g}`} />
            <div className="text-sm">
              Si el instrumento mide con precisión de dos decimales, ¿qué valor debe reportarse?
            </div>
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
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
