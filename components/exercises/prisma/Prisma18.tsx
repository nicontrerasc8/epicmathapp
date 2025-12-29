'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 18 — Logaritmos (MathJax)
   ✅ MathJax (better-react-mathjax) — mismo formato que Prisma 17
   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ Dinámico: log_{2^b}(2^n) = n/b (simplificado)
   ✅ Resolución detallada tipo Prisma
============================================================ */

type Option = {
  label: 'A' | 'B' | 'C' | 'D'
  latex: string
  plain: string
  correct: boolean
}

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
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
function reduceFrac(n: number, d: number) {
  const g = gcd(n, d)
  return { n: n / g, d: d / g }
}
function fracLatex(n: number, d: number) {
  if (d === 1) return `${n}`
  return `\\frac{${n}}{${d}}`
}
function fracPlain(n: number, d: number) {
  if (d === 1) return String(n)
  return `${n}/${d}`
}

/* =========================
   MathJax Config (igual Prisma 17)
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
   Generator
========================= */
function generateProblem() {
  // base = 2^b, número = 2^n  ⇒  log_{2^b}(2^n) = n/b
  for (let tries = 0; tries < 200; tries++) {
    const b = choice([2, 3, 4, 5]) // base = 4, 8, 16, 32
    const n = randInt(1, 12) // número = 2^n
    if (n === b) continue

    const baseVal = 2 ** b
    const numVal = 2 ** n

    const rf = reduceFrac(n, b)
    const correctLatex = fracLatex(rf.n, rf.d)
    const correctPlain = fracPlain(rf.n, rf.d)

    // distractores típicos
    const r1 = reduceFrac(b, n) // recíproco
    const d1 = { latex: fracLatex(r1.n, r1.d), plain: fracPlain(r1.n, r1.d) }

    const r2 = reduceFrac(n, Math.max(1, b - 1)) // usar mal el exponente base
    const d2 = { latex: fracLatex(r2.n, r2.d), plain: fracPlain(r2.n, r2.d) }

    const r3 = reduceFrac(Math.max(1, n - 1), b) // restar 1 por error
    const d3 = { latex: fracLatex(r3.n, r3.d), plain: fracPlain(r3.n, r3.d) }

    const set = new Map<string, { latex: string; plain: string }>()
    set.set(correctPlain, { latex: correctLatex, plain: correctPlain })
    ;[d1, d2, d3].forEach(x => {
      if (!set.has(x.plain) && set.size < 4) set.set(x.plain, x)
    })

    const extraPool = [
      { latex: '0', plain: '0' },
      { latex: '1', plain: '1' },
      { latex: '2', plain: '2' },
      { latex: '3', plain: '3' },
      { latex: '\\frac{1}{2}', plain: '1/2' },
      { latex: '\\frac{3}{2}', plain: '3/2' },
      { latex: '\\frac{4}{3}', plain: '4/3' },
      { latex: '\\frac{3}{4}', plain: '3/4' },
    ]
    while (set.size < 4) {
      const x = choice(extraPool)
      if (!set.has(x.plain) && x.plain !== correctPlain) set.set(x.plain, x)
    }

    const labels: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D']
    const raw = Array.from(set.values())
      .map(v => ({ ...v, correct: v.plain === correctPlain }))
      .sort(() => Math.random() - 0.5)

    const options: Option[] = raw.map((o, i) => ({
      label: labels[i],
      latex: o.latex,
      plain: o.plain,
      correct: o.correct,
    }))

    const questionLatex = `\\log_{${baseVal}}\\left(${numVal}\\right)`

    return {
      b,
      n,
      baseVal,
      numVal,
      questionLatex,
      options,
      correctLatex,
      correctPlain,
      rf,
    }
  }

  // fallback: log_8(16) = 4/3
  return {
    b: 3,
    n: 4,
    baseVal: 8,
    numVal: 16,
    questionLatex: `\\log_{8}\\left(16\\right)`,
    options: [
      { label: 'A', latex: '2', plain: '2', correct: false },
      { label: 'B', latex: '\\frac{1}{2}', plain: '1/2', correct: false },
      { label: 'C', latex: '\\frac{4}{3}', plain: '4/3', correct: true },
      { label: 'D', latex: '\\frac{3}{4}', plain: '3/4', correct: false },
    ],
    correctLatex: '\\frac{4}{3}',
    correctPlain: '4/3',
    rf: { n: 4, d: 3 },
  }
}

