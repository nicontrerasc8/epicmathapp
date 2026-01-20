'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 12 — Reduzca (potencias con repeticiones) + LaTeX (MathJax)
   Tipo:
     P = ( m^eN repetido k veces · m^(eD·a) ) / ( m^eD repetido (u + a) veces )
   y se reduce a m^r (independiente de "a") si eD·a cancela.

   ? better-react-mathjax (NO KaTeX)
   ? 1 SOLO INTENTO (autocalifica al elegir opción)
   ? Generación dinámica (sin hardcode)
   ? Explicación tipo profe (pasos con potencias)
   ? Persist NUEVO (igual Prisma01)
============================================================ */

type Option = { value: string; correct: boolean }

/* =========================
   HELPERS
========================= */
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
   MathJax Config (igual Prisma01/11)
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
   LaTeX helpers
========================= */
function optToLatex(v: string) {
  // "m", "m^2" => "m^{2}"
  if (v === 'm') return 'm'
  const m = v.match(/^m\^(\d+)$/)
  if (m) return `m^{${m[1]}}`
  return v
}

function buildExprLatex(params: {
  base: string
  eN: number
  k: number
  eD: number
  u: number
}) {
  const { base, eN, k, eD, u } = params

  // P = ( m^eN repetido k veces · m^(eD a) ) / ( m^eD repetido (u+a) veces )
  return [
    `P = \\dfrac{`,
    `\\underbrace{${base}^{${eN}}\\cdot ${base}^{${eN}}\\cdots ${base}^{${eN}}}_{${k}\\,\\text{veces}}\\cdot ${base}^{${eD}a}`,
    `}{`,
    `\\underbrace{${base}^{${eD}}\\cdot ${base}^{${eD}}\\cdots ${base}^{${eD}}}_{(${u}+a)\\,\\text{veces}}`,
    `}`,
  ].join('')
}

/* =========================
   GENERACIÓN (robusta)
========================= */
function generateExercise() {
  const base = 'm'

  // Queremos respuesta en {1,2,3,4} (m, m^2, m^3, m^4)
  const targetR = choice([1, 2, 3, 4])

  // Elegimos eD y forzamos cancelación del término con "a"
  const eD = choice([2, 3, 4])
  const eN = choice([3, 4, 5, 6])
  const k = randInt(10, 24)

  // Queremos: eN*k - eD*u = targetR  => u = (eN*k - targetR)/eD
  const numerator = eN * k - targetR
  if (numerator <= 0) return null
  if (numerator % eD !== 0) return null

  const u = numerator / eD
  if (u < 5 || u > 60) return null

  const correct = targetR === 1 ? base : `${base}^${targetR}`
  const optionsAll = ['m', 'm^2', 'm^3', 'm^4']
  const options: Option[] = shuffle(optionsAll.map(v => ({ value: v, correct: v === correct })))

  const exprLatex = buildExprLatex({ base, eN, k, eD, u })

  return {
    base,
    eN,
    k,
    eD,
    u,
    targetR,
    correct,
    options,
    exprLatex,
  }
}

