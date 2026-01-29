"use client"

import { useMemo, useState } from "react"
import { Timer, ShieldCheck } from "lucide-react"

import { ExerciseShell } from "../base/ExerciseShell"
import { SolutionBox } from "../base/SolutionBox"
import { MathProvider, MathTex } from "../base/MathBlock"
import { ExerciseHud } from "../base/ExerciseHud"
import { OptionsGrid, type Option } from "../base/OptionsGrid"
import { useExerciseEngine } from "@/lib/exercises/useExerciseEngine"
import { useExerciseSubmission } from "@/lib/exercises/useExerciseSubmission"
import { useExerciseTimer } from "@/lib/exercises/useExerciseTimer"
import { computeTrophyGain, WRONG_PENALTY } from "@/lib/exercises/gamification"

/* ============================================================
   MULTIPLICACIONES AVANZADAS (3 CIFRAS) + MathJax
   ? 1 SOLO INTENTO (autocalifica al elegir opcion)
   ? Generacion algoritmica (sin hardcode)
   ? Procedimiento MUY detallado (por filas + llevadas + suma final)
   ? GAMIFICATION: trofeos + streak + timer + HUD
============================================================ */

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function coin(p = 0.5) {
  return Math.random() < p
}

function digits3(n: number) {
  const u = n % 10
  const d = Math.floor(n / 10) % 10
  const c = Math.floor(n / 100) % 10
  return { c, d, u, arr: [u, d, c] as const } // arr: [U,D,C]
}

type MulStep = {
  pos: "U" | "D" | "C"
  aDigit: number
  bDigit: number
  carryIn: number
  raw: number
  outDigit: number
  carryOut: number
}

type RowWork = {
  byDigit: number // el dígito del multiplicador que usamos en esta fila (unidades/decenas/centenas)
  shift: number // 0,1,2 (por 1, 10, 100)
  steps: MulStep[]
  rowValueNoShift: number // (a * byDigit) sin ceros agregados
  rowValueShifted: number // (a * byDigit * 10^shift)
  rowDigitsNoShift: number[] // dígitos de rowValueNoShift (de U a ...)
  rowDigitsShifted: number[] // dígitos de rowValueShifted (de U a ...)
}

type AddColumnStep = {
  col: number
  digits: Array<{ label: string; digit: number }>
  carryIn: number
  sum: number
  outDigit: number
  carryOut: number
}

function numberToDigits(n: number) {
  if (n === 0) return [0]
  const out: number[] = []
  let x = n
  while (x > 0) {
    out.push(x % 10)
    x = Math.floor(x / 10)
  }
  return out // U..highest
}

function mulRowWork(a: number, byDigit: number, shift: number): RowWork {
  const { arr: aDigits } = digits3(a) // [U,D,C]
  const positions: Array<"U" | "D" | "C"> = ["U", "D", "C"]

  const steps: MulStep[] = []
  let carry = 0
  const outDigits: number[] = []

  for (let i = 0; i < aDigits.length; i++) {
    const aDigit = aDigits[i]
    const carryIn = carry
    const raw = aDigit * byDigit + carryIn
    const outDigit = raw % 10
    const carryOut = Math.floor(raw / 10)

    steps.push({
      pos: positions[i],
      aDigit,
      bDigit: byDigit,
      carryIn,
      raw,
      outDigit,
      carryOut,
    })

    outDigits.push(outDigit)
    carry = carryOut
  }

  if (carry > 0) outDigits.push(carry)

  const rowValueNoShift = outDigits.reduce((acc, d, idx) => acc + d * 10 ** idx, 0)
  const rowValueShifted = rowValueNoShift * 10 ** shift

  return {
    byDigit,
    shift,
    steps,
    rowValueNoShift,
    rowValueShifted,
    rowDigitsNoShift: numberToDigits(rowValueNoShift),
    rowDigitsShifted: numberToDigits(rowValueShifted),
  }
}

