'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy,
  Flame,
  Timer,
  Rocket,
  Sparkles,
  ShieldCheck,
  XCircle,
  CheckCircle2,
} from 'lucide-react'

import { createClient } from '@/utils/supabase/client'
import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 1 — Tablas de verdad (p, q) + MathJax
   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ Generación algorítmica (sin hardcode)
   ✅ Explicación tipo profe + subexpresiones + tablas por paso
   ✅ GAMIFICATION: trofeos + streak + timer + cohetes + HUD
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

type GamificationRow = {
  student_id: string
  exercise_id: string
  attempts: number
  correct_attempts: number
  wrong_attempts: number
  trophies: number
  streak: number
  last_played_at: string | null
}

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

// Trofeos (tu regla)
const TROPHY_MAX = 30
const TROPHY_MIN = 16
const TROPHY_STEP_SECONDS = 15
const WRONG_PENALTY = 15

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
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}
function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  const mm = Math.floor(s / 60)
  const ss = s % 60
  return mm > 0 ? `${mm}:${String(ss).padStart(2, '0')}` : `${ss}s`
}
function computeTrophyGain(timeSeconds: number) {
  const steps = Math.floor(Math.max(0, timeSeconds) / TROPHY_STEP_SECONDS)
  return Math.max(TROPHY_MIN, TROPHY_MAX - steps)
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
      // A → B = (~A ∨ B)  (solo es F cuando A=V y B=F)
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
    return 'Conjunción (A ∧ B): solo es V si A y B son V. Si falla una, es F.'
  }
  if (e.type === 'or') {
    return 'Disyunción (A ∨ B): es V si al menos una es V. Solo es F si ambas son F.'
  }
  return 'Implicación (A → B): solo es F cuando A es V y B es F. En los demás casos es V.'
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
   FX: Rocket Burst (Framer Motion)
