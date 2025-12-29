'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 30 — Hallar x (Incentro + Cuadrilátero cíclico)
   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ Mismo enunciado/idea del PDF (respuesta x = 60°)
   ✅ Diagrama en CANVAS (bisectrices + ángulos rectos)
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
   DIAGRAMA (Canvas)
   - Triángulo ABC
   - D = incentro (intersección bisectrices desde B y C)
   - En E: EF ⟂ BD (recto)
   - En G: GF ⟂ CD (recto)
   => DEFG cíclico (∠E = ∠G = 90°)
============================================================ */
function Diagram() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const cssW = rect.width > 0 ? rect.width : 560
    const cssH = 280
    const dpr = window.devicePixelRatio || 1

    canvas.width = Math.floor(cssW * dpr)
    canvas.height = Math.floor(cssH * dpr)
    canvas.style.width = '100%'
    canvas.style.height = `${cssH}px`

    const ctx:any = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)

    /* ======================
       HELPERS
    ====================== */
    const TAU = Math.PI * 2

    const P = (x: number, y: number) => ({ x, y })
    const sub = (a: any, b: any) => ({ x: a.x - b.x, y: a.y - b.y })
    const add = (a: any, b: any) => ({ x: a.x + b.x, y: a.y + b.y })
    const mul = (v: any, k: number) => ({ x: v.x * k, y: v.y * k })
    const len = (v: any) => Math.hypot(v.x, v.y)
    const unit = (v: any) => {
      const L = len(v) || 1
      return { x: v.x / L, y: v.y / L }
    }
    const dist = (a: any, b: any) => len(sub(a, b))
    const perp = (v: any) => ({ x: -v.y, y: v.x })
    const angle = (p: any, q: any) => Math.atan2(p.y - q.y, p.x - q.x)

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

    function text(
      t: string,
      x: number,
      y: number,
      size = 14,
      align: CanvasTextAlign = 'center'
    ) {
      ctx.font = `${size}px ui-sans-serif, system-ui`
      ctx.textAlign = align
      ctx.textBaseline = 'middle'
      ctx.fillText(t, x, y)
    }

    function drawAngleArc(V: any, P1: any, P2: any, r: number, label: string) {
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
      text(label, V.x + (r + 14) * Math.cos(mid), V.y + (r + 14) * Math.sin(mid), 14)
    }

    function rightAngleMark(V: any, P1: any, P2: any, s = 12) {
      const u1 = unit(sub(P1, V))
      const u2 = unit(sub(P2, V))
      const A = add(V, mul(u1, s))
      const C = add(V, mul(u2, s))
      const B = add(A, mul(u2, s))

      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(A.x, A.y)
      ctx.lineTo(B.x, B.y)
      ctx.lineTo(C.x, C.y)
      ctx.stroke()
    }

    function incenter(A: any, B: any, C: any) {
      const a = dist(B, C) // opuesto a A
      const b = dist(A, C) // opuesto a B
      const c = dist(A, B) // opuesto a C
      const s = a + b + c || 1
      return P(
        (a * A.x + b * B.x + c * C.x) / s,
        (a * A.y + b * B.y + c * C.y) / s
      )
    }

    function intersectLines(P1: any, v1: any, P2: any, v2: any) {
      // P1 + t v1 = P2 + u v2
      const cross = (a: any, b: any) => a.x * b.y - a.y * b.x
      const denom = cross(v1, v2)
      if (Math.abs(denom) < 1e-6) return null
      const t = cross(sub(P2, P1), v2) / denom
      return add(P1, mul(v1, t))
    }

    /* ======================
       ESTILO
    ====================== */
    ctx.strokeStyle = '#000'
    ctx.fillStyle = '#000'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    /* ======================
       PUNTOS BASE (diseño similar al PDF)
       - Base AC horizontal
       - B centrado para que BD salga casi vertical
    ====================== */
    const baseY = cssH - 38
    const A = P(cssW * 0.12, baseY)
    const C = P(cssW * 0.88, baseY)
    const midX = (A.x + C.x) / 2
    const B = P(midX, 48)

    // incentro
    const D = incenter(A, B, C)

    // direcciones bisectrices hacia B y hacia C
    const uBD = unit(sub(B, D))
    const uCD = unit(sub(C, D))

    // puntos E (sobre BD) y G (sobre DC)
    const tE = Math.min(70, dist(D, B) * 0.45)
    const tG = Math.min(110, dist(D, C) * 0.55)

    const E = add(D, mul(uBD, tE))
    const G = add(D, mul(uCD, tG))

    // EF ⟂ BD  => horizontal (porque BD ~ vertical). Lo hacemos con perpendicular real.
    let vEF = perp(uBD)
    if (vEF.x < 0) vEF = mul(vEF, -1)

    // GF ⟂ DC
    let vGF = perp(uCD)
    // probamos ambas orientaciones para que cruce con EF hacia “arriba-derecha”
    const cand1 = intersectLines(E, vEF, G, vGF)
    const cand2 = intersectLines(E, vEF, G, mul(vGF, -1))
    let F = cand1

    if (cand1 && cand2) {
      const score = (p: any) => (p.x - D.x) * 2 + (D.y - p.y) // derecha + arriba
      F = score(cand2) > score(cand1) ? cand2 : cand1
    } else if (!cand1 && cand2) {
      F = cand2
    }

    // fallback por si algo raro
    if (!F) F = P(cssW * 0.78, cssH * 0.32)

    /* ======================
       DIBUJO
    ====================== */
    // Triángulo
    line(A, C, 4)
    line(A, B, 4)
    line(B, C, 4)

    // Bisectrices (referencial)
    ctx.lineWidth = 3
    line(B, D, 3)
    line(C, D, 3)

    // Cuadrilátero DEFG
    ctx.lineWidth = 4
    line(D, E, 4)
    line(E, F, 4)
    line(F, G, 4)
    line(G, D, 4)

    // Marcas de 90°
    rightAngleMark(E, D, F, 12)
    rightAngleMark(G, D, F, 12)

    // Puntos
    ;[A, B, C, D, E, F, G].forEach(p => dot(p, 4))

    // Etiquetas de puntos
    text('A', A.x - 14, A.y + 10, 14, 'center')
    text('B', B.x, B.y - 14, 14, 'center')
    text('C', C.x + 14, C.y + 10, 14, 'center')
    text('D', D.x - 12, D.y + 12, 14, 'center')
    text('E', E.x - 12, E.y + 12, 14, 'center')
    text('F', F.x + 12, F.y - 10, 14, 'center')
    text('G', G.x - 12, G.y + 12, 14, 'center')

    // Arcos de ángulo: α en A, 2α en D, x en F
    ctx.lineWidth = 2.5
    drawAngleArc(A, B, C, 22, 'α')
    drawAngleArc(D, B, C, 20, '2α')
    drawAngleArc(F, E, G, 20, 'x')
  }, [])

  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-sm font-semibold mb-2">Figura (referencial)</div>
      <canvas ref={canvasRef} className="w-full rounded-lg" />
    </div>
  )
}

