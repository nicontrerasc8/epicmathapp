import { persistExerciseOnce } from "@/lib/exercises/persistExerciseOnce"
import { useExerciseGamification } from "@/lib/exercises/useExerciseGamification"

export function useExerciseSubmission(input: {
  exerciseId: string
  classroomId: string
  sessionId?: string
}) {
  const { studentId, gami, gamiLoading, applyGamification } =
    useExerciseGamification(input.exerciseId)

  const submitAttempt = async (params: {
    correct: boolean
    answer: any
    timeSeconds: number
  }) => {
    await persistExerciseOnce({
      exerciseId: input.exerciseId,
      classroomId: input.classroomId,
      sessionId: input.sessionId,
      correct: params.correct,
      answer: params.answer,
      timeSeconds: params.timeSeconds,
    })

    if (studentId) {
      await applyGamification({
        uid: studentId,
        correct: params.correct,
        timeSeconds: params.timeSeconds,
      })
    }
  }

  return {
    studentId,
    gami,
    gamiLoading,
    submitAttempt,
  }
}
