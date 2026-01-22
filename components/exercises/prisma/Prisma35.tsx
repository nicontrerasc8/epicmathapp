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
   PRISMA 35 — Simplifica la expresión
   P = p(C - S) / R
   Siendo: S = 9k, C = 10k, R = kp/20

   ? better-react-mathjax (NO KaTeX)
   ? 1 SOLO INTENTO (autocalifica al click)
   ? NUEVO FORMATO persist (como Prisma 29/32)
============================================================ */

type Option = { label: 'A' | 'B' | 'C' | 'D'; value: number; correct: boolean }

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
   HELPERS
========================= */
function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

/* =========================
   EJERCICIO (misma idea del PDF)
   Ojo: el resultado SIEMPRE es 20 (k se cancela), con k?0.
========================= */
function buildExercise() {
  const k = randInt(2, 12)

  const correct = 20
  const options: Option[] = [
    { label: 'A', value: 10, correct: false },
    { label: 'B', value: 20, correct: true },
    { label: 'C', value: 30, correct: false },
    { label: 'D', value: 40, correct: false },
  ]

  const exprLatex = `P = \\dfrac{\\pi\\,(C-S)}{R}`
  const givenLatex = `S=9k,\\; C=10k,\\; R=\\dfrac{k\\pi}{20}`

  const questionLatex = `${exprLatex}\\quad \\text{con}\\quad ${givenLatex}`

  return { k, correct, options, exprLatex, givenLatex, questionLatex }
}

/* =========================
   COMPONENT (NUEVO FORMATO)
========================= */
export default function Prisma35({
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

  const ej = useMemo(() => buildExercise(), [nonce])

  async function pickOption(op: Option) {
    if (!engine.canAnswer) return

    const timeSeconds = (Date.now() - startedAtRef.current) / 1000

    setSelected(op.value)
    engine.submit(op.correct)

    const ordered = ej.options.slice().sort((a, b) => a.label.localeCompare(b.label))

    await submitAttempt({

      correct: op.correct,

      answer: {
        selected: String(op.value),
        correctAnswer: String(ej.correct),
        latex: ej.questionLatex,
        options: ordered.map(o => String(o.value)),
        extra: {
          labeledOptions: ordered.map(o => `${o.label}.\\ ${o.value}`),
          exprLatex: ej.exprLatex,
          givenLatex: ej.givenLatex,
          kUsed: ej.k,
          rule: 'Sustituir y simplificar: k y p se cancelan',
          note: 'k ? 0',
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

  // Pasos (igual idea del PDF)
  const step0 = `P = \\dfrac{\\pi\\,(C-S)}{R}`
  const step1 = `\\text{Siendo } S=9k,\\; C=10k,\\; R=\\dfrac{k\\pi}{20}\\;\\;(k\\neq 0)`
  const step2 = `P = \\dfrac{\\pi\\,(10k-9k)}{\\dfrac{k\\pi}{20}}`
  const step3 = `P = \\dfrac{\\pi\\,k}{\\dfrac{k\\pi}{20}}`
  const step4 = `P = \\pi k\\cdot \\dfrac{20}{k\\pi}`
  const step5 = `P = 20`

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 35 — Simplifica"
        prompt="Simplifica la expresión y elige la alternativa correcta."
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <div className="space-y-4 text-sm leading-relaxed">
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 1 — Fórmula y datos</div>
                <div className="mt-2 space-y-2 rounded-md border bg-background p-3">
                  <Tex block tex={step0} />
                  <Tex block tex={step1} />
                </div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 2 — Sustituir</div>
                <div className="mt-2 space-y-2 rounded-md border bg-background p-3">
                  <Tex block tex={step2} />
                </div>
              </div>

              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">? Paso 3 — Simplificar</div>
                <div className="mt-2 space-y-2 rounded-md border bg-background p-3">
                  <Tex block tex={step3} />
                  <Tex block tex={step4} />
                  <Tex block tex={step5} />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm font-semibold">Respuesta:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">20</span>
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        {/* Enunciado */}
        <div className="rounded-xl border bg-white p-4 mb-4">
          <div className="font-semibold mb-2">Simplifica la expresión:</div>
          <div className="space-y-2 rounded-md border bg-background p-3">
            <Tex block tex={ej.exprLatex} />
            <Tex block tex={ej.givenLatex} />
          </div>
        </div>

        {/* Opciones */}
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








