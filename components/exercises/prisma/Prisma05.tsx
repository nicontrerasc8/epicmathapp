'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { ExerciseHud } from '../base/ExerciseHud'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { useExerciseSubmission } from '@/lib/exercises/useExerciseSubmission'
import { useExerciseTimer } from '@/lib/exercises/useExerciseTimer'
import { computeTrophyGain, WRONG_PENALTY } from '@/lib/exercises/gamification'

/* ============================================================
   PRISMA 5 — Implicación falsa (p, q, r, t) + MathJax
   ? 1 SOLO INTENTO (autocalifica al elegir opción)
   ? 100% dinámico (genera literales con ¬ y variables)
   ? Explicación súper detallada + tabla de comprobación
   ? Usa "better-react-mathjax" (NO KaTeX)
============================================================ */

/* =========================
   TIPOS
========================= */
type VarName = 'p' | 'q' | 'r' | 't'

type VarExpr = { type: 'var'; name: VarName }
type NotExpr = { type: 'not'; expr: Expr }
type AndExpr = { type: 'and'; left: Expr; right: Expr }
type OrExpr = { type: 'or'; left: Expr; right: Expr }
type ImpExpr = { type: 'imp'; left: Expr; right: Expr }

type Expr = VarExpr | NotExpr | AndExpr | OrExpr | ImpExpr

type Option = { value: string; correct: boolean }
type Literal = { v: VarName; neg: boolean }

const VARS: VarName[] = ['p', 'q', 'r', 't']

