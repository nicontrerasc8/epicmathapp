'use client'

import { PrimariaSumaRestaBase } from './PrimariaSumaRestaBase'

type Props = {
  exerciseId: string
  classroomId: string
  sessionId?: string
}

export default function PrimariaSumaResta05(props: Props) {
  return (
    <PrimariaSumaRestaBase
      {...props}
      config={{
        title: 'Primaria 5 - Sumas y restas mixtas',
        prompt: 'Lee la operacion y elige la respuesta correcta.',
        minA: 0,
        maxA: 30,
        minB: 0,
        maxB: 30,
        operation: 'mixta',
        allowNegative: false,
      }}
    />
  )
}


