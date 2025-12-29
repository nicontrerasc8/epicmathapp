'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 21 — Geometría (Isósceles + Ángulo exterior) (MathJax)
   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ Dinámico (misma “naturaleza” del ejercicio de tu imagen)
   ✅ Explicación tipo profe: isósceles → exterior → suma triángulo
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
function lcm(a: number, b: number) {
  return (a * b) / gcd(a, b)
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
  latex,
  display = false,
  className = '',
}: {
  latex: string
  display?: boolean
  className?: string
}) {
  const wrapped = display ? `\\[${latex}\\]` : `\\(${latex}\\)`
  return (
    <span className={className}>
      <MathJax dynamic>{wrapped}</MathJax>
    </span>
  )
}

/* =========================
   SVG mini-diagrama (simple)
   (No es un editor, pero ayuda a “ver” el ejercicio)
========================= */
function Diagram({ k, alpha }: { k: number; alpha: number }) {
  /* =====================
     PUNTOS (FIJOS)
  ====================== */
  const A = { x: 80, y: 220 }
  const D = { x: 260, y: 220 }
  const C = { x: 360, y: 220 }
  const B = { x: 170, y: 90 }

  const W = 440
  const H = 260

  /* =====================
     UTILIDADES
  ====================== */
  function angle(p: any, q: any) {
    return Math.atan2(p.y - q.y, p.x - q.x)
  }

  function norm(a: number) {
    // (-pi, pi]
    while (a <= -Math.PI) a += 2 * Math.PI
    while (a > Math.PI) a -= 2 * Math.PI
    return a
  }

  function midAngle(a1: number, a2: number) {
    // punto medio por el camino "corto"
    a1 = norm(a1)
    a2 = norm(a2)
    let d = norm(a2 - a1)
    return norm(a1 + d / 2)
  }

  function arcPath(cx: number, cy: number, r: number, a1: number, a2: number) {
    // arco por el camino "corto"
    a1 = norm(a1)
    a2 = norm(a2)
    const d = norm(a2 - a1)
    const end = a1 + d

    const x1 = cx + r * Math.cos(a1)
    const y1 = cy + r * Math.sin(a1)
    const x2 = cx + r * Math.cos(end)
    const y2 = cy + r * Math.sin(end)

    // short-arc siempre: largeArcFlag = 0
    // sweepFlag depende del signo del delta
    const sweep = d >= 0 ? 1 : 0

    return `M ${x1} ${y1} A ${r} ${r} 0 0 ${sweep} ${x2} ${y2}`
  }

  function tick(p1: any, p2: any, len = 12) {
    const mx = (p1.x + p2.x) / 2
    const my = (p1.y + p2.y) / 2
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const L = Math.hypot(dx, dy) || 1
    const nx = -dy / L
    const ny = dx / L
    return {
      x1: mx - (nx * len) / 2,
      y1: my - (ny * len) / 2,
      x2: mx + (nx * len) / 2,
      y2: my + (ny * len) / 2,
    }
  }

  /* =====================
     ÁNGULOS (CORREGIDOS)
  ====================== */
  // ∠A = kx (entre AB y AD)
  const aAB = angle(B, A)
  const aAD = angle(D, A)
  const aMidA = midAngle(aAB, aAD)

  // ✅ ∠ADB = alpha (entre DA y DB)  <-- ESTO era lo que estaba mal
  const aDA = angle(A, D)
  const aDB = angle(B, D)
  const aMidD = midAngle(aDA, aDB)

  // ∠C = y (entre CB y CD)
  const aCB = angle(B, C)
  const aCD = angle(D, C)
  const aMidC = midAngle(aCB, aCD)

  /* =====================
     TICKS ISÓSCELES
  ====================== */
  const tAB = tick(A, B)
  const tBD = tick(B, D)
  const tDC = tick(D, C)

  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-sm font-semibold mb-2">Figura (referencial)</div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* BASE */}
        <line x1={A.x} y1={A.y} x2={C.x} y2={C.y} stroke="black" strokeWidth="3" />

        {/* LADOS */}
        <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="black" strokeWidth="3" />
        <line x1={B.x} y1={B.y} x2={D.x} y2={D.y} stroke="black" strokeWidth="3" />
        <line x1={B.x} y1={B.y} x2={C.x} y2={C.y} stroke="black" strokeWidth="3" />

        {/* RAYITAS (marcas) */}
        <line {...tAB} stroke="black" strokeWidth="3" />
        <line {...tBD} stroke="black" strokeWidth="3" />
        <line {...tDC} stroke="black" strokeWidth="3" />

        {/* PUNTOS */}
        {[A, B, C, D].map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="5" fill="black" />
        ))}

        {/* LETRAS */}
        <text x={A.x - 14} y={A.y + 20} fontSize="16">A</text>
        <text x={D.x - 4} y={D.y + 20} fontSize="16">D</text>
        <text x={C.x + 6} y={C.y + 20} fontSize="16">C</text>
        <text x={B.x - 6} y={B.y - 10} fontSize="16">B</text>

        {/* ===== ÁNGULO EN A = kx ===== */}
        <path d={arcPath(A.x, A.y, 28, aAB, aAD)} stroke="black" strokeWidth="2" fill="none" />
        <text
          x={A.x + 38 * Math.cos(aMidA)}
          y={A.y + 38 * Math.sin(aMidA)}
          fontSize="16"
          textAnchor="middle"
        >
          {k}x
        </text>

        {/* ===== ✅ ÁNGULO EN D = alpha (∠ADB) ===== */}
        <path d={arcPath(D.x, D.y, 30, aDA, aDB)} stroke="black" strokeWidth="2" fill="none" />
        <text
          x={D.x + 44 * Math.cos(aMidD)}
          y={D.y + 44 * Math.sin(aMidD)}
          fontSize="16"
          textAnchor="middle"
        >
          {alpha}°
        </text>

        {/* ===== ÁNGULO EN C = y (igual estilo que kx) ===== */}
        <path d={arcPath(C.x, C.y, 26, aCB, aCD)} stroke="black" strokeWidth="2" fill="none" />
        <text
          x={C.x + 36 * Math.cos(aMidC)}
          y={C.y + 36 * Math.sin(aMidC)}
          fontSize="16"
          textAnchor="middle"
        >
          y
        </text>
      </svg>

      <div className="mt-2 text-xs text-muted-foreground">
        Datos: <span className="font-mono">AB = BD</span> y <span className="font-mono">BD = DC</span>
      </div>
    </div>
  )
}





