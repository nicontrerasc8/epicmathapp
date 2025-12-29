'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 27 — Geometría (Alturas) — hallar x + y
   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ Dinámico: α cambia y SIEMPRE x + y = α
   ✅ Diagrama en CANVAS (alturas + ángulos x, y, α)
============================================================ */

type Option = { label: 'A' | 'B' | 'C' | 'D'; value: number; correct: boolean }

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

/* ============================================================
   DIAGRAMA (Canvas)
   - Triángulo ABC con ∠A = α
   - BF ⟂ AC (altura desde B)
   - CD ⟂ AB (altura desde C)
   - O = intersección de alturas
   - x en B entre BF y BC
   - y en C entre BC y CD
============================================================ */
function Diagram({ alpha }: { alpha: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const cssW = rect.width > 0 ? rect.width : 560
    const cssH = 300
    const dpr = window.devicePixelRatio || 1

    canvas.width = Math.floor(cssW * dpr)
    canvas.height = Math.floor(cssH * dpr)
    canvas.style.width = '100%'
    canvas.style.height = `${cssH}px`

    const ctx:any = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)

    ctx.strokeStyle = '#000'
    ctx.fillStyle = '#000'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const TAU = Math.PI * 2
    const deg2rad = (d: number) => (d * Math.PI) / 180
    const P = (x: number, y: number) => ({ x, y })

    const sub = (a: any, b: any) => P(a.x - b.x, a.y - b.y)
    const add = (a: any, b: any) => P(a.x + b.x, a.y + b.y)
    const mul = (v: any, k: number) => P(v.x * k, v.y * k)
    const dot = (u: any, v: any) => u.x * v.x + u.y * v.y
    const norm2 = (v: any) => v.x * v.x + v.y * v.y
    const angleOf = (p: any, q: any) => Math.atan2(p.y - q.y, p.x - q.x)

    function line(p1: any, p2: any, w = 4) {
      ctx.lineWidth = w
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()
    }

    function dotPt(p: any, r = 4) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, TAU)
      ctx.fill()
    }

    function text(t: string, x: number, y: number, size = 16) {
      ctx.font = `${size}px ui-sans-serif, system-ui`
      ctx.textAlign = 'center'
      ctx.fillText(t, x, y)
    }

    function drawAngleSmall(V: any, P1: any, P2: any, r: number, label: string) {
      const a1 = angleOf(P1, V)
      const a2 = angleOf(P2, V)

      let diff = a2 - a1
      while (diff <= -Math.PI) diff += TAU
      while (diff > Math.PI) diff -= TAU

      const start = a1
      const end = a1 + diff
      const anticlockwise = diff < 0

      ctx.beginPath()
      ctx.arc(V.x, V.y, r, start, end, anticlockwise)
      ctx.stroke()

      const mid = start + diff / 2
      text(label, V.x + (r + 14) * Math.cos(mid), V.y + (r + 14) * Math.sin(mid))
    }

    function rightAngleMark(V: any, u: any, v: any, s = 12) {
      const p1 = add(V, mul(u, s))
      const p2 = add(p1, mul(v, s))
      const p3 = add(V, mul(v, s))

      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.lineTo(p3.x, p3.y)
      ctx.stroke()
    }

    /* ======================
       CONSTRUCCIÓN (PDF-LIKE)
    ====================== */
    const baseY = 245
    const L = 190
    const a = deg2rad(alpha)

    // A y C FIJOS (clave)
    const A = P(40, baseY)
    const C = P(cssW - 90, baseY)

    // B según α
    const B = P(
      A.x + L * Math.cos(a),
      A.y - L * Math.sin(a)
    )

    // F: pie de altura desde B
    const F = P(B.x, baseY)

    // D: proyección de C sobre AB (controlada)
    const AB = sub(B, A)
    let t = dot(sub(C, A), AB) / norm2(AB)
    t = Math.min(0.65, Math.max(0.30, t)) // 🔥 BD largo sin romper AF
    const D = add(A, mul(AB, t))

    // O: intersección de alturas
    const CD = sub(D, C)
    const s = (B.x - C.x) / (CD.x || 1e-9)
    const O = add(C, mul(CD, s))

    /* ======================
       DIBUJO
    ====================== */
    line(A, C, 4)
    line(A, B, 4)
    line(B, C, 4)

    line(B, F, 3)
    line(C, D, 3)

    ;[
      [A, 'A', -10, 20],
      [B, 'B', 0, -16],
      [C, 'C', 14, 20],
      [D, 'D', -14, 10],
      [F, 'F', 0, 22],
      [O, 'O', 14, -10],
    ].forEach(([p, lab, dx, dy]: any) => {
      dotPt(p, 4)
      text(lab, p.x + dx, p.y + dy)
    })

    // 90°
    const uAC = P(1, 0)
    const uBF = P(0, -1)
    rightAngleMark(F, uAC, uBF)

    const mAB = Math.hypot(AB.x, AB.y) || 1
    const uAB = P(AB.x / mAB, AB.y / mAB)
    const uPerpAB = P(-uAB.y, uAB.x)
    rightAngleMark(D, uAB, uPerpAB)

    // ángulos
    ctx.lineWidth = 3
    drawAngleSmall(A, B, C, 22, `${alpha}°`)
    drawAngleSmall(B, F, C, 22, 'x')
    drawAngleSmall(C, B, D, 22, 'y')
  }, [alpha])

  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-sm font-semibold mb-2">Figura (referencial)</div>
      <canvas ref={canvasRef} className="w-full rounded-lg" />
    </div>
  )
}



