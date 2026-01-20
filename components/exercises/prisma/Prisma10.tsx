'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 10 — Conjuntos A y B + validar 4 afirmaciones (I–IV)
   (A ? B, B ? A, A = B, A ? B)
   ? 1 SOLO INTENTO (autocalifica al elegir opción)
   ? 100% dinámico: genera A explícito y B por comprensión
   ? MathJax PRO: datos, afirmaciones y solución con TeX
   ? Persist con la MISMA firma que Prisma01/05
============================================================ */

type Option = { label: 'A' | 'B' | 'C' | 'D'; value: string; correct: boolean }

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function coin(p = 0.5) {
  return Math.random() < p
}
function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}
function uniq(nums: number[]) {
  return Array.from(new Set(nums)).sort((a, b) => a - b)
}

function buildUniverse(limit: number) {
  // N incluyendo 0, hasta < limit
  return Array.from({ length: limit }, (_, i) => i)
}
function buildB_evenLessThan(limit: number) {
  return buildUniverse(limit).filter(x => x % 2 === 0)
}

function isSubset(A: number[], B: number[]) {
  const setB = new Set(B)
  return A.every(x => setB.has(x))
}
function isEqual(A: number[], B: number[]) {
  if (A.length !== B.length) return false
  return A.every((x, i) => x === B[i])
}

/* =========================
   GENERACIÓN A y B
   B: { x / x?N, x es par, x < m }
   A: conjunto explícito, según escenario
========================= */
type Scenario = 'equal' | 'A_subset_B' | 'B_subset_A' | 'mix'

function pickEvenFromB(B: number[], k: number) {
  return uniq(shuffle(B).slice(0, k))
}
function pickOddNotInB(limit: number, count: number) {
  const odds: number[] = []
  for (let x = 1; x < limit; x += 2) odds.push(x)
  return uniq(shuffle(odds).slice(0, count))
}

function makeA_forScenario(B: number[], limit: number, scenario: Scenario) {
  if (scenario === 'equal') return [...B]

  if (scenario === 'A_subset_B') {
    const size = Math.max(2, B.length - randInt(1, 2))
    return pickEvenFromB(B, size)
  }

  if (scenario === 'B_subset_A') {
    const extraCount = randInt(1, 3)
    return uniq([...B, ...pickOddNotInB(limit, extraCount)])
  }

  // mix: A comparte varios pares con B, pero también mete impares (ni subset ni igual normalmente)
  const keepSome = pickEvenFromB(B, Math.max(2, B.length - randInt(1, 3)))
  const addOdds = pickOddNotInB(limit, randInt(2, 4))
  return uniq([...keepSome, ...addOdds])
}

/* =========================
   EVALUAR AFIRMACIONES I–IV
========================= */
function evalStatements(A: number[], B: number[]) {
  const A_sub_B = isSubset(A, B) && !isEqual(A, B)
  const B_sub_A = isSubset(B, A) && !isEqual(A, B)
  const A_eq_B = isEqual(A, B)
  const A_neq_B = !A_eq_B
  const bits = [A_sub_B, B_sub_A, A_eq_B, A_neq_B].map(v => (v ? 'V' : 'F')).join('')
  return { A_sub_B, B_sub_A, A_eq_B, A_neq_B, bits }
}

/* =========================
   OPCIONES (patrones)
========================= */
function flipBits(s: string, flips: number) {
  const arr = s.split('')
  const idxs = new Set<number>()
  while (idxs.size < flips) idxs.add(randInt(0, arr.length - 1))
  idxs.forEach(i => (arr[i] = arr[i] === 'V' ? 'F' : 'V'))
  return arr.join('')
}

function generateOptions(correct: string): Option[] {
  const set = new Set<string>()
  while (set.size < 3) {
    const cand = flipBits(correct, coin(0.7) ? 1 : 2)
    if (cand !== correct) set.add(cand)
  }

  const distractors = Array.from(set).slice(0, 3)
  const labels: Option['label'][] = ['A', 'B', 'C', 'D']
  const all = shuffle([
    { value: correct, correct: true },
    ...distractors.map(v => ({ value: v, correct: false })),
  ])

  return all.map((o, i) => ({ label: labels[i], ...o }))
}

