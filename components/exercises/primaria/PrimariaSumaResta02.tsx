'use client'

import { PrimariaSumaRestaBase } from './PrimariaSumaRestaBase'

type Props = {
  exerciseId: string
  temaId: string
  classroomId: string
  sessionId?: string
}

export default function PrimariaSumaResta02(props: Props) {
  return (
    <PrimariaSumaRestaBase
      {...props}
      config={{
        title: 'Primaria 2 - Restas sin negativos',
        prompt: 'Resuelve la resta y marca la opcion correcta.',
        minA: 5,
        maxA: 20,
        minB: 0,
        maxB: 10,
        operation: 'resta',
        allowNegative: false,
      }}
    />
  )
}
