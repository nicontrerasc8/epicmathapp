'use client'

import { useMemo, useState } from 'react'
import { Timer, ShieldCheck } from 'lucide-react'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { MathProvider, MathTex } from '../base/MathBlock'
import { ExerciseHud } from '../base/ExerciseHud'
import { OptionsGrid, type Option } from '../base/OptionsGrid'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { useExerciseSubmission } from '@/lib/exercises/useExerciseSubmission'
import { useExerciseTimer } from '@/lib/exercises/useExerciseTimer'
import { computeTrophyGain, WRONG_PENALTY } from '@/lib/exercises/gamification'

/* ============================================================
   SUMAS AVANZADAS (3 cifras) + MathJax
   ? 1 SOLO INTENTO (autocalifica al elegir opcion)
   ? Generacion algoritmica (sin hardcode)
   ? Procedimiento MUY detallado (llevadas paso a paso)
   ? GAMIFICATION: trofeos + streak + timer + HUD
============================================================ */

/* =========================
   HELPERS
========================= */
function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

/* =========================
   MODELO DEL EJERCICIO
========================= */
type Problem = {
  a: number
  b: number
  sum: number
  digits: {
    aH: number
    aT: number
    aU: number
    bH: number
    bT: number
    bU: number
  }
  carries: {
    cU: 0 | 1 // llevada de Unidades -> Decenas
    cT: 0 | 1 // llevada de Decenas -> Centenas
    cH: 0 | 1 // llevada de Centenas -> Miles (si ocurre)
  }
  steps: {
    uTotal: number
    uDigit: number
    tTotal: number
    tDigit: number
    hTotal: number
    hDigit: number
    thousands: number
  }
}

function split3(n: number) {
  const u = n % 10
  const t = Math.floor((n % 100) / 10)
  const h = Math.floor(n / 100)
  return { h, t, u }
}

/**
 * Genera una suma de 3 cifras + 3 cifras con “dificultad real”:
 * - al menos 1 llevada (idealmente 2)
 * - evita casos súper simples
 */
function buildProblem(): Problem {
  for (let tries = 0; tries < 300; tries++) {
    // Evitamos centenas muy bajas para que “se sienta” de 3 cifras.
    const a = randInt(120, 987)
    const b = randInt(120, 987)

    const da = split3(a)
    const db = split3(b)

    // Unidades
    const uTotal = da.u + db.u
    const cU: 0 | 1 = uTotal >= 10 ? 1 : 0
    const uDigit = uTotal % 10

    // Decenas (incluye la llevada de unidades)
    const tTotal = da.t + db.t + cU
    const cT: 0 | 1 = tTotal >= 10 ? 1 : 0
    const tDigit = tTotal % 10

    // Centenas (incluye la llevada de decenas)
    const hTotal = da.h + db.h + cT
    const cH: 0 | 1 = hTotal >= 10 ? 1 : 0
    const hDigit = hTotal % 10
    const thousands = Math.floor(hTotal / 10) // 0 o 1 (a lo mucho)

    const sum = a + b

    // Restricciones de “calidad”
    const carryCount = cU + cT + cH
    const tooEasy = carryCount === 0
    const tooTrivial = (da.u + db.u < 10) && (da.t + db.t < 10) && (da.h + db.h < 10)
    const tooBigJumps = sum < 300 // por si sale algo muy pequeño por azar

    // Queremos mínimo 1 llevada, ideal 2 (pero no obligamos 2 siempre)
    if (tooEasy || tooTrivial || tooBigJumps) continue

    // Bonus: preferimos 2 llevadas, pero aceptamos 1 si no aparece rápido
    if (tries < 140 && carryCount < 2) continue

    return {
      a,
      b,
      sum,
      digits: {
        aH: da.h,
        aT: da.t,
        aU: da.u,
        bH: db.h,
        bT: db.t,
        bU: db.u,
      },
      carries: { cU, cT, cH },
      steps: {
        uTotal,
        uDigit,
        tTotal,
        tDigit,
        hTotal,
        hDigit,
        thousands,
      },
    }
  }

  // Fallback (con 2 llevadas garantizadas)
  const a = 586
  const b = 479
  const da = split3(a)
  const db = split3(b)

  const uTotal = da.u + db.u
  const cU: 0 | 1 = 1
  const uDigit = uTotal % 10

  const tTotal = da.t + db.t + cU
  const cT: 0 | 1 = 1
  const tDigit = tTotal % 10

  const hTotal = da.h + db.h + cT
  const cH: 0 | 1 = hTotal >= 10 ? 1 : 0
  const hDigit = hTotal % 10
  const thousands = Math.floor(hTotal / 10)

  return {
    a,
    b,
    sum: a + b,
    digits: { aH: da.h, aT: da.t, aU: da.u, bH: db.h, bT: db.t, bU: db.u },
    carries: { cU, cT, cH },
    steps: { uTotal, uDigit, tTotal, tDigit, hTotal, hDigit, thousands },
  }
}