/* =========================
   HELPERS
========================= */
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
function coin(p = 0.5) {
  return Math.random() < p
}
function VF(x: boolean) {
  return x ? 'V' : 'F'
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
    renderActions: { addMenu: [] }, // quita el menú contextual
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
   EVALUACIÓN LÓGICA (4 vars)
========================= */
function evalExpr(expr: Expr, val: Record<VarName, boolean>): boolean {
  switch (expr.type) {
    case 'var':
      return val[expr.name]
    case 'not':
      return !evalExpr(expr.expr, val)
    case 'and':
      return evalExpr(expr.left, val) && evalExpr(expr.right, val)
    case 'or':
      return evalExpr(expr.left, val) || evalExpr(expr.right, val)
    case 'imp':
      // A ? B = (¬A ? B)  (solo es F cuando A=V y B=F)
      return !evalExpr(expr.left, val) || evalExpr(expr.right, val)
  }
}

/* =========================
   LaTeX (MathJax-friendly)
========================= */
function toLatex(expr: Expr): string {
  switch (expr.type) {
    case 'var':
      return expr.name
    case 'not': {
      const inner = expr.expr
      const innerLatex = toLatex(inner)
      const needsParens = inner.type === 'and' || inner.type === 'or' || inner.type === 'imp'
      return needsParens ? `\\neg\\left(${innerLatex}\\right)` : `\\neg ${innerLatex}`
    }
    case 'and':
      return `\\left(${toLatex(expr.left)}\\ \\land\\ ${toLatex(expr.right)}\\right)`
    case 'or':
      return `\\left(${toLatex(expr.left)}\\ \\lor\\ ${toLatex(expr.right)}\\right)`
    case 'imp':
      return `\\left(${toLatex(expr.left)}\\ \\to\\ ${toLatex(expr.right)}\\right)`
  }
}

function litToExpr(l: Literal): Expr {
  const base: Expr = { type: 'var', name: l.v }
  return l.neg ? { type: 'not', expr: base } : base
}
function litToLatex(l: Literal) {
  return l.neg ? `\\neg ${l.v}` : l.v
}

/* =========================
   GENERACIÓN (con solución única)
   Queremos:
     (L1 ? L2) ? (L3 ? L4)
   y sabemos "la proposición es FALSA"
   ? antecedente V y consecuente F

   Para que haya una única respuesta tipo
   “qué proposiciones SON VERDADERAS”
   forzamos que queden EXACTAMENTE 2 variables verdaderas.
========================= */
function buildScenario() {
  for (let tries = 0; tries < 300; tries++) {
    const [a, b, c, d] = shuffle(VARS)

    const L1: Literal = { v: a, neg: coin(0.5) }
    const L2: Literal = { v: b, neg: coin(0.5) }
    const L3: Literal = { v: c, neg: coin(0.5) }
    const L4: Literal = { v: d, neg: coin(0.5) }

    // Forzamos:
    // L1 true, L2 true, L3 false, L4 false
    const val: Record<VarName, boolean> = { p: false, q: false, r: false, t: false }

    // literal debe ser V
    val[L1.v] = L1.neg ? false : true
    val[L2.v] = L2.neg ? false : true

    // literal debe ser F
    val[L3.v] = L3.neg ? true : false
    val[L4.v] = L4.neg ? true : false

    const trueVars = VARS.filter(v => val[v])
    if (trueVars.length !== 2) continue

    const left: Expr = { type: 'and', left: litToExpr(L1), right: litToExpr(L2) }
    const right: Expr = { type: 'or', left: litToExpr(L3), right: litToExpr(L4) }
    const expr: Expr = { type: 'imp', left, right }

    const result = evalExpr(expr, val)
    if (result !== false) continue

    const latex = toLatex(expr)
    const correctPair = `${trueVars[0]}; ${trueVars[1]}`

    // Opciones: pares posibles (6). Elegimos 4 (1 correcta + 3 distractores)
    const allPairs: string[] = []
    for (let i = 0; i < VARS.length; i++) {
      for (let j = i + 1; j < VARS.length; j++) {
        allPairs.push(`${VARS[i]}; ${VARS[j]}`)
      }
    }
    const distractors = shuffle(allPairs.filter(x => x !== correctPair)).slice(0, 3)
    const options: Option[] = shuffle([
      { value: correctPair, correct: true },
      ...distractors.map(v => ({ value: v, correct: false })),
    ])

    // Valores de literales (para explicación)
    const L1_val = L1.neg ? !val[L1.v] : val[L1.v]
    const L2_val = L2.neg ? !val[L2.v] : val[L2.v]
    const L3_val = L3.neg ? !val[L3.v] : val[L3.v]
    const L4_val = L4.neg ? !val[L4.v] : val[L4.v]

    const antecedente = L1_val && L2_val
    const consecuente = L3_val || L4_val

    return {
      expr,
      latex,
      val,
      trueVars,
      correctPair,
      options,
      literals: { L1, L2, L3, L4 },
      check: {
        L1_val,
        L2_val,
        L3_val,
        L4_val,
        antecedente,
        consecuente,
        total: result,
      },
    }
  }

  // Fallback ultra seguro
  const L1: Literal = { v: 'p', neg: false } // p  V
  const L2: Literal = { v: 'q', neg: false } // q  V
  const L3: Literal = { v: 'r', neg: false } // r  F
  const L4: Literal = { v: 't', neg: false } // t  F
  const val: Record<VarName, boolean> = { p: true, q: true, r: false, t: false }
  const left: Expr = { type: 'and', left: litToExpr(L1), right: litToExpr(L2) }
  const right: Expr = { type: 'or', left: litToExpr(L3), right: litToExpr(L4) }
  const expr: Expr = { type: 'imp', left, right }
  const latex = toLatex(expr)
  const trueVars = VARS.filter(v => val[v])
  const correctPair = `${trueVars[0]}; ${trueVars[1]}`
  const options: Option[] = shuffle([
    { value: correctPair, correct: true },
    { value: 'p; r', correct: false },
    { value: 'q; t', correct: false },
    { value: 'r; t', correct: false },
  ])

  return {
    expr,
    latex,
    val,
    trueVars,
    correctPair,
    options,
    literals: { L1, L2, L3, L4 },
    check: {
      L1_val: true,
      L2_val: true,
      L3_val: false,
      L4_val: false,
      antecedente: true,
      consecuente: false,
      total: false,
    },
  }
}

/* =========================
   PRISMA 05 (UI)
========================= */
export default function Prisma05({
  exerciseId,
  classroomId,
  sessionId,
}: {
  exerciseId: string
  classroomId: string
  sessionId?: string
}) {
  const engine = useExerciseEngine({ maxAttempts: 1 })
  const { studentId, gami, gamiLoading, submitAttempt } = useExerciseSubmission({
    exerciseId,
    classroomId,
    sessionId,
  })
  const [nonce, setNonce] = useState(0)
  const { elapsed, startedAtRef } = useExerciseTimer(engine.canAnswer, nonce)
  const trophyPreview = computeTrophyGain(elapsed)
  const [selected, setSelected] = useState<string | null>(null)

  const ejercicio = useMemo(() => buildScenario(), [nonce])

  async function pickOption(op: Option) {
    if (!engine.canAnswer) return

    const timeSeconds = (Date.now() - startedAtRef.current) / 1000

    setSelected(op.value)
    engine.submit(op.correct)

    await submitAttempt({

      correct: op.correct,

      answer: {
        selected: op.value,
        correctAnswer: ejercicio.correctPair,
        latex: ejercicio.latex,
        options: ejercicio.options.map(o => o.value),
        extra: {
          valuation: ejercicio.val,
          trueVars: ejercicio.trueVars,
          literals: {
            L1: { ...ejercicio.literals.L1, latex: litToLatex(ejercicio.literals.L1) },
            L2: { ...ejercicio.literals.L2, latex: litToLatex(ejercicio.literals.L2) },
            L3: { ...ejercicio.literals.L3, latex: litToLatex(ejercicio.literals.L3) },
            L4: { ...ejercicio.literals.L4, latex: litToLatex(ejercicio.literals.L4) },
          },
          check: ejercicio.check,
        },
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  const { L1, L2, L3, L4 } = ejercicio.literals
  const A_latex = `\\left(${litToLatex(L1)}\\ \\land\\ ${litToLatex(L2)}\\right)`
  const B_latex = `\\left(${litToLatex(L3)}\\ \\lor\\ ${litToLatex(L4)}\\right)`

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Implicación falsa (deducción)"
        prompt="Si la proposición compuesta es falsa, indica cuáles proposiciones son verdaderas:"
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
                <div className="font-semibold mb-2">?? Paso 0 — La proposición</div>
                <p className="text-muted-foreground mb-2">
                  Te dicen que la proposición compuesta es <span className="font-semibold">FALSA</span>:
                </p>
                <Tex block tex={ejercicio.latex} />
              </div>

              {/* Paso 1 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 1 — Regla clave de la implicación</div>
                <p className="text-muted-foreground">
                  Una implicación <span className="font-semibold">A ? B</span> solo es{' '}
                  <span className="font-semibold">FALSA</span> en un caso:
                </p>
                <div className="mt-2 rounded-md border bg-background p-3">
                  <Tex block tex={`A\\to B\\text{ es F} \\iff A=V\\ \\text{y}\\ B=F`} />
                  <div className="mt-2 text-muted-foreground">(Es el único caso donde la implicación “falla”.)</div>
                </div>
              </div>

              {/* Paso 2 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 2 — Identificamos A y B</div>
                <p className="text-muted-foreground">Separamos antecedente (A) y consecuente (B):</p>

                <div className="mt-2 space-y-2">
                  <div className="rounded-md border bg-background p-3">
                    <div className="font-semibold mb-1">Antecedente (A)</div>
                    <Tex block tex={`A=${A_latex}`} />
                  </div>

                  <div className="rounded-md border bg-background p-3">
                    <div className="font-semibold mb-1">Consecuente (B)</div>
                    <Tex block tex={`B=${B_latex}`} />
                  </div>
                </div>

                <div className="mt-3 rounded-lg border bg-white p-3">
                  <div className="font-semibold">Como la proposición completa es F, entonces:</div>
                  <div className="mt-1">
                    <Tex block tex={`A=V\\ \\text{y}\\ B=F`} />
                  </div>
                </div>
              </div>

              {/* Paso 3 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 3 — Hacemos que el antecedente sea V</div>
                <p className="text-muted-foreground">
                  El antecedente es una conjunción: <span className="font-semibold">(X ? Y)</span>. Para que sea{' '}
                  <span className="font-semibold">V</span>, ambos deben ser verdaderos.
                </p>

                <div className="mt-2 rounded-md border bg-background p-3">
                  <Tex
                    block
                    tex={`${A_latex}=V\\ \\Rightarrow\\ ${litToLatex(L1)}=V\\ \\text{y}\\ ${litToLatex(L2)}=V`}
                  />
                </div>

                <div className="mt-2 text-muted-foreground">
                  Tip: si <Tex tex={`\\neg p=V`} /> entonces <Tex tex={`p=F`} /> (porque ¬p es verdadera).
                </div>
              </div>

              {/* Paso 4 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 4 — Hacemos que el consecuente sea F</div>
                <p className="text-muted-foreground">
                  El consecuente es una disyunción: <span className="font-semibold">(X ? Y)</span>. Para que sea{' '}
                  <span className="font-semibold">F</span>, ambos deben ser falsos.
                </p>

                <div className="mt-2 rounded-md border bg-background p-3">
                  <Tex
                    block
                    tex={`${B_latex}=F\\ \\Rightarrow\\ ${litToLatex(L3)}=F\\ \\text{y}\\ ${litToLatex(L4)}=F`}
                  />
                </div>

                <div className="mt-2 text-muted-foreground">
                  Tip: si <Tex tex={`\\neg t=F`} /> entonces <Tex tex={`t=V`} /> (porque ¬t es falsa).
                </div>
              </div>

              {/* Paso 5 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 5 — Valores de p, q, r, t</div>

                <div className="overflow-x-auto">
                  <table className="border w-full text-center text-xs">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border py-2">Variable</th>
                        <th className="border py-2">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {VARS.map(v => (
                        <tr key={v}>
                          <td className="border py-2 font-semibold">{v}</td>
                          <td className="border py-2">{VF(ejercicio.val[v])}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 rounded-lg border bg-white p-3">
                  <div className="font-semibold">? Proposiciones verdaderas:</div>
                  <div className="mt-1">
                    <span className="inline-block px-2 py-1 rounded bg-muted font-mono">
                      {ejercicio.trueVars.join(' y ')}
                    </span>
                  </div>
                  <div className="mt-2 text-muted-foreground">
                    Por eso la alternativa correcta es: <span className="font-semibold">{ejercicio.correctPair}</span>
                  </div>
                </div>
              </div>

              {/* Paso 6 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 6 — Comprobación rápida</div>
                <p className="text-muted-foreground">
                  Confirmamos: queda <span className="font-semibold">A = V</span> y{' '}
                  <span className="font-semibold">B = F</span>, por lo tanto{' '}
                  <span className="font-semibold">A ? B = F</span>.
                </p>

                <div className="mt-2 overflow-x-auto">
                  <table className="border w-full text-center text-xs">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border py-2">
                          <Tex tex={litToLatex(L1)} />
                        </th>
                        <th className="border py-2">
                          <Tex tex={litToLatex(L2)} />
                        </th>
                        <th className="border py-2">
                          <Tex tex={`A\\ (=\\land)`} />
                        </th>
                        <th className="border py-2">
                          <Tex tex={litToLatex(L3)} />
                        </th>
                        <th className="border py-2">
                          <Tex tex={litToLatex(L4)} />
                        </th>
                        <th className="border py-2">
                          <Tex tex={`B\\ (=\\lor)`} />
                        </th>
                        <th className="border py-2">
                          <Tex tex={`A\\to B`} />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border py-2 font-semibold">{VF(ejercicio.check.L1_val)}</td>
                        <td className="border py-2 font-semibold">{VF(ejercicio.check.L2_val)}</td>
                        <td className="border py-2 font-semibold">{VF(ejercicio.check.antecedente)}</td>
                        <td className="border py-2 font-semibold">{VF(ejercicio.check.L3_val)}</td>
                        <td className="border py-2 font-semibold">{VF(ejercicio.check.L4_val)}</td>
                        <td className="border py-2 font-semibold">{VF(ejercicio.check.consecuente)}</td>
                        <td className="border py-2 font-semibold">{VF(ejercicio.check.total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-2 rounded-md border bg-background p-3">
                  <div className="font-semibold mb-1">?? Mini recordatorio</div>
                  <Tex block tex={`A\\to B\\text{ es F solo si }(A=V\\ \\wedge\\ B=F)`} />
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        {/* Enunciado */}
        <div className="rounded-xl border bg-white p-4 mb-4">
          <div className="font-semibold mb-2">Proposición:</div>
          <Tex block tex={ejercicio.latex} />
          <div className="mt-2 text-muted-foreground">
            Sabiendo que es <span className="font-semibold">FALSA</span>, elige el par de proposiciones verdaderas.
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
                <span className="font-mono">{op.value}</span>
              </button>
            )
          })}
        </div>
        <div className="mt-6">
          <ExerciseHud
            elapsed={elapsed}
            trophyPreview={trophyPreview}
            gami={gami}
            gamiLoading={gamiLoading}
            studentId={studentId}
            wrongPenalty={WRONG_PENALTY}
            status={engine.status}
          />
        </div>      </ExerciseShell>
    </MathJaxContext>
  )
}








