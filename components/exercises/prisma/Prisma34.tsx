'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 34 — Radianes / Sexagesimal / Centesimal
   Dado: 3C − 2S = N  ⇒ hallar R

   Convenciones Prisma:
     S = 9k
     C = 10k
     R = (kπ)/20

   ✅ FORMATO NUEVO (igual Prisma 29)
   ✅ 1 intento, autocalifica
============================================================ */

type OptionKey = 'A' | 'B' | 'C' | 'D'
type Option = { key: OptionKey; valueLatex: string; correct: boolean }

/* =========================
   HELPERS
========================= */
function choice<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}
function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}
function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) {
    const t = a % b
    a = b
    b = t
  }
  return a
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
const K_POOL = [1, 2, 3, 4, 5, 6]

function radLatexFromK(k: number) {
  const g = gcd(k, 20)
  const num = k / g
  const den = 20 / g

  if (den === 1 && num === 1) return `\\pi\\,\\text{rad}`
  if (den === 1) return `${num}\\pi\\,\\text{rad}`
  if (num === 1) return `\\frac{\\pi}{${den}}\\,\\text{rad}`
  return `\\frac{${num}\\pi}{${den}}\\,\\text{rad}`
}

function generateExercise() {
  const k = choice(K_POOL)
  const N = 12 * k
  const correctLatex = radLatexFromK(k)

  const distractors = shuffle([
    `\\frac{\\pi}{20}\\,\\text{rad}`,
    `\\frac{\\pi}{10}\\,\\text{rad}`,
    `\\frac{\\pi}{5}\\,\\text{rad}`,
    `\\frac{\\pi}{4}\\,\\text{rad}`,
    `\\frac{3\\pi}{20}\\,\\text{rad}`,
    `\\frac{3\\pi}{10}\\,\\text{rad}`,
    `\\frac{\\pi}{2}\\,\\text{rad}`,
  ].filter(v => v !== correctLatex))

  const values = shuffle([correctLatex, ...distractors]).slice(0, 4)
  const keys: OptionKey[] = ['A', 'B', 'C', 'D']

  const options: Option[] = values.map((v, i) => ({
    key: keys[i],
    valueLatex: v,
    correct: v === correctLatex,
  }))

  return { k, N, correctLatex, options }
}

/* =========================
   COMPONENT
========================= */
export default function Prisma34({
  exerciseId,
  temaId,
  classroomId,
  sessionId,
}: {
  exerciseId: string
  temaId: string
  classroomId: string
  sessionId?: string
}) {
  const engine = useExerciseEngine({ maxAttempts: 1 })
  const [nonce, setNonce] = useState(0)
  const [selectedKey, setSelectedKey] = useState<OptionKey | null>(null)

  const ex = useMemo(() => generateExercise(), [nonce])

  const promptLatex = `\\text{Halla }R\\text{ si }3C-2S=${ex.N}`

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelectedKey(op.key)
    engine.submit(op.correct)

    const ordered = ex.options.slice().sort((a, b) => a.key.localeCompare(b.key))

    persistExerciseOnce({
      exerciseId,
      temaId,
      classroomId,
      sessionId,

      correct: op.correct,

      answer: {
        selected: op.valueLatex,
        correctAnswer: ex.correctLatex,
        latex: promptLatex,
        options: ordered.map(o => o.valueLatex),
        extra: {
          N: ex.N,
          k: ex.k,
          labeledOptions: ordered.map(o => `${o.key}.\\ ${o.valueLatex}`),
          rule: {
            S: '9k',
            C: '10k',
            R: 'kπ/20',
          },
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
        title="Prisma 34 — Radianes"
        prompt="Halla la medida del ángulo en radianes."
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <div className="space-y-3 text-sm">
              <div className="font-semibold">Respuesta:</div>
              <Tex block tex={`R=${ex.correctLatex}`} />
            </div>
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-white p-4 mb-4">
          <Tex block tex={promptLatex} />
          <div className="mt-2 text-sm text-muted-foreground">
            Usar: <span className="font-mono">S=9k</span>, <span className="font-mono">C=10k</span>,{' '}
            <span className="font-mono">R=kπ/20</span>.
          </div>
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
                <div className="font-mono text-lg">
                  <Tex tex={op.valueLatex} />
                </div>
              </button>
            )
          })}
        </div>
      </ExerciseShell>
    </MathJaxContext>
  )
}
