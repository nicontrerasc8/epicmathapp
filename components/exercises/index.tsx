'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import Prisma01 from './prisma/Prisma01'
import Prisma02 from './prisma/Prisma02'
import Prisma03 from './prisma/Prisma03'
import Prisma04 from './prisma/Prisma04'
import Prisma05 from './prisma/Prisma05'
import Prisma06 from './prisma/Prisma06'
import Prisma07 from './prisma/Prisma07'
import Prisma08 from './prisma/Prisma08'
import Prisma09 from './prisma/Prisma09'
import Prisma10 from './prisma/Prisma10'
import Prisma11 from './prisma/Prisma11'
import Prisma12 from './prisma/Prisma12'
import Prisma13 from './prisma/Prisma13'
import Prisma14 from './prisma/Prisma14'
import Prisma15 from './prisma/Prisma15'
import Prisma16 from './prisma/Prisma16'
import Prisma17 from './prisma/Prisma17'
import Prisma18 from './prisma/Prisma18'
import Prisma19 from './prisma/Prisma19'
import Prisma20 from './prisma/Prisma20'
import Prisma21 from './prisma/Prisma21'
import Prisma22 from './prisma/Prisma22'
import Prisma23 from './prisma/Prisma23'
import Prisma24 from './prisma/Prisma24'
import Prisma25 from './prisma/Prisma25'
import Prisma26 from './prisma/Prisma26'
import Prisma27 from './prisma/Prisma27'
import Prisma28 from './prisma/Prisma28'
import Prisma29 from './prisma/Prisma29'
import Prisma30 from './prisma/Prisma30'
import Prisma31 from './prisma/Prisma31'
import Prisma32 from './prisma/Prisma32'
import Prisma33 from './prisma/Prisma33'
import Prisma34 from './prisma/Prisma34'
import Prisma35 from './prisma/Prisma35'
import PrimariaSumaResta01 from './primaria/PrimariaSumaResta01'
import PrimariaSumaResta02 from './primaria/PrimariaSumaResta02'
import PrimariaSumaResta03 from './primaria/PrimariaSumaResta03'
import PrimariaSumaResta04 from './primaria/PrimariaSumaResta04'
import PrimariaSumaResta05 from './primaria/PrimariaSumaResta05'

/* ============================================================
   REGISTRO GLOBAL DE EJERCICIOS (edu_exercises)
   - La KEY es edu_exercises.id
   - El componente NO sabe nada de pedagogía
   - Solo renderiza el ejercicio correcto
============================================================ */

type ExerciseComponentProps = {
  exerciseId: string
  temaId: string
  classroomId: string
  sessionId?: string
}

const EXERCISE_COMPONENTS: Record<
  string,
  React.ComponentType<ExerciseComponentProps>
> = {
  '50f50e4f-2e59-40c4-b707-87bef079367a': Prisma01,
  '4146db5e-34cd-4ff4-b75b-5b4351caa176': Prisma02,
  '81c53526-9b05-410d-ac7c-e01283de617d': Prisma03,
  '94ba01e4-96c0-49a2-b8d2-014ff5478704': Prisma04,
  'd21c4e0a-e76d-412e-b7c2-d35c235fb79f': Prisma05,
  '4394cd25-2ba5-4800-b662-702ab1caa28b': Prisma06,
  'db07ad87-2fa3-4117-b33b-03285d86380e': Prisma07,
  '9f79e67a-8db6-43c8-81e5-2c55d146c084': Prisma08,
  'b67ee80c-07f3-4007-90d9-75eefe227c41': Prisma09,
  '2e135994-2c86-4fcb-8b20-5ad8d49ab35f': Prisma10,

  '4e66e4a0-9639-422a-8efe-8d8acdf56db1': Prisma11,
  '96b2405f-6175-482f-b9a8-a0188d1ad93a': Prisma12,
  'c8017cee-9212-4af7-87b2-0da2b7fa57d3': Prisma13,
  'e0edd868-684c-4040-8153-6ec8b55792b6': Prisma14,
  '5d8b73d5-f612-4d24-acfa-885539876142': Prisma15,
  'aa04025f-38b8-4a34-8804-7f28c4a0938e': Prisma16,
  '5fc0fcc5-abc4-4918-9e3f-dd95e3d53700': Prisma17,
  '42654a85-cf0b-4614-b139-5ebe81432268': Prisma18,
  'eef9c09e-b3ee-4a2a-a232-3a8728df84f0': Prisma19,
  'c41fb227-c25c-4129-aafe-ebd4d8675629': Prisma20,

  'eec3fdcd-d73a-4648-bee9-7404817a40d5': Prisma21,
  '16f5942a-1805-4bc4-bee4-43c2a27f8b1f': Prisma22,
  '4602dcab-9056-4de4-85cf-c365a973aa47': Prisma23,
  'f1b65df7-cdcb-4de3-9231-f3f9c62ad467': Prisma24,
  'da0efc30-20eb-4e89-8e2d-60e4ed614a0c': Prisma25,
  'fe8f1296-0687-4fc1-977b-58bc861f32b5': Prisma26,
  '2a963696-2fe4-4cb4-bbd8-2de7af0c05e7': Prisma27,
  '0567060c-aa1e-4e4c-aac9-61b9e4db57cc': Prisma28,
  '86f07e37-f827-4ca6-ae39-d162875efdce': Prisma29,
  '3510567c-0576-4651-b470-ccbd5b0876ee': Prisma30,

  'd603e51e-1c68-4f24-baaa-7063cc108482': Prisma31,
  '3f32b3e4-7170-4fde-9bd8-8ddc04b31b7b': Prisma32,
  '5ffb7fcb-b4a6-4d01-83c1-4d6eef48a04a': Prisma33,
  '01e506fd-11d4-4a4a-8de6-19d7a32e6132': Prisma34,
  '7ed40df0-cc59-48e5-a156-71e9322c9a8f': Prisma35,
  '213987398578932': PrimariaSumaResta01,
  '5748678765': PrimariaSumaResta02,
  '876286732': PrimariaSumaResta03,
  '67485747': PrimariaSumaResta04,
  '97843297248397': PrimariaSumaResta05,
}

/* ============================================================
   EXERCISE REGISTRY
============================================================ */

export const ExerciseRegistry = ({
  exerciseId,
  temaId,
  classroomId,
  sessionId,
}: ExerciseComponentProps) => {
  const ExerciseComponent = EXERCISE_COMPONENTS[exerciseId]

  console.log('exerciseId recibido:', exerciseId)
  console.log('keys registry:', Object.keys(EXERCISE_COMPONENTS))

  return (
    <div className="relative">
      {/* ✅ Botón Volver (siempre) */}
      <Link
        href="/student/play"
        className="absolute left-4 top-4 z-50 inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Link>

      {!ExerciseComponent ? (
        <div className="p-6 pt-16 text-center text-muted-foreground">
          Ejercicio no implementado
        </div>
      ) : (
        <div className="pt-16">
          <ExerciseComponent
            exerciseId={exerciseId}
            temaId={temaId}
            classroomId={classroomId}
            sessionId={sessionId}
          />
        </div>
      )}
    </div>
  )
}
