'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 28 — Bisectriz + Altura (hallar x)
   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ Enunciado tipo Prisma
   ✅ Teorema usado: ∠(altura, bisectriz) = (|A - C|)/2
============================================================ */

type Option = { label: 'A' | 'B' | 'C' | 'D'; value: number; correct: boolean }

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

/* ============================================================
   DIAGRAMA (Canvas) — Triángulo ABC con:
   - BH altura a AC
   - BD bisectriz (construida como bisectriz real)
   - Ángulos marcados: 5x (exterior en A), 4x (en C), 16° en B
============================================================ */
function Diagram() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const cssW = rect.width > 0 ? rect.width : 520
    const cssH = 260
    const dpr = window.devicePixelRatio || 1

    canvas.width = Math.floor(cssW * dpr)
    canvas.height = Math.floor(cssH * dpr)
    canvas.style.width = '100%'
    canvas.style.height = `${cssH}px`

    const ctx:any = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)

    const TAU = Math.PI * 2
    const P = (x: number, y: number) => ({ x, y })
    const len = (v: { x: number; y: number }) => Math.hypot(v.x, v.y)
    const sub = (a: any, b: any) => ({ x: a.x - b.x, y: a.y - b.y })
    const add = (a: any, b: any) => ({ x: a.x + b.x, y: a.y + b.y })
    const mul = (v: any, k: number) => ({ x: v.x * k, y: v.y * k })
    const unit = (v: any) => {
      const L = len(v) || 1
      return { x: v.x / L, y: v.y / L }
    }
    const ang = (p: any, q: any) => Math.atan2(p.y - q.y, p.x - q.x)

    function line(p1: any, p2: any, w = 4) {
      ctx.lineWidth = w
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()
    }

    function dot(p: any, r = 4) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, TAU)
      ctx.fill()
    }

    function text(t: string, x: number, y: number, size = 16, align: CanvasTextAlign = 'center') {
      ctx.font = `${size}px ui-sans-serif, system-ui`
      ctx.textAlign = align
      ctx.fillText(t, x, y)
    }

    function drawAngleArc(V: any, P1: any, P2: any, r: number, label: string) {
      const a1 = ang(P1, V)
      const a2 = ang(P2, V)

      let start = a1
      let end = a2
      let diff = end - start

      if (diff > Math.PI) end -= TAU
      if (diff < -Math.PI) start -= TAU

      ctx.beginPath()
      ctx.arc(V.x, V.y, r, start, end)
      ctx.stroke()

      const mid = (start + end) / 2
      text(label, V.x + (r + 14) * Math.cos(mid), V.y + (r + 14) * Math.sin(mid), 16)
    }

    // estilo
    ctx.strokeStyle = '#000'
    ctx.fillStyle = '#000'
    ctx.lineCap = 'round'

    // geometría (proporcional al canvas)
    const baseY = cssH * 0.85
    const A = P(cssW * 0.154, baseY)
    const C = P(cssW * 0.923, baseY)
    const B = P(cssW * 0.335, cssH * 0.231)

    const H = P(B.x, baseY) // pie de altura

    // bisectriz real desde B (suma de unitarios sobre BA y BC)
    const uBA = unit(sub(A, B))
    const uBC = unit(sub(C, B))
    const bisDir = unit(add(uBA, uBC))

    // intersección con AC (y = baseY)
    const t = (baseY - B.y) / (bisDir.y || 1e-6)
    const D = add(B, mul(bisDir, t))

    // base extendida para mostrar el exterior en A
    const baseLeft = P(A.x - 70, baseY)
    const baseRight = P(C.x + 25, baseY)

    // dibujo
    line(baseLeft, baseRight, 4)
    line(A, B, 4)
    line(B, C, 4)

    // altura BH
    ctx.lineWidth = 4
    line(B, H, 4)

    // bisectriz BD
    ctx.lineWidth = 4
    line(B, D, 4)

    // puntos
    ;[A, B, C, H, D].forEach(p => dot(p, 4))

    // etiquetas de puntos
    text('A', A.x - 8, A.y + 22, 16)
    text('C', C.x + 10, C.y + 22, 16)
    text('B', B.x - 10, B.y - 12, 16)
    text('H', H.x - 10, H.y + 22, 16)
    text('D', D.x + 10, D.y + 22, 16)

    // cuadrito de 90° en H
    const s = 14
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(H.x, H.y)
    ctx.lineTo(H.x + s, H.y)
    ctx.lineTo(H.x + s, H.y - s)
    ctx.lineTo(H.x, H.y - s)
    ctx.stroke()

    // arcos de ángulos
    ctx.lineWidth = 3

    // 5x en A (EXTERIOR): entre AB y la extensión a la izquierda
    const A_ext = P(A.x - 60, A.y) // rayito a la izquierda
    drawAngleArc(A, A_ext, B, 22, '5x')

    // 4x en C (interior): entre CA (hacia A) y CB (hacia B)
    drawAngleArc(C, A, B, 22, '4x')

    // 16° en B: entre BH (hacia H) y BD (hacia D)
    drawAngleArc(B, H, D, 22, '16°')

    // marca visual de "bisectriz" (doble arco pequeñito en B, sobre BA y BD)
    const rMini = 14
    const aBA = ang(A, B)
    const aBD = ang(D, B)
    const aBC = ang(C, B)
    // arco BA->BD y BD->BC
    const arc = (a1: number, a2: number) => {
      let s = a1,
        e = a2
      let diff = e - s
      if (diff > Math.PI) e -= TAU
      if (diff < -Math.PI) s -= TAU
      ctx.beginPath()
      ctx.arc(B.x, B.y, rMini, s, e)
      ctx.stroke()
    }
    arc(aBA, aBD)
    arc(aBD, aBC)
  }, [])

  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-sm font-semibold mb-2">Figura (referencial)</div>
      <canvas ref={canvasRef} className="w-full rounded-lg" />
    </div>
  )
}

