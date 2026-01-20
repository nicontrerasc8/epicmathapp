import { createClient } from '@/utils/supabase/client'
import { fetchStudentSession } from '@/lib/student-session-client'

type PersistExerciseInput = {
  exerciseId: string
  classroomId: string
  sessionId?: string

  answer: any
  correct: boolean
  timeSeconds?: number
}

export async function persistExerciseOnce(input: PersistExerciseInput) {
  const supabase = createClient()

  const studentSession = await fetchStudentSession()
  if (!studentSession) return

  await supabase.from('edu_student_exercises').insert({
    student_id: studentSession.id,
    classroom_id: input.classroomId,
    exercise_id: input.exerciseId,
    session_id: input.sessionId ?? null,
    answer: input.answer,
    correct: input.correct,
    time_seconds: input.timeSeconds ?? null,
  })
}
