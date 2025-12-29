'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 1 — Tablas de verdad (p, q) + MathJax (better-react-mathjax)
   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ Generación algorítmica (sin hardcode)
   ✅ Explicación tipo profe + subexpresiones + tablas por paso
============================================================ */

/* =========================
   TIPOS (TS PRO)
========================= */
type VarName = 'p' | 'q'

type VarExpr = { type: 'var'; name: VarName }
type NotExpr = { type: 'not'; expr: Expr }
type AndExpr = { type: 'and'; left: Expr; right: Expr }
type OrExpr = { type: 'or'; left: Expr; right: Expr }
type ImpExpr = { type: 'imp'; left: Expr; right: Expr }

type Expr = VarExpr | NotExpr | AndExpr | OrExpr | ImpExpr

type Option = { value: string; correct: boolean }

const VARS: VarName[] = ['p', 'q']
const BIN_OPS: Array<'and' | 'or' | 'imp'> = ['and', 'or', 'imp']

const COMBINATIONS = [
  { p: true, q: true },
  { p: true, q: false },
  { p: false, q: true },
  { p: false, q: false },
] as const

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
   HELPERS
========================= */
function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function coin(p = 0.5) {
  return Math.random() < p
}
function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

/* =========================
   EVALUACIÓN LÓGICA (exacta)
========================= */
function evalExpr(expr: Expr, p: boolean, q: boolean): boolean {
  switch (expr.type) {
    case 'var':
      return expr.name === 'p' ? p : q
    case 'not':
      return !evalExpr(expr.expr, p, q)
    case 'and':
      return evalExpr(expr.left, p, q) && evalExpr(expr.right, p, q)
    case 'or':
      return evalExpr(expr.left, p, q) || evalExpr(expr.right, p, q)
    case 'imp':
      // A → B ≡ (~A ∨ B)   (solo es F cuando A=V y B=F)
      return !evalExpr(expr.left, p, q) || evalExpr(expr.right, p, q)
  }
}

/* =========================
   TEX / PRETTY
========================= */
// TeX “bonito” (para MathJax)
function toTeX(expr: Expr): string {
  switch (expr.type) {
    case 'var':
      return expr.name
    case 'not': {
      const inner = expr.expr
      const innerTeX = toTeX(inner)
      const needsParens = inner.type === 'and' || inner.type === 'or' || inner.type === 'imp'
      return needsParens ? `\\lnot\\left(${innerTeX}\\right)` : `\\lnot ${innerTeX}`
    }
    case 'and':
      return `\\left(${toTeX(expr.left)}\\ \\land\\ ${toTeX(expr.right)}\\right)`
    case 'or':
      return `\\left(${toTeX(expr.left)}\\ \\lor\\ ${toTeX(expr.right)}\\right)`
    case 'imp':
      return `\\left(${toTeX(expr.left)}\\ \\to\\ ${toTeX(expr.right)}\\right)`
  }
}

// Texto “rápido” (para logs / prompt sin MathJax)
function toPretty(expr: Expr): string {
  switch (expr.type) {
    case 'var':
      return expr.name
    case 'not': {
      const inner = expr.expr
      const needsParens = inner.type === 'and' || inner.type === 'or' || inner.type === 'imp'
      return needsParens ? `~(${toPretty(inner)})` : `~${toPretty(inner)}`
    }
    case 'and':
      return `(${toPretty(expr.left)} ∧ ${toPretty(expr.right)})`
    case 'or':
      return `(${toPretty(expr.left)} ∨ ${toPretty(expr.right)})`
    case 'imp':
      return `(${toPretty(expr.left)} → ${toPretty(expr.right)})`
  }
}

function truthBits(expr: Expr): string {
  return COMBINATIONS.map(c => (evalExpr(expr, c.p, c.q) ? 'V' : 'F')).join('')
}

function nodeCount(expr: Expr): number {
  switch (expr.type) {
    case 'var':
      return 1
    case 'not':
      return 1 + nodeCount(expr.expr)
    case 'and':
    case 'or':
    case 'imp':
      return 1 + nodeCount(expr.left) + nodeCount(expr.right)
  }
}

function usesVar(expr: Expr, name: VarName): boolean {
  switch (expr.type) {
    case 'var':
      return expr.name === name
    case 'not':
      return usesVar(expr.expr, name)
    case 'and':
    case 'or':
    case 'imp':
      return usesVar(expr.left, name) || usesVar(expr.right, name)
  }
}

