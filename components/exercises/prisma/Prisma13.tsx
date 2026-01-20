'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 13 — Potencias: “Se reduce a z^m, halle m/4”
   ? MathJax (better-react-mathjax) — mismo formato que Prisma 01/17
   ? 1 SOLO INTENTO (autocalifica al elegir opción)
   ? Dinámico (genera E con exponentes tipo -2^2, 2^-2, 2^-1)
   ? Explicación tipo profe con pasos + cálculo de m/4
   ? Persist (MISMA firma que Prisma01/10)
============================================================ */

type Option = { value: string; correct: boolean }

/* =========================
   HELPERS
========================= */
function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
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
    renderActions: { addMenu: [] }, // quita menú contextual
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
   Forma (siempre):
     E = (z^{-k})^{-2^2} · (z^{4u})^{2^{-2}} · (z^{2v})^{2^{-1}}

   Donde u+v = 4w  ?  m = 4k + u + v = 4k + 4w = 4(k+w)
   ? m/4 = k+w (entero, lindo para alternativas)
========================= */
function buildScenario() {
  const k = randInt(2, 9)
  const w = randInt(1, 7)
  const sumUV = 4 * w

  const u = randInt(1, sumUV - 1)
  const v = sumUV - u

  // bases para que al elevar por 1/4 y 1/2 salga u y v exactos
  const exp2_base = 4 * u
  const exp3_base = 2 * v

  const m = 4 * k + u + v
  const asked = m / 4

  // Nota: -2^{2} representa el caso “-2^2” (el menos va afuera)
  const E_tex = `E = \\left(z^{- ${k}}\\right)^{-2^{2}}\\cdot \\left(z^{${exp2_base}}\\right)^{2^{-2}}\\cdot \\left(z^{${exp3_base}}\\right)^{2^{-1}}`

  const correct = asked
  const distractors = shuffle(
    Array.from(
      new Set<number>(
        [
          correct - 2,
          correct - 1,
          correct + 1,
          correct + 2,
          m, // confunden y marcan m
          2 * correct, // error típico por duplicar
          k + u, // otro típico “me olvidé de v”
        ].filter(x => Number.isFinite(x) && x > 0 && x !== correct)
      )
    )
  ).slice(0, 3)

  const options: Option[] = shuffle([
    { value: String(correct), correct: true },
    ...distractors.map(d => ({ value: String(d), correct: false })),
  ])

  return { k, w, u, v, exp2_base, exp3_base, m, asked, E_tex, options }
}

