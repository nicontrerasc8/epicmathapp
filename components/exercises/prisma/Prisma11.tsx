'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { ExerciseHud } from '../base/ExerciseHud'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { useExerciseSubmission } from '@/lib/exercises/useExerciseSubmission'
import { useExerciseTimer } from '@/lib/exercises/useExerciseTimer'
import { computeTrophyGain, WRONG_PENALTY } from '@/lib/exercises/gamification'

/* ============================================================
   PRISMA 11 — Potencias con exponente - (n^0) y elevación final
   Forma: R = [ A - (p/q)^(-(n^0)) ]^2
   ? 1 SOLO INTENTO (autocalifica al elegir opción)
   ? Dinámico (A, p, q, n cambian)
   ? MathJax PRO (sin KaTeX)
   ? Explicación tipo profe (muy clara)
   ? Persist NUEVO (igual Prisma01)
============================================================ */

type Option = { label: 'A' | 'B' | 'C' | 'D'; value: string; correct: boolean }

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/* =========================
   Fracciones (exacto)
========================= */
function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b !== 0) {
    const t = a % b
    a = b
    b = t
  }
  return a
}

type Frac = { n: number; d: number }

function normFrac(f: Frac): Frac {
  if (f.d < 0) return { n: -f.n, d: -f.d }
  return f
}
function reduceFrac(f: Frac): Frac {
  f = normFrac(f)
  const g = gcd(f.n, f.d)
  return { n: f.n / g, d: f.d / g }
}
function fracSub(a: Frac, b: Frac): Frac {
  return reduceFrac({ n: a.n * b.d - b.n * a.d, d: a.d * b.d })
}
function fracPow2(a: Frac): Frac {
  return reduceFrac({ n: a.n * a.n, d: a.d * a.d })
}
function fracToStr(a: Frac): string {
  a = reduceFrac(a)
  if (a.d === 1) return String(a.n)
  return `${a.n}/${a.d}`
}

/* =========================
   GENERADOR
   R = [ A - (p/q)^(-n^0) ]^2
   - n^0 = 1 ? exponente = -1
   - (p/q)^(-1) = q/p
   - Elegimos q = A·p - t para que A - q/p = t/p (bonito)
========================= */
function generateProblem() {
  for (let tries = 0; tries < 250; tries++) {
    const A = randInt(3, 6)
    const p = randInt(2, 8) // denominador final p
    const t = randInt(1, Math.min(4, p - 1)) // diferencia chica para que quede simple
    const q = A * p - t

    if (!(p < q)) continue // base propia

    const nBase = randInt(2, 9)

    // Correcto:
    // n^0=1 ? (p/q)^(-1)=q/p ? A - q/p = t/p ? R=(t/p)^2
    const diff: Frac = reduceFrac({ n: t, d: p })
    const correct: Frac = fracPow2(diff)

    // Distractores típicos
    const wrong1 = fracPow2(fracSub({ n: A, d: 1 }, { n: p, d: q })) // no invierte por -1
    const wrong2 = diff // olvida elevar al cuadrado
    const wrong3: Frac = { n: (A - 1) * (A - 1), d: 1 } // cree que n^0=0 ? (p/q)^0=1 ? (A-1)^2

    const correctStr = fracToStr(correct)
    const set = new Set<string>([correctStr])
    const cands = [wrong1, wrong2, wrong3].map(fracToStr)

    for (const s of cands) {
      if (set.size >= 4) break
      if (s !== correctStr) set.add(s)
    }

    while (set.size < 4) {
      const delta = choice([-3, -2, -1, 1, 2, 3])
      const cand = reduceFrac({ n: correct.n + delta, d: correct.d })
      const s = fracToStr(cand)
      if (s !== correctStr) set.add(s)
    }

    const optsRaw = Array.from(set)
      .map(v => ({ value: v, correct: v === correctStr }))
      .sort(() => Math.random() - 0.5)

    const labels: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D']
    const options: Option[] = optsRaw.map((o, i) => ({ label: labels[i], ...o }))

    return {
      A,
      p,
      q,
      t,
      nBase,
      options,
      correctStr,
      diff,
      correct,
    }
  }

  // fallback
  return {
    A: 4,
    p: 2,
    q: 7,
    t: 1,
    nBase: 3,
    correctStr: '1/4',
    options: [
      { label: 'A', value: '1/4', correct: true },
      { label: 'B', value: '4', correct: false },
      { label: 'C', value: '1/2', correct: false },
      { label: 'D', value: '1/9', correct: false },
    ],
    diff: { n: 1, d: 2 },
    correct: { n: 1, d: 4 },
  }
}

