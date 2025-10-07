import { createClient } from '@/utils/supabase/client'

/**
 * Obtiene el nivel actual del estudiante en el tema del periodo.
 * Si no existe el registro, lo crea automáticamente con nivel 1.
 */
export async function getNivelStudentPeriodo(
  student_id: string,
  tema_periodo_id: string
): Promise<number> {
  const supabase = createClient() // ✅ crear dentro de la función

  try {
    // Buscar registro existente
    const { data, error } = await supabase
      .from('student_periodo')
      .select('id, nivel')
      .eq('student_id', student_id)
      .eq('tema_periodo_id', tema_periodo_id)
      .maybeSingle()

    if (error) {
      console.error('❌ Error al consultar student_periodo:', error)
      return 1 // fallback seguro
    }

    // Si ya existe registro
    if (data) {
      return data.nivel ?? 1
    }

    // Si no existe, insertar con nivel 1
    const { error: insertError } = await supabase
      .from('student_periodo')
      .insert([
        {
          student_id,
          tema_periodo_id,
          nivel: 1,
        },
      ])

    if (insertError) {
      console.error('❌ Error al insertar nuevo student_periodo:', insertError)
    }

    return 1
  } catch (err) {
    console.error('⚠️ Excepción inesperada en getNivelStudentPeriodo:', err)
    return 1
  }
}
