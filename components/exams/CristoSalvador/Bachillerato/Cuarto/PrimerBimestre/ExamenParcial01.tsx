"use client"

import { useState } from "react"
import { AlertCircle, CheckCircle2, FileText, LockKeyhole } from "lucide-react"

import { Button } from "@/components/ui/button"
import { MathProvider, MathTex } from "@/components/exercises/base/MathBlock"
import { createClient } from "@/utils/supabase/client"

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

const QUESTIONS: Question[] = [
  {
    id: "p1",
    title: "Pregunta 1",
    subtitle: "Contaminacion del aire - Notacion cientifica",
    prompt: "Un sensor ambiental mide que una particula contaminante tiene una masa promedio de 2.5 x 10^-9 g. En una muestra de aire se detectan 3.2 x 10^7 particulas. ¿Cual es la masa total de contaminante en la muestra?",
    statement: ["2.5 \\times 10^{-9}\\, g", "3.2 \\times 10^{7}\\text{ particulas}"],
    options: [
      { key: "A", label: "A", latex: "8.0 \\times 10^{-2}\\, g" },
      { key: "B", label: "B", latex: "8.0 \\times 10^{-1}\\, g" },
      { key: "C", label: "C", latex: "8.0 \\times 10^{-3}\\, g" },
      { key: "D", label: "D", latex: "8.0 \\times 10^{-4}\\, g" },
    ],
    correctKey: "A",
    explanation: "Se multiplica 2.5 x 10^-9 por 3.2 x 10^7. El coeficiente da 8.0 y los exponentes suman -2, por eso el resultado es 8.0 x 10^-2 g.",
  },
  {
    id: "p2",
    title: "Pregunta 2",
    subtitle: "Crecimiento bacteriano - Leyes de exponentes",
    prompt: "Una poblacion de bacterias se modela como N = (3 x 10^4)^2 (2 x 10^-3). ¿Cual es el valor de N en notacion cientifica?",
    statement: ["N=(3\\times 10^{4})^{2}\\cdot(2\\times 10^{-3})"],
    options: [
      { key: "A", label: "A", latex: "1.8 \\times 10^{6}" },
      { key: "B", label: "B", latex: "1.8 \\times 10^{5}" },
      { key: "C", label: "C", latex: "6.0 \\times 10^{5}" },
      { key: "D", label: "D", latex: "1.8 \\times 10^{7}" },
    ],
    correctKey: "A",
    explanation: "(3 x 10^4)^2 = 9 x 10^8. Luego 9 x 10^8 por 2 x 10^-3 = 18 x 10^5 = 1.8 x 10^6.",
  },
  {
    id: "p3",
    title: "Pregunta 3",
    subtitle: "Escala de pH - Logaritmos",
    prompt: "El pH de una solucion se define como pH = -log10[H+]. Si la concentracion de iones de hidrogeno es [H+] = 1 x 10^-4, ¿cual es el pH?",
    statement: ["\\mathrm{pH}=-\\log_{10}[H^{+}]", "[H^{+}] = 1\\times 10^{-4}"],
    options: [
      { key: "A", label: "A", latex: "4" },
      { key: "B", label: "B", latex: "-4" },
      { key: "C", label: "C", latex: "0.0001" },
      { key: "D", label: "D", latex: "10^{4}" },
    ],
    correctKey: "A",
    explanation: "Como log10(10^-4) = -4, entonces pH = -(-4) = 4.",
  },
  {
    id: "p4",
    title: "Pregunta 4",
    subtitle: "Medicion en construccion - Limites y error",
    prompt: "Un tecnico mide la longitud de una tuberia como 5.8 m, redondeando a una cifra decimal. ¿Cual es el limite superior de la longitud real?",
    options: [
      { key: "A", label: "A", latex: "5.85\\, m" },
      { key: "B", label: "B", latex: "5.80\\, m" },
      { key: "C", label: "C", latex: "5.90\\, m" },
      { key: "D", label: "D", latex: "5.75\\, m" },
    ],
    correctKey: "A",
    explanation: "Si 5.8 esta redondeado a una cifra decimal, el valor real esta entre 5.75 y 5.85, sin incluir el extremo inferior exacto del siguiente intervalo. El limite superior es 5.85 m.",
  },
  {
    id: "p5",
    title: "Pregunta 5",
    subtitle: "Consumo de energia - Estimacion",
    prompt: "Una ciudad tiene aproximadamente 2.4 x 10^6 hogares. Cada hogar consume en promedio 3.5 x 10^3 Wh por dia. ¿Cual es el consumo total diario aproximado?",
    statement: ["2.4 \\times 10^{6}\\text{ hogares}", "3.5 \\times 10^{3}\\, Wh/\\text{dia}"],
    options: [
      { key: "A", label: "A", latex: "8.4 \\times 10^{9}\\, Wh" },
      { key: "B", label: "B", latex: "8.4 \\times 10^{8}\\, Wh" },
      { key: "C", label: "C", latex: "7.0 \\times 10^{9}\\, Wh" },
      { key: "D", label: "D", latex: "8.4 \\times 10^{10}\\, Wh" },
    ],
    correctKey: "A",
    explanation: "2.4 x 10^6 por 3.5 x 10^3 = 8.4 x 10^9 Wh.",
  },
]

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

export default function ExamenParcial01({
  examId,
  assignmentId,
  classroomId,
  studentId,
  displayTitle = "Examen Parcial",
  previewMode = false,
  attemptLocked = false,
}: ExamProps) {
  const supabase = createClient()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(attemptLocked)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
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
    const wrongCount = QUESTIONS.length - correctCount
    const score = Number(((correctCount / QUESTIONS.length) * 100).toFixed(2))
    const timeSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000))

    const { error } = await supabase.from("edu_student_exams").insert({
      student_id: studentId,
      classroom_id: classroomId,
      exam_id: examId,
      assignment_id: assignmentId ?? null,
      answers,
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
