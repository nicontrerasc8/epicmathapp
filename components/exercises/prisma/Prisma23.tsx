'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 23 — Geometría (doble isósceles + ángulo exterior)
   Tipo PDF:
     AB = BC, BD = BE, ?ABD = ?°, hallar x = ?EDC
   Resultado: x = ?/2

   ? 1 SOLO INTENTO (autocalifica al elegir opción)
   ? Dinámico (? cambia, misma naturaleza)
   ? Diagrama SVG con ? en B y x en D bien colocados
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
   SVG Diagrama
========================= */
function Diagram({ gamma, x }: { gamma: number; x: number }) {
  const W = 460
  const H = 270

  const A = { x: 90, y: 220 }
  const C = { x: 400, y: 220 }
  const B = { x: (A.x + C.x) / 2, y: 70 }
  const D = { x: 230, y: 220 }

  const deg2rad = (d: number) => (d * Math.PI) / 180

  function angle(p: { x: number; y: number }, q: { x: number; y: number }) {
    return Math.atan2(p.y - q.y, p.x - q.x)
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

  // E: intersección aprox entre rayo desde D (que forma x con DC) y el lado BC
  const dir = { x: Math.cos(-deg2rad(x)), y: Math.sin(-deg2rad(x)) } // arriba-derecha
  const vBC = { x: C.x - B.x, y: C.y - B.y }

  // D + t*dir = B + u*vBC
  const det = dir.x * (-vBC.y) - dir.y * (-vBC.x)
  let E = { x: B.x + 0.65 * vBC.x, y: B.y + 0.65 * vBC.y } // fallback
  if (Math.abs(det) > 1e-6) {
    const rhs = { x: B.x - D.x, y: B.y - D.y }
    const t = (rhs.x * (-vBC.y) - rhs.y * (-vBC.x)) / det
    const u = (dir.x * rhs.y - dir.y * rhs.x) / det
    if (Number.isFinite(t) && Number.isFinite(u)) {
      const uClamped = Math.max(0.18, Math.min(0.92, u))
      E = { x: B.x + uClamped * vBC.x, y: B.y + uClamped * vBC.y }
    }
  }

  // ángulos para arcos
  const aBA = angle(A, B)
  const aBD = angle(D, B)
  const aMidB = midAngle(aBA, aBD)

  const aDC = angle(C, D) // DC (hacia C)
  const aDE = angle(E, D)
  const aMidD = midAngle(aDC, aDE)

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
        <line x1={B.x} y1={B.y} x2={E.x} y2={E.y} stroke="black" strokeWidth="3" />
        <line x1={D.x} y1={D.y} x2={E.x} y2={E.y} stroke="black" strokeWidth="3" />

        {/* ticks AB=BC */}
        {ticksAB.map((t, i) => (
          <line key={`ab-${i}`} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="black" strokeWidth="2" />
        ))}
        {ticksBC.map((t, i) => (
          <line key={`bc-${i}`} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="black" strokeWidth="2" />
        ))}

        {/* ticks BD=BE */}
        {ticksBD.map((t, i) => (
          <line key={`bd-${i}`} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="black" strokeWidth="2" />
        ))}
        {ticksBE.map((t, i) => (
          <line key={`be-${i}`} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="black" strokeWidth="2" />
        ))}

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

        {/* ángulo en B: ? (entre BA y BD) */}
        <path d={arcPath(B.x, B.y, 26, aBA, aBD)} stroke="black" strokeWidth="2" fill="none" />
        <text
          x={B.x + 38 * Math.cos(aMidB)}
          y={B.y + 48 * Math.sin(aMidB)}
          fontSize="16"
          textAnchor="middle"
        >
          {gamma}°
        </text>

        {/* ángulo en D: x (entre DC y DE) */}
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
   Generador (? par ? x entero)
========================= */
function generateExercise() {
  const gammas = [30, 40, 50, 60, 70, 80]

  for (let tries = 0; tries < 250; tries++) {
    const gamma = choice(gammas)
    const answer = gamma / 2

    // distractores típicos
    const d1 = gamma
    const d2 = answer + 5
    const d3 = Math.max(5, answer - 5)

    const set = new Set<number>()
    set.add(answer)
    ;[d1, d2, d3].forEach(v => set.add(v))
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

    return { gamma, answer, options, questionLatex }
  }

  // fallback
  const gamma = 40
  const answer = 20
  const options: Option[] = [
    { label: 'A', value: 25, correct: false },
    { label: 'B', value: 20, correct: true },
    { label: 'C', value: 40, correct: false },
    { label: 'D', value: 10, correct: false },
  ]
  const questionLatex =
    `\\text{En la figura, } AB=BC,\\; BD=BE,\\; \\angle ABD=40^{\\circ}.\\ \\text{Halle } x.`
  return { gamma, answer, options, questionLatex }
}

/* =========================
   COMPONENT
========================= */
export default function Prisma23({
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

    persistExerciseOnce({
      exerciseId, // 'Prisma23'
      classroomId,
      sessionId,
      correct: op.correct,
      answer: {
        selected: `${op.label}. ${op.value}°`,
        correctAnswer: `${ex.answer}°`,
        latex: ex.questionLatex,
        options: ex.options.map(o => `${o.label}. ${o.value}°`),
        extra: {
          gamma: ex.gamma,
          x: ex.answer,
          rule: 'Siempre x = ?/2',
        },
      },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  // --- Latex de solución
  const step1 = `\\text{Como } AB=BC,\\ \\triangle ABC \\text{ es isósceles }\\Rightarrow \\angle BAC=\\angle ACB=\\theta.`
  const step2 = `\\text{En }\\triangle DBE,\\ BD=BE\\Rightarrow \\angle BDE=\\angle DEB.`
  const step3 = `\\text{En } D,\\ \\angle BDC \\text{ es exterior de }\\triangle ABD\\Rightarrow \\angle BDC=\\theta+${ex.gamma}^{\\circ}.`
  const step4 = `\\angle BDC=\\angle BDE+\\angle EDC=(x+\\theta)+x=2x+\\theta.`
  const eq = `\\theta+${ex.gamma}=2x+\\theta\\Rightarrow ${ex.gamma}=2x\\Rightarrow x=${ex.gamma}/2=${ex.answer}.`

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 23 — Isósceles + ángulo exterior"
        prompt={
          <div className="space-y-3">
            <div className="text-sm">
              En la figura, <span className="font-semibold">AB = BC</span> y{' '}
              <span className="font-semibold">BD = BE</span>. Además,{' '}
              <span className="font-semibold">?ABD = {ex.gamma}°</span>. Halla{' '}
              <span className="font-semibold">x</span>.
            </div>

            <Diagram gamma={ex.gamma} x={ex.answer} />

            <div className="text-lg">
              <Tex block tex={`\\text{Halle } x`} />
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
                <div className="font-semibold mb-2">? Paso 1 — Isósceles en ABC</div>
                <Tex block tex={step1} />
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 2 — Isósceles en DBE</div>
                <Tex block tex={step2} />
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 3 — Ángulo exterior en D</div>
                <Tex block tex={step3} />
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 4 — Ecuación y resultado</div>
                <div className="space-y-2">
                  <Tex block tex={step4} />
                  <Tex block tex={eq} />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm font-semibold">Respuesta:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">
                    {ex.answer}°
                  </span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Chequeo rápido: en este tipo de figura siempre queda <span className="font-mono">x = ?/2</span>.
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
                  <Tex tex={`${op.value}^{\\circ}`} />
                </div>
              </button>
            )
          })}
        </div>
      </ExerciseShell>
    </MathJaxContext>
  )
}



