'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface Tema {
  id: string
  tema: string
}

interface Classroom {
  id: string
  grade: number
  school_id: string
}

export default function NewExamPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const classroomId = params?.id as string

  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [periodoId, setPeriodoId] = useState<string | null>(null)
  const [temas, setTemas] = useState<Tema[]>([])
  const [selectedTemaId, setSelectedTemaId] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const fetchClassroomAndTemas = async () => {
      // 1. Obtener classroom
      const { data: classroomData, error: classroomError } = await supabase
        .from('classrooms')
        .select('id, grade, school_id')
        .eq('id', classroomId)
        .single()

      if (classroomError || !classroomData) {
        console.error('Error al traer el classroom:', classroomError)
        setLoading(false)
        return
      }

      setClassroom(classroomData)

      // 2. Obtener periodo activo (último insertado por ahora)
      const { data: periodos } = await supabase
        .from('periodo')
        .select('id')
        .order('fecha_inicio', { ascending: false })
        .limit(1)

      const currentPeriodoId = periodos?.[0]?.id
      setPeriodoId(currentPeriodoId)

      // 3. Obtener temas válidos para ese grado, colegio y periodo
      const { data: temasData, error: temasError } = await supabase
        .from('tema_periodo')
        .select('id, tema')
        .eq('school_id', classroomData.school_id)
        .eq('grado', classroomData.grade)
        .eq('periodo_id', currentPeriodoId)

      if (temasError) {
        console.error('Error al traer temas:', temasError)
      } else {
        setTemas(temasData || [])
      }

      setLoading(false)
    }

    fetchClassroomAndTemas()
  }, [classroomId, supabase])

  const handleCreate = async () => {
    if (!selectedTemaId) return

    const tema = temas.find((t) => t.id === selectedTemaId)
    if (!tema) return

    const { error } = await supabase.from('quizzes').insert([
      {
        title: tema.tema,
        description: description,
        classroom_id: classroomId,
        grade_target: classroom?.grade,
      },
    ])

    if (error) {
      setMessage('❌ Error al crear examen')
    } else {
      setMessage('✅ Examen creado correctamente')
      setTimeout(() => {
        router.push(`/classroom/${classroomId}/exams`)
      }, 1500)
    }
  }

  if (loading) {
    return <div className="p-6">Cargando...</div>
  }

  return (
    <div className="min-h-screen p-6 bg-background text-foreground max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-primary">Nuevo Examen</h1>

      <div className="space-y-4">
        <label className="block">
          <span className="text-sm text-muted-foreground">Selecciona un tema</span>
          <select
            value={selectedTemaId}
            onChange={(e) => setSelectedTemaId(e.target.value)}
            className="w-full p-2 border border-border rounded-lg bg-input mt-1"
          >
            <option value="">-- Elige un tema --</option>
            {temas.map((tema) => (
              <option key={tema.id} value={tema.id}>
                {tema.tema}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm text-muted-foreground">Descripción del examen (opcional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border border-border rounded-lg bg-input mt-1"
          />
        </label>

        <button
          onClick={handleCreate}
          disabled={!selectedTemaId}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition"
        >
          ✅ Crear examen
        </button>

        {message && <p className="text-sm mt-2">{message}</p>}
      </div>
    </div>
  )
}
