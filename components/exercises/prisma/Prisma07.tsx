'use client'

import { useMemo, useState } from 'react'
import { MathJax, MathJaxContext } from 'better-react-mathjax'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

/* ============================================================
   PRISMA 7 — Conjuntos unitarios e iguales (A={...}, B={...})
   ✅ 1 SOLO INTENTO (autocalifica al elegir opción)
   ✅ Todo dinámico (a,b,c cambian siempre)
   ✅ Resolución tipo profe
   ✅ Usa better-react-mathjax (NO KaTeX)
   ✅ Persist: MISMA estructura que Prisma01 (exerciseId/temaId/classroomId/sessionId)
============================================================ */

type Option = { label: 'A' | 'B' | 'C' | 'D'; value: number; correct: boolean }

/* =========================
   HELPERS
========================= */
function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function coin(p = 0.5) {
  return Math.random() < p
}

/* =========================
   MathJax Config (igual estilo Prisma01/17)
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
   FORMATEO (texto)
========================= */
function fmtSign(k: number) {
  if (k === 0) return ''
  return k > 0 ? ` + ${k}` : ` - ${Math.abs(k)}`
}
function fmtCoeffVar(coeff: number, v: string) {
  if (coeff === 1) return v
  if (coeff === -1) return `-${v}`
  return `${coeff}${v}`
}
function fmtLinear1(coeff: number, v: string, k: number) {
  return `${fmtCoeffVar(coeff, v)}${fmtSign(k)}`.trim()
}
function fmtLinear2(aC: number, aV: string, bC: number, bV: string, k: number) {
  let s = fmtCoeffVar(aC, aV)
  if (bC !== 0) {
    const sign = bC > 0 ? ' + ' : ' - '
    const abs = Math.abs(bC)
    s += sign + (abs === 1 ? bV : `${abs}${bV}`)
  }
  s += fmtSign(k)
  return s.trim()
}

/* =========================
   FORMATEO (LaTeX)
========================= */
function texCoeffVar(coeff: number, v: string) {
  if (coeff === 1) return v
  if (coeff === -1) return `-${v}`
  return `${coeff}${v}`
}
function texLinear_pa_qb_r(p: number, q: number, r: number) {
  // p a + q b + r
  let s = texCoeffVar(p, 'a')

  if (q !== 0) {
    const term = texCoeffVar(Math.abs(q), 'b')
    s += q > 0 ? `\\,+\\,${term}` : `\\,-\\,${term}`
  }

  if (r !== 0) {
    s += r > 0 ? `\\,+\\,${r}` : `\\,-\\,${Math.abs(r)}`
  }

  return s
}
function texLinear_mb_t(m: number, t: number) {
  if (t === 0) return `${m}b`
  if (t > 0) return `${m}b\\,+\\,${t}`
  return `${m}b\\,-\\,${Math.abs(t)}`
}

