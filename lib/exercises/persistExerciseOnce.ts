import { createClient } from '@/utils/supabase/client'
import { fetchStudentSession } from '@/lib/student-session-client'

type PersistExerciseInput = {
  exerciseId: string
  classroomId: string
  sessionId?: string
  studentId?: string

  answer: any
  correct: boolean
  timeSeconds?: number
}

function serializeAnswer(answer: unknown) {
  if (answer == null) return null
  if (typeof answer === 'string') return answer
  if (typeof answer === 'number' || typeof answer === 'boolean') {
    return String(answer)
  }

  try {
    return JSON.stringify(answer)
  } catch (error) {
    console.error('[persistExerciseOnce] failed to serialize answer', error)
    return String(answer)
  }
}

export async function persistExerciseOnce(input: PersistExerciseInput) {
  const supabase = createClient()

  let studentId = input.studentId ?? null

  if (!studentId) {
    const studentSession = await fetchStudentSession()
    studentId = studentSession?.student_id ?? null
  }

  if (!studentId) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('[persistExerciseOnce] auth lookup failed', authError)
    }

    studentId = user?.id ?? null
  }

  if (!studentId) {
    console.error('[persistExerciseOnce] missing student_id, attempt not persisted', {
      exerciseId: input.exerciseId,
      classroomId: input.classroomId,
    })
    return
  }

  const { error } = await supabase.from('edu_student_exercises').insert({
    student_id: studentId,
    classroom_id: input.classroomId,
    exercise_id: input.exerciseId,
    answer: serializeAnswer(input.answer),
    correct: input.correct,
    time_seconds: input.timeSeconds ?? null,
  })

  if (error) {
    console.error('[persistExerciseOnce] insert failed', {
      error,
      studentId,
      classroomId: input.classroomId,
      exerciseId: input.exerciseId,
    })
  }
}
