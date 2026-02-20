'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft, Gamepad2, MessageCircle, Trophy } from 'lucide-react'
import { motion } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'

/* =============================
   TYPES
============================= */

type ExerciseComponentProps = {
  exerciseId: string
  classroomId: string
  studentId?: string
  sessionId?: string
}

/* =============================
   REGISTRY (LAZY)
============================= */

type ExerciseLoader = () => Promise<{
  default: React.ComponentType<ExerciseComponentProps>
}>

const EXERCISE_LOADERS: Record<string, ExerciseLoader> = {
  "50f50e4f-2e59-40c4-b707-87bef079367a": () => import("./prisma/Prisma01"),
  "4146db5e-34cd-4ff4-b75b-5b4351caa176": () => import("./prisma/Prisma02"),
  "81c53526-9b05-410d-ac7c-e01283de617d": () => import("./prisma/Prisma03"),
  "94ba01e4-96c0-49a2-b8d2-014ff5478704": () => import("./prisma/Prisma04"),
  "d21c4e0a-e76d-412e-b7c2-d35c235fb79f": () => import("./prisma/Prisma05"),
  "4394cd25-2ba5-4800-b662-702ab1caa28b": () => import("./prisma/Prisma06"),
  "db07ad87-2fa3-4117-b33b-03285d86380e": () => import("./prisma/Prisma07"),
  "9f79e67a-8db6-43c8-81e5-2c55d146c084": () => import("./prisma/Prisma08"),
  "b67ee80c-07f3-4007-90d9-75eefe227c41": () => import("./prisma/Prisma09"),
  "2e135994-2c86-4fcb-8b20-5ad8d49ab35f": () => import("./prisma/Prisma10"),
  "4e66e4a0-9639-422a-8efe-8d8acdf56db1": () => import("./prisma/Prisma11"),
  "96b2405f-6175-482f-b9a8-a0188d1ad93a": () => import("./prisma/Prisma12"),
  "c8017cee-9212-4af7-87b2-0da2b7fa57d3": () => import("./prisma/Prisma13"),
  "e0edd868-684c-4040-8153-6ec8b55792b6": () => import("./prisma/Prisma14"),
  "5d8b73d5-f612-4d24-acfa-885539876142": () => import("./prisma/Prisma15"),
  "aa04025f-38b8-4a34-8804-7f28c4a0938e": () => import("./prisma/Prisma16"),
  "5fc0fcc5-abc4-4918-9e3f-dd95e3d53700": () => import("./prisma/Prisma17"),
  "42654a85-cf0b-4614-b139-5ebe81432268": () => import("./prisma/Prisma18"),
  "eef9c09e-b3ee-4a2a-a232-3a8728df84f0": () => import("./prisma/Prisma19"),
  "c41fb227-c25c-4129-aafe-ebd4d8675629": () => import("./prisma/Prisma20"),
  "eec3fdcd-d73a-4648-bee9-7404817a40d5": () => import("./prisma/Prisma21"),
  "16f5942a-1805-4bc4-bee4-43c2a27f8b1f": () => import("./prisma/Prisma22"),
  "4602dcab-9056-4de4-85cf-c365a973aa47": () => import("./prisma/Prisma23"),
  "f1b65df7-cdcb-4de3-9231-f3f9c62ad467": () => import("./prisma/Prisma24"),
  "da0efc30-20eb-4e89-8e2d-60e4ed614a0c": () => import("./prisma/Prisma25"),
  "fe8f1296-0687-4fc1-977b-58bc861f32b5": () => import("./prisma/Prisma26"),
  "2a963696-2fe4-4cb4-bbd8-2de7af0c05e7": () => import("./prisma/Prisma27"),
  "0567060c-aa1e-4e4c-aac9-61b9e4db57cc": () => import("./prisma/Prisma28"),
  "86f07e37-f827-4ca6-ae39-d162875efdce": () => import("./prisma/Prisma29"),
  "3510567c-0576-4651-b470-ccbd5b0876ee": () => import("./prisma/Prisma30"),
  "d603e51e-1c68-4f24-baaa-7063cc108482": () => import("./prisma/Prisma31"),
  "3f32b3e4-7170-4fde-9bd8-8ddc04b31b7b": () => import("./prisma/Prisma32"),
  "5ffb7fcb-b4a6-4d01-83c1-4d6eef48a04a": () => import("./prisma/Prisma33"),
  "01e506fd-11d4-4a4a-8de6-19d7a32e6132": () => import("./prisma/Prisma34"),
  "7ed40df0-cc59-48e5-a156-71e9322c9a8f": () => import("./prisma/Prisma35"),
  "d187e75f-5da6-43d2-820b-e83486f07e53": () => import("./avanzado/AdvancedSystemEquations"),
  "02519042-3d4b-489a-9f42-fbb9cd4a8885": () => import("./CristoSalvador/Bachillerato/Cuarto/PrimerBimestre/EstadisticayProb/Ej15"),
  "fe9674ce-82ea-42d9-a5e8-89c6ca05c044": () => import("./avanzado/AdvancedOptimization"),
  "738395f5-9495-4297-a04c-7b4dce5e1c54": () => import("./avanzado/AdvancedProbability"),
  "05994607-8168-42f0-81d6-4b046de674e3": () => import("./avanzado/AdvancedMatrixTransformations"),
  "7ee7b6ee-6dc1-4c3d-a8b1-b3cd412d25dd": () => import("./avanzado/AdvancedDynamicsRate"),
  "7dcf3a0b-6b60-4338-992d-4613e2310e8b": () => import("./primaria/PrimariaStatsMeasure"),
  "64702e6a-82b7-4fba-815e-b05c9b8c569e": () => import("./primaria/PrimariaFractionMultiply"),
  "1f63052a-9665-4287-9ac6-da0ebdc62d7f": () => import("./primaria/PrimariaDivisionStory"),

  "49b82682-8759-4b51-9de3-e35d0bc17d7d": () => import("./primaria/SumasLaPontificia"),
  "97a15c4c-f677-4789-9e7b-1e4c8972c707": () => import("./primaria/RestasLaPontificia"),
  "4f1075c6-8459-4297-872a-85de63da0312": () => import("./primaria/MultiplicacionesLaPontificia"),
  "2f4793be-c77b-4e5e-8dd6-a149599fb58d": () => import("./primaria/SumasLaPontificia"),
  "98ba8bab-9ed8-43c9-9d66-2c75ece6a247": () => import("./primaria/RestasLaPontificia"),
  "c518852b-88f0-4ae2-842b-01ab420afcf6": () => import("./primaria/MultiplicacionesLaPontificia"),
  "d64f714a-0fd7-4b27-9129-340693d12711": () => import("./primaria/SumasLaPontificia"),
  "c6d80a78-128c-464f-917c-d75fd9a0f1c5": () => import("./primaria/RestasLaPontificia"),
  "02823510-6da2-478c-8600-958f4cd37fe4": () => import("./primaria/MultiplicacionesLaPontificia"),

  "a38847f3-2a33-4fb1-9a9f-3440b52d9d2c": () => import("./prisma/SR01"),

  "5ca2ced7-1067-46fb-8d94-0d0bab7b983d": () => import("./prisma/SR02"),

}

