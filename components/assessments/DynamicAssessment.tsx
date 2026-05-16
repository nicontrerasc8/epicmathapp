"use client"

import { useMemo, useRef, useState } from "react"
import { CheckCircle2, ImageIcon, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MathProvider, MathTex } from "@/components/exams/MathBlock"
import {
  type DynamicAssessmentContent,
  type DynamicAssessmentSettings,
  normalizeAssessmentContent,
} from "@/lib/assessment-json"
import { createClient } from "@/utils/supabase/client"

type DynamicAssessmentProps = {
  content: unknown
  settings?: unknown
  examId?: string
  taskId?: string
  assignmentId?: string
  classroomId?: string
  studentId?: string
  displayTitle?: string
  previewMode?: boolean
  attemptLocked?: boolean
  submitTarget?: "exam" | "task" | "practice" | "none"
}

function renderText(value: string, block = false) {
  if (!value.includes("\\") && !value.includes("^") && !value.includes("_")) return value
  return <MathTex tex={unwrapMathDelimiters(value)} block={block} />
}

function unwrapMathDelimiters(value: string) {
  return value
    .trim()
    .replace(/^\\\(([\s\S]*)\\\)$/g, "$1")
    .replace(/^\\\[([\s\S]*)\\\]$/g, "$1")
    .replace(/^\${1,2}([\s\S]*?)\${1,2}$/g, "$1")
}

function optionBody(option: any) {
  return option.latex || option.text || option.value || option.content || option.label || option.key
}

function VisualBlock({ visual }: { visual?: string }) {
  if (!visual) return null

  if (visual === "boxplot-ages") {
    return (
      <div className="my-4 rounded-xl border bg-white p-4">
        <div className="relative mx-auto h-24 max-w-xl">
          <div className="absolute left-[8%] right-[8%] top-12 h-0.5 bg-slate-700" />
          <div className="absolute left-[8%] top-9 h-6 w-0.5 bg-slate-700" />
          <div className="absolute left-[82%] top-9 h-6 w-0.5 bg-slate-700" />
          <div className="absolute left-[18%] top-6 h-12 w-[48%] border-2 border-emerald-600 bg-emerald-50" />
          <div className="absolute left-[45%] top-6 h-12 w-0.5 bg-emerald-700" />
          <div className="absolute bottom-0 left-[6%] text-xs">23</div>
          <div className="absolute bottom-0 left-[43%] text-xs">44</div>
          <div className="absolute bottom-0 left-[80%] text-xs">60</div>
        </div>
      </div>
    )
  }

  return (
    <div className="my-4 flex items-center gap-2 rounded-xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
      <ImageIcon className="h-4 w-4" />
      Visual: {visual}
    </div>
  )
}

function ImageBlocks({ question }: { question: any }) {
  const images = [
    ...(question.imageUrl ? [{ src: question.imageUrl, alt: question.title }] : []),
    ...(Array.isArray(question.images) ? question.images : []),
  ].filter((image) => image?.src)

  if (images.length === 0) return null

  return (
    <div className="my-4 grid gap-3 sm:grid-cols-2">
      {images.map((image, index) => (
        <img
          key={`${image.src}-${index}`}
          src={image.src}
          alt={image.alt || question.title || `Imagen ${index + 1}`}
          className="max-h-80 w-full rounded-xl border object-contain"
        />
      ))}
    </div>
  )
}

