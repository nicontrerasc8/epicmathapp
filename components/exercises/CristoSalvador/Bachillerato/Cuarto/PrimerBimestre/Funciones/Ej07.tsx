"use client"

import { useMemo, useState } from "react"
import { ShieldCheck, Sigma, Divide } from "lucide-react"

import { useExerciseEngine } from "@/lib/exercises/useExerciseEngine"
import { useExerciseSubmission } from "@/lib/exercises/useExerciseSubmission"
import { useExerciseTimer } from "@/lib/exercises/useExerciseTimer"
import { computeTrophyGain, WRONG_PENALTY } from "@/lib/exercises/gamification"

import { type Option, OptionsGrid } from "@/components/exercises/base/OptionsGrid"
import { MathProvider, MathTex } from "@/components/exercises/base/MathBlock"
import { ExerciseHud } from "@/components/exercises/base/ExerciseHud"
import { SolutionBox } from "@/components/exercises/base/SolutionBox"
import { ExerciseShell } from "@/components/exercises/base/ExerciseShell"
import { DetailedExplanation } from "@/components/exercises/base/DetailedExplanation"

/* =========================
   HELPERS
========================= */

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
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

function simplifyFraction(n: number, d: number) {
  if (d === 0) return { n, d }
  const g = gcd(n, d)
  const nn = n / g
  const dd = d / g
  // mantenemos denominador positivo
  if (dd < 0) return { n: -nn, d: -dd }
  return { n: nn, d: dd }
}

function fracTex(n: number, d: number) {
  if (d === 1) return `${n}`
  return `\\frac{${n}}{${d}}`
}

function pow10(k: number) {
  // k chico (1..3), seguro como entero
  return Math.pow(10, k)
}

/* =========================
   GENERADOR (tema: LOG)
   log10(x) - log10(x - d) = k
========================= */

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  // valores “bonitos”
  const d = choice([1, 1, 2, 3, 4, 5, 6, 7, 8, 9]) // 1 más frecuente (como la imagen)
  const k = choice([1, 2, 2, 3]) // 2 más frecuente (como la imagen)

  const p = pow10(k) // 10^k

  // log10(x/(x-d))=k => x/(x-d)=10^k => x = d*10^k/(10^k-1)
  const rawNum = d * p
  const rawDen = p - 1
  const simp = simplifyFraction(rawNum, rawDen)

  const correct = fracTex(simp.n, simp.d)

  return {
    d,
    k,
    p,
    rawNum,
    rawDen,
    simpNum: simp.n,
    simpDen: simp.d,
    correct,
  }
}

/* =========================
   OPCIONES (A-E)
   Trampas típicas:
   - invertir la razón
   - usar +1 en lugar de -1
   - usar k en lugar de 10^k
   - olvidar el factor d
   - olvidar el denominador
========================= */

