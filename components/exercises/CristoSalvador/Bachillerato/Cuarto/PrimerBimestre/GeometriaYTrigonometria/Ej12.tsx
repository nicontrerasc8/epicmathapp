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

function buildUniqueOptions(correct: string, candidates: string[]): Option[] {
  const uniqueDistractors = Array.from(
    new Set(candidates.filter(candidate => candidate !== correct))
  )

  return shuffle([
    { value: correct, correct: true },
    ...uniqueDistractors.slice(0, 4).map(value => ({ value, correct: false })),
  ])
}

type Site = { x: number; y: number }
type BaseScenario = ReturnType<typeof generateScenario>
type QuestionPack = {
  prompt: string
  correct: string
  options: Option[]
  explanationTitle: string
  explanationDetail: string
  conclusion: string
}

function samePoint(a: Site, b: Site) {
  return a.x === b.x && a.y === b.y
}

function pickTwoDistinctSites(sites: Site[]) {
  if (sites.length < 2) return { A: sites[0], B: sites[0] }
  const i = randInt(0, sites.length - 1)
  let j = randInt(0, sites.length - 1)
  while (j === i) j = randInt(0, sites.length - 1)
  return { A: sites[i], B: sites[j] }
}

function generateScenario() {
  const count = randInt(3, 6)
  const sites: Site[] = []

  for (let tries = 0; tries < 400 && sites.length < count; tries++) {
    const p = { x: randInt(-7, 7), y: randInt(-7, 7) }
    if (sites.some(s => samePoint(s, p))) continue
    sites.push(p)
  }

  if (sites.length < 3) {
    sites.splice(0, sites.length, { x: -2, y: 1 }, { x: 4, y: 0 }, { x: 1, y: 5 })
  }

  const { A, B } = pickTwoDistinctSites(sites)

  return { sites, demoA: A, demoB: B }
}

function buildQuestionPack(_: BaseScenario): QuestionPack {
  return choice<QuestionPack>([
    {
      prompt: "Las aristas de un diagrama de Voronoi estan formadas por:",
      correct: "Mediatrices entre pares de sitios",
      options: buildUniqueOptions("Mediatrices entre pares de sitios", [
        "Rectas paralelas",
        "Segmentos aleatorios",
        "Circunferencias",
        "Ejes coordenados",
        "Tangentes comunes",
      ]),
      explanationTitle: "Formacion de aristas",
      explanationDetail:
        "Cada borde de Voronoi aparece como frontera de empate de distancia entre dos sitios.",
      conclusion:
        "Por eso las aristas se describen como mediatrices entre pares de sitios.",
    },
    {
      prompt: "Un borde de Voronoi representa el conjunto de puntos que:",
      correct: "Estan a igual distancia de dos sitios",
      options: buildUniqueOptions("Estan a igual distancia de dos sitios", [
        "Estan mas cerca de todos los sitios a la vez",
        "Tienen distancia maxima a un sitio",
        "Forman un triangulo con tres sitios",
        "Coinciden con los ejes del plano",
        "Pertenecen a una sola celda completa",
      ]),
      explanationTitle: "Interpretacion del borde",
      explanationDetail:
        "Un borde separa dos celdas porque sus puntos empatan en distancia con los dos sitios vecinos.",
      conclusion:
        "La propiedad correcta es la equidistancia respecto de dos sitios.",
    },
    {
      prompt: "Geometricamente, la frontera comun entre dos regiones Voronoi coincide con:",
      correct: "La mediatriz del segmento que une dos sitios",
      options: buildUniqueOptions("La mediatriz del segmento que une dos sitios", [
        "La diagonal del poligono convexo",
        "La recta que pasa por ambos sitios",
        "Una curva cerrada arbitraria",
        "La bisectriz de un angulo fijo del plano",
        "El centroide de todos los sitios",
      ]),
      explanationTitle: "Descripcion geometrica",
      explanationDetail:
        "Si dos sitios son los unicos relevantes para una frontera local, el empate de distancia produce la mediatriz del segmento que los une.",
      conclusion:
        "La descripcion geometrica correcta es la mediatriz del segmento entre dos sitios.",
    },
    {
      prompt: "Que condicion caracteriza a los puntos de una arista de Voronoi?",
      correct: "Tienen la misma distancia a dos sitios vecinos",
      options: buildUniqueOptions("Tienen la misma distancia a dos sitios vecinos", [
        "Tienen la misma distancia a todos los sitios",
        "Estan mas lejos del sitio central",
        "Tienen coordenadas enteras siempre",
        "Pertenecen solo al borde exterior",
        "Son puntos medios entre tres regiones",
      ]),
      explanationTitle: "Condicion de frontera",
      explanationDetail:
        "La arista existe precisamente porque los puntos sobre ella no prefieren uno de los dos sitios vecinos: empatan.",
      conclusion:
        "La condicion correcta es tener la misma distancia a dos sitios vecinos.",
    },
  ])
}

function formatSites(sites: Site[]) {
  return sites
    .map((s, idx) => `S_${idx + 1}(${s.x}, ${s.y})`)
    .join(", ")
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function VoronoiAristasGame({
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
    return {
      ...base,
      questionPack: buildQuestionPack(base),
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
        correctAnswer: scenario.questionPack.correct,
        question: {
          type: "voronoi_aristas",
          prompt: scenario.questionPack.prompt,
          sites: scenario.sites,
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

  const defVoronoiTex = `
\\text{Voronoi: region de un sitio } S_i = \\{P: d(P,S_i) \\le d(P,S_j)\\; \\forall j\\}.
`
  const bisectorTex = `
\\text{Frontera entre dos regiones } (S_a,S_b):\\; d(P,S_a)=d(P,S_b)
\\Rightarrow \\text{mediatriz del segmento } \\overline{S_aS_b}.
`

  const A = scenario.demoA
  const B = scenario.demoB
  const demoLineTex = `
\\text{Ejemplo con } S_a(${A.x},${A.y}) \\text{ y } S_b(${B.x},${B.y}):
\\quad d(P,S_a)=d(P,S_b) \\Rightarrow P \\text{ esta en la mediatriz.}
`

  return (
    <MathProvider>
      <ExerciseShell
        title="Diagrama de Voronoi y mediatrices"
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
                  title: "Que es Voronoi",
                  detail: (
                    <span>
                      Un diagrama de Voronoi divide el plano en regiones segun el sitio mas cercano.
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={defVoronoiTex} />,
                },
                {
                  title: scenario.questionPack.explanationTitle,
                  detail: <span>{scenario.questionPack.explanationDetail}</span>,
                  icon: Divide,
                  content: (
                    <div className="space-y-2">
                      <MathTex block tex={bisectorTex} />
                      <MathTex block tex={demoLineTex} />
                    </div>
                  ),
                },
                {
                  title: "Conclusion",
                  detail: (
                    <span>
                      {scenario.questionPack.conclusion} La respuesta correcta es{" "}
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
            <div className="text-sm">
              Considera los siguientes sitios (puntos) para construir Voronoi:
            </div>
            <div className="text-sm">
              <b>{formatSites(scenario.sites)}</b>
            </div>
            <div className="text-sm">
              Las aristas del diagrama representan fronteras locales entre dos sitios vecinos.
            </div>
          </div>
        </div>

        <OptionsGrid
          options={scenario.questionPack.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={(op) => (
            <span className="block whitespace-normal break-words text-base leading-relaxed">
              {op.value}
            </span>
          )}
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
