'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 14 — Potencias + factorización prima (MathJax)
   Formato:
     A = ( p^a × N^b ) / ( M^c )   → hallar A (entero)
   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ 100% dinámico: genera p, N, M y exponentes
   ✅ Explicación PRO: factorización → elevar → cancelar exponentes → calcular
   ✅ better-react-mathjax (NO KaTeX)
   ✅ Persist: MISMA estructura que Prisma01 (exerciseId/temaId/classroomId/sessionId)
============================================================ */

type Option = { label: 'A' | 'B' | 'C' | 'D'; value: number; correct: boolean }

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function coin(p = 0.5) {
  return Math.random() < p
}
function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

/* =========================
   MathJax Config (igual estilo Prisma 01/17)
========================= */
const MATHJAX_CONFIG = {
  loader: { load: ['input/tex', 'output/chtml'] },
  tex: {
    inlineMath: [['\\(', '\\)']],
    displayMath: [['\\[', '\\]']],
    processEscapes: true,
    packages: { '[+]': ['ams'] },
  },
  options: {
    renderActions: { addMenu: [] },
  },
} as const

function Tex({
  tex,
  block = false,
  className = '',
}: {
  tex: string
  block?: boolean
  className?: string
}) {
  const wrapped = block ? `\\[${tex}\\]` : `\\(${tex}\\)`
  return (
    <span className={className}>
      <MathJax dynamic inline={!block}>
        {wrapped}
      </MathJax>
    </span>
  )
}

/* =========================
   FACTORIZACIÓN PRIMA
========================= */
function factorize(n: number): Record<number, number> {
  let x = n
  const out: Record<number, number> = {}
  let d = 2

  while (d * d <= x) {
    while (x % d === 0) {
      out[d] = (out[d] ?? 0) + 1
      x = Math.floor(x / d)
    }
    d++
  }
  if (x > 1) out[x] = (out[x] ?? 0) + 1
  return out
}

function primesOf(...factors: Array<Record<number, number>>): number[] {
  const s = new Set<number>()
  factors.forEach(f => Object.keys(f).forEach(k => s.add(Number(k))))
  return Array.from(s).sort((a, b) => a - b)
}

function powInt(base: number, exp: number) {
  let r = 1
  for (let i = 0; i < exp; i++) r *= base
  return r
}

function computeValueFromExps(finalExps: Record<number, number>) {
  return Object.entries(finalExps).reduce((acc, [p, e]) => acc * powInt(Number(p), e), 1)
}

/* =========================
   LATEX HELPERS
========================= */
function termTex(p: number, e: number) {
  if (e <= 0) return ''
  if (e === 1) return `${p}`
  return `${p}^{${e}}`
}
function factorTex(f: Record<number, number>) {
  const ps = primesOf(f)
  const parts = ps.map(p => termTex(p, f[p] ?? 0)).filter(Boolean)
  return parts.length ? parts.join('\\cdot ') : '1'
}
function factorPowerTex(f: Record<number, number>, k: number) {
  const ps = primesOf(f)
  const parts = ps.map(p => termTex(p, (f[p] ?? 0) * k)).filter(Boolean)
  return parts.length ? parts.join('\\cdot ') : '1'
}

/* =========================
   GENERACIÓN DE N y M usando solo 2,3,5 (bonito)
========================= */
const CORE_PRIMES = [2, 3, 5] as const

function buildNumberFromExps(e2: number, e3: number, e5: number) {
  return powInt(2, e2) * powInt(3, e3) * powInt(5, e5)
}
function isCompositeNice(n: number) {
  return n >= 6 && n <= 200
}

