'use client'

import { useMemo, useState } from 'react'
import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'

/* ============================================================
   PRISMA 1 — Tablas de verdad (p, q) — MOTOR SERIO EN 1 ARCHIVO
   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ Generación algorítmica (sin hardcode de fórmulas)
   ✅ Explicación súper detallada + tabla de subexpresiones
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
   LATEX / TEXTO BONITO
========================= */
function toLatex(expr: Expr): string {
  switch (expr.type) {
    case 'var':
      return expr.name
    case 'not': {
      const inner = expr.expr
      const needsParens = inner.type === 'and' || inner.type === 'or' || inner.type === 'imp'
      return needsParens ? `~(${toLatex(inner)})` : `~${toLatex(inner)}`
    }
    case 'and':
      return `(${toLatex(expr.left)} ∧ ${toLatex(expr.right)})`
    case 'or':
      return `(${toLatex(expr.left)} ∨ ${toLatex(expr.right)})`
    case 'imp':
      return `(${toLatex(expr.left)} → ${toLatex(expr.right)})`
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
   - evita ~~X
   - evita cosas idénticas raras (p ∧ p) -> lo filtramos luego
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

    // Si queda A op A, lo dejamos pero el filtro lo botará (es trivial)
    if (isStructurallyEqual(left, right)) {
      return { ...expr, left, right } as Expr
    }

    return { ...expr, left, right } as Expr
  }

  return expr
}

/* =========================
   RESTRICCIONES DE NIVEL
   Queremos:
   - Usa p y q (ambas)
   - No tautología / contradicción
   - No identidad tipo p, q, ~p, ~q
   - Tamaño razonable (mismo nivel)
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
   GENERADOR ALGORTÍTMICO (sin hardcode)
========================= */
function generateExpr(depth: number, maxDepth: number): Expr {
  if (depth >= maxDepth) {
    return { type: 'var', name: choice(VARS) }
  }

  const r = Math.random()

  // calibración: variedad sin volverse monstruo
  if (r < 0.35) {
    return { type: 'var', name: choice(VARS) }
  }

  if (r < 0.55) {
    return { type: 'not', expr: generateExpr(depth + 1, maxDepth) }
  }

  const op = choice(BIN_OPS)

  if (op === 'and') {
    return { type: 'and', left: generateExpr(depth + 1, maxDepth), right: generateExpr(depth + 1, maxDepth) }
  }
  if (op === 'or') {
    return { type: 'or', left: generateExpr(depth + 1, maxDepth), right: generateExpr(depth + 1, maxDepth) }
  }
  return { type: 'imp', left: generateExpr(depth + 1, maxDepth), right: generateExpr(depth + 1, maxDepth) }
}

function generateQualityExpr(): Expr {
  for (let tries = 0; tries < 160; tries++) {
    const md = tries < 110 ? 3 : 4
    const expr = simplify(generateExpr(0, md))
    if (isQualityExpr(expr)) return expr
  }

  // fallback (solo si el azar fue terrible)
  const fallback: Expr = {
    type: 'and',
    left: { type: 'imp', left: { type: 'var', name: 'p' }, right: { type: 'var', name: 'q' } },
    right: { type: 'imp', left: { type: 'not', expr: { type: 'var', name: 'q' } }, right: { type: 'not', expr: { type: 'var', name: 'p' } } },
  }
  return simplify(fallback)
}