/* =========================
   Generador (fijo como el Prisma)
========================= */
function generateExercise() {
  const answer = 32

  const values = shuffle([16, 8, 32, 64])
  const labels: Option['label'][] = ['A', 'B', 'C', 'D']

  const options: Option[] = values.map((v, i) => ({
    label: labels[i],
    value: v,
    correct: v === answer,
  }))

  const questionLatex = `\\text{Calcular } x,\\ \\text{si } BD \\text{ es bisectriz y } BH \\text{ es altura.}`

  return { answer, options, questionLatex }
}

/* =========================
   COMPONENT
========================= */
export default function Prisma28({ temaPeriodoId }: { temaPeriodoId: string }) {
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
      exerciseKey: 'Prisma28',
      prompt: 'Calcular x, si BD es bisectriz y BH es altura.',
      questionLatex: ex.questionLatex,
      options: ex.options.map(o => `${o.label}. ${o.value}°`),
      correctAnswer: `${ex.answer}`,
      userAnswer: `${op.value}`,
      isCorrect: op.correct,
      extra: { givenAngle: 16, leftExpr: '5x', rightExpr: '4x' },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  const s1 = `\\text{Propiedad: } \\angle(\\text{altura},\\ \\text{bisectriz}) = \\dfrac{|\\angle A - \\angle C|}{2}`
  const s2 = `16^{\\circ} = \\dfrac{5x - 4x}{2}`
  const s3 = `16^{\\circ} = \\dfrac{x}{2}`
  const s4 = `x = 32^{\\circ}`

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 28 — Bisectriz y altura"
        prompt={
          <div className="space-y-3">
            <div className="text-sm">
              <Tex latex={ex.questionLatex} />
            </div>

            <Diagram />

            <div className="text-lg">
              <Tex latex={`\\text{Halle } x.`} display />
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
                <div className="font-semibold mb-2">✅ Paso 1 — Propiedad clave</div>
                <Tex latex={s1} display />
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 2 — Planteo con los datos</div>
                <div className="space-y-2">
                  <Tex latex={s2} display />
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
                En este ejercicio: <span className="font-mono">16°</span> es la mitad de la diferencia{' '}
                <span className="font-mono">(5x − 4x)</span>.
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