/* =========================
   OPCIONES (distractores “realistas”)
========================= */
function generateOptions(problem: Problem): Option[] {
  const correct = String(problem.sum)

  // Distractores típicos de suma con llevadas:
  // - olvidar la llevada de unidades (+10 menos)
  // - olvidar la llevada de decenas (+100 menos)
  // - error de digit (off-by-1 o confusión)
  const set = new Set<string>()
  const { cU, cT } = problem.carries

  const d1 = String(problem.sum - (cU ? 10 : 0) || problem.sum - 10)
  const d2 = String(problem.sum - (cT ? 100 : 0) || problem.sum - 100)
  const d3 = String(problem.sum + (randInt(1, 2) * (coinFlip() ? 1 : -1)))

  ;[d1, d2, d3].forEach(v => {
    if (v !== correct && Number(v) > 0) set.add(v)
  })

  // Completar si por alguna razón hay duplicados
  while (set.size < 3) {
    const cand = String(problem.sum + randInt(-30, 30))
    if (cand !== correct && Number(cand) > 0) set.add(cand)
  }

  const distractors = Array.from(set).slice(0, 3)
  return shuffle([
    { value: correct, correct: true },
    ...distractors.map(v => ({ value: v, correct: false })),
  ])
}

function coinFlip(p = 0.5) {
  return Math.random() < p
}

/* =========================
   TEX HELPERS
========================= */
function sumTeX(a: number, b: number) {
  // formato vertical bonito:
  //   586
  // + 479
  // -----
  //   ?
  return `\\begin{array}{r}
${a}\\\\
+\\ ${b}\\\\
\\hline
\\ ?
\\end{array}`
}

function boxTeX(label: string, value: string) {
  return `\\text{${label}}\\;\\Rightarrow\\;\\boxed{${value}}`
}

