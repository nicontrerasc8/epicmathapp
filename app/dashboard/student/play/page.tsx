'use client'

import { useEffect, useState } from 'react'
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
  const supabase = createClient()

  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [temas, setTemas] = useState<Tema[]>([])
  const [stats, setStats] = useState<Record<string, TemaStats>>({})
  const [loadingTemas, setLoadingTemas] = useState(true)

  // =========================
  // 1) Cargar estudiante
  // =========================
  useEffect(() => {
    const fetchStudent = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData?.user) {
        console.error('Usuario no autenticado', userError)
        setLoading(false)
        return
      }

      const userId = userData.user.id

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', userId) // ajustado a tu modelo, id = uid auth
        .single()

      if (studentError || !studentData) {
        console.error('No se encontró el estudiante vinculado a este usuario.', studentError)
        setLoading(false)
        return
      }

      setStudent(studentData)
      setLoading(false)
    }

    fetchStudent()
  }, [supabase])

  // =========================
  // 2) Cargar temas + stats
  // =========================
  useEffect(() => {
    const fetchTemasAndStats = async () => {
      if (!student?.school_id || !student?.classroom_id) return

      // 1️⃣ Periodo actual
      const { data: periodos, error: periodosError } = await supabase
        .from('periodo')
        .select('id')
        .order('fecha_inicio', { ascending: false })
        .limit(1)

      if (periodosError || !periodos?.[0]?.id) {
        console.error('Error al obtener periodo actual', periodosError)
        setLoadingTemas(false)
        return
      }

      const periodoId = periodos[0].id

      // 2️⃣ Grado del salón
      const { data: classroom, error: classroomError } = await supabase
        .from('classrooms')
        .select('grade')
        .eq('id', student.classroom_id)
        .single()

      if (classroomError || !classroom) {
        console.error('Error al obtener grado del salón', classroomError)
        setLoadingTemas(false)
        return
      }

      // 3️⃣ Temas del periodo + grado
      const { data: temasData, error: temasError } = await supabase
        .from('tema_periodo')
        .select('id, tema')
        .eq('school_id', student.school_id)
        .eq('grado', classroom.grade)
        .eq('periodo_id', periodoId)

      if (temasError) {
        console.error('Error al obtener temas', temasError)
        setTemas([])
        setStats({})
        setLoadingTemas(false)
        return
      }

      const temasList = (temasData ?? []) as Tema[]
      setTemas(temasList)

      const temaIds = temasList.map(t => t.id)
      if (temaIds.length === 0) {
        setStats({})
        setLoadingTemas(false)
        return
      }

      // 4️⃣ Historial del estudiante en student_responses
      //    AHORA usamos `accion` (1=correcto, 2=agotado) en vez de `es_correcto`
      const { data: resp, error: respError } = await supabase
        .from('student_responses')
        .select('tema_periodo_id, accion, created_at')
        .eq('student_id', student.id)
        .in('tema_periodo_id', temaIds)
        .order('created_at', { ascending: false })

      if (respError) {
        console.error('Error al obtener respuestas del estudiante', respError)
      }

      // 5️⃣ Niveles por tema (student_periodo)
      const { data: per, error: perError } = await supabase
        .from('student_periodo')
        .select('tema_periodo_id, nivel')
        .eq('student_id', student.id)
        .in('tema_periodo_id', temaIds)

      if (perError) {
        console.error('Error al obtener niveles del estudiante', perError)
      }

      const nivelMap = new Map<string, number>()
      ;(per ?? []).forEach(r => {
        // @ts-ignore
        nivelMap.set(r.tema_periodo_id, r.nivel ?? null)
      })

      // 6️⃣ Agregar stats por tema usando `accion`
      const agg: Record<string, TemaStats> = {}
      ;(resp ?? []).forEach(r => {
        const temaId = (r as any).tema_periodo_id as string
        if (!agg[temaId]) {
          agg[temaId] = {
            total: 0,
            correctos: 0,
            incorrectos: 0,
            ultimo: null,
            nivel: nivelMap.get(temaId) ?? null,
          }
        }

        agg[temaId].total += 1

        const accion = (r as any).accion
        if (accion === 1) agg[temaId].correctos += 1
        else agg[temaId].incorrectos += 1

        if (!agg[temaId].ultimo) {
          agg[temaId].ultimo = (r as any).created_at
        }
      })

      // Para temas sin intentos, crear stats vacíos
      temaIds.forEach(id => {
        if (!agg[id]) {
          agg[id] = {
            total: 0,
            correctos: 0,
            incorrectos: 0,
            ultimo: null,
            nivel: nivelMap.get(id) ?? null,
          }
        }
      })

      setStats(agg)
      setLoadingTemas(false)
    }

    if (student) fetchTemasAndStats()
  }, [student, supabase])

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

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-destructive">
        <div className="text-xl font-semibold">
          No se encontró información del estudiante 😞
        </div>
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
            ¡Hola,{' '}
            <span className="text-secondary">
              {student?.nombres?.split(' ')[0] || student?.username}
            </span>
            !
          </h1>
        </div>

        {/* Temas */}
        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-center text-primary mb-6 flex items-center justify-center gap-3">
            <span role="img" aria-label="joystick">
              🎮
            </span>
            Elige un tema para jugar
            <span role="img" aria-label="star">
              ✨
            </span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {temas.length > 0 ? (
              temas.map((tema, idx) => {
                const st =
                  stats[tema.id] ?? {
                    total: 0,
                    correctos: 0,
                    incorrectos: 0,
                    ultimo: null,
                    nivel: null,
                  }

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
                        <h3 className="text-2xl font-bold mb-2 tracking-wide">
                          {tema.tema}
                        </h3>
                        <p className="text-sm opacity-90">
                          ¡Haz clic para comenzar esta aventura!
                        </p>
                      </div>

                      {/* Historial resumido */}
                      <div className="mt-4 grid gap-2 text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md border bg-white/20">
                            Nivel {st.nivel ?? '—'}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md border bg白/20 bg-white/20">
                            Intentos: <b className="ml-1">{st.total}</b>
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md border bg-white/20">
                            ✅ <b className="ml-1">{st.correctos}</b> / ❌{' '}
                            <b className="ml-1">{st.incorrectos}</b>
                          </span>
                        </div>
                        <div className="text-xs opacity-90">
                          Último intento: <b>{fmtFecha(st.ultimo)}</b>
                        </div>
                      </div>

                      <span
                        className="absolute right-3 bottom-3 text-4xl"
                        role="img"
                        aria-label="rocket"
                      >
                        🚀
                      </span>
                    </Link>
                  </motion.div>
                )
              })
            ) : (
              <p className="text-muted-foreground col-span-full text-center py-8 text-xl">
                ¡Oops! Parece que no hay temas disponibles por ahora. Vuelve pronto para
                nuevas aventuras.
                <span role="img" aria-label="sad face" className="ml-2">
                  😢
                </span>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
