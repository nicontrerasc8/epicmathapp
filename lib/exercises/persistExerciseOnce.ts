import { createClient } from '@/utils/supabase/client'

type PersistExerciseInput = {
  temaPeriodoId: string
  exerciseKey: string

  prompt: string
  questionLatex?: string

  options?: string[]
  correctAnswer: string | number
  userAnswer: string | number

  isCorrect: boolean


  extra?: Record<string, any>
}

export async function persistExerciseOnce(input: PersistExerciseInput) {
  const supabase = createClient()

  /* =========================
     USER
  ========================= */
  const { data: auth, error: authErr } = await supabase.auth.getUser()
  if (authErr || !auth.user) return
  const studentId = auth.user.id

  const now = new Date().toISOString()


  /* =========================
     1) student_responses
  ========================= */
  await supabase.from('student_responses').insert({
    student_id: studentId,
    tema_periodo_id: input.temaPeriodoId,
    accion: input.isCorrect ? 1 : 2, // 1 = acierto, 2 = error
   
    respuesta: {
      ejercicio: input.exerciseKey,
      prompt: input.prompt,
      latex: input.questionLatex ?? null,
      options: input.options ?? null,
      correct_answer: input.correctAnswer,
      user_answer: input.userAnswer,
      is_correct: input.isCorrect,
    
      intentos: 1,
      extra: input.extra ?? {},
      timestamp: now,
    },
  })

  /* =========================
     2) student_periodo (UPSERT)
     - NO tocamos nivel ni theta
     - Sí tocamos aciertos / errores / streak / last_seen
  ========================= */
  const { data: sp } = await supabase
    .from('student_periodo')
    .select('aciertos, errores, streak')
    .eq('student_id', studentId)
    .eq('tema_periodo_id', input.temaPeriodoId)
    .maybeSingle()

  if (!sp) {
    // no existe → crear
    await supabase.from('student_periodo').insert({
      student_id: studentId,
      tema_periodo_id: input.temaPeriodoId,
      aciertos: input.isCorrect ? 1 : 0,
      errores: input.isCorrect ? 0 : 1,
      streak: input.isCorrect ? 1 : 0,
      last_seen: now,
    })
    return
  }

  // existe → actualizar
  await supabase
    .from('student_periodo')
    .update({
      aciertos: input.isCorrect ? sp.aciertos + 1 : sp.aciertos,
      errores: input.isCorrect ? sp.errores : sp.errores + 1,
      streak: input.isCorrect ? sp.streak + 1 : 0,
      last_seen: now,
    })
    .eq('student_id', studentId)
    .eq('tema_periodo_id', input.temaPeriodoId)
}
