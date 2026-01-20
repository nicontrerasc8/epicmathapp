'use client'

import { PrimariaSumaRestaBase } from './PrimariaSumaRestaBase'

type Props = {
  exerciseId: string
  classroomId: string
  sessionId?: string
}

export default function PrimariaSumaResta04(props: Props) {
  return (
    <PrimariaSumaRestaBase
      {...props}
      config={{
        title: 'Primaria 4 - Restas de dos cifras',
        prompt: 'Resuelve la resta y marca la respuesta correcta.',
        minA: 20,
        maxA: 99,
        minB: 1,
        maxB: 20,
        operation: 'resta',
        allowNegative: false,
      }}
    />
  )
}


