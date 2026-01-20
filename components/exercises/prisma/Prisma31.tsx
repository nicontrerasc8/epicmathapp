'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 31 — Conversión radianes ? centesimal (grados g)

   Siendo  (pp/q) rad  ?  ab^g
   Calcula  E = v(a + b - 1)

   ? FORMATO NUEVO (igual a Prisma 29)
   ? 1 intento, autocalifica
============================================================ */

type OptionKey = 'A' | 'B' | 'C' | 'D'
type Option = { key: OptionKey; value: number; correct: boolean }

/* =========================
   HELPERS
========================= */
function choice<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}
function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}
function gcd(a: number, b: number) {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const t = x % y
    x = y
    y = t
  }
  return x
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
  options: { renderActions: { addMenu: [] } },
} as const

function Tex({ tex, block = false }: { tex: string; block?: boolean }) {
  const wrapped = block ? `\\[${tex}\\]` : `\\(${tex}\\)`
  return <MathJax dynamic>{wrapped}</MathJax>
}

/* =========================
   GENERADOR
========================= */
function digitsThatMakeE(targetE: number) {
  // a + b - 1 = E²  ?  a + b = E² + 1
  const sum = targetE * targetE + 1
  const pairs: Array<{ a: number; b: number }> = []
  for (let a = 1; a <= 9; a++) {
    const b = sum - a
    if (b >= 0 && b <= 9) pairs.push({ a, b })
  }
  return pairs
}

function buildExercise() {
  const targetE = choice([1, 2, 3, 4])
  const { a, b } = choice(digitsThatMakeE(targetE))

  const G = 10 * a + b // ab en grados centesimales
  const g = gcd(G, 200)
  const p = G / g
  const q = 200 / g

  const radLatex =
    q === 1
      ? p === 1
        ? `\\pi`
        : `${p}\\pi`
      : p === 1
      ? `\\dfrac{\\pi}{${q}}`
      : `\\dfrac{${p}\\pi}{${q}}`

  const answer = targetE

  const values = shuffle([1, 2, 3, 4])
  const keys: OptionKey[] = ['A', 'B', 'C', 'D']

  const options: Option[] = values.map((v, i) => ({
    key: keys[i],
    value: v,
    correct: v === answer,
  }))

  return {
    a,
    b,
    G,
    p,
    q,
    radLatex,
    answer,
    options,
  }
}

/* =========================
   COMPONENT
========================= */
export default function Prisma31({
  exerciseId,
  classroomId,
  sessionId,
}: {
  exerciseId: string
  classroomId: string
  sessionId?: string
}) {
  const engine = useExerciseEngine({ maxAttempts: 1 })

  const [nonce, setNonce] = useState(0)
  const [selectedKey, setSelectedKey] = useState<OptionKey | null>(null)

  const ex = useMemo(() => buildExercise(), [nonce])

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelectedKey(op.key)
    engine.submit(op.correct)

    const ordered = ex.options.slice().sort((a, b) => a.key.localeCompare(b.key))

    persistExerciseOnce({
      exerciseId,
      classroomId,
      sessionId,

      correct: op.correct,

      answer: {
        selected: String(op.value),
        correctAnswer: String(ex.answer),
        latex: `\\text{Si } ${ex.radLatex}\\,\\text{rad} \\leftrightarrow \\overline{${ex.a}${ex.b}}^{\\,g},\\; E=\\sqrt{a+b-1}`,
        options: ordered.map(o => String(o.value)),
        extra: {
          a: ex.a,
          b: ex.b,
          G: ex.G,
          radian: `${ex.p}p/${ex.q}`,
          labeledOptions: ordered.map(o => `${o.key}.\\ ${o.value}`),
          rule: 'E = v(a + b - 1)',
        },
      },
    })
  }

  function siguiente() {
    setSelectedKey(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 31 — Radianes y centesimal"
        prompt="Calcula el valor de E."
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <div className="space-y-3 text-sm">
              <div className="font-semibold">Resultado:</div>
              <Tex block tex={`E=${ex.answer}`} />
            </div>
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-white p-4 mb-4">
          <Tex
            block
            tex={`\\text{Si } ${ex.radLatex}\\,\\text{rad} \\leftrightarrow \\overline{${ex.a}${ex.b}}^{\\,g},\\; E=\\sqrt{a+b-1}`}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {ex.options.map(op => {
            const isSelected = selectedKey === op.key
            const showCorrect = engine.status !== 'idle' && op.correct
            const showWrong = engine.status === 'revealed' && isSelected && !op.correct

            return (
              <button
                key={op.key}
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
                <div className="font-semibold">{op.key}.</div>
                <div className="font-mono text-lg">{op.value}</div>
              </button>
            )
          })}
        </div>
      </ExerciseShell>
    </MathJaxContext>
  )
}



