'use client'

import { PrimariaMathBase } from './PrimariaMathBase'

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function buildDivisionQuestion() {
  const groups = randInt(2, 6)
  const each = randInt(3, 9)
  const total = groups * each
  const distractors = new Set<number>()
  distractors.add(each)
  distractors.add(each + 1)
  distractors.add(Math.max(1, each - 1))
  distractors.add(each + 2)
  const options = Array.from(distractors)
    .map(value => ({ value: value.toString(), correct: value === each }))
    .sort(() => Math.random() - 0.5)
  return {
    question: `Se tienen ${total} galletas y se reparten en ${groups} cajas. ¿Cuantas galletas van en cada caja?`,
    detail: 'Divide el total exactamente entre las cajas.',
    options,
  }
}

export default function PrimariaDivisionStory({
  exerciseId,
  classroomId,
  sessionId,
}: {
  exerciseId: string
  classroomId: string
  sessionId?: string
}) {
  return (
    <PrimariaMathBase
      exerciseId={exerciseId}
      classroomId={classroomId}
      sessionId={sessionId}
      config={{
        title: 'Primaria • Divisiones cotidianas',
        prompt: 'Resuelve la situacion y marca la respuesta correcta.',
        generate: () => buildDivisionQuestion(),
        context: [
          'Un equipo comparte materiales y necesita el mismo numero por caja.',
          'Aplica divisiones exactas para evitar sobrantes.',
        ],
        goal: 'Usar divisiones para repartir cantidades iguales.',
        tags: ['Primaria', 'Divisiones'],
        solutionSteps: [
          { title: 'Cuenta el total', detail: 'Multiplica las cajas por lo que debe llevar cada una.' },
          { title: 'Divide con cuidado', detail: 'Divide el total entre las cajas y verifica que no haya resto.' },
          { title: 'Verifica', detail: 'Multiplica el resultado por las cajas para confirmar que vuelve al total.' },
        ],
      }}
    />
  )
}
