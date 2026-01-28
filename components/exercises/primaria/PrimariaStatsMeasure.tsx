'use client'

import { PrimariaMathBase } from './PrimariaMathBase'

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

type StatsMeasure = 'media' | 'mediana' | 'moda'

type StatsQuestion = {
  question: string
  detail: string
  options: Array<{ value: string; correct: boolean }>
}

function buildStatsQuestion(): StatsQuestion {
  const measurement: StatsMeasure = ['media', 'mediana', 'moda'][Math.floor(Math.random() * 3)]
  while (true) {
    const mode = randInt(1, 7)
    const a = randInt(1, 9)
    const b = randInt(1, 9)
    const meanTarget = randInt(3, 7)
    const sumWithoutC = mode * 2 + a + b
    const c = meanTarget * 5 - sumWithoutC
    if (c < 1 || c > 9) continue

    const dataset = [mode, mode, a, b, c]
    const sorted = [...dataset].sort((x, y) => x - y)
    const mean = meanTarget
    const median = sorted[2]
    const moda = mode
    const questionText = `Los numeros son ${dataset.join(', ')}. Cual es la ${measurement}?`
    const detailText = 'Usa suma y orden para decidir la respuesta.'
    const correctValue =
      measurement === 'media'
        ? mean
        : measurement === 'mediana'
        ? median
        : moda

    const distractors = new Set<number>()
    distractors.add(mean)
    distractors.add(median)
    distractors.add(moda)
    while (distractors.size < 4) {
      distractors.add(randInt(1, 9))
    }

    const options = Array.from(distractors)
      .map(value => ({ value: value.toString(), correct: value === correctValue }))
      .sort(() => Math.random() - 0.5)

    return {
      question: questionText,
      detail: detailText,
      options,
    }
  }
}

export default function PrimariaStatsMeasure({
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
        title: 'Primaria • Media, mediana y moda',
        prompt: 'Analiza el conjunto de numeros y elige la respuesta correcta.',
        generate: () => buildStatsQuestion(),
        context: [
          'Un maestro guarda las notas de cinco amigos y quiere explicar la diferencia entre media, mediana y moda.',
          'Elige la medida que se solicita y justifica el procedimiento.',
        ],
        goal: 'Interpretar datos sencillos y distinguir cada medida.',
        tags: ['Primaria', 'Estadística'],
        solutionSteps: [
          { title: 'Revisa los numeros', detail: 'Ordena los valores si se pide mediana.' },
          { title: 'Suma y divide', detail: 'La media es la suma entre cinco cuando se pide promedio.' },
          { title: 'Cuenta repeticiones', detail: 'La moda es el numero que aparece más veces.' },
        ],
      }}
    />
  )
}
