'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
  PRISMA 30 — Hallar x (Incentro + cuadrilátero cíclico)

  ? Maqueta SVG grande (no a escala)
  ? 90° dentro del gráfico (en E y G)
  ? Dinámico (no repite): cambia n en ?BDC = na
     - Propiedad del incentro: ?BDC = 90° + a/2
     - Entonces: na = 90° + a/2  ? a depende de n
     - DEFG cíclico (dos ángulos rectos) ? na + x = 180° ? x dinámico
  ? 1 intento, autocalifica y persiste
============================================================ */

type OptionKey = 'A' | 'B' | 'C' | 'D'
type Option = { key: OptionKey; value: number; correct: boolean }

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

function Tex({ tex, block = false }: { tex: string; block?: boolean }) {
  const wrapped = block ? `\\[${tex}\\]` : `\\(${tex}\\)`
  return <MathJax dynamic>{wrapped}</MathJax>
}

/* =========================
  Helpers
========================= */
function choice<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}
function shuffle<T>(arr: T[]) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* =========================
  Geometry helpers (SVG)
========================= */
type Pt = { x: number; y: number }
const P = (x: number, y: number): Pt => ({ x, y })
const sub = (a: Pt, b: Pt): Pt => P(a.x - b.x, a.y - b.y)
const add = (a: Pt, b: Pt): Pt => P(a.x + b.x, a.y + b.y)
const mul = (v: Pt, k: number): Pt => P(v.x * k, v.y * k)
const dot = (u: Pt, v: Pt) => u.x * v.x + u.y * v.y
const cross = (u: Pt, v: Pt) => u.x * v.y - u.y * v.x
const len = (v: Pt) => Math.hypot(v.x, v.y) || 1
const unit = (v: Pt) => {
  const m = len(v)
  return P(v.x / m, v.y / m)
}
const perp = (v: Pt) => P(-v.y, v.x)

