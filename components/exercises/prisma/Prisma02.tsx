'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 2 — Valores de verdad (con operaciones) + LaTeX (MathJax)
   ✅ Usa "better-react-mathjax" (NO KaTeX)
   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ Generación algorítmica (sin hardcode)
   ✅ Explicación súper detallada (V/F por partes)
   ✅ Opciones estilo "VVVF"
============================================================ */

/* =========================
   TIPOS
========================= */
type ArithOp = '+' | '-'
type LogicOp = 'or' | 'and' | 'imp' | 'iff'

type Atom = {
  a: number
  op: ArithOp
  b: number
  shown: number // lo que aparece a la derecha del "="
}

type Prop = {
  id: 'I' | 'II' | 'III' | 'IV'
  left: Atom
  op: LogicOp
  right: Atom
}

type Option = {
  label: 'A' | 'B' | 'C' | 'D'
  value: string // ej: "VVVF"
  correct: boolean
}

/* =========================
   HELPERS
========================= */
function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function coin(p = 0.5) {
  return Math.random() < p
}
function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

/* =========================
   MathJax Config (igual Prisma17)
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
   EVALUACIÓN ARITMÉTICA
========================= */
function arithValue(atom: Atom): number {
  return atom.op === '+' ? atom.a + atom.b : atom.a - atom.b
}
function evalAtom(atom: Atom): boolean {
  return arithValue(atom) === atom.shown
}

/* =========================
   EVALUACIÓN LÓGICA (A op B)
========================= */
function evalLogic(op: LogicOp, A: boolean, B: boolean): boolean {
  switch (op) {
    case 'and':
      return A && B
    case 'or':
      return A || B
    case 'imp':
      // A → B solo es F cuando A=V y B=F
      return !A || B
    case 'iff':
      // A ↔ B es V cuando tienen el mismo valor
      return A === B
  }
}

/* =========================
   SÍMBOLOS / REGLAS (texto)
========================= */
const LOGIC_SYMBOL: Record<LogicOp, string> = {
  or: '∨',
  and: '∧',
  imp: '→',
  iff: '↔',
}

const LOGIC_RULE: Record<LogicOp, string> = {
  and: 'Conjunción (A ∧ B): solo es V cuando A es V Y B es V.',
  or: 'Disyunción (A ∨ B): es V cuando al menos una (A o B) es V. Solo es F si ambas son F.',
  imp: 'Condicional (A → B): SOLO es F cuando A es V y B es F. En los demás casos es V.',
  iff: 'Bicondicional (A ↔ B): es V cuando A y B tienen el mismo valor (V,V o F,F).',
}

/* =========================
   LaTeX builders
========================= */
const LOGIC_LATEX: Record<LogicOp, string> = {
  or: '\\vee',
  and: '\\wedge',
  imp: '\\to',
  iff: '\\leftrightarrow',
}

function atomLatex(a: Atom) {
  const op = a.op === '+' ? '+' : '-'
  return `\\left(${a.a} ${op} ${a.b} = ${a.shown}\\right)`
}
function atomCalcLatex(a: Atom) {
  const op = a.op === '+' ? '+' : '-'
  return `${a.a} ${op} ${a.b} = ${arithValue(a)}`
}
function propLatex(p: Prop) {
  return `${atomLatex(p.left)}\\; ${LOGIC_LATEX[p.op]}\\; ${atomLatex(p.right)}`
}
function propsBlockLatex(props: Prop[]) {
  // I..IV en un aligned bonito
  return [
    '\\begin{aligned}',
    ...props.map(
      p => `\\text{${p.id}.}\\;& ${propLatex(p)}\\\\`
    ),
    '\\end{aligned}',
  ].join('\n')
}

/* =========================
   TEXTO BONITO (fallback / persist)
========================= */
function atomText(a: Atom) {
  return `(${a.a} ${a.op} ${a.b} = ${a.shown})`
}
function atomCalcText(a: Atom) {
  return `${a.a} ${a.op} ${a.b} = ${arithValue(a)}`
}
function VF(x: boolean) {
  return x ? 'V' : 'F'
}
function propText(p: Prop) {
  return `${atomText(p.left)} ${LOGIC_SYMBOL[p.op]} ${atomText(p.right)}`
}

