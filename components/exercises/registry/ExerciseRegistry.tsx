'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import toast from 'react-hot-toast'
import { resolveExerciseComponent } from './resolveExerciseComponent'

import { ExerciseShellLoading } from '../base/ExerciseShellLoading'
import { StudentPeriodoRow, TemaPeriodoRow } from '@/lib/exercises/types'

export function ExerciseRegistry({ temaPeriodoId }: { temaPeriodoId: string }) {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [tema, setTema] = useState<TemaPeriodoRow | null>(null)
  const [sp, setSp] = useState<StudentPeriodoRow | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)

      const { data: userRes } = await supabase.auth.getUser()
      if (!userRes?.user?.id) {
        toast.error('Inicia sesión para guardar tu progreso')
        setLoading(false)
        return
      }
      setUserId(userRes.user.id)

      const { data: tp, error: tpErr } = await supabase
        .from('tema_periodo')
        .select('id, tema, grado, periodo_id, school_id')
        .eq('id', temaPeriodoId)
        .single()

      if (tpErr) {
        toast.error('No se pudo cargar el tema')
        setLoading(false)
        return
      }
      setTema(tp as any)

      const { data: sp0 } = await supabase
        .from('student_periodo')
        .select('*')
        .eq('student_id', userRes.user.id)
        .eq('tema_periodo_id', temaPeriodoId)
        .maybeSingle()

      let spFinal = sp0 as any

      if (!spFinal) {
        const { data: created, error: createErr } = await supabase
          .from('student_periodo')
          .insert({
            student_id: userRes.user.id,
            tema_periodo_id: temaPeriodoId,
            nivel: 1,
            theta: 0,
            aciertos: 0,
            errores: 0,
            streak: 0,
          })
          .select()
          .single()

        if (createErr) {
          toast.error('No se pudo crear progreso del alumno')
          setLoading(false)
          return
        }

        spFinal = created
      }

      setSp(spFinal)
      setLoading(false)
    })()
  }, [temaPeriodoId])

  if (loading) return <ExerciseShellLoading />

  if (!tema || !userId || !sp) {
    return <div className="p-6 text-red-600">No se pudo inicializar</div>
  }

  const ExerciseComponent = resolveExerciseComponent(tema.tema)

  return (
    <ExerciseComponent
      temaPeriodo={tema}
      temaPeriodoId={temaPeriodoId}
      studentPeriodo={sp}
      studentId={userId}
    />
  )
}
