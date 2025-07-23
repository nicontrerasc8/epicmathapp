import { createClient } from '@/utils/supabase/client'
import toast from 'react-hot-toast'

const supabase = createClient()

/**
 * Actualiza el nivel del estudiante en la tabla student_periodo.
 * @param student_id ID del estudiante
 * @param tema_periodo_id ID del tema asignado al periodo
 * @param nuevoNivel Nivel actualizado (1, 2 o 3)
 */
export async function updateNivelStudentPeriodo(
  student_id: string,
  tema_periodo_id: string,
  nuevoNivel: number
): Promise<{ success: boolean; error?: any }> {
  const { data: existing, error } = await supabase
    .from('student_periodo')
    .select('id, nivel')
    .eq('student_id', student_id)
    .eq('tema_periodo_id', tema_periodo_id)
    .single()

  if (error || !existing) {
    console.error('❌ No se encontró el registro en student_periodo:', error)
    toast.error('No se pudo actualizar el nivel del estudiante.')
    return { success: false, error }
  }

  const nivelAnterior = existing.nivel

  const { error: updateError } = await supabase
    .from('student_periodo')
    .update({ nivel: nuevoNivel })
    .eq('id', existing.id)

  if (updateError) {
    console.error('❌ Error actualizando nivel:', updateError)
    toast.error('Error al guardar el nuevo nivel.')
    return { success: false, error: updateError }
  }

  // Mostrar toast según subida o bajada
  if (nuevoNivel > nivelAnterior) {
    toast.success(`🔼 ¡Subiste a nivel ${nuevoNivel}!`)
  } else if (nuevoNivel < nivelAnterior) {
    toast.error(`🔽 Bajaste a nivel ${nuevoNivel}. ¡Sigue intentándolo!`)
  }

  return { success: true }
}
