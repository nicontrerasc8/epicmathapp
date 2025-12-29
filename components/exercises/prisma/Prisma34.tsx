'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 34 — Radianes / Sexagesimal / Centesimal
   Dado: 3C - 2S = N  ⇒ hallar R
   Convenciones Prisma:
     S = 9k,  C = 10k,  R = (kπ)/20
   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ Dinámico (k cambia) manteniendo respuesta bonita (π/20, π/10, 3π/20, π/5, π/4, 3π/10, ...)
   ✅ MathJax (better-react-mathjax)
   ✅ Resolución tipo profe (sustitución, despeje, radianes)
============================================================ */

type Option = { label: 'A' | 'B' | 'C' | 'D'; valueLatex: string; correct: boolean }

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}
function choice<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
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
   Generador
   3C - 2S = 12k = N  => k = N/12
   R = (kπ)/20
   Elegimos k para que N sea entero y opciones bonitas.
========================= */
const K_POOL = [1, 2, 3, 4, 5, 6] // k bonitos
const makeFracLatex = (num: number, den: number) => {
  if (den === 1) return `${num}`
  return `\\frac{${num}}{${den}}`
}

function simplifyFraction(num: number, den: number) {
  const gcd = (a: number, b: number): number => {
    a = Math.abs(a)
    b = Math.abs(b)
    while (b) {
      const t = a % b
      a = b
      b = t
    }
    return a
  }
  const g = gcd(num, den)
  return { num: num / g, den: den / g }
}

function radLatexFromK(k: number) {
  // R = (kπ)/20, simplificar k/20
  const { num, den } = simplifyFraction(k, 20)
  if (num === 1 && den === 1) return `\\pi\\,\\text{rad}`
  if (den === 1) return `${num}\\pi\\,\\text{rad}`
  if (num === 1) return `\\frac{\\pi}{${den}}\\,\\text{rad}`
  return `\\frac{${num}\\pi}{${den}}\\,\\text{rad}`
}

function generateOptions(correctLatex: string) {
  // distractores típicos: cambiar denominador 20->10->5, o usar π/2, π/15, etc.
  const distractorPool = [
    `\\frac{\\pi}{20}\\,\\text{rad}`,
    `\\frac{\\pi}{10}\\,\\text{rad}`,
    `\\frac{\\pi}{5}\\,\\text{rad}`,
    `\\frac{\\pi}{4}\\,\\text{rad}`,
    `\\frac{\\pi}{2}\\,\\text{rad}`,
    `\\frac{3\\pi}{20}\\,\\text{rad}`,
    `\\frac{3\\pi}{10}\\,\\text{rad}`,
    `\\frac{\\pi}{15}\\,\\text{rad}`,
  ].filter(v => v !== correctLatex)

  const set = new Set<string>()
  set.add(correctLatex)
  for (const d of shuffle(distractorPool)) {
    if (set.size >= 4) break
    set.add(d)
  }

  const labels: Option['label'][] = ['A', 'B', 'C', 'D']
  const values = shuffle(Array.from(set)).slice(0, 4)

  return values.map((v, i) => ({ label: labels[i], valueLatex: v, correct: v === correctLatex }))
}

function generateExercise() {
  // Elijo k, entonces N = 12k (para que la ecuación salga limpia)
  const k = choice(K_POOL)
  const N = 12 * k
  const correctLatex = radLatexFromK(k)
  const options = generateOptions(correctLatex)

  return { k, N, correctLatex, options }
}

/* =========================
   UI — PRISMA 34
========================= */
export default function Prisma34({ temaPeriodoId }: { temaPeriodoId: string }) {
  const engine = useExerciseEngine({ maxAttempts: 1 })
  const [nonce, setNonce] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)

  const ex = useMemo(() => generateExercise(), [nonce])

  const promptLatex = `\\text{Halla la medida en radianes si se cumple }\\; 3C-2S=${ex.N}.`

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelected(op.valueLatex)
    engine.submit(op.correct)

    persistExerciseOnce({
      temaPeriodoId,
      exerciseKey: 'Prisma34',
      prompt: 'Halla la medida de un ángulo expresado en radianes.',
      questionLatex: promptLatex,
      options: ex.options.map(o => `${o.label}. ${o.valueLatex}`),
      correctAnswer: ex.correctLatex,
      userAnswer: op.valueLatex,
      isCorrect: op.correct,
      extra: {
        N: ex.N,
        k: ex.k,
        rule: { S: '9k', C: '10k', R: 'kπ/20' },
      },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  const k = ex.k
  const N = ex.N
  const R = ex.correctLatex

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 34 — Radianes"
        prompt="Halla la medida de un ángulo expresado en radianes."
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
                <div className="font-semibold mb-2">✅ Paso 1 — Escribimos S, C y R en función de k</div>
                <p className="text-muted-foreground">
                  En este tipo de ejercicios Prisma se usa la equivalencia:
                </p>

                <div className="mt-3 grid gap-2">
                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`S=9k\\qquad C=10k\\qquad R=\\frac{k\\pi}{20}`} />
                  </div>
                  <p className="text-muted-foreground">
                    Ojo: <Tex tex={`S`} /> y <Tex tex={`C`} /> están “en unidades proporcionales a k”, y al final nos piden{' '}
                    <Tex tex={`R`} /> (radianes).
                  </p>
                </div>
              </div>

              {/* Paso 2 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 2 — Sustituimos en 3C − 2S</div>
                <div className="mt-2 space-y-2">
                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`3C-2S=${N}`} />
                  </div>
                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`3(10k)-2(9k)=${N}`} />
                  </div>
                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`30k-18k=${N}`} />
                  </div>
                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`12k=${N}`} />
                  </div>
                </div>
              </div>

              {/* Paso 3 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 3 — Hallamos k</div>
                <div className="mt-2 space-y-2">
                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`k=\\frac{${N}}{12}`} />
                  </div>
                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`k=${k}`} />
                  </div>
                </div>
              </div>

              {/* Paso 4 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 4 — Convertimos a radianes</div>
                <p className="text-muted-foreground">
                  Usamos <Tex tex={`R=\\frac{k\\pi}{20}`} /> y reemplazamos el valor de <Tex tex={`k`} />:
                </p>

                <div className="mt-2 space-y-2">
                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`R=\\frac{${k}\\pi}{20}`} />
                  </div>
                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`R=${R}`} />
                  </div>
                </div>
              </div>

              {/* Respuesta */}
              <div className="rounded-lg border bg-muted p-3">
                <div className="font-semibold">✅ Respuesta final</div>
                <div className="mt-2">
                  <Tex block tex={`R=${R}`} />
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-white p-4 mb-4">
          <div className="font-semibold mb-2">Enunciado:</div>
          <Tex block tex={promptLatex} />
          <div className="mt-3 text-sm text-muted-foreground">
            Usaremos: <span className="font-mono">S = 9k</span>, <span className="font-mono">C = 10k</span>,{' '}
            <span className="font-mono">R = kπ/20</span>.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {ex.options.map(op => {
            const isSelected = selected === op.valueLatex
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
                <div className="font-mono text-lg">
                  <Tex tex={op.valueLatex} />
                </div>
              </button>
            )
          })}
        </div>
      </ExerciseShell>
    </MathJaxContext>
  )
}
