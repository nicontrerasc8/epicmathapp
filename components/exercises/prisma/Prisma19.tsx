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
   PRISMA 19 — Propiedades de logaritmos (m, n) + MathJax
   Enunciado:
     Si log(a)=m; log(b)=n, calcular
     P = log(a·b)/(m+n)

   ? 1 SOLO INTENTO (autocalifica al elegir opción)
   ? 100% dinámico: a,b “bonitos” (sin números gigantes)
   ? Explicación tipo guía: producto ? propiedad ? reemplazar ? simplificar
============================================================ */

type Option = { label: 'A' | 'B' | 'C' | 'D'; value: number; correct: boolean }

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}
function powInt(base: number, exp: number) {
  let r = 1
  for (let i = 0; i < exp; i++) r *= base
  return r
}

/* =========================
   MathJax Config (igual a Prisma 17)
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
   Generator
========================= */
function generateExercise() {
  // control: evitar números gigantes
  const basePool = [2, 3, 4, 5, 6, 7, 8, 9]

  for (let tries = 0; tries < 140; tries++) {
    const aBase = basePool[randInt(0, basePool.length - 1)]
    const bBase = basePool[randInt(0, basePool.length - 1)]
    const aExp = randInt(2, 4)
    const bExp = randInt(2, 4)

    const a = powInt(aBase, aExp)
    const b = powInt(bBase, bExp)
    const ab = a * b

    if (ab > 200_000) continue

    const correct = 1

    // distractores “creíbles”
    const candidates = shuffle([0, 2, 3, 4, -1, 12, 5, 6]).filter(v => v !== correct)
    const values = shuffle([correct, ...candidates.slice(0, 3)])

    const labels: Option['label'][] = ['A', 'B', 'C', 'D']
    const options: Option[] = values.map((v, i) => ({
      label: labels[i],
      value: v,
      correct: v === correct,
    }))

    return { a, b, ab, correct, options }
  }

  // fallback
  const a = 64
  const b = 25
  const ab = a * b
  const correct = 1
  const options: Option[] = [
    { label: 'A', value: 0, correct: false },
    { label: 'B', value: 1, correct: true },
    { label: 'C', value: 2, correct: false },
    { label: 'D', value: 3, correct: false },
  ]
  return { a, b, ab, correct, options }
}

/* =========================
   UI — PRISMA 19
========================= */
export default function Prisma19({
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
  const [selected, setSelected] = useState<number | null>(null)

  const ej = useMemo(() => generateExercise(), [nonce])

  const promptLatex =
    `\\text{Si }\\log(${ej.a})=m\\;\\text{ y }\\;\\log(${ej.b})=n,\\;\\text{ calcule: }` +
    `\\quad P=\\frac{\\log(${ej.ab})}{m+n}`

  async function pickOption(op: Option) {
    if (!engine.canAnswer) return

    const timeSeconds = (Date.now() - startedAtRef.current) / 1000

    setSelected(op.value)
    engine.submit(op.correct)

    await submitAttempt({
      correct: op.correct,
      answer: {
        selected: String(op.value),
        correctAnswer: String(ej.correct),
        latex: promptLatex,
        options: ej.options.map(o => `${o.label}. ${o.value}`),
        extra: {
          a: ej.a,
          b: ej.b,
          ab: ej.ab,
          keyRule: 'log(xy)=log(x)+log(y)',
          note: 'Siempre P=1 porque log(ab)=log(a)+log(b)=m+n.',
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
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 19 — Propiedades de logaritmos (m, n)"
        prompt="Resuelve usando propiedades de logaritmos."
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
                <div className="font-semibold mb-2">?? Paso 0 — ¿Qué te están dando?</div>
                <p className="text-muted-foreground">
                  Te dicen dos “nombres”:
                  <span className="font-semibold">{` \\log(${ej.a}) = m `}</span> y
                  <span className="font-semibold">{` \\log(${ej.b}) = n `}</span>.
                  <br />
                  O sea: <span className="font-semibold">m</span> representa <span className="font-semibold">log(a)</span> y{' '}
                  <span className="font-semibold">n</span> representa <span className="font-semibold">log(b)</span>.
                </p>
              </div>

              {/* Paso 1 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 1 — Escribimos P</div>
                <Tex block tex={`P=\\frac{\\log(${ej.ab})}{m+n}`} />
                <p className="mt-2 text-muted-foreground">
                  Nota: <span className="font-semibold">{ej.ab}</span> es el producto{' '}
                  <span className="font-semibold">
                    {ej.a}\\cdot {ej.b}
                  </span>
                  .
                </p>
                <Tex block tex={`P=\\frac{\\log(${ej.a}\\cdot ${ej.b})}{m+n}`} />
              </div>

              {/* Paso 2 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 2 — Propiedad del producto</div>
                <div className="rounded-md border bg-background p-3">
                  <Tex block tex={`\\log(xy)=\\log(x)+\\log(y)`} />
                </div>
                <div className="mt-2">
                  <Tex block tex={`P=\\frac{\\log(${ej.a})+\\log(${ej.b})}{m+n}`} />
                </div>
              </div>

              {/* Paso 3 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 3 — Reemplazamos con m y n</div>
                <Tex block tex={`\\log(${ej.a})=m\\quad\\text{y}\\quad\\log(${ej.b})=n`} />
                <Tex block tex={`P=\\frac{m+n}{m+n}`} />
              </div>

              {/* Paso 4 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 4 — Simplificamos</div>
                <Tex block tex={`P=1`} />
                <div className="mt-2 rounded-md border bg-background p-3">
                  <div className="font-semibold mb-1">?? Chequeo rápido</div>
                  <p className="text-muted-foreground">
                    Esto siempre pasa porque el numerador se convierte exactamente en <span className="font-semibold">m+n</span>.
                  </p>
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-white p-4 mb-4">
          <div className="font-semibold mb-2">Enunciado:</div>
          <Tex block tex={promptLatex} />
        </div>

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