/* =========================
   GENERADOR COMPLETO
========================= */
function generateExercise() {
  for (let tries = 0; tries < 220; tries++) {
    const limit = randInt(8, 14)
    const B = buildB_evenLessThan(limit)
    if (B.length < 4) continue

    const scenario: Scenario = (() => {
      const r = Math.random()
      if (r < 0.45) return 'equal'
      if (r < 0.65) return 'A_subset_B'
      if (r < 0.85) return 'B_subset_A'
      return 'mix'
    })()

    const A = makeA_forScenario(B, limit, scenario)
    const res = evalStatements(A, B)

    if (res.bits === 'FFFF' || res.bits === 'VVVV') continue

    const options = generateOptions(res.bits)
    return { limit, A, B, res, options, scenario }
  }

  // fallback
  const limit = 10
  const B = buildB_evenLessThan(limit) // {0,2,4,6,8}
  const A = [0, 2, 4, 6, 8]
  const res = evalStatements(A, B)
  const options = [
    { label: 'A', value: 'VVVV', correct: false },
    { label: 'B', value: 'VVVF', correct: true },
    { label: 'C', value: 'VFVF', correct: false },
    { label: 'D', value: 'VFFV', correct: false },
  ] as Option[]
  return { limit, A, B, res, options, scenario: 'equal' as Scenario }
}

/* =========================
   MathJax Config + Tex helper
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
   TeX helpers (conjuntos)
========================= */
function setTeX(nums: number[]) {
  return `\\{${nums.join(', ')}\\}`
}
function listCandidatesTeX(limit: number) {
  if (limit <= 1) return `\\{0\\}`
  return `\\{0,1,2,\\dots,${limit - 1}\\}`
}