/* =========================
   SIMPLIFICACIÓN LIGHT
========================= */
function isStructurallyEqual(a: Expr, b: Expr): boolean {
  if (a.type !== b.type) return false
  switch (a.type) {
    case 'var':
      return b.type === 'var' && a.name === b.name
    case 'not':
      return b.type === 'not' && isStructurallyEqual(a.expr, b.expr)
    case 'and':
    case 'or':
    case 'imp':
      return (
        b.type === a.type &&
        isStructurallyEqual(a.left, (b as any).left) &&
        isStructurallyEqual(a.right, (b as any).right)
      )
  }
}

function simplify(expr: Expr): Expr {
  if (expr.type === 'not' && expr.expr.type === 'not') {
    return simplify(expr.expr.expr) // ~~X => X
  }

  if (expr.type === 'not') {
    return { type: 'not', expr: simplify(expr.expr) }
  }

  if (expr.type === 'and' || expr.type === 'or' || expr.type === 'imp') {
    const left = simplify(expr.left)
    const right = simplify(expr.right)

    if (isStructurallyEqual(left, right)) {
      return { ...expr, left, right } as Expr
    }

    return { ...expr, left, right } as Expr
  }

  return expr
}

/* =========================
   RESTRICCIONES DE NIVEL
========================= */
function isTautology(bits: string) {
  return bits === 'VVVV'
}
function isContradiction(bits: string) {
  return bits === 'FFFF'
}
function isDirectVar(bits: string) {
  // orden TT,TF,FT,FF
  // p: VVFF | q: VFVF | ~p: FFVV | ~q: FVFV
  return bits === 'VVFF' || bits === 'VFVF' || bits === 'FFVV' || bits === 'FVFV'
}

function isQualityExpr(expr: Expr): boolean {
  const bits = truthBits(expr)

  if (!usesVar(expr, 'p') || !usesVar(expr, 'q')) return false
  if (isTautology(bits) || isContradiction(bits) || isDirectVar(bits)) return false

  const n = nodeCount(expr)
  if (n < 3) return false
  if (n > 11) return false

  return true
}

/* =========================
   GENERADOR ALGORTÍTMICO
========================= */
function generateExpr(depth: number, maxDepth: number): Expr {
  if (depth >= maxDepth) {
    return { type: 'var', name: choice(VARS) }
  }

  const r = Math.random()

  if (r < 0.35) return { type: 'var', name: choice(VARS) }
  if (r < 0.55) return { type: 'not', expr: generateExpr(depth + 1, maxDepth) }

  const op = choice(BIN_OPS)
  if (op === 'and') return { type: 'and', left: generateExpr(depth + 1, maxDepth), right: generateExpr(depth + 1, maxDepth) }
  if (op === 'or') return { type: 'or', left: generateExpr(depth + 1, maxDepth), right: generateExpr(depth + 1, maxDepth) }
  return { type: 'imp', left: generateExpr(depth + 1, maxDepth), right: generateExpr(depth + 1, maxDepth) }
}

function generateQualityExpr(): Expr {
  for (let tries = 0; tries < 160; tries++) {
    const md = tries < 110 ? 3 : 4
    const expr = simplify(generateExpr(0, md))
    if (isQualityExpr(expr)) return expr
  }

  const fallback: Expr = {
    type: 'and',
    left: { type: 'imp', left: { type: 'var', name: 'p' }, right: { type: 'var', name: 'q' } },
    right: { type: 'imp', left: { type: 'not', expr: { type: 'var', name: 'q' } }, right: { type: 'not', expr: { type: 'var', name: 'p' } } },
  }
  return simplify(fallback)
}

/* =========================
   DISTRACTORES SERIOS
========================= */
function flipBitString(s: string, flips: number): string {
  const arr = s.split('')
  const idxs = new Set<number>()
  while (idxs.size < flips) idxs.add(randInt(0, arr.length - 1))
  idxs.forEach(i => (arr[i] = arr[i] === 'V' ? 'F' : 'V'))
  return arr.join('')
}

function mutateExprOneStep(expr: Expr): Expr {
  const r = Math.random()

  if (r < 0.33) return simplify({ type: 'not', expr })

  if (r < 0.66) {
    const swap = (e: Expr): Expr => {
      if (e.type === 'var') return { type: 'var', name: e.name === 'p' ? 'q' : 'p' }
      if (e.type === 'not') return { type: 'not', expr: swap(e.expr) }
      return { ...(e as any), left: swap((e as any).left), right: swap((e as any).right) } as Expr
    }
    return simplify(swap(expr))
  }

  const changeOp = (e: Expr): Expr => {
    if (e.type === 'and' || e.type === 'or' || e.type === 'imp') {
      const ops = BIN_OPS.filter(x => x !== e.type)
      const newOp = choice(ops)
      if (newOp === 'and') return { type: 'and', left: e.left, right: e.right }
      if (newOp === 'or') return { type: 'or', left: e.left, right: e.right }
      return { type: 'imp', left: e.left, right: e.right }
    }
    if (e.type === 'not') return { type: 'not', expr: changeOp(e.expr) }
    return e
  }

  return simplify(changeOp(expr))
}

