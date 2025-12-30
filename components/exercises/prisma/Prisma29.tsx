'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
  PRISMA 29 — Bisectrices exteriores (φ + β) → hallar x

  ✅ Maqueta fija (NO a escala)
  ✅ Dinámico (no repite): cambia S = φ + β y opciones.
  ✅ 1 intento: autocalifica.
  ✅ Propiedad:
     En ΔABD:  ∠D = 180° − (φ + β)
     Bisectrices exteriores en A y B:
     x = 90° − ∠D/2
     ⇒ x = (φ + β)/2
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
const len = (v: Pt) => Math.hypot(v.x, v.y) || 1

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

/* ============================================================
  Diagrama — SVG (maqueta)
============================================================ */
type DiagramMode = 'question' | 'solution'
const VB_W = 1000
const VB_H = 560

// Maqueta fija (bonita y estable)
const A = P(520, 420)
const D = P(160, 420)
const E = P(940, 420)
const B = P(350, 190)
const C = P(820, 190) // BC horizontal

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
  strokeW = 3.8,
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
      <OutlinedLabel text={label} x={mid.x} y={mid.y} size={30} />
    </>
  )
}

// Arco + tick (marca de bisectriz)
function ArcWithTick({
  V0,
  P1,
  P2,
  r,
  tickLen = 12,
  strokeW = 3.2,
}: {
  V0: Pt
  P1: Pt
  P2: Pt
  r: number
  tickLen?: number
  strokeW?: number
}) {
  const a1 = angleDeg(V0, P1)
  const a2 = angleDeg(V0, P2)
  const arc = arcPath(V0.x, V0.y, r, a1, a2)

  const inner = polar(V0.x, V0.y, r - tickLen / 2, arc.midDeg)
  const outer = polar(V0.x, V0.y, r + tickLen / 2, arc.midDeg)

  return (
    <>
      <path d={arc.d} fill="none" stroke="#111" strokeWidth={strokeW} strokeLinecap="round" />
      <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#111" strokeWidth={2.6} />
    </>
  )
}