/* =========================
   UI
========================= */
export default function Prisma18({ temaPeriodoId }: { temaPeriodoId: string }) {
  const engine = useExerciseEngine({ maxAttempts: 1 })
  const [nonce, setNonce] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)

  const ex = useMemo(() => generateProblem(), [nonce])

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelected(op.plain)
    engine.submit(op.correct)

    persistExerciseOnce({
      temaPeriodoId,
      exerciseKey: 'Prisma18',
      prompt: 'Calcule el logaritmo.',
      questionLatex: ex.questionLatex,
      options: ex.options.map(o => `${o.label}. ${o.latex}`),
      correctAnswer: ex.correctLatex,
      userAnswer: op.latex,
      isCorrect: op.correct,
      extra: {
        base: ex.baseVal,
        number: ex.numVal,
        n: ex.n,
        b: ex.b,
        reduced: ex.rf,
      },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  const baseAs2 = `2^{${ex.b}}`
  const numAs2 = `2^{${ex.n}}`

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 18 — Logaritmos"
        prompt="Calcule el logaritmo."
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
                <div className="font-semibold mb-2">👀 Paso 0 — Leer la expresión</div>
                <p className="text-muted-foreground">
                  La idea es escribir base y número como potencias de 2. Así el resultado sale como una fracción.
                </p>
                <div className="mt-2 rounded-md border bg-background p-3">
                  <Tex block tex={ex.questionLatex} />
                </div>
              </div>

              {/* Paso 1 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 1 — Escribimos todo como potencia de 2</div>
                <div className="space-y-2 rounded-md border bg-background p-3">
                  <Tex block tex={`${ex.baseVal} = ${baseAs2}`} />
                  <Tex block tex={`${ex.numVal} = ${numAs2}`} />
                </div>
              </div>

              {/* Paso 2 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 2 — Propiedad clave</div>
                <div className="text-muted-foreground">
                  Si <span className="font-mono">2^k</span> es potencia de 2, entonces{' '}
                  <span className="font-mono">log_2(2^k)=k</span>.
                </div>

                <div className="mt-2 space-y-2 rounded-md border bg-background p-3">
                  <Tex block tex={`\\log_2(${ex.numVal}) = \\log_2(${numAs2}) = ${ex.n}`} />
                  <Tex block tex={`\\log_2(${ex.baseVal}) = \\log_2(${baseAs2}) = ${ex.b}`} />
                </div>
              </div>

              {/* Paso 3 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 3 — Cambio de base a 2 y simplificación</div>
                <div className="text-muted-foreground">
                  Usamos: <span className="font-mono">log_b(a) = log_2(a)/log_2(b)</span>
                </div>

                <div className="mt-2 space-y-2 rounded-md border bg-background p-3">
                  <Tex
                    block
                    tex={`\\log_{${ex.baseVal}}\\left(${ex.numVal}\\right) = \\frac{\\log_2(${ex.numVal})}{\\log_2(${ex.baseVal})}`}
                  />
                  <Tex block tex={`= \\frac{${ex.n}}{${ex.b}}`} />
                  <Tex block tex={`= ${ex.correctLatex}`} />
                </div>

                <div className="mt-3 rounded-lg bg-muted p-3">
                  <div className="font-semibold">Respuesta:</div>
                  <div className="text-lg">
                    <Tex block tex={ex.correctLatex} />
                  </div>
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                  Tip mental: si el número es <span className="font-mono">2^n</span> y la base es{' '}
                  <span className="font-mono">2^b</span>, el resultado es <span className="font-mono">n/b</span>.
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        {/* Card expresión (igual Prisma 17) */}
        <div className="rounded-xl border bg-white p-4 mb-4">
          <div className="font-semibold mb-2">Expresión:</div>
          <Tex block tex={ex.questionLatex} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {ex.options.map((op:any) => {
            const isSelected = selected === op.plain
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
                <div className="font-semibold mb-1">{op.label}.</div>
                <div className="text-lg">
                  <Tex tex={op.latex} />
                </div>
              </button>
            )
          })}
        </div>
      </ExerciseShell>
    </MathJaxContext>
  )
}
