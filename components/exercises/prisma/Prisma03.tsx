'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 3 — Esquemas moleculares con p,q,r desde aritmética
   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ Todo dinámico (p,q,r cambian y la respuesta cambia)
   ✅ Ahora con MathJax (better-react-mathjax) como Prisma 17
   ✅ Explicación detallada tipo profe (pasos + reglas)
============================================================ */

/* =========================
   MathJax Config (igual estilo Prisma 17)
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
   TIPOS
========================= */
type VarName = 'p' | 'q' | 'r'

type Atom = {
  name: VarName
  statement: string // lo que ve el alumno
  value: boolean // V/F real
  steps: string[] // explicación (cálculos)
}

type Option = { value: string; correct: boolean }

/* =========================
   HELPERS
========================= */
function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function coin(p = 0.5) {
  return Math.random() < p
}
function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function powi(a: number, b: number) {
  let x = 1
  for (let i = 0; i < b; i++) x *= a
  return x
}

function VF(x: boolean) {
  return x ? 'V' : 'F'
}

/* =========================
   LaTeX helpers (para mostrar bonito)
========================= */
function vfLatex(b: boolean) {
  return b ? '\\text{V}' : '\\text{F}'
}
function statementToLatex(s: string) {
  // 2^3 -> 2^{3}
  return s.replace(/(\d+)\^(\d+)/g, (_, a, b) => `${a}^{${b}}`).replace(/≠/g, '\\ne')
}
function schemaToLatex(s: string) {
  return s.replace(/∧/g, '\\land').replace(/→/g, '\\to')
}

function stepToLatex(step: string) {
  // Caso "Comparo: 17 ≠ 18  →  F"
  if (step.startsWith('Comparo:')) {
    const m = step.match(
      /Comparo:\s*([0-9]+)\s*([=≠><])\s*([0-9]+)\s*→\s*([VF])/
    )
    if (m) {
      const left = m[1]
      const opRaw = m[2]
      const right = m[3]
      const res = m[4] === 'V' ? '\\text{V}' : '\\text{F}'
      const op = opRaw === '≠' ? '\\ne' : opRaw
      return `${left}\\;${op}\\;${right}\\;\\Rightarrow\\;${res}`
    }
  }

  // General: potencia / flecha / distinto
  return statementToLatex(step).replace(/→/g, '\\Rightarrow')
}

/* =========================
   LÓGICA
========================= */
function AND(a: boolean, b: boolean) {
  return a && b
}
function OR(a: boolean, b: boolean) {
  return a || b
}
function IMP(a: boolean, b: boolean) {
  // A → B ≡ (~A ∨ B)
  return !a || b
}

