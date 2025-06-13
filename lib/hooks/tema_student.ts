import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useStudent } from './useStudent'


export function useEnsureStudentPeriodo(temaPeriodoId: string) {
  const supabase = createClient()
  const { student, loading } = useStudent()

  useEffect(() => {
    if (!loading && student && temaPeriodoId) {
      const checkAndInsert = async () => {
        const { data: existing, error } = await supabase
          .from('student_periodo')
          .select('id')
          .eq('student_id', student.id)
          .eq('tema_periodo_id', temaPeriodoId)
          .maybeSingle()

        if (error) {
          console.error('Error checking student_periodo:', error)
          return
        }

        if (!existing) {
          const { error: insertError } = await supabase.from('student_periodo').insert({
            student_id: student.id,
            tema_periodo_id: temaPeriodoId,
            nivel: student.level
          })

          if (insertError) {
            console.error('Error inserting student_periodo:', insertError)
          } else {
            console.log('student_periodo creado correctamente.')
          }
        } else {
          console.log('student_periodo ya existe.')
        }
      }

      checkAndInsert()
    }
  }, [student, loading, temaPeriodoId])
}
