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

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function choice<T>(arr: readonly T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function combLikeUnique(values: number[], correct: number) {
  const seen = new Set<number>()
  const unique: number[] = []
  for (const value of shuffle(values.map(v => Math.max(1, v)))) {
    if (seen.has(value)) continue
    seen.add(value)
    unique.push(value)
  }
  while (unique.length < 5) {
    const extra = Math.max(1, correct + randInt(-15, 15))
    if (!seen.has(extra)) {
      seen.add(extra)
      unique.push(extra)
    }
  }
  return shuffle(unique.slice(0, 5)).map(value => ({
    value: String(value),
    correct: value === correct,
  }))
}

const CONTEXTS = [
  { noun: "simulacros rindieron", total: "estudiantes" },
  { noun: "talleres completaron", total: "participantes" },
  { noun: "prácticas resolvieron", total: "alumnos" },
  { noun: "actividades entregaron", total: "estudiantes" },
] as const

type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  for (let tries = 0; tries < 800; tries++) {
    const n = choice([40, 50, 60, 70, 80] as const)
    const context = choice(CONTEXTS)
    const askFor = choice(["b", "c"] as const)
    const p = choice([50, 60, 70, 80] as const)
    const atLeast2 = Math.round((p / 100) * n)

    const f0 = randInt(4, Math.max(6, Math.floor(n * 0.15)))
    const F1 = n - atLeast2
    if (F1 <= f0 + 2) continue

    const f1 = F1 - f0
    const f3 = randInt(6, Math.max(6, atLeast2 - 6))
    const f2 = atLeast2 - f3

    if (f2 <= 0) continue
    if (f0 + f1 + f2 + f3 !== n) continue

    const F0 = f0
    const F2 = f0 + f1 + f2
    const F3 = n

    const correct = askFor === "b" ? f2 : f3
    const distractors = [
      askFor === "b" ? f3 : f2,
      atLeast2,
      F2,
      F1,
      correct + choice([-6, -4, 4, 6] as const),
    ]

    const options = combLikeUnique([correct, ...distractors], correct)

    return {
      n,
      p,
      f0,
      f1,
      f2,
      f3,
      F0,
      F1,
      F2,
      F3,
      atLeast2,
      correct,
      askFor,
      context,
      options,
    }
  }

  const n = 50
  const p = 60
  const atLeast2 = 30
  const f0 = 8
  const f1 = 12
  const f2 = 18
  const f3 = 12
  const F0 = f0
  const F1 = f0 + f1
  const F2 = F1 + f2
  const F3 = n
  const correct = f2
  return {
    n,
    p,
    f0,
    f1,
    f2,
    f3,
    F0,
    F1,
    F2,
    F3,
    atLeast2,
    correct,
    askFor: "b" as const,
    context: CONTEXTS[0],
    options: combLikeUnique([correct, f3, atLeast2, F2, F1], correct),
  }
}

export default function Ej11({
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

  const scenario = useMemo(() => generateScenario(), [nonce])
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
        correctAnswer: String(scenario.correct),
        question: {
          n: scenario.n,
          p: scenario.p,
          askFor: scenario.askFor,
          table: {
            items: [0, 1, 2, 3],
            f: [scenario.f0, scenario.f1, "b", "c"],
            F: [scenario.F0, scenario.F1, scenario.F2, scenario.F3],
          },
        },
        computed: {
          atLeast2: scenario.atLeast2,
          f2: scenario.f2,
          f3: scenario.f3,
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

  const tableTex = `
\\begin{array}{c|c|c}
\\text{Cantidad} & f & F \\\\ \\hline
0 & ${scenario.f0} & ${scenario.F0} \\\\
1 & a & ${scenario.F1} \\\\
2 & b & ${scenario.F2} \\\\
3 & c & ${scenario.F3}
\\end{array}
`

  const askedTex = scenario.askFor === "b" ? "b" : "c"
  const solveTex =
    scenario.askFor === "b"
      ? `b = ${scenario.atLeast2} - ${scenario.f3} = ${scenario.f2}`
      : `c = ${scenario.atLeast2} - ${scenario.f2} = ${scenario.f3}`

  return (
    <MathProvider>
      <ExerciseShell
        title="Frecuencia y tabla acumulada"
        prompt={
          <>
            En un grupo de <b>{scenario.n}</b> {scenario.context.total} se registró cuántos {scenario.context.noun}.
            <br />
            Sabiendo que el <b>{scenario.p}%</b> realizó <b>al menos 2</b>, halla <b>{askedTex}</b>.
          </>
        }
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Resolución"
              steps={[
                {
                  title: "Convertir el porcentaje a cantidad",
                  detail: (
                    <span>
                      “Al menos 2” significa 2 o 3, así que corresponde a <MathTex tex={`b+c`} />.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\text{Total} = ${scenario.n}`} />
                      <MathTex block tex={`${scenario.p}\\%\\ \\text{de }${scenario.n} = ${scenario.atLeast2}`} />
                      <MathTex block tex={`\\Rightarrow\\ b + c = ${scenario.atLeast2}`} />
                    </div>
                  ),
                },
                {
                  title: "Usar la frecuencia acumulada",
                  detail: (
                    <span>
                      La acumulada hasta 1 representa a quienes hicieron 0 o 1.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`F_1 = ${scenario.F1}`} />
                      <MathTex block tex={`F_1 = ${scenario.f0} + a`} />
                      <MathTex block tex={`a = ${scenario.F1} - ${scenario.f0} = ${scenario.f1}`} />
                    </div>
                  ),
                },
                {
                  title: "Despejar el dato pedido",
                  detail: <span>Ahora usamos <MathTex tex={`b+c=${scenario.atLeast2}`} /> para hallar {askedTex}.</span>,
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={tableTex} />
                      <MathTex block tex={solveTex} />
                    </div>
                  ),
                },
              ]}
              concluding={<span>Respuesta final: <b>{askedTex} = {scenario.correct}</b>.</span>}
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Tabla</div>
          <div className="rounded-lg border bg-background p-3">
            <MathTex block tex={tableTex} />
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={op => <span className="font-semibold">{op.value}</span>}
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
