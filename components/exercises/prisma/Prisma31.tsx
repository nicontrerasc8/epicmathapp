'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 31 — Conversión radianes ↔ centesimal (grados g)
   Enunciado estilo PDF:
     Siendo  (pπ/q) rad  ↔  ab^g
     Calcula  E = √(a + b − 1)

   ✅ Usa "better-react-mathjax" (NO KaTeX)
   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ Dinámico: genera un valor en centesimal de 2 dígitos (ab) que da E ∈ {1,2,3,4}
   ✅ Explicación paso a paso como el material
============================================================ */

type Option = { label: 'A' | 'B' | 'C' | 'D'; value: number; correct: boolean }

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
function gcd(a: number, b: number) {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const t = x % y
    x = y
    y = t
  }
  return x
}

/* =========================
   MathJax Config (igual a tus prismas con LaTeX)
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
   GENERATOR (robusto)
   Queremos:
     G = ab (dos dígitos) en g
     E = sqrt(a+b-1) ∈ {1,2,3,4}
   y mostramos el radian como (pπ/q) con p/q simplificado:
     rad = (Gπ)/200 = (pπ)/q
========================= */
function digitsThatMakeE(targetE: number) {
  // a+b-1 = E^2  => a+b = E^2 + 1
  const sum = targetE * targetE + 1 // {2,5,10,17}
  const pairs: Array<{ a: number; b: number }> = []
  for (let a = 1; a <= 9; a++) {
    const b = sum - a
    if (b >= 0 && b <= 9) pairs.push({ a, b })
  }
  // queremos dos dígitos => a>=1 asegura G>=10
  return pairs
}

function radLatexFromG(G: number) {
  // rad = (Gπ)/200 = (pπ)/q simplificado
  const g = gcd(G, 200)
  const p = G / g
  const q = 200 / g

  if (q === 1) {
    if (p === 1) return `\\pi\\,\\text{rad}`
    return `${p}\\pi\\,\\text{rad}`
  }
  if (p === 1) return `\\dfrac{\\pi}{${q}}\\,\\text{rad}`
  return `\\dfrac{${p}\\pi}{${q}}\\,\\text{rad}`
}

function buildExercise() {
  // Opciones siempre 1..4 como el PDF
  const optionValues = [1, 2, 3, 4] as const

  // Elegimos un E objetivo y construimos G=ab que lo cumpla
  const targetE = choice([1, 2, 3, 4])
  const pairs = digitsThatMakeE(targetE)
  const { a, b } = choice(pairs)

  const G = 10 * a + b // ab en grados centesimales
  const radLatex = radLatexFromG(G)

  const correct = targetE

  const labels: Option['label'][] = ['A', 'B', 'C', 'D']
  const options = shuffle(optionValues as unknown as number[]).map((v, i) => ({
    label: labels[i],
    value: v,
    correct: v === correct,
  }))

  const enunciadoLatex = `\\text{Siendo } ${radLatex}\\ \\leftrightarrow\\ \\overline{${a}${b}}^{\\,g},\\ \\text{calcula } E=\\sqrt{a+b-1}.`

  return {
    a,
    b,
    G,
    targetE,
    radLatex,
    enunciadoLatex,
    options,
  }
}

