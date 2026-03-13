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

function choice<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)]
}

function dist2(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

function buildUniqueOptions(correct: string, candidates: string[]): Option[] {
  const uniqueDistractors = Array.from(
    new Set(candidates.filter(candidate => candidate !== correct))
  )

  return shuffle([
    { value: correct, correct: true },
    ...uniqueDistractors.slice(0, 4).map(value => ({ value, correct: false })),
  ])
}

type Site = { id: string; x: number; y: number; v: number }
type BaseScenario = ReturnType<typeof generateScenario>
type QuestionPack = {
  prompt: string
  correct: string
  options: Option[]
  explanationTitle: string
  explanationDetail: string
  conclusion: string
}

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

  let px = randInt(-8, 8)
  let py = randInt(-8, 8)
  for (let tries = 0; tries < 50; tries++) {
    if (!sites.some(s => s.x === px && s.y === py)) break
    px = randInt(-8, 8)
    py = randInt(-8, 8)
  }

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

function buildQuestionPack(scenario: BaseScenario): QuestionPack {
  const nearest = scenario.nearest
  const sortedByDistance = [...scenario.sites].sort(
    (a, b) =>
      dist2(scenario.P.x, scenario.P.y, a.x, a.y) -
      dist2(scenario.P.x, scenario.P.y, b.x, b.y)
  )
  const farthest = sortedByDistance[sortedByDistance.length - 1]
  const averageValue = Math.round(
    scenario.sites.reduce((sum, site) => sum + site.v, 0) / scenario.sites.length
  )

  return choice<QuestionPack>([
    {
      prompt: "La interpolacion del vecino mas proximo asigna un valor basandose en:",
      correct: "El sitio mas cercano",
      options: buildUniqueOptions("El sitio mas cercano", [
        "El sitio mas lejano",
        "El promedio de todos",
        "La mediana",
        "Una parabola",
        "La suma de distancias",
      ]),
      explanationTitle: "Idea del metodo",
      explanationDetail:
        "NNI copia al punto objetivo el valor observado en el sitio con menor distancia.",
      conclusion: "La base del metodo es elegir el sitio mas cercano.",
    },
    {
      prompt: `Segun NNI, que sitio se usa para estimar el valor en P(${scenario.P.x}, ${scenario.P.y})?`,
      correct: `${nearest.id}(${nearest.x}, ${nearest.y})`,
      options: buildUniqueOptions(`${nearest.id}(${nearest.x}, ${nearest.y})`, [
        `${farthest.id}(${farthest.x}, ${farthest.y})`,
        ...sortedByDistance
          .filter(site => site.id !== nearest.id && site.id !== farthest.id)
          .map(site => `${site.id}(${site.x}, ${site.y})`),
        "El centro del conjunto",
        "No se puede determinar",
      ]),
      explanationTitle: "Seleccion del sitio",
      explanationDetail:
        "Se comparan distancias desde P hasta cada sitio y se elige el de menor distancia.",
      conclusion: `El sitio utilizado es ${nearest.id}.`,
    },
    {
      prompt: `Cual es el valor estimado en P(${scenario.P.x}, ${scenario.P.y}) usando NNI?`,
      correct: `${nearest.v}`,
      options: buildUniqueOptions(`${nearest.v}`, [
        `${farthest.v}`,
        `${averageValue}`,
        ...scenario.sites
          .filter(site => site.id !== nearest.id && site.v !== farthest.v)
          .map(site => `${site.v}`),
        `${nearest.v + randInt(2, 9)}`,
        `${Math.max(0, nearest.v - randInt(2, 9))}`,
      ]),
      explanationTitle: "Valor interpolado",
      explanationDetail:
        "Una vez identificado el vecino mas cercano, el valor estimado es exactamente el de ese sitio.",
      conclusion: `La estimacion correcta es ${nearest.v}.`,
    },
    {
      prompt: "En NNI, el criterio correcto para elegir el dato que se asigna es:",
      correct: "La menor distancia entre P y un sitio observado",
      options: buildUniqueOptions("La menor distancia entre P y un sitio observado", [
        "La mayor distancia entre P y un sitio observado",
        "El promedio de los valores vecinos",
        "La pendiente entre dos sitios",
        "La suma de todos los valores",
        "El area del poligono de Voronoi",
      ]),
      explanationTitle: "Criterio de eleccion",
      explanationDetail:
        "NNI no promedia ni ajusta curvas: solamente compara distancias y toma la minima.",
      conclusion: "El criterio correcto es la menor distancia a un sitio observado.",
    },
  ])
}

function formatSites(sites: Site[]) {
  return sites
    .map(s => `${s.id}(${s.x}, ${s.y}) -> ${s.v}`)
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
    const base = generateScenario()
    return { ...base, questionPack: buildQuestionPack(base) }
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
        correctAnswer: scenario.questionPack.correct,
        question: {
          type: "nearest_neighbor_interpolation",
          prompt: scenario.questionPack.prompt,
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
        title="Interpolacion del vecino mas proximo (NNI)"
        prompt={scenario.questionPack.prompt}
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Explicacion"
              steps={[
                {
                  title: scenario.questionPack.explanationTitle,
                  detail: <span>{scenario.questionPack.explanationDetail}</span>,
                  icon: Sigma,
                  content: <MathTex block tex={nniTex} />,
                },
                {
                  title: "Aplicacion al caso generado",
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
                  title: "Conclusion",
                  detail: (
                    <span>
                      {scenario.questionPack.conclusion} La respuesta correcta es:{" "}
                      <b>{scenario.questionPack.correct}</b>.
                    </span>
                  ),
                  icon: ShieldCheck,
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta: <b>{scenario.questionPack.correct}</b>
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Contexto (varia en cada intento)</div>

          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div className="text-sm">Sitios con mediciones (coordenadas {"->"} valor):</div>
            <div className="text-sm">
              <b>{formatSites(scenario.sites)}</b>
            </div>
            <div className="text-sm">
              Punto a estimar: <b>P({scenario.P.x}, {scenario.P.y})</b>
            </div>
          </div>
        </div>

        <OptionsGrid
          options={scenario.questionPack.options}
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
