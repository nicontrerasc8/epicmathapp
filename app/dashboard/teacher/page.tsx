'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="animate-spin w-6 h-6 text-primary" />
        <span className="ml-3 text-lg">Cargando clases...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-background text-foreground">
      <h1 className="text-4xl font-bold text-primary mb-10">📚 Mis Clases</h1>

      {classrooms.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {classrooms.map((cls) => (
            <div
              key={cls.id}
              className="bg-card border border-border rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <h2 className="text-2xl font-semibold mb-2 text-foreground">{cls.name}</h2>
                <span className="inline-block bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  Grado {cls.grade}
                </span>
              </div>

              <button
                onClick={() => router.push(`/dashboard/teacher/classroom/${cls.id}/performance`)}
                className="mt-6 bg-primary text-white py-2 px-4 rounded-xl text-sm font-medium hover:bg-primary/90 transition-shadow shadow-sm hover:shadow-md"
              >
                👉 Ir al salón
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-lg">No tienes clases asignadas por ahora.</p>
      )}
    </div>
  )
}
