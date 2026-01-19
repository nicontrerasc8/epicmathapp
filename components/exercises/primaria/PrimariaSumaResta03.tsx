'use client'

import { PrimariaSumaRestaBase } from './PrimariaSumaRestaBase'

type Props = {
  exerciseId: string
  temaId: string
  classroomId: string
  sessionId?: string
}

export default function PrimariaSumaResta03(props: Props) {
  return (
    <PrimariaSumaRestaBase
      {...props}
      config={{
        title: 'Primaria 3 - Sumas de dos cifras',
        prompt: 'Suma los dos numeros y elige la respuesta correcta.',
        minA: 10,
        maxA: 40,
        minB: 10,
        maxB: 40,
        operation: 'suma',
      }}
    />
  )
}
