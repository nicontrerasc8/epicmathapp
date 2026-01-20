'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 8 — Conjuntos por comprensión: suma de elementos
   Tipo:
     F = { ax + b | x ? Z+ ? mx < x + c }
   Pedir: suma de elementos de F

   ? MathJax (better-react-mathjax) — mismo formato que Prisma 01/17
   ? 1 SOLO INTENTO (autocalifica al elegir opción)
   ? Generación dinámica (sin hardcode)
   ? Explicación detallada (inecuación ? listar x ? armar F ? sumar)
============================================================ */

type Option = { value: string; correct: boolean }

function coin(p = 0.5) {
  return Math.random() < p
}
function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function choice<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}
function sum1ToN(n: number) {
  return (n * (n + 1)) / 2
}

/* =========================
   MathJax Config (igual Prisma 01)
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

function texSet(arr: Array<number | string>) {
  return `\\left\\{${arr.join(', ')}\\right\\}`
}

/** Genera un ejercicio (n pequeño) */
function generateExercise() {
  // f(x) = ax + b
  const a = choice([2, 3, 4, 5])
  const b = randInt(0, 6)

  // Inecuación: mx < x + c  => (m-1)x < c => x < c/(m-1)
  const m = choice([3, 4, 5, 6, 7, 8]) // evita m=1,2
  const maxX = randInt(4, 8) // x = 1..maxX

  // Elegimos c para que resulte exactamente x < maxX+1 (estricta)
  const c = (m - 1) * (maxX + 1)

  const xs = Array.from({ length: maxX }, (_, i) => i + 1)
  const elements = xs.map(x => a * x + b)
  const correctSum = elements.reduce((acc, v) => acc + v, 0)

  const setTex = `F = \\left\\{ ${a}x + ${b} \\mid x \\in \\mathbb{Z}^{+} \\land ${m}x < x + ${c} \\right\\}`

  return { a, b, m, c, maxX, xs, elements, correctSum, setTex }
}

function makeDistractors(ex: ReturnType<typeof generateExercise>) {
  const { a, b, maxX, correctSum } = ex
  const set = new Set<number>()
  set.add(correctSum)

  // 1) Error típico: tomar x = maxX+1 (como si no fuera estricta)
  {
    const n = maxX + 1
    const sum = a * sum1ToN(n) + b * n
    set.add(sum)
  }

  // 2) Error típico: incluir x=0 (x ? Z en vez de Z+)
  {
    const n = maxX // 0..maxX => (n+1) términos
    const sum = a * sum1ToN(n) + b * (n + 1)
    set.add(sum)
  }

  // 3) Error típico: olvidar el +b y sumar solo ax
  {
    const sum = a * sum1ToN(maxX)
    set.add(sum)
  }

  while (set.size < 4) {
    const tweak = correctSum + choice([a, -a, b + 1, -(b + 1), 2, -2])
    if (tweak > 0) set.add(tweak)
  }

  const options: Option[] = Array.from(set)
    .slice(0, 4)
    .map(v => ({ value: String(v), correct: v === correctSum }))

  return options.sort(() => Math.random() - 0.5)
}

export default function Prisma08({
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
    const ex = generateExercise()
    const options = makeDistractors(ex)
    return { ...ex, options }
  }, [nonce])

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelected(op.value)
    engine.submit(op.correct)

    // ? mismo contrato/estilo que tu Prisma 01 (persist nuevo)
    persistExerciseOnce({
      exerciseId, // ej: 'Prisma08'
      classroomId,
      sessionId,
      correct: op.correct,
      answer: {
        selected: op.value,
        correctAnswer: String(ejercicio.correctSum),
        latex: ejercicio.setTex,
        options: ejercicio.options.map(o => o.value),
        extra: {
          a: ejercicio.a,
          b: ejercicio.b,
          m: ejercicio.m,
          c: ejercicio.c,
          maxX: ejercicio.maxX,
          xs: ejercicio.xs,
          elements: ejercicio.elements,
        },
      },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  // Solución (helpers)
  const bound = ejercicio.c / (ejercicio.m - 1) // será maxX+1 exacto
  const xsTex = `x \\in \\mathbb{Z}^{+},\\; x < ${bound} \\Rightarrow x = ${texSet(ejercicio.xs)}`
  const fTex = `F = ${texSet(ejercicio.elements)}`
  const sumByFormula = ejercicio.a * sum1ToN(ejercicio.maxX) + ejercicio.b * ejercicio.maxX

  const ineqStepsTex = `\\begin{aligned}
${ejercicio.m}x &< x + ${ejercicio.c} \\\\
${ejercicio.m}x - x &< ${ejercicio.c} \\\\
(${ejercicio.m - 1})x &< ${ejercicio.c} \\\\
x &< \\frac{${ejercicio.c}}{${ejercicio.m - 1}} = ${bound}
\\end{aligned}`

  const formulaTex = `\\sum_{x=1}^{${ejercicio.maxX}} (${ejercicio.a}x + ${ejercicio.b})
= ${ejercicio.a}\\sum_{x=1}^{${ejercicio.maxX}} x + ${ejercicio.b}\\sum_{x=1}^{${ejercicio.maxX}} 1
= ${ejercicio.a}\\cdot \\frac{${ejercicio.maxX}(${ejercicio.maxX} + 1)}{2} + ${ejercicio.b}\\cdot ${ejercicio.maxX}
= ${sumByFormula}`

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 8 — Suma de elementos de un conjunto"
        prompt="Calcular la suma de los elementos de F."
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
                <div className="font-semibold mb-2">?? Paso 0 — Qué significa “por comprensión”</div>
                <p className="text-muted-foreground">
                  Primero encontramos qué valores de <span className="font-semibold">x</span> cumplen la condición.
                  Luego calculamos <span className="font-semibold">{ejercicio.a}x + {ejercicio.b}</span> para cada x válido,
                  armamos <span className="font-semibold">F</span> y finalmente sumamos sus elementos.
                </p>
              </div>

              {/* Paso 1 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 1 — Resolver la inecuación</div>
                <div className="rounded-md border bg-background p-3">
                  <Tex block tex={ineqStepsTex} />
                </div>

                <div className="mt-3">
                  <Tex block tex={xsTex} />
                </div>
              </div>

              {/* Paso 2 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 2 — Construir el conjunto F</div>

                <div className="mt-2 overflow-x-auto">
                  <table className="border w-full text-center text-xs">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border py-2">x</th>
                        <th className="border py-2">
                          {ejercicio.a}x + {ejercicio.b}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ejercicio.xs.map((x, i) => (
                        <tr key={x}>
                          <td className="border py-2">{x}</td>
                          <td className="border py-2 font-semibold">{ejercicio.elements[i]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3">
                  <Tex block tex={fTex} />
                </div>
              </div>

              {/* Paso 3 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 3 — Sumar los elementos</div>

                <div className="rounded-md border bg-background p-3">
                  <div className="text-muted-foreground mb-2">
                    Puedes sumar directo o usar la fórmula (más pro):
                  </div>
                  <Tex block tex={formulaTex} />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm font-semibold">Respuesta:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">
                    {ejercicio.correctSum}
                  </span>
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        {/* Card expresión (igual estilo Prisma 01/17) */}
        <div className="rounded-xl border bg-white p-4 mb-4">
          <div className="font-semibold mb-2">Expresión:</div>
          <Tex block tex={ejercicio.setTex} />
        </div>

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



