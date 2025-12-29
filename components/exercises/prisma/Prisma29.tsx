'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 29 — Bisectrices exteriores (φ + β) → hallar x
   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ Dinámico: S = φ + β (100, 120, 140, 160)
   ✅ Respuesta: x = S/2
   ✅ Diagrama con CANVAS (marcas de bisectriz exterior)
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
   - Triángulo ABD con ∠A=φ y ∠B=β, y bisectrices exteriores
   - C es la intersección de bisectrices exteriores (excentro)
   - x = ∠ACB
============================================================ */
function Diagram({ sum }: { sum: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const cssW = rect.width > 0 ? rect.width : 520
    const cssH = 260
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

    canvas.width = Math.floor(cssW * dpr)
    canvas.height = Math.floor(cssH * dpr)
    canvas.style.width = '100%'
    canvas.style.height = `${cssH}px`

    const ctx: any = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)

    const TAU = Math.PI * 2
    const P = (x: number, y: number) => ({ x, y })

    const line = (p1: any, p2: any, w = 4) => {
      ctx.lineWidth = w
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()
    }

    const dot = (p: any, r = 4.5) => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, TAU)
      ctx.fill()
    }

    const angle = (p: any, q: any) => Math.atan2(p.y - q.y, p.x - q.x)

    const text = (
      t: string,
      x: number,
      y: number,
      size = 16,
      align: CanvasTextAlign = 'center'
    ) => {
      ctx.font = `${size}px ui-sans-serif, system-ui`
      ctx.textAlign = align
      ctx.fillText(t, x, y)
    }

    function drawAngleArc(
      V: any,
      P1: any,
      P2: any,
      r: number,
      label?: string,
      labelOffset = 14
    ) {
      const a1 = angle(P1, V)
      const a2 = angle(P2, V)

      let start = a1
      let end = a2
      let diff = end - start

      if (diff > Math.PI) end -= TAU
      if (diff < -Math.PI) start -= TAU

      ctx.beginPath()
      ctx.arc(V.x, V.y, r, start, end)
      ctx.stroke()

      const mid = (start + end) / 2
      if (label) {
        text(
          label,
          V.x + (r + labelOffset) * Math.cos(mid),
          V.y + (r + labelOffset) * Math.sin(mid)
        )
      }

      return { start, end, mid }
    }

    function tickOnArc(V: any, r: number, ang: number, len = 8) {
      const x1 = V.x + (r - len / 2) * Math.cos(ang)
      const y1 = V.y + (r - len / 2) * Math.sin(ang)
      const x2 = V.x + (r + len / 2) * Math.cos(ang)
      const y2 = V.y + (r + len / 2) * Math.sin(ang)
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }

    /* ======================
       ESTILO
    ====================== */
    ctx.strokeStyle = '#000'
    ctx.fillStyle = '#000'

    /* ======================
       PUNTOS (layout estable)
    ====================== */
    const baseY = 215
    const A = P(cssW / 2 - 10, baseY)
    const D = P(A.x - 250, baseY)
    const E = P(A.x + 260, baseY)

    const B = P(A.x - 150, 110)
    const C = P(A.x + 210, 110) // para que BC sea horizontal

    // dirección para extender BD más allá de B (hacia arriba-derecha)
    const vBD = { x: B.x - D.x, y: B.y - D.y }
    const k = 1.1
    const Bext = P(B.x + k * vBD.x, B.y + k * vBD.y)

    /* ======================
       DIBUJO BASE
    ====================== */
    line(D, E) // recta horizontal por A
    line(D, B) // BD
    line(A, B) // AB
    line(B, C) // BC
    line(A, C) // AC
    line(B, Bext, 3) // extensión de BD (fina)

    ;[A, B, C].forEach(p => dot(p))
    dot(D, 4)

    ctx.lineWidth = 2

    // φ en A (ángulo interno entre AD y AB)
    drawAngleArc(A, D, B, 22, 'φ')

    // β en B (ángulo interno entre BD y BA)
    drawAngleArc(B, D, A, 22, 'β')

    // x en C (ángulo entre CA y CB)
    drawAngleArc(C, A, B, 20, 'x')

    // ===== Marcas de bisectriz exterior (referencial) =====
    // En A: AC biseca el ángulo exterior entre AB y AE
    ctx.lineWidth = 2
    const arcA1 = drawAngleArc(A, B, C, 30) // AB -> AC
    const arcA2 = drawAngleArc(A, C, E, 30) // AC -> AE
    tickOnArc(A, 30, arcA1.mid, 8)
    tickOnArc(A, 30, arcA2.mid, 8)

    // En B: BC biseca el ángulo exterior entre BD (ext) y BA
    const arcB1 = drawAngleArc(B, Bext, C, 26) // BDext -> BC
    const arcB2 = drawAngleArc(B, C, A, 26) // BC -> BA
    tickOnArc(B, 26, arcB1.mid, 8)
    tickOnArc(B, 26, arcB2.mid, 8)

    // Texto de condición
    ctx.lineWidth = 1
    text(`φ + β = ${sum}°`, cssW / 2, 30, 16, 'center')
  }, [sum])

  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-sm font-semibold mb-2">Figura (referencial)</div>
      <canvas ref={canvasRef} className="w-full rounded-lg" />
    </div>
  )
}

