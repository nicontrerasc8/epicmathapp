'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 15 — Reduce (potencias) — estilo Prisma + MathJax
   Forma: M = (3^x · 9^(x+a) · 27^(x+b)) / 3^(6x+c)

   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ Dinámico (a,b,c cambian)
   ✅ Resolución paso a paso tipo profe
   ✅ MathJax (better-react-mathjax)
   ✅ Persist NUEVO estilo Prisma01 (exerciseId, temaId, classroomId...)
============================================================ */

type Option = { label: 'A' | 'B' | 'C' | 'D'; value: string; correct: boolean }

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function pow3ToStr(k: number) {
  if (k === 0) return '1'
  if (k === 1) return '3'
  if (k === 2) return '9'
  if (k === 3) return '27'
  if (k === 4) return '81'
  if (k === 5) return '243'
  if (k === -1) return '1/3'
  if (k === -2) return '1/9'
  if (k === -3) return '1/27'
  if (k === -4) return '1/81'
  if (k === -5) return '1/243'
  return k > 0 ? `3^${k}` : `1/3^${Math.abs(k)}`
}

/* =========================
   GENERADOR
========================= */
function generateProblem() {
  // Numerador:
  // 3^x · 9^(x+a) · 27^(x+b)
  // = 3^x · (3^2)^(x+a) · (3^3)^(x+b)
  // = 3^[ x + 2(x+a) + 3(x+b) ] = 3^[ 6x + (2a+3b) ]
  //
  // Denominador: 3^(6x+c)
  // M = 3^[ (6x+2a+3b) - (6x+c) ] = 3^(2a+3b-c) = 3^k
  //
  // Elegimos a,b,k y definimos c = 2a+3b-k.

  for (let tries = 0; tries < 200; tries++) {
    const a = randInt(1, 4)
    const b = randInt(1, 4)
    const k = choice([-4, -3, -2, -1, 0, 1, 2, 3, 4])

    const c = 2 * a + 3 * b - k
    if (c < 1 || c > 24) continue

    const kFinal = 2 * a + 3 * b - c // = k
    const correct = pow3ToStr(kFinal)

    // Distractores típicos
    const wrong1 = pow3ToStr(2 * a + 3 * b + c) // resta mal (pone +c)
    const wrong2 = choice(['3', '1/3', '9', '1/9']) // olvida potencia de potencia
    const wrong3 = pow3ToStr(kFinal + choice([-2, -1, 1, 2])) // error en suma/coeficientes

    const pool = new Set<string>()
    pool.add(correct)
    ;[wrong1, wrong2, wrong3].forEach(v => {
      if (pool.size < 4 && v !== correct) pool.add(v)
    })
    while (pool.size < 4) {
      const extra = pow3ToStr(choice([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]))
      if (extra !== correct) pool.add(extra)
    }

    const labels: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D']
    const options = shuffle(Array.from(pool))
      .slice(0, 4)
      .map((v, i) => ({ label: labels[i], value: v, correct: v === correct }))

    return { a, b, c, kFinal, correct, options }
  }

  // fallback (da 1/9)
  return {
    a: 2,
    b: 3,
    c: 15,
    kFinal: -2,
    correct: '1/9',
    options: [
      { label: 'A', value: '1/3', correct: false },
      { label: 'B', value: '3', correct: false },
      { label: 'C', value: '1/9', correct: true },
      { label: 'D', value: '9', correct: false },
    ] as Option[],
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
   UI — PRISMA 15 (MathJax)
========================= */
export default function Prisma15({
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
  const [selected, setSelected] = useState<string | null>(null)

  const ex = useMemo(() => generateProblem(), [nonce])

  const a = ex.a
  const b = ex.b
  const c = ex.c

  const upConst = 2 * a + 3 * b
  const kFinal = upConst - c
  const answer = pow3ToStr(kFinal)

  const exprLatex = `M=\\frac{3^x\\cdot 9^{x+${a}}\\cdot 27^{x+${b}}}{3^{6x+${c}}}`

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelected(op.value)
    engine.submit(op.correct)

    const correctPretty = ex.correct
    const selectedPretty = op.value

    persistExerciseOnce({
      exerciseId, // 'Prisma15'
      temaId,
      classroomId,
      sessionId,
      correct: op.correct,
      answer: {
        selected: selectedPretty,
        correctAnswer: correctPretty,
        latex: exprLatex,
        options: ex.options.map(o => `${o.label}. ${o.value}`),
        extra: {
          exprLatex,
          a,
          b,
          c,
          k: kFinal,
          answer,
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
        title="Prisma 15 — Reduce"
        prompt="Reduce:"
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
                <div className="font-semibold mb-2">✅ Paso 1 — Pasamos todo a base 3</div>
                <p className="text-muted-foreground">
                  Escribimos <Tex tex={`9`} /> y <Tex tex={`27`} /> como potencias de <Tex tex={`3`} />:
                </p>

                <div className="mt-3 space-y-2">
                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`9=3^2`} />
                  </div>
                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`27=3^3`} />
                  </div>
                </div>
              </div>

              {/* Paso 2 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 2 — Potencia de potencia</div>
                <p className="text-muted-foreground">
                  Regla: <Tex tex={`(a^m)^n=a^{m\\cdot n}`} />.
                </p>

                <div className="mt-3 space-y-2">
                  <div className="rounded border bg-white p-3">
                    <Tex block tex={exprLatex} />
                  </div>

                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`M=\\frac{3^x\\cdot (3^2)^{x+${a}}\\cdot (3^3)^{x+${b}}}{3^{6x+${c}}}`} />
                  </div>

                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`M=\\frac{3^x\\cdot 3^{2(x+${a})}\\cdot 3^{3(x+${b})}}{3^{6x+${c}}}`} />
                  </div>
                </div>
              </div>

              {/* Paso 3 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 3 — Sumar exponentes del numerador</div>
                <p className="text-muted-foreground">
                  Regla: <Tex tex={`3^u\\cdot 3^v=3^{u+v}`} />.
                </p>

                <div className="mt-3 space-y-2">
                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`\\text{Exponente arriba}=x+2(x+${a})+3(x+${b})`} />
                  </div>

                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`=x+2x+${2 * a}+3x+${3 * b}`} />
                  </div>

                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`=6x+${upConst}`} />
                  </div>

                  <div className="text-muted-foreground">
                    Entonces el numerador queda: <Tex tex={`3^{6x+${upConst}}`} />.
                  </div>
                </div>
              </div>

              {/* Paso 4 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 4 — Dividir potencias</div>
                <p className="text-muted-foreground">
                  Regla: <Tex tex={`\\frac{3^u}{3^v}=3^{u-v}`} />.
                </p>

                <div className="mt-3 space-y-2">
                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`M=\\frac{3^{6x+${upConst}}}{3^{6x+${c}}}`} />
                  </div>

                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`M=3^{(6x+${upConst})-(6x+${c})}`} />
                  </div>

                  <div className="rounded border bg-white p-3">
                    <Tex block tex={`M=3^{${upConst}-${c}}`} />
                  </div>

                  <div className="text-muted-foreground">
                    Se cancela <Tex tex={`6x`} /> y queda el exponente numérico.
                  </div>
                </div>
              </div>

              {/* Respuesta */}
              <div className="rounded-lg border bg-muted p-3">
                <div className="font-semibold">✅ Respuesta final</div>
                <div className="mt-2 space-y-1">
                  <Tex block tex={`M=3^{${kFinal}}`} />
                  <div className="font-mono text-base">{answer}</div>
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
