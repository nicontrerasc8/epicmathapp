'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { TemaPeriodoRow, StudentPeriodoRow } from './types'

export function useTemaPeriodo(temaPeriodoId: string) {
  const supabase = createClient()

  const [temaPeriodo, setTemaPeriodo] = useState<TemaPeriodoRow | null>(null)
  const [studentPeriodo, setStudentPeriodo] = useState<StudentPeriodoRow | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!temaPeriodoId) return

    ;(async () => {
      setLoading(true)

      const { data: userRes } = await supabase.auth.getUser()
      const user = userRes?.user
      if (!user) {
        setLoading(false)
        return
      }

      setStudentId(user.id)

      const { data: tp } = await supabase
        .from('tema_periodo')
        .select('*')
        .eq('id', temaPeriodoId)
        .single()

      setTemaPeriodo(tp)

      let { data: sp } = await supabase
        .from('student_periodo')
        .select('*')
        .eq('student_id', user.id)
        .eq('tema_periodo_id', temaPeriodoId)
        .maybeSingle()

      if (!sp) {
        const { data: created } = await supabase
          .from('student_periodo')
          .insert({
            student_id: user.id,
            tema_periodo_id: temaPeriodoId,
            nivel: 1,
            theta: 0,
            aciertos: 0,
            errores: 0,
            streak: 0,
          })
          .select()
          .single()

        sp = created
      }

      setStudentPeriodo(sp)
      setLoading(false)
    })()
  }, [temaPeriodoId])

  return {
    temaPeriodo,
    studentPeriodo,
    studentId,
    loading,
  }
}