function generateOptions(correct: string, expr: Expr): Option[] {
  const set = new Set<string>()

  while (set.size < 2) {
    const flips = coin(0.7) ? 1 : 2
    const cand = flipBitString(correct, flips)
    if (cand !== correct) set.add(cand)
  }

  for (let k = 0; k < 40 && set.size < 3; k++) {
    const bits = truthBits(mutateExprOneStep(expr))
    if (bits !== correct && !isTautology(bits) && !isContradiction(bits)) set.add(bits)
  }

  while (set.size < 3) {
    const cand = flipBitString(correct, 2)
    if (cand !== correct) set.add(cand)
  }

  const distractors = Array.from(set).slice(0, 3)
  return [
    { value: correct, correct: true },
    ...distractors.map(v => ({ value: v, correct: false })),
  ].sort(() => Math.random() - 0.5)
}

/* =========================
   EXPLICACIÓN (subexpresiones)
========================= */
function serialize(expr: Expr): string {
  switch (expr.type) {
    case 'var':
      return expr.name
    case 'not':
      return `not(${serialize(expr.expr)})`
    case 'and':
      return `and(${serialize(expr.left)},${serialize(expr.right)})`
    case 'or':
      return `or(${serialize(expr.left)},${serialize(expr.right)})`
    case 'imp':
      return `imp(${serialize(expr.left)},${serialize(expr.right)})`
  }
}

function isBinary(expr: Expr): expr is AndExpr | OrExpr | ImpExpr {
  return expr.type === 'and' || expr.type === 'or' || expr.type === 'imp'
}

function getSubexpressionsInOrder(expr: Expr): Expr[] {
  const out: Expr[] = []
  const seen = new Set<string>()

  const walk = (e: Expr) => {
    if (e.type === 'var') return

    if (e.type === 'not') walk(e.expr)
    else if (isBinary(e)) {
      walk(e.left)
      walk(e.right)
    }

    const k = serialize(e)
    if (!seen.has(k)) {
      seen.add(k)
      out.push(e)
    }
  }

  walk(expr)
  return out
}

function opRuleText(e: Expr): string {
  if (e.type === 'not') {
    return 'Regla de negación: invierte el valor. (V → F, F → V)'
  }
  if (e.type === 'and') {
    return 'Regla de conjunción (A ∧ B): solo es V si A es V y B es V. Si falla una, es F.'
  }
  if (e.type === 'or') {
    return 'Regla de disyunción (A ∨ B): es V si al menos una es V. Solo es F si ambas son F.'
  }
  return 'Regla de implicación (A → B): solo es F cuando A es V y B es F. En los demás casos es V.'
}

function evalBitsForExpr(e: Expr): string {
  return COMBINATIONS.map(c => (evalExpr(e, c.p, c.q) ? 'V' : 'F')).join('')
}

function detailedNarrative(expr: Expr) {
  const sub = getSubexpressionsInOrder(expr)
  const finalTeX = toTeX(expr)
  const finalBits = truthBits(expr)
  return { sub, finalTeX, finalBits }
}

