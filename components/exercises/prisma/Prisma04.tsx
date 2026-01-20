'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 4 — "Si ( ... ) ? ( ... ) es FALSA, halla p, q, r"
   ? MathJax (better-react-mathjax)
   ? 1 SOLO INTENTO (autocalifica al elegir opción)
   ? Generación dinámica (sin hardcode)
   ? Persist en formato NUEVO (como Prisma01)
============================================================ */

/* =========================
   TIPOS
========================= */
type VarName = 'p' | 'q' | 'r'
type Literal = { name: VarName; negated: boolean }
type Option = { value: string; correct: boolean }

function coin(p = 0.5) {
  return Math.random() < p
}
function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
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
   FORMATO (LaTeX)
========================= */
function litTex(l: Literal) {
  return l.negated ? `\\neg ${l.name}` : `${l.name}`
}

function exprTex(antP: Literal, antQ: Literal, consR: Literal) {
  return `\\left(\\left(${litTex(antP)} \\land ${litTex(antQ)}\\right) \\to ${litTex(consR)}\\right)`
}

function vf(b: boolean) {
  return b ? 'V' : 'F'
}

function toBits(p: boolean, q: boolean, r: boolean) {
  return `${p ? 'V' : 'F'}${q ? 'V' : 'F'}${r ? 'V' : 'F'}`
}

/* =========================
   LÓGICA: (A ? B) es F  =>  A = V  y  B = F
========================= */
function valueForLiteralToBeTrue(l: Literal): boolean {
  // literal verdadero:
  // p => p=V
  // ¬p => p=F
  return l.negated ? false : true
}

function valueForLiteralToBeFalse(l: Literal): boolean {
  // literal falso:
  // p => p=F
  // ¬p => p=V
  return l.negated ? true : false
}

/* =========================
   GENERADOR DINÁMICO
========================= */
function generateExercise() {
  const antP: Literal = { name: 'p', negated: coin(0.5) }
  const antQ: Literal = { name: 'q', negated: coin(0.5) }
  const consR: Literal = { name: 'r', negated: coin(0.5) }

  const latex = exprTex(antP, antQ, consR)

  // Implicación falsa => antecedente V y consecuente F
  // Antecedente: (lit(p) ? lit(q)) sea V => ambos literales sean V
  const pVal = valueForLiteralToBeTrue(antP)
  const qVal = valueForLiteralToBeTrue(antQ)

  // Consecuente debe ser F
  const rVal = valueForLiteralToBeFalse(consR)

  const correctBits = toBits(pVal, qVal, rVal)

  return {
    latex,
    antP,
    antQ,
    consR,
    pVal,
    qVal,
    rVal,
    correctBits,
  }
}

/* =========================
   OPCIONES
========================= */
function generateOptions(correct: string): Option[] {
  const set = new Set<string>()
  set.add(correct)

  while (set.size < 4) {
    const arr = correct.split('')
    const flips = coin(0.7) ? 1 : 2
    const idxs = new Set<number>()
    while (idxs.size < flips) idxs.add(randInt(0, 2)) // 0..2 (p,q,r)
    idxs.forEach(i => (arr[i] = arr[i] === 'V' ? 'F' : 'V'))
    set.add(arr.join(''))
  }

  return Array.from(set)
    .slice(0, 4)
    .sort(() => Math.random() - 0.5)
    .map(v => ({ value: v, correct: v === correct }))
}

