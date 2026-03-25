'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Divide, Sigma, ShieldCheck } from 'lucide-react'
import { ExerciseRegistry } from '@/components/exercises'
import { MathProvider, MathTex } from '@/components/exercises/base/MathBlock'
import { SolutionBox } from '@/components/exercises/base/SolutionBox'
import { DetailedExplanation } from '@/components/exercises/base/DetailedExplanation'
import { useExerciseContext } from '@/lib/exercises/useExerciseContext'

function formatAnswerValue(value: unknown) {
  if (value == null) return 'Sin respuesta'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function renderQuestionSummary(answer: any) {
  if (!answer || typeof answer !== 'object') return null

  const question = answer.question

  if (question?.prompt) {
    return (
      <div className="rounded-xl bg-white px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Enunciado</p>
        <p className="mt-1 text-sm text-slate-800">{String(question.prompt)}</p>
      </div>
    )
  }

  if (
    question &&
    typeof question.a1 === 'number' &&
    typeof question.a2 === 'number' &&
    typeof question.a3 === 'number' &&
    typeof question.k1 === 'number' &&
    typeof question.k2 === 'number' &&
    typeof question.k3 === 'number'
  ) {
    return (
      <div className="rounded-xl bg-white px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Enunciado</p>
        <p className="mt-1 text-sm text-slate-800">
          Se operaba
          {' '}
          ({question.a1} × 10^{question.k1})
          {' · '}
          ({question.a2} × 10^{question.k2})
          {' / '}
          ({question.a3} × 10^{question.k3}).
        </p>
      </div>
    )
  }

  if (question?.real != null && question?.reported != null) {
    return (
      <div className="rounded-xl bg-white px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Enunciado</p>
        <p className="mt-1 text-sm text-slate-800">
          Valor real:
          {' '}
          {formatAnswerValue(question.real)}
          {' · '}
          Valor reportado:
          {' '}
          {formatAnswerValue(question.reported)}
        </p>
      </div>
    )
  }

  if (typeof answer.m === 'number' && Array.isArray(answer.point) && answer.point.length === 2) {
    return (
      <div className="rounded-xl bg-white px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Enunciado</p>
        <p className="mt-1 text-sm text-slate-800">
          Recta con pendiente
          {' '}
          {formatAnswerValue(answer.m)}
          {' '}
          que pasa por
          {' '}
          ({formatAnswerValue(answer.point[0])}, {formatAnswerValue(answer.point[1])})
          {answer.b != null ? ` y con intercepto ${formatAnswerValue(answer.b)}` : ''}.
        </p>
      </div>
    )
  }

  return null
}

function renderAttemptGuide(answer: any) {
  if (!answer || typeof answer !== 'object') return null

  const computed = answer.computed
  const question = answer.question
  const correctAnswer = answer.correctAnswer

  if (question?.type === 'notacion_cientifica_p2' && question?.expr_tex) {
    return (
      <MathProvider>
        <SolutionBox>
          <DetailedExplanation
            title="Guía paso a paso"
            steps={[
              {
                title: 'Leer la expresión',
                detail: (
                  <span>
                    Primero identificamos la operación completa en notación científica.
                  </span>
                ),
                icon: Sigma,
                content: (
                  <div className="space-y-3">
                    <MathTex block tex={String(question.expr_tex)} />
                  </div>
                ),
              },
              {
                title: 'Resolver el resultado intermedio',
                detail: (
                  <span>
                    Operamos la parte numérica y la potencia de 10 antes de normalizar.
                  </span>
                ),
                icon: Divide,
                content: (
                  <div className="space-y-3">
                    {computed?.numMantissa != null && (
                      <MathTex
                        block
                        tex={`\\text{Resultado numérico del numerador} = ${formatAnswerValue(computed.numMantissa)}`}
                      />
                    )}
                    {computed?.numExp != null && (
                      <MathTex
                        block
                        tex={`\\text{Exponente acumulado del numerador} = ${formatAnswerValue(computed.numExp)}`}
                      />
                    )}
                    {computed?.resultMantissa != null && computed?.resultExp != null && (
                      <MathTex
                        block
                        tex={`${formatAnswerValue(computed.resultMantissa)} \\times 10^{${formatAnswerValue(computed.resultExp)}}`}
                      />
                    )}
                  </div>
                ),
              },
              {
                title: 'Normalizar la respuesta',
                detail: (
                  <span>
                    Ajustamos la mantisa para que quede entre 1 y 10.
                  </span>
                ),
                icon: ShieldCheck,
                content: (
                  <div className="space-y-3">
                    {computed?.normalized?.m != null && computed?.normalized?.e != null && (
                      <MathTex
                        block
                        tex={`\\text{Forma normalizada} = ${formatAnswerValue(computed.normalized.m)} \\times 10^{${formatAnswerValue(computed.normalized.e)}}`}
                      />
                    )}
                    <MathTex block tex={String(correctAnswer)} />
                  </div>
                ),
              },
            ]}
            concluding={
              <span>
                Respuesta final:
                {' '}
                <MathTex tex={String(correctAnswer)} />
              </span>
            }
          />
        </SolutionBox>
      </MathProvider>
    )
  }

  if (question && computed?.normalized) {
    return (
      <div className="rounded-xl bg-white px-4 py-4">
        <p className="font-semibold text-slate-900">Cómo se resolvía</p>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p>1. Separamos mantisa y potencias de 10.</p>
          <p>
            2. Resultado intermedio: mantisa
            {' '}
            {formatAnswerValue(computed.rawMantissa)}
            {' '}
            y exponente
            {' '}
            {formatAnswerValue(computed.rawExponent)}.
          </p>
          <p>3. Normalizamos a notación científica y obtenemos {formatAnswerValue(correctAnswer)}.</p>
        </div>
      </div>
    )
  }

  if (question?.real != null && question?.reported != null) {
    return (
      <MathProvider>
        <SolutionBox>
          <DetailedExplanation
            title="Guía paso a paso"
            steps={[
              {
                title: 'Comparar los datos',
                detail: <span>Tomamos el valor real y el valor reportado.</span>,
                icon: Sigma,
                content: (
                  <div className="space-y-3">
                    <MathTex
                      block
                      tex={`\\text{Valor real} = ${formatAnswerValue(question.real)}`}
                    />
                    <MathTex
                      block
                      tex={`\\text{Valor reportado} = ${formatAnswerValue(question.reported)}`}
                    />
                  </div>
                ),
              },
              {
                title: 'Aplicar la fórmula',
                detail: <span>Restamos, dividimos entre el valor real y multiplicamos por 100.</span>,
                icon: Divide,
                content: (
                  <div className="space-y-3">
                    <MathTex
                      block
                      tex={`\\text{Error \\%} = \\frac{|${formatAnswerValue(question.reported)} - ${formatAnswerValue(question.real)}|}{${formatAnswerValue(question.real)}} \\times 100`}
                    />
                  </div>
                ),
              },
              {
                title: 'Obtener el porcentaje',
                detail: <span>Ese resultado es el error porcentual correcto.</span>,
                icon: ShieldCheck,
                content: <MathTex block tex={String(correctAnswer)} />,
              },
            ]}
            concluding={
              <span>
                Respuesta final:
                {' '}
                <MathTex tex={String(correctAnswer)} />
              </span>
            }
          />
        </SolutionBox>
      </MathProvider>
    )
  }

  if (typeof answer.m === 'number' && Array.isArray(answer.point) && answer.point.length === 2) {
    return (
      <div className="rounded-xl bg-white px-4 py-4">
        <p className="font-semibold text-slate-900">Cómo se resolvía</p>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <p>
            1. Identificamos la pendiente
            {' '}
            {formatAnswerValue(answer.m)}
            {' '}
            y el punto
            {' '}
            ({formatAnswerValue(answer.point[0])}, {formatAnswerValue(answer.point[1])}).
          </p>
          <p>2. Sustituimos esos datos en la forma de la recta correspondiente.</p>
          <p>3. La respuesta correcta era {formatAnswerValue(correctAnswer)}.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white px-4 py-4">
      <p className="font-semibold text-slate-900">Qué revisar</p>
      <div className="mt-3 space-y-2 text-sm text-slate-700">
        <p>1. Compara tu elección con la respuesta correcta.</p>
        <p>2. Revisa qué dato o paso del enunciado te hizo desviarte.</p>
        <p>3. Usa este resultado como referencia antes de pasar al siguiente ejercicio.</p>
      </div>
    </div>
  )
}

function renderAttemptFeedback(answer: any) {
  if (!answer || typeof answer !== 'object') return null

  return (
    <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-left">
      <h2 className="text-lg font-bold text-slate-900">Feedback de tu último intento</h2>

      <div className="mt-4 space-y-4">
        {renderQuestionSummary(answer)}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tu respuesta</p>
            <p className="mt-1 font-semibold text-slate-900">
              {formatAnswerValue(answer.selected)}
            </p>
          </div>
          <div className="rounded-xl bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Respuesta correcta</p>
            <p className="mt-1 font-semibold text-emerald-700">
              {formatAnswerValue(answer.correctAnswer)}
            </p>
          </div>
        </div>

        {renderAttemptGuide(answer)}
      </div>
    </div>
  )
}

export default function ExercisePlayPage() {
  const { id } = useParams()
  const exerciseId = typeof id === 'string' ? id : null

  const {
    classroomId,
    sessionId,
    studentId,
    attemptsUsed,
    correctAttempts,
    latestAttemptAnswer,
    latestAttemptCorrect,
    maxAttempts,
    blocked,
    topic,
    block,
    blockOrder,
    nextExerciseId,
    loading,
    error,
  } = useExerciseContext(exerciseId)

  if (!exerciseId) {
    return <div className="p-6">ID inválido</div>
  }

  if (loading) {
    return <div className="p-6">Cargando ejercicio…</div>
  }

  if (error || !classroomId) {
    return (
      <div className="p-6 text-red-500">
        {error ?? 'Error cargando contexto'}
      </div>
    )
  }

  if (blocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 px-6 py-10 sm:py-16">
        <div className="mx-auto max-w-3xl rounded-3xl border-2 border-blue-200 bg-white/90 p-8 shadow-lg">
          <div className="space-y-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
              Resultado del ejercicio
            </p>
            <h1 className="text-3xl font-black text-slate-900">
              Ejercicio {blockOrder ?? ''}
            </h1>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4">
              <p className="text-lg font-bold text-slate-900">
                Aciertos: {correctAttempts}/{maxAttempts}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Intentos usados: {attemptsUsed}/{maxAttempts}
              </p>
            </div>
     
     
            {topic && block && (
              <p className="text-sm text-slate-500">
                {topic} · {block}
              </p>
            )}
          </div>

          {renderAttemptFeedback(latestAttemptAnswer)}

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {nextExerciseId ? (
              <Link
                href={`/student/play/${nextExerciseId}`}
                className="rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-bold text-white hover:bg-blue-700"
              >
                Siguiente ejercicio
              </Link>
            ) : (
              <Link
                href="/student/play"
                className="rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-bold text-white hover:bg-blue-700"
              >
                Volver al inicio
              </Link>
            )}

            <Link
              href={
                classroomId && topic && block
                  ? `/student/play/${classroomId}/${encodeURIComponent(topic)}/${encodeURIComponent(block)}`
                  : '/student/play'
              }
              className="rounded-xl border border-blue-300 bg-blue-50 px-5 py-3 text-center text-sm font-bold text-blue-700 hover:bg-blue-100"
            >
              Volver al tema
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ExerciseRegistry
      exerciseId={exerciseId}
      classroomId={classroomId}
      studentId={studentId ?? undefined}
      sessionId={sessionId ?? undefined}
      displayTitle={blockOrder ? `Ejercicio ${blockOrder}` : 'Ejercicio'}
    />
  )
}