/* =========================
   PRISMA 01 (UI)
========================= */
export default function Prisma01({ temaPeriodoId }: { temaPeriodoId: string }) {
  const engine = useExerciseEngine({ maxAttempts: 1 })
  const [nonce, setNonce] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)

  const ejercicio = useMemo(() => {
    const expr = generateQualityExpr()
    const pretty = toPretty(expr)
    const tex = toTeX(expr)
    const correct = truthBits(expr)
    const options = generateOptions(correct, expr)
    const explain = detailedNarrative(expr)
    return { expr, pretty, tex, correct, options, explain }
  }, [nonce])

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelected(op.value)
    engine.submit(op.correct)

    persistExerciseOnce({
      temaPeriodoId,
      exerciseKey: 'Prisma01',
      prompt: 'Elige la alternativa correcta: la tabla de verdad de la proposición es…',
      questionLatex: ejercicio.tex,
      options: ejercicio.options.map(o => o.value),
      correctAnswer: ejercicio.correct,
      userAnswer: op.value,
      isCorrect: op.correct,
      extra: {
        truthBitsCorrect: ejercicio.correct,
        selectedBits: op.value,
        pretty: ejercicio.pretty,
        tex: ejercicio.tex,
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
        title="Prisma 1 — Tablas de verdad"
        prompt="Elige la alternativa correcta: la tabla de verdad de la proposición es…"
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
                <div className="font-semibold mb-2">👀 Paso 0 — Qué estamos buscando</div>
                <p className="text-muted-foreground">
                  Vamos a evaluar la proposición en 4 filas (TT, TF, FT, FF). Al final obtendremos un
                  “código” de 4 letras (V/F). Ese código debe coincidir con una alternativa.
                </p>
              </div>

              {/* Paso 1 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 1 — Orden de filas (SIEMPRE el mismo)</div>

                <div className="mt-2 overflow-x-auto">
                  <table className="border w-full text-center text-xs">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border py-2">Fila</th>
                        <th className="border py-2">p</th>
                        <th className="border py-2">q</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COMBINATIONS.map((c, i) => (
                        <tr key={i}>
                          <td className="border py-2">{i + 1}</td>
                          <td className="border py-2">{c.p ? 'V' : 'F'}</td>
                          <td className="border py-2">{c.q ? 'V' : 'F'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 rounded-md border bg-background p-3">
                  <div className="font-semibold mb-1">Tip</div>
                  <p className="text-muted-foreground">
                    Si cambias el orden de filas, te cambia el “código” final, aunque hayas hecho bien las reglas.
                  </p>
                </div>
              </div>

              {/* Paso 2 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 2 — Proposición a evaluar</div>
                <p className="text-muted-foreground">
                  Esta es la proposición del ejercicio. La evaluaremos de adentro hacia afuera (subexpresiones).
                </p>
                <div className="mt-2 rounded border p-3">
                  <Tex block tex={ejercicio.explain.finalTeX} />
                </div>
              </div>

              {/* Paso 3 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 3 — Subexpresiones (de adentro hacia afuera)</div>
                <p className="text-muted-foreground">
                  Calculamos primero las partes pequeñas. Cada subexpresión produce su propio código de 4 letras.
                  La última que calculemos será la proposición completa.
                </p>

                <div className="mt-3 space-y-3">
                  {ejercicio.explain.sub.map((e, idx) => {
                    const tex = toTeX(e)
                    const bits = evalBitsForExpr(e)

                    return (
                      <div key={serialize(e)} className="rounded-lg border bg-white p-3">
                        <div className="font-semibold">
                          Paso 3.{idx + 1} — Calculamos: <Tex tex={tex} />
                        </div>

                        <div className="mt-1 text-muted-foreground">{opRuleText(e)}</div>

                        <div className="mt-2 flex items-center gap-2">
                          <span className="font-semibold">Código:</span>
                          <span className="inline-block px-2 py-1 rounded bg-muted font-mono">{bits}</span>
                        </div>

                        <div className="mt-2 overflow-x-auto">
                          <table className="border w-full text-center text-xs">
                            <thead>
                              <tr className="bg-muted">
                                <th className="border py-2">Fila</th>
                                <th className="border py-2">p</th>
                                <th className="border py-2">q</th>
                                <th className="border py-2">
                                  <Tex tex={tex} />
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {COMBINATIONS.map((c, i) => (
                                <tr key={i}>
                                  <td className="border py-2">{i + 1}</td>
                                  <td className="border py-2">{c.p ? 'V' : 'F'}</td>
                                  <td className="border py-2">{c.q ? 'V' : 'F'}</td>
                                  <td className="border py-2 font-semibold">
                                    {evalExpr(e, c.p, c.q) ? 'V' : 'F'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Paso 4 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 4 — Respuesta final</div>
                <p className="text-muted-foreground">
                  La proposición completa queda con este código (en el orden TT, TF, FT, FF):
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm font-semibold">Respuesta:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">
                    {ejercicio.explain.finalBits}
                  </span>
                </div>

                <div className="mt-3 rounded-md border bg-background p-3">
                  <div className="font-semibold mb-1">🧠 Chequeo rápido</div>
                  <p className="text-muted-foreground">
                    Si tu código no coincide con ninguna opción, revisa:
                    (1) el orden de filas, y (2) la regla de <span className="font-semibold">→</span>
                    (solo es F cuando V → F).
                  </p>
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        {/* Card de la proposición (como Prisma17) */}
        <div className="rounded-xl border bg-white p-4 mb-4">
          <div className="font-semibold mb-2">Proposición:</div>
          <Tex block tex={ejercicio.tex} />
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
