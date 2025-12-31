'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 25 — Existencia de triángulo (inecuaciones) (MathJax)
   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ Estilo Prisma: teorema |a-b| < c < a+b
   ✅ Con diagrama simple + explicación paso a paso
   ✅ Persist estilo Prisma01: (exerciseId, temaId, classroomId, sessionId, correct, answer)
============================================================ */

type Option = { label: 'A' | 'B' | 'C' | 'D'; value: number; correct: boolean }

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
   Diagrama (referencial)
========================= */
function Diagram() {
  const A = { x: 80, y: 220 }
  const C = { x: 360, y: 220 }
  const B = { x: 200, y: 85 }
  const W = 440
  const H = 260

  const mid = (p: any, q: any) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 })
  const mAB = mid(A, B)
  const mBC = mid(B, C)
  const mAC = mid(A, C)

  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-sm font-semibold mb-2">Figura (referencial)</div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* lados */}
        <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="black" strokeWidth="3" />
        <line x1={B.x} y1={B.y} x2={C.x} y2={C.y} stroke="black" strokeWidth="3" />
        <line x1={A.x} y1={A.y} x2={C.x} y2={C.y} stroke="black" strokeWidth="3" />

        {/* puntos */}
        {[A, B, C].map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="5" fill="black" />
        ))}

        {/* letras */}
        <text x={A.x - 14} y={A.y + 20} fontSize="16">
          A
        </text>
        <text x={C.x + 8} y={C.y + 20} fontSize="16">
          C
        </text>
        <text x={B.x - 6} y={B.y - 10} fontSize="16">
          B
        </text>

        {/* etiquetas de lados */}
        <text x={mAB.x - 20} y={mAB.y - 6} fontSize="16">
          10
        </text>
        <text x={mBC.x + 10} y={mBC.y - 6} fontSize="16">
          x − 2
        </text>
        <text x={mAC.x - 24} y={mAC.y + 26} fontSize="16">
          2x + 3
        </text>
      </svg>

      <div className="mt-2 text-xs text-muted-foreground">
        Lados: <span className="font-mono">10</span>, <span className="font-mono">x−2</span>,{' '}
        <span className="font-mono">2x+3</span>
      </div>
    </div>
  )
}

/* =========================
   Generador (mismo enunciado PDF)
========================= */
function generateExercise() {
  const answer = 4

  const values = shuffle([4, 5, 6, 7])
  const labels: Option['label'][] = ['A', 'B', 'C', 'D']
  const options: Option[] = values.map((v, i) => ({
    label: labels[i],
    value: v,
    correct: v === answer,
  }))

  const questionLatex = `\\text{Los lados miden } 10,\\; x-2,\\; 2x+3.\\;\\text{Halle el valor entero de } x.`
  return { answer, options, questionLatex }
}

/* =========================
   COMPONENT
========================= */
export default function Prisma25({
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

    persistExerciseOnce({
      exerciseId, // 'Prisma25'
      temaId,
      classroomId,
      sessionId,
      correct: op.correct,
      answer: {
        selected: `${op.label}. ${op.value}`,
        correctAnswer: `${ex.answer}`,
        latex: ex.questionLatex,
        options: ex.options.map(o => `${o.label}. ${o.value}`),
        extra: {
          sides: ['10', 'x-2', '2x+3'],
          rule: '|a-b| < c < a+b',
        },
      },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1) // solo para re-mezclar opciones
  }

  // Latex de la solución (paso a paso)
  const s0 = `\\textbf{Condición: } x-2>0 \\Rightarrow x>2`
  const s1 = `\\left|(2x+3)-(x-2)\\right| < 10 < (2x+3)+(x-2)`
  const s2 = `\\left|x+5\\right| < 10 \\Rightarrow -10 < x+5 < 10 \\Rightarrow -15 < x < 5`
  const s3 = `10 < 3x+1 \\Rightarrow 9 < 3x \\Rightarrow 3 < x`
  const s4 = `\\Rightarrow 3 < x < 5 \\Rightarrow x=4`

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 25 — Existencia de triángulo"
        prompt={
          <div className="space-y-3">
            <div className="text-sm">
              Los lados de un triángulo miden <span className="font-semibold">10</span>,{' '}
              <span className="font-semibold">x − 2</span> y{' '}
              <span className="font-semibold">2x + 3</span>. Encuentra el{' '}
              <span className="font-semibold">valor entero</span> de <span className="font-semibold">x</span>.
            </div>

            <Diagram />

            <div className="text-lg">
              <Tex block tex={`\\text{Halle } x\\in\\mathbb{Z}`} />
            </div>
          </div>
        }
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <div className="space-y-4 text-sm leading-relaxed">
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 1 — Longitud positiva</div>
                <p className="text-muted-foreground">
                  Una medida de lado no puede ser negativa, así que primero:
                </p>
                <div className="mt-2">
                  <Tex block tex={s0} />
                </div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 2 — Teorema de existencia</div>
                <p className="text-muted-foreground">
                  Para que exista un triángulo con lados <span className="font-mono">a</span>,{' '}
                  <span className="font-mono">b</span>, <span className="font-mono">c</span>:
                  <span className="font-semibold"> |a-b| &lt; c &lt; a+b</span>.
                  Tomamos <span className="font-mono">a=2x+3</span>, <span className="font-mono">b=x−2</span> y{' '}
                  <span className="font-mono">c=10</span>.
                </p>
                <div className="mt-2">
                  <Tex block tex={s1} />
                </div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 3 — Resolver las inecuaciones</div>
                <div className="space-y-2">
                  <div>
                    <div className="font-semibold mb-1">Izquierda</div>
                    <Tex block tex={s2} />
                  </div>
                  <div>
                    <div className="font-semibold mb-1">Derecha</div>
                    <Tex block tex={s3} />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 4 — Intersección y entero</div>
                <p className="text-muted-foreground">
                  Juntamos todo (incluyendo <span className="font-mono">x&gt;2</span>) y buscamos el entero:
                </p>
                <div className="mt-2">
                  <Tex block tex={s4} />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm font-semibold">Respuesta:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">
                    {ex.answer}
                  </span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Chequeo rápido: el rango queda <span className="font-mono">(3,5)</span>, así que el único entero es{' '}
                <span className="font-mono">4</span>.
              </div>
            </div>
          </SolutionBox>
        }
      >
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
                <div className="font-semibold mb-1">{op.label}.</div>
                <div className="text-lg">
                  <Tex tex={`${op.value}`} />
                </div>
              </button>
            )
          })}
        </div>
      </ExerciseShell>
    </MathJaxContext>
  )
}