/* =========================
   GENERACIÓN DE ÁTOMOS
========================= */
function generateAtom(): Atom {
  const op: ArithOp = coin(0.55) ? '+' : '-'

  let a = randInt(1, 12)
  let b = randInt(1, 12)

  // si es resta, preferimos a>=b
  if (op === '-' && b > a) {
    const tmp = a
    a = b
    b = tmp
  }

  const real = op === '+' ? a + b : a - b
  const makeTrue = coin(0.55)

  let shown = real
  if (!makeTrue) {
    const delta = coin(0.7) ? 1 : randInt(2, 4)
    shown = coin(0.5) ? real + delta : real - delta
    if (shown === real) shown = real + 1
    if (shown < 0) shown = real + delta // evita negativos raros
  }

  return { a, op, b, shown }
}

/* =========================
   GENERACIÓN DE PROPOSICIONES I–IV
========================= */
function evalProp(p: Prop) {
  const A = evalAtom(p.left)
  const B = evalAtom(p.right)
  return { A, B, value: evalLogic(p.op, A, B) }
}

function generateProps(): Prop[] {
  const ids: Array<Prop['id']> = ['I', 'II', 'III', 'IV']
  const ops: LogicOp[] = shuffle(['or', 'imp', 'and', 'iff'])

  return ids.map((id, i) => ({
    id,
    left: generateAtom(),
    op: ops[i],
    right: generateAtom(),
  }))
}

function patternFromProps(props: Prop[]): string {
  return props.map(p => VF(evalProp(p).value)).join('')
}

function isTrivialPattern(bits: string) {
  return bits === 'VVVV' || bits === 'FFFF'
}

/* =========================
   OPCIONES (A–D)
========================= */
function flipBits(s: string, flips: number): string {
  const arr = s.split('')
  const idxs = new Set<number>()
  while (idxs.size < flips) idxs.add(randInt(0, arr.length - 1))
  idxs.forEach(i => (arr[i] = arr[i] === 'V' ? 'F' : 'V'))
  return arr.join('')
}

