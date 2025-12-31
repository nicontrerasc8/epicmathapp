'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 17 — Logaritmos (evaluación directa) + LaTeX (MathJax)
   ✅ better-react-mathjax (NO KaTeX)
   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ 100% dinámico: 3 logs con argumentos “potencia perfecta”
   ✅ Explicación clara: evalúa cada log y luego opera
   ✅ Persist con la misma firma que Prisma13 (exerciseId/temaId/...)
============================================================ */

type Sign = '+' | '-'
type Term = {
  base: number
  exp: number
  arg: number
  sign: Sign // t2 y t3; t1 se asume "+"
  value: number // = exp
}

type Option = { label: 'A' | 'B' | 'C' | 'D'; value: number; correct: boolean }

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
function powInt(base: number, exp: number) {
  let r = 1
  for (let i = 0; i < exp; i++) r *= base
  return r
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
  options: {
    renderActions: { addMenu: [] }, // quita menú contextual
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
   LaTeX builders
========================= */
function buildExprLatex(t1: Term, t2: Term, t3: Term) {
  const s2 = t2.sign === '-' ? '-' : '+'
  const s3 = t3.sign === '-' ? '-' : '+'
  return `M = \\log_{${t1.base}}\\left(${t1.arg}\\right) ${s2} \\log_{${t2.base}}\\left(${t2.arg}\\right) ${s3} \\log_{${t3.base}}\\left(${t3.arg}\\right)`
}
function buildNumericLatex(t1: Term, t2: Term, t3: Term) {
  const s2 = t2.sign === '-' ? '-' : '+'
  const s3 = t3.sign === '-' ? '-' : '+'
  return `M = ${t1.value} ${s2} ${t2.value} ${s3} ${t3.value}`
}
function applySigns(t1: Term, t2: Term, t3: Term) {
  const v1 = t1.value
  const v2 = t2.sign === '-' ? -t2.value : +t2.value
  const v3 = t3.sign === '-' ? -t3.value : +t3.value
  return v1 + v2 + v3
}

/* =========================
   Generator
========================= */
function generateTerms(): { t1: Term; t2: Term; t3: Term } {
  const basesPool = [2, 3, 4, 5, 6, 7, 8, 9, 10]

  const mkTerm = (sign: Sign): Term => {
    const base = basesPool[randInt(0, basesPool.length - 1)]
    const exp = randInt(0, 4) // exp=0 => arg=1 => log(...)=0
    const arg = powInt(base, exp)
    return { base, exp, arg, sign, value: exp }
  }

  const t1 = mkTerm('+')
  let t2 = mkTerm(coin(0.55) ? '-' : '+')
  let t3 = mkTerm(coin(0.55) ? '+' : '-')

  // evita ambos "+" (más “estilo prisma”)
  if (t2.sign === '+' && t3.sign === '+') t2 = { ...t2, sign: '-' }

  // evita 0±0±0
  if (t1.value === 0 && t2.value === 0 && t3.value === 0) return generateTerms()

  // evita argumentos gigantes
  if (t1.arg > 5000 || t2.arg > 5000 || t3.arg > 5000) return generateTerms()

  return { t1, t2, t3 }
}

function generateOptions(correct: number, alt1: number, alt2: number) {
  const set = new Set<number>()
  set.add(correct)

  const candidates = shuffle([
    alt1,
    alt2,
    correct + 1,
    correct - 1,
    correct + 2,
    correct - 2,
    correct + 3,
    correct - 3,
  ]).filter(v => Number.isFinite(v))

  for (const c of candidates) {
    if (set.size >= 4) break
    if (c !== correct) set.add(c)
  }

  while (set.size < 4) {
    const c = correct + randInt(-6, 6)
    if (c !== correct) set.add(c)
  }

  const values = shuffle(Array.from(set)).slice(0, 4)
  const labels: Option['label'][] = ['A', 'B', 'C', 'D']
  return values.map((v, i) => ({ label: labels[i], value: v, correct: v === correct }))
}

function generateExercise() {
  for (let tries = 0; tries < 220; tries++) {
    const { t1, t2, t3 } = generateTerms()
    const correct = applySigns(t1, t2, t3)

    // distractores “serios”: flip de signo de un término
    const flip2: Term = { ...t2, sign: t2.sign === '-' ? '+' : '-' }
    const flip3: Term = { ...t3, sign: t3.sign === '-' ? '+' : '-' }
    const alt1 = applySigns(t1, flip2, t3)
    const alt2 = applySigns(t1, t2, flip3)

    // rango razonable para alternativas
    if (correct < -8 || correct > 12) continue

    const exprLatex = buildExprLatex(t1, t2, t3)
    const numericLatex = buildNumericLatex(t1, t2, t3)
    const options = generateOptions(correct, alt1, alt2)

    return { t1, t2, t3, correct, exprLatex, numericLatex, options }
  }

  // fallback
  const t1: Term = { base: 4, exp: 3, arg: 64, sign: '+', value: 3 }
  const t2: Term = { base: 7, exp: 2, arg: 49, sign: '-', value: 2 }
  const t3: Term = { base: 5, exp: 0, arg: 1, sign: '+', value: 0 }
  const correct = 1
  const options: Option[] = [
    { label: 'A', value: 1, correct: true },
    { label: 'B', value: 2, correct: false },
    { label: 'C', value: 0, correct: false },
    { label: 'D', value: -1, correct: false },
  ]

  return {
    t1,
    t2,
    t3,
    correct,
    exprLatex: buildExprLatex(t1, t2, t3),
    numericLatex: buildNumericLatex(t1, t2, t3),
    options,
  }
}

/* =========================
   PRISMA 17 — UI
========================= */
export default function Prisma17({
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
  const [selected, setSelected] = useState<number | null>(null)

  const ej = useMemo(() => generateExercise(), [nonce])

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelected(op.value)
    engine.submit(op.correct)

    persistExerciseOnce({
      exerciseId, // 'Prisma17'
      temaId,
      classroomId,
      sessionId,

      correct: op.correct,
      answer: {
        selected: String(op.value),
        correctAnswer: String(ej.correct),
        latex: ej.exprLatex,
        options: ej.options.map(o => `${o.label}. ${o.value}`),
        extra: {
          exprLatex: ej.exprLatex,
          numericLatex: ej.numericLatex,
          terms: [ej.t1, ej.t2, ej.t3],
        },
      },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  const sign2 = ej.t2.sign === '-' ? '-' : '+'
  const sign3 = ej.t3.sign === '-' ? '-' : '+'

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 17 — Logaritmos"
        prompt="Calcula el valor de M."
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
                <div className="font-semibold mb-2">👀 Paso 0 — Leer bien los signos</div>
                <p className="text-muted-foreground">
                  La expresión tiene tres logaritmos y entre ellos hay signos. Esos signos se respetan al final:
                  <span className="font-semibold"> {sign2} </span> para el segundo término y
                  <span className="font-semibold"> {sign3} </span> para el tercero.
                </p>
              </div>

              {/* Paso 1 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 1 — Evaluar cada logaritmo (idea clave)</div>

                <div className="rounded-md border bg-background p-3">
                  <p className="text-muted-foreground">
                    Un logaritmo responde: <span className="font-semibold">“¿a qué exponente debo elevar la base para
                    obtener el argumento?”</span>
                  </p>

                  <div className="mt-2">
                    <Tex block tex={`\\text{Si } b^k = N,\\ \\text{entonces } \\log_b(N)=k.`} />
                  </div>

                  <p className="mt-2 text-muted-foreground">
                    Aquí el argumento ya fue construido como potencia perfecta de la base, por eso se evalúa directo.
                  </p>
                </div>

                <div className="mt-3 space-y-3">
                  {/* T1 */}
                  <div className="rounded border p-3 bg-white">
                    <div className="font-semibold mb-2">Término 1</div>
                    <Tex block tex={`${ej.t1.base}^{${ej.t1.value}} = ${ej.t1.arg}`} />
                    <Tex block tex={`\\Rightarrow\\ \\log_{${ej.t1.base}}\\left(${ej.t1.arg}\\right) = ${ej.t1.value}`} />
                  </div>

                  {/* T2 */}
                  <div className="rounded border p-3 bg-white">
                    <div className="font-semibold mb-2">
                      Término 2 <span className="text-muted-foreground">(ojo al signo {sign2})</span>
                    </div>
                    <Tex block tex={`${ej.t2.base}^{${ej.t2.value}} = ${ej.t2.arg}`} />
                    <Tex block tex={`\\Rightarrow\\ \\log_{${ej.t2.base}}\\left(${ej.t2.arg}\\right) = ${ej.t2.value}`} />
                  </div>

                  {/* T3 */}
                  <div className="rounded border p-3 bg-white">
                    <div className="font-semibold mb-2">
                      Término 3 <span className="text-muted-foreground">(ojo al signo {sign3})</span>
                    </div>
                    <Tex block tex={`${ej.t3.base}^{${ej.t3.value}} = ${ej.t3.arg}`} />
                    <Tex block tex={`\\Rightarrow\\ \\log_{${ej.t3.base}}\\left(${ej.t3.arg}\\right) = ${ej.t3.value}`} />
                    {ej.t3.arg === 1 && (
                      <p className="mt-2 text-muted-foreground">
                        Tip: como <span className="font-semibold">b^0=1</span>, entonces <span className="font-semibold">
                        \\(\\log_b(1)=0\\)</span>.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Paso 2 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 2 — Sustituimos en la expresión</div>
                <p className="text-muted-foreground">Reemplazamos cada logaritmo por su valor.</p>
                <div className="mt-2 space-y-2">
                  <Tex block tex={ej.exprLatex} />
                  <Tex block tex={ej.numericLatex} />
                </div>
              </div>

              {/* Paso 3 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 3 — Operar respetando signos</div>
                <div className="mt-2">
                  <Tex block tex={`M = ${ej.correct}`} />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm font-semibold">Respuesta:</span>
                  <span className="inline-block px-3 py-2 rounded bg-muted font-mono text-base">{ej.correct}</span>
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        {/* Card de expresión */}
        <div className="rounded-xl border bg-white p-4 mb-4">
          <div className="font-semibold mb-2">Expresión:</div>
          <Tex block tex={ej.exprLatex} />
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
      </ExerciseShell>
    </MathJaxContext>
  )
}
