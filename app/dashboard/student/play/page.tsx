'use client'

import { useEffect, useState } from 'react'
import { useStudent } from '@/lib/hooks/useStudent'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { motion } from 'framer-motion' // Importamos motion para animaciones

interface Tema {
  id: string
  tema: string
}

export default function PlayPage() {
  const { student, loading } = useStudent(true)
  const supabase = createClient()

  const [temas, setTemas] = useState<Tema[]>([])
  const [loadingTemas, setLoadingTemas] = useState(true)
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
    }

    fetchTemasAndStats()
  }, [student])

  if (loading || loadingTemas) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary-foreground">
        <div className="text-2xl font-bold animate-pulse text-primary">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 flex flex-col items-center">
      {/* 🎉 Contenedor principal con fondo suave y centrado */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-4xl bg-card rounded-3xl shadow-xl p-8 md:p-10 lg:p-12 mt-8 mb-12 relative overflow-hidden border border-border"
      >
        {/* Elementos decorativos de fondo (usando colores del tema si se definen variantes pastel, o primarios/secundarios difuminados) */}
        {/* Si quieres colores pastel específicos, puedes agregarlos a tu tailwind.config.js o usar opacidades */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full opacity-60 animate-blob"></div>
        <div className="absolute -bottom-10 -left-10 w-52 h-52 bg-secondary/20 rounded-full opacity-60 animate-blob animation-delay-2000"></div>

        {/* 🔝 Resumen del estudiante */}
        <div className="mb-10 text-center relative z-10">
          <h1 className="text-4xl font-extrabold text-primary mb-3 drop-shadow-md">
            ¡Hola, <span className="text-secondary">{student?.nombres ? student.nombres.split(' ')[0] : student?.username}</span>!
          </h1>

        </div>

        {/* 🎮 Temas disponibles */}
        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-center text-primary mb-6 flex items-center justify-center gap-3">
            <span role="img" aria-label="joystick">🎮</span> Elige un tema para jugar <span role="img" aria-label="star">✨</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {temas.length > 0 ? (
              temas.map((tema) => (
                <motion.div
                  key={tema.id}
                  whileHover={{ scale: 1.05, rotate: 2 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 + temas.indexOf(tema) * 0.1 }}
                >
                  <Link
                    href={`/dashboard/student/play/${tema.id}`}
                    // Usamos tus colores primary y secondary para el degradado de las tarjetas
                    className="bg-gradient-to-br from-secondary to-primary text-primary-foreground rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform border border-primary/30 flex flex-col items-center justify-center text-center h-full"
                  >
                    <h3 className="text-2xl font-bold mb-2 tracking-wide">{tema.tema}</h3>
                    <p className="text-sm opacity-90 mt-1">¡Haz clic para comenzar esta aventura!</p>
                    <span className="text-5xl mt-3" role="img" aria-label="rocket">🚀</span>
                  </Link>
                </motion.div>
              ))
            ) : (
              <p className="text-muted-foreground col-span-full text-center py-8 text-xl">
                ¡Oops! Parece que no hay temas disponibles por ahora. Vuelve pronto para nuevas aventuras. 
                <span role="img" aria-label="sad face" className="ml-2">😢</span>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}