/* =========================
   Generador
   Propiedad:
   BF ⟂ AC y CD ⟂ AB  ⇒  ∠(BF,CD) obtuso = 180 - α
   En ΔBOC: x + y + θ = 180  ⇒ x + y = α
========================= */
function generateExercise() {
  const alphas = [60, 65, 70, 75, 80, 85]
  for (let tries = 0; tries < 250; tries++) {
    const alpha = choice(alphas)
    const answer = alpha

    const d1 = 180 - alpha
    const d2 = alpha + 20 <= 170 ? alpha + 20 : alpha - 10
    const d3 = alpha - 20 >= 10 ? alpha - 20 : alpha + 30

    const set = new Set<number>([answer, d1, d2, d3])
    while (set.size < 4) set.add(answer + choice([-15, -10, 10, 15]))

    const values = shuffle(Array.from(set)).slice(0, 4)
    const labels: Option['label'][] = ['A', 'B', 'C', 'D']
    const options: Option[] = values.map((v, i) => ({
      label: labels[i],
      value: v,
      correct: v === answer,
    }))

    const questionLatex =
      `\\text{En la figura, } BF\\perp AC \\text{ y } CD\\perp AB.\\ ` +
      `\\text{Si } \\angle A = ${alpha}^{\\circ},\\ \\text{halle } x+y.`

    return { alpha, answer, options, questionLatex }
  }

  // fallback
  const alpha = 80
  const answer = 80
  const options: Option[] = shuffle([
    { label: 'A', value: 100, correct: false },
    { label: 'B', value: 140, correct: false },
    { label: 'C', value: 35, correct: false },
    { label: 'D', value: 80, correct: true },
  ])
  const questionLatex = `\\text{Halle } x+y.`
  return { alpha, answer, options, questionLatex }
}

/* =========================
   COMPONENT
========================= */
export default function Prisma27({ temaPeriodoId }: { temaPeriodoId: string }) {
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
      exerciseKey: 'Prisma27',
      prompt: 'Calcular x + y.',
      questionLatex: ex.questionLatex,
      options: ex.options.map(o => `${o.label}. ${o.value}°`),
      correctAnswer: `${ex.answer}`,
      userAnswer: `${op.value}`,
      isCorrect: op.correct,
      extra: { alpha: ex.alpha },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  const theta = 180 - ex.alpha

  const s1 = `\\text{Como } BF\\perp AC \\text{ y } CD\\perp AB,\\ \\angle( BF, CD )\\text{ (obtuso) }=180^{\\circ}-\\angle A.`
  const s2 = `\\theta = 180^{\\circ} - ${ex.alpha}^{\\circ} = ${theta}^{\\circ}.`
  const s3 = `\\triangle BOC:\\ x+y+\\theta=180^{\\circ}.`
  const s4 = `x+y=180^{\\circ}-${theta}^{\\circ}=${ex.alpha}^{\\circ}.`

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 27 — Alturas: hallar x + y"
        prompt={
          <div className="space-y-3">
            <div className="text-sm">
              En la figura, <span className="font-semibold">BF ⟂ AC</span> y{' '}
              <span className="font-semibold">CD ⟂ AB</span>. Si{' '}
              <span className="font-semibold">∠A = {ex.alpha}°</span>, calcula{' '}
              <span className="font-semibold">x + y</span>.
            </div>

            <Diagram alpha={ex.alpha} />

            <div className="text-lg">
              <Tex latex={`\\text{Halle } x+y`} display />
            </div>
          </div>
        }
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => { }}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <div className="space-y-4 text-sm leading-relaxed">
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 1 — Propiedad de alturas</div>
                <div className="space-y-2">
                  <Tex latex={s1} display />
                  <Tex latex={s2} display />
                </div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 2 — Suma de ángulos en \\(\\triangle BOC\\)</div>
                <div className="space-y-2">
                  <Tex latex={s3} display />
                  <Tex latex={s4} display />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm font-semibold">Respuesta:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">
                    {ex.answer}°
                  </span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                En este patrón, siempre se cumple: <span className="font-mono">x+y = \\angle A</span>.
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
