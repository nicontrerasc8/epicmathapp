'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 23 — Geometría (doble isósceles + ángulo exterior)
   Enunciado tipo PDF:
     AB = BC, BD = BE, ∠ABD = γ°, hallar x (ángulo en D entre DC y DE)
   Resultado: x = γ/2

   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ Dinámico (γ cambia, misma naturaleza)
   ✅ Diagrama con 40° (γ) en B y x en D bien colocados
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
   SVG Diagrama (referencial pero con ángulos en el lugar correcto)
   - AB = BC (1 tick)
   - BD = BE (2 ticks)
   - γ° en B entre BA y BD
   - x en D entre DC y DE
========================= */
function Diagram({ gamma, x }: { gamma: number; x: number }) {
  const W = 460
  const H = 270

  // puntos base (ABC isósceles)
  const A = { x: 90, y: 220 }
  const C = { x: 400, y: 220 }
  const B = { x: (A.x + C.x) / 2, y: 70 } // centrado

  // D sobre AC (ligeramente a la izquierda del centro, como el PDF)
  const D = { x: 230, y: 220 }

  const deg2rad = (d: number) => (d * Math.PI) / 180

  function angle(p: any, q: any) {
    return Math.atan2(p.y - q.y, p.x - q.x) // ángulo del vector q->p (en coords SVG)
  }
  function norm(a: number) {
    while (a <= -Math.PI) a += 2 * Math.PI
    while (a > Math.PI) a -= 2 * Math.PI
    return a
  }
  function midAngle(a1: number, a2: number) {
    a1 = norm(a1)
    a2 = norm(a2)
    const d = norm(a2 - a1)
    return norm(a1 + d / 2)
  }
  function arcPath(cx: number, cy: number, r: number, a1: number, a2: number) {
    a1 = norm(a1)
    a2 = norm(a2)
    const d = norm(a2 - a1)
    const end = a1 + d

    const x1 = cx + r * Math.cos(a1)
    const y1 = cy + r * Math.sin(a1)
    const x2 = cx + r * Math.cos(end)
    const y2 = cy + r * Math.sin(end)

    const sweep = d >= 0 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 0 ${sweep} ${x2} ${y2}`
  }

  // ticks (1 o 2 marcas)
  function tickLines(p1: any, p2: any, count: 1 | 2) {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const L = Math.hypot(dx, dy) || 1
    const ux = dx / L
    const uy = dy / L
    const nx = -uy
    const ny = ux

    const mx = (p1.x + p2.x) / 2
    const my = (p1.y + p2.y) / 2

    const len = 14
    const gap = 10

    const centers =
      count === 1
        ? [{ x: mx, y: my }]
        : [
            { x: mx - (ux * gap) / 2, y: my - (uy * gap) / 2 },
            { x: mx + (ux * gap) / 2, y: my + (uy * gap) / 2 },
          ]

    return centers.map(c => ({
      x1: c.x - (nx * len) / 2,
      y1: c.y - (ny * len) / 2,
      x2: c.x + (nx * len) / 2,
      y2: c.y + (ny * len) / 2,
    }))
  }

  // --- Construyo E como intersección de la recta BC con el rayo desde D
  //     que forma ángulo x con DC (DC apunta a la derecha).
  //     Esto hace que el "x" se vea coherente en el dibujo.
  const dir = { x: Math.cos(-deg2rad(x)), y: Math.sin(-deg2rad(x)) } // arriba-derecha
  const vBC = { x: C.x - B.x, y: C.y - B.y }

  // Resolver: D + t*dir = B + u*vBC
  const det = dir.x * (-vBC.y) - dir.y * (-vBC.x)
  let E = { x: B.x + 0.65 * vBC.x, y: B.y + 0.65 * vBC.y } // fallback
  if (Math.abs(det) > 1e-6) {
    const rhs = { x: B.x - D.x, y: B.y - D.y }
    const t = (rhs.x * (-vBC.y) - rhs.y * (-vBC.x)) / det
    const u = (dir.x * rhs.y - dir.y * rhs.x) / det
    const uClamped = Math.max(0.15, Math.min(0.95, u))
    E = { x: B.x + uClamped * vBC.x, y: B.y + uClamped * vBC.y }
  }

  // ángulos para arcos
  // en B: entre BA y BD
  const aBA = angle(A, B)
  const aBD = angle(D, B)
  const aMidB = midAngle(aBA, aBD)

  // en D: entre DC y DE (x)
  const aDC = angle(C, D)
  const aDE = angle(E, D)
  const aMidD = midAngle(aDC, aDE)

  // ticks
  const ticksAB = tickLines(A, B, 1)
  const ticksBC = tickLines(B, C, 1)
  const ticksBD = tickLines(B, D, 2)
  const ticksBE = tickLines(B, E, 2)

  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-sm font-semibold mb-2">Figura (referencial)</div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* base AC */}
        <line x1={A.x} y1={A.y} x2={C.x} y2={C.y} stroke="black" strokeWidth="3" />

        {/* lados del triángulo */}
        <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="black" strokeWidth="3" />
        <line x1={B.x} y1={B.y} x2={C.x} y2={C.y} stroke="black" strokeWidth="3" />

        {/* segmentos internos */}
        <line x1={B.x} y1={B.y} x2={D.x} y2={D.y} stroke="black" strokeWidth="3" />
        <line x1={D.x} y1={D.y} x2={E.x} y2={E.y} stroke="black" strokeWidth="3" />

  

    

        {/* puntos */}
        {[A, B, C, D, E].map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="5" fill="black" />
        ))}

        {/* etiquetas */}
        <text x={A.x - 14} y={A.y + 20} fontSize="16">
          A
        </text>
        <text x={C.x + 8} y={C.y + 20} fontSize="16">
          C
        </text>
        <text x={B.x - 6} y={B.y - 12} fontSize="16">
          B
        </text>
        <text x={D.x - 6} y={D.y + 20} fontSize="16">
          D
        </text>
        <text x={E.x + 8} y={E.y + 6} fontSize="16">
          E
        </text>

        {/* ===== ángulo en B: γ° (entre BA y BD) ===== */}
        <path d={arcPath(B.x, B.y, 26, aBA, aBD)} stroke="black" strokeWidth="2" fill="none" />
        <text
          x={B.x + 38 * Math.cos(aMidB)}
          y={B.y + 48 * Math.sin(aMidB)}
          fontSize="16"
          textAnchor="middle"
        >
          {gamma}°
        </text>

        {/* ===== ángulo en D: x (entre DC y DE) ===== */}
        <path d={arcPath(D.x, D.y, 24, aDC, aDE)} stroke="black" strokeWidth="2" fill="none" />
        <text
          x={D.x + 40 * Math.cos(aMidD)}
          y={D.y + 36 * Math.sin(aMidD)}
          fontSize="16"
          textAnchor="middle"
        >
          x
        </text>
      </svg>

      <div className="mt-2 text-xs text-muted-foreground">
        Datos: <span className="font-mono">AB = BC</span> y <span className="font-mono">BD = BE</span>
      </div>
    </div>
  )
}

/* =========================
   Generador
   - elegimos γ par para que x = γ/2 sea entero
   - respuesta: x = γ/2
========================= */
function generateExercise() {
  const gammas = [30, 40, 50, 60, 70]

  for (let tries = 0; tries < 250; tries++) {
    const gamma = choice(gammas)
    const x = gamma / 2

    const answer = x

    // distractores típicos
    const d1 = gamma // creen que x = γ
    const d2 = Math.max(5, x + 5)
    const d3 = Math.max(5, x - 5)

    const set = new Set<number>()
    set.add(answer)
    ;[d1, d2, d3].forEach(v => {
      if (Number.isFinite(v) && v > 0) set.add(v)
    })
    while (set.size < 4) set.add(answer + choice([-10, -5, 5, 10, 15]))

    const values = shuffle(Array.from(set)).slice(0, 4)
    const labels: Option['label'][] = ['A', 'B', 'C', 'D']
    const options: Option[] = values.map((v, i) => ({
      label: labels[i],
      value: v,
      correct: v === answer,
    }))

    const questionLatex =
      `\\text{En la figura, } D\\in AC \\text{ y } E\\in BC.\\ ` +
      `AB=BC,\\; BD=BE,\\; \\angle ABD=${gamma}^{\\circ}.\\ ` +
      `\\text{Halle } x=\\angle EDC.`

    return { gamma, x, answer, options, questionLatex }
  }

  // fallback como el PDF
  const gamma = 40
  const x = 20
  const answer = 20
  const options: Option[] = shuffle([
    { label: 'A', value: 25, correct: false },
    { label: 'B', value: 20, correct: true },
    { label: 'C', value: 40, correct: false },
    { label: 'D', value: 50, correct: false },
  ])
  const questionLatex =
    `\\text{En la figura, } AB=BC,\\; BD=BE,\\; \\angle ABD=40^{\\circ}.\\ \\text{Halle } x.`
  return { gamma, x, answer, options, questionLatex }
}

/* =========================
   COMPONENT
========================= */
export default function Prisma23({ temaPeriodoId }: { temaPeriodoId: string }) {
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
      exerciseKey: 'Prisma23',
      prompt: 'Hallar el valor de x.',
      questionLatex: ex.questionLatex,
      options: ex.options.map(o => `${o.label}. ${o.value}°`),
      correctAnswer: `${ex.answer}`,
      userAnswer: `${op.value}`,
      isCorrect: op.correct,
      extra: {
        gamma: ex.gamma,
        x: ex.x,
      },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  // --- Latex de solución (mismo argumento del PDF)
  const step1 = `\\triangle ABC\\ \\text{isósceles (}AB=BC\\text{)}\\Rightarrow \\angle BAC=\\angle ACB=\\theta.`
  const step2 = `\\text{En }\\triangle DCE,\\ \\angle DEB \\text{ es exterior }\\Rightarrow \\angle DEB = x+\\theta.`
  const step3 = `BD=BE\\Rightarrow \\triangle DBE\\ \\text{isósceles}\\Rightarrow \\angle BDE=\\angle DEB = x+\\theta.`
  const step4a = `\\text{En }\\triangle ABD,\\ \\angle BDC \\text{ es exterior }\\Rightarrow \\angle BDC = \\theta+${ex.gamma}^{\\circ}.`
  const step4b = `\\angle BDC = \\angle BDE + \\angle EDC = (x+\\theta)+x = 2x+\\theta.`
  const eq = `\\theta+${ex.gamma} = 2x+\\theta\\Rightarrow ${ex.gamma}=2x\\Rightarrow x=${ex.gamma}/2=${ex.answer}.`

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 23 — Isósceles + ángulo exterior"
        prompt={
          <div className="space-y-3">
            <div className="text-sm">
              En la figura, <span className="font-semibold">AB = BC</span> y <span className="font-semibold">BD = BE</span>.
              Además, <span className="font-semibold">∠ABD = {ex.gamma}°</span>.
              Halla <span className="font-semibold">x</span>.
            </div>

            <Diagram gamma={ex.gamma} x={ex.answer} />

            <div className="text-lg">
              <Tex latex={`\\text{Halle } x`} display />
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
                <div className="font-semibold mb-2">✅ Paso 1 — Triángulo ABC isósceles</div>
                <Tex latex={step1} display />
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 2 — Ángulo exterior en E</div>
                <Tex latex={step2} display />
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 3 — Triángulo DBE isósceles</div>
                <Tex latex={step3} display />
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 4 — Ángulo exterior en D y ecuación</div>
                <div className="space-y-2">
                  <Tex latex={step4a} display />
                  <Tex latex={step4b} display />
                  <Tex latex={eq} display />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm font-semibold">Respuesta:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">
                    {ex.answer}°
                  </span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Chequeo rápido: siempre sale <span className="font-mono">x = γ/2</span>.
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