/* =========================
   Generador (fijo como Prisma 30)
========================= */
function generateExercise() {
  const answer = 60
  const values = shuffle([40, 50, 60, 80])
  const labels: Option['label'][] = ['A', 'B', 'C', 'D']
  const options: Option[] = values.map((v, i) => ({
    label: labels[i],
    value: v,
    correct: v === answer,
  }))

  const questionLatex =
    `\\text{En la figura, } BD \\text{ y } CD \\text{ son bisectrices internas, }` +
    `\\angle A = \\alpha \\text{ y } \\angle BDC = 2\\alpha.\\ ` +
    `\\text{Halle } x.`

  return { answer, options, questionLatex }
}

/* =========================
   COMPONENT
========================= */
export default function Prisma30({ temaPeriodoId }: { temaPeriodoId: string }) {
  const engine = useExerciseEngine({ maxAttempts: 1 })
  const [selected, setSelected] = useState<number | null>(null)
  const [nonce, setNonce] = useState(0)

  const ex = useMemo(() => generateExercise(), [nonce])

  function pickOption(op: Option) {
    if (!engine.canAnswer) return
    setSelected(op.value)
    engine.submit(op.correct)

    persistExerciseOnce({
      temaPeriodoId,
      exerciseKey: 'Prisma30',
      prompt: 'Hallar x (incentro + cuadrilátero cíclico).',
      questionLatex: ex.questionLatex,
      options: ex.options.map(o => `${o.label}. ${o.value}°`),
      correctAnswer: `${ex.answer}`,
      userAnswer: `${op.value}`,
      isCorrect: op.correct,
      extra: { answer: ex.answer },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  // Solución (igual a tu imagen)
  const s1 = `\\text{Como } BD \\text{ y } CD \\text{ son bisectrices, } D \\text{ es el incentro.}`
  const s2 = `\\angle BDC = 90^{\\circ} + \\dfrac{\\angle A}{2} = 90^{\\circ} + \\dfrac{\\alpha}{2}`
  const s3 = `2\\alpha = 90^{\\circ} + \\dfrac{\\alpha}{2}`
  const s4 = `2\\alpha - \\dfrac{\\alpha}{2} = 90^{\\circ}\\Rightarrow \\dfrac{3\\alpha}{2}=90^{\\circ}\\Rightarrow \\alpha=60^{\\circ}`
  const s5 = `\\angle DEF=90^{\\circ}\\ \\text{y}\\ \\angle DGF=90^{\\circ}\\Rightarrow DEFG\\ \\text{es c\\'iclico.}`
  const s6 = `\\text{En un cuadril\\'atero c\\'iclico:}\\ \\angle EDG + \\angle EFG = 180^{\\circ}`
  const s7 = `2\\alpha + x = 180^{\\circ}`
  const s8 = `2(60^{\\circ}) + x = 180^{\\circ}\\Rightarrow 120^{\\circ}+x=180^{\\circ}\\Rightarrow x=60^{\\circ}`

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 30 — Hallar x"
        prompt={
          <div className="space-y-3">
            <div className="text-sm">
              En la figura, <span className="font-semibold">BD</span> y{' '}
              <span className="font-semibold">CD</span> son bisectrices internas. Si{' '}
              <span className="font-semibold">∠A = α</span> y{' '}
              <span className="font-semibold">∠BDC = 2α</span>, halla{' '}
              <span className="font-semibold">x</span>.
            </div>

            <Diagram />

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
                <div className="font-semibold mb-2">✅ Paso 1 — Propiedad del incentro</div>
                <div className="space-y-2">
                  <Tex latex={s1} display />
                  <Tex latex={s2} display />
                  <Tex latex={s3} display />
                  <Tex latex={s4} display />
                </div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 2 — Cuadrilátero cíclico</div>
                <div className="space-y-2">
                  <Tex latex={s5} display />
                  <Tex latex={s6} display />
                  <Tex latex={s7} display />
                  <Tex latex={s8} display />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm font-semibold">Respuesta:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">
                    {ex.answer}°
                  </span>
                </div>
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
