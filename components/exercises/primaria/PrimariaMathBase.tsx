'use client'

import { useMemo, useState } from 'react'

import { ExerciseShell } from '../base/ExerciseShell'
import { SolutionBox } from '../base/SolutionBox'
import { ExerciseHud } from '../base/ExerciseHud'
import { OptionsGrid, type Option } from '../base/OptionsGrid'
import { useExerciseEngine } from '@/lib/exercises/useExerciseEngine'
import { useExerciseSubmission } from '@/lib/exercises/useExerciseSubmission'
import { useExerciseTimer } from '@/lib/exercises/useExerciseTimer'
import { computeTrophyGain, WRONG_PENALTY } from '@/lib/exercises/gamification'
import { persistExerciseOnce } from '@/lib/exercises/persistExerciseOnce'

type ExplanationStep = { title: string; detail: string }

type ExerciseData = {
  question: string
  detail?: string
  options: Option[]
}

type ExerciseConfig = {
  title: string
  prompt: string
  generate: (nonce: number) => ExerciseData
  context?: string[]
  goal?: string
  tags?: string[]
  solutionSteps?: ExplanationStep[]
}

type Props = {
  exerciseId: string
  classroomId: string
  sessionId?: string
  config: ExerciseConfig
}

export function PrimariaMathBase({ exerciseId, classroomId, sessionId, config }: Props) {
  const engine = useExerciseEngine({ maxAttempts: 1 })
  const [nonce, setNonce] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const { studentId, gami, gamiLoading, submitAttempt } = useExerciseSubmission({
    exerciseId,
    classroomId,
    sessionId,
  })
  const { elapsed, startedAtRef } = useExerciseTimer(engine.canAnswer, nonce)
  const trophyPreview = useMemo(() => computeTrophyGain(elapsed), [elapsed])

  const ejercicio = useMemo(() => config.generate(nonce), [config, nonce])

  async function pickOption(option: Option) {
    if (!engine.canAnswer) return

    const timeSeconds = (Date.now() - startedAtRef.current) / 1000

    setSelected(option.value)
    engine.submit(option.correct)

    persistExerciseOnce({
      exerciseId,
      classroomId,
      sessionId,
      correct: option.correct,
      answer: {
        question: ejercicio.question,
        selected: option.value,
        correctOption: ejercicio.options.find(o => o.correct)?.value,
        options: ejercicio.options.map(o => o.value),
      },
    })

    await submitAttempt({
      correct: option.correct,
      answer: {
        selected: option.value,
        correctAnswer: ejercicio.options.find(o => o.correct)?.value,
        options: ejercicio.options.map(o => o.value),
      },
      timeSeconds,
    })
  }

  function siguiente() {
    setSelected(null)
    engine.reset()
    setNonce(n => n + 1)
  }

  const contextBlocks = config.context ?? []
  const solutionSteps = config.solutionSteps ?? []
  const tags = config.tags ?? []

  return (
    <ExerciseShell
      title={config.title}
      prompt={config.prompt}
      status={engine.status}
      attempts={engine.attempts}
      maxAttempts={engine.maxAttempts}
      onVerify={() => {}}
      onNext={siguiente}
      solution={
        <SolutionBox>
          <div className="space-y-3 text-sm leading-relaxed">
            <div className="rounded-lg border bg-white p-3">
              <div className="font-semibold mb-2">Respuesta</div>
              <div className="text-muted-foreground">{ejercicio.question}</div>
              <div className="mt-2 text-muted-foreground">
                Opcion correcta: {ejercicio.options.find(o => o.correct)?.value}
              </div>
            </div>
            {solutionSteps.length > 0 && (
              <div className="rounded-lg border bg-white p-3">
                <div className="font-semibold mb-2">Explicacion guiada</div>
                <div className="space-y-2">
                  {solutionSteps.map((step, index) => (
                    <div key={`${step.title}-${index}`}>
                      <div className="text-sm font-semibold">
                        Paso {index + 1}: {step.title}
                      </div>
                      <p className="text-muted-foreground text-sm">{step.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SolutionBox>
      }
    >
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map(tag => (
            <span
              key={tag}
              className="text-[10px] font-semibold uppercase tracking-[0.3em] rounded-full border border-primary/30 px-3 py-1 text-primary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {contextBlocks.length > 0 && (
        <div className="rounded-xl border border-dashed bg-white/80 p-4 mb-4 text-sm text-left">
          <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Contexto</div>
          {contextBlocks.map((text, index) => (
            <p key={`${text}-${index}`} className="text-muted-foreground leading-relaxed">
              {text}
            </p>
          ))}
          {config.goal && (
            <p className="text-sm text-foreground font-semibold">Objetivo: {config.goal}</p>
          )}
        </div>
      )}

      <div className="rounded-xl border bg-white p-4 mb-4 text-center">
        <div className="text-sm text-muted-foreground mb-2">Pregunta</div>
        <div className="text-lg font-semibold">{ejercicio.question}</div>
        {ejercicio.detail && (
          <p className="text-sm text-muted-foreground mt-2">{ejercicio.detail}</p>
        )}
      </div>

      <OptionsGrid
        options={ejercicio.options}
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
  )
}
