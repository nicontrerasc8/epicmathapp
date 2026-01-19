'use client'

import { PrimariaSumaRestaBase } from './PrimariaSumaRestaBase'

type Props = {
  exerciseId: string
  temaId: string
  classroomId: string
  sessionId?: string
}

export default function PrimariaSumaResta01(props: Props) {
  return (
    <PrimariaSumaRestaBase
      {...props}
      config={{
        title: 'Primaria 1 - Sumas simples',
        prompt: 'Elige la respuesta correcta.',
        minA: 0,
        maxA: 9,
        minB: 0,
        maxB: 9,
        operation: 'suma',
      }}
    />
  )
}
