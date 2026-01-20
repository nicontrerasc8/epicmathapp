'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 25 — Existencia de triángulo (inecuaciones) (MathJax)
   ? 1 SOLO INTENTO (autocalifica al elegir opción)
   ? 100% dinámico: lado constante + expresiones + opciones + solución
   ? Estilo Prisma: |a-b| < c < a+b
============================================================ */

type Option = { label: 'A' | 'B' | 'C' | 'D'; value: number; correct: boolean }

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
   Helpers: fracciones bonitas en LaTeX
========================= */
function gcd(a: number, b: number) {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const t = x % y
    x = y
    y = t
  }
  return x
}
function fracLatex(num: number, den: number) {
  if (den === 0) return '\\text{indef.}'
  if (den < 0) {
    num = -num
    den = -den
  }
  const g = gcd(num, den)
  const n = num / g
  const d = den / g
  if (d === 1) return `${n}`
  // si es entero negativo, queda bien igual
  return `\\frac{${n}}{${d}}`
}

function exprLinear(m: number, r: number) {
  if (m === 1) return r === 0 ? 'x' : r > 0 ? `x+${r}` : `x${r}`
  const mr = r === 0 ? '' : r > 0 ? `+${r}` : `${r}`
  return `${m}x${mr}`
}
function exprXMinus(p: number) {
  return p === 0 ? 'x' : `x-${p}`
}

