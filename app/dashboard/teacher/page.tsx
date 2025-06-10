'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface Classroom {
  id: string
  name: string
  grade: number
}

export default function TeacherDashboard() {
  const supabase = createClient()
  const router = useRouter()

  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchClassrooms = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user

      if (!user) return

      const { data, error } = await supabase
        .from('classrooms')
        .select('id, name, grade')
        .eq('teacher_id', user.id)

      if (!error && data) setClassrooms(data)
      setLoading(false)
    }

    fetchClassrooms()
  }, [])

  if (loading) {
    return <div className="min-h-screen p-6 bg-background text-foreground">Cargando clases...</div>
  }

  return (
    <div className="min-h-screen p-6 bg-background text-foreground">
      <h1 className="text-3xl font-bold mb-8 text-primary">Mis Clases</h1>

      {classrooms.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {classrooms.map((cls) => (
            <div
              key={cls.id}
              className="bg-card border border-border rounded-2xl shadow-md p-6 flex flex-col justify-between"
            >
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">{cls.name}</h2>
                <p className="text-muted-foreground mb-4">Grado {cls.grade}</p>
              </div>

              <button
                onClick={() => router.push(`/dashboard/teacher/classroom/${cls.id}`)}
                className="bg-primary text-white py-2 px-4 rounded-xl text-sm font-medium hover:bg-primary/90 transition"
              >
                ➡️ Ir al salón
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No tienes clases asignadas.</p>
      )}
    </div>
  )
}
