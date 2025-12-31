'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 9 — Subconjuntos propios de un conjunto B (con elementos que son conjuntos)
   ✅ better-react-mathjax (NO KaTeX)
   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ Dinámico: B con n elementos (algunos pueden ser {2; 3} etc.)
   ✅ Explicación tipo profe: n(B), 2^n, propios = 2^n - 1
   ✅ Persist: MISMA estructura que Prisma01 (exerciseId/temaId/classroomId/sessionId)
============================================================ */

type Option = { label: 'A' | 'B' | 'C' | 'D'; value: string; correct: boolean }

/* =========================
   HELPERS
========================= */
function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
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
   MathJax Config (igual Prisma01/17)
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
   GENERACIÓN DEL CONJUNTO B
========================= */
function fmtInnerSet(items: number[]) {
  // estilo “{2; 3}”
  return `{${items.join('; ')}}`
}

function buildSetElement(universe: number[]): string {
  const kind = choice(['atom', 'singleton', 'pair'] as const)

  if (kind === 'atom') return String(choice(universe))

  if (kind === 'singleton') {
    const x = choice(universe)
    return fmtInnerSet([x])
  }

  // pair
  const a = choice(universe)
  let b = choice(universe)
  while (b === a) b = choice(universe)
  const [x, y] = a < b ? [a, b] : [b, a]
  return fmtInnerSet([x, y])
}

function buildScenario() {
  const n = randInt(2, 6) // 2..6 -> propios: 3,7,15,31,63
  const universe = [1, 2, 3, 4, 5, 6, 7, 8, 9]

  // B con n elementos distintos (por string)
  const set = new Set<string>()
  let guard = 0
  while (set.size < n && guard < 240) {
    set.add(buildSetElement(universe))
    guard++
  }
  const elements = Array.from(set)

  // Para LaTeX: \left\{ ... \right\} con separador ;
  const B_latex = `\\left\\{${elements.join('; ')}\\right\\}`

  const totalSubsets = 2 ** n
  // según tu material: propios = todos menos B (incluye ∅)
  const correctNum = totalSubsets - 1

  // distractores típicos + cercanos
  const candidates = [
    totalSubsets, // 2^n
    totalSubsets - 2, // 2^n - 2 (excluyen vacío y el mismo)
    2 ** (n - 1) - 1, // error común
    2 ** (n + 1) - 1, // sobreestiman n
    n ** 2 - 1,
  ]
    .filter(x => Number.isFinite(x) && x >= 0 && x !== correctNum)
    .map(x => Math.round(x))

  const unique = Array.from(new Set(candidates)).filter(x => x !== correctNum)

  while (unique.length < 8) {
    const k = correctNum + randInt(-8, 14)
    if (k >= 0 && k !== correctNum && !unique.includes(k)) unique.push(k)
  }

  const distractors = shuffle(unique).slice(0, 3)
  const values = shuffle([
    { v: correctNum, ok: true },
    ...distractors.map(d => ({ v: d, ok: false })),
  ])

  const labels: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D']
  const options: Option[] = values.map((x, i) => ({
    label: labels[i],
    value: String(x.v),
    correct: x.ok,
  }))

  return { n, elements, B_latex, correctNum, totalSubsets, options }
}