/* =========================
   GENERADOR CONTROLADO
   A = {E1, c}
   B = {2c - d, mb + t}
   "unitarios e iguales" ⇒ E1 = c = 2c - d = mb + t

   Elegimos (a,b,c) numéricos, y construimos:
   - d = c para que c = 2c - d se cumpla.
   - t = c - m b para que mb + t = c.
   - r = c - (p a + q b) para que p a + q b + r = c.
========================= */
function generateProblem() {
  for (let tries = 0; tries < 220; tries++) {
    const a = randInt(1, 6)
    const b = randInt(1, 6)
    const c = randInt(4, 12)

    const p = randInt(1, 4)
    const q = randInt(1, 6)
    const r = c - (p * a + q * b)

    const d = c

    const m = randInt(2, 7)
    const t = c - m * b

    // filtros para que se vea “bonito”
    if (Math.abs(r) > 12) continue
    if (Math.abs(t) > 12) continue
    if (r === 0 && t === 0 && coin(0.7)) continue

    const E1_txt = fmtLinear2(p, 'a', q, 'b', r)
    const E3_txt = `2c - ${d}`
    const E4_txt = fmtLinear1(m, 'b', t)

    const E1_tex = texLinear_pa_qb_r(p, q, r)
    const E3_tex = `2c\\,-\\,${d}`
    const E4_tex = texLinear_mb_t(m, t)

    const setA_tex = `A=\\left\\{${E1_tex},\\ c\\right\\}`
    const setB_tex = `B=\\left\\{${E3_tex},\\ ${E4_tex}\\right\\}`

    const sum = a + b + c

    // distractores
    const distractors = new Set<number>()
    while (distractors.size < 3) {
      const delta = choice([-4, -3, -2, -1, 1, 2, 3, 4, 5])
      const cand = sum + delta
      if (cand !== sum && cand > 0) distractors.add(cand)
    }
    const all = [{ v: sum, ok: true }, ...Array.from(distractors).map(v => ({ v, ok: false }))].sort(
      () => Math.random() - 0.5
    )
    const labels: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D']
    const options: Option[] = all.map((x, i) => ({ label: labels[i], value: x.v, correct: x.ok }))

    return {
      vars: { a, b, c },
      forms: { p, q, r, m, t, d, E1_txt, E3_txt, E4_txt },
      formsTex: { E1_tex, E3_tex, E4_tex },
      setsTex: { setA_tex, setB_tex },
      correctSum: sum,
      options,
    }
  }

  // fallback seguro
  return {
    vars: { a: 3, b: 1, c: 7 },
    forms: { p: 2, q: 1, r: 0, m: 5, t: 2, d: 7, E1_txt: '2a + b', E3_txt: '2c - 7', E4_txt: '5b + 2' },
    formsTex: { E1_tex: '2a\\,+\\,b', E3_tex: '2c\\,-\\,7', E4_tex: '5b\\,+\\,2' },
    setsTex: {
      setA_tex: `A=\\left\\{2a\\,+\\,b,\\ c\\right\\}`,
      setB_tex: `B=\\left\\{2c\\,-\\,7,\\ 5b\\,+\\,2\\right\\}`,
    },
    correctSum: 11,
    options: [
      { label: 'A', value: 8, correct: false },
      { label: 'B', value: 9, correct: false },
      { label: 'C', value: 10, correct: false },
      { label: 'D', value: 11, correct: true },
    ],
  }
}

