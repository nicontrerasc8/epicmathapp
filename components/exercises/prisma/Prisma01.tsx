'use client'

import { useMemo, useState } from 'react'
import { Timer, ShieldCheck } from 'lucide-react'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { MathProvider, MathTex } from '../base/MathBlock'
import { ExerciseHud } from '../base/ExerciseHud'
import { OptionsGrid, type Option } from '../base/OptionsGrid'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { useExerciseSubmission } from '@/lib/exercises/useExerciseSubmission'
import { useExerciseTimer } from '@/lib/exercises/useExerciseTimer'
import { computeTrophyGain, WRONG_PENALTY } from '@/lib/exercises/gamification'

/* ============================================================
   PRISMA 1 - Tablas de verdad (p, q) + MathJax
   ? 1 SOLO INTENTO (autocalifica al elegir opcion)
   ? Generacion algoritmica (sin hardcode)
   ? Explicacion tipo profe + subexpresiones + tablas por paso
   ? GAMIFICATION: trofeos + streak + timer + cohetes + HUD
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

/* =========================
   CONSTANTES
========================= */
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
   EVALUACION LOGICA (exacta)
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
      // A ? B = (~A ? B)  (solo es F cuando A=V y B=F)
      return !evalExpr(expr.left, p, q) || evalExpr(expr.right, p, q)
  }
}

/* =========================
   TEX / PRETTY
========================= */
function toTeX(expr: Expr): string {
  switch (expr.type) {
    case 'var':
      return expr.name
    case 'not': {
      const inner = expr.expr
      const innerTeX = toTeX(inner)
      const needsParens =
        inner.type === 'and' || inner.type === 'or' || inner.type === 'imp'
      return needsParens
        ? `\\lnot\\left(${innerTeX}\\right)`
        : `\\lnot ${innerTeX}`
    }
    case 'and':
      return `\\left(${toTeX(expr.left)}\\ \\land\\ ${toTeX(expr.right)}\\right)`
    case 'or':
      return `\\left(${toTeX(expr.left)}\\ \\lor\\ ${toTeX(expr.right)}\\right)`
    case 'imp':
      return `\\left(${toTeX(expr.left)}\\ \\to\\ ${toTeX(expr.right)}\\right)`
  }
}

