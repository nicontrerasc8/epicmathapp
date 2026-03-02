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

type Site = { x: number; y: number }
type Scenario = ReturnType<typeof generateScenario>

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
  // 3..6 sitios distintos
  const count = randInt(3, 6)
  const sites: Site[] = []

  for (let tries = 0; tries < 400 && sites.length < count; tries++) {
    const p = { x: randInt(-7, 7), y: randInt(-7, 7) }
    if (sites.some(s => samePoint(s, p))) continue
    sites.push(p)
  }

  if (sites.length < 3) {
    // fallback
    sites.splice(0, sites.length, { x: -2, y: 1 }, { x: 4, y: 0 }, { x: 1, y: 5 })
  }

  // Elegimos 2 sitios para una "micro-demostración" en la explicación
  const { A, B } = pickTwoDistinctSites(sites)

  return { sites, demoA: A, demoB: B }
}

function generateOptions(): Option[] {
  const options: Option[] = [
    { value: "Mediatrices entre pares de sitios", correct: true }, // ✅ A
    { value: "Rectas paralelas", correct: false },
    { value: "Segmentos aleatorios", correct: false },
    { value: "Circunferencias", correct: false },
    { value: "Ejes coordenados", correct: false },
  ]
  return shuffle(options)
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
    const s = generateScenario()
    return {
      ...s,
      options: generateOptions(),
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
        correctAnswer: "Mediatrices entre pares de sitios",
        question: {
          type: "voronoi_aristas",
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

  // TeX de apoyo (conceptual)
  const defVoronoiTex = `
\\text{Voronoi: región de un sitio } S_i = \\{P: d(P,S_i) \\le d(P,S_j)\\; \\forall j\\}.
`
  const bisectorTex = `
\\text{Frontera entre dos regiones } (S_a,S_b):\\; d(P,S_a)=d(P,S_b)
\\Rightarrow \\text{mediatriz del segmento } \\overline{S_aS_b}.
`

  const A = scenario.demoA
  const B = scenario.demoB
  const demoLineTex = `
\\text{Ejemplo con } S_a(${A.x},${A.y}) \\text{ y } S_b(${B.x},${B.y}):
\\quad d(P,S_a)=d(P,S_b) \\;\\Rightarrow\\; P \\text{ está en la mediatriz.}
`

  return (
    <MathProvider>
      <ExerciseShell
        title="Diagrama de Voronoi y mediatrices"
        prompt="Las aristas de un diagrama de Voronoi están formadas por:"
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
                  title: "Qué es Voronoi",
                  detail: (
                    <span>
                      Un diagrama de Voronoi divide el plano en regiones: cada región contiene los puntos
                      más cercanos a un “sitio” que a los demás.
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={defVoronoiTex} />,
                },
                {
                  title: "Qué son las aristas",
                  detail: (
                    <span>
                      Las aristas son fronteras entre dos regiones. En esa frontera, los puntos están a
                      igual distancia de dos sitios.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="space-y-2">
                      <MathTex block tex={bisectorTex} />
                      <MathTex block tex={demoLineTex} />
                    </div>
                  ),
                },
                {
                  title: "Conclusión",
                  detail: (
                    <span>
                      Por eso, las aristas de Voronoi se forman con <b>mediatrices entre pares de sitios</b>.
                    </span>
                  ),
                  icon: ShieldCheck,
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta: <b>Mediatrices entre pares de sitios</b>
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
              Considera los siguientes sitios (puntos) para construir Voronoi:
            </div>
            <div className="text-sm">
              <b>{formatSites(scenario.sites)}</b>
            </div>
            <div className="text-sm">
              Las aristas (bordes) del diagrama representan los puntos que están a igual distancia de dos sitios.
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