/* =========================
   UI — PRISMA 07
   (firma y persist como Prisma01)
========================= */
export default function Prisma07({
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

  const ex = useMemo(() => generateProblem(), [nonce])

  function pickOption(op: Option) {
    if (!engine.canAnswer) return

    setSelected(op.value)
    engine.submit(op.correct)

    // ✅ MISMA ESTRUCTURA QUE PRISMA01
    persistExerciseOnce({
      exerciseId, // ej: 'Prisma07'
      temaId,
      classroomId,
      sessionId,

      correct: op.correct,

      answer: {
        selected: op.value,
        selectedLabel: op.label,
        correctAnswer: ex.correctSum,
        latex: {
          A: ex.setsTex.setA_tex,
          B: ex.setsTex.setB_tex,
        },
        options: ex.options.map(o => ({ label: o.label, value: o.value })),
        extra: {
          vars: ex.vars,
          forms: ex.forms,
          formsTex: ex.formsTex,
          setsTex: ex.setsTex,
        },
      },
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  const { a, b, c } = ex.vars
  const { p, q, r, m, t, d } = ex.forms
  const { E1_tex, E3_tex, E4_tex } = ex.formsTex

  const chainTex = `\\left(${E1_tex}\\right)=c=\\left(${E3_tex}\\right)=\\left(${E4_tex}\\right)`

  // para mostrar bien los signos dentro de paréntesis
  const tParen = `\\left(${t}\\right)`
  const rParen = `\\left(${r}\\right)`

  return (
    <MathJaxContext version={3} config={MATHJAX_CONFIG}>
      <ExerciseShell
        title="Prisma 7 — Conjuntos unitarios e iguales"
        prompt="Si los siguientes conjuntos son unitarios e iguales, calcule a + b + c."
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
                <div className="font-semibold mb-2">👀 Paso 0 — ¿Qué significa “unitarios e iguales”?</div>
                <p className="text-muted-foreground">
                  Si un conjunto es <span className="font-semibold">unitario</span>, entonces todos los “elementos”
                  dentro del conjunto representan <span className="font-semibold">el mismo valor</span> (para que al
                  final haya un solo elemento).
                </p>
                <p className="text-muted-foreground mt-2">
                  Y como además <span className="font-semibold">A = B</span>, entonces todo coincide:
                </p>
                <div className="mt-2 rounded-md border bg-background p-3">
                  <Tex block tex={chainTex} />
                </div>
              </div>

              {/* Paso 1 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 1 — Hallamos c</div>
                <p className="text-muted-foreground">Usamos la igualdad: \(c = 2c - d\).</p>

                <div className="mt-2 rounded-md border bg-background p-3">
                  <Tex
                    block
                    tex={[
                      `c=2c-${d}`,
                      `c-2c=-${d}`,
                      `-c=-${d}`,
                      `c=${d}`,
                      `\\Rightarrow\\ c=${c}`,
                    ].join('\\\\')}
                  />
                </div>
              </div>

              {/* Paso 2 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 2 — Hallamos b</div>
                <p className="text-muted-foreground">
                  Ahora usamos: \(mb + t = c\) y reemplazamos \(c\).
                </p>

                <div className="mt-2 rounded-md border bg-background p-3">
                  <Tex
                    block
                    tex={[
                      `${m}b+${t}=${c}`.replace('+-', '-'),
                      `${m}b=${c}-${tParen}`,
                      `${m}b=${c - t}`,
                      `b=\\dfrac{${c - t}}{${m}}`,
                      `\\Rightarrow\\ b=${b}`,
                    ].join('\\\\')}
                  />
                </div>
              </div>

              {/* Paso 3 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 3 — Hallamos a</div>
                <p className="text-muted-foreground">
                  Usamos: \(pa + qb + r = c\) y reemplazamos \(b\) y \(c\).
                </p>

                <div className="mt-2 rounded-md border bg-background p-3">
                  <Tex
                    block
                    tex={[
                      `${p}a+${q}b+${r}=${c}`.replace('+-', '-'),
                      `${p}a+${q}\\cdot(${b})+${r}=${c}`.replace('+-', '-'),
                      `${p}a+${q * b}+${r}=${c}`.replace('+-', '-'),
                      `${p}a=${c}-${q * b}-${rParen}`,
                      `${p}a=${c - (q * b + r)}`,
                      `a=\\dfrac{${c - (q * b + r)}}{${p}}`,
                      `\\Rightarrow\\ a=${a}`,
                    ].join('\\\\')}
                  />
                </div>
              </div>

              {/* Paso 4 */}
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">✅ Paso 4 — Piden \(a+b+c\)</div>

                <div className="mt-2 rounded-md border bg-background p-3">
                  <Tex block tex={[`a+b+c=${a}+${b}+${c}`, `a+b+c=${a + b + c}`].join('\\\\')} />
                </div>

                <div className="mt-2 text-muted-foreground">
                  Por lo tanto, la alternativa correcta es: <span className="font-semibold">{ex.correctSum}</span>.
                </div>
              </div>
            </div>
          </SolutionBox>
        }
      >
        {/* Enunciado (card) */}
        <div className="rounded-xl border bg-white p-4 mb-4">
          <div className="font-semibold mb-2">Datos:</div>
          <div className="space-y-2">
            <Tex block tex={ex.setsTex.setA_tex} />
            <Tex block tex={ex.setsTex.setB_tex} />
          </div>
          <div className="mt-2 text-muted-foreground">
            Si los conjuntos son unitarios e iguales, calcula <Tex tex="a+b+c" />.
          </div>
        </div>

        {/* Opciones */}
        <div className="grid grid-cols-2 gap-4">
          {ex.options.map((op:any) => {
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
                <span className="font-semibold mr-2">{op.label}.</span>
                {op.value}
              </button>
            )
          })}
        </div>
      </ExerciseShell>
    </MathJaxContext>
  )
}
