"use client"

import { useMemo, useState } from "react"
import { Sigma } from "lucide-react"

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

function toDecimalString(m: number, e: number) {
  return (m * Math.pow(10, e)).toLocaleString("es-PE", {
    minimumFractionDigits: Math.abs(e),
    useGrouping: false,
  })
}

function generateScenario() {
  const mantissas = [2.3, 3.7, 4.5, 5.2, 6.8, 7.1, 8.4]
  const m = mantissas[randInt(0, mantissas.length - 1)]
  const e = -randInt(3, 9)

  const correctDecimal = (m * Math.pow(10, e)).toFixed(Math.abs(e) + 1)

  return {
    m,
    e,
    correctDecimal,
  }
}

function generateOptions(correct: string): Option[] {
  const options = [
    { value: correct, correct: true },
    {
      value: correct.replace("0.", "0.0"), // error típico: un cero extra
      correct: false,
    },
    {
      value: correct.slice(1), // error típico: quitar un 0
      correct: false,
    },
    {
      value: correct.replace(".", ""), // quitar punto
      correct: false,
    },
    {
      value: Number(correct).toLocaleString("es-PE"), // formato miles incorrecto
      correct: false,
    },
  ]

  return options.sort(() => Math.random() - 0.5)
}

/* ============================================================
   COMPONENTE
============================================================ */

export default function Ej04MasaDecimal({
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

  const { elapsed, startedAtRef } = useExerciseTimer(
    engine.canAnswer,
    nonce
  )

  const scenario = useMemo(() => {
    const s = generateScenario()
    return {
      ...s,
      options: generateOptions(s.correctDecimal),
    }
  }, [nonce])
  const shiftPlaces = Math.abs(scenario.e)

  const trophyPreview = useMemo(
    () => computeTrophyGain(elapsed),
    [elapsed]
  )

  async function pickOption(op: Option) {
    if (!engine.canAnswer) return

    const timeSeconds = (Date.now() - startedAtRef.current) / 1000

    setSelected(op.value)
    engine.submit(op.correct)

    await submitAttempt({
      correct: op.correct,
      answer: {
        selected: op.value,
        correctAnswer: scenario.correctDecimal,
        question: {
          m: scenario.m,
          e: scenario.e,
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

  return (
    <MathProvider>
      <ExerciseShell
        title="Ejercicio 04 – Notación científica"
        prompt="¿Cuál es su masa en forma decimal?"
        status={engine.status}
        attempts={engine.attempts}
        maxAttempts={engine.maxAttempts}
        onVerify={() => {}}
        onNext={siguiente}
        solution={
          <SolutionBox>
            <DetailedExplanation
              title="Conversión paso a paso"
              steps={[
                {
                  title: "Recordar qué significa el exponente negativo",
                  icon: Sigma,
                  content: (
                    <MathTex
                      block
                      tex={`${scenario.m} \\times 10^{${scenario.e}}`}
                    />
                  ),
                  detail: (
                    <span>
                      Como el exponente es {scenario.e}, equivale a dividir entre{" "}
                      <MathTex tex={`10^{${shiftPlaces}}`} />.
                    </span>
                  ),
                },
                {
                  title: "Mover el punto decimal",
                  content: (
                    <MathTex
                      block
                      tex={`= ${scenario.correctDecimal}`}
                    />
                  ),
                  detail: (
                    <span>
                      Ahora movemos el punto decimal de {scenario.m} <b>{shiftPlaces}</b>{" "}
                      lugares hacia la izquierda.
                    </span>
                  ),
                },
              ]}
              concluding={
                <span>
                  Respuesta correcta:{" "}
                  <b>{scenario.correctDecimal}</b>
                </span>
              }
            />
          </SolutionBox>
        }
      >
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="text-xs text-muted-foreground mb-2">
            Pregunta
          </div>
          <div className="rounded-lg border bg-background p-3">
            <MathTex
              block
              tex={`${scenario.m} \\times 10^{${scenario.e}}`}
            />
          </div>
        </div>

        <OptionsGrid
          options={scenario.options}
          selectedValue={selected}
          status={engine.status}
          canAnswer={engine.canAnswer}
          onSelect={pickOption}
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
