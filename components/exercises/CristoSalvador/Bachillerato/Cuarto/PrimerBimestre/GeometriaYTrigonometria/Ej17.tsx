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
function choice<T>(arr: T[]) {
  return arr[randInt(0, arr.length - 1)]
}
function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

/* =========================
   VARIACIONES DE CONTEXTO
========================= */

const CONTEXTS = [
  {
    label: "residuos tóxicos",
    site: "foco contaminante",
  },
  {
    label: "servicios públicos",
    site: "centro de atención",
  },
  {
    label: "planificación urbana",
    site: "hospital",
  },
  {
    label: "zonas de emergencia",
    site: "estación de bomberos",
  },
]

const PROMPT_TEMPLATES = [
  `En el problema de "{label}", si tres sitios forman un triángulo, el diagrama de Voronoi permite:`,
  `En un caso de "{label}", cuando tres {site}s forman un triángulo, Voronoi se usa para:`,
  `Para modelar "{label}", si tres puntos de referencia forman un triángulo, Voronoi sirve para:`,
  `En "{label}", al trabajar con tres {site}s no colineales, el diagrama de Voronoi ayuda a:`,
  `Aplicado a "{label}", el diagrama de Voronoi con tres sitios en triángulo permite:`,
  `Si en "{label}" se tienen tres {site}s que forman un triángulo, entonces Voronoi permite:`,
  `En la modelización de "{label}", con tres sitios en disposición triangular, se puede:`,
  `En un escenario de "{label}", tres sitios formando triángulo implican que Voronoi permite:`,
]

const CORRECT_TEMPLATES = [
  "Determinar la región más cercana a cada sitio e identificar un punto equidistante a los tres (circuncentro).",
  "Particionar el plano por cercanía a cada sitio y ubicar el punto equidistante de tres sitios (circuncentro).",
  "Asignar zonas de influencia por distancia mínima y localizar el vértice equidistante asociado al circuncentro.",
  "Delimitar áreas de proximidad de cada sitio y encontrar el punto común equidistante cuando hay tres sitios.",
  "Separar regiones de cercanía y reconocer el punto donde se igualan distancias a tres sitios (circuncentro).",
  "Definir fronteras de cercanía entre sitios y ubicar el punto equidistante a los tres vértices del triángulo.",
  "Clasificar puntos por sitio más cercano y detectar el punto de equidistancia triple en el triángulo.",
  "Construir regiones Voronoi y hallar el punto equidistante a tres sitios correspondiente al circuncentro.",
]

const WRONG_POOL = [
  "Maximizar ganancias del sistema.",
  "Calcular derivadas parciales del modelo.",
  "Resolver ecuaciones cuadráticas del contexto.",
  "Medir volumen de sólidos geométricos.",
  "Hallar áreas de circunferencias sin relación con cercanía.",
  "Aplicar logaritmos para transformar unidades.",
  "Medir dispersión estadística de datos muestrales.",
  "Resolver límites algebraicos.",
  "Encontrar el punto más lejano de todos los sitios.",
  "Dividir el plano en regiones de igual área.",
  "Ubicar el baricentro del triángulo de sitios.",
  "Calcular la mediana de distancias entre sitios.",
  "Determinar la pendiente máxima del terreno.",
  "Ordenar sitios por coordenada x sin criterio de distancia.",
  "Encontrar raíces enteras de un polinomio.",
  "Calcular solo perímetros de triángulos.",
  "Determinar el incentro del triángulo de sitios.",
  "Forzar que todas las regiones tengan la misma forma.",
  "Obtener la suma de ángulos interiores.",
  "Modelar crecimiento exponencial de la población.",
]

function pickUnique<T>(arr: T[], count: number): T[] {
  const unique = Array.from(new Set(arr))
  return shuffle(unique).slice(0, count)
}

/* =========================
   GENERADOR
========================= */

type Scenario = {
  question: string
  correct: string
  options: Option[]
  explain: {
    step1: string
    step2: string
    step3: string
    conclusion: string
  }
}

function generateScenario(): Scenario {
  const ctx = choice(CONTEXTS)

  const question = choice(PROMPT_TEMPLATES)
    .replace("{label}", ctx.label)
    .replace("{site}", ctx.site)

  const correct = choice(CORRECT_TEMPLATES)

  const wrongs = pickUnique(
    WRONG_POOL.filter((w) => w !== correct),
    4
  )

  const options: Option[] = shuffle([
    { value: correct, correct: true },
    ...wrongs.map((w) => ({ value: w, correct: false })),
  ])

  const explain = {
    step1:
      "Un diagrama de Voronoi divide el plano en regiones donde cada punto es más cercano a un sitio específico.",
    step2:
      "Las fronteras son mediatrices entre pares de sitios, y su intersección genera vértices.",
    step3:
      "Cuando tres sitios forman un triángulo, el vértice común corresponde al punto equidistante a los tres (circuncentro).",
    conclusion:
      "Por ello, el diagrama permite identificar zonas de cercanía y puntos equidistantes clave.",
  }

  return { question, correct, options, explain }
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function VoronoiIntegradorGame({
  exerciseId,
  classroomId,
  sessionId,
}: {
  exerciseId: string
  classroomId: string
  sessionId?: string
}) {
  const engine = useExerciseEngine({ maxAttempts: 1 })
  const { studentId, gami, gamiLoading, submitAttempt } =
    useExerciseSubmission({
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
        correctAnswer: scenario.correct,
        question: {
          context: "voronoi_integrador",
          prompt: scenario.question,
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

  const tex1 = `\\text{Región Voronoi: puntos más cercanos a un sitio}`
  const tex2 = `\\text{Vértice Voronoi: intersección de 3 mediatrices}`
  const tex3 = `PA = PB = PC`

  return (
    <MathProvider>
      <ExerciseShell
        title="Aplicaciones y propiedades del diagrama de Voronoi"
        prompt={scenario.question}
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Explicación integradora"
              steps={[
                {
                  title: "División en regiones",
                  detail: (
                    <span>
                      Cada región de Voronoi contiene puntos más cercanos a
                      un sitio que a los demás.
                    </span>
                  ),
                  icon: Sigma,
                  content: <MathTex block tex={tex1} />,
                },
                {
                  title: "Intersección de mediatrices",
                  detail: (
                    <span>
                      Las fronteras entre regiones se construyen con
                      mediatrices entre pares de sitios.
                    </span>
                  ),
                  icon: Divide,
                  content: <MathTex block tex={tex2} />,
                },
                {
                  title: "Propiedad de equidistancia",
                  detail: (
                    <span>
                      El vértice común queda a la misma distancia de tres
                      sitios cuando forman un triángulo.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: <MathTex block tex={tex3} />,
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta: <b>{scenario.correct}</b>
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3 text-sm">
            {scenario.question}
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={(op) => <span className="text-sm">{op.value}</span>}
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
