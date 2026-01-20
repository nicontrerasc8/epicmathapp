'use client'

import { useEffect, useMemo, useState } from 'react'
import { useStudent } from '@/lib/hooks/useStudent'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

export default function StudentDashboard() {
  const { student, loading } = useStudent(false)
  const supabase = createClient()
  const [classroom, setClassroom] = useState<{ grade: string; section: string | null; academic_year: number } | null>(null)
  const [loadingClassroom, setLoadingClassroom] = useState(true)

  const displayName = useMemo(() => {
    if (!student) return 'Estudiante'
    return (
      student.first_name?.trim() ||
      student.last_name?.trim() ||
      student.email?.trim() ||
      'Estudiante'
    )
  }, [student])

  useEffect(() => {
    const loadClassroom = async () => {
      setLoadingClassroom(true)
      if (!student?.classroom_id) {
        setClassroom(null)
        setLoadingClassroom(false)
        return
      }

      const { data } = await supabase
        .from('edu_classrooms')
        .select('grade, section, academic_year')
        .eq('id', student.classroom_id)
        .maybeSingle()

      setClassroom((data as any) ?? null)
      setLoadingClassroom(false)
    }

    loadClassroom()
  }, [student?.classroom_id, supabase])

  if (loading || loadingClassroom) return <div className="text-white p-6">Cargando...</div>

  return (
    <div className="p-6 bg-background text-foreground flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-2 text-primary">
        Hola, {displayName}!
      </h1>
      {classroom ? (
        <p className="text-muted-foreground mb-6">
          Estas en el grado <strong>{classroom.grade}</strong>
          {classroom.section ? ` ${classroom.section}` : ''} del ano <strong>{classroom.academic_year}</strong>.
        </p>
      ) : (
        <p className="text-muted-foreground mb-6">
          Aun no tienes un aula asignada.
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-6">
        <Link href="/student/play" className="w-full sm:w-auto">
          <button className="w-full sm:w-auto bg-secondary text-white font-semibold px-6 py-3 rounded-xl hover:bg-secondary/90 transition">
            Jugar
          </button>
        </Link>
      </div>
    </div>
  )
}
