'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 16 — Logaritmos: hallar x + LaTeX (MathJax)
   Tipo:
     \log_b(1/x) = -n
   Opciones: b^n, -b^n, 1/b^n, b^(n-1) (distractores típicos)

   ✅ Usa "better-react-mathjax" (NO KaTeX)
   ✅ 1 SOLO INTENTO (autocalifica al click)
   ✅ Generación dinámica
   ✅ Explicación paso a paso (definición + exponente negativo)
============================================================ */

type Option = { value: string; correct: boolean }

/* =========================
   HELPERS
========================= */
function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function choice<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}
function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}
function powInt(b: number, e: number) {
  let r = 1
  for (let i = 0; i < e; i++) r *= b
  return r
}

/* =========================
   MathJax Config (igual Prisma17)
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
   GENERATOR
========================= */
function generateExercise() {
  const base = choice([2, 3, 4, 5, 6, 7, 8, 9])
  const n = randInt(2, 5)

  // log_b(1/x) = -n => 1/x = b^{-n} = 1/b^n => x = b^n
  const correctNum = powInt(base, n)
  const correctStr = String(correctNum)

  // distractores típicos
  const d1 = String(-correctNum) // inventa signo
  const d2 = `1/${correctNum}` // confunde x con 1/x
  const d3 = String(powInt(base, Math.max(1, n - 1))) // baja exponente

  const set = new Set<string>([correctStr, d1, d2, d3])
  while (set.size < 4) set.add(String(correctNum + choice([1, 2, 3, 4, 5])))

  const options: Option[] = Array.from(set)
    .slice(0, 4)
    .map(v => ({ value: v, correct: v === correctStr }))

  const exprLatex = `\\log_{${base}}\\left(\\frac{1}{x}\\right) = -${n}`

  return {
    base,
    n,
    correctNum,
    correctStr,
    options: shuffle(options),
    exprLatex,
  }
}

/* =========================
   COMPONENT
========================= */
export default function Prisma16({ temaPeriodoId }: { temaPeriodoId: string }) {
  const engine = useExerciseEngine({ maxAttempts: 1 })
  const [nonce, setNonce] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)

  const ejercicio = useMemo(() => generateExercise(), [nonce])

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelected(op.value)
    engine.submit(op.correct)

    persistExerciseOnce({
      temaPeriodoId,
      exerciseKey: 'Prisma16',
      prompt: 'Calcule el valor de x.',
      questionLatex: ejercicio.exprLatex,
      options: ejercicio.options.map(o => o.value),
      correctAnswer: ejercicio.correctStr,
      userAnswer: op.value,
      isCorrect: op.correct,
      extra: {
        base: ejercicio.base,
        n: ejercicio.n,
        exprLatex: ejercicio.exprLatex,
      },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  const { base, n, correctNum } = ejercicio

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 16 — Logaritmos"
        prompt="Calcule el valor de x en la ecuación:"
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => { }}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <div className="space-y-4 text-sm leading-relaxed">
              {/* Paso 1 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 1 — Definición de logaritmo</div>
                <p className="text-muted-foreground">
                  Regla clave:
                  <span className="font-semibold"> si </span>
                  <span className="font-mono">log_b(A)=c</span>
                  <span className="font-semibold"> entonces </span>
                  <span className="font-mono">b^c=A</span>.
                </p>

                <div className="mt-2 rounded-md border bg-background p-3 space-y-2">
                  <Tex block tex={ejercicio.exprLatex} />
                  <Tex
                    block
                    tex={`\\Rightarrow\\; ${base}^{-${n}} = \\frac{1}{x}`}
                  />
                </div>
              </div>

              {/* Paso 2 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 2 — Exponente negativo</div>
                <p className="text-muted-foreground">
                  Regla:
                </p>
                <div className="mt-2">
                  <Tex block tex={`b^{-n} = \\frac{1}{b^n}`} />
                </div>


                <div className="mt-2 rounded-md border bg-background p-3 space-y-2">
                  <Tex
                    block
                    tex={`${base}^{-${n}} = \\frac{1}{${base}^{${n}}}`}
                  />
                  <Tex
                    block
                    tex={`\\Rightarrow\\; \\frac{1}{${base}^{${n}}} = \\frac{1}{x}`}
                  />
                </div>
              </div>

              {/* Paso 3 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 3 — Despejar x</div>

                <div className="mt-2 rounded-md border bg-background p-3 space-y-2">
                  <Tex block tex={`\\Rightarrow\\; x = ${base}^{${n}}`} />
                  <Tex block tex={`x = ${correctNum}`} />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm font-semibold">Respuesta:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">
                    {correctNum}
                  </span>
                </div>

                <div className="mt-3 rounded-md border bg-background p-3">
                  <div className="font-semibold mb-1">🧠 Chequeo rápido</div>
                  <p className="text-muted-foreground">
                    Si reemplazas <span className="font-mono">x={correctNum}</span>, entonces{' '}
                    <span className="font-mono">1/x = 1/{correctNum}</span> y{' '}
                    <span className="font-mono">\\(\\log_{base}(1/{correctNum})\\)</span> da <span className="font-semibold">−{n}</span>.
                  </p>
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        {/* Enunciado */}
        <div className="rounded-xl border bg-white p-4 mb-4">
          <div className="font-semibold mb-2">Ecuación:</div>
          <div className="rounded-md border bg-background p-3">
            <Tex block tex={ejercicio.exprLatex} />
          </div>
        </div>

        {/* Opciones */}
        <div className="grid grid-cols-2 gap-4">
          {ejercicio.options.map(op => {
            const isSelected = selected === op.value
            const showCorrect = engine.status !== 'idle' && op.correct
            const showWrong = engine.status === 'revealed' && isSelected && !op.correct

            return (
              <button
                key={op.value}
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
                <div className="font-semibold">{op.value === ejercicio.correctStr ? 'Opción' : 'Opción'}</div>
                <div className="font-mono text-lg">{op.value}</div>
              </button>
            )
          })}
        </div>
      </ExerciseShell>
    </MathJaxContext>
  )
}
