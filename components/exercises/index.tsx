'use client'

import { useTemaPeriodo } from '@/lib/exercises/useTemaPeriodo'

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

export const ExerciseRegistry = ({ temaPeriodoId }: { temaPeriodoId: string }) => {
  const { temaPeriodo, studentPeriodo, studentId, loading } = useTemaPeriodo(temaPeriodoId)

  if (loading) return <div className="p-6">Cargando…</div>

  if (!temaPeriodo || !studentPeriodo || !studentId) {
    return <div className="p-6 text-red-500">Error cargando ejercicio</div>
  }

  switch (temaPeriodo.tema) {
    case 'Prisma 1':
      return <Prisma01 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 2':
      return <Prisma02 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 3':
      return <Prisma03 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 4':
      return <Prisma04 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 5':
      return <Prisma05 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 6':
      return <Prisma06 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 7':
      return <Prisma07 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 8':
      return <Prisma08 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 9':
      return <Prisma09 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 10':
      return <Prisma10 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 11':
      return <Prisma11 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 12':
      return <Prisma12 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 13':
      return <Prisma13 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 14':
      return <Prisma14 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 15':
      return <Prisma15 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 16':
      return <Prisma16 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 17':
      return <Prisma17 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 18':
      return <Prisma18 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 19':
      return <Prisma19 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 20':
      return <Prisma20 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 21':
      return <Prisma21 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 22':
      return <Prisma22 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 23':
      return <Prisma23 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 24':
      return <Prisma24 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 25':
      return <Prisma25 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 26':
      return <Prisma26 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 27':
      return <Prisma27 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 28':
      return <Prisma28 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 29':
      return <Prisma29 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 30':
      return <Prisma30 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 31':
      return <Prisma31 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 32':
      return <Prisma32 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 33':
      return <Prisma33 temaPeriodoId={temaPeriodoId} />
    case 'Prisma 34':
      return <Prisma34 temaPeriodoId={temaPeriodoId} />

    case 'Prisma 35':
      return <Prisma35 temaPeriodoId={temaPeriodoId} />

    default:
      return (
        <div className="p-6 text-center text-muted-foreground">
          Ejercicio no implementado: {temaPeriodo.tema}
        </div>
      )
  }
}
