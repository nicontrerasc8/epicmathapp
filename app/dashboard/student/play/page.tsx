'use client'

import { useEffect, useState, useMemo } from 'react'
import { useStudent } from '@/lib/hooks/useStudent'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface Tema {
  id: string
  tema: string
}

type TemaStats = {
  total: number
  correctos: number
  incorrectos: number
  ultimo?: string | null
  nivel?: number | null
}

export default function PlayPage() {
  const { student, loading } = useStudent(true)
  const supabase = createClient()

  const [temas, setTemas] = useState<Tema[]>([])
  const [stats, setStats] = useState<Record<string, TemaStats>>({})
  const [loadingTemas, setLoadingTemas] = useState(true)
  const [grado, setGrado] = useState<number | null>(null)

  useEffect(() => {
    const fetchTemasAndStats = async () => {
      if (!student?.school_id || !student?.classroom_id) return

      // 1) Periodo actual
      const { data: periodos } = await supabase
        .from('periodo')
        .select('id')
        .order('fecha_inicio', { ascending: false })
        .limit(1)

      const periodoId = periodos?.[0]?.id
      if (!periodoId) return

      // 2) Grado del salón
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

      // 3) Temas para school + grado + periodo
      const { data: temasData, error: temasError } = await supabase
        .from('tema_periodo')
        .select('id, tema')
        .eq('school_id', student.school_id)
        .eq('grado', classroom.grade)
        .eq('periodo_id', periodoId)

      if (temasError) {
        setTemas([])
        setLoadingTemas(false)
        return
      }

      const temasList = (temasData ?? []) as Tema[]
      setTemas(temasList)

      // 4) Historial por tema para el alumno (intentos + último + correctos)
      const temaIds = temasList.map(t => t.id)
      if (temaIds.length === 0) {
        setStats({})
        setLoadingTemas(false)
        return
      }

      // Respuestas del alumno por esos temas
      const { data: resp } = await supabase
        .from('student_responses')
        .select('tema_periodo_id, es_correcto, created_at')
        .eq('student_id', student.id)
        .in('tema_periodo_id', temaIds)
        .order('created_at', { ascending: false })

      // Nivel actual por tema (si existe)
      const { data: per } = await supabase
        .from('student_periodo')
        .select('tema_periodo_id, nivel')
        .eq('student_id', student.id)
        .in('tema_periodo_id', temaIds)

      const nivelMap = new Map<string, number>()
      ;(per ?? []).forEach(r => {
        // @ts-ignore
        nivelMap.set(r.tema_periodo_id, r.nivel ?? null)
      })

      const agg: Record<string, TemaStats> = {}
      ;(resp ?? []).forEach(r => {
        const k = (r as any).tema_periodo_id as string
        if (!agg[k]) agg[k] = { total: 0, correctos: 0, incorrectos: 0, ultimo: null, nivel: nivelMap.get(k) ?? null }
        agg[k].total += 1
        if ((r as any).es_correcto) agg[k].correctos += 1
        else agg[k].incorrectos += 1
        // primer loop viene en orden desc → el primero es el último intento
        if (!agg[k].ultimo) agg[k].ultimo = (r as any).created_at
      })

      // completa niveles en temas sin respuestas
      temaIds.forEach(id => {
        if (!agg[id]) agg[id] = { total: 0, correctos: 0, incorrectos: 0, ultimo: null, nivel: nivelMap.get(id) ?? null }
      })

      setStats(agg)
      setLoadingTemas(false)
    }

    fetchTemasAndStats()
  }, [student]) // eslint-disable-line react-hooks/exhaustive-deps

  const fmtFecha = (iso?: string | null) => {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleDateString()
    } catch {
      return '—'
    }
  }

  if (loading || loadingTemas) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary-foreground">
        <div className="text-2xl font-bold animate-pulse text-primary">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-4xl bg-card rounded-3xl shadow-xl p-8 md:p-10 lg:p-12 mt-8 mb-12 relative overflow-hidden border border-border"
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full opacity-60 animate-blob"></div>
        <div className="absolute -bottom-10 -left-10 w-52 h-52 bg-secondary/20 rounded-full opacity-60 animate-blob animation-delay-2000"></div>

        {/* Resumen del estudiante */}
        <div className="mb-10 text-center relative z-10">
          <h1 className="text-4xl font-extrabold text-primary mb-3 drop-shadow-md">
            ¡Hola, <span className="text-secondary">{student?.nombres ? student.nombres.split(' ')[0] : student?.username}</span>!
          </h1>
        </div>

        {/* Temas disponibles con historial corto por tarjeta */}
        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-center text-primary mb-6 flex items-center justify-center gap-3">
            <span role="img" aria-label="joystick">🎮</span> Elige un tema para jugar <span role="img" aria-label="star">✨</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {temas.length > 0 ? (
              temas.map((tema, idx) => {
                const st = stats[tema.id] ?? { total: 0, correctos: 0, incorrectos: 0, ultimo: null, nivel: null }
                return (
                  <motion.div
                    key={tema.id}
                    whileHover={{ scale: 1.05, rotate: 2 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 + idx * 0.08 }}
                  >
                    <Link
                      href={`/dashboard/student/play/${tema.id}`}
                      className="relative bg-gradient-to-br from-secondary to-primary text-primary-foreground rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform border border-primary/30 flex flex-col justify-between h-full"
                    >
                      <div>
                        <h3 className="text-2xl font-bold mb-2 tracking-wide">{tema.tema}</h3>
                        <p className="text-sm opacity-90">¡Haz clic para comenzar esta aventura!</p>
                      </div>

                      {/* Historial resumido */}
                      <div className="mt-4 grid gap-2 text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md border bg-white/20">
                            Nivel {st.nivel ?? '—'}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md border bg-white/20">
                            Intentos: <b className="ml-1">{st.total}</b>
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md border bg-white/20">
                            ✅ <b className="ml-1">{st.correctos}</b> / ❌ <b className="ml-1">{st.incorrectos}</b>
                          </span>
                        </div>
                        <div className="text-xs opacity-90">
                          Último intento: <b>{fmtFecha(st.ultimo)}</b>
                        </div>
                      </div>

                      <span className="absolute right-3 bottom-3 text-4xl" role="img" aria-label="rocket">🚀</span>
                    </Link>
                  </motion.div>
                )
              })
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
