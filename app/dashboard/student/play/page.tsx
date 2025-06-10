'use client'

import { useEffect, useState } from 'react'
import { useStudent } from '@/lib/hooks/useStudent'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

interface Tema {
  id: string
  tema: string
}

interface GameStats {
  totalSessions: number
  totalAnswers: number
  totalCorrect: number
  lastLevel: number
}

export default function PlayPage() {
  const { student, loading } = useStudent(true)
  const supabase = createClient()

  const [temas, setTemas] = useState<Tema[]>([])
  const [loadingTemas, setLoadingTemas] = useState(true)
  const [stats, setStats] = useState<GameStats | null>(null)
  const [grado, setGrado] = useState<number | null>(null)

  useEffect(() => {
    const fetchTemasAndStats = async () => {
      if (!student?.school_id || !student?.classroom_id) return

      // 1. Obtener periodo actual
      const { data: periodos } = await supabase
        .from('periodo')
        .select('id')
        .order('fecha_inicio', { ascending: false })
        .limit(1)

      const periodoId = periodos?.[0]?.id
      if (!periodoId) return

      // 2. Obtener grado desde classroom
      const { data: classroom, error: classroomError } = await supabase
        .from('classrooms')
        .select('grade')
        .eq('id', student.classroom_id)
        .single()

      if (!classroom || classroomError) {
        console.error('Error al obtener grado del salón', classroomError)
        return
      }

      setGrado(classroom.grade)

      // 3. Obtener temas según grado, school y periodo
      const { data: temasData, error: temasError } = await supabase
        .from('tema_periodo')
        .select('id, tema')
        .eq('school_id', student.school_id)
        .eq('grado', classroom.grade)
        .eq('periodo_id', periodoId)

      if (!temasError && temasData) setTemas(temasData)
      setLoadingTemas(false)

      // 4. Obtener estadísticas del estudiante
      const { data: sessions } = await supabase
        .from('game_sessions')
        .select('final_level, correct_answers, total_answers')
        .eq('student_id', student.id)

      if (sessions) {
        const totalSessions = sessions.length
        const totalAnswers = sessions.reduce((acc, s) => acc + (s.total_answers || 0), 0)
        const totalCorrect = sessions.reduce((acc, s) => acc + (s.correct_answers || 0), 0)
        const lastLevel = sessions[0]?.final_level || student.level

        setStats({
          totalSessions,
          totalAnswers,
          totalCorrect,
          lastLevel
        })
      }
    }

    fetchTemasAndStats()
  }, [student])

  if (loading || loadingTemas) {
    return <div className="p-6 text-foreground">Cargando...</div>
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      {/* 🔝 Resumen del estudiante */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold mb-2 text-primary">¡Hola, {student?.username}!</h1>
        <p className="text-muted-foreground">
          Nivel actual: <strong>{student?.level}</strong> | Grado: <strong>{grado ?? '-'}</strong>
        </p>
        {stats && (
          <div className="mt-4 text-sm text-muted-foreground space-y-1">
            <p>📊 Partidas jugadas: <strong>{stats.totalSessions}</strong></p>
            <p>✅ Respuestas correctas: <strong>{stats.totalCorrect}</strong> de {stats.totalAnswers}</p>
            <p>🎯 Último nivel alcanzado: <strong>{stats.lastLevel}</strong></p>
          </div>
        )}
      </div>

      {/* 🎮 Temas disponibles */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Elige un tema para jugar:</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {temas.length > 0 ? (
            temas.map((tema) => (
             <Link
  key={tema.id}
  href={`/dashboard/student/play/${tema.id}`}
  className="bg-card border border-border rounded-xl p-4 shadow hover:shadow-lg transition text-left block"
>
  <h3 className="text-lg font-semibold text-foreground">{tema.tema}</h3>
  <p className="text-sm text-muted-foreground mt-1">Haz clic para comenzar</p>
</Link>
            ))
          ) : (
            <p className="text-muted-foreground col-span-full text-center">No hay temas disponibles.</p>
          )}
        </div>
      </div>
    </div>
  )
}