function toPretty(expr: Expr): string {
  switch (expr.type) {
    case 'var':
      return expr.name
    case 'not': {
      const inner = expr.expr
      const needsParens =
        inner.type === 'and' || inner.type === 'or' || inner.type === 'imp'
      return needsParens ? `~(${toPretty(inner)})` : `~${toPretty(inner)}`
    }
    case 'and':
      return `(${toPretty(expr.left)} ? ${toPretty(expr.right)})`
    case 'or':
      return `(${toPretty(expr.left)} ? ${toPretty(expr.right)})`
    case 'imp':
      return `(${toPretty(expr.left)} ? ${toPretty(expr.right)})`
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
   SIMPLIFICACION LIGHT
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
   GENERADOR ALGORITMICO
========================= */
function generateExpr(depth: number, maxDepth: number): Expr {
  if (depth >= maxDepth) {
    return { type: 'var', name: choice(VARS) }
  }

  const r = Math.random()

  if (r < 0.35) return { type: 'var', name: choice(VARS) }
  if (r < 0.55) return { type: 'not', expr: generateExpr(depth + 1, maxDepth) }

  const op = choice(BIN_OPS)
  if (op === 'and')
    return {
      type: 'and',
      left: generateExpr(depth + 1, maxDepth),
      right: generateExpr(depth + 1, maxDepth),
    }
  if (op === 'or')
    return {
      type: 'or',
      left: generateExpr(depth + 1, maxDepth),
      right: generateExpr(depth + 1, maxDepth),
    }
  return {
    type: 'imp',
    left: generateExpr(depth + 1, maxDepth),
    right: generateExpr(depth + 1, maxDepth),
  }
}

function generateQualityExpr(): Expr {
  for (let tries = 0; tries < 160; tries++) {
    const md = tries < 110 ? 3 : 4
    const expr = simplify(generateExpr(0, md))
    if (isQualityExpr(expr)) return expr
  }

  const fallback: Expr = {
    type: 'and',
    left: {
      type: 'imp',
      left: { type: 'var', name: 'p' },
      right: { type: 'var', name: 'q' },
    },
    right: {
      type: 'imp',
      left: { type: 'not', expr: { type: 'var', name: 'q' } },
      right: { type: 'not', expr: { type: 'var', name: 'p' } },
    },
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
      if (e.type === 'var')
        return { type: 'var', name: e.name === 'p' ? 'q' : 'p' }
      if (e.type === 'not') return { type: 'not', expr: swap(e.expr) }
      return {
        ...(e as any),
        left: swap((e as any).left),
        right: swap((e as any).right),
      } as Expr
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
   EXPLICACION (subexpresiones)
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
    return 'Regla de negacion: invierte el valor. (V ? F, F ? V)'
  }
  if (e.type === 'and') {
    return 'Conjuncion (A ? B): solo es V si A y B son V. Si falla una, es F.'
  }
  if (e.type === 'or') {
    return 'Disyuncion (A ? B): es V si al menos una es V. Solo es F si ambas son F.'
  }
  return 'Implicacion (A ? B): solo es F cuando A es V y B es F. En los demas casos es V.'
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

/* ============================================================
   PRISMA 01 (GOD MODE)
============================================================ */
export default function Prisma01({
  exerciseId,
  classroomId,
  sessionId,
}: {
  exerciseId: string
  classroomId: string
  sessionId?: string
}) {
  const engine = useExerciseEngine({ maxAttempts: 1 })
  const { studentId, gami, gamiLoading, submitAttempt } =
    useExerciseSubmission({
      exerciseId,
      classroomId,
      sessionId,
    })

  // ejercicio
  const [nonce, setNonce] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)

  // timer
  const { elapsed, startedAtRef } = useExerciseTimer(engine.canAnswer, nonce)

  const ejercicio = useMemo(() => {
    const expr = generateQualityExpr()
    const pretty = toPretty(expr)
    const tex = toTeX(expr)
    const correct = truthBits(expr)
    const options = generateOptions(correct, expr)
    const explain = detailedNarrative(expr)
    return { expr, pretty, tex, correct, options, explain }
  }, [nonce])

  const trophyPreview = useMemo(() => computeTrophyGain(elapsed), [elapsed])

  async function pickOption(op: Option) {
    if (!engine.canAnswer) return

    const timeSeconds = (Date.now() - startedAtRef.current) / 1000

    setSelected(op.value)
    engine.submit(op.correct)

    await submitAttempt({
      correct: op.correct,
      answer: {
        selected: op.value,
        correctAnswer: ejercicio.correct,
        latex: ejercicio.tex,
        options: ejercicio.options.map(o => o.value),
        extra: {
          pretty: ejercicio.pretty,
          truthBitsCorrect: ejercicio.correct,
          time_seconds: Math.floor(timeSeconds),
          trophy_preview: computeTrophyGain(timeSeconds),
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

  return (
    <MathProvider>
      <ExerciseShell
        title="Tablas de verdad"
        prompt="Elige la alternativa correcta: la tabla de verdad de la proposicion es..."
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <div className="space-y-4 text-sm leading-relaxed">
              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Paso 0 - Que estamos buscando
                </div>
                <p className="text-muted-foreground">
                  Evaluamos la proposicion en 4 filas (TT, TF, FT, FF). Al final obtienes un
                  codigo de 4 letras (V/F) que debe coincidir con una alternativa.
                </p>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2 flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  Paso 1 - Orden de filas (SIEMPRE el mismo)
                </div>

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

                <div className="mt-3 rounded-lg border bg-background p-3">
                  <div className="font-semibold mb-1">Tip</div>
                  <p className="text-muted-foreground">
                    Si cambias el orden de filas, cambia el codigo final aunque las reglas esten bien.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2">Paso 2 - Proposicion a evaluar</div>
                <p className="text-muted-foreground">
                  Evaluaremos de adentro hacia afuera (subexpresiones).
                </p>
                <div className="mt-2 rounded-lg border bg-background p-3">
                  <MathTex block tex={ejercicio.explain.finalTeX} />
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2">Paso 3 - Subexpresiones (adentro ? afuera)</div>
                <p className="text-muted-foreground">
                  Cada subexpresion produce su propio codigo (4 letras). La ultima es la proposicion completa.
                </p>

                <div className="mt-3 space-y-3">
                  {ejercicio.explain.sub.map((e, idx) => {
                    const tex = toTeX(e)
                    const bits = evalBitsForExpr(e)

                    return (
                      <div key={serialize(e)} className="rounded-xl border bg-background p-4">
                        <div className="font-semibold">
                          Paso 3.{idx + 1} - Calculamos: <MathTex tex={tex} />
                        </div>

                        <div className="mt-1 text-muted-foreground">{opRuleText(e)}</div>

                        <div className="mt-2 flex items-center gap-2">
                          <span className="font-semibold">Codigo:</span>
                          <span className="inline-block px-2 py-1 rounded bg-muted font-mono">
                            {bits}
                          </span>
                        </div>

                        <div className="mt-2 overflow-x-auto">
                          <table className="border w-full text-center text-xs">
                            <thead>
                              <tr className="bg-muted">
                                <th className="border py-2">Fila</th>
                                <th className="border py-2">p</th>
                                <th className="border py-2">q</th>
                                <th className="border py-2">
                                  <MathTex tex={tex} />
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

              <div className="rounded-xl border bg-card p-4">
                <div className="font-semibold mb-2">Paso 4 - Respuesta final</div>
                <p className="text-muted-foreground">
                  La proposicion completa queda con este codigo (TT, TF, FT, FF):
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm font-semibold">Respuesta:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">
                    {ejercicio.explain.finalBits}
                  </span>
                </div>

                <div className="mt-3 rounded-lg border bg-background p-3">
                  <div className="font-semibold mb-1">Chequeo rapido</div>
                  <p className="text-muted-foreground">
                    Si no coincide con ninguna opcion: (1) revisa el orden TT,TF,FT,FF, y (2) recuerda:
                    en (A ? B) solo es F cuando A=V y B=F.
                  </p>
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground">Proposicion</div>
          <div className="mt-2">
            <MathTex block tex={ejercicio.tex} />
          </div>
        </div>

        <OptionsGrid
          options={ejercicio.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
        />
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
        </div>
      </ExerciseShell>
    </MathProvider>
  )
}