export function DynamicAssessment({
  content,
  settings,
  examId,
  taskId,
  assignmentId,
  classroomId,
  studentId,
  displayTitle,
  previewMode = false,
  attemptLocked = false,
  submitTarget = "none",
}: DynamicAssessmentProps) {
  const supabase = useMemo(() => createClient(), [])
  const startedAtRef = useRef(Date.now())
  const assessment = useMemo(
    () => normalizeAssessmentContent(content, displayTitle || "Evaluacion"),
    [content, displayTitle],
  )
  const resolvedSettings = (settings && typeof settings === "object" ? settings : {}) as DynamicAssessmentSettings
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const questions = assessment.questions ?? []
  const correctCount = questions.filter((question) => answers[question.id] === question.correctKey).length
  const wrongCount = questions.length - correctCount
  const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0
  const allAnswered = questions.length > 0 && questions.every((question) => Boolean(answers[question.id]))
  const showReview =
    previewMode ||
    (submitTarget === "practice" && submitted) ||
    (submitTarget !== "practice" && submitTarget !== "task" && resolvedSettings.showReview)
  const showScore = submitTarget !== "task" && (resolvedSettings.showScore ?? true)
  const canSubmit = !previewMode && !attemptLocked && submitTarget !== "none"

  const submit = async () => {
    if (!studentId || !classroomId) return
    setSaving(true)
    setError(null)

    const questionResults = questions.map((question) => ({
      question_id: question.id,
      title: question.title,
      subtitle: question.subtitle ?? "",
      selected_key: answers[question.id] ?? null,
      correct_key: question.correctKey ?? "",
      is_correct: answers[question.id] === question.correctKey,
    }))

    try {
      if (submitTarget === "exam" && examId) {
        const { error } = await supabase.from("edu_student_exams").insert({
          student_id: studentId,
          classroom_id: classroomId,
          exam_id: examId,
          assignment_id: assignmentId,
          answers,
          question_results: questionResults,
          score,
          correct_count: correctCount,
          wrong_count: wrongCount,
          time_seconds: Math.round((Date.now() - startedAtRef.current) / 1000),
          status: "submitted",
        })
        if (error) throw error
      }

      if (submitTarget === "task" && taskId) {
        const { error } = await supabase.from("edu_student_tasks").insert({
          task_id: taskId,
          student_id: studentId,
          classroom_id: classroomId,
          attempt_number: 1,
          answers,
          score,
          max_score: questions.length,
          correct_count: correctCount,
          wrong_count: wrongCount,
          time_seconds: Math.round((Date.now() - startedAtRef.current) / 1000),
          submitted_at: new Date().toISOString(),
          status: "submitted",
        })
        if (error) throw error
      }

      if (submitTarget === "practice" && taskId) {
        const practiceAttemptsAllowed = Math.max(1, Number(resolvedSettings.practiceAttemptsAllowed ?? 3))
        const { data: practiceSessions, count: practiceAttempts, error: attemptsError } = await supabase
          .from("edu_task_practice_sessions")
          .select("accuracy", { count: "exact" })
          .eq("task_id", taskId)
          .eq("student_id", studentId)
          .eq("classroom_id", classroomId)

        if (attemptsError) throw attemptsError
        const alreadyCompleted = ((practiceSessions ?? []) as { accuracy: number | string | null }[]).some(
          (session) => Number(session.accuracy ?? 0) >= 100,
        )
        if (alreadyCompleted) {
          throw new Error("Ya completaste la practica correctamente.")
        }
        if ((practiceAttempts ?? 0) >= practiceAttemptsAllowed) {
          throw new Error("Ya usaste los intentos de practica.")
        }

        const { data: session, error: sessionError } = await supabase
          .from("edu_task_practice_sessions")
          .insert({
            task_id: taskId,
            student_id: studentId,
            classroom_id: classroomId,
            mode: assessment.practice?.mode || "reinforcement",
            total_questions: questions.length,
            correct_count: correctCount,
            wrong_count: wrongCount,
            accuracy: score,
            ended_at: new Date().toISOString(),
          })
          .select("id")
          .single()
        if (sessionError) throw sessionError

        // Dynamic JSON questions may not exist in edu_exercises, so the aggregate
        // session is the stable record for generated task practice.
        void session
      }

      setSubmitted(true)
    } catch (error: any) {
      setError(error?.message || "No se pudo guardar.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <MathProvider>
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-2xl border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {previewMode ? "Vista previa" : submitTarget === "practice" ? "Practica" : "Evaluacion"}
          </p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">
            {assessment.title || displayTitle || "Evaluacion"}
          </h1>
          {assessment.subtitle && <p className="mt-1 text-sm text-muted-foreground">{assessment.subtitle}</p>}
          {assessment.institution && <p className="mt-1 text-xs text-muted-foreground">{assessment.institution}</p>}
        </section>

        {questions.map((question, index) => {
          const selected = answers[question.id]
          const isCorrect = selected && question.correctKey ? selected === question.correctKey : null

          return (
            <section key={question.id} className="rounded-2xl border bg-card p-5">
              <div className="mb-4">
                <div className="text-sm font-semibold text-primary">{question.title || `Pregunta ${index + 1}`}</div>
                {question.subtitle && <div className="mt-1 text-sm text-muted-foreground">{question.subtitle}</div>}
                <p className="mt-3 text-base text-slate-900">{question.prompt}</p>
              </div>

              {question.statement?.length ? (
                <div className="mb-4 space-y-2 rounded-xl bg-muted/30 p-4">
                  {question.statement.map((line, statementIndex) => (
                    <div key={`${question.id}-statement-${statementIndex}`} className="text-sm">
                      {renderText(line, true)}
                    </div>
                  ))}
                </div>
              ) : null}

              <VisualBlock visual={question.visual} />
              <ImageBlocks question={question} />

              <div className="grid gap-2">
                {(question.options ?? []).map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setAnswers((current) => ({ ...current, [question.id]: option.key }))}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                      selected === option.key ? "border-primary bg-primary/10" : "bg-white hover:bg-muted/40"
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-semibold">
                      {option.label || option.key}
                    </span>
                    <span>{renderText(String(optionBody(option)))}</span>
                  </button>
                ))}
              </div>

              {showReview && question.correctKey && (
                <div
                  className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                    isCorrect
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-amber-200 bg-amber-50 text-amber-900"
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    {isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    Correcta: {question.correctKey}
                  </div>
                  {question.explanation && <p className="mt-1">{question.explanation}</p>}
                </div>
              )}
            </section>
          )
        })}

        {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {submitted ? (
          <div className="rounded-2xl border bg-card p-6 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-600" />
            <div className="font-semibold">Envio registrado</div>
            {showScore && <div className="mt-1 text-sm text-muted-foreground">Puntaje: {score}%</div>}
          </div>
        ) : canSubmit ? (
          <div className="flex justify-end">
            <Button onClick={submit} disabled={saving || (submitTarget === "practice" && !allAnswered)}>
              {saving ? "Guardando..." : "Entregar"}
            </Button>
          </div>
        ) : null}
      </div>
    </MathProvider>
  )
}
