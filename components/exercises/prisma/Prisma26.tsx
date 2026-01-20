'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 26 — Bisectrices (Incentro)
   Enunciado tipo Prisma:
     En ?ABC, AD y CD son bisectrices (D es incentro).
     Si m?B = ß y m?ADC = 2x, hallar x.

   Propiedad clave (incentro I):
     ?AIC = 90° + (?B)/2
   Aquí D cumple el rol de I, por eso:
     ?ADC = 90° + (?B)/2

   ? 1 SOLO INTENTO
   ? Dinámico (ß múltiplo de 4 para que x sea entero)
   ? Diagrama SVG claro con arcos y 2x en D
   ? Persist NUEVO:
============================================================ */

type Option = { label: 'A' | 'B' | 'C' | 'D'; value: number; correct: boolean }

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function choice<T>(arr: T[]) {
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

/* =========================
   SVG Diagrama (Prisma-style)
========================= */
function Diagram({ beta }: { beta: number }) {
  const W = 520
  const H = 260

  const A = { x: 90, y: 220 }
  const C = { x: 430, y: 220 }
  const B = { x: 260, y: 70 }
  const D = { x: 270, y: 150 } // incentro referencial

  function angle(p: any, q: any) {
    return Math.atan2(p.y - q.y, p.x - q.x)
  }

  function arcPath(cx: number, cy: number, r: number, a1: number, a2: number) {
    // arco “corto” siempre (0..pi)
    let d = a2 - a1
    while (d <= -Math.PI) d += 2 * Math.PI
    while (d > Math.PI) d -= 2 * Math.PI

    const end = a1 + d
    const x1 = cx + r * Math.cos(a1)
    const y1 = cy + r * Math.sin(a1)
    const x2 = cx + r * Math.cos(end)
    const y2 = cy + r * Math.sin(end)
    const sweep = d >= 0 ? 1 : 0

    return `M ${x1} ${y1} A ${r} ${r} 0 0 ${sweep} ${x2} ${y2}`
  }

  function midAngle(a1: number, a2: number) {
    let d = a2 - a1
    while (d <= -Math.PI) d += 2 * Math.PI
    while (d > Math.PI) d -= 2 * Math.PI
    return a1 + d / 2
  }

  // Ángulo en B (entre BA y BC)
  const aBA = angle(A, B)
  const aBC = angle(C, B)
  const mB = midAngle(aBA, aBC)

  // Ángulo en D (entre DA y DC)
  const aDA = angle(A, D)
  const aDC = angle(C, D)
  const mD = midAngle(aDA, aDC)

  // Marcas de bisectriz en A (entre AB y AC)
  const aAB = angle(B, A)
  const aAC = angle(C, A)
  const mA = midAngle(aAB, aAC)

  // Marcas de bisectriz en C (entre CA y CB)
  const aCA = angle(A, C)
  const aCB = angle(B, C)
  const mC = midAngle(aCA, aCB)

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

        {/* Ángulo ß en B */}
        <path d={arcPath(B.x, B.y, 24, aBA, aBC)} stroke="black" strokeWidth="2" fill="none" />
        <text
          x={B.x + 36 * Math.cos(mB)}
          y={B.y + 36 * Math.sin(mB)}
          fontSize="16"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {beta}°
        </text>

        {/* Ángulo 2x en D */}
        <path d={arcPath(D.x, D.y, 22, aDA, aDC)} stroke="black" strokeWidth="2" fill="none" />
        <text
          x={D.x + 36 * Math.cos(mD)}
          y={D.y + 36 * Math.sin(mD)}
          fontSize="16"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          2x
        </text>

        {/* Marcas de bisectriz en A */}
        <path d={arcPath(A.x, A.y, 18, aAB, mA)} stroke="black" strokeWidth="2" fill="none" />
        <path d={arcPath(A.x, A.y, 22, mA, aAC)} stroke="black" strokeWidth="2" fill="none" />

        {/* Marcas de bisectriz en C */}
        <path d={arcPath(C.x, C.y, 18, aCA, mC)} stroke="black" strokeWidth="2" fill="none" />
        <path d={arcPath(C.x, C.y, 22, mC, aCB)} stroke="black" strokeWidth="2" fill="none" />
      </svg>

      <div className="mt-2 text-xs text-muted-foreground">
        Las marcas en <span className="font-mono">A</span> y <span className="font-mono">C</span> indican bisectrices
        (D es el incentro).
      </div>
    </div>
  )
}

