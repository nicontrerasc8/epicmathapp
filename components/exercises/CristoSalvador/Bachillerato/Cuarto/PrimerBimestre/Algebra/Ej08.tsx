"use client"

import { useMemo, useState } from "react"
import { ShieldCheck, Sigma, Divide } from "lucide-react"

import { useExerciseEngine } from "@/lib/exercises/useExerciseEngine"
import { useExerciseSubmission } from "@/lib/exercises/useExerciseSubmission"
import { useExerciseTimer } from "@/lib/exercises/useExerciseTimer"
import { computeTrophyGain, WRONG_PENALTY } from "@/lib/exercises/gamification"

import { Option, OptionsGrid } from "@/components/exercises/base/OptionsGrid"
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
function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function texLn(n: number) {
  return `\\ln(${n})`
}

/* =========================
   GENERADOR (tema: e^{2x} - S e^x + P = 0)
   Construimos el caso desde raíces positivas:
   u = e^x => (u - r1)(u - r2) = 0
========================= */

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  // raíces positivas “bonitas” (evitamos 1 para no chocar con ln(1))
  const pool = [2, 3, 4, 5, 6, 7, 8, 9]
  const r1 = choice(pool)
  let r2 = choice(pool)
  while (r2 === r1) r2 = choice(pool)

  const a = Math.min(r1, r2)
  const b = Math.max(r1, r2)

  const S = a + b
  const P = a * b

  const equationTex = `e^{2x} - ${S}e^{x} + ${P} = 0`
  const correct = `x=${texLn(a)}\\ \\text{o}\\ x=${texLn(b)}`

  return {
    r1: a,
    r2: b,
    S,
    P,
    equationTex,
    correct,
  }
}

/* =========================
   OPCIONES (A–E tipo imagen)
========================= */

function generateOptions(s: Scenario): Option[] {
  const correct = s.correct

  const wrongForgetLn = `x=${s.r1}\\ \\text{o}\\ x=${s.r2}`
  const wrongProduct = `x=${texLn(s.P)}`
  const wrongLn1 = `x=${texLn(1)}`
  const wrongNoReal = `\\text{No tiene solución real}`

  const all: Option[] = [
    { value: correct, correct: true },
    { value: wrongForgetLn, correct: false },
    { value: wrongProduct, correct: false },
    { value: wrongLn1, correct: false },
    { value: wrongNoReal, correct: false },
  ]

  // por si acaso, evitar duplicados (muy raro con nuestra selección)
  const seen = new Set<string>()
  const unique: Option[] = []
  for (const o of all) {
    if (seen.has(o.value)) continue
    seen.add(o.value)
    unique.push(o)
  }

  // si por alguna razón faltara alguna, relleno con “ln(S)” típico error
  while (unique.length < 5) {
    const extra = `x=${texLn(s.S)}`
    if (!seen.has(extra) && extra !== correct) {
      unique.push({ value: extra, correct: false })
      seen.add(extra)
    } else {
      unique.push({ value: `x=${texLn(s.S + 1)}`, correct: false })
    }
  }

  return shuffle(unique).slice(0, 5)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function EcuacionExponencialCuadraticaGame({
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
          equationTex: scenario.equationTex,
          r1: scenario.r1,
          r2: scenario.r2,
          S: scenario.S,
          P: scenario.P,
        },
        steps: {
          substitution: "u = e^x",
          quadratic: `u^2 - ${scenario.S}u + ${scenario.P} = 0`,
          factor: `(u-${scenario.r1})(u-${scenario.r2})=0`,
          back: `e^x=${scenario.r1}\\ \\text{o}\\ e^x=${scenario.r2}`,
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

  return (
    <MathProvider>
      <ExerciseShell
        title="Ecuación exponencial: cuadrática en e^x"
        prompt="Resolver:"
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
                  title: "Hacer la sustitución u = e^x",
                  detail: (
                    <span>
                      Como aparece <MathTex tex={`e^{2x}`} /> y <MathTex tex={`e^{x}`} />, conviene poner{" "}
                      <MathTex tex={`u=e^x`} />. Nota: <MathTex tex={`u=e^x>0`} />.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={scenario.equationTex} />
                      <MathTex block tex={`u=e^x\\ \\Rightarrow\\ e^{2x}=(e^x)^2=u^2`} />
                      <MathTex block tex={`u^2-${scenario.S}u+${scenario.P}=0`} />
                    </div>
                  ),
                  tip: (
                    <span>
                      Esto transforma el problema en una ecuación cuadrática “normal”, pero en la variable{" "}
                      <MathTex tex={`u`} />.
                    </span>
                  ),
                },
                {
                  title: "Resolver la cuadrática (factorizando)",
                  detail: (
                    <span>
                      Buscamos dos números positivos que multipliquen <MathTex tex={`P`} /> y sumen{" "}
                      <MathTex tex={`S`} />.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`u^2-${scenario.S}u+${scenario.P}=0`} />
                      <MathTex block tex={`(u-${scenario.r1})(u-${scenario.r2})=0`} />
                      <MathTex block tex={`u=${scenario.r1}\\ \\text{o}\\ u=${scenario.r2}`} />
                    </div>
                  ),
                  tip: (
                    <span>
                      Aquí salió “bonito” porque el ejercicio está construido para factorizar directo.
                    </span>
                  ),
                },
                {
                  title: "Volver a x con logaritmos",
                  detail: (
                    <span>
                      Reemplazamos <MathTex tex={`u=e^x`} /> y aplicamos <MathTex tex={`\\ln`} /> a ambos lados.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex
                        block
                        tex={`e^x=${scenario.r1}\\ \\text{o}\\ e^x=${scenario.r2}`}
                      />
                      <MathTex
                        block
                        tex={`x=${texLn(scenario.r1)}\\ \\text{o}\\ x=${texLn(scenario.r2)}`}
                      />
                    </div>
                  ),
                  tip: (
                    <span>
                      Error típico: quedarse con <MathTex tex={`x=${scenario.r1}`} /> o{" "}
                      <MathTex tex={`x=${scenario.r2}`} />. Recuerda que si <MathTex tex={`e^x=a`} />, entonces{" "}
                      <MathTex tex={`x=\\ln(a)`} />.
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
            <MathTex block tex={scenario.equationTex} />
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={(op) => <MathTex tex={op.value} />}
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
