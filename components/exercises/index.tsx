'use client'

import { useTemaPeriodo } from '@/lib/exercises/useTemaPeriodo'
import Prisma01 from './prisma/Prisma01'
import Prisma02 from './prisma/Prisma02'
import Prisma03 from './prisma/Prisma03'
import Prisma33 from './prisma/Prisma33'


export const ExerciseRegistry = ({
  temaPeriodoId,
}: {
  temaPeriodoId: string
}) => {
  const {
    temaPeriodo,
    studentPeriodo,
    studentId,
    loading,
  } = useTemaPeriodo(temaPeriodoId)

  if (loading) return <div className="p-6">Cargando…</div>

  if (!temaPeriodo || !studentPeriodo || !studentId) {
    return <div className="p-6 text-red-500">Error cargando ejercicio</div>
  }

  switch (temaPeriodo.tema) {
    case 'Prisma 1':
      return (
        <Prisma01
          temaPeriodoId={temaPeriodoId}
        />
      )

    // case 'Prisma 2':
    //   return (
    //     <Prisma02
    //       temaPeriodoId={temaPeriodoId}
    //       temaPeriodo={temaPeriodo}
    //       studentPeriodo={studentPeriodo}
    //       studentId={studentId}
    //     />
    //   )

    // case 'Prisma 3':
    //   return (
    //     <Prisma03
    //       temaPeriodoId={temaPeriodoId}
    //       temaPeriodo={temaPeriodo}
    //       studentPeriodo={studentPeriodo}
    //       studentId={studentId}
    //     />
    //   )

    // // … repite patrón hasta Prisma 33

    // case 'Prisma 33':
    //   return (
    //     <Prisma33
    //       temaPeriodoId={temaPeriodoId}
    //       temaPeriodo={temaPeriodo}
    //       studentPeriodo={studentPeriodo}
    //       studentId={studentId}
    //     />
    //   )

    default:
      return (
        <div className="p-6 text-center text-muted-foreground">
          Ejercicio no implementado: {temaPeriodo.tema}
        </div>
      )
  }
}
