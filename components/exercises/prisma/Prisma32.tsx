'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 32 — Conversión de ángulos (° , g , rad) + MathJax

   Tipo:
     A = ( ...°  + ...^g + ... rad ) / (... rad)

   ? MathJax (better-react-mathjax)
   ? 1 SOLO INTENTO (autocalifica al elegir opción)
   ? Dinámico: arma equivalencias exactas para que A sea 2..4

   ? Persist NUEVO:
============================================================ */

type Option = { label: 'A' | 'B' | 'C' | 'D'; value: number; correct: boolean }

/* =========================
   HELPERS
========================= */
function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function gcd(a: number, b: number) {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b !== 0) {
    const t = a % b
    a = b
    b = t
  }
  return a
}
function reduceFrac(p: number, q: number) {
  if (q === 0) return { p, q }
  const g = gcd(p, q)
  return { p: p / g, q: q / g }
}
function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function piFracLatex(p: number, q: number) {
  // representa (p*pi)/q rad, simplificando p/q
  if (p === 0) return `0\\,\\text{rad}`
  const r = reduceFrac(p, q)
  const P = r.p
  const Q = r.q

  if (Q === 1) {
    if (P === 1) return `\\pi\\,\\text{rad}`
    return `${P}\\pi\\,\\text{rad}`
  }
  if (P === 1) return `\\frac{\\pi}{${Q}}\\,\\text{rad}`
  return `\\frac{${P}\\pi}{${Q}}\\,\\text{rad}`
}

/* =========================
   MathJax Config (igual Prisma 17)
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
   GENERADOR
   Elegimos un “bloque” D en grados múltiplo de 9:
     D = 9k (k=1..9)
   Entonces:
     D° ? (10k)^g   (porque 1g = 0.9°)
     D° ? (kp/20) rad  (porque 180° ? p rad)

   Hacemos:
     Numerador = (1·D)° + (m2·(10k))^g + (m3·(kp/20)) rad
     Denominador = (kp/20) rad
   ? A = 1 + m2 + m3 ? {2,3,4}
========================= */
function generateExercise() {
  for (let tries = 0; tries < 200; tries++) {
    const k = randInt(1, 9)
    const Ddeg = 9 * k
    const gBase = 10 * k

    const A = randInt(2, 4)

    const m2 = randInt(0, A - 1)
    const m3 = A - 1 - m2

    const degTerm = 1 * Ddeg
    const gradTerm = m2 * gBase

    const radDenP = k
    const radDenQ = 20

    const radNumP = m3 * k
    const radNumQ = 20

    const degLatex = `${degTerm}^{\\circ}`
    const gradLatex = `${gradTerm}^{g}`
    const radNumLatex = piFracLatex(radNumP, radNumQ)
    const radDenLatex = piFracLatex(radDenP, radDenQ)

    const exprLatex = `A = \\dfrac{${degLatex} + ${gradLatex} + ${radNumLatex}}{${radDenLatex}}`

    const options: Option[] = shuffle([
      { label: 'A', value: 1, correct: A === 1 },
      { label: 'B', value: 2, correct: A === 2 },
      { label: 'C', value: 3, correct: A === 3 },
      { label: 'D', value: 4, correct: A === 4 },
    ])

    // conversiones exactas a grados (para la solución)
    const gradToDeg = (gradTerm * 9) / 10
    const radDenDeg = Ddeg
    const radNumDeg = m3 * Ddeg
    const numDeg = degTerm + gradToDeg + radNumDeg

    if (!Number.isInteger(gradToDeg) || !Number.isInteger(numDeg)) continue

    return {
      k,
      Ddeg,
      gBase,
      A,
      m2,
      m3,
      degTerm,
      gradTerm,
      radDenP,
      radDenQ,
      radNumP,
      radNumQ,
      radDenLatex,
      radNumLatex,
      exprLatex,
      options,
      gradToDeg,
      radDenDeg,
      radNumDeg,
      numDeg,
    }
  }

  // fallback
  const exprLatex =
    `A = \\dfrac{45^{\\circ} + 50^{g} + \\frac{\\pi}{4}\\,\\text{rad}}{\\frac{\\pi}{4}\\,\\text{rad}}`
  return {
    k: 5,
    Ddeg: 45,
    gBase: 50,
    A: 3,
    m2: 1,
    m3: 1,
    degTerm: 45,
    gradTerm: 50,
    radDenP: 1,
    radDenQ: 4,
    radNumP: 1,
    radNumQ: 4,
    radDenLatex: `\\frac{\\pi}{4}\\,\\text{rad}`,
    radNumLatex: `\\frac{\\pi}{4}\\,\\text{rad}`,
    exprLatex,
    options: [
      { label: 'A', value: 1, correct: false },
      { label: 'B', value: 2, correct: false },
      { label: 'C', value: 3, correct: true },
      { label: 'D', value: 4, correct: false },
    ],
    gradToDeg: 45,
    radDenDeg: 45,
    radNumDeg: 45,
    numDeg: 135,
  }
}