/* =========================
   Diagrama (referencial) — labels dinámicos
========================= */
function Diagram({
  c,
  p,
  m,
  r,
}: {
  c: number
  p: number
  m: number
  r: number
}) {
  const A = { x: 80, y: 220 }
  const C = { x: 360, y: 220 }
  const B = { x: 200, y: 85 }
  const W = 440
  const H = 260

  const mid = (u: any, v: any) => ({ x: (u.x + v.x) / 2, y: (u.y + v.y) / 2 })
  const mAB = mid(A, B)
  const mBC = mid(B, C)
  const mAC = mid(A, C)

  const sideAB = `${c}`
  const sideBC = exprXMinus(p).replace('-', ' - ')
  const sideAC = exprLinear(m, r)
    .replace('+', ' + ')
    .replace('-', ' - ')

  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-sm font-semibold mb-2">Figura (referencial)</div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* lados */}
        <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="black" strokeWidth="3" />
        <line x1={B.x} y1={B.y} x2={C.x} y2={C.y} stroke="black" strokeWidth="3" />
        <line x1={A.x} y1={A.y} x2={C.x} y2={C.y} stroke="black" strokeWidth="3" />

        {/* puntos */}
        {[A, B, C].map((pt, i) => (
          <circle key={i} cx={pt.x} cy={pt.y} r="5" fill="black" />
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
        <text x={mAB.x - 22} y={mAB.y - 6} fontSize="16">
          {sideAB}
        </text>
        <text x={mBC.x + 10} y={mBC.y - 6} fontSize="16">
          {sideBC}
        </text>
        <text x={mAC.x - 30} y={mAC.y + 26} fontSize="16">
          {sideAC}
        </text>
      </svg>

      <div className="mt-2 text-xs text-muted-foreground">
        Lados: <span className="font-mono">{c}</span>,{' '}
        <span className="font-mono">{exprXMinus(p)}</span>,{' '}
        <span className="font-mono">{exprLinear(m, r)}</span>
      </div>
    </div>
  )
}

/* =========================
   Generador 100% dinámico
   - Busca parámetros con 1 solo x entero válido
========================= */
type Gen = {
  answer: number
  options: Option[]
  questionLatex: string
  params: { c: number; p: number; m: number; r: number }
  sol: {
    s0: string
    s1: string
    s2: string
    s3: string
    s4: string
    s5: string
  }
}

function generateExercise(): Gen {
  // intentos para encontrar un caso con solución única entera
  for (let tries = 0; tries < 250; tries++) {
    // lado constante
    const c = randInt(7, 18)

    // lado (x - p) con p>0
    const p = randInt(1, 8)

    // lado (m x + r), m >= 2 para que haya despeje bonito
    const m = [2, 3][randInt(0, 1)]
    const r = randInt(1, 10)

    // buscamos x enteros en un rango razonable
    const sols: number[] = []
    for (let x = -10; x <= 40; x++) {
      const a = c
      const b = x - p
      const d = m * x + r

      if (b <= 0) continue // longitud positiva
      if (d <= 0) continue
      // desigualdades triangulares
      if (a + b <= d) continue
      if (a + d <= b) continue
      if (b + d <= a) continue

      sols.push(x)
    }

    // queremos EXACTAMENTE una solución entera
    if (sols.length !== 1) continue
    const answer = sols[0]

    // opciones: 1 correcta + 3 distractores cercanos
    const pool = new Set<number>()
    pool.add(answer)
    // cerca primero
    ;[answer - 2, answer - 1, answer + 1, answer + 2, answer + 3, answer - 3].forEach(v =>
      pool.add(v),
    )
    // relleno por si faltan
    while (pool.size < 8) pool.add(answer + randInt(-8, 8))

    const candidates = Array.from(pool).filter(v => v !== answer)
    const distractors = shuffle(candidates).slice(0, 3)

    const values = shuffle([answer, ...distractors]).slice(0, 4)
    const labels: Option['label'][] = ['A', 'B', 'C', 'D']
    const options: Option[] = values.map((v, i) => ({
      label: labels[i],
      value: v,
      correct: v === answer,
    }))

    const side1 = `${c}`
    const side2 = exprXMinus(p)
    const side3 = exprLinear(m, r)

    const questionLatex = `\\text{Los lados miden } ${side1},\\; ${side2},\\; ${side3}.\\;\\text{Halle el valor entero de } x.`

    /* ===== Solución dinámica (misma línea que tu Prisma25 original) ===== */
    const s0 = `\\textbf{Paso 1: } ${side2} > 0 \\Rightarrow x > ${p}`

    const s1 = `\\textbf{Paso 2: } \\left|(${side3})-(${side2})\\right| < ${side1} < (${side3})+(${side2})`

    // abs: |(m-1)x + (r+p)| < c
    const k = m - 1
    const sumRP = r + p
    const absInside = k === 1 ? `x+${sumRP}` : `${k}x+${sumRP}`

    const s2 = `\\left|${absInside}\\right| < ${c} \\Rightarrow -${c} < ${absInside} < ${c}`

    // bounds from abs:
    // (-c - (r+p))/k < x < (c - (r+p))/k
    const lowerAbsNum = -c - sumRP
    const upperAbsNum = c - sumRP
    const lowerAbs = fracLatex(lowerAbsNum, k)
    const upperAbs = fracLatex(upperAbsNum, k)

    const s3 = `\\Rightarrow ${lowerAbs} < x < ${upperAbs}`

    // right inequality: c < (m+1)x + (r-p) => x > (c - (r-p))/(m+1)
    const mp1 = m + 1
    const rMinusP = r - p
    const rightNum = c - rMinusP
    const rightBound = fracLatex(rightNum, mp1)

    const s4 = `\\textbf{Paso 3: } ${c} < (${side3})+(${side2}) = ${mp1}x+(${rMinusP}) \\Rightarrow x > ${rightBound}`

    // consolidar (sin max, estilo profe): ponemos 3 condiciones y luego el rango final
    const s5 = `\\textbf{Paso 4: } x>${p},\\; x>${rightBound},\\; ${lowerAbs}<x<${upperAbs}\\;\\Rightarrow\\; x=${answer}`

    return {
      answer,
      options,
      questionLatex,
      params: { c, p, m, r },
      sol: { s0, s1, s2, s3, s4, s5 },
    }
  }

  // fallback ultra seguro (por si algo raro pasa)
  const c = 10
  const p = 2
  const m = 2
  const r = 3
  const answer = 4
  const options: Option[] = shuffle([4, 5, 6, 7]).map((v, i) => ({
    label: (['A', 'B', 'C', 'D'] as const)[i],
    value: v,
    correct: v === answer,
  }))
  return {
    answer,
    options,
    questionLatex: `\\text{Los lados miden } 10,\\; x-2,\\; 2x+3.\\;\\text{Halle el valor entero de } x.`,
    params: { c, p, m, r },
    sol: {
      s0: `\\textbf{Paso 1: } x-2>0 \\Rightarrow x>2`,
      s1: `\\textbf{Paso 2: } \\left|(2x+3)-(x-2)\\right| < 10 < (2x+3)+(x-2)`,
      s2: `\\left|x+5\\right| < 10 \\Rightarrow -10 < x+5 < 10`,
      s3: `\\Rightarrow -15 < x < 5`,
      s4: `10 < 3x+1 \\Rightarrow x>3`,
      s5: `\\Rightarrow 3<x<5 \\Rightarrow x=4`,
    },
  }
}

/* =========================
   COMPONENT
========================= */
export default function Prisma25({
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

    const { c, p, m, r } = ex.params

    persistExerciseOnce({
      exerciseId, // 'Prisma25'
      classroomId,
      sessionId,
      correct: op.correct,
      answer: {
        selected: `${op.label}. ${op.value}`,
        correctAnswer: `${ex.answer}`,
        latex: ex.questionLatex,
        options: ex.options.map(o => `${o.label}. ${o.value}`),
        extra: {
          sides: [`${c}`, `x-${p}`, `${m}x${r >= 0 ? `+${r}` : `${r}`}`],
          rule: '|a-b| < c < a+b',
          params: ex.params,
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
        title="Prisma 25 — Existencia de triángulo"
        prompt={
          <div className="space-y-3">
            <div className="text-sm">
              Los lados de un triángulo miden{' '}
              <span className="font-semibold">{ex.params.c}</span>,{' '}
              <span className="font-semibold">{exprXMinus(ex.params.p).replace('-', ' - ')}</span>{' '}
              y <span className="font-semibold">{exprLinear(ex.params.m, ex.params.r)}</span>. Encuentra
              el <span className="font-semibold">valor entero</span> de{' '}
              <span className="font-semibold">x</span>.
            </div>

            <Diagram {...ex.params} />

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
                <div className="font-semibold mb-2">? Paso 1 — Longitud positiva</div>
                <p className="text-muted-foreground">
                  Primero garantizamos que el lado con variable sea positivo.
                </p>
                <div className="mt-2">
                  <Tex block tex={ex.sol.s0} />
                </div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 2 — Teorema de existencia</div>
                <p className="text-muted-foreground">
                  Para que exista un triángulo con lados <span className="font-mono">a</span>,{' '}
                  <span className="font-mono">b</span>, <span className="font-mono">c</span>:
                  <span className="font-semibold"> |a-b| &lt; c &lt; a+b</span>.
                </p>
                <div className="mt-2">
                  <Tex block tex={ex.sol.s1} />
                </div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 3 — Resolver las inecuaciones</div>
                <div className="space-y-2">
                  <div>
                    <div className="font-semibold mb-1">Izquierda (valor absoluto)</div>
                    <Tex block tex={ex.sol.s2} />
                    <div className="mt-2">
                      <Tex block tex={ex.sol.s3} />
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold mb-1">Derecha (suma)</div>
                    <Tex block tex={ex.sol.s4} />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 4 — Intersección e integralidad</div>
                <p className="text-muted-foreground">
                  Tomamos la intersección de condiciones y elegimos el valor entero.
                </p>
                <div className="mt-2">
                  <Tex block tex={ex.sol.s5} />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm font-semibold">Respuesta:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">
                    {ex.answer}
                  </span>
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