/* =========================
   GENERADOR DE ATÓMICAS (p,q,r)
========================= */
function genAtom(name: VarName): Atom {
  const kind = choice(['expSumEq', 'squareEq', 'pythIneq'] as const)
  const makeTrue = coin(0.6)

  if (kind === 'expSumEq') {
    const a = randInt(2, 5)
    const b = randInt(2, 4)
    const c = randInt(2, 5)
    const d = randInt(2, 4)

    const v1 = powi(a, b)
    const v2 = powi(c, d)
    const left = v1 + v2

    const delta = randInt(1, 6) * (coin(0.5) ? 1 : -1)
    const right = makeTrue ? left : left + delta

    const statement = `${a}^${b} + ${c}^${d} = ${right}`
    const value = left === right

    return {
      name,
      statement,
      value,
      steps: [
        `${a}^${b} = ${v1}`,
        `${c}^${d} = ${v2}`,
        `${v1} + ${v2} = ${left}`,
        `Comparo: ${left} ${value ? '=' : '≠'} ${right}  →  ${VF(value)}`,
      ],
    }
  }

  if (kind === 'squareEq') {
    const x = randInt(3, 15)
    const left = x * x
    const delta = randInt(1, 12) * (coin(0.5) ? 1 : -1)
    const right = makeTrue ? left : Math.max(1, left + delta)

    const statement = `${x}^2 = ${right}`
    const value = left === right

    return {
      name,
      statement,
      value,
      steps: [
        `${x}^2 = ${left}`,
        `Comparo: ${left} ${value ? '=' : '≠'} ${right}  →  ${VF(value)}`,
      ],
    }
  }

  // pythIneq
  const triples = [
    { x: 3, y: 4, z: 5 },
    { x: 5, y: 12, z: 13 },
    { x: 8, y: 15, z: 17 },
    { x: 7, y: 24, z: 25 },
  ]
  const t = choice(triples)
  const x = t.x
  const y = t.y

  const base = t.z
  let z = base
  if (makeTrue) {
    z = Math.max(2, base - 1)
  } else {
    z = coin(0.7) ? base : base + 1
  }

  const left = x * x + y * y
  const right = z * z
  const value = left > right

  const statement = `${x}^2 + ${y}^2 > ${z}^2`

  return {
    name,
    statement,
    value,
    steps: [
      `${x}^2 = ${x * x}`,
      `${y}^2 = ${y * y}`,
      `${x * x} + ${y * y} = ${left}`,
      `${z}^2 = ${right}`,
      `Comparo: ${left} > ${right}  →  ${VF(value)}`,
    ],
  }
}

/* =========================
   ESQUEMAS MOLECULARES
========================= */
const SCHEMAS = [
  { id: 'E1', text: '(p ∧ q) → r' },
  { id: 'E2', text: '(p → r) ∧ q' },
  { id: 'E3', text: 'p ∧ (q → r)' },
] as const

function evalSchemas(p: boolean, q: boolean, r: boolean) {
  const e1 = IMP(AND(p, q), r)
  const e2 = AND(IMP(p, r), q)
  const e3 = AND(p, IMP(q, r))
  const bits = [e1, e2, e3].map(VF).join('')
  return { e1, e2, e3, bits }
}

function ruleTextForSchema(id: (typeof SCHEMAS)[number]['id']) {
  if (id === 'E1') {
    return [
      'Primero calculamos (p ∧ q).',
      'Luego aplicamos la implicación: A → B solo es F cuando A=V y B=F.',
    ]
  }
  if (id === 'E2') {
    return [
      'Primero calculamos (p → r).',
      'Luego hacemos conjunción con q: (A ∧ B) solo es V cuando ambos son V.',
    ]
  }
  return [
    'Primero calculamos (q → r).',
    'Luego hacemos conjunción con p: (A ∧ B) solo es V cuando ambos son V.',
  ]
}

/* =========================
   OPCIONES (8 patrones posibles, 4 alternativas)
========================= */
const ALL_BITS = ['VVV', 'VVF', 'VFV', 'VFF', 'FVV', 'FVF', 'FFV', 'FFF']

function generateOptions(correct: string): Option[] {
  const pool = ALL_BITS.filter(x => x !== correct)
  const a = choice(pool)
  const b = choice(pool.filter(x => x !== a))
  const c = choice(pool.filter(x => x !== a && x !== b))
  const options: Option[] = [
    { value: correct, correct: true },
    { value: a, correct: false },
    { value: b, correct: false },
    { value: c, correct: false },
  ]
  return options.sort(() => Math.random() - 0.5)
}