function generateOptions(correct: string): Option[] {
  const set = new Set<string>()
  while (set.size < 3) {
    const flips = coin(0.7) ? 1 : 2
    const cand = flipBits(correct, flips)
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
   EJERCICIO (generator robusto)
========================= */
function generateExercise() {
  for (let t = 0; t < 200; t++) {
    const props = generateProps()
    const bits = patternFromProps(props)

    if (isTrivialPattern(bits)) continue
    if (!bits.includes('V') || !bits.includes('F')) continue

    const options = generateOptions(bits)
    return { props, correct: bits, options }
  }

  // fallback
  const props: Prop[] = [
    {
      id: 'I',
      left: { a: 2, op: '+', b: 7, shown: 9 },
      op: 'or',
      right: { a: 6, op: '-', b: 2, shown: 5 },
    },
    {
      id: 'II',
      left: { a: 4, op: '-', b: 3, shown: 2 },
      op: 'imp',
      right: { a: 2, op: '-', b: 7, shown: 1 },
    },
    {
      id: 'III',
      left: { a: 3, op: '+', b: 4, shown: 7 },
      op: 'and',
      right: { a: 6, op: '-', b: 2, shown: 3 },
    },
    {
      id: 'IV',
      left: { a: 3, op: '-', b: 4, shown: 10 },
      op: 'iff',
      right: { a: 9, op: '-', b: 4, shown: 3 },
    },
  ]
  const correct = patternFromProps(props)
  const options = generateOptions(correct)
  return { props, correct, options }
}

/* =========================
   PRISMA 02 (UI) + MathJax
========================= */
export default function Prisma02({ temaPeriodoId }: { temaPeriodoId: string }) {
  const engine = useExerciseEngine({ maxAttempts: 1 })

  const [nonce, setNonce] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)

  const ejercicio = useMemo(() => generateExercise(), [nonce])

  const propsLatex = useMemo(
    () => propsBlockLatex(ejercicio.props),
    [ejercicio.props]
  )

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelected(op.value)
    engine.submit(op.correct)

    persistExerciseOnce({
      temaPeriodoId,
      exerciseKey: 'Prisma02',
      prompt:
        'Indica el patrón (V/F) de las proposiciones I–IV. Elige la alternativa correcta.',
      questionLatex: propsLatex,
      options: ejercicio.options.map(o => `${o.label}. ${o.value}`),
      correctAnswer: ejercicio.correct,
      userAnswer: op.value,
      isCorrect: op.correct,
      extra: {
        propsLatex,
        props: ejercicio.props.map(p => ({
          id: p.id,
          left: atomText(p.left),
          op: LOGIC_SYMBOL[p.op],
          right: atomText(p.right),
          eval: evalProp(p),
        })),
        correctBits: ejercicio.correct,
        selectedBits: op.value,
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
        title="Prisma 2 — Valores de verdad (I–IV)"
        prompt="Indica los valores de verdad de las proposiciones I–IV y elige el patrón correcto (ej: VVVF)."
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <div className="space-y-4 text-sm leading-relaxed">
              {/* Idea clave */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Idea clave</div>
                <p className="text-muted-foreground">
                  Para cada proposición (I, II, III, IV) hacemos esto:
                  <span className="font-semibold">
                    {' '}
                    (1) resolvemos cada igualdad → V o F, y (2) aplicamos el conector (∨, ∧, →, ↔).
                  </span>{' '}
                  Al final juntamos 4 letras en orden: I, II, III, IV.
                </p>
              </div>

              {/* Proposiciones */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">📌 Proposiciones del ejercicio</div>
                <div className="rounded-md border bg-background p-3">
                  <Tex block tex={propsLatex} />
                </div>
              </div>

              {/* Resolución paso a paso */}
              <div>
                <div className="font-semibold mb-2">✅ Resolución paso a paso</div>

                <div className="space-y-3">
                  {ejercicio.props.map(p => {
                    const res = evalProp(p)

                    const leftTF = evalAtom(p.left)
                    const rightTF = evalAtom(p.right)

                    const leftCalc = atomCalcLatex(p.left)
                    const rightCalc = atomCalcLatex(p.right)

                    const eqLeft = atomLatex(p.left)
                    const eqRight = atomLatex(p.right)

                    return (
                      <div key={p.id} className="rounded-lg border bg-white p-3">
                        <div className="font-semibold mb-2">
                          {p.id}. Evaluamos:
                        </div>

                        <div className="rounded-md border bg-background p-3">
                          <Tex block tex={propLatex(p)} />
                        </div>

                        <div className="mt-3 grid md:grid-cols-2 gap-3">
                          {/* Izquierda */}
                          <div className="rounded-lg border p-3">
                            <div className="font-semibold mb-1">Paso 1 — Izquierda</div>
                            <div className="mt-2 space-y-2">
                              <Tex block tex={eqLeft} />
                              <Tex
                                block
                                tex={`\\text{Calculamos: } ${leftCalc} \\;\\Rightarrow\\; \\text{ entonces es }\\; \\mathbf{${VF(
                                  leftTF
                                )}}`}
                              />
                            </div>
                          </div>

                          {/* Derecha */}
                          <div className="rounded-lg border p-3">
                            <div className="font-semibold mb-1">Paso 2 — Derecha</div>
                            <div className="mt-2 space-y-2">
                              <Tex block tex={eqRight} />
                              <Tex
                                block
                                tex={`\\text{Calculamos: } ${rightCalc} \\;\\Rightarrow\\; \\text{ entonces es }\\; \\mathbf{${VF(
                                  rightTF
                                )}}`}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Conector */}
                        <div className="mt-3 rounded-lg border p-3">
                          <div className="font-semibold mb-1">Paso 3 — Aplicamos el conector</div>
                          <div className="text-muted-foreground mb-2">{LOGIC_RULE[p.op]}</div>

                          <div className="space-y-2">
                            <Tex
                              block
                              tex={`${VF(res.A)}\\; ${LOGIC_LATEX[p.op]}\\; ${VF(res.B)}\\;=\\; \\mathbf{${VF(
                                res.value
                              )}}`}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Respuesta final */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Respuesta final</div>
                <p className="text-muted-foreground">
                  Juntamos los valores en orden <span className="font-semibold">I, II, III, IV</span>.
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <span className="font-semibold">Patrón:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">
                    {ejercicio.correct}
                  </span>
                </div>

                <div className="mt-3 rounded-md border bg-background p-3">
                  <div className="font-semibold mb-1">🧠 Mini-chequeo</div>
                  <p className="text-muted-foreground">
                    Si te sale raro, revisa primero cada igualdad (Paso 1 y 2). Luego recién aplica la regla del conector.
                  </p>
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        {/* Enunciado visible arriba de las opciones */}
        <div className="rounded-xl border bg-white p-4 mb-4">
          <div className="font-semibold mb-2">Indica los valores de verdad:</div>
          <div className="rounded-md border bg-background p-3">
            <Tex block tex={propsLatex} />
          </div>
        </div>

        {/* Opciones A–D */}
        <div className="grid grid-cols-2 gap-4">
          {ejercicio.options.map(op => {
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