/* =========================
   Generador (dinámico)
   Elegimos ß múltiplo de 4:
     2x = 90 + ß/2  =>  x = (180 + ß)/4 = 45 + ß/4  (entero si ß múltiplo de 4)
========================= */
function generateExercise() {
  for (let tries = 0; tries < 200; tries++) {
    const beta = choice([24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80])
    const x = 45 + beta / 4 // entero por construcción

    // distractores típicos
    const d1 = 90 + beta / 2 // confunde 2x con el valor del ángulo
    const d2 = (180 + beta) / 2 // olvida dividir entre 4
    const d3 = 90 - beta / 2 // mete resta
    const pool = shuffle([x, d1, d2, d3].map(v => Math.round(v)))

    // asegurar 4 opciones distintas
    const set = new Set<number>()
    for (const v of pool) set.add(v)
    while (set.size < 4) set.add(x + choice([-6, -4, -2, 2, 4, 6]))

    const values = shuffle(Array.from(set)).slice(0, 4)
    const labels: Option['label'][] = ['A', 'B', 'C', 'D']
    const options: Option[] = values.map((v, i) => ({
      label: labels[i],
      value: v,
      correct: v === x,
    }))

    const questionLatex =
      `\\text{En }\\triangle ABC,\\ AD\\text{ y }CD\\text{ son bisectrices (}D\\text{ es incentro). }` +
      `\\text{Si }m\\angle B=${beta}^{\\circ}\\text{ y }m\\angle ADC=2x,\\ \\text{halle }x.`

    return { beta, x, options, questionLatex }
  }

  // fallback
  const beta = 60
  const x = 60
  const labels: Option['label'][] = ['A', 'B', 'C', 'D']
  const values = shuffle([60, 45, 75, 90])
  const options: Option[] = values.map((v, i) => ({ label: labels[i], value: v, correct: v === 60 }))
  const questionLatex =
    `\\text{En }\\triangle ABC,\\ AD\\text{ y }CD\\text{ son bisectrices (}D\\text{ es incentro). }` +
    `\\text{Si }m\\angle B=60^{\\circ}\\text{ y }m\\angle ADC=2x,\\ \\text{halle }x.`
  return { beta, x, options, questionLatex }
}

/* =========================
   COMPONENT
========================= */
export default function Prisma26({
  exerciseId,
  classroomId,
  sessionId,
}: {
  exerciseId: string
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
      exerciseId, // ej: 'Prisma26'
      classroomId,
      sessionId,

      correct: op.correct,

      answer: {
        selected: String(op.value),
        correctAnswer: String(ex.x),
        latex: ex.questionLatex,
        options: ex.options.map(o => String(o.value)),
        extra: {
          beta: ex.beta,
          labeledOptions: ex.options.map(o => `${o.label}. ${o.value}°`),
          property: '?ADC = 90° + ?B/2',
        },
      },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  // Solución
  const beta = ex.beta
  const s1 = `\\text{Como }AD\\text{ y }CD\\text{ son bisectrices, }D\\text{ es el incentro.}`
  const s2 = `\\angle ADC = 90^{\\circ} + \\frac{\\angle B}{2}`
  const s3 = `\\angle B = ${beta}^{\\circ}\\ \\Rightarrow\\ \\angle ADC = 90^{\\circ} + \\frac{${beta}^{\\circ}}{2}`
  const s4 = `2x = 90^{\\circ} + \\frac{${beta}^{\\circ}}{2}`
  const s5 = `x = \\frac{180^{\\circ} + ${beta}^{\\circ}}{4} = ${ex.x}^{\\circ}`

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 26 — Bisectrices (incentro)"
        prompt={
          <div className="space-y-3">
            <div className="text-sm">
              En el triángulo, <span className="font-semibold">AD</span> y <span className="font-semibold">CD</span>{' '}
              son bisectrices (D es el incentro). Si <span className="font-semibold">m?B = {ex.beta}°</span> y{' '}
              <span className="font-semibold">m?ADC = 2x</span>, halla <span className="font-semibold">x</span>.
            </div>

            <Diagram beta={ex.beta} />

            <div className="text-lg">
              <Tex block tex={`\\text{Halle } x`} />
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
                <div className="font-semibold mb-2">? Propiedad del incentro</div>
                <div className="space-y-2">
                  <Tex block tex={s1} />
                  <Tex block tex={s2} />
                </div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Usamos el dato y despejamos</div>
                <div className="space-y-2">
                  <Tex block tex={s3} />
                  <Tex block tex={s4} />
                  <Tex block tex={s5} />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm font-semibold">Respuesta:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">{ex.x}°</span>
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
                  <Tex tex={`${op.value}^{\\circ}`} />
                </div>
              </button>
            )
          })}
        </div>
      </ExerciseShell>
    </MathJaxContext>
  )
}