/* =========================
   PRISMA 10 — UI
========================= */
export default function Prisma10({
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

  const ej = useMemo(() => generateExercise(), [nonce])

  // para explicación fina
  const setA = new Set(ej.A)
  const setB = new Set(ej.B)
  const AminusB = ej.A.filter(x => !setB.has(x))
  const BminusA = ej.B.filter(x => !setA.has(x))

  const Atex = setTeX(ej.A)
  const Btex = setTeX(ej.B)
  const BdefTex = `B=\\{x\\in\\mathbb{N}\\mid x\\ \\text{es par},\\ x<${ej.limit}\\}`
  const AdefTex = `A=${Atex}`

  const prompt =
    `Si: A = { ${ej.A.join('; ')} }  y  B = { x / x ? N ; x es par, x < ${ej.limit} }.\n` +
    `Entonces la validez de las afirmaciones I–IV es:`

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelected(op.value)
    engine.submit(op.correct)

    // Persist (misma firma que Prisma01)
    persistExerciseOnce({
      exerciseId, // ej: 'Prisma10'
      classroomId,
      sessionId,

      correct: op.correct,

      answer: {
        selected: op.value,
        correctAnswer: ej.res.bits,
        latex: `\\text{Sea } ${AdefTex}\\ \\text{y}\\ ${BdefTex}.\\ \\text{Evalúa I–IV.}`,
        options: ej.options.map(o => o.value),
        extra: {
          A: ej.A,
          B: ej.B,
          limit: ej.limit,
          scenario: ej.scenario,
          statements: {
            I_A_subset_B: ej.res.A_sub_B,
            II_B_subset_A: ej.res.B_sub_A,
            III_A_eq_B: ej.res.A_eq_B,
            IV_A_neq_B: ej.res.A_neq_B,
          },
          diffs: { AminusB, BminusA },
          latexParts: { A: Atex, B: Btex, Bdef: BdefTex },
        },
      },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  // helpers “profe”
  const A_is_subset_B_plain = isSubset(ej.A, ej.B)
  const B_is_subset_A_plain = isSubset(ej.B, ej.A)
  const A_eq_B_plain = isEqual(ej.A, ej.B)

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 10 — Relaciones entre conjuntos (I–IV)"
        prompt={prompt}
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
                <div className="font-semibold mb-2">?? Paso 0 — Qué significa cada afirmación</div>
                <div className="space-y-2 text-muted-foreground">
                  <div>
                    <Tex tex={`A\\subset B`} /> significa: todo elemento de A está en B,
                    <span className="font-semibold"> y además </span>
                    <Tex tex={`A\\neq B`} /> (subconjunto propio).
                  </div>
                  <div>
                    <Tex tex={`A=B`} /> significa: tienen exactamente los mismos elementos.
                  </div>
                  <div>
                    <Tex tex={`A\\neq B`} /> significa: al menos un elemento está en uno y no en el otro.
                  </div>
                </div>
              </div>

              {/* Paso 1 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 1 — Construimos el conjunto B</div>
                <div className="rounded border p-3">
                  <Tex block tex={BdefTex} />
                </div>

                <div className="mt-3 rounded-md border bg-background p-3">
                  <div className="font-semibold mb-1">Primero: candidatos</div>
                  <div className="text-muted-foreground">
                    Como <Tex tex={`x<${ej.limit}`} /> y <Tex tex={`x\\in\\mathbb{N}`} />, probamos:
                  </div>
                  <div className="mt-2 rounded border p-3 bg-white">
                    <Tex block tex={`x\\in ${listCandidatesTeX(ej.limit)}`} />
                  </div>

                  <div className="font-semibold mt-3 mb-1">Luego: solo pares</div>
                  <div className="text-muted-foreground">Nos quedamos con los que cumplen “x es par”.</div>

                  <div className="mt-2 inline-block rounded bg-muted px-3 py-2 font-mono">
                    B = {ej.B.join('; ')}
                  </div>

                  <div className="mt-2 rounded border p-3 bg-white">
                    <Tex block tex={`B=${Btex}`} />
                  </div>
                </div>
              </div>

              {/* Paso 2 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 2 — Ya tenemos A</div>
                <div className="mt-2 rounded border p-3 bg-white">
                  <Tex block tex={AdefTex} />
                </div>
              </div>

              {/* Paso 3 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 3 — Comparamos A y B (idea clave)</div>

                <div className="rounded-md border bg-background p-3">
                  <div className="font-semibold mb-1">Miramos qué “sobra” en cada uno</div>
                  <p className="text-muted-foreground">
                    Si hay elementos en A que no están en B, entonces <Tex tex={`A\\not\\subseteq B`} />.
                    Si hay elementos en B que no están en A, entonces <Tex tex={`B\\not\\subseteq A`} />.
                  </p>

                  <div className="mt-3 grid md:grid-cols-2 gap-3">
                    <div className="rounded border bg-white p-3">
                      <div className="font-semibold mb-1">
                        <Tex tex={`A\\setminus B`} /> (en A pero no en B)
                      </div>
                      <div className="mt-2 font-mono">
                        {AminusB.length === 0 ? 'Ø (vacío)' : `{ ${AminusB.join('; ')} }`}
                      </div>
                    </div>

                    <div className="rounded border bg-white p-3">
                      <div className="font-semibold mb-1">
                        <Tex tex={`B\\setminus A`} /> (en B pero no en A)
                      </div>
                      <div className="mt-2 font-mono">
                        {BminusA.length === 0 ? 'Ø (vacío)' : `{ ${BminusA.join('; ')} }`}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-muted-foreground">
                    Si ambos son vacíos, entonces <Tex tex={`A=B`} />.
                  </div>
                </div>
              </div>

              {/* Paso 4 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 4 — Evaluamos I, II, III y IV</div>

                <div className="space-y-3">
                  {/* I */}
                  <div className="rounded border bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">
                        I. <Tex tex={`A\\subset B`} />
                      </div>
                      <div
                        className={[
                          'px-2 py-1 rounded font-semibold text-xs',
                          ej.res.A_sub_B ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                        ].join(' ')}
                      >
                        {ej.res.A_sub_B ? 'VERDADERO' : 'FALSO'}
                      </div>
                    </div>

                    <div className="mt-2 text-muted-foreground">
                      {A_is_subset_B_plain ? (
                        A_eq_B_plain ? (
                          <>
                            Todo A está en B, pero además <Tex tex={`A=B`} />. Entonces NO es subconjunto propio.
                          </>
                        ) : (
                          <>
                            Todo elemento de A está en B y <Tex tex={`A\\neq B`} />. Entonces sí: <Tex tex={`A\\subset B`} />.
                          </>
                        )
                      ) : (
                        <>
                          Hay elementos en A que no están en B (mira <Tex tex={`A\\setminus B`} />), así que no puede ser{' '}
                          <Tex tex={`A\\subset B`} />.
                        </>
                      )}
                    </div>
                  </div>

                  {/* II */}
                  <div className="rounded border bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">
                        II. <Tex tex={`B\\subset A`} />
                      </div>
                      <div
                        className={[
                          'px-2 py-1 rounded font-semibold text-xs',
                          ej.res.B_sub_A ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                        ].join(' ')}
                      >
                        {ej.res.B_sub_A ? 'VERDADERO' : 'FALSO'}
                      </div>
                    </div>

                    <div className="mt-2 text-muted-foreground">
                      {B_is_subset_A_plain ? (
                        A_eq_B_plain ? (
                          <>
                            Todo B está en A, pero como <Tex tex={`A=B`} /> entonces NO es subconjunto propio.
                          </>
                        ) : (
                          <>
                            Todo elemento de B está en A y <Tex tex={`A\\neq B`} />. Entonces sí: <Tex tex={`B\\subset A`} />.
                          </>
                        )
                      ) : (
                        <>
                          Hay elementos en B que no están en A (mira <Tex tex={`B\\setminus A`} />), así que no puede ser{' '}
                          <Tex tex={`B\\subset A`} />.
                        </>
                      )}
                    </div>
                  </div>

                  {/* III */}
                  <div className="rounded border bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">
                        III. <Tex tex={`A=B`} />
                      </div>
                      <div
                        className={[
                          'px-2 py-1 rounded font-semibold text-xs',
                          ej.res.A_eq_B ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                        ].join(' ')}
                      >
                        {ej.res.A_eq_B ? 'VERDADERO' : 'FALSO'}
                      </div>
                    </div>

                    <div className="mt-2 text-muted-foreground">
                      {A_eq_B_plain ? (
                        <>
                          No sobra nada en ninguno: <Tex tex={`A\\setminus B=\\varnothing`} /> y{' '}
                          <Tex tex={`B\\setminus A=\\varnothing`} />. Entonces <Tex tex={`A=B`} />.
                        </>
                      ) : (
                        <>Como al menos uno de los dos conjuntos tiene “algo que sobra”, no pueden ser iguales.</>
                      )}
                    </div>
                  </div>

                  {/* IV */}
                  <div className="rounded border bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">
                        IV. <Tex tex={`A\\neq B`} />
                      </div>
                      <div
                        className={[
                          'px-2 py-1 rounded font-semibold text-xs',
                          ej.res.A_neq_B ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                        ].join(' ')}
                      >
                        {ej.res.A_neq_B ? 'VERDADERO' : 'FALSO'}
                      </div>
                    </div>

                    <div className="mt-2 text-muted-foreground">
                      {ej.res.A_neq_B ? (
                        <>
                          Basta que exista un elemento que esté en uno y no en el otro. Por eso <Tex tex={`A\\neq B`} />.
                        </>
                      ) : (
                        <>
                          Si ya vimos que <Tex tex={`A=B`} />, entonces <Tex tex={`A\\neq B`} /> es falso.
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="font-semibold">Patrón final (I–IV):</div>
                  <div className="mt-1 inline-block rounded bg-muted px-3 py-2 font-mono text-base">
                    {ej.res.bits}
                  </div>
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        {/* Datos */}
        <div className="rounded-xl border bg-white p-4 mb-4 text-sm space-y-3">
          <div className="font-semibold">Datos:</div>

          <div className="rounded border p-3 bg-white space-y-2">
            <Tex block tex={AdefTex} />
            <Tex block tex={BdefTex} />
          </div>

          <div className="mt-2 font-semibold">Afirmaciones:</div>
          <div className="grid gap-1">
            <div className="rounded border bg-white p-2">
              <Tex tex={`\\text{I. }\\ A\\subset B`} />
            </div>
            <div className="rounded border bg-white p-2">
              <Tex tex={`\\text{II. }\\ B\\subset A`} />
            </div>
            <div className="rounded border bg-white p-2">
              <Tex tex={`\\text{III. }\\ A=B`} />
            </div>
            <div className="rounded border bg-white p-2">
              <Tex tex={`\\text{IV. }\\ A\\neq B`} />
            </div>
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



