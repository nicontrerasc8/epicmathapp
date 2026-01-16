'use client'

import { useEffect, useState } from 'react'
import { useStudent } from '@/lib/hooks/useStudent'
import { createClient } from '@/utils/supabase/client'

interface Quiz {
  id: string
  title: string
  description: string
  created_at: string
}

export default function StudentExamsPage() {
  const { student, loading } = useStudent(false)
  const supabase = createClient()

  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loadingQuizzes, setLoadingQuizzes] = useState(true)

  useEffect(() => {
    const fetchQuizzes = async () => {
      if (!student?.classroom_id) return

      const { data, error } = await supabase
        .from('quizzes')
        .select('id, title, description, created_at')
        .eq('classroom_id', student.classroom_id)
        .order('created_at', { ascending: false })

      if (!error && data) setQuizzes(data)
      setLoadingQuizzes(false)
    }

    if (student?.classroom_id) {
      fetchQuizzes()
    }
  }, [student, supabase])

  if (loading || loadingQuizzes) {
    return <div className="p-6 text-foreground">Cargando exámenes...</div>
  }

  return (
    <div className="min-h-screen p-6 bg-background text-foreground">
      <h1 className="text-2xl font-bold mb-6 text-primary">📝 Mis exámenes</h1>

      {quizzes.length > 0 ? (
        <div className="space-y-4">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="bg-card border border-border rounded-xl p-4 shadow-sm"
            >
              <h2 className="text-lg font-semibold">{quiz.title}</h2>
              <p className="text-muted-foreground text-sm mb-2">
                {quiz.description}
              </p>
              <p className="text-xs text-muted-foreground">
                Creado el {new Date(quiz.created_at).toLocaleDateString()}
              </p>
              <button
                className="mt-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition"
                onClick={() =>
                  window.location.href = `/dashboard/student/exams/${quiz.id}`
                }
              >
                📖 Resolver
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground space-y-4">
          <p className="text-lg">📭 No tienes exámenes asignados por el momento.</p>
          <button
            onClick={() => window.location.href = '/dashboard/student'}
            className="bg-secondary text-white px-4 py-2 rounded-lg hover:bg-secondary/90 transition"
          >
            ⬅️ Volver al menú
          </button>
        </div>
      )}
    </div>
  )
}
