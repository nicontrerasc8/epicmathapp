import { createClient } from '@/utils/supabase/client'

type PersistExerciseInput = {
  exerciseId: string
  temaId: string
  classroomId: string
  sessionId?: string

  answer: any
  correct: boolean
  timeSeconds?: number
}

export async function persistExerciseOnce(input: PersistExerciseInput) {
  const supabase = createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return

  await supabase.from('edu_student_exercises').insert({
    student_id: auth.user.id,
    classroom_id: input.classroomId,
    exercise_id: input.exerciseId,
    tema_id: input.temaId,
    session_id: input.sessionId ?? null,
    answer: input.answer,
    correct: input.correct,
    time_seconds: input.timeSeconds ?? null,
  })
}
