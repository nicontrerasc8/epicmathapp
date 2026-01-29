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
   RESTAS AVANZADAS (3 CIFRAS) + Procedimiento súper detallado
   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ Generación algorítmica (sin hardcode)
   ✅ Énfasis fuerte en “préstamo” (reagrupación)
   ✅ GAMIFICATION: trofeos + streak + timer + HUD
============================================================ */

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function digits3(n: number) {
  const s = String(n).padStart(3, "0")
  return { h: Number(s[0]), t: Number(s[1]), u: Number(s[2]) }
}

type BorrowTrace = {
  a: number
  b: number
  result: number
  // dígitos originales
  ah: number
  at: number
  au: number
  bh: number
  bt: number
  bu: number
  // “a” luego de pedir préstamos (estado intermedio por columnas)
  // unidades
  auBorrowedFromTens: boolean
  atAfterUnits: number
  auAfterUnits: number
  // decenas
  atBorrowedFromHundreds: boolean
  ahAfterTens: number
  atAfterTens: number
  // cálculos por columna
  colUnits: number
  colTens: number
  colHundreds: number
  // si hubo préstamos
  anyBorrow: boolean
  borrowUnits: boolean
  borrowTens: boolean
}

function computeBorrowTrace(a: number, b: number): BorrowTrace {
  const { h: ah, t: at, u: au } = digits3(a)
  const { h: bh, t: bt, u: bu } = digits3(b)

  // Unidades
  const borrowUnits = au < bu
  const auAfterUnits = borrowUnits ? au + 10 : au
  const atAfterUnits = borrowUnits ? at - 1 : at
  const colUnits = auAfterUnits - bu

  // Decenas (ojo: usamos atAfterUnits, porque quizá ya “bajó” por el préstamo de unidades)
  const borrowTens = atAfterUnits < bt
  const atAfterTens = borrowTens ? atAfterUnits + 10 : atAfterUnits
  const ahAfterTens = borrowTens ? ah - 1 : ah
  const colTens = atAfterTens - bt

  // Centenas
  const colHundreds = ahAfterTens - bh

  const result = colHundreds * 100 + colTens * 10 + colUnits

  return {
    a,
    b,
    result,
    ah,
    at,
    au,
    bh,
    bt,
    bu,
    auBorrowedFromTens: borrowUnits,
    atAfterUnits,
    auAfterUnits,
    atBorrowedFromHundreds: borrowTens,
    ahAfterTens,
    atAfterTens,
    colUnits,
    colTens,
    colHundreds,
    anyBorrow: borrowUnits || borrowTens,
    borrowUnits,
    borrowTens,
  }
}

function isValidAdvanced(trace: BorrowTrace) {
  // Queremos “restas avanzadas”: al menos 1 préstamo (mejor si 2) y resultado de 3 cifras o 2 cifras válido.
  if (trace.a <= trace.b) return false
  if (!trace.anyBorrow) return false
  if (trace.colHundreds < 0) return false // evita casos raros
  // evita ejercicios demasiado triviales (p.ej., b muy pequeño)
  if (trace.b < 120) return false
  // evita resultados 000
  if (trace.result <= 0) return false
  return true
}

function generateAdvancedSubtraction(): BorrowTrace {
  for (let tries = 0; tries < 400; tries++) {
    const a = randInt(200, 999)
    const b = randInt(100, 899)
    if (b >= a) continue

    const t = computeBorrowTrace(a, b)
    if (isValidAdvanced(t)) return t
  }

  // fallback garantizado con préstamos
  return computeBorrowTrace(502, 287)
}

function asVerticalSubtractionTeX(a: number, b: number) {
  // Formato vertical con MathJax
  return String.raw`\begin{array}{r}
${String(a).padStart(3, "0")}\\
-\ ${String(b).padStart(3, "0")}\\
\hline
\end{array}`
}

function asFullVerticalWithResultTeX(a: number, b: number, r: number) {
  return String.raw`\begin{array}{r}
${String(a).padStart(3, "0")}\\
-\ ${String(b).padStart(3, "0")}\\
\hline
${String(r).padStart(3, "0")}
\end{array}`
}

