'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 24 — Suma de ángulos (x + y + z + w)
   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ Dinámico: φ puede variar, y la suma siempre es 180 + φ
   ✅ Diagrama en CANVAS (arco de φ siempre arriba)
   ✅ Persist con firma: (exerciseId, temaId, classroomId, sessionId)
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

/* ============================================================
   DIAGRAMA (Canvas)
============================================================ */
function Diagram({ phi }: { phi: number }) {
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

    const ctx: any = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)

    /* ======================
       HELPERS
    ====================== */
    const TAU = Math.PI * 2
    const deg2rad = (d: number) => (d * Math.PI) / 180

    function P(x: number, y: number) {
      return { x, y }
    }

    function line(p1: any, p2: any, w = 4) {
      ctx.lineWidth = w
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()
    }

    function dot(p: any, r = 5) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, TAU)
      ctx.fill()
    }

    function angle(p: any, q: any) {
      return Math.atan2(p.y - q.y, p.x - q.x)
    }

    function text(
      t: string,
      x: number,
      y: number,
      size = 16,
      align: CanvasTextAlign = 'center'
    ) {
      ctx.font = `${size}px ui-sans-serif, system-ui`
      ctx.textAlign = align
      ctx.fillText(t, x, y)
    }

    function drawAngle(
      V: any,
      P1: any,
      P2: any,
      r: number,
      label: string
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
      text(
        label,
        V.x + (r + 14) * Math.cos(mid),
        V.y + (r + 14) * Math.sin(mid)
      )
    }

    function drawArcUpper(cx: number, cy: number, r: number, a1: number, a2: number) {
      const mod = (v: number) => ((v % TAU) + TAU) % TAU
      const sweepPos = mod(a2 - a1)
      const sweepNeg = sweepPos - TAU

      const midPos = a1 + sweepPos / 2
      const midNeg = a1 + sweepNeg / 2

      const sweep = Math.sin(midPos) < Math.sin(midNeg) ? sweepPos : sweepNeg

      ctx.beginPath()
      const steps = 60
      for (let i = 0; i <= steps; i++) {
        const ang = a1 + (sweep * i) / steps
        const x = cx + r * Math.cos(ang)
        const y = cy + r * Math.sin(ang)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      return a1 + sweep / 2
    }

    /* ======================
       ESTILO
    ====================== */
    ctx.strokeStyle = '#000'
    ctx.fillStyle = '#000'

    /* ======================
       CONSTRUCCIÓN GEOMÉTRICA
    ====================== */
    const baseY = 220
    const G = P(cssW / 2, 140)

    const phiRad = deg2rad(phi)

    const thetaL = -Math.PI / 2 - phiRad / 2
    const thetaR = -Math.PI / 2 + phiRad / 2

    const Ltop = 120
    const B = P(G.x + Ltop * Math.cos(thetaL), G.y + Ltop * Math.sin(thetaL))
    const D = P(G.x + Ltop * Math.cos(thetaR), G.y + Ltop * Math.sin(thetaR))

    const tC = (baseY - G.y) / Math.sin(thetaL + Math.PI)
    const C = P(G.x + tC * Math.cos(thetaL + Math.PI), baseY)

    const tF = (baseY - G.y) / Math.sin(thetaR + Math.PI)
    const F = P(G.x + tF * Math.cos(thetaR + Math.PI), baseY)

    const margin = 70
    const minX = Math.min(C.x, F.x)
    const maxX = Math.max(C.x, F.x)

    const A = P(minX - margin, baseY)
    const E = P(maxX + margin, baseY)

    /* ======================
       DIBUJO
    ====================== */
    line(A, E)

    line(A, B)
    line(B, C)

    line(F, D)
    line(D, E)

    line(B, C)
    line(D, F)

      ;[A, B, C, D, E, F, G].forEach(p => dot(p))

    ctx.lineWidth = 2

    // x está bien (ángulo interior en la base izquierda)
    drawAngle(A, B, E, 20, 'x')

    // 🔁 y debe invertirse (se quiere el ángulo exterior)
    drawAngle(B, C, A, 20, 'y')

    // 🔁 z también es exterior
    drawAngle(D, E, F, 20, 'z')

    // 🔁 w es exterior en la base derecha
    drawAngle(E, A, D, 20, 'w')


    // Ángulo central φ
    const aGB = angle(B, G)
    const aGD = angle(D, G)
    ctx.lineWidth = 3
    const mid = drawArcUpper(G.x, G.y, 34, aGB, aGD)
    text(`${phi}°`, G.x, G.y - 52)

  }, [phi])

  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-sm font-semibold mb-2">Figura (referencial)</div>
      <canvas ref={canvasRef} className="w-full rounded-lg" />
    </div>
  )
}

