"use client"

import { useState } from "react"
import { AlertCircle, CheckCircle2, FileText, LockKeyhole, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { MathProvider, MathTex } from "@/components/exercises/base/MathBlock"
import { createClient } from "@/utils/supabase/client"
import { EXAMEN_FINAL_01_QUESTIONS } from "./questions"

type ExamProps = {
  examId: string
  assignmentId?: string
  classroomId: string
  studentId?: string
  sessionId?: string
  displayTitle?: string
  previewMode?: boolean
  attemptLocked?: boolean
}

type ExamQuestionResult = {
  question_id: string
  title: string
  subtitle: string
  selected_key: string | null
  correct_key: string
  is_correct: boolean
}

type Question = {
  id: string
  title: string
  subtitle: string
  prompt: string
  statement?: string[]
  options: Array<{ key: string; label: string; latex?: string }>
  correctKey: string
  explanation: string
}



const QUESTIONS = EXAMEN_FINAL_01_QUESTIONS

function QuestionCard({
  question,
  index,
  selected,
  locked,
  onSelect,
}: {
  question: Question
  index: number
  selected: string | null
  locked: boolean
  onSelect: (key: string) => void
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <div className="text-lg font-bold uppercase tracking-tight">{question.title}</div>
        <div className="text-base font-semibold">{question.subtitle}</div>
      </div>

      <div className="space-y-3 text-base leading-relaxed">
        <p>{question.prompt}</p>
        {question.statement?.map((line, lineIndex) => (
          <div key={`${question.id}-line-${lineIndex}`} className="rounded-lg bg-muted/40 px-4 py-3">
            <MathTex block tex={line} />
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3">
        {question.options.map((option) => {
          const isSelected = selected === option.key
          return (
            <button
              key={option.key}
              type="button"
              disabled={locked}
              onClick={() => onSelect(option.key)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "bg-background hover:bg-muted/40"
              } ${locked ? "cursor-default" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-6 font-semibold">{option.label})</div>
                <div className="flex-1 overflow-hidden">
                  {option.latex ? <MathTex tex={option.latex} /> : <span>{option.label}</span>}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default function ExamenFinal01({
  examId,
  assignmentId,
  classroomId,
  studentId,
  displayTitle = "Examen Final 1",
  previewMode = false,
  attemptLocked = false,
}: ExamProps) {
  const supabase = createClient()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(attemptLocked)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [questionResults, setQuestionResults] = useState<ExamQuestionResult[]>([])
  const [startedAt] = useState(() => Date.now())

  const unanswered = QUESTIONS.filter((question) => !answers[question.id]).length

  const handleSelect = (questionId: string, key: string) => {
    if (submitted || attemptLocked) return
    setAnswers((current) => ({ ...current, [questionId]: key }))
  }

  const submitExam = async () => {
    if (previewMode || submitted || attemptLocked || unanswered > 0 || !studentId) return

    setSubmitting(true)
    setSubmitError(null)

    const { data: existingAttempt, error: existingAttemptError } = await supabase
      .from("edu_student_exams")
      .select("id")
      .eq("student_id", studentId)
      .eq("classroom_id", classroomId)
      .eq("exam_id", examId)
      .limit(1)

    if (existingAttemptError) {
      setSubmitError(existingAttemptError.message)
      setSubmitting(false)
      return
    }

    if (existingAttempt && existingAttempt.length > 0) {
      setSubmitted(true)
      setSubmitting(false)
      return
    }

    const correctCount = QUESTIONS.reduce(
      (acc, question) => acc + (answers[question.id] === question.correctKey ? 1 : 0),
      0,
    )
    const nextQuestionResults = QUESTIONS.map((question) => {
      const selectedKey = answers[question.id] ?? null

      return {
        question_id: question.id,
        title: question.title,
        subtitle: question.subtitle,
        selected_key: selectedKey,
        correct_key: question.correctKey,
        is_correct: selectedKey === question.correctKey,
      }
    })
    const wrongCount = QUESTIONS.length - correctCount
    const score = Number(((correctCount / QUESTIONS.length) * 100).toFixed(2))
    const timeSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000))

    const { error } = await supabase.from("edu_student_exams").insert({
      student_id: studentId,
      classroom_id: classroomId,
      exam_id: examId,
      assignment_id: assignmentId ?? null,
      answers,
      question_results: nextQuestionResults,
      score,
      correct_count: correctCount,
      wrong_count: wrongCount,
      time_seconds: timeSeconds,
      status: "submitted",
    })

    if (error) {
      setSubmitError(error.message)
      setSubmitting(false)
      return
    }

    setQuestionResults(nextQuestionResults)
    setSubmitted(true)
    setSubmitting(false)
  }

  return (
    <MathProvider>
      <div className="min-h-screen bg-background px-4 py-8 text-foreground">
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="rounded-3xl border bg-card px-6 py-8 text-center shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Programa del diploma
            </div>
            <div className="mt-2 flex items-center justify-center gap-3">
              <FileText className="h-7 w-7 text-primary" />
              <h1 className="text-4xl font-black uppercase tracking-tight">{displayTitle}</h1>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Bachillerato · Cuarto · Primer Bimestre · Colegio Cristo Salvador
            </p>
          </header>

          <div className="grid gap-6">
            {QUESTIONS.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={index}
                selected={answers[question.id] ?? null}
                locked={submitted || previewMode || attemptLocked}
                onSelect={(key) => handleSelect(question.id, key)}
              />
            ))}
          </div>

          <section className="rounded-3xl border bg-card p-6 shadow-sm">
            {!submitted ? (
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-lg font-semibold">Listo para entregar</div>
                  <div className="text-sm text-muted-foreground">
                    {previewMode
                      ? "Vista previa del examen."
                      : attemptLocked
                      ? "Este examen ya fue rendido y no admite un segundo intento."
                      : unanswered === 0
                      ? "Has respondido todas las preguntas."
                      : `Te faltan ${unanswered} pregunta(s) por responder.`}
                  </div>
                </div>

                {!previewMode && !attemptLocked && (
                  <Button onClick={submitExam} disabled={unanswered > 0 || submitting || !studentId}>
                    Entregar examen
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <div className="font-semibold">Examen entregado</div>
                    <div className="text-sm">
                      Tu examen fue registrado correctamente. No se muestra el puntaje y no puedes rendirlo otra vez.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border bg-muted/30 p-4 text-muted-foreground">
                  <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="text-sm">
                    El examen queda bloqueado despues del primer envio.
                  </div>
                </div>

                {questionResults.length > 0 ? (
                  <div className="rounded-2xl border bg-background p-4">
                    <div className="mb-3 font-semibold">Revision por pregunta</div>
                    <div className="grid gap-2">
                      {questionResults.map((result) => (
                        <div
                          key={result.question_id}
                          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
                            result.is_correct
                              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                              : "border-rose-200 bg-rose-50 text-rose-900"
                          }`}
                        >
                          <div>
                            <div className="font-semibold">{result.title}</div>
                            <div className="text-xs opacity-80">{result.subtitle}</div>
                          </div>
                          <div className="flex items-center gap-2 font-semibold">
                            {result.is_correct ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            {result.is_correct ? "Acerto" : "Fallo"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {submitError ? (
              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="text-sm">{submitError}</div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </MathProvider>
  )
}