function makeOptions(correct: number): Option[] {
  const set = new Set<number>()
  set.add(correct)

  // distractores típicos: errores de préstamo o suma/resta de 10/100
  const candidates = [
    correct + 10,
    correct - 10,
    correct + 100,
    correct - 100,
    correct + 1,
    correct - 1,
    correct + 9,
    correct - 9,
  ]
    .map(x => clamp(x, 0, 999))
    .filter(x => x !== correct)

  // mete algunos candidatos
  for (let i = 0; i < candidates.length && set.size < 4; i++) set.add(candidates[i])

  // si faltan, rellena con offsets random
  while (set.size < 4) {
    const off = choice([2, 3, 4, 5, 6, 7, 8, 11, 12, 13, 15, 20, 25, 30, 50])
    const sign = Math.random() < 0.5 ? -1 : 1
    const cand = clamp(correct + sign * off, 0, 999)
    if (cand !== correct) set.add(cand)
  }

  const arr = Array.from(set).slice(0, 4)
  const options: Option[] = arr.map(v => ({
    value: String(v),
    correct: v === correct,
  }))

  return options.sort(() => Math.random() - 0.5)
}

export default function RestasAvanzadas3Cifras01({
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

  // ejercicio
  const [nonce, setNonce] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)

  // timer
  const { elapsed, startedAtRef } = useExerciseTimer(engine.canAnswer, nonce)

  const ejercicio = useMemo(() => {
    const trace = generateAdvancedSubtraction()
    const correct = trace.result
    const options = makeOptions(correct)
    const tex = asVerticalSubtractionTeX(trace.a, trace.b)
    const texSolved = asFullVerticalWithResultTeX(trace.a, trace.b, trace.result)
    return { trace, correct, options, tex, texSolved }
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
        latex: ejercicio.tex,
        options: ejercicio.options.map(o => o.value),
        extra: {
          a: ejercicio.trace.a,
          b: ejercicio.trace.b,
          result: ejercicio.trace.result,
          borrow_units: ejercicio.trace.borrowUnits,
          borrow_tens: ejercicio.trace.borrowTens,
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

  const t = ejercicio.trace

  return (
    <MathProvider>
      <ExerciseShell
        title="Restas avanzadas (3 cifras)"
        prompt="Elige la alternativa correcta: el resultado de la resta es..."
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
                  Paso 0 — Qué vamos a hacer (sin saltarnos nada)
                </div>
                <p className="text-muted-foreground">
                  Vamos a restar <span className="font-semibold">{t.b}</span> a{" "}
                  <span className="font-semibold">{t.a}</span> usando columnas:{" "}
                  <span className="font-semibold">centenas</span>,{" "}
                  <span className="font-semibold">decenas</span> y{" "}
                  <span className="font-semibold">unidades</span>.
                  <br />
                  Lo más importante es el <span className="font-semibold">préstamo</span> (reagrupación): si arriba es
                  menor que abajo en una columna, “pedimos 1” a la columna de la izquierda, que se convierte en{" "}
                  <span className="font-semibold">10</span> en la columna actual.
                </p>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2 flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  Paso 1 — Alinear bien los números (esto evita errores)
                </div>

                <p className="text-muted-foreground">
                  Siempre alineamos por la derecha (unidades con unidades, decenas con decenas, centenas con centenas).
                </p>

                <div className="mt-2 rounded-lg border bg-background p-3">
                  <MathTex block tex={ejercicio.tex} />
                </div>

                <div className="mt-3 rounded-lg border bg-background p-3">
                  <div className="font-semibold mb-1">Columnas</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg border bg-card p-2">
                      <div className="text-xs text-muted-foreground">Centenas</div>
                      <div className="font-mono font-semibold">{t.ah} y {t.bh}</div>
                    </div>
                    <div className="rounded-lg border bg-card p-2">
                      <div className="text-xs text-muted-foreground">Decenas</div>
                      <div className="font-mono font-semibold">{t.at} y {t.bt}</div>
                    </div>
                    <div className="rounded-lg border bg-card p-2">
                      <div className="text-xs text-muted-foreground">Unidades</div>
                      <div className="font-mono font-semibold">{t.au} y {t.bu}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2">Paso 2 — Unidades (la parte donde más se falla)</div>

                <div className="rounded-lg border bg-background p-3">
                  <div className="font-semibold mb-1">Comparamos unidades</div>
                  <p className="text-muted-foreground">
                    Arriba: <span className="font-mono font-semibold">{t.au}</span> &nbsp;|&nbsp; Abajo:{" "}
                    <span className="font-mono font-semibold">{t.bu}</span>
                  </p>

                  {t.borrowUnits ? (
                    <div className="mt-2 rounded-lg border bg-card p-3">
                      <div className="font-semibold">✅ Hay préstamo en unidades</div>
                      <p className="text-muted-foreground">
                        Como <span className="font-mono font-semibold">{t.au}</span> es menor que{" "}
                        <span className="font-mono font-semibold">{t.bu}</span>, pedimos{" "}
                        <span className="font-semibold">1 decena</span>.
                        <br />
                        Eso convierte las unidades en <span className="font-semibold">{t.au} + 10 = {t.auAfterUnits}</span>{" "}
                        y la decena de arriba baja en 1:{" "}
                        <span className="font-semibold">{t.at} → {t.atAfterUnits}</span>.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2 rounded-lg border bg-card p-3">
                      <div className="font-semibold">✅ No hay préstamo en unidades</div>
                      <p className="text-muted-foreground">
                        Como <span className="font-mono font-semibold">{t.au}</span> ≥{" "}
                        <span className="font-mono font-semibold">{t.bu}</span>, restamos directo.
                      </p>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <span className="font-semibold">Unidades:</span>
                    <span className="inline-block px-2 py-1 rounded bg-muted font-mono">
                      {t.auAfterUnits} − {t.bu} = {t.colUnits}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2">Paso 3 — Decenas (ojo: usamos la decena “actualizada”)</div>

                <div className="rounded-lg border bg-background p-3">
                  <div className="font-semibold mb-1">Decena de arriba después del paso anterior</div>
                  <p className="text-muted-foreground">
                    La decena de arriba ahora es:{" "}
                    <span className="font-mono font-semibold">{t.atAfterUnits}</span> (porque tal vez bajó por el préstamo
                    de unidades).
                    <br />
                    Abajo en decenas es: <span className="font-mono font-semibold">{t.bt}</span>
                  </p>

                  {t.borrowTens ? (
                    <div className="mt-2 rounded-lg border bg-card p-3">
                      <div className="font-semibold">✅ Hay préstamo en decenas</div>
                      <p className="text-muted-foreground">
                        Como <span className="font-mono font-semibold">{t.atAfterUnits}</span> es menor que{" "}
                        <span className="font-mono font-semibold">{t.bt}</span>, pedimos{" "}
                        <span className="font-semibold">1 centena</span>.
                        <br />
                        La decena se vuelve <span className="font-semibold">{t.atAfterUnits} + 10 = {t.atAfterTens}</span>{" "}
                        y la centena de arriba baja en 1:{" "}
                        <span className="font-semibold">{t.ah} → {t.ahAfterTens}</span>.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2 rounded-lg border bg-card p-3">
                      <div className="font-semibold">✅ No hay préstamo en decenas</div>
                      <p className="text-muted-foreground">
                        Como <span className="font-mono font-semibold">{t.atAfterUnits}</span> ≥{" "}
                        <span className="font-mono font-semibold">{t.bt}</span>, restamos directo.
                      </p>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <span className="font-semibold">Decenas:</span>
                    <span className="inline-block px-2 py-1 rounded bg-muted font-mono">
                      {t.atAfterTens} − {t.bt} = {t.colTens}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2">Paso 4 — Centenas (ya con la centena “actualizada”)</div>

                <div className="rounded-lg border bg-background p-3">
                  <p className="text-muted-foreground">
                    Ahora usamos la centena de arriba <span className="font-mono font-semibold">{t.ahAfterTens}</span> (porque
                    tal vez bajó por el préstamo de decenas) y restamos la centena de abajo{" "}
                    <span className="font-mono font-semibold">{t.bh}</span>.
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="font-semibold">Centenas:</span>
                    <span className="inline-block px-2 py-1 rounded bg-muted font-mono">
                      {t.ahAfterTens} − {t.bh} = {t.colHundreds}
                    </span>
                  </div>

                  <div className="mt-3 rounded-lg border bg-card p-3">
                    <div className="font-semibold mb-1">Armamos el resultado por columnas</div>
                    <p className="text-muted-foreground">
                      Centenas: <span className="font-mono font-semibold">{t.colHundreds}</span>,&nbsp;
                      Decenas: <span className="font-mono font-semibold">{t.colTens}</span>,&nbsp;
                      Unidades: <span className="font-mono font-semibold">{t.colUnits}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2">Paso 5 — Respuesta final (y chequeo rápido)</div>

                <div className="mt-2 rounded-lg border bg-background p-3">
                  <MathTex block tex={ejercicio.texSolved} />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm font-semibold">Respuesta:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">
                    {String(t.result).padStart(3, "0")}
                  </span>
                </div>

                <div className="mt-3 rounded-lg border bg-background p-3">
                  <div className="font-semibold mb-1">Chequeo (para estar 100% seguro)</div>
                  <p className="text-muted-foreground">
                    Si sumas <span className="font-semibold">{t.result}</span> + <span className="font-semibold">{t.b}</span>{" "}
                    debe darte <span className="font-semibold">{t.a}</span>.
                    <br />
                    (Este chequeo es brutal para cazar errores de préstamo.)
                  </p>
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground">Resta (3 cifras)</div>
          <div className="mt-2">
            <MathTex block tex={ejercicio.tex} />
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