/* ============================================================
   COMPONENTE
============================================================ */
export default function SumasAvanzadas3Cifras({
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
    const problem = buildProblem()
    const options = generateOptions(problem)

    // Para el procedimiento: todo precomputado (sin “magia”)
    const { digits, carries, steps } = problem

    // Resultado por columnas:
    const thousands = steps.thousands
    const resultStr =
      thousands > 0
        ? `${thousands}${steps.hDigit}${steps.tDigit}${steps.uDigit}`
        : `${steps.hDigit}${steps.tDigit}${steps.uDigit}`

    return {
      problem,
      options,
      texVertical: sumTeX(problem.a, problem.b),
      resultStr,
      digits,
      carries,
      steps,
    }
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
        correctAnswer: String(ejercicio.problem.sum),
        latex: ejercicio.texVertical,
        options: ejercicio.options.map(o => o.value),
        extra: {
          a: ejercicio.problem.a,
          b: ejercicio.problem.b,
          sum: ejercicio.problem.sum,
          digits: ejercicio.digits,
          carries: ejercicio.carries,
          steps: ejercicio.steps,
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

  const p = ejercicio.problem
  const d = ejercicio.digits
  const c = ejercicio.carries
  const s = ejercicio.steps

  return (
    <MathProvider>
      <ExerciseShell
        title="Sumas avanzadas (3 cifras)"
        prompt="Elige la alternativa correcta: el resultado de la suma es..."
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
                  Paso 0 — Qué estamos buscando
                </div>
                <p className="text-muted-foreground">
                  Vamos a sumar dos números de <span className="font-semibold">3 cifras</span> alineando
                  <span className="font-semibold"> unidades, decenas y centenas</span>. El punto clave es
                  controlar las <span className="font-semibold">llevadas</span> (cuando una columna suma 10 o más).
                </p>
                <div className="mt-3 rounded-lg border bg-background p-3">
                  <MathTex block tex={ejercicio.texVertical} />
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2 flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  Paso 1 — Alinear por columnas (esto NO se negocia)
                </div>

                <p className="text-muted-foreground">
                  Cada dígito va en su columna: <span className="font-semibold">Centenas (C)</span>,
                  <span className="font-semibold"> Decenas (D)</span>, <span className="font-semibold">Unidades (U)</span>.
                  Si te desalineas, el resultado cambia aunque “sumes bien”.
                </p>

                <div className="mt-3 overflow-x-auto">
                  <table className="border w-full text-center text-xs">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border py-2">Columna</th>
                        <th className="border py-2">C (centenas)</th>
                        <th className="border py-2">D (decenas)</th>
                        <th className="border py-2">U (unidades)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border py-2 font-semibold">A</td>
                        <td className="border py-2">{d.aH}</td>
                        <td className="border py-2">{d.aT}</td>
                        <td className="border py-2">{d.aU}</td>
                      </tr>
                      <tr>
                        <td className="border py-2 font-semibold">B</td>
                        <td className="border py-2">{d.bH}</td>
                        <td className="border py-2">{d.bT}</td>
                        <td className="border py-2">{d.bU}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 rounded-lg border bg-background p-3">
                  <div className="font-semibold mb-1">Mini-regla</div>
                  <p className="text-muted-foreground">
                    Siempre sumamos de <span className="font-semibold">derecha a izquierda</span>:
                    Unidades → Decenas → Centenas. Las llevadas “viajan” a la siguiente columna.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2">Paso 2 — Columna de Unidades (U)</div>

                <p className="text-muted-foreground">
                  Sumamos las unidades: <span className="font-semibold">{d.aU}</span> +{' '}
                  <span className="font-semibold">{d.bU}</span> ={' '}
                  <span className="font-semibold">{s.uTotal}</span>.
                </p>

                <div className="mt-3 rounded-lg border bg-background p-3 space-y-2">
                  <MathTex block tex={boxTeX('Unidades', `${d.aU} + ${d.bU} = ${s.uTotal}`)} />
                  <p className="text-muted-foreground">
                    Si el total es <span className="font-semibold">10 o más</span>, entonces:
                  </p>
                  <ul className="list-disc pl-5 text-muted-foreground">
                    <li>la cifra de unidades es el <span className="font-semibold">último dígito</span> (módulo 10)</li>
                    <li>y la <span className="font-semibold">llevada</span> es 1 hacia Decenas</li>
                  </ul>

                  <div className="mt-2 overflow-x-auto">
                    <table className="border w-full text-center text-xs">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border py-2">Total U</th>
                          <th className="border py-2">Cifra U</th>
                          <th className="border py-2">Llevada a D</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border py-2 font-semibold">{s.uTotal}</td>
                          <td className="border py-2 font-semibold">{s.uDigit}</td>
                          <td className="border py-2 font-semibold">{c.cU}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-lg border bg-card p-3">
                    <div className="font-semibold mb-1">Chequeo rápido</div>
                    <p className="text-muted-foreground">
                      Aquí mucha gente se equivoca por “olvidar la llevada”. En este ejercicio, la llevada de unidades es:{' '}
                      <span className="font-semibold">{c.cU}</span>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2">Paso 3 — Columna de Decenas (D) (incluye llevada)</div>

                <p className="text-muted-foreground">
                  Ahora sumamos decenas <span className="font-semibold">y</span> agregamos la llevada que viene de Unidades:
                </p>

                <div className="mt-3 rounded-lg border bg-background p-3 space-y-2">
                  <MathTex
                    block
                    tex={boxTeX('Decenas', `${d.aT} + ${d.bT} + ${c.cU} = ${s.tTotal}`)}
                  />

                  <div className="mt-2 overflow-x-auto">
                    <table className="border w-full text-center text-xs">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border py-2">Decenas sin llevada</th>
                          <th className="border py-2">+ llevada (U→D)</th>
                          <th className="border py-2">Total D</th>
                          <th className="border py-2">Cifra D</th>
                          <th className="border py-2">Llevada a C</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border py-2">{d.aT + d.bT}</td>
                          <td className="border py-2 font-semibold">{c.cU}</td>
                          <td className="border py-2 font-semibold">{s.tTotal}</td>
                          <td className="border py-2 font-semibold">{s.tDigit}</td>
                          <td className="border py-2 font-semibold">{c.cT}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-lg border bg-card p-3">
                    <div className="font-semibold mb-1">Ojo</div>
                    <p className="text-muted-foreground">
                      La decena que escribimos es <span className="font-semibold">{s.tDigit}</span>, y la llevada que pasa a
                      centenas es <span className="font-semibold">{c.cT}</span>.
                      Si omites ese <span className="font-semibold">+ {c.cU}</span> al inicio, te sale un distractor típico.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2">Paso 4 — Columna de Centenas (C) (incluye llevada)</div>

                <p className="text-muted-foreground">
                  Repetimos la misma idea: centenas + centenas + llevada de decenas.
                </p>

                <div className="mt-3 rounded-lg border bg-background p-3 space-y-2">
                  <MathTex
                    block
                    tex={boxTeX('Centenas', `${d.aH} + ${d.bH} + ${c.cT} = ${s.hTotal}`)}
                  />

                  <div className="mt-2 overflow-x-auto">
                    <table className="border w-full text-center text-xs">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border py-2">Centenas sin llevada</th>
                          <th className="border py-2">+ llevada (D→C)</th>
                          <th className="border py-2">Total C</th>
                          <th className="border py-2">Cifra C</th>
                          <th className="border py-2">¿Llevada a Miles?</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border py-2">{d.aH + d.bH}</td>
                          <td className="border py-2 font-semibold">{c.cT}</td>
                          <td className="border py-2 font-semibold">{s.hTotal}</td>
                          <td className="border py-2 font-semibold">{s.hDigit}</td>
                          <td className="border py-2 font-semibold">{c.cH}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {c.cH === 1 ? (
                    <div className="rounded-lg border bg-card p-3">
                      <div className="font-semibold mb-1">Extra: aparece un “mil”</div>
                      <p className="text-muted-foreground">
                        Como el total de centenas fue {s.hTotal}, eso significa que hay una llevada a miles.
                        Entonces el resultado tendrá <span className="font-semibold">4 cifras</span>.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-card p-3">
                      <div className="font-semibold mb-1">Bien</div>
                      <p className="text-muted-foreground">
                        Aquí no hubo llevada a miles, así que el resultado se queda en 3 cifras.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2">Paso 5 — Armamos el resultado final</div>
                <p className="text-muted-foreground">
                  Juntamos las cifras obtenidas por columna (de izquierda a derecha): Miles (si hay), Centenas, Decenas, Unidades.
                </p>

                <div className="mt-3 overflow-x-auto">
                  <table className="border w-full text-center text-xs">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border py-2">Miles</th>
                        <th className="border py-2">Centenas</th>
                        <th className="border py-2">Decenas</th>
                        <th className="border py-2">Unidades</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border py-2 font-semibold">{s.thousands}</td>
                        <td className="border py-2 font-semibold">{s.hDigit}</td>
                        <td className="border py-2 font-semibold">{s.tDigit}</td>
                        <td className="border py-2 font-semibold">{s.uDigit}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 rounded-lg border bg-background p-3">
                  <div className="font-semibold mb-1">Respuesta final</div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Resultado:</span>
                    <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">
                      {p.sum}
                    </span>
                  </div>

                  <div className="mt-3 text-muted-foreground">
                    <span className="font-semibold">Chequeo mental rápido:</span>{' '}
                    {p.a} + {p.b} está cerca de {Math.round(p.a / 100) * 100} + {Math.round(p.b / 100) * 100} ≈{' '}
                    {Math.round(p.a / 100) * 100 + Math.round(p.b / 100) * 100}. Tu resultado {p.sum}{' '}
                    {Math.abs(p.sum - (Math.round(p.a / 100) * 100 + Math.round(p.b / 100) * 100)) < 120 ? 'sí' : 'no'} es coherente con esa aproximación.
                  </div>
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground">Operación</div>
          <div className="mt-2">
            <MathTex block tex={ejercicio.texVertical} />
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Tip: trabaja por columnas y no olvides las <span className="font-semibold">llevadas</span>.
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
