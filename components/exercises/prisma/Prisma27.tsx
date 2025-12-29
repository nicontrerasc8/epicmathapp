'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'
import JXG from 'jsxgraph'
// ✅ Importa el CSS de JSXGraph UNA VEZ de forma global (recomendado):
// en app/globals.css:  @import "jsxgraph/distrib/jsxgraph.css";
// o en pages/_app.tsx: import "jsxgraph/distrib/jsxgraph.css";

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 27 — Geometría (Alturas) — hallar x + y
   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ Dinámico: α cambia y SIEMPRE x + y = α
   ✅ Diagrama en JSXGraph (alturas + ángulos x, y, α)
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
   DIAGRAMA (JSXGraph)
   - Triángulo ABC con ∠A = α
   - BF ⟂ AC (altura desde B)
   - CD ⟂ AB (altura desde C)
   - O = intersección de alturas
   - x en B entre BF y BC
   - y en C entre BC y CD
============================================================ */
function Diagram({ alpha }: { alpha: number }) {
  const boardRef = useRef<any>(null)
  const boardId = useMemo(
    () => `jxg-${Math.random().toString(36).slice(2)}`,
    []
  )

  useEffect(() => {
    const el = document.getElementById(boardId)
    if (!el) return

    // Limpieza segura
    try {
      if (boardRef.current) JXG.JSXGraph.freeBoard(boardRef.current)
    } catch {}
    el.innerHTML = ''

    const board = JXG.JSXGraph.initBoard(boardId, {
      boundingbox: [-1, 6, 9, -1],
      keepaspectratio: true,
      axis: false,
      showNavigation: false,
      showCopyright: false,
    })
    boardRef.current = board

    /* ======================
       Helpers
    ====================== */
    const rad = (alpha * Math.PI) / 180

    function unit(dx: number, dy: number) {
      const m = Math.hypot(dx, dy) || 1e-9
      return [dx / m, dy / m] as const
    }

    function bisectorPoint(V: any, P1: any, P2: any, k: number) {
      const [u1x, u1y] = unit(P1.X() - V.X(), P1.Y() - V.Y())
      const [u2x, u2y] = unit(P2.X() - V.X(), P2.Y() - V.Y())
      const sx = u1x + u2x
      const sy = u1y + u2y
      const m = Math.hypot(sx, sy) || 1e-9
      return [V.X() + (sx / m) * k, V.Y() + (sy / m) * k] as const
    }

    /* ======================
       Estilos
    ====================== */
    const pt = {
      size: 3,
      face: 'o',
      strokeColor: '#000',
      fillColor: '#000',
      fixed: true,
      highlight: false,
    } as any

    const seg = { strokeWidth: 3, strokeColor: '#000', highlight: false } as any
    const alt = { strokeWidth: 2, dash: 2, strokeColor: '#000' } as any

    const ang = {
      strokeWidth: 2.6,
      strokeColor: '#000',
      fillOpacity: 0,
      fixed: true,
      highlight: false,
      withLabel: false,
    } as any

    const txt = {
      fontSize: 18,
      fontWeight: '700',
      anchorX: 'middle',
      anchorY: 'middle',
      fixed: true,
    } as any

    /* ======================
       Puntos base
    ====================== */
    const A = board.create('point', [0, 0], {
      ...pt,
      name: 'A',
      label: { offset: [-14, -18] },
    })

    const C = board.create('point', [8, 0], {
      ...pt,
      name: 'C',
      label: { offset: [14, -18] },
    })

    const L = 5.2
    const B = board.create(
      'point',
      [L * Math.cos(rad), L * Math.sin(rad)],
      {
        ...pt,
        name: 'B',
        label: { offset: [0, 16] },
      }
    )

    /* ======================
       Lados
    ====================== */
    board.create('segment', [A, B], seg)
    board.create('segment', [B, C], seg)
    board.create('segment', [A, C], seg)

    const lAB = board.create('line', [A, B], { visible: false })
    const lAC = board.create('line', [A, C], { visible: false })

    /* ======================
       Alturas
    ====================== */
    const altB = board.create('perpendicular', [lAC, B], { visible: false })
    const F = board.create('intersection', [altB, lAC], {
      ...pt,
      name: 'F',
      size: 2,
      label: { offset: [0, -22] },
    })
    board.create('segment', [B, F], alt)

    const altC = board.create('perpendicular', [lAB, C], { visible: false })
    const D = board.create('intersection', [altC, lAB], {
      ...pt,
      name: 'D',
      size: 2,
      label: { offset: [-14, 10] },
    })
    board.create('segment', [C, D], alt)

    /* ======================
       Ortocentro (opcional)
    ====================== */
    board.create('intersection', [altB, altC], {
      size: 2,
      withLabel: false,
      fixed: true,
    })

    /* ======================
       Ángulos (orden CORRECTO)
    ====================== */
    // α en A (🔥 este orden evita que salga al revés)
    board.create('angle', [C, A, B], { ...ang, radius: 1.5 })

    // x en B
    board.create('angle', [F, B, C], { ...ang, radius:1.5 })

    // y en C
    board.create('angle', [B, C, D], { ...ang, radius: 1.5 })

    /* ======================
       Labels grandes y claros
    ====================== */
    board.create('text', [
      () => bisectorPoint(A, C, B, 0.95)[0],
      () => bisectorPoint(A, C, B, 0.95)[1],
      () => `${alpha}°`,
    ], txt)

    board.create('text', [
      () => bisectorPoint(B, C, F, 0.78)[0],
      () => bisectorPoint(B, C, F, 0.78)[1],
      () => 'x',
    ], txt)

    board.create('text', [
      () => bisectorPoint(C, D, B, 0.78)[0],
      () => bisectorPoint(C, D, B, 0.78)[1],
      () => 'y',
    ], txt)

    return () => {
      try {
        JXG.JSXGraph.freeBoard(board)
      } catch {}
    }
  }, [alpha, boardId])

  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-sm font-semibold mb-2">Figura (referencial)</div>
      <div id={boardId} className="w-full h-[320px] rounded-lg" />
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
        onVerify={() => {}}
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
