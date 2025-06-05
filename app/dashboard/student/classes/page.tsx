'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

interface Class {
  id: string
  name: string
  grade: number
}

interface Quiz {
  id: string
  title: string
  description: string
}

export default function StudentClassesPage() {
  const supabase = createClient()
  const [studentClass, setStudentClass] = useState<Class | null>(null)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = '/sign-in'
        return
      }

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('classroom_id')
        .eq('id', user.id)
        .single()

      if (studentError || !student?.classroom_id) {
        setLoading(false)
        return
      }

      const { data: classroom, error: classroomError } = await supabase
        .from('classrooms')
        .select('id, name, grade')
        .eq('id', student.classroom_id)
        .single()

      if (!classroomError && classroom) {
        setStudentClass({
          id: classroom.id,
          name: classroom.name,
          grade: classroom.grade
        })

        const { data: quizzesData, error: quizError } = await supabase
          .from('quizzes')
          .select('id, title, description')
          .eq('classroom_id', classroom.id)

        if (!quizError && quizzesData) {
          setQuizzes(quizzesData)
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return <div className="min-h-screen p-6 bg-background text-foreground">Cargando clase...</div>
  }

  return (
    <div className="min-h-screen p-6 bg-background text-foreground">
      <h1 className="text-2xl font-bold mb-6">Tu Clase</h1>

      {studentClass ? (
        <div className="border border-border rounded-lg p-6 bg-card shadow-md mb-8">
          <h2 className="text-2xl font-bold mb-2">{studentClass.name}</h2>
          <p className="text-md text-muted-foreground">
            Grado {studentClass.grade}
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground mb-8">No tienes una clase asignada aún.</p>
      )}

      {quizzes.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-2">Quizzes Disponibles</h2>
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="border border-border rounded-lg p-4 bg-muted shadow-sm">
              <h3 className="text-lg font-medium">{quiz.title}</h3>
              <p className="text-sm text-muted-foreground">{quiz.description}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No hay quizzes disponibles por ahora.</p>
      )}
    </div>
  )
}