function addWithCarry(
  terms: Array<{ label: string; value: number }>
): { sum: number; steps: AddColumnStep[] } {
  const digitsByTerm = terms.map(t => ({ label: t.label, digits: numberToDigits(t.value) }))
  const maxLen = Math.max(...digitsByTerm.map(t => t.digits.length))

  const steps: AddColumnStep[] = []
  const outDigits: number[] = []
  let carry = 0

  for (let col = 0; col < maxLen; col++) {
    const digs = digitsByTerm.map(t => ({
      label: t.label,
      digit: t.digits[col] ?? 0,
    }))

    const carryIn = carry
    const sum = carryIn + digs.reduce((acc, x) => acc + x.digit, 0)
    const outDigit = sum % 10
    const carryOut = Math.floor(sum / 10)

    steps.push({ col, digits: digs, carryIn, sum, outDigit, carryOut })
    outDigits.push(outDigit)
    carry = carryOut
  }

  while (carry > 0) {
    const carryIn = carry
    const sum = carryIn
    const outDigit = sum % 10
    const carryOut = Math.floor(sum / 10)
    steps.push({
      col: outDigits.length,
      digits: digitsByTerm.map(t => ({ label: t.label, digit: 0 })),
      carryIn,
      sum,
      outDigit,
      carryOut,
    })
    outDigits.push(outDigit)
    carry = carryOut
  }

  const total = outDigits.reduce((acc, d, idx) => acc + d * 10 ** idx, 0)
  return { sum: total, steps }
}

function countCarries(rows: RowWork[]) {
  return rows.reduce((acc, r) => acc + r.steps.filter(s => s.carryOut > 0).length, 0)
}

function generateCase() {
  // Queremos 3 cifras y que sea “avanzado”: que haya llevadas reales.
  for (let tries = 0; tries < 240; tries++) {
    const a = randInt(123, 987)
    const b = randInt(123, 987)

    // evitar cosas muy "fáciles" (terminar en 0)
    if (a % 10 === 0 || b % 10 === 0) continue

    const { arr: bDigits } = digits3(b) // [U,D,C]
    const rows = [
      mulRowWork(a, bDigits[0], 0), // unidades
      mulRowWork(a, bDigits[1], 1), // decenas (x10)
      mulRowWork(a, bDigits[2], 2), // centenas (x100)
    ]

    const carries = countCarries(rows)
    if (carries < 4) continue // aseguramos dificultad (varias llevadas)

    const correct = a * b

    // evitar resultados demasiado cortos (poco interesante)
    if (correct < 40000) continue

    return { a, b, rows, correct }
  }

  // fallback sólido
  const a = 483
  const b = 276
  const { arr: bDigits } = digits3(b)
  const rows = [mulRowWork(a, bDigits[0], 0), mulRowWork(a, bDigits[1], 1), mulRowWork(a, bDigits[2], 2)]
  const correct = a * b
  return { a, b, rows, correct }
}

/* =========================
   DISTRACTORES “REALES”
========================= */
function computeNoCarryMistake(a: number, b: number) {
  // error típico: “sumar columnas sin pasar llevadas”
  const A = digits3(a).arr // [U,D,C]
  const B = digits3(b).arr // [U,D,C]

  // columnas k = 0..4 (porque 3x3)
  const s: number[] = [0, 0, 0, 0, 0]
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      s[i + j] += A[i] * B[j]
    }
  }

  // NO se pasa carry: solo me quedo con el dígito de cada columna
  let out = 0
  for (let k = 0; k < s.length; k++) {
    out += (s[k] % 10) * 10 ** k
  }
  return out
}

function computeNoShiftMistake(a: number, b: number) {
  // error típico: multiplicar por dígitos pero OLVIDAR el “corrimiento” de decenas/centenas
  const { arr: bDigits } = digits3(b) // [U,D,C]
  return a * bDigits[0] + a * bDigits[1] + a * bDigits[2]
}

