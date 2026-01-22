'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft, Gamepad2, Trophy } from 'lucide-react'
import { motion } from 'framer-motion'

/* =============================
   TYPES
============================= */

type ExerciseComponentProps = {
  exerciseId: string
  classroomId: string
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
  "213987398578932": () => import("./primaria/PrimariaSumaResta01"),
  "5748678765": () => import("./primaria/PrimariaSumaResta02"),
  "876286732": () => import("./primaria/PrimariaSumaResta03"),
  "67485747": () => import("./primaria/PrimariaSumaResta04"),
  "97843297248397": () => import("./primaria/PrimariaSumaResta05"),
}

/* =============================
   COMPONENT
============================= */

export const ExerciseRegistry = ({
  exerciseId,
  classroomId,
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

  console.log('ðŸŽ¯ exerciseId:', exerciseId)

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
            <div className="inline-flex items-center gap-2">
              <Gamepad2 className="h-4 w-4" />
              Modo práctica
            </div>
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
    </div>
  )
}