/* =========================
   COMPONENT
========================= */
export default function Prisma31({ temaPeriodoId }: { temaPeriodoId: string }) {
  const engine = useExerciseEngine({ maxAttempts: 1 })
  const [nonce, setNonce] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)

  const ej = useMemo(() => buildExercise(), [nonce])

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelected(op.value)
    engine.submit(op.correct)

    persistExerciseOnce({
      temaPeriodoId,
      exerciseKey: 'Prisma31',
      prompt: 'Siendo un ángulo en radianes equivalente a un valor centesimal ab^g, calcula E.',
      questionLatex: ej.enunciadoLatex,
      options: ej.options.map(o => `${o.label}. ${o.value}`),
      correctAnswer: String(ej.targetE),
      userAnswer: String(op.value),
      isCorrect: op.correct,
      extra: {
        a: ej.a,
        b: ej.b,
        G: ej.G,
        radLatex: ej.radLatex,
        rule: '1 \\pi \\text{ rad} = 200^{g}',
      },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  // pasos solución
  const stepConvert1 = `\\dfrac{200^{g}}{\\pi\\,\\text{rad}}`
  const stepConvert2 = `(${ej.radLatex})\\cdot ${stepConvert1}`
  const stepConvert3 = `= \\dfrac{200}{\\pi}\\cdot ${ej.radLatex.replace(/\\,\\text\{rad\}/g, '')}\\cdot \\dfrac{1}{1}` // solo para no repetir "rad" al final
  const stepConvert4 = `= ${ej.G}^{g} = \\overline{${ej.a}${ej.b}}^{\\,g}`

  const radNoUnit = ej.radLatex.replace(/\\,\\text\{rad\}/g, '')
  const cleanStep2 = `\\left(${radNoUnit}\\right)\\cdot \\dfrac{200^{g}}{\\pi\\,\\text{rad}}`
  const cleanStep3 = `= \\left(${radNoUnit}\\right)\\cdot \\dfrac{200^{g}}{\\pi\\,\\text{rad}}`
  const cleanStep4 = `= ${ej.G}^{g}`

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 31 — Radianes a centesimal"
        prompt="Siendo el ángulo en radianes equivalente a ab^g, calcula E."
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
                <div className="font-semibold mb-2">👀 Paso 0 — ¿Qué significa “centesimal”?</div>
                <p className="text-muted-foreground">
                  En centesimal (grados <span className="font-semibold">g</span>), se usa la equivalencia:
                </p>
                <div className="mt-2 rounded-md border bg-background p-3">
                  <Tex block tex={`\\pi\\,\\text{rad} = 200^{g}`} />
                </div>
              </div>

              {/* Paso 1 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 1 — Convertir el radian a grados g</div>
                <p className="text-muted-foreground">
                  Multiplicamos por el factor de conversión para que “rad” se cancele.
                </p>

                <div className="mt-2 space-y-2 rounded-md border bg-background p-3">
                  <Tex block tex={cleanStep2} />
                  <Tex block tex={cleanStep4} />
                </div>

                <p className="mt-2 text-muted-foreground">
                  Entonces <span className="font-semibold">{ej.G}^g</span> es de la forma{' '}
                  <span className="font-semibold">ab^g</span>, así que:
                </p>
                <div className="mt-2 rounded-md border bg-background p-3">
                  <Tex block tex={`a=${ej.a},\\quad b=${ej.b}`} />
                </div>
              </div>

              {/* Paso 2 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 2 — Calcular E</div>
                <p className="text-muted-foreground">
                  Ahora reemplazamos en <span className="font-semibold">E</span>.
                </p>

                <div className="mt-2 space-y-2 rounded-md border bg-background p-3">
                  <Tex block tex={`E=\\sqrt{a+b-1}`} />
                  <Tex block tex={`E=\\sqrt{${ej.a}+${ej.b}-1}=\\sqrt{${ej.a + ej.b - 1}}`} />
                  <Tex block tex={`E=\\mathbf{${ej.targetE}}`} />
                </div>
              </div>

              {/* Respuesta */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Respuesta</div>
                <div className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">
                  {ej.targetE}
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        {/* Enunciado */}
        <div className="rounded-xl border bg-white p-4 mb-4">
          <div className="font-semibold mb-2">Enunciado:</div>
          <div className="rounded-md border bg-background p-3">
            <Tex block tex={ej.enunciadoLatex} />
          </div>
        </div>

        {/* Opciones */}
        <div className="grid grid-cols-2 gap-4">
          {ej.options.map(op => {
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