/* =========================
   MathJax Config + Tex helper
========================= */
const MATHJAX_CONFIG = {
  loader: { load: ['input/tex', 'output/chtml'] },
  tex: {
    inlineMath: [['\\(', '\\)']],
    displayMath: [['\\[', '\\]']],
    processEscapes: true,
    packages: { '[+]': ['ams'] },
  },
  options: { renderActions: { addMenu: [] } },
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
   UI — PRISMA 11 (MathJax)
========================= */
export default function Prisma11({
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
  const { elapsed, startedAtRef } = useExerciseTimer(engine.canAnswer, nonce)
  const trophyPreview = computeTrophyGain(elapsed)
  const [selected, setSelected] = useState<string | null>(null)

  const ex = useMemo(() => generateProblem(), [nonce])

  const A = ex.A
  const p = ex.p
  const q = ex.q
  const nBase = ex.nBase

  // Paso 1: n^0 = 1
  const expValue = 1

  // Paso 2: (p/q)^(-1) = q/p
  const reciprocal: Frac = reduceFrac({ n: q, d: p })

  // Paso 3: A - q/p (queda bonito)
  const diff = reduceFrac(ex.diff)

  // Paso 4: cuadrado final
  const squared = reduceFrac(ex.correct)

  const exprLatex = `R=\\left[${A}-\\left(\\frac{${p}}{${q}}\\right)^{-(${nBase}^{0})}\\right]^2`

  async function pickOption(op: Option) {
    if (!engine.canAnswer) return

    const timeSeconds = (Date.now() - startedAtRef.current) / 1000

    setSelected(op.value)
    engine.submit(op.correct)

    // ? Persist NUEVO (igual Prisma01)
    await submitAttempt({

      correct: op.correct,

      answer: {
        selected: op.value,
        correctAnswer: ex.correctStr,
        latex: exprLatex,
        options: ex.options.map(o => o.value),
        extra: {
          exprLatex,
          A,
          p,
          q,
          nBase,
          expValue,
          reciprocal: fracToStr(reciprocal),
          diff: fracToStr(diff),
          squared: fracToStr(squared),
          result: ex.correctStr,
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

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 11 — Efectúa (potencias)"
        prompt="Efectúa:"
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <div className="space-y-4 text-sm leading-relaxed">
              {/* Paso 1 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 1 — Resolver el exponente con cero</div>
                <p className="text-muted-foreground">
                  Regla clave: si <Tex tex={`a\\neq 0`} /> entonces <Tex tex={`a^0=1`} />.
                </p>

                <div className="mt-3 rounded border bg-white p-3">
                  <Tex block tex={`${nBase}^{0}=1`} />
                </div>
              </div>

              {/* Paso 2 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 2 — Sustituir en la expresión</div>

                <div className="space-y-2">
                  <div className="rounded border bg-white p-3">
                    <Tex block tex={exprLatex} />
                  </div>

                  <div className="rounded border bg-white p-3">
                    <Tex
                      block
                      tex={`R=\\left[${A}-\\left(\\frac{${p}}{${q}}\\right)^{-${expValue}}\\right]^2`}
                    />
                  </div>

                  <div className="text-muted-foreground">
                    Como <Tex tex={`${nBase}^0=1`} />, el exponente se vuelve <Tex tex={`-1`} />.
                  </div>
                </div>
              </div>

              {/* Paso 3 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 3 — Exponente negativo (recíproco)</div>
                <p className="text-muted-foreground">
                  Regla: <Tex tex={`\\left(\\frac{a}{b}\\right)^{-1}=\\frac{b}{a}`} /> (se invierte la fracción).
                </p>

                <div className="mt-3 space-y-2">
                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`\\left(\\frac{${p}}{${q}}\\right)^{-1}=\\frac{${q}}{${p}}`} />
                  </div>
                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`R=\\left[${A}-\\frac{${q}}{${p}}\\right]^2`} />
                  </div>
                </div>
              </div>

              {/* Paso 4 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 4 — Restar número entero con fracción</div>
                <p className="text-muted-foreground">
                  Para restar, convertimos <Tex tex={`${A}`} /> a una fracción con denominador <Tex tex={`${p}`} />:{' '}
                  <Tex tex={`${A}=\\frac{${A}\\cdot ${p}}{${p}}`} />.
                </p>

                <div className="mt-3 space-y-2">
                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`${A}=\\frac{${A * p}}{${p}}`} />
                  </div>

                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`${A}-\\frac{${q}}{${p}}=\\frac{${A * p}-${q}}{${p}}`} />
                  </div>

                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`\\frac{${A * p}-${q}}{${p}}=\\frac{${diff.n}}{${diff.d}}`} />
                  </div>

                  <div className="text-muted-foreground">
                    Entonces queda: <Tex tex={`R=\\left(\\frac{${diff.n}}{${diff.d}}\\right)^2`} />.
                  </div>
                </div>
              </div>

              {/* Paso 5 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 5 — Elevar al cuadrado</div>
                <p className="text-muted-foreground">
                  Regla: <Tex tex={`\\left(\\frac{a}{b}\\right)^2=\\frac{a^2}{b^2}`} />.
                </p>

                <div className="mt-3 space-y-2">
                  <div className="rounded border bg-white p-3">
                    <Tex
                      block
                      tex={`R=\\left(\\frac{${diff.n}}{${diff.d}}\\right)^2=\\frac{${diff.n}^2}{${diff.d}^2}`}
                    />
                  </div>

                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`R=\\frac{${squared.n}}{${squared.d}}`} />
                  </div>
                </div>
              </div>

              {/* Respuesta */}
              <div className="rounded-lg border bg-muted p-3">
                <div className="font-semibold">? Respuesta final</div>
                <div className="mt-2">
                  <Tex
                    block
                    tex={`R=${ex.correctStr.includes('/') ? `\\frac{${squared.n}}{${squared.d}}` : ex.correctStr}`}
                  />
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-white p-4 mb-4">
          <div className="font-semibold mb-2">Expresión:</div>
          <Tex block tex={exprLatex} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {ex.options.map((op:any) => {
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
        </div>      </ExerciseShell>
    </MathJaxContext>
  )
}