/* =========================
   UI — PRISMA 03 (con MathJax)
========================= */
export default function Prisma03({ temaPeriodoId }: { temaPeriodoId: string }) {
  const engine = useExerciseEngine({ maxAttempts: 1 })

  const [nonce, setNonce] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)

  const ejercicio = useMemo(() => {
    const p = genAtom('p')
    const q = genAtom('q')
    const r = genAtom('r')

    const res = evalSchemas(p.value, q.value, r.value)
    const correct = res.bits
    const options = generateOptions(correct)

    // para guardar bonito en persistencia
    const questionLatex = `\\begin{aligned}
p:&\\ ${statementToLatex(p.statement)}\\\\
q:&\\ ${statementToLatex(q.statement)}\\\\
r:&\\ ${statementToLatex(r.statement)}\\\\[4pt]
1)&\\ ${schemaToLatex(SCHEMAS[0].text)}\\\\
2)&\\ ${schemaToLatex(SCHEMAS[1].text)}\\\\
3)&\\ ${schemaToLatex(SCHEMAS[2].text)}
\\end{aligned}`

    return { p, q, r, res, correct, options, questionLatex }
  }, [nonce])

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelected(op.value)
    engine.submit(op.correct)

    persistExerciseOnce({
      temaPeriodoId,
      exerciseKey: 'Prisma03',
      prompt:
        `Sean: p: ${ejercicio.p.statement}, q: ${ejercicio.q.statement}, r: ${ejercicio.r.statement}. ` +
        `Elige el patrón V/F (en orden) para: ${SCHEMAS.map(s => s.text).join(', ')}.`,
      questionLatex: ejercicio.questionLatex,
      options: ejercicio.options.map(o => o.value),
      correctAnswer: ejercicio.correct,
      userAnswer: op.value,
      isCorrect: op.correct,
      extra: {
        atoms: {
          p: { statement: ejercicio.p.statement, value: ejercicio.p.value },
          q: { statement: ejercicio.q.statement, value: ejercicio.q.value },
          r: { statement: ejercicio.r.statement, value: ejercicio.r.value },
        },
        schemas: SCHEMAS.map(s => s.text),
        truthBitsCorrect: ejercicio.correct,
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
        title="Prisma 3 — Esquemas moleculares (p,q,r)"
        prompt="Calcula el patrón V/F (en orden 1,2,3) para los tres esquemas moleculares."
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
                <div className="font-semibold mb-2">✅ Paso 1 — Primero hallamos p, q y r</div>

                <div className="grid md:grid-cols-3 gap-3">
                  {[ejercicio.p, ejercicio.q, ejercicio.r].map(atom => (
                    <div key={atom.name} className="rounded-lg border bg-white p-3">
                      <div className="font-semibold mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="uppercase">{atom.name}:</span>
                          <Tex tex={statementToLatex(atom.statement)} />
                        </div>
                        <span className="inline-block px-2 py-0.5 rounded bg-muted font-semibold">
                          {VF(atom.value)}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {atom.steps.map((s, i) => (
                          <div key={i} className="rounded-md border bg-background p-2">
                            <Tex block tex={stepToLatex(s)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Paso 2 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 2 — Evaluamos cada esquema molecular</div>

                <div className="rounded-md border bg-background p-3 text-xs text-muted-foreground">
                  <div className="font-semibold text-foreground mb-1">Recordatorio rápido</div>
                  <div>• \(A \\land B\) solo es V si ambos son V.</div>
                  <div>• \(A \\to B\) solo es F si \(A=V\) y \(B=F\).</div>
                </div>

                <div className="mt-3 space-y-3">
                  {/* E1 */}
                  <div className="rounded-lg border p-3">
                    <div className="font-semibold mb-1">
                      1) <Tex tex={schemaToLatex(SCHEMAS[0].text)} />
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {ruleTextForSchema('E1').map((t, i) => (
                        <div key={i}>• {t}</div>
                      ))}
                    </div>

                    <div className="mt-2 space-y-2">
                      <div className="rounded-md border bg-background p-2">
                        <Tex
                          block
                          tex={`p\\land q = ${vfLatex(ejercicio.p.value)}\\land ${vfLatex(
                            ejercicio.q.value
                          )} = ${vfLatex(AND(ejercicio.p.value, ejercicio.q.value))}`}
                        />
                      </div>
                      <div className="rounded-md border bg-background p-2">
                        <Tex
                          block
                          tex={`(p\\land q)\\to r = ${vfLatex(
                            AND(ejercicio.p.value, ejercicio.q.value)
                          )}\\to ${vfLatex(ejercicio.r.value)} = ${vfLatex(ejercicio.res.e1)}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* E2 */}
                  <div className="rounded-lg border p-3">
                    <div className="font-semibold mb-1">
                      2) <Tex tex={schemaToLatex(SCHEMAS[1].text)} />
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {ruleTextForSchema('E2').map((t, i) => (
                        <div key={i}>• {t}</div>
                      ))}
                    </div>

                    <div className="mt-2 space-y-2">
                      <div className="rounded-md border bg-background p-2">
                        <Tex
                          block
                          tex={`p\\to r = ${vfLatex(ejercicio.p.value)}\\to ${vfLatex(
                            ejercicio.r.value
                          )} = ${vfLatex(IMP(ejercicio.p.value, ejercicio.r.value))}`}
                        />
                      </div>
                      <div className="rounded-md border bg-background p-2">
                        <Tex
                          block
                          tex={`(p\\to r)\\land q = ${vfLatex(
                            IMP(ejercicio.p.value, ejercicio.r.value)
                          )}\\land ${vfLatex(ejercicio.q.value)} = ${vfLatex(ejercicio.res.e2)}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* E3 */}
                  <div className="rounded-lg border p-3">
                    <div className="font-semibold mb-1">
                      3) <Tex tex={schemaToLatex(SCHEMAS[2].text)} />
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {ruleTextForSchema('E3').map((t, i) => (
                        <div key={i}>• {t}</div>
                      ))}
                    </div>

                    <div className="mt-2 space-y-2">
                      <div className="rounded-md border bg-background p-2">
                        <Tex
                          block
                          tex={`q\\to r = ${vfLatex(ejercicio.q.value)}\\to ${vfLatex(
                            ejercicio.r.value
                          )} = ${vfLatex(IMP(ejercicio.q.value, ejercicio.r.value))}`}
                        />
                      </div>
                      <div className="rounded-md border bg-background p-2">
                        <Tex
                          block
                          tex={`p\\land(q\\to r) = ${vfLatex(ejercicio.p.value)}\\land ${vfLatex(
                            IMP(ejercicio.q.value, ejercicio.r.value)
                          )} = ${vfLatex(ejercicio.res.e3)}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Paso 3 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 3 — Respuesta final (en orden 1,2,3)</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Patrón:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">
                    {ejercicio.correct}
                  </span>
                </div>
                <div className="mt-2 text-muted-foreground text-xs">
                  (Ese patrón corresponde a los valores de verdad de los esquemas 1, 2 y 3 en ese orden.)
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        {/* Enunciado visual con MathJax (en lugar de solo texto con ^) */}
        <div className="rounded-xl border bg-white p-4 mb-4 space-y-3">
          <div className="font-semibold">Sean:</div>

          <div className="grid md:grid-cols-3 gap-3">
            {([ejercicio.p, ejercicio.q, ejercicio.r] as const).map(atom => (
              <div key={atom.name} className="rounded-lg border bg-background p-3">
                <div className="font-semibold mb-1">
                  {atom.name}:{' '}
                  <span className="font-normal">
                    <Tex tex={statementToLatex(atom.statement)} />
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="font-semibold">Esquemas (orden 1, 2, 3):</div>
          <div className="space-y-1">
            {SCHEMAS.map((s, i) => (
              <div key={s.id} className="rounded-lg border bg-background p-2">
                <span className="font-semibold mr-2">{i + 1})</span>
                <Tex tex={schemaToLatex(s.text)} />
              </div>
            ))}
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
                <div className="font-mono text-lg">{op.value}</div>
              </button>
            )
          })}
        </div>
      </ExerciseShell>
    </MathJaxContext>
  )
}