/* =========================
   Generador (misma naturaleza)
   - ∠A = kx
   - ∠ADB = α
   - AB = BD  ⇒ ∠A = ∠ADB
   - BD = DC  ⇒ triángulo BDC isósceles ⇒ ∠DBC = ∠BCD = y
   - A,D,C colineales ⇒ ∠BDC = 180-α
   - y+y+(180-α)=180 ⇒ 2y=α ⇒ y=α/2
========================= */
function generateExercise() {
  const ks = [2, 3, 4, 5, 6]

  for (let tries = 0; tries < 250; tries++) {
    const k = choice(ks)
    const step = lcm(k, 2)

    // α múltiplo de step y < 90 para que el triángulo isósceles “exista”
    const alpha = step * randInt(3, Math.floor(88 / step))
    if (alpha <= 0 || alpha >= 90) continue
    if (alpha % k !== 0) continue
    if (alpha % 2 !== 0) continue

    const x = alpha / k
    const y = alpha / 2
    const answer = x + y

    // Distractores típicos
    const d1 = alpha // creen que x+y = α
    const d2 = x + alpha // creen que y = α
    const d3 = x + (180 - alpha) / 2 // se confunden con el “otro ángulo” en D

    const set = new Set<number>()
    set.add(answer)
    ;[d1, d2, d3].forEach(v => {
      if (Number.isFinite(v) && v > 0) set.add(v)
    })
    // fallback
    while (set.size < 4) {
      set.add(answer + choice([-10, -5, 5, 10, 15, -15]))
    }

    const values = shuffle(Array.from(set)).slice(0, 4)
    const labels: Option['label'][] = ['A', 'B', 'C', 'D']
    const options: Option[] = values.map((v, i) => ({
      label: labels[i],
      value: v,
      correct: v === answer,
    }))

    const questionLatex = `\\text{Datos: } AB=BD,\\; BD=DC,\\; \\angle A=${k}x,\\; \\angle ADB=${alpha}^{\\circ},\\; \\angle C=y.\\;\\; \\text{Halle } x+y.`

    return { k, alpha, x, y, answer, options, questionLatex }
  }

  // fallback (tu mismo caso)
  const k = 4
  const alpha = 60
  const x = 15
  const y = 30
  const answer = 45
  const options: Option[] = shuffle([
    { label: 'A', value: 30, correct: false },
    { label: 'B', value: 45, correct: true },
    { label: 'C', value: 50, correct: false },
    { label: 'D', value: 55, correct: false },
  ])

  const questionLatex = `\\text{Datos: } AB=BD,\\; BD=DC,\\; \\angle A=4x,\\; \\angle ADB=60^{\\circ},\\; \\angle C=y.\\;\\; \\text{Halle } x+y.`
  return { k, alpha, x, y, answer, options, questionLatex }
}

