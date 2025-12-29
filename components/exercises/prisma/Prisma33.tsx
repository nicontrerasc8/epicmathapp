'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 33 — Sistema sexagesimal (°) vs centesimal (g) + MathJax
   Estilo (como la imagen):
     (x - a)° = (x + b)g   → hallar x
   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ 100% dinámico: a,b cambian siempre
   ✅ Explicación tipo profe: convertir g→° → plantear ecuación → resolver
============================================================ */

type Option = { label: 'A' | 'B' | 'C' | 'D'; value: number; correct: boolean }

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

/* =========================
   MathJax Config (igual que Prisma 17/19)
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
   (x-a)° = (x+b)g
   Como 100g = 90°  =>  1g = 0.9°
   Entonces: (x+b)g = (9(x+b))/10 °
   Ecuación: x-a = 9(x+b)/10  =>  x = 10a + 9b  (siempre entero)
========================= */
function generateExercise() {
  for (let tries = 0; tries < 220; tries++) {
    const a = randInt(1, 6)
    const b = randInt(1, 6)

    const x = 10 * a + 9 * b
    if (x < 25 || x > 80) continue // rango “bonito” (como el ejemplo)

    const correct = x

    // distractores creíbles
    const cand = shuffle([
      correct + 1,
      correct - 1,
      correct + 2,
      correct - 2,
      correct + 3,
      correct - 3,
      correct + 4,
      correct - 4,
      10 * a + 10 * b, // error típico: usar 1g=1°
      9 * a + 9 * b, // otro error típico
    ]).filter(v => Number.isFinite(v) && v > 0 && v !== correct)

    const set = new Set<number>()
    set.add(correct)
    for (const c of cand) {
      if (set.size >= 4) break
      set.add(c)
    }
    while (set.size < 4) {
      const c = correct + randInt(-8, 8)
      if (c > 0 && c !== correct) set.add(c)
    }

    const values = shuffle(Array.from(set)).slice(0, 4)
    const labels: Option['label'][] = ['A', 'B', 'C', 'D']
    const options: Option[] = values.map((v, i) => ({
      label: labels[i],
      value: v,
      correct: v === correct,
    }))

    // latex del enunciado
    const exprLatex = `(x-${a})^{\\circ}=(x+${b})^{g}`

    // conversión (x+b)^g a grados
    const convertedLatex = `(x+${b})^{g}\\cdot\\frac{90^{\\circ}}{100^{g}}=\\frac{9x+${9 * b}}{10}^{\\circ}`

    return { a, b, correct, options, exprLatex, convertedLatex }
  }

  // fallback igual al ejemplo de la imagen (a=b=3 => x=57)
  const a = 3
  const b = 3
  const correct = 57
  const options: Option[] = [
    { label: 'A', value: 60, correct: false },
    { label: 'B', value: 59, correct: false },
    { label: 'C', value: 58, correct: false },
    { label: 'D', value: 57, correct: true },
  ]
  const exprLatex = `(x-${a})^{\\circ}=(x+${b})^{g}`
  const convertedLatex = `(x+${b})^{g}\\cdot\\frac{90^{\\circ}}{100^{g}}=\\frac{9x+${9 * b}}{10}^{\\circ}`
  return { a, b, correct, options, exprLatex, convertedLatex }
}

/* =========================
   UI — PRISMA 33
========================= */
export default function Prisma33({ temaPeriodoId }: { temaPeriodoId: string }) {
  const engine = useExerciseEngine({ maxAttempts: 1 })
  const [nonce, setNonce] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)

  const ej = useMemo(() => generateExercise(), [nonce])

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelected(op.value)
    engine.submit(op.correct)

    persistExerciseOnce({
      temaPeriodoId,
      exerciseKey: 'Prisma33',
      prompt: 'Convierte g a grados y resuelve la ecuación para hallar x.',
      questionLatex: ej.exprLatex,
      options: ej.options.map(o => `${o.label}. ${o.value}`),
      correctAnswer: String(ej.correct),
      userAnswer: String(op.value),
      isCorrect: op.correct,
      extra: {
        a: ej.a,
        b: ej.b,
        exprLatex: ej.exprLatex,
        convertedLatex: ej.convertedLatex,
        rule: '100g = 90° ⇒ 1g = 0.9°',
      },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  const { a, b } = ej

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 33 — Sexagesimal (°) y centesimal (g)"
        prompt="Siendo la igualdad, calcula el valor de x."
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
                <div className="font-semibold mb-2">👀 Paso 0 — Identifica unidades</div>
                <p className="text-muted-foreground">
                  A la izquierda está en <span className="font-semibold">grados (°)</span> y a la derecha en{' '}
                  <span className="font-semibold">grados centesimales (g)</span>.
                  <br />
                  Para igualar, convertimos todo a la misma unidad (usaremos °).
                </p>
              </div>

              {/* Paso 1 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 1 — Regla de conversión</div>
                <div className="rounded-md border bg-background p-3">
                  <Tex block tex={`100^{g}=90^{\\circ}\\;\\Rightarrow\\;1^{g}=0.9^{\\circ}=\\frac{9}{10}^{\\circ}`} />
                </div>
                <div className="mt-2 text-muted-foreground">
                  Entonces convertimos <span className="font-semibold">(x+{b})</span> g a grados:
                </div>
                <div className="mt-2">
                  <Tex block tex={ej.convertedLatex} />
                </div>
              </div>

              {/* Paso 2 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 2 — Planteamos la ecuación en °</div>
                <Tex block tex={`(x-${a})^{\\circ}=\\frac{9x+${9 * b}}{10}^{\\circ}`} />
                <p className="text-muted-foreground mt-2">Como ambos están en °, igualamos los valores.</p>
              </div>

              {/* Paso 3 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 3 — Resolución</div>
                <div className="space-y-2">
                  <Tex block tex={`x-${a}=\\frac{9x+${9 * b}}{10}`} />
                  <Tex block tex={`10x-10\\cdot ${a}=9x+${9 * b}`} />
                  <Tex block tex={`10x-${10 * a}=9x+${9 * b}`} />
                  <Tex block tex={`x=${10 * a}+${9 * b}`} />
                  <Tex block tex={`x=${ej.correct}`} />
                </div>
              </div>

              {/* Cierre */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Respuesta</div>
                <div className="inline-block rounded bg-muted px-3 py-2 font-mono text-base">{ej.correct}</div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-white p-4 mb-4">
          <div className="font-semibold mb-2">Expresión:</div>
          <Tex block tex={ej.exprLatex} />
        </div>

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