function Prisma29Diagram({ sum, mode }: { sum: number; mode: DiagramMode }) {
  // extensión de BD más allá de B (para bisectriz exterior en B)
  const vBD = sub(B, D)
  const Bext = add(B, mul(vBD, 0.85))

  // trazos
  const triW = 6
  const baseW = 5.2
  const thinW = 3.2

  // ✅ Posición segura del texto “φ + β = …°”
  // Evita SIEMPRE cruzarse con la extensión BD (que va hasta casi y=0 en x≈510).
  const sumPos = P(735, 92)

  // En solución: mostrar ∠D (para justificar el Paso 1)
  const DLabelPos = add(D, P(0, -18))

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">
          {mode === 'question' ? 'Figura' : 'Figura'}
        </div>
        <div className="text-xs text-muted-foreground">bisectrices exteriores • no a escala</div>
      </div>

      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-[520px] rounded-xl border bg-white"
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

        {/* ✅ Texto condición en lugar correcto (NO se cruza con rectas) */}
        <OutlinedLabel text={`φ + β = ${sum}°`} x={sumPos.x} y={sumPos.y} size={24} weight={900} />

        {/* Recta base (D—E) */}
        <path
          d={`M ${D.x} ${D.y} L ${E.x} ${E.y}`}
          fill="none"
          stroke="#111"
          strokeWidth={baseW}
          strokeLinecap="round"
        />

        {/* Segmentos principales */}
        <path
          d={`M ${D.x} ${D.y} L ${B.x} ${B.y}`}
          fill="none"
          stroke="#111"
          strokeWidth={triW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={`M ${A.x} ${A.y} L ${B.x} ${B.y}`}
          fill="none"
          stroke="#111"
          strokeWidth={triW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={`M ${B.x} ${B.y} L ${C.x} ${C.y}`}
          fill="none"
          stroke="#111"
          strokeWidth={triW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={`M ${A.x} ${A.y} L ${C.x} ${C.y}`}
          fill="none"
          stroke="#111"
          strokeWidth={triW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Extensión BD más allá de B (fina) */}
        <path
          d={`M ${B.x} ${B.y} L ${Bext.x} ${Bext.y}`}
          fill="none"
          stroke="#111"
          strokeWidth={thinW}
          strokeLinecap="round"
          opacity={0.9}
        />

        {/* Puntos */}
        {[A, B, C].map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={5} fill="#111" />
        ))}
        <circle cx={D.x} cy={D.y} r={4.2} fill="#111" />

        {/* Labels puntos */}
        <text x={D.x - 18} y={D.y + 30} fill="#111" fontSize={15} fontWeight={800} style={{ fontFamily: 'ui-sans-serif, system-ui' }}>
          D
        </text>
        <text x={A.x} y={A.y + 36} fill="#111" fontSize={15} fontWeight={800} textAnchor="middle" style={{ fontFamily: 'ui-sans-serif, system-ui' }}>
          A
        </text>
        <text x={B.x} y={B.y - 24} fill="#111" fontSize={15} fontWeight={800} textAnchor="middle" style={{ fontFamily: 'ui-sans-serif, system-ui' }}>
          B
        </text>
        <text x={C.x + 18} y={C.y + 28} fill="#111" fontSize={15} fontWeight={800} style={{ fontFamily: 'ui-sans-serif, system-ui' }}>
          C
        </text>

        {/* Ángulos φ en A (entre AD y AB) */}
        <AngleArcWithLabel V0={A} P1={D} P2={B} r={46} label="φ" labelPush={18} />

        {/* Ángulos β en B (entre BD y BA) */}
        <AngleArcWithLabel V0={B} P1={D} P2={A} r={40} label="β" labelPush={18} />

        {/* Ángulo x en C (entre CA y CB) */}
        <AngleArcWithLabel V0={C} P1={A} P2={B} r={40} label="x" labelPush={18} />

        {/* Marcas de bisectriz exterior en A: AC biseca (AB, AE) */}
        <ArcWithTick V0={A} P1={B} P2={C} r={64} />
        <ArcWithTick V0={A} P1={C} P2={E} r={64} />

        {/* Marcas de bisectriz exterior en B: BC biseca (BDext, BA) */}
        <ArcWithTick V0={B} P1={Bext} P2={C} r={56} />
        <ArcWithTick V0={B} P1={C} P2={A} r={56} />

        {/* En solución: mostrar ∠D */}
        {mode === 'solution' && (
          <>
            <path
              d={arcPath(D.x, D.y, 40, angleDeg(D, B), angleDeg(D, A)).d}
              fill="none"
              stroke="#666"
              strokeWidth={3.4}
              strokeLinecap="round"
              opacity={0.9}
            />
            <OutlinedLabel text="∠D" x={DLabelPos.x + 46} y={DLabelPos.y - 8} size={20} weight={900} />
          </>
        )}
      </svg>
    </div>
  )
}

/* ============================================================
  Generador dinámico (x = S/2)
============================================================ */
type ExData = {
  sum: number
  answer: number
  options: Option[]
}

function buildExercise(excludeSums: number[]): ExData {
  // Solo pares para que x sea entero y se sienta “bonito”
  const cleanPool = [90, 100, 120, 140, 160, 170].filter(s => s % 2 === 0)

  const filtered = cleanPool.filter(s => !excludeSums.includes(s))
  const sum = choice(filtered.length ? filtered : cleanPool)

  const answer = sum / 2

  const candidates = new Set<number>([
    answer,
    answer - 10,
    answer + 10,
    answer - 20,
    180 - answer,
  ])

  const ok = (v: number) => v > 0 && v < 180
  const values0 = Array.from(candidates).filter(ok)

  while (new Set(values0).size < 4) values0.push(answer + choice([-30, -15, 15, 30]))
  const values = shuffle(Array.from(new Set(values0))).slice(0, 4)

  const keys: OptionKey[] = shuffle(['A', 'B', 'C', 'D'])
  const options: Option[] = keys.map((k, i) => ({
    key: k,
    value: values[i],
    correct: values[i] === answer,
  }))

  return { sum, answer, options }
}

