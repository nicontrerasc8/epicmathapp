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

function texThousands(n: number) {
  // 80000 -> 80\,000 ; 62500 -> 62\,500
  const s = Math.round(n).toString()
  const parts: string[] = []
  let i = s.length
  while (i > 3) {
    parts.unshift(s.slice(i - 3, i))
    i -= 3
  }
  parts.unshift(s.slice(0, i))
  return parts.join("\\,")
}

function texDecComma(n: number, decimals = 2) {
  // 0.03 -> 0{,}03 ; 1.6 -> 1{,}6 ; 1.25 -> 1{,}25
  let s = Number(n.toFixed(decimals)).toString()
  if (s.includes("e") || s.includes("E")) {
    // fallback (no debería ocurrir con estos rangos)
    s = n.toFixed(decimals)
  }
  if (!s.includes(".")) return s
  const [a, b] = s.split(".")
  return `${a}{,}${b}`
}

function tFracTex(numTex: string, denTex: string) {
  return `t = \\frac{${numTex}}{${denTex}}`
}

/* =========================
   GENERADOR (tipo imagen)
   Tema: modelo exponencial P(t)=P0 e^{kt}
========================= */

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  for (let tries = 0; tries < 250; tries++) {
    const P0 = choice([30000, 40000, 50000, 60000, 70000, 80000, 90000])
    const ratio = choice([1.2, 1.25, 1.3, 1.4, 1.5, 1.6, 1.75, 1.8])
    const Pt = Math.round(P0 * ratio)

    const k = choice([0.01, 0.02, 0.03, 0.04, 0.05, 0.06])

    // evita casos raros (por si acaso)
    if (Pt <= P0) continue
    if (ratio <= 1) continue

    return {
      P0,
      Pt,
      ratio,
      k,
      P0Tex: texThousands(P0),
      PtTex: texThousands(Pt),
      ratioTex: texDecComma(ratio, 2),
      ratioMinus1: ratio - 1,
      ratioMinus1Tex: texDecComma(ratio - 1, 2),
      kTex: texDecComma(k, 2),
    }
  }

  // fallback exactamente como la imagen
  return {
    P0: 50000,
    Pt: 80000,
    ratio: 1.6,
    k: 0.03,
    P0Tex: texThousands(50000),
    PtTex: texThousands(80000),
    ratioTex: "1{,}6",
    ratioMinus1: 0.6,
    ratioMinus1Tex: "0{,}6",
    kTex: "0{,}03",
  }
}

/* =========================
   OPCIONES (A–E tipo imagen)
   Errores típicos:
   - usar ln(ratio-1) en vez de ln(ratio)
   - olvidar el ln
   - olvidar dividir entre k
   - usar ln(Pt) en vez de ln(Pt/P0)
========================= */

function generateOptions(s: Scenario): Option[] {
  const correct = tFracTex(`\\ln\\left(${s.ratioTex}\\right)`, s.kTex)

  const wrongLnMinus1 = tFracTex(`\\ln\\left(${s.ratioMinus1Tex}\\right)`, s.kTex) // ln(r-1)
  const wrongNoLn = tFracTex(`${s.ratioTex}`, s.kTex) // sin ln
  const wrongMissingDivide = `t = \\ln\\left(\\frac{${s.PtTex}}{${s.P0Tex}}\\right)` // olvida /k
  const wrongLnTarget = tFracTex(`\\ln\\left(${s.PtTex}\\right)`, s.kTex) // ln(Pt)/k

  const all = [
    { value: correct, correct: true },
    { value: wrongLnMinus1, correct: false },
    { value: wrongNoLn, correct: false },
    { value: wrongMissingDivide, correct: false },
    { value: wrongLnTarget, correct: false },
  ]

  // dedupe (por si ratio-1 da lo mismo en algún caso raro)
  const seen = new Set<string>()
  const unique: Option[] = []
  for (const o of all) {
    if (seen.has(o.value)) continue
    seen.add(o.value)
    unique.push(o)
  }

  // relleno si faltara (muy raro)
  while (unique.length < 5) {
    const extra = tFracTex(`\\ln\\left(${s.ratioTex}\\right)`, texDecComma(s.k + choice([-0.01, 0.01, 0.02]), 2))
    if (!seen.has(extra)) {
      unique.push({ value: extra, correct: false })
      seen.add(extra)
    }
  }

  return unique.sort(() => Math.random() - 0.5)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function ModeloExponencialPoblacionGame({
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
        correctAnswer: tFracTex(`\\ln\\left(${scenario.ratioTex}\\right)`, scenario.kTex),
        question: {
          P0: scenario.P0,
          Pt: scenario.Pt,
          k: scenario.k,
        },
        computed: {
          ratio: scenario.ratio,
          ratioMinus1: scenario.ratioMinus1,
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

  // TeX del enunciado (tipo imagen)
  const modelTex = String.raw`P(t)=${scenario.P0Tex}\,e^{${scenario.kTex}t}`

  const eqTex = String.raw`${scenario.PtTex}=${scenario.P0Tex}\,e^{${scenario.kTex}t}`
  const divTex = String.raw`\frac{${scenario.PtTex}}{${scenario.P0Tex}}=e^{${scenario.kTex}t}`
  const ratioTex = String.raw`\frac{${scenario.PtTex}}{${scenario.P0Tex}}=${scenario.ratioTex}`
  const lnTex = String.raw`\ln\left(\frac{${scenario.PtTex}}{${scenario.P0Tex}}\right)=${scenario.kTex}\,t`
  const solveTex = String.raw`t=\frac{\ln\left(\frac{${scenario.PtTex}}{${scenario.P0Tex}}\right)}{${scenario.kTex}}=\frac{\ln\left(${scenario.ratioTex}\right)}{${scenario.kTex}}`

  return (
    <MathProvider>
      <ExerciseShell
        title="Modelo exponencial de población"
        prompt="¿Después de cuántos años la población alcanzará el valor indicado?"
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
                  title: "Plantear la ecuación con el dato pedido",
                  detail: <span>Reemplazamos el valor objetivo en el modelo.</span>,
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={String.raw`\text{Modelo: } ${modelTex}`} />
                      <MathTex block tex={String.raw`\text{Buscamos } t \text{ cuando } P(t)=${scenario.PtTex}`} />
                      <MathTex block tex={eqTex} />
                    </div>
                  ),
                },
                {
                  title: "Despejar el exponencial",
                  detail: <span>Dividimos entre {scenario.P0Tex} para dejar sola la potencia.</span>,
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={divTex} />
                      <MathTex block tex={ratioTex} />
                    </div>
                  ),
                  tip: <span>El cociente {scenario.PtTex}/{scenario.P0Tex} es el “factor de crecimiento”.</span>,
                },
                {
                  title: "Aplicar logaritmo natural y despejar t",
                  detail: <span>Usamos ln para “bajar” el exponente.</span>,
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={lnTex} />
                      <MathTex block tex={solveTex} />
                    </div>
                  ),
                  tip: (
                    <span>
                      Regla clave: si <MathTex tex={`e^{kt}=A`} />, entonces <MathTex tex={`kt=\\ln(A)`} />.
                    </span>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta final:{" "}
                  <b>{tFracTex(`\\ln\\left(${scenario.ratioTex}\\right)`, scenario.kTex)}</b>.
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>

          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div className="text-sm">
              La población de una ciudad sigue el modelo:
            </div>
            <MathTex block tex={modelTex} />
            <div className="text-sm">
              donde <b>t</b> es el tiempo en años. ¿Cuándo alcanzará <b>{scenario.PtTex}</b> habitantes?
            </div>
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