function jitter(n: number) {
  // pequeño ruido (error de suma / carry)
  const mag = coin(0.5) ? 9 : 99
  const delta = randInt(1, mag)
  return coin(0.5) ? n + delta : Math.max(0, n - delta)
}

function generateOptions(correct: number, a: number, b: number): Option[] {
  const set = new Set<number>()

  const m1 = computeNoShiftMistake(a, b)
  const m2 = computeNoCarryMistake(a, b)

  if (m1 !== correct) set.add(m1)
  if (m2 !== correct) set.add(m2)

  // otros distractores: resultado casi correcto (muy común en multiplicaciones largas)
  while (set.size < 3) {
    const cand = jitter(correct)
    if (cand !== correct) set.add(cand)
  }

  const distractors = Array.from(set).slice(0, 3)
  return [
    { value: String(correct), correct: true },
    ...distractors.map(v => ({ value: String(v), correct: false })),
  ].sort(() => Math.random() - 0.5)
}

/* =========================
   TEX HELPERS (bonito)
========================= */
function padLeft(s: string, len: number) {
  return s.length >= len ? s : " ".repeat(len - s.length) + s
}
function padTeX(s: string, len: number) {
  // para alinear visualmente en MathJax: rellenamos con \phantom{0}
  if (s.length >= len) return s
  const missing = len - s.length
  return `${"\\phantom{0}".repeat(missing)}${s}`
}
function mulLayoutTeX(a: number, b: number, rows: RowWork[], total: number) {
  const aS = String(a)
  const bS = String(b)
  const r0 = String(rows[0].rowValueNoShift) // x unidades
  const r1 = String(rows[1].rowValueShifted) // x decenas (ya corrido)
  const r2 = String(rows[2].rowValueShifted) // x centenas (ya corrido)
  const tS = String(total)

  const maxLen = Math.max(aS.length, bS.length + 1, r0.length, r1.length, r2.length, tS.length)
  const aP = padTeX(aS, maxLen)
  const bP = padTeX(bS, maxLen - 1)
  const r0P = padTeX(r0, maxLen)
  const r1P = padTeX(r1, maxLen)
  const r2P = padTeX(r2, maxLen)
  const tP = padTeX(tS, maxLen)

  return String.raw`
\begin{array}{r}
${aP}\\
\times\ ${bP}\\
\hline
${r0P}\\
${r1P}\\
${r2P}\\
\hline
${tP}
\end{array}
`.trim()
}

function posLabel(pos: "U" | "D" | "C") {
  if (pos === "U") return "Unidades"
  if (pos === "D") return "Decenas"
  return "Centenas"
}