/* =========================
   COMPONENT
========================= */
export default function Prisma12({
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

  const ejercicio = useMemo(() => {
    for (let t = 0; t < 140; t++) {
      const ex = generateExercise()
      if (ex) return ex
    }
    // fallback seguro (r=4)
    const fallback = {
      base: 'm',
      eN: 4,
      k: 20,
      eD: 2,
      u: 38,
      targetR: 4,
      correct: 'm^4',
      options: shuffle(['m', 'm^2', 'm^3', 'm^4'].map(v => ({ value: v, correct: v === 'm^4' }))),
      exprLatex: buildExprLatex({ base: 'm', eN: 4, k: 20, eD: 2, u: 38 }),
    }
    return fallback
  }, [nonce])

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelected(op.value)
    engine.submit(op.correct)

    // ? Persist NUEVO (igual Prisma01/11)
    persistExerciseOnce({
      exerciseId, // ej: 'Prisma12'
      classroomId,
      sessionId,

      correct: op.correct,

      answer: {
        selected: op.value,
        correctAnswer: ejercicio.correct,
        latex: ejercicio.exprLatex,
        options: ejercicio.options.map(o => o.value),
        extra: {
          base: ejercicio.base,
          eN: ejercicio.eN,
          k: ejercicio.k,
          eD: ejercicio.eD,
          u: ejercicio.u,
          targetR: ejercicio.targetR,
          exprLatex: ejercicio.exprLatex,
        },
      },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  // Cálculos para la solución
  const numPow = ejercicio.eN * ejercicio.k
  const denPowConst = ejercicio.eD * ejercicio.u
  const finalPow = ejercicio.targetR
  const finalLatex = finalPow === 1 ? 'm' : `m^{${finalPow}}`

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 12 — Reduzca (potencias)"
        prompt="Reduzca la expresión P y elija la alternativa correcta."
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
                <div className="font-semibold mb-2">?? Paso 0 — Identificar qué se repite</div>
                <p className="text-muted-foreground">
                  Arriba se repite <span className="font-mono">m^{ejercicio.eN}</span> (k veces) y además aparece{' '}
                  <span className="font-mono">m^{ejercicio.eD}a</span>. Abajo se repite{' '}
                  <span className="font-mono">m^{ejercicio.eD}</span> (<span className="font-mono">u+a</span> veces).
                </p>

                <div className="mt-2 rounded-md border bg-background p-3">
                  <Tex block tex={ejercicio.exprLatex} />
                </div>
              </div>

              {/* Paso 1 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 1 — Convertir repeticiones en potencias</div>
                <p className="text-muted-foreground">
                  Regla: si un mismo factor se repite <span className="font-semibold">k</span> veces, se convierte en
                  potencia:
                </p>
                <div className="mt-2 rounded-md border bg-background p-3">
                  <Tex block tex={`(m^e)^k = m^{e\\cdot k}`} />
                </div>

                <div className="mt-3 space-y-2">
                  <Tex
                    block
                    tex={`\\underbrace{m^{${ejercicio.eN}}\\cdot m^{${ejercicio.eN}}\\cdots m^{${ejercicio.eN}}}_{${ejercicio.k}\\,\\text{veces}}
                    = \\left(m^{${ejercicio.eN}}\\right)^{${ejercicio.k}} = m^{${numPow}}`}
                  />
                  <Tex
                    block
                    tex={`\\underbrace{m^{${ejercicio.eD}}\\cdot m^{${ejercicio.eD}}\\cdots m^{${ejercicio.eD}}}_{(${ejercicio.u}+a)\\,\\text{veces}}
                    = \\left(m^{${ejercicio.eD}}\\right)^{(${ejercicio.u}+a)} = m^{${ejercicio.eD}(${ejercicio.u}+a)}`}
                  />
                </div>
              </div>

              {/* Paso 2 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 2 — Juntar exponentes (misma base)</div>
                <p className="text-muted-foreground">
                  Regla: <span className="font-mono">m^A · m^B = m^{`{A+B}`}</span>.
                </p>

                <div className="mt-2 space-y-2 rounded-md border bg-background p-3">
                  <Tex
                    block
                    tex={`\\text{Numerador: } m^{${numPow}}\\cdot m^{${ejercicio.eD}a} = m^{${numPow}+${ejercicio.eD}a}`}
                  />
                  <Tex
                    block
                    tex={`\\text{Denominador: } m^{${ejercicio.eD}(${ejercicio.u}+a)} = m^{${denPowConst}+${ejercicio.eD}a}`}
                  />
                </div>
              </div>

              {/* Paso 3 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 3 — Dividir potencias (restar exponentes)</div>
                <p className="text-muted-foreground">
                  Regla: <span className="font-mono">m^A / m^B = m^{`{A-B}`}</span>.
                </p>

                <div className="mt-2 space-y-2 rounded-md border bg-background p-3">
                  <Tex
                    block
                    tex={`P = \\dfrac{m^{${numPow}+${ejercicio.eD}a}}{m^{${denPowConst}+${ejercicio.eD}a}}
                    = m^{(${numPow}+${ejercicio.eD}a)-(${denPowConst}+${ejercicio.eD}a)}`}
                  />
                  <Tex block tex={`= m^{${numPow}-${denPowConst}}`} />
                </div>

                <div className="mt-3 rounded-md border bg-background p-3">
                  <div className="font-semibold mb-1">?? Lo clave</div>
                  <p className="text-muted-foreground">
                    El término <span className="font-mono">+{ejercicio.eD}a</span> aparece arriba y abajo, por eso se{' '}
                    <span className="font-semibold">cancela</span>. La respuesta no depende de{' '}
                    <span className="font-mono">a</span>.
                  </p>
                </div>
              </div>

              {/* Resultado */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Resultado</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Respuesta:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">
                    <Tex tex={finalLatex} />
                  </span>
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        {/* Enunciado visible */}
        <div className="rounded-xl border bg-white p-4 mb-4">
          <div className="font-semibold mb-2">Expresión:</div>
          <div className="rounded-md border bg-background p-3">
            <Tex block tex={ejercicio.exprLatex} />
          </div>
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
                <div className="font-semibold">Opción</div>
                <div className="font-mono text-lg">
                  <Tex tex={optToLatex(op.value)} />
                </div>
              </button>
            )
          })}
        </div>
      </ExerciseShell>
    </MathJaxContext>
  )
}