function generateOptions(s: Scenario): Option[] {
  const { d, k, p } = s
  const correct = s.correct

  const candidates: string[] = []

  // 1) Invertir la razón: x = d*(10^k-1)/10^k
  {
    const simp = simplifyFraction(d * (p - 1), p)
    candidates.push(fracTex(simp.n, simp.d))
  }

  // 2) Error de álgebra: (10^k + 1) en el denominador
  {
    const simp = simplifyFraction(d * p, p + 1)
    candidates.push(fracTex(simp.n, simp.d))
  }

  // 3) Confundir 10^k con k: x/(x-d)=k => x = kd/(k-1) (solo si k>1)
  if (k > 1) {
    const simp = simplifyFraction(d * k, k - 1)
    candidates.push(fracTex(simp.n, simp.d))
  }

  // 4) Olvidar el d: x = 10^k/(10^k-1)
  {
    const simp = simplifyFraction(p, p - 1)
    candidates.push(fracTex(simp.n, simp.d))
  }

  // 5) Olvidar el denominador: x = d*10^k
  candidates.push(String(d * p))

  // 6) “respuesta rápida” típica: x = 10^k
  candidates.push(String(p))

  // armamos set único
  const seen = new Set<string>()
  const options: Option[] = []

  function add(value: string, isCorrect: boolean) {
    if (seen.has(value)) return
    seen.add(value)
    options.push({ value, correct: isCorrect })
  }

  add(correct, true)

  for (const w of candidates) {
    if (w === correct) continue
    add(w, false)
    if (options.length === 5) break
  }

  // relleno por si algo coincidió (raro)
  while (options.length < 5) {
    const extra = fracTex(...Object.values(simplifyFraction(d * p, p - 1 + randInt(1, 4))) as [number, number])
    if (extra !== correct && !seen.has(extra)) add(extra, false)
  }

  return options.sort(() => Math.random() - 0.5)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function LogaritmosEcuacionGame({
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
  const [selected, setSelected] = useState<string | null>(null)

  const { elapsed, startedAtRef } = useExerciseTimer(engine.canAnswer, nonce)

  const scenario = useMemo(() => {
    const s = generateScenario()
    return {
      ...s,
      options: generateOptions(s),
    }
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
        correctAnswer: scenario.correct,
        question: {
          base: 10,
          d: scenario.d,
          k: scenario.k,
        },
        computed: {
          p: scenario.p, // 10^k
          equation: "log10(x) - log10(x - d) = k",
          rawFraction: { num: scenario.rawNum, den: scenario.rawDen },
          simplified: { num: scenario.simpNum, den: scenario.simpDen },
        },
        options: scenario.options.map(o => o.value),
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  const leftExprTex = `\\log_{10}(x) - \\log_{10}(x - ${scenario.d})`
  const fullExprTex = `${leftExprTex} = ${scenario.k}`

  const step1Tex = `\\log_{10}\\!\\left(\\frac{x}{x-${scenario.d}}\\right) = ${scenario.k}`
  const step2Tex = `\\frac{x}{x-${scenario.d}} = 10^{${scenario.k}}`
  const step3Tex = `x = 10^{${scenario.k}}(x-${scenario.d})`
  const step4Tex = `(10^{${scenario.k}}-1)x = 10^{${scenario.k}}\\,${scenario.d}`
  const step5Tex = `x = \\frac{10^{${scenario.k}}\\,${scenario.d}}{10^{${scenario.k}}-1} = ${scenario.correct}`

  const domainTex = `\\text{Dominio: } x > ${scenario.d} \\;\\; (\\text{para que } x-${scenario.d} > 0)`

  return (
    <MathProvider>
      <ExerciseShell
        title="Ecuaciones con logaritmos (propiedades)"
        prompt="Resuelve para x:"
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Guía paso a paso"
              steps={[
                {
                  title: "Usar la propiedad de resta de logaritmos",
                  detail: (
                    <span>
                      Si tienen la misma base:{" "}
                      <b><MathTex tex={`\\log(a)-\\log(b)=\\log\\!\\left(\\frac{a}{b}\\right)`} /></b>.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={fullExprTex} />
                      <MathTex block tex={step1Tex} />
                    </div>
                  ),
                },
                {
                  title: "Pasar a forma exponencial",
                  detail: (
                    <span>
                      Si <MathTex tex={`\\log_{10}(A)=k`} />, entonces <b><MathTex tex={`A=10^k`} /></b>.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={step2Tex} />
                      <MathTex block tex={`10^{${scenario.k}} = ${scenario.p}`} />
                    </div>
                  ),
                },
                {
                  title: "Despejar x",
                  detail: <span>Cruzamos y ordenamos términos para aislar <MathTex tex={`x`} />.</span>,
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={step3Tex} />
                      <MathTex block tex={step4Tex} />
                      <MathTex block tex={step5Tex} />
                      <MathTex block tex={domainTex} />
                    </div>
                  ),
                  tip: (
                    <span>
                      Ojo con el dominio: dentro del logaritmo solo pueden entrar números <b>positivos</b>.
                    </span>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta final: <b>{scenario.correct}</b>.
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3">
            <MathTex block tex={fullExprTex} />
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={op => <MathTex tex={op.value} />}
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
