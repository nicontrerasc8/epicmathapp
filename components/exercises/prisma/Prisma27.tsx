'use client'

import { useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { ExerciseHud } from '../base/ExerciseHud'
import { useExerciseSubmission } from '@/lib/exercises/useExerciseSubmission'
import { useExerciseTimer } from '@/lib/exercises/useExerciseTimer'
import { computeTrophyGain, WRONG_PENALTY } from '@/lib/exercises/gamification'

/* ============================================================
  PRISMA 27 — MAQUETA (NO a escala) — hallar x + y

  ? Maqueta fija: el triángulo NO cambia (no se mide el dibujo).
  ? SOLO cambian variables: a, x, y, ?.
  ? “90°” dentro del gráfico en:
     - F (BF ? AC)
     - D (CD ? AB)  <-- el que marcaste en rojo, ahora sí dentro
  ? Ejercicio dinámico: a cambia siempre y evita repetir recientes.
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
  Random helpers
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
  Geometry helpers
========================= */
type Pt = { x: number; y: number }
const P = (x: number, y: number): Pt => ({ x, y })
const sub = (a: Pt, b: Pt): Pt => P(a.x - b.x, a.y - b.y)
const add = (a: Pt, b: Pt): Pt => P(a.x + b.x, a.y + b.y)
const mul = (v: Pt, k: number): Pt => P(v.x * k, v.y * k)
const dot = (a: Pt, b: Pt) => a.x * b.x + a.y * b.y
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
  SVG Diagram (MAQUETA FIJA)
============================================================ */
type DiagramMode = 'question' | 'solution'

const VB_W = 1000
const VB_H = 560

// ? MAQUETA FIJA (igual siempre)
const A = P(160, 480)
const C = P(940, 480)
const B = P(320, 140)

// ? D fijo para que CD se vea “horizontal/estable”
const D_RATIO = 0.55

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

function Prisma27Diagram({ alpha, mode }: { alpha: number; mode: DiagramMode }) {
  // BF vertical
  const F = P(B.x, A.y)

  // D en AB (maqueta estética)
  const AB = sub(B, A)
  const D = add(A, mul(AB, D_RATIO))

  // CD y O = intersección con BF
  const CD = sub(D, C)
  const s = (B.x - C.x) / (CD.x || 1e-9)
  const O = add(C, mul(CD, s))

  // estilos
  const triW = 5.8
  const auxW = 3.2
  const dash = '10 10'

  // --- 90° en F (BF ? AC)
  const uBase = unit(sub(C, A))
  const vUp = unit(sub(B, F))
  const rightF = <RightAngleMarker V0={F} u={uBase} v={vUp} s={20} />

  // --- 90° en D (CD ? AB) -> orientamos el cuadrito hacia "adentro"
  const centroid = P((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3)

  // u: dirección sobre AB (hacia B)
  const uAB = unit(sub(B, A))

  // v: perpendicular a AB (escogemos el signo que apunte hacia el interior/centro)
  let vPerp = unit(P(-uAB.y, uAB.x))
  if (dot(vPerp, sub(centroid, D)) < 0) vPerp = mul(vPerp, -1)

  const rightD = <RightAngleMarker V0={D} u={uAB} v={vPerp} s={18} />

  // ? POSICIONES DE “90°” DENTRO:
  const ninetyF = P(F.x + 40, F.y - 22)
  const ninetyD = add(D, add(mul(uAB, 30), mul(vPerp, 14)))

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

        {/* Triángulo ABC */}
        <path
          d={`M ${A.x} ${A.y} L ${B.x} ${B.y} L ${C.x} ${C.y} Z`}
          fill="none"
          stroke="#111"
          strokeWidth={triW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Alturas punteadas: BF y CD */}
        <path
          d={`M ${B.x} ${B.y} L ${F.x} ${F.y}`}
          fill="none"
          stroke="#111"
          strokeWidth={auxW}
          strokeDasharray={dash}
          strokeLinecap="round"
        />
        <path
          d={`M ${C.x} ${C.y} L ${D.x} ${D.y}`}
          fill="none"
          stroke="#111"
          strokeWidth={auxW}
          strokeDasharray={dash}
          strokeLinecap="round"
        />

        {/* 90° markers */}
        {rightF}
        {rightD}

        {/* ? 90° dentro del gráfico (F y D) */}
        <OutlinedLabel text="90°" x={ninetyF.x} y={ninetyF.y} size={18} weight={800} />
        <OutlinedLabel text="90°" x={ninetyD.x} y={ninetyD.y} size={18} weight={800} />

        {/* Solución: triángulo BOC + O */}
        {mode === 'solution' && (
          <>
            <path
              d={`M ${B.x} ${B.y} L ${O.x} ${O.y} L ${C.x} ${C.y}`}
              fill="none"
              stroke="#666"
              strokeWidth={3.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={O.x} cy={O.y} r={4.5} fill="#111" />
          </>
        )}

        {/* Arcos + etiquetas */}
        <AngleArcWithLabel V0={A} P1={B} P2={C} r={48} label={`${alpha}°`} labelPush={22} />
        <AngleArcWithLabel V0={B} P1={F} P2={C} r={44} label="x" labelPush={20} />
        <AngleArcWithLabel V0={C} P1={B} P2={D} r={44} label="y" labelPush={20} />
        {mode === 'solution' && <AngleArcWithLabel V0={O} P1={B} P2={C} r={38} label="?" labelPush={20} />}

        {/* Puntos y letras */}
        <circle cx={A.x} cy={A.y} r={4.5} fill="#111" />
        <circle cx={B.x} cy={B.y} r={4.5} fill="#111" />
        <circle cx={C.x} cy={C.y} r={4.5} fill="#111" />

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
      </svg>
    </div>
  )
}

/* ============================================================
  Ejercicios dinámicos (sin repetir recientes)
============================================================ */
function alphaPool(): number[] {
  const pool: number[] = []
  for (let a = 35; a <= 85; a += 5) pool.push(a)
  return pool
}

function buildExercise(excludeRecentAlphas: number[]) {
  const pool = alphaPool()
  const filtered = pool.filter(a => !excludeRecentAlphas.includes(a))
  const alpha = choice(filtered.length ? filtered : pool)

  const answer = alpha

  const d1 = 180 - alpha
  const d2 = Math.min(175, alpha + choice([45, 50, 55, 60]))
  const d3 = Math.max(15, Math.round(alpha / 2) + choice([-10, -5, 0, 5]))

  const set = new Set<number>([answer, d1, d2, d3])
  while (set.size < 4) set.add(answer + choice([-25, -20, -15, 15, 20, 25]))

  const values = shuffle(Array.from(set)).slice(0, 4)
  const keys: OptionKey[] = shuffle(['A', 'B', 'C', 'D'])

  const options: Option[] = keys.map((k, i) => ({
    key: k,
    value: values[i],
    correct: values[i] === answer,
  }))

  return { alpha, answer, options }
}

/* ============================================================
  Prisma27 component (firma nueva)
============================================================ */
export default function Prisma27({
  exerciseId,
  classroomId,
  sessionId,
}: {
  exerciseId: string
  classroomId: string
  sessionId?: string
}) {
  const engine = useExerciseEngine({ maxAttempts: 1 })
  const { studentId, gami, gamiLoading, submitAttempt } =
    useExerciseSubmission({
      exerciseId,
      classroomId,
      sessionId,
    })

  const init = buildExercise([])
  const [timerKey, setTimerKey] = useState(0)
  const [ex, setEx] = useState(init)
  const [alphaHistory, setAlphaHistory] = useState<number[]>([init.alpha])
  const [selectedKey, setSelectedKey] = useState<OptionKey | null>(null)
  const { elapsed, startedAtRef } = useExerciseTimer(engine.canAnswer, timerKey)
  const trophyPreview = computeTrophyGain(elapsed)

  const theta = 180 - ex.alpha

  async function pickOption(op: Option) {
    if (!engine.canAnswer) return

    const timeSeconds = (Date.now() - startedAtRef.current) / 1000
    setSelectedKey(op.key)
    engine.submit(op.correct)

    const ordered = ex.options.slice().sort((a, b) => a.key.localeCompare(b.key))

    await submitAttempt({

      correct: op.correct,
      answer: {
        selected: `${op.key}:${op.value}`,
        correctAnswer: String(ex.answer),
        latex: `\\text{Diagrama referencial (no a escala). Si } \\angle A=${ex.alpha}^{\\circ},\\ \\text{halle } x+y.`,
        options: ordered.map(o => `${o.key}.\\ ${o.value}^{\\circ}`),
        extra: { alpha: ex.alpha, theta },
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelectedKey(null)
    engine.reset()
    setTimerKey(k => k + 1)

    const recent = alphaHistory.slice(-6)
    const next = buildExercise(recent)

    setEx(next)
    setAlphaHistory(h => [...h, next.alpha].slice(-12))
  }

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 27 — Encontrar x + y"
        prompt="Diagrama referencial (no a escala). La maqueta no se mide: solo cambian las variables."
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border bg-white p-4">
                <div className="font-semibold mb-3">Resolución</div>

                <div className="space-y-4 text-sm text-muted-foreground">
                  <div>
                    <div className="font-semibold text-foreground mb-1">• Propiedad de alturas (hallar ?)</div>
                    <div className="rounded-lg border bg-background p-3 space-y-2">
                      <Tex tex={`\\theta + ${ex.alpha}^{\\circ} = 180^{\\circ}`} block />
                      <Tex tex={`\\theta = 180^{\\circ} - ${ex.alpha}^{\\circ} = ${theta}^{\\circ}`} block />
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-foreground mb-1">• En el triángulo ?BOC</div>
                    <div className="rounded-lg border bg-background p-3 space-y-2">
                      <Tex tex={`x + y + \\theta = 180^{\\circ}`} block />
                      <Tex
                        tex={`x + y = 180^{\\circ} - \\theta = 180^{\\circ} - ${theta}^{\\circ} = ${ex.alpha}^{\\circ}`}
                        block
                      />
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <span className="font-semibold text-foreground">Respuesta:</span>
                      <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base text-foreground">
                        {ex.answer}°
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Nota: el dibujo es una maqueta (no a escala). La respuesta sale por propiedades.
                  </div>
                </div>
              </div>

              <Prisma27Diagram alpha={ex.alpha} mode="solution" />
            </div>
          </SolutionBox>
        }
      >
        <div className="space-y-4">
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-sm text-muted-foreground mb-2">
              27. Encontrar <span className="font-semibold">x + y</span> en:
            </div>
            <Prisma27Diagram alpha={ex.alpha} mode="question" />
          </div>

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
        <div className="mt-6">
          <ExerciseHud
            elapsed={elapsed}
            trophyPreview={trophyPreview}
            gami={gami}
            gamiLoading={gamiLoading}
            studentId={studentId}
            wrongPenalty={WRONG_PENALTY}
            status={engine.status}
          />
        </div>
      </ExerciseShell>
    </MathJaxContext>
  )
}