const formatFeedbackDate = (value?: string) => {
  if (!value) return ''
  const when = new Date(value)
  if (Number.isNaN(when.getTime())) return value
  return when.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* =============================
   COMPONENT
============================= */

export const ExerciseRegistry = ({
  exerciseId,
  classroomId,
  studentId,
  sessionId,
}: ExerciseComponentProps) => {
  const ExerciseComponent = useMemo(() => {
    const loader = EXERCISE_LOADERS[exerciseId]
    if (!loader) return null
    return dynamic(loader, {
      ssr: false,
      loading: () => (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          Cargando ejercicio...
        </div>
      ),
    })
  }, [exerciseId])
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [feedbackRows, setFeedbackRows] = useState<
    Array<{
      id: string
      comment: string
      created_at: string
    teacher?: { first_name?: string | null; last_name?: string | null } | null
  }>
>([])

  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)

  const latestFeedback = feedbackRows[0]
  const previewTeacherName =
    [latestFeedback?.teacher?.first_name, latestFeedback?.teacher?.last_name]
      .filter(Boolean)
      .join(' ') || 'Docente'
  const previewDateLabel = formatFeedbackDate(latestFeedback?.created_at)
  const previewExcerpt = latestFeedback?.comment
    ? latestFeedback.comment.length > 180
      ? `${latestFeedback.comment.slice(0, 180).trim()}…`
      : latestFeedback.comment
    : undefined
  const previewMetaLabel = latestFeedback
    ? `${previewTeacherName}${previewDateLabel ? ` · ${previewDateLabel}` : ''}`
    : 'Cuando tu docente deje un comentario, lo verás aquí.'

  useEffect(() => {
    if (!studentId || !classroomId || !exerciseId) return

    let active = true
    const supabase = createClient()

    const loadFeedback = async () => {
      setFeedbackLoading(true)
      setFeedbackError(null)

      try {
        const { data: assignments, error: assignmentErr } = await supabase
          .from('edu_exercise_assignments')
          .select('id')
          .eq('classroom_id', classroomId)
          .eq('exercise_id', exerciseId)
          .eq('active', true)

        if (assignmentErr) throw assignmentErr

        const assignmentIds = (assignments ?? [])
          .map((row: any) => row.id)
          .filter(Boolean)

        if (assignmentIds.length === 0) {
          if (active) setFeedbackRows([])
          return
        }

        const { data, error } = await supabase
          .from('edu_assignment_feedback')
          .select(
            'id, comment, created_at, teacher:edu_profiles!edu_assignment_feedback_teacher_fkey ( first_name, last_name )',
          )
          .eq('student_id', studentId)
          .in('assignment_id', assignmentIds)
          .order('created_at', { ascending: false })

        if (error) throw error

        if (active) setFeedbackRows((data ?? []) as any[])
      } catch (err: any) {
        if (active) {
          setFeedbackRows([])
          setFeedbackError(
            err?.message ?? 'No se pudieron cargar comentarios del docente.',
          )
        }
      } finally {
        if (active) setFeedbackLoading(false)
      }
    }

    loadFeedback()

    return () => {
      active = false
    }
  }, [studentId, classroomId, exerciseId])

  useEffect(() => {
    if (!isFeedbackModalOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFeedbackModalOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFeedbackModalOpen])

  const renderFeedbackContent = () => {
    if (feedbackLoading) {
      return (
        <p className="text-sm text-muted-foreground">Cargando comentarios...</p>
      )
    }

    if (feedbackError) {
      return <p className="text-sm text-destructive">{feedbackError}</p>
    }

    if (feedbackRows.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          Aun no hay comentarios para este ejercicio.
        </p>
      )
    }

    return (
      <div className="space-y-3">
        {feedbackRows.map((row) => {
          const teacherName =
            [row.teacher?.first_name, row.teacher?.last_name]
              .filter(Boolean)
              .join(' ') || 'Docente'
          const whenLabel =
            formatFeedbackDate(row.created_at) || row.created_at

          return (
            <div
              key={row.id}
              className="rounded-xl border bg-background p-4"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{teacherName}</span>
                <span>{whenLabel}</span>
              </div>
              <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">
                {row.comment}
              </p>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-background to-muted">

      {/* ðŸ”™ Sticky Header */}
      <div className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link
            href="/student/play"
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
        
            <Link
              href={`/student/play/${exerciseId}/scoreboard`}
              className="inline-flex items-center gap-1 rounded-full border border-black/30 bg-white/5 text-black px-3 py-1 text-xs font-semibold uppercase"
            >
              <Trophy className="h-3.5 w-3.5 text-amber-300" />
              Tabla de trofeos
            </Link>
          </div>
        </div>
      </div>

      {/* ðŸŽ® CONTENIDO */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="mx-auto max-w-6xl px-4 py-8"
      >
        <div className="mb-6 rounded-2xl border border-white/10 bg-card p-6 shadow-lg shadow-black/5 backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">Comentarios del docente</h2>
    
              </div>

              <p className="text-sm text-muted-foreground">{previewMetaLabel}</p>
              {previewExcerpt && (
                <p className="text-sm text-foreground leading-relaxed">
                  {previewExcerpt}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsFeedbackModalOpen(true)}
              className="inline-flex items-center gap-2 self-start rounded-full border border-transparent bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-xs font-semibold uppercase text-white shadow-lg shadow-emerald-500/40 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Ver comentarios</span>
            </button>
          </div>
        </div>
        {!ExerciseComponent ? (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-10 text-center">
            <Gamepad2 className="h-10 w-10 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold">
              Ejercicio no disponible
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Este ejercicio aÃºn no ha sido implementado en la plataforma.
              Vuelve más tarde o continÃºa con otro.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <ExerciseComponent
              exerciseId={exerciseId}
              classroomId={classroomId}
              sessionId={sessionId}
            />
          </div>
        )}
      </motion.div>
      {isFeedbackModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setIsFeedbackModalOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Comentarios del docente"
            className="w-full max-w-3xl rounded-3xl border border-white/10 bg-gradient-to-br from-background/90 to-card/90 p-6 shadow-2xl shadow-black/60 backdrop-blur-3xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Feedback
                </p>
                <h3 className="text-lg font-semibold text-foreground">
                  Comentarios del docente
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(false)}
                className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase text-muted-foreground transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
              >
                Cerrar
              </button>
            </div>
            <div className="mt-5 max-h-[60vh] overflow-y-auto pr-1">
              {renderFeedbackContent()}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