/* =========================
   UI
========================= */
export default function Prisma04({
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
    const options = generateOptions(ex.correctBits)
    return { ...ex, options }
  }, [nonce])

  const antecedentTex = `\\left(${litTex(ejercicio.antP)} \\land ${litTex(ejercicio.antQ)}\\right)`
  const consequentTex = `${litTex(ejercicio.consR)}`

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelected(op.value)
    engine.submit(op.correct)

    // ? Persist NUEVO (igual estructura que Prisma01)
    persistExerciseOnce({
      exerciseId, // ej: 'Prisma04'
      classroomId,
      sessionId,

      correct: op.correct,

      answer: {
        selected: op.value,
        correctAnswer: ejercicio.correctBits,
        latex: ejercicio.latex,
        options: ejercicio.options.map(o => o.value),
        extra: {
          target: 'F',
          antecedentTex,
          consequentTex,
          derived: {
            p: vf(ejercicio.pVal),
            q: vf(ejercicio.qVal),
            r: vf(ejercicio.rVal),
          },
          literals: {
            antP: { ...ejercicio.antP },
            antQ: { ...ejercicio.antQ },
            consR: { ...ejercicio.consR },
          },
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
        title="Implicación falsa: halla p, q, r"
        prompt="Si la proposición es falsa, determina los valores de verdad de p, q y r."
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
                <div className="font-semibold mb-2">?? Paso 0 — Identificar A y B</div>
                <p className="text-muted-foreground">
                  La proposición tiene forma <span className="font-semibold">A ? B</span>. Aquí:
                </p>

                <div className="mt-2 space-y-2">
                  <div className="rounded-md border bg-background p-3">
                    <div className="text-muted-foreground mb-1">Expresión del ejercicio:</div>
                    <Tex block tex={ejercicio.latex} />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="inline-block px-2 py-1 rounded bg-muted font-mono">
                      A = {litTex(ejercicio.antP)} ? {litTex(ejercicio.antQ)}
                    </span>
                    <span className="inline-block px-2 py-1 rounded bg-muted font-mono">
                      B = {litTex(ejercicio.consR)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Paso 1 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 1 — Regla clave de la implicación</div>

                <div className="rounded-md border bg-background p-3">
                  <p className="text-muted-foreground">
                    Regla clave: <span className="font-semibold">(A ? B)</span> <span className="font-semibold">SOLO</span> es falsa cuando
                    <span className="font-semibold"> A es V</span> y <span className="font-semibold">B es F</span>.
                  </p>
                  <div className="mt-2">
                    <Tex block tex={`(A \\to B)=\\text{F} \\;\\Rightarrow\\; A=\\text{V} \\;\\text{y}\\; B=\\text{F}`} />
                  </div>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="border w-full text-center text-xs">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border py-2">A</th>
                        <th className="border py-2">B</th>
                        <th className="border py-2">A ? B</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border py-2">V</td>
                        <td className="border py-2">V</td>
                        <td className="border py-2 font-semibold">V</td>
                      </tr>
                      <tr>
                        <td className="border py-2">V</td>
                        <td className="border py-2">F</td>
                        <td className="border py-2 font-semibold bg-red-50">F</td>
                      </tr>
                      <tr>
                        <td className="border py-2">F</td>
                        <td className="border py-2">V</td>
                        <td className="border py-2 font-semibold">V</td>
                      </tr>
                      <tr>
                        <td className="border py-2">F</td>
                        <td className="border py-2">F</td>
                        <td className="border py-2 font-semibold">V</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-3">
                  Como el enunciado dice que la proposición es <span className="font-semibold">FALSA</span>, entonces:
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="inline-block px-2 py-1 rounded bg-muted font-mono">Antecedente A = V</span>
                    <span className="inline-block px-2 py-1 rounded bg-muted font-mono">Consecuente B = F</span>
                  </div>
                </div>
              </div>

              {/* Paso 2 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 2 — Hallar p y q desde el antecedente</div>

                <div className="rounded-md border bg-background p-3">
                  <p className="text-muted-foreground">
                    El antecedente es una conjunción: <span className="font-semibold">(X ? Y)</span>. Eso es verdadero{' '}
                    <span className="font-semibold">solo</span> si ambos son verdaderos.
                  </p>
                  <div className="mt-2">
                    <Tex block tex={`(X \\land Y)=\\text{V} \\;\\Rightarrow\\; X=\\text{V}\\;\\text{y}\\; Y=\\text{V}`} />
                  </div>
                </div>

                <div className="mt-3">
                  Aquí el antecedente es:
                  <div className="mt-2">
                    <Tex block tex={antecedentTex} />
                  </div>
                  Para que sea <span className="font-semibold">V</span>, ambos literales deben ser <span className="font-semibold">V</span>.
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="border w-full text-center text-xs">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border py-2">Literal</th>
                        <th className="border py-2">Debe ser</th>
                        <th className="border py-2">Entonces</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border py-2">
                          <Tex tex={litTex(ejercicio.antP)} />
                        </td>
                        <td className="border py-2 font-semibold">V</td>
                        <td className="border py-2">
                          p = <span className="font-semibold">{vf(ejercicio.pVal)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="border py-2">
                          <Tex tex={litTex(ejercicio.antQ)} />
                        </td>
                        <td className="border py-2 font-semibold">V</td>
                        <td className="border py-2">
                          q = <span className="font-semibold">{vf(ejercicio.qVal)}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-2 text-muted-foreground">
                  Tip de negación: <span className="font-mono">¬q = V</span> implica <span className="font-mono">q = F</span>.
                  <div className="mt-1">
                    <Tex tex={`\\neg X \\text{ invierte el valor de } X`} />
                  </div>
                </div>
              </div>

              {/* Paso 3 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 3 — Hallar r desde el consecuente</div>

                <div className="mt-2">
                  El consecuente es:
                  <div className="mt-2">
                    <Tex block tex={consequentTex} />
                  </div>
                  y debe ser <span className="font-semibold">F</span>.
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="border w-full text-center text-xs">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border py-2">Consecuente</th>
                        <th className="border py-2">Debe ser</th>
                        <th className="border py-2">Entonces</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border py-2">
                          <Tex tex={consequentTex} />
                        </td>
                        <td className="border py-2 font-semibold">F</td>
                        <td className="border py-2">
                          r = <span className="font-semibold">{vf(ejercicio.rVal)}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-2 text-muted-foreground">
                  Tip: si el consecuente es <span className="font-mono">¬r</span> y te dicen que es <span className="font-mono">F</span>,
                  entonces <span className="font-mono">r</span> tiene que ser <span className="font-mono">V</span>.
                </div>
              </div>

              {/* Paso 4 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 4 — Respuesta final</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">(p,q,r) =</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">
                    {ejercicio.correctBits}
                  </span>
                  <span className="text-muted-foreground">(en ese orden: p luego q luego r)</span>
                </div>

                <div className="mt-2 text-muted-foreground">
                  En valores: p={vf(ejercicio.pVal)}, q={vf(ejercicio.qVal)}, r={vf(ejercicio.rVal)}.
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        {/* Card de expresión */}
        <div className="rounded-xl border bg-white p-4 mb-4">
          <div className="font-semibold mb-2">Expresión:</div>
          <Tex block tex={ejercicio.latex} />
          <div className="mt-2 text-sm text-muted-foreground">
            Recuerda: te dicen que esta implicación es <span className="font-semibold">F</span>.
          </div>
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
                <div className="text-xs text-muted-foreground mt-1">(p,q,r)</div>
              </button>
            )
          })}
        </div>
      </ExerciseShell>
    </MathJaxContext>
  )
}



