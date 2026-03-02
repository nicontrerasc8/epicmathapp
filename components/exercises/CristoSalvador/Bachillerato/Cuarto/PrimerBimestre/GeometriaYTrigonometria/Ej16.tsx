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
function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}
function dist2(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

type Site = { id: string; x: number; y: number; v: number }
type Scenario = ReturnType<typeof generateScenario>

function generateScenario() {
  const n = randInt(4, 7)
  const sites: Site[] = []
  const used = new Set<string>()

  for (let tries = 0; tries < 600 && sites.length < n; tries++) {
    const x = randInt(-8, 8)
    const y = randInt(-8, 8)
    const key = `${x},${y}`
    if (used.has(key)) continue
    used.add(key)

    // valor tipo "medición" (puede ser temp, lluvia, etc.)
    const v = randInt(10, 90)
    sites.push({ id: `S${sites.length + 1}`, x, y, v })
  }

  if (sites.length < 4) {
    sites.splice(
      0,
      sites.length,
      { id: "S1", x: -4, y: 1, v: 20 },
      { id: "S2", x: 3, y: -2, v: 65 },
      { id: "S3", x: 5, y: 5, v: 42 },
      { id: "S4", x: -1, y: -6, v: 80 }
    )
  }

  // punto objetivo P (evitar que coincida con un sitio)
  let px = randInt(-8, 8)
  let py = randInt(-8, 8)
  for (let tries = 0; tries < 50; tries++) {
    if (!sites.some(s => s.x === px && s.y === py)) break
    px = randInt(-8, 8)
    py = randInt(-8, 8)
  }

  // encontrar el sitio más cercano
  let best = sites[0]
  let bestD2 = dist2(px, py, best.x, best.y)
  for (const s of sites.slice(1)) {
    const d2 = dist2(px, py, s.x, s.y)
    if (d2 < bestD2) {
      bestD2 = d2
      best = s
    }
  }

  return { sites, P: { x: px, y: py }, nearest: best, nearestD2: bestD2 }
}

function generateOptions(): Option[] {
  const options: Option[] = [
    { value: "El promedio de todos", correct: false },
    { value: "El sitio más cercano", correct: true }, // ✅ B
    { value: "El sitio más lejano", correct: false },
    { value: "La mediana", correct: false },
    { value: "Una parábola", correct: false },
  ]
  return shuffle(options)
}

function formatSites(sites: Site[]) {
  return sites
    .map(s => `${s.id}(${s.x}, ${s.y}) → ${s.v}`)
    .join(" | ")
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function VecinoMasProximoGame({
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
    return { ...s, options: generateOptions() }
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
        correctAnswer: "El sitio más cercano",
        question: {
          type: "nearest_neighbor_interpolation",
          P: scenario.P,
          sites: scenario.sites,
          nearest: scenario.nearest,
        },
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  const nniTex = `
\\text{NNI: } \\hat{z}(P)=z(S^*) \\;\\;\\text{donde } S^* = \\arg\\min_{S_i} d(P,S_i)
`
  const demoTex = `
P(${scenario.P.x},${scenario.P.y}) \\Rightarrow
S^*=${scenario.nearest.id}(${scenario.nearest.x},${scenario.nearest.y})
\\Rightarrow \\hat{z}(P)=${scenario.nearest.v}
`

  return (
    <MathProvider>
      <ExerciseShell
        title="Interpolación del vecino más próximo (NNI)"
        prompt="La interpolación del vecino más próximo asigna un valor basándose en:"
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Explicación"
              steps={[
                {
                  title: "Idea del método",
                  detail: (
                    <span>
                      El vecino más próximo (Nearest Neighbor) asigna al punto objetivo <b>P</b> el valor del
                      <b> sitio más cercano</b>.
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={nniTex} />,
                },
                {
                  title: "Aplicación al caso generado",
                  detail: (
                    <span>
                      Para el punto <b>P</b>, se identifica el sitio <b>S*</b> con menor distancia. Ese valor es el
                      que se copia.
                    </span>
                  ),
                  icon: Divide,
                  content: <MathTex block tex={demoTex} />,
                },
                {
                  title: "Conclusión",
                  detail: (
                    <span>
                      Por lo tanto, la respuesta correcta es: <b>El sitio más cercano</b>.
                    </span>
                  ),
                  icon: ShieldCheck,
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta: <b>El sitio más cercano</b>
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Contexto (varía en cada intento)</div>

          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div className="text-sm">
              Sitios con mediciones (coordenadas → valor):
            </div>
            <div className="text-sm">
              <b>{formatSites(scenario.sites)}</b>
            </div>
            <div className="text-sm">
              Punto a estimar: <b>P({scenario.P.x}, {scenario.P.y})</b>
            </div>
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={(op) => <span>{op.value}</span>}
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