/* =========================
   UI (NUEVO FORMATO)
========================= */
export default function Prisma32({
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

    const ordered = ex.options.slice().sort((a, b) => a.label.localeCompare(b.label))

    persistExerciseOnce({
      exerciseId,
      classroomId,
      sessionId,

      correct: op.correct,

      answer: {
        selected: String(op.value),
        correctAnswer: String(ex.A),
        latex: ex.exprLatex,
        options: ordered.map(o => String(o.value)),
        extra: {
          // para auditoría/explicación en backoffice
          labeledOptions: ordered.map(o => `${o.label}.\\ ${o.value}`),

          k: ex.k,
          Ddeg: ex.Ddeg,
          degTerm: ex.degTerm,
          gradTerm: ex.gradTerm,
          radNum: { p: ex.radNumP, q: ex.radNumQ },
          radDen: { p: ex.radDenP, q: ex.radDenQ },

          // conversiones usadas en la solución
          gradToDeg: ex.gradToDeg,
          radNumDeg: ex.radNumDeg,
          radDenDeg: ex.radDenDeg,
          numDeg: ex.numDeg,

          rule: 'Convertir todo a grados y dividir',
        },
      },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  // LaTeX de pasos
  const gradConv_tex = `${ex.gradTerm}^{g}\\cdot \\frac{9^{\\circ}}{10^{g}} = ${ex.gradToDeg}^{\\circ}`
  const radDenConv_tex =
    `${ex.radDenLatex}\\cdot \\frac{180^{\\circ}}{\\pi\\,\\text{rad}} = ${ex.radDenDeg}^{\\circ}`
  const radNumConv_tex =
    `${ex.radNumLatex}\\cdot \\frac{180^{\\circ}}{\\pi\\,\\text{rad}} = ${ex.radNumDeg}^{\\circ}`

  const numDeg_tex = `${ex.degTerm}^{\\circ} + ${ex.gradToDeg}^{\\circ} + ${ex.radNumDeg}^{\\circ} = ${ex.numDeg}^{\\circ}`
  const A_tex = `A = \\dfrac{${ex.numDeg}^{\\circ}}{${ex.radDenDeg}^{\\circ}} = ${ex.A}`

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 32 — Opera la expresión (° , g , rad)"
        prompt="Opera la expresión:"
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <div className="space-y-4 text-sm leading-relaxed">
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">?? Paso 0 — Idea</div>
                <p className="text-muted-foreground">
                  Convertimos todo al mismo sistema (grados) y recién operamos.
                </p>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 1 — Convertir a grados</div>

                <div className="rounded-md border bg-background p-3 space-y-2">
                  <div className="text-muted-foreground">
                    <span className="font-semibold">Gradianes a grados:</span> 400g = 360° ? 1g = 0.9°
                  </div>
                  <Tex block tex={gradConv_tex} />

                  <div className="pt-2 text-muted-foreground">
                    <span className="font-semibold">Radianes a grados:</span> 1 rad = 180°/p
                  </div>
                  <Tex block tex={radDenConv_tex} />
                  <Tex block tex={radNumConv_tex} />
                </div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 2 — Operar</div>
                <div className="rounded-md border bg-background p-3 space-y-2">
                  <Tex block tex={numDeg_tex} />
                  <Tex block tex={A_tex} />
                </div>

                <div className="mt-3 rounded-lg bg-muted p-3">
                  <div className="font-semibold">Respuesta:</div>
                  <div className="text-lg">
                    <Tex block tex={`${ex.A}`} />
                  </div>
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-white p-4 mb-4">
          <div className="font-semibold mb-2">Expresión:</div>
          <Tex block tex={ex.exprLatex} />
        </div>

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
                <div className="font-semibold">{op.label}.</div>
                <div className="font-mono text-lg">{op.value}</div>
              </button>
            )
          })}
        </div>
      </ExerciseShell>
    </MathJaxContext>
  )
}



