'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface Quiz {
  id: string
  title: string
  description: string
  created_at: string
}

export default function ExamsPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const classroomId = params?.id as string

  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchQuizzes = async () => {
      const { data, error } = await supabase
        .from('quizzes')
        .select('id, title, description, created_at')
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setQuizzes(data)
      }

      setLoading(false)
    }

    if (classroomId) {
      fetchQuizzes()
    }
  }, [classroomId, supabase])

  return (
    <div className="min-h-screen p-6 bg-background text-foreground">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary">Exámenes del salón</h1>
        <button
          onClick={() => router.push(`/dashboard/teacher/classroom/${classroomId}/exams/new`)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition"
        >
          ➕ Nuevo examen
        </button>
      </div>

      {loading ? (
        <p>Cargando exámenes...</p>
      ) : quizzes.length > 0 ? (
        <div className="space-y-4">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="bg-card border border-border rounded-lg p-4 shadow-sm"
            >
              <h2 className="text-lg font-semibold">{quiz.title}</h2>
              <p className="text-muted-foreground text-sm mb-2">
                {quiz.description}
              </p>
              <p className="text-xs text-muted-foreground">
                Creado el {new Date(quiz.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">Aún no hay exámenes creados.</p>
      )}
    </div>
  )
}
