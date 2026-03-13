"use client"

import { useMemo, useState } from "react"
import { ShieldCheck, Sigma, Divide } from "lucide-react"

import { useExerciseEngine } from "@/lib/exercises/useExerciseEngine"
import { useExerciseSubmission } from "@/lib/exercises/useExerciseSubmission"
import { useExerciseTimer } from "@/lib/exercises/useExerciseTimer"
import { computeTrophyGain, WRONG_PENALTY } from "@/lib/exercises/gamification"

import { type Option, OptionsGrid } from "@/components/exercises/base/OptionsGrid"
import { MathProvider } from "@/components/exercises/base/MathBlock"
import { ExerciseHud } from "@/components/exercises/base/ExerciseHud"
import { SolutionBox } from "@/components/exercises/base/SolutionBox"
import { ExerciseShell } from "@/components/exercises/base/ExerciseShell"
import { DetailedExplanation } from "@/components/exercises/base/DetailedExplanation"

/* ============================================================
   HELPERS
============================================================ */

type ChoiceKey = "A" | "B" | "C" | "D" | "E"
type OptionWithLabel = Option & { label: ChoiceKey }
type Family = "definicion" | "identificacion" | "aplicacion" | "propiedad" | "comparacion"
type Scenario = ReturnType<typeof generateScenario>

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function dedupeOptions(arr: { value: string; correct: boolean }[]) {
  const seen = new Set<string>()
  const out: { value: string; correct: boolean }[] = []
  for (const o of arr) {
    if (seen.has(o.value)) continue
    seen.add(o.value)
    out.push(o)
  }
  return out
}

/* ============================================================
   BANCO DINAMICO (familias + contexto)
============================================================ */

const CONTEXTS = [
  "ubicacion de un punto de atencion",
  "distribucion de servicios de emergencia",
  "planificacion de rutas escolares",
  "cobertura de centros de salud",
  "asignacion de zonas logisticas",
  "diseno de puntos de abastecimiento",
]

const WRONG_POOL = [
  "Maximizar el area de una region.",
  "Encontrar la recta paralela al segmento.",
  "Ubicar el punto medio de un lado cualquiera.",
  "Calcular la bisectriz de un angulo sin relacion con AB.",
  "Determinar el punto mas cercano a un solo extremo.",
  "Obtener una recta que pase por A sin condicion adicional.",
  "Buscar pendientes nulas.",
  "Encontrar el baricentro del triangulo.",
  "Minimizar longitudes de forma global.",
  "Determinar una diagonal equivalente.",
  "Dividir en regiones de igual area.",
  "Escoger un punto aleatorio del plano.",
]

function buildOptions(correctText: string, wrongs: string[]): OptionWithLabel[] {
  let raw = dedupeOptions(
    shuffle([
      { value: correctText, correct: true },
      ...wrongs.map((w) => ({ value: w, correct: false })),
    ])
  )

  while (raw.length < 5) {
    const extra = pickOne(WRONG_POOL)
    if (extra === correctText || raw.some((r) => r.value === extra)) continue
    raw.push({ value: extra, correct: false })
  }

  raw = shuffle(raw.slice(0, 5))
  const labels: ChoiceKey[] = ["A", "B", "C", "D", "E"]
  return raw.map((r, idx) => ({ ...r, label: labels[idx] }))
}

