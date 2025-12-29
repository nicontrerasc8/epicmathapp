'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 26 — Bisectrices (Incentro)
   Enunciado tipo PDF:
     Calcular x, si m∠ADC = 2x.
   D es el incentro (intersección de bisectrices en A y C).

   Propiedad clave:
     ∠AIC = 90° + (∠B)/2

   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ Diagrama SVG claro con arcos en A, C, B y ángulo 2x en D
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

/* =========================
   SVG Diagrama (Prisma-style)
========================= */
function Diagram() {
  const W = 520
  const H = 260

  const A = { x: 90, y: 220 }
  const C = { x: 430, y: 220 }
  const B = { x: 260, y: 70 }
  const D = { x: 270, y: 150 } // "incentro" referencial

  function angle(p: any, q: any) {
    return Math.atan2(p.y - q.y, p.x - q.x)
  }
  function norm(a: number) {
    while (a <= -Math.PI) a += 2 * Math.PI
    while (a > Math.PI) a -= 2 * Math.PI
    return a
  }
  function arcPath(cx: number, cy: number, r: number, a1: number, a2: number) {
    a1 = norm(a1)
    a2 = norm(a2)
    let d = norm(a2 - a1)
    // arco corto
    const end = a1 + d
    const x1 = cx + r * Math.cos(a1)
    const y1 = cy + r * Math.sin(a1)
    const x2 = cx + r * Math.cos(end)
    const y2 = cy + r * Math.sin(end)
    const sweep = d >= 0 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 0 ${sweep} ${x2} ${y2}`
  }
  function midAngle(a1: number, a2: number) {
    a1 = norm(a1)
    a2 = norm(a2)
    let d = norm(a2 - a1)
    return norm(a1 + d / 2)
  }

  // Ángulo en B (entre BA y BC)
  const aBA = angle(A, B)
  const aBC = angle(C, B)
  const mB = midAngle(aBA, aBC)

  // Ángulo en D (entre DA y DC)
  const aDA = angle(A, D)
  const aDC = angle(C, D)
  const mD = midAngle(aDA, aDC)

  // “Marcas” de bisectriz en A (entre AB y AC)
  const aAB = angle(B, A)
  const aAC = angle(C, A)
  const mA = midAngle(aAB, aAC)

  // “Marcas” de bisectriz en C (entre CB y CA)
  const aCB = angle(B, C)
  const aCA = angle(A, C)
  const mC = midAngle(aCB, aCA)

  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-sm font-semibold mb-2">Figura (referencial)</div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* TRIÁNGULO ABC */}
        <line x1={A.x} y1={A.y} x2={C.x} y2={C.y} stroke="black" strokeWidth="3" />
        <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="black" strokeWidth="3" />
        <line x1={B.x} y1={B.y} x2={C.x} y2={C.y} stroke="black" strokeWidth="3" />

        {/* BISECTRICES (AD y CD) */}
        <line x1={A.x} y1={A.y} x2={D.x} y2={D.y} stroke="black" strokeWidth="3" />
        <line x1={C.x} y1={C.y} x2={D.x} y2={D.y} stroke="black" strokeWidth="3" />

        {/* PUNTOS */}
        {[A, B, C, D].map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="5" fill="black" />
        ))}

        {/* LETRAS */}
        <text x={A.x - 16} y={A.y + 18} fontSize="15">
          A
        </text>
        <text x={B.x - 6} y={B.y - 12} fontSize="15">
          B
        </text>
        <text x={C.x + 8} y={C.y + 18} fontSize="15">
          C
        </text>
        <text x={D.x + 8} y={D.y + 4} fontSize="15">
          D
        </text>

        {/* Ángulo x en B */}
        <path d={arcPath(B.x, B.y, 24, aBA, aBC)} stroke="black" strokeWidth="2" fill="none" />
        <text
          x={B.x + 34 * Math.cos(mB)}
          y={B.y + 34 * Math.sin(mB)}
          fontSize="16"
          textAnchor="middle"
        >
          x
        </text>

        {/* Ángulo 2x en D */}
        <path d={arcPath(D.x, D.y, 22, aDA, aDC)} stroke="black" strokeWidth="2" fill="none" />
        <text
          x={D.x + 34 * Math.cos(mD)}
          y={D.y + 34 * Math.sin(mD)}
          fontSize="16"
          textAnchor="middle"
        >
          2x
        </text>

        {/* Marcas de bisectriz en A (dos arcos chiquitos) */}
        <path d={arcPath(A.x, A.y, 18, aAB, mA)} stroke="black" strokeWidth="2" fill="none" />
        <path d={arcPath(A.x, A.y, 22, mA, aAC)} stroke="black" strokeWidth="2" fill="none" />

        {/* Marcas de bisectriz en C (dos arcos chiquitos) */}
        <path d={arcPath(C.x, C.y, 18, aCA, mC)} stroke="black" strokeWidth="2" fill="none" />
        <path d={arcPath(C.x, C.y, 22, mC, aCB)} stroke="black" strokeWidth="2" fill="none" />
      </svg>

      <div className="mt-2 text-xs text-muted-foreground">
        Las marcas en <span className="font-mono">A</span> y <span className="font-mono">C</span> indican bisectrices (D es el incentro).
      </div>
    </div>
  )
}

/* =========================
   Generador (mismo Prisma)
========================= */
function generateExercise() {
  const x = 60
  const options: Option[] = shuffle([
    { label: 'A', value: 15, correct: false },
    { label: 'B', value: 20, correct: false },
    { label: 'C', value: 30, correct: false },
    { label: 'D', value: 60, correct: true },
  ])

  const questionLatex = `\\text{Calcular } x,\\ \\text{si } m\\angle ADC = 2x.`
  return { x, options, questionLatex }
}

/* =========================
   COMPONENT
========================= */
export default function Prisma26({ temaPeriodoId }: { temaPeriodoId: string }) {
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
      exerciseKey: 'Prisma26',
      prompt: 'Calcular x, si m∠ADC = 2x.',
      questionLatex: ex.questionLatex,
      options: ex.options.map(o => `${o.label}. ${o.value}°`),
      correctAnswer: `${ex.x}`,
      userAnswer: `${op.value}`,
      isCorrect: op.correct,
      extra: { x: ex.x },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  // Solución (tipo PDF)
  const s1 = `\\text{Como } AD \\text{ y } CD \\text{ son bisectrices, } D \\text{ es el incentro.}`
  const s2 = `\\angle ADC = 90^{\\circ} + \\frac{\\angle B}{2}`
  const s3 = `90^{\\circ} + \\frac{x}{2} = 2x`
  const s4 = `90^{\\circ} = 2x - \\frac{x}{2} = \\frac{3x}{2}`
  const s5 = `x = 60^{\\circ}`

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 26 — Bisectrices (incentro)"
        prompt={
          <div className="space-y-3">
            <div className="text-sm">
              Calcula <span className="font-semibold">x</span>, si{' '}
              <span className="font-semibold">m∠ADC = 2x</span>.
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
                <div className="font-semibold mb-2">✅ Propiedad del incentro</div>
                <div className="space-y-2">
                  <Tex latex={s1} display />
                  <Tex latex={s2} display />
                </div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Planteo con el dato</div>
                <div className="space-y-2">
                  <Tex latex={s3} display />
                  <Tex latex={s4} display />
                  <Tex latex={s5} display />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm font-semibold">Respuesta:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">
                    {ex.x}°
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
