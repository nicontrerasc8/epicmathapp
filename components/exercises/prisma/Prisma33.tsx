'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 33 — Sistema sexagesimal (°) vs centesimal (g) + MathJax
   Estilo:
     (x - a)° = (x + b)g   ? hallar x

   ? 1 SOLO INTENTO (autocalifica al elegir opción)
   ? 100% dinámico: a,b cambian siempre
   ? Explicación tipo profe: convertir g?° ? ecuación ? resolver
   ? Persist: NUEVO FORMATO (como tu Prisma 29)
============================================================ */

type Option = { label: 'A' | 'B' | 'C' | 'D'; value: number; correct: boolean }

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
   MathJax Config
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
   100g = 90° ? 1g = 0.9° = 9/10°
   ? (x+b)g = 9(x+b)/10 °
   Ecuación: x-a = 9(x+b)/10  ? x = 10a + 9b
========================= */
function generateExercise() {
  for (let tries = 0; tries < 220; tries++) {
    const a = randInt(1, 6)
    const b = randInt(1, 6)

    const x = 10 * a + 9 * b
    if (x < 25 || x > 80) continue // rango “bonito”

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
      10 * a + 10 * b, // error típico: asumir 1g=1°
      9 * a + 9 * b, // otro error típico
      10 * a + 8 * b,
      8 * a + 9 * b,
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

    const exprLatex = `(x-${a})^{\\circ}=(x+${b})^{g}`
    const convertedLatex = `(x+${b})^{g}\\cdot\\frac{90^{\\circ}}{100^{g}}=\\frac{9(x+${b})}{10}^{\\circ}`

    return { a, b, correct, options, exprLatex, convertedLatex }
  }

  // fallback: a=b=3 ? x=57
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
  const convertedLatex = `(x+${b})^{g}\\cdot\\frac{90^{\\circ}}{100^{g}}=\\frac{9(x+${b})}{10}^{\\circ}`
  return { a, b, correct, options, exprLatex, convertedLatex }
}

/* =========================
   UI — PRISMA 33 (NUEVO FORMATO)
========================= */
export default function Prisma33({
  exerciseId,
  classroomId,
  sessionId,
}: {
  exerciseId: string
  classroomId: string
  sessionId?: string
}) {
  const engine = useExerciseEngine({ maxAttempts: 1 })
  const [nonce, setNonce] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)

  const ej = useMemo(() => generateExercise(), [nonce])

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelected(op.value)
    engine.submit(op.correct)

    const ordered = ej.options.slice().sort((a, b) => a.label.localeCompare(b.label))

    persistExerciseOnce({
      exerciseId,
      classroomId,
      sessionId,

      correct: op.correct,

      answer: {
        selected: String(op.value),
        correctAnswer: String(ej.correct),

        // lo que quieres que quede como “enunciado” LaTeX en el registro
        latex: `\\text{Hallar }x\\text{ si }(x-${ej.a})^{\\circ}=(x+${ej.b})^{g}.`,

        // SOLO valores (ordenados), como tu Prisma 29
        options: ordered.map(o => String(o.value)),

        extra: {
          a: ej.a,
          b: ej.b,
          exprLatex: ej.exprLatex,
          convertedLatex: ej.convertedLatex,
          rule: '100g = 90° ? 1g = 0.9° = 9/10°',
          labeledOptions: ordered.map(o => `${o.label}.\\ ${o.value}`),
        },
      },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  const { a, b } = ej

  // pasos para solución
  const s0 = `100^{g}=90^{\\circ}\\Rightarrow 1^{g}=\\frac{9}{10}^{\\circ}`
  const s1 = `(x+${b})^{g}=\\frac{9(x+${b})}{10}^{\\circ}`
  const s2 = `(x-${a})^{\\circ}=\\frac{9(x+${b})}{10}^{\\circ}`
  const s3 = `x-${a}=\\frac{9(x+${b})}{10}`
  const s4 = `10x-10\\cdot ${a}=9x+9\\cdot ${b}`
  const s5 = `x=10\\cdot ${a}+9\\cdot ${b}=${ej.correct}`

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
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 1 — Conversión g ? °</div>
                <div className="rounded-md border bg-background p-3 space-y-2">
                  <Tex block tex={s0} />
                  <Tex block tex={s1} />
                </div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 2 — Ecuación en grados</div>
                <div className="rounded-md border bg-background p-3 space-y-2">
                  <Tex block tex={s2} />
                  <Tex block tex={s3} />
                </div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 3 — Resolver</div>
                <div className="rounded-md border bg-background p-3 space-y-2">
                  <Tex block tex={s4} />
                  <Tex block tex={s5} />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="font-semibold">Respuesta:</span>
                  <span className="inline-block rounded bg-muted px-3 py-2 font-mono text-base">
                    {ej.correct}
                  </span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Nota: se iguala en la misma unidad (°) y recién se resuelve la ecuación.
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



