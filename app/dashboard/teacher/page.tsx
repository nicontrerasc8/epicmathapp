'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

interface Classroom {
  id: string
  name: string
  grade: number
}

interface QuizForm {
  [classroomId: string]: {
    title: string
    description: string
  }
}

const quizTopicsByGrade: Record<number, { title: string; description: string }[]> = {
  1: [
    {
      title: 'Construcción y comprensión del número hasta 100',
      description: 'Ejercicios sobre números del 1 al 100 y conteo básico.'
    },
    {
      title: 'Resolución de problemas con suma y resta',
      description: 'Problemas simples usando sumas y restas.'
    }
  ],
  2: [
    {
      title: 'Valor posicional en números hasta 1000',
      description: 'Reconocimiento de unidades, decenas y centenas.'
    },
    {
      title: 'Problemas con datos incompletos o de varios pasos',
      description: 'Suma y resta aplicadas en situaciones más complejas.'
    }
  ],
  3: [
    {
      title: 'Multiplicación y sus propiedades',
      description: 'Tablas, asociaciones y descomposición de factores.'
    },
    {
      title: 'Medición de tiempo, longitud, masa y capacidad',
      description: 'Problemas de unidades y estimación.'
    }
  ]
}

export default function TeacherDashboard() {
  const supabase = createClient()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [quizForms, setQuizForms] = useState<QuizForm>({})
  const [message, setMessage] = useState('')

  useEffect(() => {
    const fetchClassrooms = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = '/sign-in'
        return
      }

      const { data, error } = await supabase
        .from('classrooms')
        .select('id, name, grade')
        .eq('teacher_id', user.id)

      if (!error && data) {
        setClassrooms(data)

        const forms: QuizForm = {}
        data.forEach((cls) => {
          forms[cls.id] = { title: '', description: '' }
        })
        setQuizForms(forms)
      }

      setLoading(false)
    }

    fetchClassrooms()
  }, [])

  const handleCreateQuiz = async (classroom: Classroom) => {
    const form = quizForms[classroom.id]

    const { error } = await supabase.from('quizzes').insert([
      {
        title: form.title,
        description: form.description,
        grade_target: classroom.grade,
        classroom_id: classroom.id,
      }
    ])

    if (error) {
      setMessage('❌ Error al crear el quiz.')
    } else {
      setMessage(`✅ Quiz creado para la clase ${classroom.name}.`)
      setQuizForms((prev) => ({
        ...prev,
        [classroom.id]: { title: '', description: '' }
      }))
    }
  }

  if (loading) {
    return <div className="min-h-screen p-6 bg-background text-foreground">Cargando clases...</div>
  }

  return (
    <div className="min-h-screen p-6 bg-background text-foreground">
      <h1 className="text-2xl font-bold mb-6">Mis Clases</h1>

      {classrooms.length > 0 ? (
        <div className="space-y-8">
          {classrooms.map((cls) => (
            <div key={cls.id} className="bg-card border border-border p-6 rounded-lg shadow space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{cls.name}</h2>
                <p className="text-muted-foreground text-sm">Grado {cls.grade}</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-medium">Crear Quiz</h3>

                <select
                  value={quizForms[cls.id]?.title || ''}
                  onChange={(e) => {
                    const selected = quizTopicsByGrade[cls.grade]?.find(
                      (topic) => topic.title === e.target.value
                    )
                    if (selected) {
                      setQuizForms((prev) => ({
                        ...prev,
                        [cls.id]: {
                          title: selected.title,
                          description: selected.description
                        }
                      }))
                    }
                  }}
                  className="w-full p-2 border border-border rounded-lg bg-input"
                >
                  <option value="">Selecciona un tema</option>
                  {quizTopicsByGrade[cls.grade]?.map((topic) => (
                    <option key={topic.title} value={topic.title}>
                      {topic.title}
                    </option>
                  ))}
                </select>

                <textarea
                  readOnly
                  value={quizForms[cls.id]?.description || ''}
                  className="w-full p-2 border border-border rounded-lg bg-input"
                />

                <button
                  onClick={() => handleCreateQuiz(cls)}
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition"
                  disabled={!quizForms[cls.id]?.title}
                >
                  ➕ Crear Quiz
                </button>
              </div>
            </div>
          ))}
          {message && <p className="text-sm">{message}</p>}
        </div>
      ) : (
        <p className="text-muted-foreground">No tienes clases asignadas.</p>
      )}
    </div>
  )
}