/* =========================
   DISTRACTORES SERIOS
   - bit flips (1–2 posiciones)
   - mutación leve de la expresión (tabla “prima”)
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

  // 1) envolver en NOT
  if (r < 0.33) return simplify({ type: 'not', expr })

  // 2) swap p<->q en el primer var que encuentre
  if (r < 0.66) {
    const swap = (e: Expr): Expr => {
      if (e.type === 'var') return { type: 'var', name: e.name === 'p' ? 'q' : 'p' }
      if (e.type === 'not') return { type: 'not', expr: swap(e.expr) }
      return { ...(e as any), left: swap((e as any).left), right: swap((e as any).right) } as Expr
    }
    return simplify(swap(expr))
  }

  // 3) cambiar un operador binario si existe
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

  // A) flips
  while (set.size < 2) {
    const flips = coin(0.7) ? 1 : 2
    const cand = flipBitString(correct, flips)
    if (cand !== correct) set.add(cand)
  }

  // B) primo (mutación)
  for (let k = 0; k < 40 && set.size < 3; k++) {
    const bits = truthBits(mutateExprOneStep(expr))
    if (bits !== correct && !isTautology(bits) && !isContradiction(bits)) set.add(bits)
  }

  // fallback si faltara
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
   EXPLICACIÓN DETALLADA (tipo profe)
   - Extrae subexpresiones (postorder, de adentro hacia afuera)
   - Calcula valores por fila para cada subexpresión
   - Genera texto paso-a-paso + tabla “con columnas”
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
  // postorder: hijos primero, luego padre (ideal para “paso a paso”)
  const out: Expr[] = []
  const seen = new Set<string>()

  const walk = (e: Expr) => {
    if (e.type === 'var') return

    if (e.type === 'not') {
      walk(e.expr)
    } else if (isBinary(e)) {
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
    return 'Regla de negación (~A): si A es V entonces ~A es F, y si A es F entonces ~A es V. (Invierte el valor)'
  }
  if (e.type === 'and') {
    return 'Regla de conjunción (A ∧ B): solo es V cuando A es V Y B es V. En cualquier otro caso es F.'
  }
  if (e.type === 'or') {
    return 'Regla de disyunción (A ∨ B): es V cuando al menos una de las dos (A o B) es V. Solo es F cuando ambas son F.'
  }
  // imp
  return 'Regla de implicación (A → B): SOLO es F cuando A es V y B es F. En todos los demás casos es V.'
}

function evalBitsForExpr(e: Expr): string {
  return COMBINATIONS.map(c => (evalExpr(e, c.p, c.q) ? 'V' : 'F')).join('')
}

function detailedNarrative(expr: Expr) {
  const sub = getSubexpressionsInOrder(expr)
  const finalLatex = toLatex(expr)
  const finalBits = truthBits(expr)

  return { sub, finalLatex, finalBits }
}

/* =========================
   PRISMA 01 (UI)
========================= */
export default function Prisma01({ temaPeriodoId }: { temaPeriodoId: string }) {
  // ✅ 1 SOLO INTENTO
  const engine = useExerciseEngine({ maxAttempts: 1 })

  // Para regenerar ejercicio sin depender de hacks del status
  const [nonce, setNonce] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)

  const ejercicio = useMemo(() => {
    const expr = generateQualityExpr()
    const latex = toLatex(expr)
    const correct = truthBits(expr)
    const options = generateOptions(correct, expr)
    const explain = detailedNarrative(expr)

    return { expr, latex, correct, options, explain }
  }, [nonce])

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    // ✅ Autocalifica al click (cumple “1 intento” real)
    setSelected(op.value)
    engine.submit(op.correct)
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  return (
    <ExerciseShell
      title="Prisma 1 — Tablas de verdad"
      prompt={
        `Elige la alternativa correcta ` +
        `la tabla de verdad de ${ejercicio.latex} es…`
      }
      status={engine.status}
      attempts={engine.attempts}
      maxAttempts={engine.maxAttempts}
      // onVerify lo dejamos vacío porque ya autocalificamos al click
      onVerify={() => {}}
      onNext={siguiente}
      solution={
        <SolutionBox>
          {/* EXPLICACIÓN estilo profe, paso a paso */}
          <div className="space-y-4 text-sm leading-relaxed">
            <div>
              <div className="font-semibold mb-1">✅ Paso 1 — Orden de la tabla (muy importante)</div>
              <p>
                Siempre evaluamos la proposición en estas 4 filas (en este orden):
                <span className="font-semibold"> (p,q) = (V,V), (V,F), (F,V), (F,F)</span>.
                Así, al final obtendremos un “código” de 4 letras (V/F) que es la respuesta.
              </p>

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
            </div>

            <div>
              <div className="font-semibold mb-1">✅ Paso 2 — Qué proposición vamos a evaluar</div>
              <p>
                La proposición del ejercicio es:
                <span className="font-semibold"> {ejercicio.explain.finalLatex}</span>.
                Para no equivocarnos, la evaluaremos <span className="font-semibold">de adentro hacia afuera</span>,
                calculando primero las partes pequeñas y luego armando la final.
              </p>
            </div>

            <div>
              <div className="font-semibold mb-2">✅ Paso 3 — Subexpresiones (de adentro hacia afuera)</div>
              <p>
                Voy a separar la proposición en “mini-proposiciones”. Cada una se evalúa en las 4 filas.
                Cuando terminemos todas, la última fila calculada será la proposición completa.
              </p>

              <div className="mt-3 space-y-3">
                {ejercicio.explain.sub.map((e, idx) => {
                  const latex = toLatex(e)
                  const bits = evalBitsForExpr(e)

                  return (
                    <div key={serialize(e)} className="rounded-lg border bg-white p-3">
                      <div className="font-semibold">
                        Paso {idx + 3}.{idx + 1} — Calculamos: <span className="font-mono">{latex}</span>
                      </div>
                      <div className="mt-1 text-muted-foreground">{opRuleText(e)}</div>

                      <div className="mt-2">
                        <span className="font-semibold">Resultado en las 4 filas:</span>{' '}
                        <span className="inline-block px-2 py-1 rounded bg-muted font-mono">{bits}</span>
                      </div>

                      <div className="mt-2 overflow-x-auto">
                        <table className="border w-full text-center text-xs">
                          <thead>
                            <tr className="bg-muted">
                              <th className="border py-2">Fila</th>
                              <th className="border py-2">p</th>
                              <th className="border py-2">q</th>
                              <th className="border py-2">{latex}</th>
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

            <div>
              <div className="font-semibold mb-2">✅ Paso 4 — Respuesta final</div>
              <p>
                Ya con todo calculado, la proposición completa queda con este patrón de 4 letras
                (en el mismo orden de filas TT, TF, FT, FF):
              </p>

              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm font-semibold">Respuesta:</span>
                <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">
                  {ejercicio.explain.finalBits}
                </span>
              </div>
            </div>
          </div>
        </SolutionBox>
      }
    >
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
                'border rounded-xl p-4 text-center transition bg-white',
                'hover:shadow-sm hover:-translate-y-0.5',
                isSelected && 'ring-2 ring-primary',
                showCorrect && 'bg-green-600 border-green-400',
                showWrong && 'bg-red-600 border-red-400 text-white',
                !engine.canAnswer && 'opacity-80 cursor-not-allowed',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {op.value}
            </button>
          )
        })}
      </div>


    </ExerciseShell>
  )
}