function angleDeg(from: Pt, to: Pt) {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI
}
function normDeg(d: number) {
  let x = d % 360
  if (x < 0) x += 360
  return x
}
function shortestDiff(a1: number, a2: number) {
  let d = normDeg(a2) - normDeg(a1)
  d = ((d + 540) % 360) - 180
  return d
}
function polar(cx: number, cy: number, r: number, angDeg: number) {
  const a = (angDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const d = shortestDiff(startDeg, endDeg)
  const sweep = d >= 0 ? 1 : 0
  const largeArc = Math.abs(d) > 180 ? 1 : 0
  const s = polar(cx, cy, r, startDeg)
  const e = polar(cx, cy, r, startDeg + d)
  return {
    d: `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} ${sweep} ${e.x.toFixed(
      2
    )} ${e.y.toFixed(2)}`,
    midDeg: startDeg + d / 2,
  }
}

function intersectLines(P1: Pt, v1: Pt, P2: Pt, v2: Pt) {
  // P1 + t v1 = P2 + u v2
  const denom = cross(v1, v2)
  if (Math.abs(denom) < 1e-9) return null
  const t = cross(sub(P2, P1), v2) / denom
  return add(P1, mul(v1, t))
}

/* =========================
  SVG primitives (pretty)
========================= */
function OutlinedLabel({
  text,
  x,
  y,
  size = 30,
  weight = 900,
}: {
  text: string
  x: number
  y: number
  size?: number
  weight?: number
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={size}
      fontWeight={weight}
      fill="#111"
      stroke="white"
      strokeWidth={10}
      paintOrder="stroke"
      style={{ fontFamily: 'ui-sans-serif, system-ui' }}
    >
      {text}
    </text>
  )
}

function AngleArcWithLabel({
  V0,
  P1,
  P2,
  r,
  label,
  labelPush = 18,
  strokeW = 3.6,
}: {
  V0: Pt
  P1: Pt
  P2: Pt
  r: number
  label: string
  labelPush?: number
  strokeW?: number
}) {
  const a1 = angleDeg(V0, P1)
  const a2 = angleDeg(V0, P2)
  const arc = arcPath(V0.x, V0.y, r, a1, a2)
  const mid = polar(V0.x, V0.y, r + labelPush, arc.midDeg)

  return (
    <>
      <path d={arc.d} fill="none" stroke="#111" strokeWidth={strokeW} strokeLinecap="round" />
      <OutlinedLabel text={label} x={mid.x} y={mid.y} size={28} />
    </>
  )
}

function RightAngleSquare({
  V0,
  dir1,
  dir2,
  size = 20,
  strokeW = 3.2,
}: {
  V0: Pt
  dir1: Pt
  dir2: Pt
  size?: number
  strokeW?: number
}) {
  const u1 = unit(dir1)
  const u2 = unit(dir2)
  const A = add(V0, mul(u1, size))
  const C = add(V0, mul(u2, size))
  const B = add(A, mul(u2, size))

  return (
    <path
      d={`M ${A.x} ${A.y} L ${B.x} ${B.y} L ${C.x} ${C.y}`}
      fill="none"
      stroke="#111"
      strokeWidth={strokeW}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

/* ============================================================
  DIAGRAMA — maqueta (no a escala)
============================================================ */
type DiagramMode = 'question' | 'solution'
const VB_W = 1100
const VB_H = 620

function Prisma30Diagram({ n, mode }: { n: number; mode: DiagramMode }) {
  // Puntos base (maqueta estable)
  const A = P(120, 540)
  const C = P(1040, 540)
  const B = P(430, 120)

  // BD “vertical”: D debajo de B
  const D = P(B.x, 330)
  // E sobre BD (más arriba)
  const E = P(B.x, 230)

  // DC y punto G sobre DC
  const tG = 0.58
  const G = add(D, mul(sub(C, D), tG))

  // EF ? BD: como BD es vertical, EF es horizontal
  const vEF = P(1, 0)
  const vDC = sub(C, D)
  const vPerpDC = perp(unit(vDC))

  // F = intersección entre horizontal por E y perpendicular a DC por G
  const F = intersectLines(E, vEF, G, vPerpDC) ?? P(820, 230)

  // Estética
  const thick = 7
  const med = 5

  // 90° dentro
  const ninetyE = add(E, P(18, 20))
  const ninetyG = add(G, P(-20, -18))

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Figura</div>
        <div className="text-xs text-muted-foreground">bisectrices internas • 90° marcados • no a escala</div>
      </div>

      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-[540px] rounded-xl border bg-white"
        preserveAspectRatio="xMidYMid meet"
      >
        <text
          x={20}
          y={24}
          fill="#8a8a8a"
          fontSize={12}
          fontWeight={600}
          style={{ fontFamily: 'ui-sans-serif, system-ui' }}
        >
          Diagrama referencial (no a escala)
        </text>

        {/* Triángulo ABC */}
        <path d={`M ${A.x} ${A.y} L ${C.x} ${C.y}`} stroke="#111" strokeWidth={med} strokeLinecap="round" fill="none" />
        <path d={`M ${A.x} ${A.y} L ${B.x} ${B.y}`} stroke="#111" strokeWidth={thick} strokeLinecap="round" fill="none" />
        <path d={`M ${B.x} ${B.y} L ${C.x} ${C.y}`} stroke="#111" strokeWidth={thick} strokeLinecap="round" fill="none" />

        {/* Bisectrices internas (maqueta) */}
        <path d={`M ${B.x} ${B.y} L ${D.x} ${D.y}`} stroke="#111" strokeWidth={med} strokeLinecap="round" fill="none" />
        <path d={`M ${C.x} ${C.y} L ${D.x} ${D.y}`} stroke="#111" strokeWidth={med} strokeLinecap="round" fill="none" />

        {/* Cuadrilátero DEFG */}
        <path
          d={`M ${D.x} ${D.y} L ${E.x} ${E.y} L ${F.x} ${F.y} L ${G.x} ${G.y} Z`}
          stroke="#111"
          strokeWidth={mode === 'solution' ? thick : med}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Cuadritos de 90° */}
        <RightAngleSquare V0={E} dir1={sub(D, E)} dir2={sub(F, E)} size={20} />
        <RightAngleSquare V0={G} dir1={sub(D, G)} dir2={sub(F, G)} size={20} />

        {/* 90° dentro */}
        <OutlinedLabel text="90°" x={ninetyE.x} y={ninetyE.y} size={20} weight={900} />
        <OutlinedLabel text="90°" x={ninetyG.x} y={ninetyG.y} size={20} weight={900} />

        {/* Puntos */}
        {[A, B, C, D, E, F, G].map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={5.2} fill="#111" />
        ))}

        {/* Letras */}
        <text x={A.x} y={A.y + 34} textAnchor="middle" fill="#111" fontSize={16} fontWeight={900} style={{ fontFamily: 'ui-sans-serif, system-ui' }}>
          A
        </text>
        <text x={B.x} y={B.y - 26} textAnchor="middle" fill="#111" fontSize={16} fontWeight={900} style={{ fontFamily: 'ui-sans-serif, system-ui' }}>
          B
        </text>
        <text x={C.x + 16} y={C.y + 26} fill="#111" fontSize={16} fontWeight={900} style={{ fontFamily: 'ui-sans-serif, system-ui' }}>
          C
        </text>
        <text x={D.x - 18} y={D.y + 18} fill="#111" fontSize={16} fontWeight={900} style={{ fontFamily: 'ui-sans-serif, system-ui' }}>
          D
        </text>
        <text x={E.x - 18} y={E.y + 18} fill="#111" fontSize={16} fontWeight={900} style={{ fontFamily: 'ui-sans-serif, system-ui' }}>
          E
        </text>
        <text x={F.x + 18} y={F.y - 10} fill="#111" fontSize={16} fontWeight={900} style={{ fontFamily: 'ui-sans-serif, system-ui' }}>
          F
        </text>
        <text x={G.x - 18} y={G.y + 18} fill="#111" fontSize={16} fontWeight={900} style={{ fontFamily: 'ui-sans-serif, system-ui' }}>
          G
        </text>

        {/* Ángulo a en A */}
        <AngleArcWithLabel V0={A} P1={B} P2={C} r={46} label="a" labelPush={18} />

        {/* Ángulo na en D (entre DB y DC) */}
        <AngleArcWithLabel V0={D} P1={B} P2={C} r={38} label={`${n}a`} labelPush={18} />

        {/* Ángulo x en F (entre FE y FG) */}
        <AngleArcWithLabel V0={F} P1={E} P2={G} r={40} label="x" labelPush={18} />

        {mode === 'solution' && (
          <text
            x={720}
            y={78}
            fill="#111"
            fontSize={18}
            fontWeight={900}
            textAnchor="middle"
            style={{ fontFamily: 'ui-sans-serif, system-ui' }}
          >
            D es el incentro (BD y CD son bisectrices)
          </text>
        )}
      </svg>
    </div>
  )
}