/* =========================
   GENERADOR DEL EJERCICIO
========================= */
function generateExercise() {
  for (let tries = 0; tries < 260; tries++) {
    const p = CORE_PRIMES[randInt(0, CORE_PRIMES.length - 1)]
    const pExp = randInt(1, 4)

    // exps para N y M con 2,3,5
    const n2 = randInt(0, 3)
    const n3 = randInt(0, 3)
    const n5 = randInt(0, 2)

    const m2 = randInt(0, 3)
    const m3 = randInt(0, 3)
    const m5 = randInt(0, 2)

    const N = buildNumberFromExps(n2, n3, n5)
    const M = buildNumberFromExps(m2, m3, m5)

    if (!isCompositeNice(N) || !isCompositeNice(M)) continue
    if (N === 1 || M === 1) continue
    if (N === M) continue

    const NExp = randInt(2, 5)
    const MExp = randInt(2, 5)

    const facN = factorize(N)
    const facM = factorize(M)

    const primes = primesOf(facN, facM, { [p]: 1 })

    const expNum: Record<number, number> = {}
    const expDen: Record<number, number> = {}
    const expFinal: Record<number, number> = {}

    for (const pr of primes) {
      const num = (facN[pr] ?? 0) * NExp + (pr === p ? pExp : 0)
      const den = (facM[pr] ?? 0) * MExp
      const fin = num - den

      expNum[pr] = num
      expDen[pr] = den
      expFinal[pr] = fin
    }

    // A entero => todos fin >= 0
    if (Object.values(expFinal).some(e => e < 0)) continue
    if (Object.values(expFinal).every(e => e === 0)) continue

    const value = computeValueFromExps(expFinal)
    if (value < 2 || value > 300) continue

    // Opciones
    const set = new Set<number>()
    set.add(value)

    const candidates: number[] = []

    // error típico: elevar mal N (N^(NExp-1))
    const wrong1 = Math.round((powInt(p, pExp) * powInt(N, Math.max(1, NExp - 1))) / powInt(M, MExp))
    if (Number.isFinite(wrong1) && wrong1 > 0) candidates.push(wrong1)

    // mover mal factor (multiplicar por 2 o 3)
    candidates.push(value * (coin(0.5) ? 2 : 3))

    // +/- pequeño
    candidates.push(value + randInt(2, 8))
    candidates.push(Math.max(1, value - randInt(2, 8)))

    for (const c of shuffle(candidates)) {
      if (set.size >= 4) break
      if (c !== value && c > 0 && c <= 400) set.add(c)
    }

    while (set.size < 4) {
      const c = value + randInt(-12, 12)
      if (c > 0 && c !== value) set.add(c)
    }

    const values = shuffle(Array.from(set)).slice(0, 4)
    const labels: Option['label'][] = ['A', 'B', 'C', 'D']

    const options: Option[] = values.map((v, i) => ({
      label: labels[i],
      value: v,
      correct: v === value,
    }))

    return {
      p,
      pExp,
      N,
      NExp,
      M,
      MExp,
      facN,
      facM,
      primes,
      expNum,
      expDen,
      expFinal,
      value,
      options,
    }
  }

  // fallback
  const p = 5
  const pExp = 3
  const N = 12
  const NExp = 4
  const M = 60
  const MExp = 3

  const facN = factorize(N)
  const facM = factorize(M)
  const primes = primesOf(facN, facM, { [p]: 1 })

  const expNum: Record<number, number> = {}
  const expDen: Record<number, number> = {}
  const expFinal: Record<number, number> = {}

  for (const pr of primes) {
    const num = (facN[pr] ?? 0) * NExp + (pr === p ? pExp : 0)
    const den = (facM[pr] ?? 0) * MExp
    expNum[pr] = num
    expDen[pr] = den
    expFinal[pr] = num - den
  }

  const value = computeValueFromExps(expFinal)

  const options: Option[] = [
    { label: 'A', value, correct: true },
    { label: 'B', value: value + 8, correct: false },
    { label: 'C', value: Math.max(1, value - 6), correct: false },
    { label: 'D', value: value * 2, correct: false },
  ]

  return { p, pExp, N, NExp, M, MExp, facN, facM, primes, expNum, expDen, expFinal, value, options }
}