function generateScenario() {
  const context = pickOne(CONTEXTS)
  const family = pickOne<Family>([
    "definicion",
    "identificacion",
    "aplicacion",
    "propiedad",
    "comparacion",
  ])

  let prompt = ""
  let correctText = ""
  let wrongs: string[] = []

  if (family === "definicion") {
    prompt = `En ${context}, la mediatriz de un segmento AB se interpreta como:`
    correctText = "El conjunto de puntos equidistantes de A y B."
    wrongs = [
      "Una recta paralela a AB.",
      "Una recta que solo pasa por A.",
      "La suma de distancias minima a todo punto.",
      "La region mas cercana a A.",
    ]
  } else if (family === "identificacion") {
    prompt = `Si necesitas puntos a la misma distancia de dos ubicaciones en ${context}, debes usar:`
    correctText = "La mediatriz del segmento que une ambas ubicaciones."
    wrongs = [
      "La diagonal principal del plano.",
      "La bisectriz de cualquier angulo.",
      "Una recta horizontal por el punto medio.",
      "Una recta vertical por un extremo.",
    ]
  } else if (family === "aplicacion") {
    prompt = `En ${context}, la utilidad principal de la mediatriz es:`
    correctText = "Delimitar una frontera de igual distancia entre dos puntos de referencia."
    wrongs = [
      "Maximizar el area de atencion de un punto.",
      "Anular pendientes en todo el mapa.",
      "Asegurar que todas las regiones tengan igual perimetro.",
      "Calcular solo longitudes minimas.",
    ]
  } else if (family === "propiedad") {
    prompt = `¿Que propiedad SI cumple todo punto P sobre la mediatriz del segmento AB (contexto: ${context})?`
    correctText = "PA = PB"
    wrongs = [
      "PA + PB = AB",
      "PA = AB",
      "PB = AB",
      "PA = 2PB",
    ]
  } else {
    prompt = `Comparando conceptos en ${context}, la mediatriz se diferencia porque:`
    correctText = "Es perpendicular al segmento y pasa por su punto medio."
    wrongs = [
      "Parte un angulo en dos angulos iguales.",
      "Une un vertice con el punto medio del lado opuesto.",
      "Pasa por un vertice y es perpendicular al lado opuesto.",
      "Une dos vertices no consecutivos de un poligono.",
    ]
  }

  const mixedWrongs = shuffle([...wrongs, ...WRONG_POOL]).filter((w) => w !== correctText)
  const options = buildOptions(correctText, mixedWrongs.slice(0, 4))
  const correct = options.find((o) => o.correct)!

  return {
    prompt,
    options,
    correctText,
    correctLabel: correct.label,
    family,
    context,
  }
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function MediatrizModelizacionGame({
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
  const scenario: Scenario = useMemo(() => generateScenario(), [nonce])
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
        correctAnswer: scenario.correctText,
        question: {
          family: scenario.family,
          context: scenario.context,
          prompt: scenario.prompt,
          options: scenario.options.map((o) => ({
            label: o.label,
            text: o.value,
          })),
          correctLabel: scenario.correctLabel,
        },
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce((n) => n + 1)
  }

  function renderOptionLabel(op: OptionWithLabel) {
    return <span className="text-sm">{op.label}) {op.value}</span>
  }

  return (
    <MathProvider>
      <ExerciseShell
        title="Mediatriz en modelizacion"
        prompt={scenario.prompt}
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
                  title: "Idea clave",
                  detail: (
                    <span>
                      La <b>mediatriz</b> de un segmento es la recta que lo corta en su <b>punto medio</b> y
                      es <b>perpendicular</b> a el.
                    </span>
                  ),
                  icon: Sigma,
                  content: (
                    <div className="text-sm text-muted-foreground">
                      Todo punto sobre la mediatriz queda a igual distancia de los extremos del segmento.
                    </div>
                  ),
                },
                {
                  title: "Uso en modelizacion",
                  detail: (
                    <span>
                      Se usa para describir fronteras de <b>equidistancia</b> entre dos referencias.
                    </span>
                  ),
                  icon: Divide,
                  content: (
                    <div className="rounded-lg border bg-background p-3 text-sm">
                      En este item el contexto es: <b>{scenario.context}</b>.
                    </div>
                  ),
                },
                {
                  title: "Respuesta",
                  detail: (
                    <span>
                      La opcion correcta es la que expresa la idea de equidistancia o su propiedad equivalente.
                    </span>
                  ),
                  icon: ShieldCheck,
                  content: (
                    <div className="text-sm">
                      Respuesta correcta: <b>{scenario.correctText}</b>
                    </div>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta: <b>{scenario.correctLabel}</b>
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Pregunta</div>
          <div className="rounded-lg border bg-background p-3 space-y-2">
            <div className="text-sm">{scenario.prompt}</div>
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
          renderValue={(op) => renderOptionLabel(op as OptionWithLabel)}
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
