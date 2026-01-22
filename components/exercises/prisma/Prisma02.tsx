'use client'

import { useMemo, useState } from 'react'

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
   PRISMA 2 — Valores de verdad (I–IV)
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
  shown: number
}

type Prop = {
  id: 'I' | 'II' | 'III' | 'IV'
  left: Atom
  op: LogicOp
  right: Atom
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
   LÓGICA
========================= */
function arithValue(a: Atom) {
  return a.op === '+' ? a.a + a.b : a.a - a.b
}
function evalAtom(a: Atom) {
  return arithValue(a) === a.shown
}
function evalLogic(op: LogicOp, A: boolean, B: boolean) {
  switch (op) {
    case 'and': return A && B
    case 'or': return A || B
    case 'imp': return !A || B
    case 'iff': return A === B
  }
}
function VF(x: boolean) {
  return x ? 'V' : 'F'
}

/* =========================
   TEXTO / REGLAS
========================= */
const LOGIC_LATEX: Record<LogicOp, string> = {
  or: '\\vee',
  and: '\\wedge',
  imp: '\\to',
  iff: '\\leftrightarrow',
}

const LOGIC_RULE: Record<LogicOp, string> = {
  and: 'Conjunción (A ? B): solo es V si ambos son V.',
  or: 'Disyunción (A ? B): es V si al menos uno es V.',
  imp: 'Condicional (A ? B): solo es F cuando A es V y B es F.',
  iff: 'Bicondicional (A ? B): es V cuando ambos tienen el mismo valor.',
}

/* =========================
   LaTeX builders
========================= */
function atomLatex(a: Atom) {
  return `\\left(${a.a} ${a.op} ${a.b} = ${a.shown}\\right)`
}
function atomCalcLatex(a: Atom) {
  return `${a.a} ${a.op} ${a.b} = ${arithValue(a)}`
}
function propLatex(p: Prop) {
  return `${atomLatex(p.left)}\\; ${LOGIC_LATEX[p.op]}\\; ${atomLatex(p.right)}`
}
function propsBlockLatex(props: Prop[]) {
  return [
    '\\begin{aligned}',
    ...props.map(p => `\\text{${p.id}.}\\;& ${propLatex(p)}\\\\`),
    '\\end{aligned}',
  ].join('\n')
}

/* =========================
   GENERADORES
========================= */
function generateAtom(): Atom {
  const op: ArithOp = coin(0.55) ? '+' : '-'
  let a = randInt(1, 12)
  let b = randInt(1, 12)
  if (op === '-' && b > a) [a, b] = [b, a]

  const real = op === '+' ? a + b : a - b
  const makeTrue = coin(0.55)

  let shown = real
  if (!makeTrue) {
    const d = coin(0.7) ? 1 : randInt(2, 4)
    shown = coin() ? real + d : real - d
    if (shown === real || shown < 0) shown = real + d
  }

  return { a, op, b, shown }
}

function generateProps(): Prop[] {
  const ids: Prop['id'][] = ['I', 'II', 'III', 'IV']
  const ops = shuffle<LogicOp>(['or', 'imp', 'and', 'iff'])

  return ids.map((id, i) => ({
    id,
    left: generateAtom(),
    op: ops[i],
    right: generateAtom(),
  }))
}

function evalPropFull(p: Prop) {
  const A = evalAtom(p.left)
  const B = evalAtom(p.right)
  const value = evalLogic(p.op, A, B)
  return { A, B, value }
}

function patternFromProps(props: Prop[]) {
  return props.map(p => VF(evalPropFull(p).value)).join('')
}

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
  return shuffle([
    { value: correct, correct: true },
    ...Array.from(set).map(v => ({ value: v, correct: false })),
  ])
}

function generateExercise() {
  for (let i = 0; i < 200; i++) {
    const props = generateProps()
    const bits = patternFromProps(props)
    if (bits === 'VVVV' || bits === 'FFFF') continue
    if (!bits.includes('V') || !bits.includes('F')) continue
    return { props, correct: bits, options: generateOptions(bits) }
  }
  const fallback = generateProps()
  return {
    props: fallback,
    correct: patternFromProps(fallback),
    options: generateOptions(patternFromProps(fallback)),
  }
}

/* =========================
   UI
========================= */
export default function Prisma02({
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

  const ejercicio = useMemo(() => generateExercise(), [nonce])
  const propsLatex = useMemo(
    () => propsBlockLatex(ejercicio.props),
    [ejercicio.props]
  )

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
        latex: propsLatex,
        options: ejercicio.options.map(o => o.value),
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
        title="Valores de verdad"
        prompt="Indica los valores de verdad de las proposiciones I–IV."
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <div className="space-y-4 text-sm leading-relaxed">
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Idea clave</div>
                <p className="text-muted-foreground">
                  Primero resolvemos cada igualdad (V/F) y luego aplicamos el conector lógico.
                </p>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">?? Proposiciones</div>
                <MathTex block tex={propsLatex} />
              </div>

              <div className="space-y-3">
                {ejercicio.props.map(p => {
                  const res = evalPropFull(p)
                  return (
                    <div key={p.id} className="rounded-lg border bg-white p-3">
                      <div className="font-semibold mb-2">{p.id}. Evaluamos</div>
                      <MathTex block tex={propLatex(p)} />

                      <div className="mt-2">
                        <MathTex block tex={`${atomCalcLatex(p.left)} \\Rightarrow ${VF(res.A)}`} />
                        <MathTex block tex={`${atomCalcLatex(p.right)} \\Rightarrow ${VF(res.B)}`} />
                      </div>

                      <div className="mt-2 text-muted-foreground">{LOGIC_RULE[p.op]}</div>

                      <MathTex
                        block
                        tex={`${VF(res.A)}\\; ${LOGIC_LATEX[p.op]}\\; ${VF(res.B)} = \\mathbf{${VF(
                          res.value
                        )}}`}
                      />
                    </div>
                  )
                })}
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Respuesta final</div>
                <span className="font-mono text-base">{ejercicio.correct}</span>
              </div>
            </div>
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-white p-4 mb-4">
          <MathTex block tex={propsLatex} />
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








