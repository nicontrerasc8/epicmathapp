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

function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function texLn(n: number) {
  return `\\ln(${n})`
}

function texPair(a: string, b: string) {
  return `x=${a}\\ \\text{o}\\ x=${b}`
}

/* =========================
   GENERADOR
========================= */

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  const pool = [2, 3, 4, 5, 6, 7, 8, 9]
  const r1 = choice(pool)
  let r2 = choice(pool)
  while (r2 === r1) r2 = choice(pool)

  const a = Math.min(r1, r2)
  const b = Math.max(r1, r2)
  const S = a + b
  const P = a * b

  return {
    r1: a,
    r2: b,
    S,
    P,
    equationTex: `e^{2x} - ${S}e^{x} + ${P} = 0`,
    correct: texPair(texLn(a), texLn(b)),
  }
}

/* =========================
   OPCIONES
========================= */

function generateOptions(s: Scenario): Option[] {
  const distractorPool = [
    texPair(String(s.r1), String(s.r2)),
    texPair(texLn(s.P), texLn(s.r2)),
    texPair(texLn(s.r1), texLn(s.P)),
    texPair(texLn(1), texLn(s.r2)),
    `x=${texLn(s.P)}`,
    `x=${texLn(s.S)}`,
    `x=${texLn(Math.abs(s.r2 - s.r1))}`,
    `x=${texLn(Math.floor((s.r1 + s.r2) / 2))}`,
    `\\text{No tiene solución real}`,
  ]

  const seen = new Set<string>([s.correct])
  const unique: Option[] = [{ value: s.correct, correct: true }]

  for (const value of shuffle(distractorPool)) {
    if (seen.has(value)) continue
    seen.add(value)
    unique.push({ value, correct: false })
    if (unique.length === 5) break
  }

  while (unique.length < 5) {
    const fallback = `x=${texLn(s.S + unique.length)}`
    if (!seen.has(fallback)) {
      seen.add(fallback)
      unique.push({ value: fallback, correct: false })
      continue
    }

    const alt = texPair(texLn(s.r1), texLn(s.S + unique.length))
    if (!seen.has(alt)) {
      seen.add(alt)
      unique.push({ value: alt, correct: false })
    }
  }

  return shuffle(unique)
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
                      <MathTex tex={`u=e^x`} />. Nota: <MathTex tex={`u=e^x\\,>\\,0`} />.
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
                },
                {
                  title: "Resolver la cuadrática",
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
                },
                {
                  title: "Volver a x con logaritmos",
                  detail: (
                    <span>
                      Reemplazamos <MathTex tex={`u=e^x`} /> y aplicamos <MathTex tex={`\\ln`} />.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`e^x=${scenario.r1}\\ \\text{o}\\ e^x=${scenario.r2}`} />
                      <MathTex block tex={scenario.correct} />
                    </div>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta final: <MathTex tex={scenario.correct} />.
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
