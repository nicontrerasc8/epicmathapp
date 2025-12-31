'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 20 — Suma de logaritmos telescópica
   Ejemplo: E = log(1/2)+log(2/3)+...+log(9/10)  => E = -1

   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ MathJax (better-react-mathjax)
   ✅ Explicación tipo profe (producto, cancelación, resultado)
   ✅ Persist NUEVO (igual Prisma01): { exerciseId, temaId, classroomId, sessionId, correct, answer:{} }
============================================================ */

type Option = { label: 'A' | 'B' | 'C' | 'D'; value: number; correct: boolean }

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
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
   GENERADOR
   Elegimos una base b (7..12) y armamos:
   E = log_b(1/2)+log_b(2/3)+...+log_b((b-1)/b)
   Producto telescópico => 1/b
   log_b(1/b) = -1
========================= */
function generateExercise() {
  const b = randInt(7, 12)

  // Correcto siempre -1
  const correct = -1

  // Distractores típicos (muy Prisma)
  const distractors = shuffle([1, b, -b]).slice(0, 3)

  const values = shuffle([correct, ...distractors])
  const labels: Option['label'][] = ['A', 'B', 'C', 'D']
  const options: Option[] = values.map((v, i) => ({
    label: labels[i],
    value: v,
    correct: v === correct,
  }))

  const exprLatex =
    `E=\\log_{${b}}\\left(\\frac{1}{2}\\right)+` +
    `\\log_{${b}}\\left(\\frac{2}{3}\\right)+` +
    `\\log_{${b}}\\left(\\frac{3}{4}\\right)+\\cdots+` +
    `\\log_{${b}}\\left(\\frac{${b - 1}}{${b}}\\right)`

  return { b, correct, options, exprLatex }
}

/* =========================
   COMPONENT
========================= */
export default function Prisma20({
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

  const ex = useMemo(() => generateExercise(), [nonce])

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelected(op.value)
    engine.submit(op.correct)

    // ✅ Persist NUEVO (igual Prisma01)
    persistExerciseOnce({
      exerciseId, // ej: 'Prisma20'
      temaId,
      classroomId,
      sessionId,

      correct: op.correct,

      answer: {
        selected: String(op.value),
        correctAnswer: String(ex.correct),
        latex: ex.exprLatex,
        options: ex.options.map(o => String(o.value)),
        extra: {
          base: ex.b,
          telescoping: true,
          labeledOptions: ex.options.map(o => `${o.label}. ${o.value}`),
        },
      },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  // Para solución
  const b = ex.b
  const productLatex = `\\left(\\frac{1}{2}\\right)\\left(\\frac{2}{3}\\right)\\left(\\frac{3}{4}\\right)\\cdots\\left(\\frac{${b - 1}}{${b}}\\right)`
  const telescopedLatex = `=\\frac{1\\cdot \\cancel{2}\\cdot \\cancel{3}\\cdots \\cancel{${b - 1}}}{\\cancel{2}\\cdot \\cancel{3}\\cdots \\cancel{${b - 1}}\\cdot ${b}}=\\frac{1}{${b}}`

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 20 — Logaritmos (telescópico)"
        prompt="Halle el valor de E."
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
                <div className="font-semibold mb-2">
                  ✅ Paso 1 — Unimos la suma (logaritmo del producto)
                </div>
                <p className="text-muted-foreground">
                  Propiedad: <Tex tex={`\\log_b(m)+\\log_b(n)=\\log_b(m\\cdot n)`} />.
                  <br />
                  O sea: <span className="font-semibold">sumar logaritmos = logaritmo del producto</span>.
                </p>

                <div className="mt-3 space-y-2">
                  <div className="rounded border bg-white p-3">
                    <Tex block tex={ex.exprLatex} />
                  </div>

                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`E=\\log_{${b}}\\left(${productLatex}\\right)`} />
                  </div>
                </div>
              </div>

              {/* Paso 2 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">
                  ✅ Paso 2 — Reducimos el producto (se cancela “en cadena”)
                </div>
                <p className="text-muted-foreground">
                  El <Tex tex={`2`} /> de arriba cancela con el <Tex tex={`2`} /> de abajo,
                  el <Tex tex={`3`} /> con el <Tex tex={`3`} />, y así sucesivamente.
                </p>

                <div className="mt-3 space-y-2">
                  <div className="rounded border bg-white p-3">
                    <Tex block tex={productLatex} />
                  </div>
                  <div className="rounded border bg-white p-3">
                    <Tex block tex={telescopedLatex} />
                  </div>
                </div>
              </div>

              {/* Paso 3 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 3 — Logaritmo final</div>
                <p className="text-muted-foreground">
                  Como el producto vale <Tex tex={`\\frac{1}{${b}}`} />, entonces:
                </p>

                <div className="mt-3 space-y-2">
                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`E=\\log_{${b}}\\left(\\frac{1}{${b}}\\right)`} />
                  </div>

                  <div className="rounded border bg-white p-3">
                    <Tex
                      block
                      tex={`\\frac{1}{${b}}=${b}^{-1}\\ \\Rightarrow\\ E=\\log_{${b}}\\left(${b}^{-1}\\right)=-1`}
                    />
                  </div>
                </div>
              </div>

              {/* Respuesta */}
              <div className="rounded-lg border bg-muted p-3">
                <div className="font-semibold">✅ Respuesta final</div>
                <div className="mt-2">
                  <Tex block tex={`E=-1`} />
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        {/* Enunciado */}
        <div className="rounded-xl border bg-white p-4 mb-4">
          <div className="font-semibold mb-2">Expresión:</div>
          <Tex block tex={ex.exprLatex} />
        </div>

        {/* Opciones */}
        <div className="grid grid-cols-2 gap-4">
          {ex.options.map(op => {
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