/* ============================================================
  Generador dinámico (exacto, sin redondeos):
    na = 90 + a/2  ? (n - 1/2)a = 90  ? a = 180/(2n-1)
    x = 180 - na
  Elegimos n con a entero y “bonito”.
============================================================ */
type ExData = {
  n: number
  alpha: number
  x: number
  options: Option[]
  questionLatex: string
}

function computeAlphaExact(n: number) {
  // a = 180/(2n-1)
  return 180 / (2 * n - 1)
}

function buildExercise(recentNs: number[]): ExData {
  // 2n-1 debe dividir a 180 y ser impar.
  // Opciones “bonitas” (a razonable):
  // n=2 -> a=60 -> x=60
  // n=3 -> a=36 -> x=72
  // n=5 -> a=20 -> x=80
  // n=8 -> a=12 -> x=84
  const pool = [2, 3, 5, 8]
  const candidates = pool.filter(v => !recentNs.includes(v))
  const n = choice(candidates.length ? candidates : pool)

  const alpha = computeAlphaExact(n) // entero por construcción
  const x = 180 - n * alpha

  // Distractores típicos (evita cosas equivalentes a x)
  const d1 = alpha
  const d2 = n * alpha
  const d3 = 180 - alpha

  const set = new Set<number>([x, d1, d2, d3])
  while (set.size < 4) set.add(x + choice([-30, -20, -10, 10, 20, 30]))

  const values = shuffle(Array.from(set)).slice(0, 4)
  const keys: OptionKey[] = shuffle(['A', 'B', 'C', 'D'])

  const options: Option[] = values.map((v, i) => ({
    key: keys[i],
    value: Math.round(v),
    correct: Math.round(v) === Math.round(x),
  }))

  const questionLatex =
    `\\text{En la figura, } BD \\text{ y } CD \\text{ son bisectrices internas. }` +
    `\\angle A=\\alpha,\\ \\angle BDC=${n}\\alpha.\\ \\text{Halle }x.`

  return { n, alpha: Math.round(alpha), x: Math.round(x), options, questionLatex }
}

