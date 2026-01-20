'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 22 — Perímetro de triángulo (existencia + “doble de un lado”)
   ? 1 SOLO INTENTO (autocalifica al elegir opción)
   ? Dinámico (misma naturaleza del PDF)
   ? Paso clave: desigualdad triangular + probar x = 2a o x = 2b
   ? Persist NUEVO (igual Prisma01/Prisma20):
============================================================ */

type Option = { label: 'A' | 'B' | 'C' | 'D'; value: number; correct: boolean }

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
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
   Diagrama simple (triángulo)
========================= */
function Diagram({ a, b }: { a: number; b: number }) {
  const W = 440
  const H = 260

  const A = { x: 90, y: 220 }
  const C = { x: 350, y: 220 }
  const B = { x: 220, y: 80 }

  function mid(p: any, q: any) {
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
  }

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
        <text x={mAB.x - 20} y={mAB.y} fontSize="18" textAnchor="middle" dominantBaseline="middle">
          {a}
        </text>

        <text x={mBC.x + 20} y={mBC.y} fontSize="18" textAnchor="middle" dominantBaseline="middle">
          {b}
        </text>

        <text x={mAC.x} y={mAC.y + 22} fontSize="18" textAnchor="middle" dominantBaseline="middle">
          x
        </text>
      </svg>
    </div>
  )
}

/* =========================
   Generador (misma naturaleza)
   Lados conocidos: a (mayor), b (menor)
   Tercer lado x es doble de uno: x = 2a o x = 2b
   - Si a>b, 2a NO puede: 2a < a+b ? a<b (contradicción)
   - Para que 2b sí pueda: 2b < a+b ? b < a (ok)
     y además: a < b + 2b ? a < 3b  (condición clave)
========================= */
function generateExercise() {
  for (let tries = 0; tries < 300; tries++) {
    const b = randInt(5, 14) // menor
    const aMax = Math.min(18, 3 * b - 1)
    const a = randInt(b + 1, aMax) // mayor pero < 3b

    const xOk = 2 * b
    const P = a + b + xOk

    // distractores típicos
    const xBad = 2 * a
    const d1 = a + b + xBad
    const d2 = 2 * (a + b)
    const d3 = a + b + (a - b)

    const set = new Set<number>([P, d1, d2, d3].filter(v => Number.isFinite(v) && v > 0))
    while (set.size < 4) set.add(P + choice([-4, -3, 3, 4, 5, 6]))

    const values = shuffle(Array.from(set)).slice(0, 4)
    const labels: Option['label'][] = ['A', 'B', 'C', 'D']
    const options: Option[] = values.map((v, i) => ({
      label: labels[i],
      value: v,
      correct: v === P,
    }))

    const questionLatex =
      `\\text{Dos lados miden } ${a} \\text{ y } ${b}.\\ ` +
      `\\text{El tercer lado } x \\text{ es el doble de uno de ellos. Halle el perímetro.}`

    return { a, b, xOk, P, options, questionLatex }
  }

  // fallback
  const a = 12
  const b = 8
  const xOk = 16
  const P = 36
  const options: Option[] = [
    { label: 'A', value: 33, correct: false },
    { label: 'B', value: 34, correct: false },
    { label: 'C', value: 36, correct: true },
    { label: 'D', value: 44, correct: false },
  ]
  const questionLatex =
    `\\text{Dos lados miden } 12 \\text{ y } 8.\\ ` +
    `\\text{El tercer lado es el doble de uno de ellos. Halle el perímetro.}`
  return { a, b, xOk, P, options, questionLatex }
}

/* =========================
   COMPONENT
========================= */
export default function Prisma22({
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

  const ex = useMemo(() => generateExercise(), [nonce])

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelected(op.value)
    engine.submit(op.correct)

    // ? Persist NUEVO (igual Prisma01/Prisma20)
    persistExerciseOnce({
      exerciseId, // ej: 'Prisma22'
      classroomId,
      sessionId,

      correct: op.correct,

      answer: {
        selected: String(op.value),
        correctAnswer: String(ex.P),
        latex: ex.questionLatex,
        options: ex.options.map(o => String(o.value)),
        extra: {
          a: ex.a,
          b: ex.b,
          x: ex.xOk,
          perimeter: ex.P,
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

  // LaTeX solución
  const ineq1 = `|${ex.a}-${ex.b}| < x < ${ex.a}+${ex.b}`
  const ineq2 = `${Math.abs(ex.a - ex.b)} < x < ${ex.a + ex.b}`
  const probar = `x=2\\cdot ${ex.b}=${2 * ex.b}\\;\\;\\text{o}\\;\\; x=2\\cdot ${ex.a}=${2 * ex.a}`

  const valida1 = `${Math.abs(ex.a - ex.b)} < ${2 * ex.b} < ${ex.a + ex.b}\\;\\;\\Rightarrow\\;\\; \\text{sí puede}`
  const valida2 = `${Math.abs(ex.a - ex.b)} < ${2 * ex.a} < ${ex.a + ex.b}\\;\\;\\Rightarrow\\;\\; \\text{no puede}`

  const per = `P=${ex.a}+${ex.b}+${2 * ex.b}=${ex.P}`

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 22 — Perímetro (existencia del triángulo)"
        prompt={
          <div className="space-y-3">
            <div className="text-sm">
              Dos lados de un triángulo miden <span className="font-semibold">{ex.a}</span> y{' '}
              <span className="font-semibold">{ex.b}</span>. El tercer lado <span className="font-semibold">x</span>{' '}
              mide el doble de uno de estos lados. Hallar el <span className="font-semibold">perímetro</span>.
            </div>

            <Diagram a={ex.a} b={ex.b} />

            <div className="text-lg">
              <Tex block tex={`\\text{Halle } P`} />
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
                <div className="font-semibold mb-2">? Paso 1 — Desigualdad triangular (existencia)</div>
                <p className="text-muted-foreground">
                  Para que exista el triángulo, el tercer lado <span className="font-mono">x</span> debe cumplir:
                </p>
                <div className="mt-2 space-y-2">
                  <Tex block tex={ineq1} />
                  <Tex block tex={ineq2} />
                </div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 2 — “x es doble de uno de los lados”</div>
                <p className="text-muted-foreground">Entonces solo hay 2 posibilidades:</p>
                <div className="mt-2">
                  <Tex block tex={probar} />
                </div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 3 — Probar cuál sí cumple</div>
                <div className="mt-2 space-y-2">
                  <Tex block tex={valida1} />
                  <Tex block tex={valida2} />
                </div>
                <p className="text-muted-foreground mt-2">
                  Por lo tanto, el tercer lado correcto es <span className="font-semibold">x = {ex.xOk}</span>.
                </p>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 4 — Perímetro</div>
                <div className="mt-2">
                  <Tex block tex={per} />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm font-semibold">Respuesta:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">{ex.P}</span>
                </div>
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