/* =========================
   UI — PRISMA 14 (MathJax)
========================= */
export default function Prisma14({
  exerciseId,
  temaId,
  classroomId,
  sessionId,
}: {
  exerciseId: string
  temaId: string
  classroomId: string
  sessionId?: string
}) {
  const engine = useExerciseEngine({ maxAttempts: 1 })
  const [nonce, setNonce] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)

  const ej = useMemo(() => generateExercise(), [nonce])

  const exprTex = `A=\\frac{${ej.p}^{${ej.pExp}}\\cdot ${ej.N}^{${ej.NExp}}}{${ej.M}^{${ej.MExp}}}`

  const numExpandedTex = `${ej.p}^{${ej.pExp}}\\cdot \\left(${factorTex(ej.facN)}\\right)^{${ej.NExp}}`
  const denExpandedTex = `\\left(${factorTex(ej.facM)}\\right)^{${ej.MExp}}`

  const numPoweredTex = `${ej.p}^{${ej.pExp}}\\cdot ${factorPowerTex(ej.facN, ej.NExp)}`
  const denPoweredTex = `${factorPowerTex(ej.facM, ej.MExp)}`

  const finalProductTex =
    ej.primes
      .map(pr => termTex(pr, ej.expFinal[pr] ?? 0))
      .filter(Boolean)
      .join('\\cdot ') || '1'

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelected(op.value)
    engine.submit(op.correct)

    // ✅ MISMA ESTRUCTURA QUE PRISMA01
    persistExerciseOnce({
      exerciseId, // 'Prisma14'
      temaId,
      classroomId,
      sessionId,

      correct: op.correct,

      answer: {
        selected: op.value,
        selectedLabel: op.label,
        correctAnswer: ej.value,
        latex: exprTex,
        options: ej.options.map(o => ({ label: o.label, value: o.value })),
        extra: {
          p: ej.p,
          pExp: ej.pExp,
          N: ej.N,
          NExp: ej.NExp,
          M: ej.M,
          MExp: ej.MExp,
          facN: ej.facN,
          facM: ej.facM,
          expNum: ej.expNum,
          expDen: ej.expDen,
          expFinal: ej.expFinal,
          exprTex,
        },
      },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 14 — Potencias y factorización"
        prompt="Determina el valor de A."
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <div className="space-y-4 text-sm leading-relaxed">
              {/* Paso 0 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">👀 Paso 0 — Miramos la expresión</div>
                <p className="text-muted-foreground">
                  La idea es escribir todo como producto de primos y luego usar reglas de potencias para “sumar/restar”
                  exponentes.
                </p>
                <div className="mt-2 rounded-md border bg-background p-3">
                  <Tex block tex={exprTex} />
                </div>
              </div>

              {/* Paso 1 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 1 — Factorizamos en primos</div>
                <div className="rounded-md border bg-background p-3 space-y-2">
                  <Tex block tex={`${ej.N}=${factorTex(ej.facN)}`} />
                  <Tex block tex={`${ej.M}=${factorTex(ej.facM)}`} />
                </div>
              </div>

              {/* Paso 2 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 2 — Reemplazamos y elevamos</div>

                <div className="rounded-md border bg-background p-3 space-y-2">
                  <Tex block tex={`A=\\frac{${numExpandedTex}}{${denExpandedTex}}`} />
                  <Tex block tex={`A=\\frac{${numPoweredTex}}{${denPoweredTex}}`} />
                </div>

                <div className="mt-2 rounded-md border bg-background p-3">
                  <Tex block tex={`\\text{Regla: }(a^m)^k=a^{mk}\\quad\\text{y}\\quad\\frac{a^m}{a^n}=a^{m-n}`} />
                </div>
              </div>

              {/* Paso 3 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 3 — Cancelamos exponentes (tabla)</div>

                <div className="overflow-x-auto">
                  <table className="border w-full text-center text-xs">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border py-2">Primo</th>
                        <th className="border py-2">Exp. numerador</th>
                        <th className="border py-2">Exp. denominador</th>
                        <th className="border py-2">Exp. final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ej.primes.map(pr => (
                        <tr key={pr}>
                          <td className="border py-2 font-semibold">{pr}</td>
                          <td className="border py-2 font-mono">{ej.expNum[pr] ?? 0}</td>
                          <td className="border py-2 font-mono">{ej.expDen[pr] ?? 0}</td>
                          <td className="border py-2 font-mono font-semibold">{ej.expFinal[pr] ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="mt-2 text-muted-foreground">
                  Para cada primo, hacemos: <span className="font-semibold">num − den</span>.
                </p>
              </div>

              {/* Paso 4 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 4 — Escribimos A y calculamos</div>

                <div className="rounded-md border bg-background p-3 space-y-2">
                  <Tex block tex={`A=${finalProductTex}`} />
                  <Tex block tex={`A=${ej.value}`} />
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <span className="font-semibold">Resultado:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">{ej.value}</span>
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        {/* Enunciado */}
        <div className="rounded-xl border bg-white p-4 mb-4">
          <div className="font-semibold mb-2">Expresión:</div>
          <Tex block tex={exprTex} />
        </div>

        {/* Opciones */}
        <div className="grid grid-cols-2 gap-4">
          {ej.options.map(op => {
            const isSelected = selected === op.value
            const showCorrect = engine.status !== 'idle' && op.correct
            const showWrong = engine.status === 'revealed' && isSelected && !op.correct

            return (
              <button
                key={op.label}
                type="button"
                disabled={!engine.canAnswer}
                onClick={() => pickOption(op)}
                className={[
                  'border rounded-xl p-4 text-center transition',
                  'hover:shadow-sm hover:-translate-y-0.5',
                  isSelected && 'ring-2 ring-primary',
                  showCorrect && 'bg-green-400',
                  showWrong && 'bg-red-400',
                  !engine.canAnswer && 'opacity-80 cursor-not-allowed',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="font-semibold">{op.label}.</div>
                <div className="font-mono text-lg">{op.value}</div>
              </button>
            )
          })}
        </div>
      </ExerciseShell>
    </MathJaxContext>
  )
}