/* ============================================================
  Component
============================================================ */
export default function Prisma30({
  exerciseId,
  classroomId,
  sessionId,
}: {
  exerciseId: string
  classroomId: string
  sessionId?: string
}) {
  const engine = useExerciseEngine({ maxAttempts: 1 })

  const init = useMemo(() => buildExercise([]), [])
  const [ex, setEx] = useState<ExData>(init)
  const [history, setHistory] = useState<number[]>([init.n])
  const [selectedKey, setSelectedKey] = useState<OptionKey | null>(null)

  function pickOption(op: Option) {
  if (!engine.canAnswer) return

  setSelectedKey(op.key)
  engine.submit(op.correct)

  // ?? Opciones SIEMPRE ordenadas A–D
  const ordered = ex.options
    .slice()
    .sort((a, b) => a.key.localeCompare(b.key))

  persistExerciseOnce({
    exerciseId,
    classroomId,
    sessionId,

    correct: op.correct,

    answer: {
      selected: String(op.value),
      correctAnswer: String(ex.x),
      latex:
        `\\text{En la figura, } BD \\text{ y } CD \\text{ son bisectrices internas. }` +
        `\\angle A=\\alpha,\\ \\angle BDC=${ex.n}\\alpha.\\ \\text{Halle } x.`,
      options: ordered.map(o => String(o.value)),
      extra: {
        n: ex.n,
        alpha: ex.alpha,
        nAlpha: ex.n * ex.alpha,
        rule: 'Incentro: ?BDC = 90° + a/2; cuadrilátero cíclico: ángulos opuestos suman 180°',
        labeledOptions: ordered.map(o => `${o.key}.\\ ${o.value}^{\\circ}`),
      },
    },
  })
}


  function siguiente() {
    setSelectedKey(null)
    engine.reset()

    const recent = history.slice(-6)
    const next = buildExercise(recent)

    setEx(next)
    setHistory(h => [...h, next.n].slice(-12))
  }

  // ======= Solución dinámica =======
  const n = ex.n
  const alpha = ex.alpha
  const x = ex.x
  const nAlpha = n * alpha

  const step1a =
    `\\text{Como } BD \\text{ y } CD \\text{ son bisectrices internas, se intersectan en el incentro } D.`
  const step1b = `\\angle BDC = 90^{\\circ} + \\dfrac{\\angle A}{2} = 90^{\\circ}+\\dfrac{\\alpha}{2}`
  const step1c = `${n}\\alpha = 90^{\\circ}+\\dfrac{\\alpha}{2}`
  const step1d =
    `${n}\\alpha-\\dfrac{\\alpha}{2}=90^{\\circ}\\Rightarrow\\left(${n}-\\dfrac12\\right)\\alpha=90^{\\circ}`
  const step1e = `\\alpha=\\dfrac{90^{\\circ}}{${n}-\\frac12}=${alpha}^{\\circ}`

  const step2a = `\\angle E=90^{\\circ}\\ \\text{y}\\ \\angle G=90^{\\circ}\\Rightarrow\\ DEFG\\ \\text{es c\\'iclico.}`
  const step2b = `\\text{En un cuadril\\'atero c\\'iclico, los \\'angulos opuestos suman }180^{\\circ}.`
  const step2c = `\\angle EDG + \\angle EFG = 180^{\\circ}`
  const step2d = `${n}\\alpha + x = 180^{\\circ}`
  const step2e = `x=180^{\\circ}-${n}\\alpha = 180^{\\circ}-${nAlpha}^{\\circ}=${x}^{\\circ}`

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 30 — Hallar x"
        prompt={
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              En la figura, <span className="font-semibold">BD</span> y{' '}
              <span className="font-semibold">CD</span> son bisectrices internas. Si{' '}
              <span className="font-semibold">?A = a</span> y{' '}
              <span className="font-semibold">?BDC = {n}a</span>, halla{' '}
              <span className="font-semibold">x</span>.
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
            <div className="space-y-4">
              {/* ? primero el gráfico */}
              <Prisma30Diagram n={n} mode="solution" />

              {/* ? abajo la resolución */}
              <div className="rounded-2xl border bg-white p-4 space-y-4 text-sm text-muted-foreground">
                <div className="font-semibold text-foreground">Resolución</div>

                <div className="rounded-lg border bg-background p-3 space-y-2">
                  <div className="font-semibold text-foreground">? Paso 1 — Propiedad del incentro</div>
                  <Tex tex={step1a} block />
                  <Tex tex={step1b} block />
                  <Tex tex={step1c} block />
                  <Tex tex={step1d} block />
                  <Tex tex={step1e} block />
                </div>

                <div className="rounded-lg border bg-background p-3 space-y-2">
                  <div className="font-semibold text-foreground">? Paso 2 — Cuadrilátero cíclico</div>
                  <Tex tex={step2a} block />
                  <Tex tex={step2b} block />
                  <Tex tex={step2c} block />
                  <Tex tex={step2d} block />
                  <Tex tex={step2e} block />

                  <div className="mt-3 flex items-center gap-2">
                    <span className="font-semibold text-foreground">Respuesta:</span>
                    <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base text-foreground">
                      {x}°
                    </span>
                  </div>
                </div>

                <div className="text-xs">
                  Nota: el dibujo es una maqueta (no a escala). La respuesta se obtiene por propiedades, no por medir.
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        <div className="space-y-4">
          <Prisma30Diagram n={n} mode="question" />

          <div className="rounded-2xl border bg-white p-4">
            <div className="font-semibold mb-2">Elige la alternativa correcta:</div>

            <div className="grid grid-cols-2 gap-4">
              {ex.options.map(op => {
                const isSelected = selectedKey === op.key
                const showCorrect = engine.status !== 'idle' && op.correct
                const showWrong = engine.status === 'revealed' && isSelected && !op.correct

                return (
                  <button
                    key={op.key}
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
                    <div className="font-semibold mb-1">{op.key}.</div>
                    <div className="text-lg">
                      <Tex tex={`${op.value}^{\\circ}`} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </ExerciseShell>
    </MathJaxContext>
  )
}