/* ============================================================
  Component
============================================================ */
export default function Prisma29({ temaPeriodoId }: { temaPeriodoId: string }) {
  const engine = useExerciseEngine({ maxAttempts: 1 })

  const init = useMemo(() => buildExercise([]), [])
  const [ex, setEx] = useState<ExData>(init)
  const [history, setHistory] = useState<number[]>([init.sum])
  const [selectedKey, setSelectedKey] = useState<OptionKey | null>(null)

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelectedKey(op.key)
    engine.submit(op.correct)

    persistExerciseOnce({
      temaPeriodoId,
      exerciseKey: 'Prisma29',
      prompt: 'Calcular x si AC y BC son bisectrices exteriores.',
      questionLatex: `\\text{Calcular }x\\text{ si }\\phi+\\beta=${ex.sum}^{\\circ}.`,
      options: ex.options
        .slice()
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(o => `${o.key}.\\ ${o.value}^{\\circ}`),
      correctAnswer: `${ex.answer}`,
      userAnswer: `${op.value}`,
      isCorrect: op.correct,
      extra: { sum: ex.sum },
    })
  }

  function siguiente() {
    setSelectedKey(null)
    engine.reset()

    const recent = history.slice(-8)
    const next = buildExercise(recent)

    setEx(next)
    setHistory(h => [...h, next.sum].slice(-16))
  }

  const Dangle = 180 - ex.sum

  const s1 = `\\triangle ABD:\\ \\angle D = 180^{\\circ}-(\\phi+\\beta)=180^{\\circ}-${ex.sum}^{\\circ}=${Dangle}^{\\circ}`
  const s2 = `\\text{Bisectrices exteriores: }\\ x=90^{\\circ}-\\dfrac{\\angle D}{2}`
  const s3 = `x=90^{\\circ}-\\dfrac{${Dangle}^{\\circ}}{2}=90^{\\circ}-${Dangle / 2}^{\\circ}=${ex.answer}^{\\circ}`
  const s4 = `\\Rightarrow\\ x=\\dfrac{\\phi+\\beta}{2}=\\dfrac{${ex.sum}^{\\circ}}{2}=${ex.answer}^{\\circ}`

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 29 — Bisectrices exteriores (φ + β)"
        prompt={
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              En la figura, <span className="font-semibold">AC</span> y{' '}
              <span className="font-semibold">BC</span> son bisectrices exteriores.
              Calcula <span className="font-semibold">x</span> si{' '}
              <span className="font-semibold">φ + β = {ex.sum}°</span>.
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
              <Prisma29Diagram sum={ex.sum} mode="solution" />

              <div className="rounded-2xl border bg-white p-4 space-y-4 text-sm text-muted-foreground">
                <div className="font-semibold text-foreground">Resolución</div>

                <div className="rounded-lg border bg-background p-3">
                  <div className="font-semibold text-foreground mb-2">✅ Paso 1 — Hallar el ángulo en D</div>
                  <Tex tex={s1} block />
                </div>

                <div className="rounded-lg border bg-background p-3">
                  <div className="font-semibold text-foreground mb-2">✅ Paso 2 — Propiedad de bisectrices exteriores</div>
                  <Tex tex={s2} block />
                  <Tex tex={s3} block />
                </div>

                <div className="rounded-lg border bg-background p-3">
                  <div className="font-semibold text-foreground mb-2">✅ Paso 3 — Regla rápida</div>
                  <Tex tex={s4} block />

                  <div className="mt-3 flex items-center gap-2">
                    <span className="font-semibold text-foreground">Respuesta:</span>
                    <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base text-foreground">
                      {ex.answer}°
                    </span>
                  </div>
                </div>

                <div className="text-xs">
                  Nota: el dibujo es una maqueta (no a escala). La respuesta sale por propiedades, no por medir.
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        <div className="space-y-4">
          <Prisma29Diagram sum={ex.sum} mode="question" />

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
