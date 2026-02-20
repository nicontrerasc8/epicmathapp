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
function roundTo(n: number, d: number) {
  const p = Math.pow(10, d)
  return Math.round(n * p) / p
}

function texNumComma(n: number, maxDecimals = 2) {
  const s = n.toFixed(maxDecimals).replace(/\.?0+$/, "")
  return s.replace(".", "{,}")
}

function texScientific(m: number, e: number, maxDecimals = 2) {
  return `${texNumComma(m, maxDecimals)} \\times 10^{${e}}`
}

function normalizeScientific(m: number, e: number, decimals = 2) {
  let mm = m
  let ee = e

  while (mm >= 10) {
    mm /= 10
    ee += 1
  }
  while (mm > 0 && mm < 1) {
    mm *= 10
    ee -= 1
  }

  mm = roundTo(mm, decimals)

  // si el redondeo empuja a 10, renormaliza
  if (mm >= 10) {
    mm /= 10
    ee += 1
    mm = roundTo(mm, decimals)
  }

  return { m: mm, e: ee }
}

/* =========================
   GENERADOR (tipo Pregunta 5)
   (a×10^e1) + (b×10^e2) => notación científica
========================= */

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  // elegimos exponente "principal" y una diferencia 1 o 2 para que sea estilo colegio
  const eBig = -randInt(1, 6) // -1..-6
  const diff = choice([1, 2]) // como -2 y -3 (diff=1)
  const eSmall = eBig - diff

  const a = randInt(2, 9) // mantisa entera como la imagen
  const b = randInt(1, 9)

  // sumamos llevando a exponente común (el más pequeño / más negativo)
  const commonE = Math.min(eBig, eSmall) // eSmall
  const d1 = eBig - commonE // diff
  const d2 = eSmall - commonE // 0
  const A = a * Math.pow(10, d1)
  const B = b * Math.pow(10, d2)
  const rawMantissa = A + B
  const rawExponent = commonE

  const norm = normalizeScientific(rawMantissa, rawExponent, 2)
  const correct = texScientific(norm.m, norm.e, 2)

  return {
    a,
    b,
    e1: eBig,
    e2: eSmall,
    diff,
    commonE,
    convertedA: A, // a×10^eBig => A×10^commonE
    convertedB: B, // b×10^eSmall => B×10^commonE
    rawMantissa,
    rawExponent,
    normM: norm.m,
    normE: norm.e,
    correct,
  }
}

/* =========================
   OPCIONES (A-E estilo imagen)
   - correcta (normalizada)
   - error típico: convertir con un cero de más (6,02×10^-2)
   - equivalentes pero NO normalizadas: 0,62×10^-1 y 62×10^-3
   - error típico: sumar exponentes (8×10^-5)
========================= */