/* ============================================================
   COMPONENT
============================================================ */
export default function MultiplicacionesAvanzadas01({
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

  const ejercicio = useMemo(() => {
    const { a, b, rows, correct } = generateCase()

    // suma final (para explicar la suma de filas con llevadas también)
    const add = addWithCarry([
      { label: `Fila U (×${digits3(b).u})`, value: rows[0].rowValueShifted },
      { label: `Fila D (×${digits3(b).d}0)`, value: rows[1].rowValueShifted },
      { label: `Fila C (×${digits3(b).c}00)`, value: rows[2].rowValueShifted },
    ])

    const options = generateOptions(correct, a, b)
    const layoutTeX = mulLayoutTeX(a, b, rows, correct)

    return { a, b, rows, correct, options, add, layoutTeX }
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
        correctAnswer: String(ejercicio.correct),
        latex: String.raw`${ejercicio.a}\times ${ejercicio.b}`,
        options: ejercicio.options.map(o => o.value),
        extra: {
          a: ejercicio.a,
          b: ejercicio.b,
          correct: ejercicio.correct,
          time_seconds: Math.floor(timeSeconds),
          trophy_preview: computeTrophyGain(timeSeconds),
        },
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  const { a, b, rows } = ejercicio
  const aD = digits3(a)
  const bD = digits3(b)

  return (
    <MathProvider>
      <ExerciseShell
        title="Multiplicaciones avanzadas (3 cifras)"
        prompt="Elige la alternativa correcta: el resultado de la multiplicación es..."
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <div className="space-y-4 text-sm leading-relaxed">
              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Paso 0 - Qué estamos buscando
                </div>
                <p className="text-muted-foreground">
                  Debemos calcular <span className="font-semibold">{a}</span> ×{" "}
                  <span className="font-semibold">{b}</span> usando el método clásico (por filas),
                  cuidando <span className="font-semibold">llevadas</span> y el{" "}
                  <span className="font-semibold">corrimiento</span> (decenas = “un cero”, centenas = “dos ceros”).
                </p>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2 flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  Paso 1 - Alineación correcta (clave)
                </div>

                <div className="mt-2 rounded-lg border bg-background p-3">
                  <p className="text-muted-foreground mb-2">
                    Colocamos unidades debajo de unidades, decenas debajo de decenas y centenas debajo de centenas:
                  </p>
                  <MathTex
                    block
                    tex={String.raw`\begin{array}{r}
${padTeX(String(a), 6)}\\
\times\ ${padTeX(String(b), 5)}\\
\hline
\end{array}`}
                  />
                </div>

                <div className="mt-3 rounded-lg border bg-background p-3">
                  <div className="font-semibold mb-1">Tip de oro</div>
                  <p className="text-muted-foreground">
                    Si multiplicas por el dígito de <b>decenas</b>, el resultado va{" "}
                    <b>corrida 1 lugar</b> (equivale a ×10). Si es <b>centenas</b>, va{" "}
                    <b>corrida 2 lugares</b> (equivale a ×100).
                  </p>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2">Paso 2 - Identificamos dígitos</div>

                <div className="mt-2 overflow-x-auto">
                  <table className="border w-full text-center text-xs">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border py-2">Número</th>
                        <th className="border py-2">Centenas</th>
                        <th className="border py-2">Decenas</th>
                        <th className="border py-2">Unidades</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border py-2 font-semibold">{a}</td>
                        <td className="border py-2">{aD.c}</td>
                        <td className="border py-2">{aD.d}</td>
                        <td className="border py-2">{aD.u}</td>
                      </tr>
                      <tr>
                        <td className="border py-2 font-semibold">{b}</td>
                        <td className="border py-2">{bD.c}</td>
                        <td className="border py-2">{bD.d}</td>
                        <td className="border py-2">{bD.u}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-muted-foreground mt-3">
                  Vamos a multiplicar <b>{a}</b> por cada dígito de <b>{b}</b>: primero unidades ({bD.u}), luego
                  decenas ({bD.d}) y luego centenas ({bD.c}).
                </p>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2">Paso 3 - Filas de multiplicación (con llevadas)</div>
                <p className="text-muted-foreground">
                  En cada fila, multiplicamos de <b>derecha a izquierda</b> (U → D → C) y{" "}
                  <b>si pasa de 9, llevamos</b> a la siguiente columna.
                </p>

                <div className="mt-3 space-y-4">
                  {rows.map((row, idx) => {
                    const label =
                      idx === 0
                        ? `Fila 1 (unidades): × ${row.byDigit}`
                        : idx === 1
                          ? `Fila 2 (decenas): × ${row.byDigit}0  (corrimiento 1)`
                          : `Fila 3 (centenas): × ${row.byDigit}00 (corrimiento 2)`

                    return (
                      <div key={idx} className="rounded-xl border bg-background p-4">
                        <div className="font-semibold mb-2">{label}</div>

                        <div className="text-muted-foreground mb-3">
                          Multiplicamos <b>{a}</b> × <b>{row.byDigit}</b> y anotamos el resultado. Si es fila de decenas/centenas,
                          luego lo corremos (×10 / ×100).
                        </div>

                        <div className="overflow-x-auto">
                          <table className="border w-full text-center text-xs">
                            <thead>
                              <tr className="bg-muted">
                                <th className="border py-2">Columna</th>
                                <th className="border py-2">Dígito de {a}</th>
                                <th className="border py-2">× {row.byDigit}</th>
                                <th className="border py-2">+ Llevo</th>
                                <th className="border py-2">= Total</th>
                                <th className="border py-2">Escribo</th>
                                <th className="border py-2">Nuevo llevo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.steps.map((s, i) => (
                                <tr key={i}>
                                  <td className="border py-2 font-semibold">{posLabel(s.pos)}</td>
                                  <td className="border py-2">{s.aDigit}</td>
                                  <td className="border py-2">{s.aDigit * s.bDigit}</td>
                                  <td className="border py-2">{s.carryIn}</td>
                                  <td className="border py-2 font-semibold">{s.raw}</td>
                                  <td className="border py-2 font-semibold">{s.outDigit}</td>
                                  <td className="border py-2">{s.carryOut}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-3 rounded-lg border bg-card p-3">
                          <div className="font-semibold mb-1">Resultado de esta fila</div>
                          <p className="text-muted-foreground">
                            Sin corrimiento: <b>{a}</b> × <b>{row.byDigit}</b> ={" "}
                            <span className="font-semibold">{row.rowValueNoShift}</span>
                          </p>
                          <p className="text-muted-foreground">
                            Con corrimiento (si aplica):{" "}
                            <span className="font-semibold">{row.rowValueShifted}</span>
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2">Paso 4 - Sumamos las filas (¡también con llevadas!)</div>
                <p className="text-muted-foreground">
                  Ahora sumamos los tres resultados parciales. Si en una columna la suma pasa de 9,{" "}
                  <b>llevamos</b> a la siguiente columna.
                </p>

                <div className="mt-3 rounded-lg border bg-background p-3">
                  <MathTex block tex={ejercicio.layoutTeX} />
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="border w-full text-center text-xs">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border py-2">Columna (10^k)</th>
                        <th className="border py-2">Dígitos sumados</th>
                        <th className="border py-2">Llevo</th>
                        <th className="border py-2">Suma</th>
                        <th className="border py-2">Escribo</th>
                        <th className="border py-2">Nuevo llevo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ejercicio.add.steps.map((st, i) => (
                        <tr key={i}>
                          <td className="border py-2 font-mono">
                            k={st.col} ({10 ** st.col})
                          </td>
                          <td className="border py-2">
                            <div className="flex flex-wrap gap-2 justify-center">
                              {st.digits.map((d, j) => (
                                <span
                                  key={j}
                                  className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 font-mono"
                                >
                                  <span className="opacity-70">{d.label.split(" ")[0]}:</span>
                                  <span className="font-semibold">{d.digit}</span>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="border py-2">{st.carryIn}</td>
                          <td className="border py-2 font-semibold">{st.sum}</td>
                          <td className="border py-2 font-semibold">{st.outDigit}</td>
                          <td className="border py-2">{st.carryOut}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 rounded-lg border bg-background p-3">
                  <div className="font-semibold mb-1">Resultado final</div>
                  <p className="text-muted-foreground">
                    Entonces, <b>{a}</b> × <b>{b}</b> ={" "}
                    <span className="font-semibold">{ejercicio.correct}</span>.
                  </p>
                  <p className="text-muted-foreground mt-2">
                    <b>Chequeo rápido:</b> si te equivocas por poco, casi siempre fue por (1) una{" "}
                    <b>llevada</b> mal puesta o (2) olvidar el <b>corrimiento</b> en decenas/centenas.
                  </p>
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground">Operación</div>
          <div className="mt-2 rounded-lg border bg-background p-3">
            <MathTex block tex={String.raw`${a}\times ${b}`} />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            (Recuerda: unidades → decenas → centenas, y cada fila se corre.)
          </div>
        </div>

        <OptionsGrid
          options={ejercicio.options}
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