/* =========================
   Generador
   (x+y) + (z+w) + (180-phi) = 360
   => x+y+z+w = 180 + phi
========================= */
function generateExercise() {
  const phis = [110, 120, 130, 140]

  for (let tries = 0; tries < 250; tries++) {
    const phi = choice(phis)
    const answer = 180 + phi

    const d1 = 360 - phi
    const d2 = phi + 60
    const d3 = 2 * phi

    const set = new Set<number>()
    set.add(answer)
    ;[d1, d2, d3].forEach(v => {
      if (Number.isFinite(v) && v > 0) set.add(v)
    })
    while (set.size < 4) set.add(answer + choice([-50, -30, 30, 50]))

    const values = shuffle(Array.from(set)).slice(0, 4)
    const labels: Option['label'][] = ['A', 'B', 'C', 'D']
    const options: Option[] = values.map((v, i) => ({
      label: labels[i],
      value: v,
      correct: v === answer,
    }))

    const questionLatex =
      `\\text{En la figura, las rectas se cruzan formando } ${phi}^{\\circ}.\\ ` +
      `\\text{Halle } x+y+z+w.`

    return { phi, answer, options, questionLatex }
  }

  // fallback
  const phi = 120
  const answer = 300
  const options: Option[] = shuffle([
    { label: 'A', value: 150, correct: false },
    { label: 'B', value: 200, correct: false },
    { label: 'C', value: 250, correct: false },
    { label: 'D', value: 300, correct: true },
  ])
  const questionLatex = `\\text{Calcular } x+y+z+w \\text{ si el ángulo central es } 120^{\\circ}.`
  return { phi, answer, options, questionLatex }
}

/* =========================
   COMPONENT
========================= */
export default function Prisma24({
  exerciseId,
  temaId,
  classroomId,
  sessionId,
}: {
  exerciseId: string
  temaId: string
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
      exerciseId, // 'Prisma24'
      temaId,
      classroomId,
      sessionId,

      correct: op.correct,
      answer: {
        selected: String(op.value),
        correctAnswer: String(ex.answer),
        latex: ex.questionLatex,
        options: ex.options.map(o => `${o.label}. ${o.value}°`),
        extra: { phi: ex.phi },
      },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  const phiSmall = 180 - ex.phi

  const s1 = `\\triangle ABC:\\ \\angle \\text{exterior} = x+y`
  const s2 = `\\triangle DEF:\\ \\angle \\text{exterior} = z+w`
  const s3 = `\\text{El otro ángulo del cruce es } 180-${ex.phi}=${phiSmall}^{\\circ}.`
  const s4 = `(x+y) + (z+w) + ${phiSmall}^{\\circ} = 360^{\\circ}`
  const s5 = `x+y+z+w = 360-${phiSmall} = 180+${ex.phi} = ${ex.answer}^{\\circ}`

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 24 — Suma x + y + z + w"
        prompt={
          <div className="space-y-3">
            <div className="text-sm">
              En la figura, las rectas se cruzan formando un ángulo de{' '}
              <span className="font-semibold">{ex.phi}°</span>. Calcula{' '}
              <span className="font-semibold">x + y + z + w</span>.
            </div>

            <Diagram phi={ex.phi} />

            <div className="text-lg">
              <Tex tex={`\\text{Halle } x+y+z+w`} block />
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
                <div className="font-semibold mb-2">✅ Paso 1 — Ángulos exteriores</div>
                <div className="space-y-2">
                  <Tex tex={s1} block />
                  <Tex tex={s2} block />
                </div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 2 — Ángulo “pequeño” del cruce</div>
                <Tex tex={s3} block />
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 3 — Suma alrededor</div>
                <div className="space-y-2">
                  <Tex tex={s4} block />
                  <Tex tex={s5} block />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm font-semibold">Respuesta:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">
                    {ex.answer}°
                  </span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Regla del patrón: <span className="font-mono">x+y+z+w = 180 + \\varphi</span>.
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
                <div className="font-mono text-lg">{op.value}°</div>
              </button>
            )
          })}
        </div>
      </ExerciseShell>
    </MathJaxContext>
  )
}