/* =========================
   COMPONENT
========================= */
export default function Prisma09({
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
  const [selected, setSelected] = useState<string | null>(null)

  const ex = useMemo(() => buildScenario(), [nonce])

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelected(op.value)
    engine.submit(op.correct)

    // ✅ MISMA ESTRUCTURA QUE PRISMA01
    persistExerciseOnce({
      exerciseId, // 'Prisma09'
      temaId,
      classroomId,
      sessionId,

      correct: op.correct,

      answer: {
        selected: op.value,
        selectedLabel: op.label,
        correctAnswer: String(ex.correctNum),
        latex: `B=${ex.B_latex}`,
        options: ex.options.map(o => ({ label: o.label, value: o.value })),
        extra: {
          n: ex.n,
          elements: ex.elements,
          totalSubsets: ex.totalSubsets,
          rule: 'subconjuntos propios = 2^n - 1 (incluye ∅, excluye B)',
        },
      },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 9 — Subconjuntos propios"
        prompt="¿Cuántos subconjuntos propios tiene el conjunto B?"
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <div className="space-y-4 text-sm leading-relaxed">
              {/* Paso 1 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 1 — Identificamos los elementos de B</div>

                <div className="rounded-md border bg-background p-3">
                  <Tex block tex={`B=${ex.B_latex}`} />
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="border w-full text-center text-xs">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border py-2">Elemento</th>
                        <th className="border py-2">Contenido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ex.elements.map((e, idx) => (
                        <tr key={idx}>
                          <td className="border py-2 font-semibold">{idx + 1}</td>
                          <td className="border py-2 font-mono">{e}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 rounded-lg border bg-white p-3">
                  <div>
                    Número de elementos de B:{' '}
                    <span className="font-semibold">n(B) = {ex.n}</span>
                  </div>
                  <div className="text-muted-foreground mt-1">
                    Ojo: si un elemento es <span className="font-mono">{`{2; 3}`}</span>, igual cuenta como{' '}
                    <span className="font-semibold">1 elemento</span>.
                  </div>
                </div>
              </div>

              {/* Paso 2 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 2 — Fórmula de subconjuntos</div>
                <p className="text-muted-foreground">
                  Si un conjunto tiene <span className="font-semibold">n</span> elementos, entonces el número de{' '}
                  <span className="font-semibold">subconjuntos</span> es:
                </p>
                <div className="mt-2 rounded-md border bg-background p-3">
                  <Tex block tex={`\\text{Total de subconjuntos}=2^n`} />
                </div>
              </div>

              {/* Paso 3 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 3 — Subconjuntos propios</div>
                <p className="text-muted-foreground">
                  En este material, “subconjuntos propios” significa: <span className="font-semibold">todos</span> los
                  subconjuntos excepto el mismo <span className="font-semibold">B</span> (sí incluye el vacío).
                </p>
                <div className="mt-2 rounded-md border bg-background p-3">
                  <Tex block tex={`\\text{Subconjuntos propios}=2^n-1`} />
                </div>
              </div>

              {/* Paso 4 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 4 — Cálculo</div>

                <div className="rounded-md border bg-background p-3 space-y-2">
                  <Tex block tex={`n(B)=${ex.n}`} />
                  <Tex block tex={`2^{${ex.n}}=${ex.totalSubsets}`} />
                  <Tex
                    block
                    tex={`\\text{Subconjuntos propios}=${ex.totalSubsets}-1=\\mathbf{${ex.correctNum}}`}
                  />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm font-semibold">Respuesta:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">
                    {ex.correctNum}
                  </span>
                </div>

                <div className="mt-3 rounded-md border bg-background p-3">
                  <div className="font-semibold mb-1">🧠 Chequeo rápido</div>
                  <p className="text-muted-foreground">
                    Si alguien usa <span className="font-mono">2^n-2</span>, es porque excluye también el vacío.
                    Aquí <span className="font-semibold">sí contamos</span> el vacío; solo quitamos a B.
                  </p>
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        {/* Enunciado */}
        <div className="rounded-xl border bg-white p-4 mb-4">
          <div className="font-semibold mb-2">Conjunto:</div>
          <div className="rounded-md border bg-background p-3">
            <Tex block tex={`B=${ex.B_latex}`} />
          </div>
        </div>

        {/* Opciones */}
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
                <div className="text-sm font-semibold mb-1">{op.label}.</div>
                <div className="font-mono text-lg">{op.value}</div>
              </button>
            )
          })}
        </div>
      </ExerciseShell>
    </MathJaxContext>
  )
}
