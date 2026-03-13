"use client"

import { useMemo, useState } from "react"
import { Sigma, Divide, ShieldCheck } from "lucide-react"

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

function comb(n: number, k: number) {
  if (k < 0 || k > n) return 0
  const kk = Math.min(k, n - k)
  let num = 1
  let den = 1
  for (let i = 1; i <= kk; i++) {
    num *= n - kk + i
    den *= i
  }
  return Math.round(num / den)
}

const CONTEXTS = [
  {
    group: "estudiantes",
    set: "equipo",
    template: (n: number, k: number) =>
      `En una clase hay ${n} estudiantes. ¿De cuántas formas se puede elegir un equipo de ${k} estudiantes?`,
  },
  {
    group: "jugadores",
    set: "delegación",
    template: (n: number, k: number) =>
      `Un entrenador tiene ${n} jugadores disponibles. ¿De cuántas maneras puede escoger una delegación de ${k}?`,
  },
  {
    group: "libros",
    set: "lote",
    template: (n: number, k: number) =>
      `En una biblioteca se seleccionan ${k} libros entre ${n} disponibles. ¿Cuántas selecciones distintas pueden hacerse?`,
  },
  {
    group: "candidatos",
    set: "comité",
    template: (n: number, k: number) =>
      `Hay ${n} candidatos para formar un comité de ${k} personas. ¿De cuántas formas puede integrarse?`,
  },
] as const

type Scenario = ReturnType<typeof buildScenario>

function buildScenario(exclude: string[]) {
  for (let tries = 0; tries < 700; tries++) {
    const n = randInt(8, 16)
    const k = choice([2, 3, 4, 5] as const)
    if (k >= n) continue

    const correctNum = comb(n, k)
    if (correctNum <= 0) continue

    const context = choice(CONTEXTS)
    const signature = `${context.group}-${n}-${k}-${correctNum}`
    if (exclude.includes(signature)) continue

    const perm = (() => {
      let p = 1
      for (let i = 0; i < k; i++) p *= n - i
      return p
    })()

    const candidates = [
      correctNum,
      perm,
      comb(n - 1, k),
      comb(n, k - 1),
      comb(n - 1, k - 1),
      Math.max(1, correctNum + choice([-10, -6, 6, 10, 15] as const)),
      Math.max(1, correctNum + randInt(-18, 18)),
    ]

    const seen = new Set<number>()
    const uniq: number[] = []
    for (const value of shuffle(candidates)) {
      if (seen.has(value)) continue
      seen.add(value)
      uniq.push(value)
    }

    while (uniq.length < 5) {
      const extra = Math.max(1, correctNum + randInt(-25, 25))
      if (!seen.has(extra)) {
        seen.add(extra)
        uniq.push(extra)
      }
    }

    const correct = `${correctNum}`
    const options: Option[] = shuffle(uniq.slice(0, 5)).map(value => ({
      value: `${value}`,
      correct: value === correctNum,
    }))

    return {
      n,
      k,
      correctNum,
      correct,
      signature,
      context,
      options,
      prompt: context.template(n, k),
    }
  }

  const n = 10
  const k = 3
  const correctNum = comb(n, k)
  const correct = `${correctNum}`
  const context = CONTEXTS[0]
  const options: Option[] = shuffle([correct, "120", "45", "210", "100"]).map(v => ({
    value: v,
    correct: v === correct,
  }))
  return {
    n,
    k,
    correctNum,
    correct,
    signature: "FB19",
    context,
    options,
    prompt: context.template(n, k),
  }
}

export default function Ej19({
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
  const [history, setHistory] = useState<string[]>([])

  const { elapsed, startedAtRef } = useExerciseTimer(engine.canAnswer, nonce)
  const trophyPreview = useMemo(() => computeTrophyGain(elapsed), [elapsed])

  const scenario = useMemo(() => {
    const recent = history.slice(-14)
    return buildScenario(recent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce])

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
        question: { n: scenario.n, k: scenario.k, context: scenario.context.group },
        computed: { combinations: scenario.correctNum },
        options: scenario.options.map(o => o.value),
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setHistory(h => [...h, scenario.signature].slice(-28))
    setNonce(n => n + 1)
  }

  return (
    <MathProvider>
      <ExerciseShell
        title="Conteo (combinaciones)"
        prompt={scenario.prompt}
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
                  title: "Identificar el tipo de conteo",
                  detail: (
                    <span>
                      La selección no depende del orden, entonces usamos combinaciones.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\text{Usamos }\\binom{n}{k}\\text{ porque el orden no importa.}`} />
                      <MathTex block tex={`\\binom{${scenario.n}}{${scenario.k}}`} />
                    </div>
                  ),
                },
                {
                  title: "Calcular la combinación",
                  detail: <span>Aplicamos la fórmula o calculamos directamente.</span>,
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\binom{${scenario.n}}{${scenario.k}} = ${scenario.correct}`} />
                    </div>
                  ),
                },
                {
                  title: "Respuesta",
                  detail: <span>Ese es el número de formas posibles.</span>,
                  icon: ShieldCheck,
                  content: <MathTex block tex={scenario.correct} />,
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
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <MathTex block tex={`n=${scenario.n},\\ k=${scenario.k}`} />
            <MathTex block tex={`\\text{Formas} = \\binom{${scenario.n}}{${scenario.k}}`} />
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