function generateOptions(s: Scenario): Option[] {
  const correct = s.correct

  // ❌ Error: al pasar el término de exponente menor a e1, se corre un cero de más
  // correcto sería: b×10^(e2) = (b×10^(-diff))×10^(e1)
  // error:         (b×10^(-(diff+1)))×10^(e1)
  const wrongShiftMantissa = roundTo(s.a + s.b * Math.pow(10, -(s.diff + 1)), 2)
  const wrongShift = texScientific(wrongShiftMantissa, s.e1, 2)

  // ❌ No científica (mantisa < 1) equivalente
  const notSciSmall = texScientific(roundTo(s.normM / 10, 2), s.normE + 1, 2) // 0,62×10^-1

  // ❌ No científica (mantisa >= 10) equivalente
  const notSciBig = texScientific(roundTo(s.normM * 10, 2), s.normE - 1, 2) // 62×10^-3

  // ❌ Error: sumar exponentes (como 8×10^-5 en la imagen)
  const wrongAddExpNorm = normalizeScientific(s.a + s.b, s.e1 + s.e2, 2)
  const wrongAddExponents = texScientific(wrongAddExpNorm.m, wrongAddExpNorm.e, 2)

  const all: Option[] = [
    { value: correct, correct: true },
    { value: wrongShift, correct: false },
    { value: notSciSmall, correct: false },
    { value: notSciBig, correct: false },
    { value: wrongAddExponents, correct: false },
  ]

  // evita duplicados raros
  const seen = new Set<string>()
  const unique: Option[] = []
  for (const o of all) {
    if (seen.has(o.value)) continue
    seen.add(o.value)
    unique.push(o)
  }

  // relleno si quedaran < 5 por coincidencia
  while (unique.length < 5) {
    const w = normalizeScientific(s.normM, s.normE + randInt(-3, 3), 2)
    const tex = texScientific(w.m, w.e, 2)
    if (tex !== correct && !seen.has(tex)) {
      unique.push({ value: tex, correct: false })
      seen.add(tex)
    }
  }

  return unique.sort(() => Math.random() - 0.5)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function Ej05SumaNotacionCientifica({
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
          a: scenario.a,
          b: scenario.b,
          e1: scenario.e1,
          e2: scenario.e2,
        },
        computed: {
          commonExponent: scenario.commonE,
          converted: {
            A: scenario.convertedA,
            B: scenario.convertedB,
          },
          raw: {
            mantissa: scenario.rawMantissa,
            exponent: scenario.rawExponent,
          },
          normalized: {
            m: scenario.normM,
            e: scenario.normE,
          },
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

  const exprTex = `(${scenario.a} \\times 10^{${scenario.e1}}) + (${scenario.b} \\times 10^{${scenario.e2}})`

  return (
    <MathProvider>
      <ExerciseShell
        title="Ejercicio 05 – Suma en notación científica"
        prompt="El resultado, expresado en notación científica, es:"
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
                  title: "Igualar exponentes",
                  detail: (
                    <span>
                      Para sumar, primero llevamos ambos términos al <b>mismo exponente</b>.
                      Usamos el más pequeño (más negativo).
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={exprTex} />
                      <MathTex
                        block
                        tex={`\\text{Exponente común} = ${scenario.commonE}`}
                      />
                      <MathTex
                        block
                        tex={`${scenario.a} \\times 10^{${scenario.e1}} = ${scenario.convertedA} \\times 10^{${scenario.commonE}}`}
                      />
                      <MathTex
                        block
                        tex={`${scenario.b} \\times 10^{${scenario.e2}} = ${scenario.convertedB} \\times 10^{${scenario.commonE}}`}
                      />
                    </div>
                  ),
                },
                {
                  title: "Sumar mantisas con el mismo exponente",
                  detail: <span>Ahora sí se suman los números delante de la potencia de 10.</span>,
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex
                        block
                        tex={`(${scenario.convertedA} + ${scenario.convertedB}) \\times 10^{${scenario.commonE}} = ${scenario.rawMantissa} \\times 10^{${scenario.rawExponent}}`}
                      />
                    </div>
                  ),
                  tip: (
                    <span>
                      Error típico: sumar exponentes (eso se hace en multiplicación, <b>no</b> en suma).
                    </span>
                  ),
                },
                {
                  title: "Normalizar a notación científica",
                  detail: (
                    <span>
                      En notación científica, la mantisa debe cumplir:{" "}
                      <b><MathTex tex={`1 \\le m < 10`} /></b>.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\text{Resultado normalizado} = ${scenario.correct}`} />
                      <MathTex block tex={`1 \\le ${texNumComma(scenario.normM)} < 10`} />
                    </div>
                  ),
                  tip: (
                    <span>
                      Valores como <MathTex tex={`0,62 \\times 10^{-1}`} /> o{" "}
                      <MathTex tex={`62 \\times 10^{-3}`} /> pueden ser equivalentes,
                      pero <b>no</b> están en notación científica.
                    </span>
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
          <div className="rounded-lg border bg-background p-3">
            <MathTex block tex={exprTex} />
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
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