/* =========================
   COMPONENT
========================= */
export default function Prisma21({ temaPeriodoId }: { temaPeriodoId: string }) {
  const engine = useExerciseEngine({ maxAttempts: 1 })
  const [nonce, setNonce] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)

  const ex = useMemo(() => generateExercise(), [nonce])

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelected(op.value)
    engine.submit(op.correct)

    persistExerciseOnce({
      temaPeriodoId,
      exerciseKey: 'Prisma21',
      prompt: 'Calcular x + y.',
      questionLatex: ex.questionLatex,
      options: ex.options.map(o => `${o.label}. ${o.value}°`),
      correctAnswer: `${ex.answer}`,
      userAnswer: `${op.value}`,
      isCorrect: op.correct,
      extra: {
        k: ex.k,
        alpha: ex.alpha,
        x: ex.x,
        y: ex.y,
      },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  // Latex útil para la solución
  const kxEq = `${ex.k}x = ${ex.alpha}`
  const xVal = `x = \\frac{${ex.alpha}}{${ex.k}} = ${ex.x}`
  const bdc = `\\angle BDC = 180^{\\circ} - ${ex.alpha}^{\\circ} = ${180 - ex.alpha}^{\\circ}`
  const triSum = `y + y + (${180 - ex.alpha}) = 180`
  const twoY = `2y = ${ex.alpha}`
  const yVal = `y = \\frac{${ex.alpha}}{2} = ${ex.y}`
  const ans = `x+y = ${ex.x} + ${ex.y} = ${ex.answer}`

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 21 — Isósceles + ángulo exterior"
        prompt={
          <div className="space-y-3">
            <div className="text-sm">
              En la figura se cumple <span className="font-semibold">AB = BD</span> y <span className="font-semibold">BD = DC</span>.
              Además, <span className="font-semibold">∠A = {ex.k}x</span>, <span className="font-semibold">∠ADB = {ex.alpha}°</span> y <span className="font-semibold">∠C = y</span>.
              Halla <span className="font-semibold">x + y</span>.
            </div>

            <Diagram k={ex.k} alpha={ex.alpha} />

            <div className="text-lg">
              <Tex latex={`\\text{Halle } x+y`} display />
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
              {/* Paso 1 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 1 — Triángulo ABD isósceles</div>
                <p className="text-muted-foreground">
                  Como <span className="font-mono">AB = BD</span>, el triángulo <span className="font-semibold">ABD</span> es isósceles
                  y por tanto <span className="font-semibold">sus ángulos de la base son iguales</span>:
                  <span className="font-semibold"> ∠A = ∠ADB</span>.
                </p>
                <div className="mt-2 space-y-2">
                  <Tex latex={kxEq} display />
                  <Tex latex={xVal} display />
                </div>
              </div>

              {/* Paso 2 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 2 — Ángulo suplementario en D</div>
                <p className="text-muted-foreground">
                  Como <span className="font-semibold">A, D y C están en línea recta</span>, los ángulos con vértice en D que comparten la recta
                  suman <span className="font-semibold">180°</span>. Entonces el ángulo del triángulo <span className="font-semibold">BDC</span> en D es:
                </p>
                <div className="mt-2">
                  <Tex latex={bdc} display />
                </div>
              </div>

              {/* Paso 3 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 3 — Triángulo BDC isósceles</div>
                <p className="text-muted-foreground">
                  Como <span className="font-mono">BD = DC</span>, el triángulo <span className="font-semibold">BDC</span> es isósceles,
                  así que <span className="font-semibold">∠DBC = ∠BCD</span>. Pero <span className="font-semibold">∠C = y</span>, entonces:
                  <span className="font-semibold"> ∠DBC = y</span>.
                </p>

                <div className="mt-2 rounded-md border bg-background p-3">
                  <div className="font-semibold mb-1">Suma de ángulos del triángulo BDC</div>
                  <div className="space-y-2">
                    <Tex latex={triSum} display />
                    <Tex latex={twoY} display />
                    <Tex latex={yVal} display />
                  </div>
                </div>
              </div>

              {/* Paso 4 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 4 — Respuesta</div>
                <div className="mt-2 space-y-2">
                  <Tex latex={ans} display />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm font-semibold">Respuesta:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">
                    {ex.answer}°
                  </span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Chequeo mental: de la construcción sale siempre <span className="font-mono">y = α/2</span> y <span className="font-mono">x = α/k</span>.
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
                  <Tex latex={`${op.value}^{\\circ}`} />
                </div>
              </button>
            )
          })}
        </div>
      </ExerciseShell>
    </MathJaxContext>
  )
}