/* =========================
   PRISMA 13 — UI
========================= */
export default function Prisma13({
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
  const [selected, setSelected] = useState<string | null>(null)

  const ejercicio = useMemo(() => buildScenario(), [nonce])

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelected(op.value)
    engine.submit(op.correct)

    persistExerciseOnce({
      exerciseId, // ej: 'Prisma13'
      classroomId,
      sessionId,

      correct: op.correct,

      answer: {
        selected: op.value,
        correctAnswer: String(ejercicio.asked),
        latex: ejercicio.E_tex,
        options: ejercicio.options.map(o => o.value),
        extra: {
          k: ejercicio.k,
          w: ejercicio.w,
          u: ejercicio.u,
          v: ejercicio.v,
          exp2_base: ejercicio.exp2_base,
          exp3_base: ejercicio.exp3_base,
          m: ejercicio.m,
          asked: ejercicio.asked,
        },
      },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  const { k, u, v, exp2_base, exp3_base, m, asked, E_tex } = ejercicio

  // Tex helpers para solución
  const step1_tex = `-2^{2} = -(2^{2}) = -4`
  const step1b_tex = `2^{-2} = \\left(\\frac12\\right)^{2} = \\frac14`
  const step1c_tex = `2^{-1} = \\frac12`

  const rewritten_tex = `E = \\left(z^{- ${k}}\\right)^{-4}\\cdot \\left(z^{${exp2_base}}\\right)^{\\frac14}\\cdot \\left(z^{${exp3_base}}\\right)^{\\frac12}`

  const rule_powpow_tex = `(z^{a})^{b} = z^{ab}`

  const t1_tex = `\\left(z^{- ${k}}\\right)^{-4} = z^{(-${k})(-4)} = z^{${4 * k}}`
  const t2_tex = `\\left(z^{${exp2_base}}\\right)^{\\frac14} = z^{${exp2_base}\\cdot \\frac14} = z^{${u}}`
  const t3_tex = `\\left(z^{${exp3_base}}\\right)^{\\frac12} = z^{${exp3_base}\\cdot \\frac12} = z^{${v}}`

  const mult_tex = `z^{${4 * k}}\\cdot z^{${u}}\\cdot z^{${v}} = z^{${4 * k} + ${u} + ${v}}`
  const m_tex = `m = ${4 * k} + ${u} + ${v} = ${m}`
  const asked_tex = `\\frac{m}{4} = \\frac{${m}}{4} = ${asked}`

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 13 — Potencias (reduce a z^m)"
        prompt="Si la expresión se reduce a z^m, halle m/4."
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <div className="space-y-4 text-sm leading-relaxed">
              {/* Paso 0 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">?? Paso 0 — Leer la expresión</div>
                <p className="text-muted-foreground">
                  Primero simplificamos los exponentes numéricos (ojo con <span className="font-mono">-2^2</span>: el “-”
                  va afuera).
                </p>
                <div className="mt-2 rounded-md border bg-background p-3">
                  <Tex block tex={E_tex} />
                </div>
              </div>

              {/* Paso 1 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 1 — Reducimos exponentes numéricos</div>
                <div className="rounded-md border bg-background p-3 space-y-2">
                  <Tex block tex={step1_tex} />
                  <Tex block tex={step1b_tex} />
                  <Tex block tex={step1c_tex} />
                </div>
                <div className="mt-2 text-muted-foreground">
                  Clave: <span className="font-mono">-2^2</span> = <span className="font-mono">-(2^2)</span> ={' '}
                  <span className="font-mono">-4</span>.
                </div>
              </div>

              {/* Paso 2 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 2 — Reescribimos E</div>
                <div className="rounded-md border bg-background p-3">
                  <Tex block tex={rewritten_tex} />
                </div>
              </div>

              {/* Paso 3 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 3 — Potencia de potencia</div>
                <div className="rounded-md border bg-background p-3 space-y-2">
                  <Tex block tex={rule_powpow_tex} />
                  <Tex block tex={t1_tex} />
                  <Tex block tex={t2_tex} />
                  <Tex block tex={t3_tex} />
                </div>
              </div>

              {/* Paso 4 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 4 — Multiplicamos potencias (misma base)</div>
                <div className="rounded-md border bg-background p-3 space-y-2">
                  <Tex block tex={mult_tex} />
                  <Tex block tex={m_tex} />
                </div>
              </div>

              {/* Paso 5 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 5 — Piden m/4</div>
                <div className="rounded-md border bg-background p-3">
                  <Tex block tex={asked_tex} />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm font-semibold">Respuesta:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">{asked}</span>
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        {/* Card de expresión */}
        <div className="rounded-xl border bg-white p-4 mb-4">
          <div className="font-semibold mb-2">Expresión:</div>
          <Tex block tex={E_tex} />
        </div>

        {/* Opciones */}
        <div className="grid grid-cols-2 gap-4">
          {ejercicio.options.map(op => {
            const isSelected = selected === op.value
            const showCorrect = engine.status !== 'idle' && op.correct
            const showWrong = engine.status === 'revealed' && isSelected && !op.correct

            return (
              <button
                key={op.value}
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
                <div className="font-mono text-lg">{op.value}</div>
              </button>
            )
          })}
        </div>
      </ExerciseShell>
    </MathJaxContext>
  )
}



