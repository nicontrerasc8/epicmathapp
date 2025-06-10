'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface Props {
  params: { id: string }
}

interface Classroom {
  id: string
  name: string
  grade: number
}

export default function ClassroomPage({ params }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { id } = params

  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchClassroom = async () => {
      const { data, error } = await supabase
        .from('classrooms')
        .select('id, name, grade')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error al traer la clase:', error)
      } else {
        setClassroom(data)
      }

      setLoading(false)
    }

    fetchClassroom()
  }, [id, supabase])

  if (loading) {
    return <div className="min-h-screen p-6 bg-background text-foreground">Cargando salón...</div>
  }

  if (!classroom) {
    return <div className="min-h-screen p-6 bg-background text-foreground">Salón no encontrado.</div>
  }

  return (
    <div className="p-6 bg-background text-foreground flex flex-col items-center justify-center gap-8">
      <h1 className="text-3xl font-bold text-primary">Salón {classroom.name}</h1>
      <p className="text-muted-foreground">Grado {classroom.grade}</p>

      <div className="flex flex-col sm:flex-row gap-6">
        <button
          onClick={() => router.push(`/dashboard/teacher/classroom/${id}/performance`)}
          className="bg-secondary text-white px-6 py-3 rounded-xl text-lg font-semibold hover:bg-secondary/90 transition"
        >
          📊 Ver rendimientos
        </button>

        <button
          onClick={() => router.push(`/dashboard/teacher/classroom/${id}/exams`)}
          className="bg-primary text-white px-6 py-3 rounded-xl text-lg font-semibold hover:bg-primary/90 transition"
        >
          📝 Manejar exámenes
        </button>
      </div>
    </div>
  )
}
