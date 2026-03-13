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

function texSolutions(values: number[]) {
  return values.map(value => `x=${texLn(value)}`).join("\\ \\text{o}\\ ")
}

function texFactorFromRoot(root: number) {
  return root >= 0 ? `(u-${root})` : `(u+${Math.abs(root)})`
}

function texSignedTerm(coef: number, variable?: string) {
  const abs = Math.abs(coef)
  const sign = coef >= 0 ? "+" : "-"

  if (variable) {
    if (abs === 1) return `${sign} ${variable}`
    return `${sign} ${abs}${variable}`
  }

  return `${sign} ${abs}`
}

/* =========================
   GENERADOR
========================= */

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  const positives = [2, 3, 4, 5, 6, 7, 8, 9]
  const negatives = [2, 3, 4, 5, 6, 7]
  const oneInvalidRoot = Math.random() < 0.45

  let r1 = choice(positives)
  let r2 = choice(positives)

  if (oneInvalidRoot) {
    r2 = -choice(negatives)
  } else {
    while (r2 === r1) r2 = choice(positives)
  }

  const S = r1 + r2
  const P = r1 * r2
  const b = -S
  const validRoots = [r1, r2].filter(value => value > 0).sort((a, bSort) => a - bSort)
  const invalidRoots = [r1, r2].filter(value => value <= 0).sort((a, bSort) => a - bSort)

  return {
    r1,
    r2,
    S,
    P,
    b,
    equationTex: `e^{2x} ${texSignedTerm(b, "e^{x}")} ${texSignedTerm(P)} = 0`,
    validRoots,
    invalidRoots,
    oneInvalidRoot,
    correct: texSolutions(validRoots),
  }
}

/* =========================
   OPCIONES
========================= */

function generateOptions(s: Scenario): Option[] {
  const positiveRoot = s.validRoots[0]
  const otherRoot = s.r1 === positiveRoot ? s.r2 : s.r1

  const positiveDistractors = [
    `x=${s.r1}\\ \\text{o}\\ x=${s.r2}`,
    `x=${texLn(s.P)}`,
    `x=${texLn(s.S)}`,
    texSolutions([s.r1, s.P]),
    texSolutions([s.P, s.r2]),
    texSolutions([1, s.r2]),
    `x=${Math.min(s.r1, s.r2)}`,
    `\\text{No tiene solución real}`,
  ]

  const invalidDistractors = [
    `x=${positiveRoot}`,
    `x=${s.r1}\\ \\text{o}\\ x=${s.r2}`,
    `x=${texLn(Math.abs(otherRoot))}`,
    texSolutions([positiveRoot, Math.abs(otherRoot)]),
    `x=${texLn(Math.max(2, Math.abs(s.S)))}`,
    `x=${texLn(Math.abs(s.P))}`,
    `\\text{No tiene solución real}`,
    texSolutions([positiveRoot, positiveRoot + 1]),
  ]

  const distractorPool = s.oneInvalidRoot ? invalidDistractors : positiveDistractors
  const seen = new Set<string>([s.correct])
  const unique: Option[] = [{ value: s.correct, correct: true }]

  for (const value of shuffle(distractorPool)) {
    if (seen.has(value)) continue
    seen.add(value)
    unique.push({ value, correct: false })
    if (unique.length === 5) break
  }

  while (unique.length < 5) {
    const base = Math.max(2, Math.abs(s.S) + unique.length)
    const fallback = `x=${texLn(base)}`
    if (!seen.has(fallback)) {
      seen.add(fallback)
      unique.push({ value: fallback, correct: false })
      continue
    }

    const alt = texSolutions([positiveRoot, base])
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
          quadratic: `u^2 ${texSignedTerm(scenario.b, "u")} ${texSignedTerm(scenario.P)} = 0`,
          factor: `${texFactorFromRoot(scenario.r1)}${texFactorFromRoot(scenario.r2)}=0`,
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

  const validBackTex =
    scenario.validRoots.length === 2
      ? `e^x=${scenario.validRoots[0]}\\ \\text{o}\\ e^x=${scenario.validRoots[1]}`
      : `e^x=${scenario.validRoots[0]}`

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
                      <MathTex
                        block
                        tex={`u^2 ${texSignedTerm(scenario.b, "u")} ${texSignedTerm(scenario.P)}=0`}
                      />
                    </div>
                  ),
                },
                {
                  title: "Resolver la cuadrática",
                  detail: (
                    <span>
                      Buscamos dos números que multipliquen <MathTex tex={`P`} /> y sumen{" "}
                      <MathTex tex={`S`} />.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex
                        block
                        tex={`u^2 ${texSignedTerm(scenario.b, "u")} ${texSignedTerm(scenario.P)}=0`}
                      />
                      <MathTex
                        block
                        tex={`${texFactorFromRoot(scenario.r1)}${texFactorFromRoot(scenario.r2)}=0`}
                      />
                      <MathTex block tex={`u=${scenario.r1}\\ \\text{o}\\ u=${scenario.r2}`} />
                    </div>
                  ),
                },
                {
                  title: "Volver a x con logaritmos",
                  detail: (
                    <span>
                      Reemplazamos <MathTex tex={`u=e^x`} />, filtramos con <MathTex tex={`u>0`} /> y luego
                      aplicamos <MathTex tex={`\\ln`} />.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`e^x=${scenario.r1}\\ \\text{o}\\ e^x=${scenario.r2}`} />
                      <MathTex block tex={validBackTex} />
                      <MathTex block tex={scenario.correct} />
                      {scenario.oneInvalidRoot ? (
                        <MathTex
                          block
                          tex={`\\text{Se descarta }u=${scenario.invalidRoots[0]}\\text{ porque }u=e^x>0`}
                        />
                      ) : null}
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
