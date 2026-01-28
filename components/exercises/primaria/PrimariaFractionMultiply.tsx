'use client'

import { PrimariaMathBase } from './PrimariaMathBase'

function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

function buildFractionMultiplication() {
  const numA = randInt(1, 4)
  const denA = randInt(2, 6)
  const numB = randInt(1, 4)
  const denB = randInt(2, 6)
  const productNum = numA * numB
  const productDen = denA * denB
  const divisor = gcd(productNum, productDen)
  const finalNum = productNum / divisor
  const finalDen = productDen / divisor
  const displayQuestion = `(${numA}/${denA}) * (${numB}/${denB})`
  const correct = finalDen === 1 ? `${finalNum}` : `${finalNum}/${finalDen}`
  const wrong = new Set<string>()
  wrong.add(`${finalNum + 1}/${finalDen}`)
  wrong.add(`${finalNum}/${finalDen + 1}`)
  wrong.add(`${finalNum + 2}/${finalDen}`)
  const options = [correct, ...Array.from(wrong)].map(value => ({ value, correct: value === correct }))
  return {
    question: `Multiplica las fracciones ${displayQuestion}.`,
    detail: 'Multiplica numeradores y denominadores, luego simplifica.',
    options: options.sort(() => Math.random() - 0.5),
  }
}

export default function PrimariaFractionMultiply({
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
        title: 'Primaria • Multiplicaciones con fracciones',
        prompt: 'Calcula el resultado y elige la alternativa correcta.',
        generate: () => buildFractionMultiplication(),
        context: [
          'Un cocinero multiplica una receta y necesita ajustar las fracciones de cada ingrediente.',
          'Trabaja paso a paso para multiplicar y simplificar.',
        ],
        goal: 'Practicar multiplicaciones de fracciones y simplificar.',
        tags: ['Primaria', 'Fracciones'],
        solutionSteps: [
          { title: 'Multiplica numeradores', detail: 'Multiplica los numeradores entre sí.' },
          { title: 'Multiplica denominadores', detail: 'Multiplica los denominadores entre sí.' },
          { title: 'Simplifica', detail: 'Divide numerador y denominador por su mcd.' },
        ],
      }}
    />
  )
}
