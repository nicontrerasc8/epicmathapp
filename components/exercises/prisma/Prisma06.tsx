'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 6 — Conjuntos por comprensión (L = {ax + b | x∈N, x<k})
   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ 100% dinámico: genera a, b, k y opciones
   ✅ MathJax (better-react-mathjax)
   ✅ Explicación tipo profe: lista de x, tabla, conjunto L y verificación
   ✅ Persist NUEVO estilo Prisma01 (exerciseId, temaId, classroomId...)
============================================================ */

type Option = {
  label: 'A' | 'B' | 'C' | 'D'
  text: string
  correct: boolean
  n: number
  membership: 'in' | 'notin'
}

/* =========================
   HELPERS
========================= */
function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}
function uniqueNumbers(arr: number[]) {
  return Array.from(new Set(arr))
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
   Pretty LaTeX builders
========================= */
function fmtLinearLatex(a: number, b: number) {
  if (b === 0) return `${a}x`
  if (b > 0) return `${a}x + ${b}`
  return `${a}x - ${Math.abs(b)}`
}
function fmtLinearText(a: number, b: number) {
  if (b === 0) return `${a}x`
  if (b > 0) return `${a}x + ${b}`
  return `${a}x - ${Math.abs(b)}`
}
function setDefinitionLatex(a: number, b: number, k: number) {
  // L = { ax+b | x ∈ N ∧ x < k }
  return `L = \\left\\{ ${fmtLinearLatex(a, b)} \\mid x\\in\\mathbb{N} \\;\\wedge\\; x<${k} \\right\\}`
}
function membershipLatex(n: number, membership: 'in' | 'notin') {
  return membership === 'in' ? `${n}\\in L` : `${n}\\notin L`
}
function setToLatex(nums: number[]) {
  const sorted = [...nums].sort((m, n) => m - n)
  return `\\{ ${sorted.join(', ')} \\}`
}

/* =========================
   LÓGICA DE CONJUNTO
========================= */
function buildXValues(k: number) {
  // OJO: acá asumes N incluye 0 → {0,1,2,...,k-1}
  return Array.from({ length: k }, (_, i) => i)
}
function computeLValues(a: number, b: number, k: number) {
  const xs = buildXValues(k)
  const ys = xs.map(x => a * x + b)
  return { xs, ys, L: uniqueNumbers(ys) }
}
function pickFromSet(setArr: number[]) {
  return setArr[randInt(0, setArr.length - 1)]
}
function makeNotInCandidates(L: number[]) {
  const min = Math.min(...L)
  const max = Math.max(...L)
  let span = Math.max(8, max - min + 6)

  for (let t = 0; t < 6; t++) {
    const cand: number[] = []
    for (let v = min - span; v <= max + span; v++) cand.push(v)
    const notIn = cand.filter(n => !L.includes(n))
    if (notIn.length >= 10) return notIn
    span += 8
  }

  const big: number[] = []
  for (let v = min - 60; v <= max + 60; v++) big.push(v)
  return big.filter(n => !L.includes(n))
}
function buildStatement(n: number, membership: 'in' | 'notin') {
  return membership === 'in' ? `${n} ∈ L` : `${n} ∉ L`
}

/* =========================
   GENERADOR
========================= */
function generateExercise() {
  for (let tries = 0; tries < 220; tries++) {
    const a = [2, 3, 4, 5][randInt(0, 3)]
    const b = randInt(-6, 6)
    const k = randInt(6, 10)

    const { xs, ys, L } = computeLValues(a, b, k)

    if (L.length < 5) continue
    if (L.length > 12) continue

    const notInPool = makeNotInCandidates(L)
    if (notInPool.length < 6) continue

    const slots: Array<{ label: Option['label']; membership: Option['membership'] }> = [
      { label: 'A', membership: 'notin' },
      { label: 'B', membership: 'in' },
      { label: 'C', membership: 'notin' },
      { label: 'D', membership: 'in' },
    ]

    const correctLabel = shuffle(['A', 'B', 'C', 'D'] as const)[0]

    const used = new Set<number>()
    const options: Option[] = slots.map(s => {
      const isCorrect = s.label === correctLabel

      // Si la opción debe ser verdadera:
      // - si dice "∈", el número debe estar en L
      // - si dice "∉", el número debe NO estar en L
      // Si la opción debe ser falsa, elegimos lo contrario.
      const shouldBeIn =
        (s.membership === 'in' && isCorrect) || (s.membership === 'notin' && !isCorrect)

      let n = 0
      let guard = 0
      while (guard++ < 60) {
        n = shouldBeIn ? pickFromSet(L) : notInPool[randInt(0, notInPool.length - 1)]
        if (!used.has(n)) break
      }
      used.add(n)

      const text = buildStatement(n, s.membership)
      return { label: s.label, membership: s.membership, n, text, correct: isCorrect }
    })

    const correctOpt = options.find(o => o.correct)!
    const truth =
      correctOpt.membership === 'in' ? L.includes(correctOpt.n) : !L.includes(correctOpt.n)
    if (!truth) continue

    const prompt = `Si L está definido por comprensión, entonces es cierto que:`

    return {
      a,
      b,
      k,
      xs,
      ys,
      L,
      prompt,
      options,
      correctLabel,
      correctText: options.find(o => o.correct)!.text,
      questionLatex: setDefinitionLatex(a, b, k),
    }
  }

  // fallback
  const a = 3
  const b = -2
  const k = 8
  const { xs, ys, L } = computeLValues(a, b, k)

  const options: Option[] = [
    { label: 'A', membership: 'notin', n: 7, text: '7 ∉ L', correct: false },
    { label: 'B', membership: 'in', n: 6, text: '6 ∈ L', correct: false },
    { label: 'C', membership: 'notin', n: 10, text: '10 ∉ L', correct: false },
    { label: 'D', membership: 'in', n: 13, text: '13 ∈ L', correct: true },
  ]

  return {
    a,
    b,
    k,
    xs,
    ys,
    L,
    prompt: `Si L está definido por comprensión, entonces es cierto que:`,
    options,
    correctLabel: 'D' as const,
    correctText: '13 ∈ L',
    questionLatex: setDefinitionLatex(a, b, k),
  }
}

/* =========================
   PRISMA 06 (UI)
========================= */
export default function Prisma06({
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
  const [selected, setSelected] = useState<'A' | 'B' | 'C' | 'D' | null>(null)

  const ej = useMemo(() => generateExercise(), [nonce])

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelected(op.label)
    engine.submit(op.correct)

    const correctPretty = `${ej.correctLabel}. ${ej.correctText}`
    const selectedPretty = `${op.label}. ${op.text}`

    persistExerciseOnce({
      exerciseId, // 'Prisma06'
      temaId,
      classroomId,
      sessionId,
      correct: op.correct,
      answer: {
        selected: selectedPretty,
        correctAnswer: correctPretty,
        latex: ej.questionLatex,
        options: ej.options.map(o => `${o.label}. ${membershipLatex(o.n, o.membership)}`),
        extra: {
          a: ej.a,
          b: ej.b,
          k: ej.k,
          xs: ej.xs,
          ys: ej.ys,
          L: ej.L,
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
        title="Prisma 6 — Conjuntos por comprensión"
        prompt={ej.prompt}
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
                <div className="font-semibold mb-2">✅ Paso 1 — Entender qué significa L</div>

                <div className="rounded-md border bg-background p-3">
                  <div className="font-semibold mb-1">Definición</div>
                  <Tex block tex={setDefinitionLatex(ej.a, ej.b, ej.k)} />
                </div>

                <p className="text-muted-foreground mt-2">
                  Lo leemos así: “L contiene los valores que salen de{' '}
                  <span className="font-semibold">{fmtLinearText(ej.a, ej.b)}</span> cuando{' '}
                  <span className="font-semibold">x</span> es natural y además{' '}
                  <span className="font-semibold">x &lt; {ej.k}</span>”.
                </p>

                <div className="mt-2 rounded-md border bg-background p-3">
                  <div className="font-semibold mb-1">Nota</div>
                  <Tex block tex={`\\mathbb{N} = \\{0,1,2,3,\\dots\\}`} />
                </div>
              </div>

              {/* Paso 2 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 2 — Listar los valores posibles de x</div>

                <p className="text-muted-foreground">
                  Como <Tex tex={`x\\in\\mathbb{N}`} /> y <Tex tex={`x<${ej.k}`} />, entonces:
                </p>

                <div className="mt-2 rounded-md border bg-background p-3">
                  <Tex block tex={`x \\in \\{ ${ej.xs.join(', ')} \\}`} />
                </div>
              </div>

              {/* Paso 3 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">
                  ✅ Paso 3 — Reemplazar cada x en <Tex tex={fmtLinearLatex(ej.a, ej.b)} />
                </div>

                <div className="overflow-x-auto">
                  <table className="border w-full text-center text-xs">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border py-2">x</th>
                        <th className="border py-2">
                          <Tex tex={fmtLinearLatex(ej.a, ej.b)} />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ej.xs.map((x, i) => {
                        const bPart =
                          ej.b === 0 ? '' : ej.b > 0 ? `+ ${ej.b}` : `- ${Math.abs(ej.b)}`
                        return (
                          <tr key={x}>
                            <td className="border py-2 font-semibold">{x}</td>
                            <td className="border py-2">
                              <Tex tex={`${ej.a}\\cdot ${x} ${bPart} = ${ej.ys[i]}`} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3">
                  <div className="font-semibold mb-1">Entonces el conjunto queda:</div>
                  <div className="rounded-md border bg-background p-3">
                    <Tex block tex={`L = ${setToLatex(ej.L)}`} />
                  </div>
                </div>
              </div>

              {/* Paso 4 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 4 — Verificar cada alternativa</div>

                <div className="space-y-2">
                  {ej.options.map(o => {
                    const truth = o.membership === 'in' ? ej.L.includes(o.n) : !ej.L.includes(o.n)
                    return (
                      <div key={o.label} className="flex items-center justify-between gap-3">
                        <div className="font-mono">
                          <span className="font-semibold">{o.label}.</span>{' '}
                          <Tex tex={membershipLatex(o.n, o.membership)} />
                        </div>
                        <div
                          className={[
                            'px-2 py-1 rounded font-semibold text-xs',
                            truth ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                          ].join(' ')}
                        >
                          {truth ? 'VERDADERO' : 'FALSO'}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="font-semibold">Respuesta correcta:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono">
                    {ej.correctLabel}. {ej.correctText}
                  </span>
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        {/* Panel bonito */}
        <div className="rounded-xl border bg-white p-4 mb-4 space-y-3">
          <div className="font-semibold">Definición del conjunto:</div>
          <Tex block tex={setDefinitionLatex(ej.a, ej.b, ej.k)} />

          <div className="text-sm text-muted-foreground">
            Elige la alternativa <span className="font-semibold">verdadera</span>.
          </div>
        </div>

        {/* Opciones */}
        <div className="grid grid-cols-2 gap-4">
          {ej.options.map(op => {
            const isSelected = selected === op.label
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
                <div className="mt-1">
                  <Tex tex={membershipLatex(op.n, op.membership)} />
                </div>
              </button>
            )
          })}
        </div>
      </ExerciseShell>
    </MathJaxContext>
  )
}
