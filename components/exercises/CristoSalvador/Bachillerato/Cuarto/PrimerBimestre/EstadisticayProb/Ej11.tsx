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
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* =========================
   ESCENARIO
   Tabla: #Simulacros = 0,1,2,3
   f0 conocido, F1 conocido, F2 conocido (implícito), F3 = n
   Dado: p% tuvo al menos 2 => f2 + f3 = p*n
   Pregunta: hallar f2
========================= */
type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  // n múltiplo de 10 para porcentajes limpios
  const n = choice([40, 50, 60, 70, 80])

  // f0 pequeño
  const f0 = randInt(4, Math.max(6, Math.floor(n * 0.15)))

  // F1 (acumulada hasta 1) > f0
  const F1 = randInt(f0 + 8, f0 + Math.floor(n * 0.35))

  const f1 = F1 - f0

  // porcentaje de "al menos 2" => f2 + f3
  // elegimos p que haga p*n entero (n es múltiplo de 10)
  const p = choice([50, 60, 70, 80]) // %
  const atLeast2 = Math.round((p / 100) * n)

  // Entonces f0 + f1 + f2 + f3 = n  y  f2 + f3 = atLeast2
  // => f0 + f1 + atLeast2 = n  ? no necesariamente, porque atLeast2 depende del total.
  // En realidad: f2+f3 = atLeast2, y f0+f1 = n - atLeast2.
  // Debemos forzar coherencia: F1 = f0+f1 debe ser n - atLeast2.
  // Ajustamos: hacemos que F1 sea exactamente n - atLeast2 para que todo cierre.
  const F1Fixed = n - atLeast2
  // si queda raro (negativo o muy pequeño), reintenta
  if (F1Fixed <= f0 + 2) return generateScenario()

  const f1Fixed = F1Fixed - f0

  // ahora elegimos f3 y calculamos f2
  const f3 = randInt(6, Math.max(6, atLeast2 - 6))
  const f2 = atLeast2 - f3

  // validaciones
  if (f2 <= 0) return generateScenario()
  if (f0 + f1Fixed + f2 + f3 !== n) return generateScenario()

  const F0 = f0
  const F1ok = f0 + f1Fixed
  const F2 = f0 + f1Fixed + f2
  const F3 = n

  const correct = f2

  // opciones: distractores típicos
  const d1 = f2 + choice([-6, -4, 4, 6])
  const d2 = f3 // confunden y ponen f3
  const d3 = atLeast2 // confunden con el “al menos 2”
  const d4 = F2 // confunden con acumulada

  const candidates = shuffle([correct, d1, d2, d3, d4].map(x => Math.max(1, x)))
  const uniq: number[] = []
  for (const v of candidates) {
    if (!uniq.includes(v)) uniq.push(v)
  }
  while (uniq.length < 5) uniq.push(correct + randInt(7, 15))

  const options: Option[] = shuffle(uniq.slice(0, 5)).map(v => ({
    value: String(v),
    correct: v === correct,
  }))

  return {
    n,
    p,
    f0,
    f1: f1Fixed,
    f2,
    f3,
    F0,
    F1: F1ok,
    F2,
    F3,
    atLeast2,
    correct,
    options,
  }
}

/* ============================================================
   COMPONENTE
============================================================ */
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
          table: {
            simulacros: [0, 1, 2, 3],
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
\\text{Simulacros} & f & F \\\\ \\hline
0 & ${scenario.f0} & ${scenario.F0} \\\\
1 & a & ${scenario.F1} \\\\
2 & b & ${scenario.F2} \\\\
3 & c & ${scenario.F3}
\\end{array}
`

  return (
    <MathProvider>
      <ExerciseShell
        title="Ej11 — Frecuencia (al menos) y tabla acumulada"
        prompt={
          <>
            En un grupo de <b>{scenario.n}</b> estudiantes se registró cuántos simulacros rindieron.
            <br />
            Sabiendo que el <b>{scenario.p}%</b> rindió <b>al menos 2</b> simulacros, halla <b>b</b>.
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
                      “Al menos 2” significa <b>2 o 3</b> simulacros: \(b + c\).
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
                  title: "Usar la frecuencia acumulada hasta 1",
                  detail: (
                    <span>
                      La acumulada hasta 1 es \(F_1 = f_0 + a\). Eso representa los que hicieron <b>0 o 1</b>.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`F_1 = ${scenario.F1}`} />
                      <MathTex block tex={`F_1 = f_0 + a = ${scenario.f0} + a`} />
                      <MathTex block tex={`\\Rightarrow\\ a = ${scenario.F1} - ${scenario.f0} = ${scenario.f1}`} />
                    </div>
                  ),
                },
                {
                  title: "Hallar b con el total",
                  detail: (
                    <span>
                      Si \(b+c\) ya es {scenario.atLeast2} y elegimos \(c\) según la tabla, entonces \(b\) se despeja.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: (
                    <div className="space-y-3">
                      <MathTex block tex={`\\text{Tabla:}`} />
                      <MathTex block tex={tableTex} />
                      <MathTex block tex={`b + c = ${scenario.atLeast2}`} />
                      <MathTex block tex={`b = ${scenario.atLeast2} - c = ${scenario.atLeast2} - ${scenario.f3} = ${scenario.f2}`} />
                    </div>
                  ),
                },
              ]}
              concluding={<span>Respuesta final: <b>b = {scenario.correct}</b>.</span>}
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
          renderValue={(op) => <span className="font-semibold">{op.value}</span>}
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