import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

/**
 * Lógica de árbol de decisión para subir/bajar de nivel
 */
export function calcularNuevoNivel(aciertos: number, nivelActual: number): number {
  if (nivelActual === 1) {
    return aciertos >= 3 ? 2 : 1
  }

  if (nivelActual === 2) {
    if (aciertos >= 4) return 3
    if (aciertos <= 2) return 1
    return 2
  }

  if (nivelActual === 3) {
    return aciertos < 3 ? 2 : 3
  }

  return nivelActual
}

/**
 * Obtiene el nivel actual del alumno para un tema.
 * Si no existe, lo crea con nivel 2 por defecto.
 */
export async function getOrCreateNivel(studentId: string, topicId: string): Promise<number> {
  const { data, error } = await supabase
    .from('student_topic_level')
    .select('nivel')
    .eq('student_id', studentId)
    .eq('topic_id', topicId)
    .single()

  if (data && !error) {
    return data.nivel
  }

  const { error: insertError } = await supabase
    .from('student_topic_level')
    .insert([{ student_id: studentId, topic_id: topicId, nivel: 2 }])

  if (insertError) {
    console.error('Error al crear relación alumno-tema:', insertError)
    throw insertError
  }

  return 2
}

/**
 * Actualiza el nivel del alumno para un tema específico
 */
export async function actualizarNivel(studentId: string, topicId: string, nuevoNivel: number) {
  const { error } = await supabase
    .from('student_topic_level')
    .update({ nivel: nuevoNivel, updated_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .eq('topic_id', topicId)

  if (error) {
    console.error('Error al actualizar nivel del estudiante:', error)
    throw error
  }
}
