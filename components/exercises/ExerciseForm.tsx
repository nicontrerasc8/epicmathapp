'use client'

interface Exercise {
  id: string
  question: string
  options: string[] // ["Opción A", "Opción B", "Opción C", "Opción D"]
  onSelect: (exerciseId: string, selectedOption: string) => void
}

interface ExerciseCardProps {
  exercise: Exercise
}

export function ExerciseCard({ exercise }: ExerciseCardProps) {
  return (
    <div className="bg-muted p-6 rounded-xl border border-border shadow-sm flex flex-col gap-4">
      <h3 className="text-lg font-bold">{exercise.question}</h3>

      <div className="flex flex-col gap-2">
        {exercise.options.map((option, index) => (
          <button
            key={index}
            type="button"
            onClick={() => exercise.onSelect(exercise.id, option)}
            className="w-full text-left bg-background hover:bg-accent border border-border rounded-lg p-3 transition-colors"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

