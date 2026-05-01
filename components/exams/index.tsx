"use client"

import React, { useMemo } from "react"
import dynamic from "next/dynamic"

type ExamComponentProps = {
  examId: string
  assignmentId?: string
  classroomId: string
  studentId?: string
  sessionId?: string
  displayTitle?: string
  previewMode?: boolean
  attemptLocked?: boolean
}

type ExamLoader = () => Promise<{
  default: React.ComponentType<ExamComponentProps>
}>

const EXAM_LOADERS: Record<string, ExamLoader> = {
  "cristo/examenes/cuarto/primer-bimestre/examen-parcial-01": () =>
    import("./CristoSalvador/Bachillerato/Cuarto/PrimerBimestre/ExamenParcial01"),
  "cristo/examenes/cuarto/primer-bimestre/examen-final-01": () =>
    import("./CristoSalvador/Bachillerato/Cuarto/PrimerBimestre/ExamenFinal01"),
  "cristosalvador/bachillerato/cuarto/primerbimestre/examenparcial01": () =>
    import("./CristoSalvador/Bachillerato/Cuarto/PrimerBimestre/ExamenParcial01"),
  "cristosalvador/bachillerato/cuarto/primerbimestre/examenfinal01": () =>
    import("./CristoSalvador/Bachillerato/Cuarto/PrimerBimestre/ExamenFinal01"),
}

function normalizeExamComponentKey(componentKey: string | null) {
  if (!componentKey) return null

  return componentKey
    .replace(/\\/g, "/")
    .replace(/^components\/exams\//i, "")
    .replace(/\.tsx$/i, "")
    .trim()
    .toLowerCase()
}

export function ExamRegistry({
  componentKey,
  examId,
  assignmentId,
  classroomId,
  studentId,
  sessionId,
  displayTitle,
  previewMode = false,
  attemptLocked = false,
}: ExamComponentProps & { componentKey: string | null }) {
  const ExamComponent = useMemo(() => {
    const normalizedKey = normalizeExamComponentKey(componentKey)
    if (!normalizedKey) return null

    const legacyAlias = normalizedKey.replace(
      /^cristosalvador\/bachillerato\/cuarto\/primerbimestre\//,
      "cristo/examenes/cuarto/primer-bimestre/",
    )

    const loader = EXAM_LOADERS[normalizedKey] ?? EXAM_LOADERS[legacyAlias]

    if (!loader) return null

    return dynamic(loader, {
      ssr: false,
      loading: () => (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          Cargando examen...
        </div>
      ),
    })
  }, [componentKey])

  if (!ExamComponent) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
        No existe un componente registrado para este examen.
        {componentKey ? (
          <div className="mt-2 font-mono text-xs text-slate-500">
            {componentKey}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <ExamComponent
      examId={examId}
      assignmentId={assignmentId}
      classroomId={classroomId}
      studentId={studentId}
      sessionId={sessionId}
      displayTitle={displayTitle}
      previewMode={previewMode}
      attemptLocked={attemptLocked}
    />
  )
}