/* =========================
   Generador
   Si S = φ + β, en ΔABD: ∠D = 180 - S
   Propiedad bisectrices exteriores: x = 90 - ∠D/2
   => x = 90 - (180 - S)/2 = S/2
========================= */
function generateExercise() {
  const sums = [100, 120, 140, 160] // para que x sea 50, 60, 70, 80
  const sum = choice(sums)
  const answer = sum / 2

  const candidates:any = new Set<number>([answer, answer - 10, answer + 10, answer - 20])
  for (const v of [...candidates]) if (!(v > 0 && v < 180)) candidates.delete(v)
  while (candidates.size < 4) candidates.add(answer + choice([-30, 30, -40, 40]))

  const values = shuffle(Array.from(candidates)).slice(0, 4)
  const labels: Option['label'][] = ['A', 'B', 'C', 'D']
  const options: any = values.map((v, i) => ({
    label: labels[i],
    value: v,
    correct: v === answer,
  }))

  const questionLatex = `\\text{Calcular } x \\text{ si } \\phi + \\beta = ${sum}^{\\circ}.`

  return { sum, answer, options, questionLatex }
}

/* =========================
   COMPONENT
========================= */
export default function Prisma29({ temaPeriodoId }: { temaPeriodoId: string }) {
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
      exerciseKey: 'Prisma29',
      prompt: 'Calcular x.',
      questionLatex: ex.questionLatex,
      options: ex.options.map((o:any) => `${o.label}. ${o.value}°`),
      correctAnswer: `${ex.answer}°`,
      userAnswer: `${op.value}°`,
      isCorrect: op.correct,
      extra: { sum: ex.sum },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  const s0 = `\\text{Dato: } \\phi+\\beta=${ex.sum}^{\\circ}`
  const s1 = `\\triangle ABD:\\ \\angle BDA = 180^{\\circ}-(\\phi+\\beta)=180^{\\circ}-${ex.sum}^{\\circ}=${180 - ex.sum}^{\\circ}`
  const s2 = `\\text{(Bisectrices exteriores)}:\\ x=\\angle ACB=90^{\\circ}-\\dfrac{\\angle BDA}{2}`
  const s3 = `x=90^{\\circ}-\\dfrac{${180 - ex.sum}^{\\circ}}{2}=90^{\\circ}-${(180 - ex.sum) / 2}^{\\circ}=${ex.answer}^{\\circ}`
  const s4 = `\\Rightarrow\\ x=\\dfrac{\\phi+\\beta}{2}=\\dfrac{${ex.sum}^{\\circ}}{2}=${ex.answer}^{\\circ}`

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 29 — Bisectrices exteriores (φ + β)"
        prompt={
          <div className="space-y-3">
            <div className="text-sm">
              En la figura, <span className="font-semibold">AC</span> y{' '}
              <span className="font-semibold">BC</span> son bisectrices exteriores.
              Calcula <span className="font-semibold">x</span> si{' '}
              <span className="font-semibold">φ + β = {ex.sum}°</span>.
            </div>

            <Diagram sum={ex.sum} />

            <div className="text-lg">
              <Tex latex={`\\text{Calcular } x \\text{ si } \\phi+\\beta=${ex.sum}^{\\circ}.`} display />
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
                <div className="font-semibold mb-2">✅ Paso 1 — Hallar el ángulo en D</div>
                <div className="space-y-2">
                  <Tex latex={s0} display />
                  <Tex latex={s1} display />
                </div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 2 — Propiedad de bisectrices exteriores</div>
                <div className="space-y-2">
                  <Tex latex={s2} display />
                  <Tex latex={s3} display />
                </div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 3 — Regla rápida</div>
                <Tex latex={s4} display />

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm font-semibold">Respuesta:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">
                    {ex.answer}°
                  </span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                En este tipo de ejercicio siempre sale{' '}
                <span className="font-mono">x = (φ+β)/2</span>.
              </div>
            </div>
          </SolutionBox>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          {ex.options.map((op:any) => {
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
