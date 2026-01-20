'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
  PRISMA 28 — Bisectriz + Altura (hallar x)

  ? Estilo Prisma27:
     - Diagrama grande en SVG (maqueta, no a escala)
     - Variables visibles: mx, nx, ?°, 90°
     - 1 intento, autocalifica al elegir opción
     - "Siguiente" genera otro (evita repetidos recientes)
  ? Propiedad:
     ? = (|?A - ?C|)/2  y  ?A=mx, ?C=nx  ?  ? = ((m-n)x)/2
     ? x = 2?/(m-n)

  ? Persist estilo Prisma01:
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
const unit = (v: Pt) => {
  const m = len(v)
  return P(v.x / m, v.y / m)
}

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
  DIAGRAMA (SVG) — MAQUETA
============================================================ */
type DiagramMode = 'question' | 'solution'

const VB_W = 1000
const VB_H = 560

const A = P(170, 470)
const C = P(940, 470)
const B = P(360, 150)

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
      strokeWidth={9}
      paintOrder="stroke"
      style={{ fontFamily: 'ui-sans-serif, system-ui' }}
    >
      {text}
    </text>
  )
}

function RightAngleMarker({ V0, u, v, s = 22 }: { V0: Pt; u: Pt; v: Pt; s?: number }) {
  const p1 = add(V0, mul(u, s))
  const p2 = add(p1, mul(v, s))
  const p3 = add(V0, mul(v, s))
  const d = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`
  return <path d={d} fill="none" stroke="#111" strokeWidth={5} strokeLinecap="round" />
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

function SmallArc({ V0, P1, P2, r }: { V0: Pt; P1: Pt; P2: Pt; r: number }) {
  const a1 = angleDeg(V0, P1)
  const a2 = angleDeg(V0, P2)
  const arc = arcPath(V0.x, V0.y, r, a1, a2)
  return <path d={arc.d} fill="none" stroke="#111" strokeWidth={3.4} strokeLinecap="round" />
}

function Prisma28Diagram({
  gamma,
  m,
  n,
  mode,
}: {
  gamma: number
  m: number
  n: number
  mode: DiagramMode
}) {
  const baseY = A.y
  const H = P(B.x, baseY)

  const uBA = unit(sub(A, B))
  const uBC = unit(sub(C, B))
  const bisDir = unit(add(uBA, uBC))

  const t = (baseY - B.y) / (bisDir.y || 1e-9)
  const D = add(B, mul(bisDir, t))

  const triW = 5.8
  const auxW = 3.2
  const dash = '10 10'

  const uBase = unit(sub(C, A))
  const vUp = unit(sub(B, H))
  const rightH = <RightAngleMarker V0={H} u={uBase} v={vUp} s={20} />
  const ninetyH = P(H.x + 42, H.y - 22)

  const uBH = unit(sub(H, B))
  const uBD = unit(sub(D, B))
  const gammaDir = unit(add(uBH, uBD))
  const gammaPos = add(B, mul(gammaDir, 64))

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Diagrama</div>
        <div className="text-xs text-muted-foreground">variables visibles • no a escala</div>
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

        <path
          d={`M ${A.x} ${A.y} L ${B.x} ${B.y} L ${C.x} ${C.y} Z`}
          fill="none"
          stroke="#111"
          strokeWidth={triW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d={`M ${B.x} ${B.y} L ${H.x} ${H.y}`}
          fill="none"
          stroke="#111"
          strokeWidth={auxW}
          strokeDasharray={dash}
          strokeLinecap="round"
        />

        <path
          d={`M ${B.x} ${B.y} L ${D.x} ${D.y}`}
          fill="none"
          stroke="#111"
          strokeWidth={auxW}
          strokeDasharray={dash}
          strokeLinecap="round"
        />

        {rightH}
        <OutlinedLabel text="90°" x={ninetyH.x} y={ninetyH.y} size={18} weight={800} />

        <AngleArcWithLabel V0={A} P1={B} P2={C} r={48} label={`${m}x`} labelPush={22} />
        <AngleArcWithLabel V0={C} P1={A} P2={B} r={48} label={`${n}x`} labelPush={22} />

        {/* ? en B entre BH y BD */}
        <path
          d={arcPath(B.x, B.y, 46, angleDeg(B, H), angleDeg(B, D)).d}
          fill="none"
          stroke="#111"
          strokeWidth={3.8}
          strokeLinecap="round"
        />
        <OutlinedLabel text={`${gamma}°`} x={gammaPos.x} y={gammaPos.y} size={28} weight={900} />

        {/* Marcas de bisectriz */}
        <SmallArc V0={B} P1={A} P2={D} r={22} />
        <SmallArc V0={B} P1={D} P2={C} r={22} />

        {/* Puntos + letras */}
        <circle cx={A.x} cy={A.y} r={4.5} fill="#111" />
        <circle cx={B.x} cy={B.y} r={4.5} fill="#111" />
        <circle cx={C.x} cy={C.y} r={4.5} fill="#111" />
        <circle cx={H.x} cy={H.y} r={4.5} fill="#111" />
        <circle cx={D.x} cy={D.y} r={4.5} fill="#111" />

        <text
          x={A.x - 16}
          y={A.y + 28}
          fill="#111"
          fontSize={15}
          fontWeight={800}
          style={{ fontFamily: 'ui-sans-serif, system-ui' }}
        >
          A
        </text>
        <text
          x={B.x}
          y={B.y - 22}
          fill="#111"
          fontSize={15}
          fontWeight={800}
          textAnchor="middle"
          style={{ fontFamily: 'ui-sans-serif, system-ui' }}
        >
          B
        </text>
        <text
          x={C.x + 16}
          y={C.y + 28}
          fill="#111"
          fontSize={15}
          fontWeight={800}
          style={{ fontFamily: 'ui-sans-serif, system-ui' }}
        >
          C
        </text>
        <text
          x={H.x - 12}
          y={H.y + 28}
          fill="#111"
          fontSize={15}
          fontWeight={800}
          style={{ fontFamily: 'ui-sans-serif, system-ui' }}
        >
          H
        </text>
        <text
          x={D.x + 12}
          y={D.y + 28}
          fill="#111"
          fontSize={15}
          fontWeight={800}
          style={{ fontFamily: 'ui-sans-serif, system-ui' }}
        >
          D
        </text>

        {/* En solución: resalta levemente BH y BD */}
        {mode === 'solution' && (
          <>
            <path
              d={`M ${B.x} ${B.y} L ${H.x} ${H.y}`}
              fill="none"
              stroke="#666"
              strokeWidth={5}
              strokeLinecap="round"
              opacity={0.35}
            />
            <path
              d={`M ${B.x} ${B.y} L ${D.x} ${D.y}`}
              fill="none"
              stroke="#666"
              strokeWidth={5}
              strokeLinecap="round"
              opacity={0.35}
            />
          </>
        )}
      </svg>
    </div>
  )
}

/* ============================================================
  Generador dinámico
============================================================ */
type ExData = {
  gamma: number
  m: number
  n: number
  diff: number
  answer: number
  options: Option[]
}

function buildAllValidConfigs(): Array<Pick<ExData, 'gamma' | 'm' | 'n' | 'diff' | 'answer'>> {
  const gammas = [8, 10, 12, 14, 16, 18, 20]
  const diffs = [1, 2, 3, 4]
  const out: Array<Pick<ExData, 'gamma' | 'm' | 'n' | 'diff' | 'answer'>> = []

  for (const diff of diffs) {
    for (const gamma of gammas) {
      const twoG = 2 * gamma
      if (twoG % diff !== 0) continue
      const x = twoG / diff
      if (x <= 0 || x > 90) continue

      for (let n = 2; n <= 7; n++) {
        const m = n + diff
        const Aang = m * x
        const Cang = n * x
        if (Aang > 170 || Cang > 170) continue
        out.push({ gamma, m, n, diff, answer: x })
      }
    }
  }

  return out
}

const ALL_CONFIGS = buildAllValidConfigs()

function buildExercise(excludeSigs: string[]): ExData {
  const candidates = ALL_CONFIGS.filter(cfg => !excludeSigs.includes(`${cfg.gamma}-${cfg.m}-${cfg.n}`))
  const cfg = choice(candidates.length ? candidates : ALL_CONFIGS)

  const { gamma, m, n, diff, answer } = cfg

  const d1 = gamma
  const d2 = 2 * gamma
  const d3 = Math.abs(answer - gamma) || answer + 6
  const d4 = 180 - answer

  const set:any = new Set<number>([answer, d1, d2, d3, d4])
  const vals: number[] = []
  for (const v of set) {
    if (v > 0 && v <= 180) vals.push(v)
  }
  while (new Set(vals).size < 4) vals.push(answer + choice([-20, -15, -10, 10, 15, 20]))

  const values = shuffle(Array.from(new Set(vals))).slice(0, 4)
  const keys: OptionKey[] = shuffle(['A', 'B', 'C', 'D'])

  const options: Option[] = keys.map((k, i) => ({
    key: k,
    value: values[i],
    correct: values[i] === answer,
  }))

  return { gamma, m, n, diff, answer, options }
}

/* ============================================================
  COMPONENT
============================================================ */
export default function Prisma28({
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
  const [history, setHistory] = useState<string[]>([`${init.gamma}-${init.m}-${init.n}`])
  const [selectedKey, setSelectedKey] = useState<OptionKey | null>(null)

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelectedKey(op.key)
    engine.submit(op.correct)

    const questionLatex = `\\text{Calcular }x,\\ \\text{si }BD\\text{ es bisectriz y }BH\\text{ es altura.}`
    const optionsLatex = ex.options
      .slice()
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(o => `${o.key}.\\ ${o.value}^{\\circ}`)

    persistExerciseOnce({
      exerciseId,
      classroomId,
      sessionId,
      correct: op.correct,
      answer: {
        selected: `${op.key}. ${op.value}°`,
        correctAnswer: `${ex.answer}°`,
        latex: questionLatex,
        options: optionsLatex,
        extra: {
          gamma: ex.gamma,
          A: `${ex.m}x`,
          C: `${ex.n}x`,
          formula: 'x = 2?/(m-n)',
        },
      },
    })
  }

  function siguiente() {
    setSelectedKey(null)
    engine.reset()

    const recent = history.slice(-8)
    const next = buildExercise(recent)

    setEx(next)
    setHistory(h => [...h, `${next.gamma}-${next.m}-${next.n}`].slice(-16))
  }

  const s1 = `\\gamma = \\dfrac{|\\angle A - \\angle C|}{2}`
  const s2 = `\\gamma = \\dfrac{|${ex.m}x - ${ex.n}x|}{2}`
  const s3 = `${ex.gamma}^{\\circ} = \\dfrac{(${ex.m}-${ex.n})x}{2}`
  const s4 = `2\\cdot ${ex.gamma}^{\\circ} = (${ex.m}-${ex.n})x`
  const s5 = `x = \\dfrac{2\\cdot ${ex.gamma}}{${ex.m}-${ex.n}} = ${ex.answer}^{\\circ}`

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 28 — Bisectriz y altura"
        prompt={
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Calcular <span className="font-semibold">x</span>, si{' '}
              <span className="font-semibold">BD</span> es bisectriz y{' '}
              <span className="font-semibold">BH</span> es altura.
            </div>
            <div className="text-sm text-muted-foreground">
              En la figura: <span className="font-semibold">?A = {ex.m}x</span>,{' '}
              <span className="font-semibold">?C = {ex.n}x</span>, y{' '}
              <span className="font-semibold">?(BH, BD) = {ex.gamma}°</span>.
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
              <Prisma28Diagram gamma={ex.gamma} m={ex.m} n={ex.n} mode="solution" />

              <div className="rounded-2xl border bg-white p-4">
                <div className="font-semibold mb-3">Resolución</div>

                <div className="space-y-4 text-sm text-muted-foreground">
                  <div>
                    <div className="font-semibold text-foreground mb-1">? Paso 1 — Propiedad clave</div>
                    <div className="rounded-lg border bg-background p-3 space-y-2">
                      <Tex tex={s1} block />
                      <div className="text-xs text-muted-foreground">
                        (Ángulo entre una <b>altura</b> y una <b>bisectriz</b> desde el mismo vértice)
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-foreground mb-1">? Paso 2 — Sustituir ?A y ?C</div>
                    <div className="rounded-lg border bg-background p-3 space-y-2">
                      <Tex tex={s2} block />
                      <Tex tex={s3} block />
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-foreground mb-1">? Paso 3 — Despejar x</div>
                    <div className="rounded-lg border bg-background p-3 space-y-2">
                      <Tex tex={s4} block />
                      <Tex tex={s5} block />
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <span className="font-semibold text-foreground">Respuesta:</span>
                      <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base text-foreground">
                        {ex.answer}°
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Nota: el dibujo es una maqueta (no a escala). La respuesta sale por propiedades, no por medir.
                  </div>
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        <div className="space-y-4">
          <Prisma28Diagram gamma={ex.gamma} m={ex.m} n={ex.n} mode="question" />

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