========================= */
function RocketBurst({ play }: { play: boolean }) {
  const particles = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => ({
      id: i,
      x: randInt(-120, 120),
      y: randInt(-140, -40),
      s: randInt(6, 12),
      d: Math.random() * 0.25,
      r: randInt(-40, 40),
    }))
  }, [play])

  return (
    <AnimatePresence>
      {play ? (
        <motion.div
          className="pointer-events-none absolute inset-0"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {particles.map(p => (
            <motion.span
              key={p.id}
              className="absolute left-1/2 top-[55%] rounded-full bg-foreground/15"
              style={{ width: p.s, height: p.s }}
              initial={{ x: 0, y: 0, scale: 0.8, rotate: 0, opacity: 0 }}
              animate={{
                x: p.x,
                y: p.y,
                scale: [0.9, 1.1, 0.6],
                rotate: p.r,
                opacity: [0, 1, 0],
              }}
              transition={{ duration: 0.9, delay: p.d, ease: 'easeOut' }}
            />
          ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

/* =========================
   UI: HUD Badge
========================= */
function StatPill({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  hint?: string
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border bg-background">
          {icon}
        </span>
        <div className="flex-1">
          <div className="font-medium">{label}</div>
          {hint ? <div className="text-[11px] opacity-80">{hint}</div> : null}
        </div>
        <div className="text-base font-semibold text-foreground">{value}</div>
      </div>
    </div>
  )
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
  const supabase = createClient()
  const engine = useExerciseEngine({ maxAttempts: 1 })

  // ejercicio
  const [nonce, setNonce] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)

  // gamification state
  const [studentId, setStudentId] = useState<string | null>(null)
  const [gami, setGami] = useState<GamificationRow | null>(null)
  const [gamiLoading, setGamiLoading] = useState(true)

  // timer
  const startedAtRef = useRef<number>(Date.now())
  const [elapsed, setElapsed] = useState(0)

  // fx
  const [delta, setDelta] = useState<{ value: number; correct: boolean } | null>(null)
  const [rocket, setRocket] = useState(false)

  const ejercicio = useMemo(() => {
    const expr = generateQualityExpr()
    const pretty = toPretty(expr)
    const tex = toTeX(expr)
    const correct = truthBits(expr)
    const options = generateOptions(correct, expr)
    const explain = detailedNarrative(expr)
    return { expr, pretty, tex, correct, options, explain }
  }, [nonce])

  // start timer when new exercise generated
  useEffect(() => {
    startedAtRef.current = Date.now()
    setElapsed(0)
    setDelta(null)
    setRocket(false)
  }, [nonce])

  // tick timer while canAnswer
  useEffect(() => {
    if (!engine.canAnswer) return
    const t = setInterval(() => {
      const now = Date.now()
      const secs = (now - startedAtRef.current) / 1000
      setElapsed(secs)
    }, 250)
    return () => clearInterval(t)
  }, [engine.canAnswer, nonce])

  const trophyPreview = useMemo(() => computeTrophyGain(elapsed), [elapsed])

  // load auth user & gamification row
  useEffect(() => {
    let alive = true
    const run = async () => {
      setGamiLoading(true)

      const { data } = await supabase.auth.getUser()
      const uid = data?.user?.id ?? null
      if (!alive) return
      setStudentId(uid)

      if (!uid) {
        setGami(null)
        setGamiLoading(false)
        return
      }

      const { data: row, error } = await supabase
        .from('edu_student_gamification')
        .select(
          'student_id, exercise_id, attempts, correct_attempts, wrong_attempts, trophies, streak, last_played_at'
        )
        .eq('student_id', uid)
        .eq('exercise_id', exerciseId)
        .maybeSingle()

      if (!alive) return

      if (error) {
        console.warn('[Prisma01] gamification load error', error)
        setGami(null)
      } else {
        setGami((row as any) ?? null)
      }

      setGamiLoading(false)
    }

    run()
    return () => {
      alive = false
    }
  }, [supabase, exerciseId])

  async function refreshGami(uid: string) {
    const { data: row } = await supabase
      .from('edu_student_gamification')
      .select(
        'student_id, exercise_id, attempts, correct_attempts, wrong_attempts, trophies, streak, last_played_at'
      )
      .eq('student_id', uid)
      .eq('exercise_id', exerciseId)
      .maybeSingle()

    setGami((row as any) ?? null)
  }

  async function applyGamification(params: {
    uid: string
    correct: boolean
    timeSeconds: number
  }) {
    // RPC (tu función)
    const { error } = await supabase.rpc('fn_apply_student_gamification', {
      p_student_id: params.uid,
      p_exercise_id: exerciseId,
      p_correct: params.correct,
      p_time_seconds: Math.floor(params.timeSeconds),
    })

    if (error) {
      console.warn('[Prisma01] rpc fn_apply_student_gamification error', error)
      return
    }

    await refreshGami(params.uid)
  }

  async function pickOption(op: Option) {
    if (!engine.canAnswer) return

    const timeSeconds = (Date.now() - startedAtRef.current) / 1000

    setSelected(op.value)
    engine.submit(op.correct)

    // Persist intento (tu pipeline actual)
    persistExerciseOnce({
      exerciseId,
      classroomId,
      sessionId,
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
    })

    // FX local inmediato (sin esperar DB)
    if (op.correct) {
      const gain = computeTrophyGain(timeSeconds)
      setDelta({ value: gain, correct: true })
      setRocket(true)
      setTimeout(() => setRocket(false), 950)
    } else {
      setDelta({ value: -WRONG_PENALTY, correct: false })
      setRocket(false)
    }

    // Sync DB gamification
    if (studentId) {
      await applyGamification({
        uid: studentId,
        correct: op.correct,
        timeSeconds,
      })
    }
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  const difficultyHint = useMemo(() => {
    // mini “director” simple: mientras más rápido, más premio (ya lo haces)
    // acá solo damos feedback
    if (engine.status === 'idle') return 'Piensa rápido, pero con orden: TT, TF, FT, FF.'
    if (engine.status === 'revealed') return 'Tranqui. Mira las reglas y vuelve con todo.'
    return ''
  }, [engine.status])

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <div className="relative min-h-[calc(100vh-64px)] bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_55%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.10),transparent_55%)]">
        {/* FX */}
        <RocketBurst play={rocket} />

        {/* FLOATING DELTA */}
        <AnimatePresence>
          {delta ? (
            <motion.div
              key={`${delta.correct}-${delta.value}-${nonce}`}
              className="pointer-events-none absolute left-1/2 top-24 z-50 -translate-x-1/2"
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.98 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <div
                className={[
                  'inline-flex items-center gap-2 rounded-2xl border bg-background px-4 py-2 shadow-sm',
                  delta.correct ? 'border-green-500/30' : 'border-red-500/30',
                ].join(' ')}
              >
                <Trophy className="h-4 w-4" />
                <span className="text-sm font-semibold">
                  {delta.correct ? `+${delta.value}` : `${delta.value}`} trofeos
                </span>
                {delta.correct ? (
                  <Sparkles className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <ExerciseShell
          title="Tablas de verdad"
          prompt="Elige la alternativa correcta: la tabla de verdad de la proposición es…"
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
                    Paso 0 — Qué estamos buscando
                  </div>
                  <p className="text-muted-foreground">
                    Evaluamos la proposición en 4 filas (TT, TF, FT, FF). Al final obtienes un
                    código de 4 letras (V/F) que debe coincidir con una alternativa.
                  </p>
                </div>

                <div className="rounded-xl border bg-card p-4">
                  <div className="font-semibold mb-2 flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Paso 1 — Orden de filas (SIEMPRE el mismo)
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
                      Si cambias el orden de filas, cambia el código final aunque las reglas estén bien.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-4">
                  <div className="font-semibold mb-2">Paso 2 — Proposición a evaluar</div>
                  <p className="text-muted-foreground">
                    Evaluaremos de adentro hacia afuera (subexpresiones).
                  </p>
                  <div className="mt-2 rounded-lg border bg-background p-3">
                    <Tex block tex={ejercicio.explain.finalTeX} />
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-4">
                  <div className="font-semibold mb-2">Paso 3 — Subexpresiones (adentro → afuera)</div>
                  <p className="text-muted-foreground">
                    Cada subexpresión produce su propio código (4 letras). La última es la proposición completa.
                  </p>

                  <div className="mt-3 space-y-3">
                    {ejercicio.explain.sub.map((e, idx) => {
                      const tex = toTeX(e)
                      const bits = evalBitsForExpr(e)

                      return (
                        <div key={serialize(e)} className="rounded-xl border bg-background p-4">
                          <div className="font-semibold">
                            Paso 3.{idx + 1} — Calculamos: <Tex tex={tex} />
                          </div>

                          <div className="mt-1 text-muted-foreground">{opRuleText(e)}</div>

                          <div className="mt-2 flex items-center gap-2">
                            <span className="font-semibold">Código:</span>
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

                <div className="rounded-xl border bg-card p-4">
                  <div className="font-semibold mb-2">Paso 4 — Respuesta final</div>
                  <p className="text-muted-foreground">
                    La proposición completa queda con este código (TT, TF, FT, FF):
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm font-semibold">Respuesta:</span>
                    <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">
                      {ejercicio.explain.finalBits}
                    </span>
                  </div>

                  <div className="mt-3 rounded-lg border bg-background p-3">
                    <div className="font-semibold mb-1">Chequeo rápido</div>
                    <p className="text-muted-foreground">
                      Si no coincide con ninguna opción: (1) revisa el orden TT,TF,FT,FF, y (2) recuerda:
                      en (A → B) solo es F cuando A=V y B=F.
                    </p>
                  </div>
                </div>
              </div>
            </SolutionBox>
          }
        >
          {/* Layout: left game / right HUD */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT: GAME */}
            <motion.div
              className="lg:col-span-8"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              {/* Card proposición */}
              <div className="relative overflow-hidden rounded-2xl border bg-card p-5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.18),transparent_35%),radial-gradient(circle_at_80%_100%,rgba(168,85,247,0.14),transparent_40%)]" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Proposición</div>
                      <div className="mt-1 font-semibold text-lg">Resuelve y elige el código correcto</div>
                    </div>

                    
                  </div>

                  <div className="mt-4 rounded-xl border bg-background p-4">
                    <Tex block tex={ejercicio.tex} />
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Timer className="h-4 w-4" />
                      <span className="text-muted-foreground">Tiempo:</span>
                      <span className="font-semibold">{formatTime(elapsed)}</span>
                    </div>

             
                  </div>

                  {/* “barrita” de urgencia */}
                  <div className="mt-3">
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full bg-foreground/30"
                        initial={false}
                        animate={{
                          width: `${clamp(((trophyPreview - TROPHY_MIN) / (TROPHY_MAX - TROPHY_MIN)) * 100, 0, 100)}%`,
                        }}
                        transition={{ duration: 0.25 }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                      <span>{TROPHY_MIN}</span>
                      <span>{TROPHY_MAX}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Opciones */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ejercicio.options.map(op => {
                  const isSelected = selected === op.value
                  const showCorrect = engine.status !== 'idle' && op.correct
                  const showWrong =
                    engine.status === 'revealed' && isSelected && !op.correct

                  return (
                    <motion.button
                      key={op.value}
                      type="button"
                      disabled={!engine.canAnswer}
                      onClick={() => pickOption(op)}
                      whileHover={engine.canAnswer ? { y: -2 } : undefined}
                      whileTap={engine.canAnswer ? { scale: 0.99 } : undefined}
                      className={[
                        'relative overflow-hidden rounded-2xl border p-4 text-left transition',
                        'bg-card hover:shadow-sm',
                        isSelected && 'ring-2 ring-primary',
                        showCorrect && 'border-green-500/40 bg-green-500/10',
                        showWrong && 'border-red-500/40 bg-red-500/10',
                        !engine.canAnswer && 'opacity-80 cursor-not-allowed',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_60%)]" />
                      <div className="relative">
                        <div className="flex items-center justify-between gap-3">
                  
                          {showCorrect ? (
                            <span className="inline-flex items-center gap-1 rounded-lg border bg-background px-2 py-1 text-xs">
                              <CheckCircle2 className="h-4 w-4" /> Correcta
                            </span>
                          ) : showWrong ? (
                            <span className="inline-flex items-center gap-1 rounded-lg border bg-background px-2 py-1 text-xs">
                              <XCircle className="h-4 w-4" /> Incorrecta
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-2 font-mono text-2xl font-semibold tracking-wide">
                          {op.value}
                        </div>

                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>

            {/* RIGHT: HUD */}
            <motion.aside
              className="lg:col-span-4 space-y-4"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut', delay: 0.05 }}
            >
              <div className="rounded-2xl border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Tu progreso</div>
                    <div className="text-lg font-semibold">Arena de Trofeos</div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-xl border bg-background px-3 py-2">
                    <Trophy className="h-4 w-4" />
                    <span className="font-semibold">
                      {gamiLoading ? '—' : gami?.trophies ?? 0}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3">
                  <StatPill
                    icon={<Flame className="h-4 w-4" />}
                    label="Racha"
                    value={gamiLoading ? '—' : gami?.streak ?? 0}
                    hint="Aciertos seguidos"
                  />
                  <StatPill
                    icon={<Timer className="h-4 w-4" />}
                    label="Tiempo"
                    value={formatTime(elapsed)}
                    hint={`Ahora mismo ganas +${trophyPreview} si aciertas`}
                  />
                  <StatPill
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    label="Aciertos"
                    value={gamiLoading ? '—' : gami?.correct_attempts ?? 0}
                  />
                  <StatPill
                    icon={<XCircle className="h-4 w-4" />}
                    label="Errores"
                    value={gamiLoading ? '—' : gami?.wrong_attempts ?? 0}
                    hint={`Cada error: -${WRONG_PENALTY} (sin bajar de 0)`}
                  />
                </div>

                {!studentId ? (
                  <div className="mt-3 rounded-xl border bg-background p-3 text-xs text-muted-foreground">
                    No se detectó usuario logueado. Los trofeos no se guardarán.
                  </div>
                ) : !gamiLoading && !gami ? (
                  <div className="mt-3 rounded-xl border bg-background p-3 text-xs text-muted-foreground">
                    No encontré tu fila en <span className="font-mono">edu_student_gamification</span>.
                    (Tu trigger debería crearla cuando el alumno entra al aula).
                  </div>
                ) : null}
              </div>


           
            </motion.aside>
          </div>
        </ExerciseShell>
      </div>
    </MathJaxContext>
  )
}
