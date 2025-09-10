// src/lib/db/insertStudentResponse.ts
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

interface InsertStudentResponseParams {
  student_id: string
  tema_periodo_id: string
  nivel: number
  es_correcto: boolean
  ejercicio_data: object // puede ser el JSON del problema generado
  respuesta: object // puede ser el JSON del input del estudiante
  tiempo_segundos?: number | null
}

/**
 * Inserta un intento de ejercicio del alumno en la base de datos.
 */
export async function insertStudentResponse({
  student_id,
  tema_periodo_id,
  nivel,
  es_correcto,
  ejercicio_data,
  respuesta,
  tiempo_segundos = null,
}: InsertStudentResponseParams): Promise<{ success: boolean; error?: any }> {
  // Aquí puedes enriquecer la respuesta con más info sin romper el tipo
  const payload = {
    student_id,
    tema_periodo_id,
    nivel,
    es_correcto,
    ejercicio_data,
    respuesta, // puedes incluir aquí las nuevas métricas como { ...respuesta, tiempo_promedio, pistas_usadas, racha, mejora }
    tiempo_segundos,
  }

  const { error } = await supabase.from('student_responses').insert([payload])

  if (error) {
    console.error('Error al insertar student_response:', error)
    return { success: false, error }
  }

  return { success: true }
}
