'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import * as XLSX from 'xlsx'
import { motion, AnimatePresence } from 'framer-motion'

type AnyRec = Record<string, any>

const supabase = createClient()

// ---------- HELPERS DE LÓGICA ----------

// 1 = correcto, 2 = agotó intentos / fallo
function isAttemptCorrect(r: AnyRec) {
  if (r.accion === 1) return true
  if (r.accion === 2) return false
  // fallback para registros antiguos
  const data = r.respuesta
  return data?.resultado?.es_correcto === true
}

function isAttemptCompleted(r: AnyRec) {
  return r.accion === 1 || r.accion === 2
}

// ---------- COMPONENTE PRINCIPAL ----------

export default function PerformancePage() {
  const params = useParams() as any
  const classroomId = params?.id as string

  const [students, setStudents] = useState<any[]>([])
  const [periodos, setPeriodos] = useState<any[]>([])
  const [responses, setResponses] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [activeView, setActiveView] = useState<'overview' | 'students' | 'analytics'>('overview')

  // 🎮 GAMIFICACIÓN
  const [achievements, setAchievements] = useState<string[]>([])
  const [newAchievement, setNewAchievement] = useState<string | null>(null)

  // 🚨 ALERTAS
  const [studentsAtRisk, setStudentsAtRisk] = useState<any[]>([])

  // 📊 MÉTRICAS AVANZADAS (globales)
  const [avgResponseTime, setAvgResponseTime] = useState(0)
  const [completionRate, setCompletionRate] = useState(0)

  // FILTROS
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [temaFilter, setTemaFilter] = useState<string>('__ALL__')
  const [nivelFilter, setNivelFilter] = useState<string | '__ALL__'>('__ALL__')

  // =========================
  // 1) CARGA DE DATA
  // =========================
  useEffect(() => {
    if (!classroomId) return

    const fetchAll = async () => {
      setLoading(true)

      // Estudiantes del salón
      const { data: st, error: e1 } = await supabase
        .from('students')
        .select('id, nombres')
        .eq('classroom_id', classroomId)
        .order('nombres', { ascending: true })

      if (e1 || !st) {
        console.error('Error students', e1)
        setStudents([])
        setPeriodos([])
        setResponses([])
        setLoading(false)
        return
      }

      const studentsList = st as any[]
      const ids = studentsList.map(s => s.id)
      setStudents(studentsList)

      if (ids.length === 0) {
        setPeriodos([])
        setResponses([])
        setAvgResponseTime(0)
        setCompletionRate(0)
        setLoading(false)
        return
      }

      // Periodos (nivel por tema)
      const { data: perRaw, error: e2 } = await supabase
        .from('student_periodo')
        .select(`
          student_id,
          nivel,
          theta,
          aciertos,
          errores,
          streak,
          tema_periodo:tema_periodo_id ( tema )
        `)
        .in('student_id', ids)

      if (e2) console.error('Error student_periodo', e2)

      const per = (perRaw ?? []).map((r: AnyRec) => {
        let tp = r.tema_periodo
        if (Array.isArray(tp)) tp = tp[0] || null
        return {
          student_id: r.student_id,
          nivel: r.nivel,
          theta: r.theta ?? 0,
          aciertos: r.aciertos ?? 0,
          errores: r.errores ?? 0,
          streak: r.streak ?? 0,
          tema_periodo: tp ? { tema: tp.tema ?? 'Desconocido' } : null,
        }
      }) as any[]
      setPeriodos(per)

      // Respuestas completas
      const { data: resp, error: e3 } = await supabase
        .from('student_responses')
        .select('student_id, respuesta, tiempo_segundos, accion, created_at')
        .in('student_id', ids)
        .order('created_at', { ascending: false })

      if (e3) console.error('Error student_responses', e3)
      const respList = resp || []
      setResponses(respList)

      // Métricas globales
      if (respList.length > 0) {
        const avgTime =
          respList.reduce((sum, r) => sum + (r.tiempo_segundos || 0), 0) / respList.length
        setAvgResponseTime(avgTime)

        const completed = respList.filter(isAttemptCompleted).length
        setCompletionRate((completed / respList.length) * 100)
      } else {
        setAvgResponseTime(0)
        setCompletionRate(0)
      }

      setLoading(false)
    }

    fetchAll()

    const ch = supabase
      .channel('perf-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_periodo' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_responses' }, fetchAll)
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, [classroomId])

  // =========================
  // 2) MAPAS / MÉTRICAS
  // =========================
  const studentTemaMap = useMemo(() => {
    const map = new Map<string, any[]>()
    periodos.forEach((p: AnyRec) => {
      const arr = map.get(p.student_id) ?? []
      arr.push({
        tema: p.tema_periodo?.tema ?? 'Desconocido',
        nivel: p.nivel,
        theta: p.theta,
        aciertos: p.aciertos,
        errores: p.errores,
        streak: p.streak,
      })
      map.set(p.student_id, arr)
    })
    return map
  }, [periodos])

  const studentResponseMap = useMemo(() => {
    const map = new Map<string, any[]>()
    responses.forEach((r: AnyRec) => {
      const arr = map.get(r.student_id) ?? []
      arr.push(r)
      map.set(r.student_id, arr)
    })
    return map
  }, [responses])

  const studentsFull = useMemo(() => {
    return students.map((s: AnyRec) => {
      const temas = studentTemaMap.get(s.id) ?? []
      const studentResponses = studentResponseMap.get(s.id) ?? []

      const totalExercises = studentResponses.length
      const correctExercises = studentResponses.filter(isAttemptCorrect).length
      const incorrectExercises = totalExercises - correctExercises
      const successRate = totalExercises ? (correctExercises / totalExercises) * 100 : 0

      const nivelProm = temas.length
        ? temas.reduce((a: number, t: AnyRec) => a + (t.nivel || 0), 0) / temas.length
        : 0

      const thetaProm = temas.length
        ? temas.reduce((a: number, t: AnyRec) => a + (t.theta || 0), 0) / temas.length
        : 0

      const lastResponse = studentResponses[0]?.created_at || null

      const avgAttempts = studentResponses.length
        ? studentResponses.reduce((sum, r) => {
            // si en tu JSON guardas intentos_realizados, lo usamos tal cual;
            // si quieres "uno menos", aquí puedes restar 1, pero OJO con no dejarlo en 0 o negativo
            const intentos = r.respuesta?.progreso?.intentos_realizados ?? 1
            return sum + intentos
          }, 0) / studentResponses.length
        : 0

      const avgTime = studentResponses.length
        ? studentResponses.reduce((sum, r) => sum + (r.tiempo_segundos || 0), 0) /
          studentResponses.length
        : 0

      return {
        ...s,
        temas,
        totalExercises,
        correctExercises,
        incorrectExercises,
        successRate,
        nivelProm,
        thetaProm,
        lastResponse,
        avgAttempts,
        avgTime,
      }
    })
  }, [students, studentTemaMap, studentResponseMap])

  // 🚨 ANÁLISIS PREDICTIVO DE RIESGO
  useEffect(() => {
    const now = Date.now()
    const weekMs = 7 * 24 * 60 * 60 * 1000

    const atRisk = studentsFull
      .filter((s: AnyRec) => {
        const lowSuccess = s.totalExercises > 5 && s.successRate < 50
        const lowLevel = s.nivelProm < 1.5
        const inactive =
          !s.lastResponse || now - new Date(s.lastResponse).getTime() > weekMs
        const highAttempts = s.avgAttempts > 2.5
        return lowSuccess || lowLevel || inactive || highAttempts
      })
      .map((s: AnyRec) => {
        const reasons: string[] = []
        if (s.totalExercises > 5 && s.successRate < 50) reasons.push('Tasa de éxito baja')
        if (s.nivelProm < 1.5) reasons.push('Nivel promedio bajo')
        if (!s.lastResponse || now - new Date(s.lastResponse).getTime() > weekMs) {
          reasons.push('Inactividad prolongada')
        }
        if (s.avgAttempts > 2.5) reasons.push('Demasiados intentos por ejercicio')

        return { ...s, riskReasons: reasons }
      })

    setStudentsAtRisk(atRisk)
  }, [studentsFull])

  // 🎮 SISTEMA DE LOGROS
  useEffect(() => {
    const totalStudents = studentsFull.length
    if (!totalStudents) {
      setAchievements([])
      return
    }

    const advanced = studentsFull.filter(s => s.nivelProm >= 2.5).length
    const totalExercises = responses.length
    const avgSuccess =
      studentsFull.reduce((sum, s) => sum + s.successRate, 0) /
      Math.max(1, totalStudents)

    const next: string[] = []

    if (advanced >= totalStudents * 0.5) {
      next.push('🏆 ¡Maestro del Progreso! +50% en nivel avanzado')
    }
    if (totalStudents >= 20) {
      next.push('👥 ¡Aula Completa! 20+ estudiantes activos')
    }
    if (totalExercises >= 500) {
      next.push('⚡ ¡Ultra Productivo! 500+ ejercicios completados')
    }
    if (avgSuccess >= 75) {
      next.push('🎯 ¡Excelencia Académica! 75%+ de éxito promedio')
    }

    setAchievements(prev => {
      const merged = [...prev]
      for (const ach of next) {
        if (!merged.includes(ach)) {
          merged.push(ach)
          setNewAchievement(ach)
          setTimeout(() => setNewAchievement(null), 5000)
        }
      }
      return merged
    })
  }, [studentsFull, responses])

  // TEMAS / STATS
  const temasUnicos = useMemo(() => {
    const set = new Set<string>()
    periodos.forEach((p: AnyRec) => set.add(p.tema_periodo?.tema ?? 'Desconocido'))
    return ['__ALL__', ...Array.from(set)]
  }, [periodos])

  const topicStats = useMemo(() => {
    const stats: AnyRec = {}
    periodos.forEach((p: AnyRec) => {
      const tema = p.tema_periodo?.tema ?? 'Desconocido'
      if (!stats[tema]) {
        stats[tema] = {
          n1: 0,
          n2: 0,
          n3: 0,
          total: 0,
          totalTheta: 0,
          totalAciertos: 0,
          totalErrores: 0,
        }
      }
      if (p.nivel === 1) stats[tema].n1++
      if (p.nivel === 2) stats[tema].n2++
      if (p.nivel === 3) stats[tema].n3++
      stats[tema].total++
      stats[tema].totalTheta += p.theta || 0
      stats[tema].totalAciertos += p.aciertos || 0
      stats[tema].totalErrores += p.errores || 0
    })
    return stats
  }, [periodos])

  const filteredStudents = useMemo(() => {
    const ql = searchQuery.trim().toLowerCase()
    return studentsFull.filter((s: AnyRec) => {
      const matchQ =
        ql.length === 0 || (s.nombres ?? '').toLowerCase().includes(ql)
      const matchTema =
        temaFilter === '__ALL__' || s.temas.some((t: AnyRec) => t.tema === temaFilter)
      const matchNivel =
        nivelFilter === '__ALL__' ||
        s.temas.some((t: AnyRec) => String(t.nivel) === String(nivelFilter))
      return matchQ && matchTema && matchNivel
    })
  }, [studentsFull, searchQuery, temaFilter, nivelFilter])

  // 💡 RECOMENDACIONES POR ESTUDIANTE
  const getRecommendations = (student: AnyRec) => {
    const recs: string[] = []
    const now = Date.now()
    const weekMs = 7 * 24 * 60 * 60 * 1000

    if (student.nivelProm < 1.5) {
      const weakTopics = student.temas
        .filter((t: AnyRec) => t.nivel === 1)
        .map((t: AnyRec) => t.tema)
      if (weakTopics.length) {
        recs.push(`📚 Reforzar: ${weakTopics.slice(0, 2).join(', ')}`)
      }
    }

    if (!student.lastResponse || now - new Date(student.lastResponse).getTime() > weekMs) {
      recs.push('📧 Enviar recordatorio de actividad')
    }

    if (student.avgAttempts > 2.5) {
      recs.push('🎯 Revisar dificultad de ejercicios')
    }

    if (student.successRate < 50 && student.totalExercises > 5) {
      recs.push('👨‍🏫 Programar sesión de apoyo individual')
    }

    if (student.thetaProm < -0.5) {
      recs.push('💪 Asignar ejercicios de nivel básico')
    }

    return recs
  }

  // 📊 EXPORTAR A EXCEL
  const exportExcel = () => {
    const rows = studentsFull.flatMap((s: AnyRec) =>
      (s.temas.length
        ? s.temas
        : [{ tema: '',  aciertos: 0, errores: 0 }]
      ).map((t: AnyRec) => ({
        alumno: s.nombres,
        tema: t.tema,
     
       
        aciertos: t.aciertos || 0,
        errores: t.errores || 0,
        racha: t.streak || 0,
        ejercicios_totales: s.totalExercises,
        ejercicios_correctos: s.correctExercises,
        tasa_exito: `${s.successRate.toFixed(1)}%`,
        nivel_promedio: Number(s.nivelProm || 0).toFixed(2),
        intentos_promedio: s.avgAttempts.toFixed(1),
        tiempo_promedio_seg: s.avgTime.toFixed(1),
        ultimo_intento: s.lastResponse
          ? new Date(s.lastResponse).toLocaleString()
          : 'N/A',
        estado_riesgo: studentsAtRisk.some(sr => sr.id === s.id) ? 'EN RIESGO' : 'OK',
      }))
    )

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Rendimiento Completo')

    if (rows[0]) {
      ws['!cols'] = Object.keys(rows[0]).map(() => ({ wch: 18 }))
    }

    try {
      XLSX.writeFile(wb, `performance_${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch {
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `performance_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="inline-block w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"
            />
            <p className="text-lg font-semibold text-gray-700">Cargando datos...</p>
          </div>
        </div>
      </div>
    )
  }

  const topicsKeys = Object.keys(topicStats)
  const totalExercises = responses.length
  const avgSuccessRate =
    studentsFull.reduce((sum, s) => sum + s.successRate, 0) /
    Math.max(1, studentsFull.length)

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 🎮 NOTIFICACIÓN DE LOGRO */}
        <AnimatePresence>
          {newAchievement && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.9 }}
              className="fixed top-6 right-6 z-50 max-w-md"
            >
              <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl border-2 border-white">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🎉</div>
                  <div>
                    <div className="font-bold text-sm opacity-90">¡Nuevo Logro!</div>
                    <div className="font-black text-lg">{newAchievement}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl shadow-lg">
                  📊
                </div>
                <div>
                  <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Dashboard Docente
                  </h1>
                  <p className="text-gray-600 font-medium">
                    Análisis integral de rendimiento estudiantil
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <NavButton
                  label="📈 Vista General"
                  active={activeView === 'overview'}
                  onClick={() => setActiveView('overview')}
                />
                <NavButton
                  label="👥 Estudiantes"
                  active={activeView === 'students'}
                  onClick={() => setActiveView('students')}
                />
                <NavButton
                  label="🔬 Análisis"
                  active={activeView === 'analytics'}
                  onClick={() => setActiveView('analytics')}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={exportExcel}
                  className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg"
                >
                  ⬇️ Exportar Excel
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 🎮 LOGROS DESBLOQUEADOS */}
        {achievements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-3xl p-6 border-2 border-yellow-300 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl">🏆</div>
                <h3 className="text-2xl font-black text-gray-800">Logros Desbloqueados</h3>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {achievements.map((ach, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white p-4 rounded-2xl border-2 border-yellow-400 shadow-md"
                  >
                    <div className="text-sm font-bold text-gray-800">{ach}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

   

        {/* KPIS PRINCIPALES */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
        >
          <KPICard
            icon="👥"
            label="Estudiantes"
            value={students.length}
            gradient="from-blue-500 to-cyan-600"
          />
          <KPICard
            icon="📚"
            label="Temas"
            value={topicsKeys.length}
            gradient="from-purple-500 to-pink-600"
          />
          <KPICard
            icon="✅"
            label="Ejercicios"
            value={totalExercises}
            gradient="from-green-500 to-emerald-600"
          />
          <KPICard
            icon="🎯"
            label="Éxito Promedio"
            value={`${avgSuccessRate.toFixed(1)}%`}
            gradient="from-orange-500 to-red-600"
          />
          <KPICard
            icon="⏱️"
            label="Tiempo Promedio"
            value={`${avgResponseTime.toFixed(1)}s`}
            gradient="from-indigo-500 to-purple-600"
          />
        </motion.div>

        {/* CONTENIDO PRINCIPAL */}
        <AnimatePresence mode="wait">
          {/* VISTA GENERAL */}
          {activeView === 'overview' && (
            <OverviewView topicStats={topicStats} />
          )}

          {/* ESTUDIANTES */}
          {activeView === 'students' && (
            <StudentsView
              filteredStudents={filteredStudents}
              studentsAtRisk={studentsAtRisk}
              temasUnicos={temasUnicos}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              temaFilter={temaFilter}
              setTemaFilter={setTemaFilter}
              nivelFilter={nivelFilter}
              setNivelFilter={setNivelFilter}
              getRecommendations={getRecommendations}
            />
          )}

          {/* ANÁLISIS */}
          {activeView === 'analytics' && (
            <AnalyticsView
              periodos={periodos}
              topicStats={topicStats}
              avgResponseTime={avgResponseTime}
              completionRate={completionRate}
              studentsFull={studentsFull}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ---------- SUBCOMPONENTES UI ---------- */

function NavButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`px-6 py-3 rounded-xl font-semibold transition shadow-lg ${
        active
          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
          : 'bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      {label}
    </motion.button>
  )
}

function KPICard({ icon, label, value, gradient }: any) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -4 }}
      className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/50"
    >
      <div className="text-center">
        <div className="text-4xl mb-3">{icon}</div>
        <div
          className={`text-4xl font-black bg-gradient-to-r ${gradient} bg-clip-text text-transparent mb-2`}
        >
          {value}
        </div>
        <div className="text-sm text-gray-600 font-semibold">{label}</div>
      </div>
    </motion.div>
  )
}

function ProgressBar({ label, emoji, percentage, count, gradient, bgColor, borderColor }: any) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <span className="font-bold text-gray-800">{label}</span>
        </div>
        <span className="text-sm font-black text-gray-800">
          {count} ({percentage}%)
        </span>
      </div>
      <div
        className={`w-full ${bgColor} rounded-full h-4 overflow-hidden border-2 ${borderColor}`}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full bg-gradient-to-r ${gradient} relative overflow-hidden`}
        >
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent"
          />
        </motion.div>
      </div>
    </div>
  )
}

function getNivelEmoji(nivel: any) {
  return nivel === 3 ? '🌟' : nivel === 2 ? '⭐' : nivel === 1 ? '💪' : '❓'
}

function getNivelColor(nivel: any) {
  return nivel === 3
    ? 'bg-green-100 text-green-800 border-green-300'
    : nivel === 2
    ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
    : nivel === 1
    ? 'bg-orange-100 text-orange-800 border-orange-300'
    : 'bg-gray-100 text-gray-800 border-gray-300'
}

/* ---------- VISTAS ---------- */

function OverviewView({ topicStats }: { topicStats: AnyRec }) {
  const topicsKeys = Object.keys(topicStats)

  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      {topicsKeys.map((tema: string) => {
        const s: AnyRec = topicStats[tema]
        const p1 = Math.round((s.n1 / s.total) * 100)
        const p2 = Math.round((s.n2 / s.total) * 100)
        const p3 = Math.round((s.n3 / s.total) * 100)
        const prom = ((s.n1 * 1 + s.n2 * 2 + s.n3 * 3) / s.total).toFixed(1)
        const tasaExito =
          s.totalAciertos + s.totalErrores > 0
            ? ((s.totalAciertos / (s.totalAciertos + s.totalErrores)) * 100).toFixed(1)
            : '0'
        const hasGap = p1 > 50

        return (
          <motion.div
            key={tema}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            className={`bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border ${
              hasGap ? 'border-orange-300 ring-4 ring-orange-200' : 'border-white/50'
            }`}
          >
            <div className="flex items-center gap-6 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-3xl shadow-lg">
                📖
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-3xl font-black text-gray-800">{tema}</h3>
                  {hasGap && (
                    <span className="px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm rounded-full font-bold shadow-md">
                      ⚠️ Atención requerida
                    </span>
                  )}
                </div>
                <p className="text-gray-600 font-medium">
                  {s.total} {s.total === 1 ? 'estudiante' : 'estudiantes'} • Nivel promedio:{' '}
                  {prom}
                </p>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500 font-semibold mb-1">Tasa de éxito</div>
                <div className="text-4xl font-black bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                  {tasaExito}%
                </div>
              </div>
            </div>


            <div className="space-y-4">
              <ProgressBar
                label="Nivel 3 - Avanzado"
                emoji="🌟"
                percentage={p3}
                count={s.n3}
                gradient="from-green-400 to-emerald-600"
                bgColor="bg-green-50"
                borderColor="border-green-200"
              />
              <ProgressBar
                label="Nivel 2 - Intermedio"
                emoji="⭐"
                percentage={p2}
                count={s.n2}
                gradient="from-yellow-400 to-orange-500"
                bgColor="bg-yellow-50"
                borderColor="border-yellow-200"
              />
              <ProgressBar
                label="Nivel 1 - Básico"
                emoji="💪"
                percentage={p1}
                count={s.n1}
                gradient="from-orange-400 to-red-500"
                bgColor="bg-orange-50"
                borderColor="border-orange-200"
              />
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-black text-indigo-600">
                  {s.totalAciertos}
                </div>
                <div className="text-xs text-gray-500 font-semibold">Aciertos totales</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-red-600">{s.totalErrores}</div>
                <div className="text-xs text-gray-500 font-semibold">Errores totales</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-black text-purple-600">
                  {s.totalAciertos + s.totalErrores}
                </div>
                <div className="text-xs text-gray-500 font-semibold">Total intentos</div>
              </div>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

function StudentsView(props: {
  filteredStudents: AnyRec[]
  studentsAtRisk: AnyRec[]
  temasUnicos: string[]
  searchQuery: string
  setSearchQuery: (v: string) => void
  temaFilter: string
  setTemaFilter: (v: string) => void
  nivelFilter: string | '__ALL__'
  setNivelFilter: (v: string | '__ALL__') => void
  getRecommendations: (s: AnyRec) => string[]
}) {
  const {
    filteredStudents,
    studentsAtRisk,
    temasUnicos,
    searchQuery,
    setSearchQuery,
    temaFilter,
    setTemaFilter,
    nivelFilter,
    setNivelFilter,
    getRecommendations,
  } = props

  return (
    <motion.div
      key="students"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      {/* FILTROS */}
      <div className="mb-6 bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/50">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              🔍 Buscar estudiante
            </label>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Nombre del estudiante..."
              className="w-full px-4 py-3 rounded-xl bg-white border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              📚 Filtrar por tema
            </label>
            <select
              value={temaFilter}
              onChange={e => setTemaFilter(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition"
            >
              {temasUnicos.map(t => (
                <option key={t} value={t}>
                  {t === '__ALL__' ? 'Todos los temas' : t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              ⭐ Filtrar por nivel
            </label>
            <select
              value={String(nivelFilter)}
              onChange={e =>
                setNivelFilter(e.target.value === '__ALL__' ? '__ALL__' : e.target.value)
              }
              className="w-full px-4 py-3 rounded-xl bg-white border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition"
            >
              <option value="__ALL__">Todos los niveles</option>
              <option value="1">Nivel 1 - Básico</option>
              <option value="2">Nivel 2 - Intermedio</option>
              <option value="3">Nivel 3 - Avanzado</option>
            </select>
          </div>
        </div>
      </div>

      {/* LISTA DE ESTUDIANTES */}
      <div className="space-y-6">
        {filteredStudents.map((s: AnyRec) => {
          const isAtRisk = studentsAtRisk.some(sr => sr.id === s.id)
          const recommendations = getRecommendations(s)

          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              className={`relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border-2 overflow-hidden ${
                isAtRisk ? 'border-red-300 ring-4 ring-red-200' : 'border-white/50'
              }`}
            >
              {isAtRisk && (
                <div className="absolute top-6 right-6 z-10">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2"
                  >
                    <span>🚨</span>
                    <span>Requiere atención</span>
                  </motion.div>
                </div>
              )}

              <div className="p-8">
                <div className="flex items-center gap-6 mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center text-4xl font-black shadow-xl">
                    {(s.nombres || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-3xl font-black text-gray-800 mb-2">{s.nombres}</h2>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <span className="font-bold">📚</span> {s.temas.length} temas
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="font-bold">⭐</span> Nivel: {Number(s.nivelProm || 0).toFixed(1)}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="font-bold">✅</span> {s.correctExercises} correctos
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="font-bold">❌</span> {s.incorrectExercises} incorrectos
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="font-bold">📊</span> Éxito: {s.successRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* MÉTRICAS ADICIONALES */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 border-2 border-blue-200">
                    <div className="text-xs text-blue-600 font-bold mb-1">Ejercicios totales</div>
                    <div className="text-2xl font-black text-blue-700">{s.totalExercises}</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 border-2 border-purple-200">
                    <div className="text-xs text-purple-600 font-bold mb-1">
                      Intentos promedio
                    </div>
                    <div className="text-2xl font-black text-purple-700">
                      {s.avgAttempts.toFixed(1)}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border-2 border-green-200">
                    <div className="text-xs text-green-600 font-bold mb-1">
                      Tiempo promedio
                    </div>
                    <div className="text-2xl font-black text-green-700">
                      {s.avgTime.toFixed(1)}s
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-4 border-2 border-orange-200">
                    <div className="text-xs text-orange-600 font-bold mb-1">
                      Último intento
                    </div>
                    <div className="text-sm font-black text-orange-700">
                      {s.lastResponse ? new Date(s.lastResponse).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* RECOMENDACIONES */}
                {recommendations.length > 0 && (
                  <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
                    <div className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                      <span className="text-xl">💡</span>
                      <span>Acciones Recomendadas:</span>
                    </div>
                    <div className="space-y-2">
                      {recommendations.map((rec, i) => (
                        <div key={i} className="text-sm text-blue-700 flex items-start gap-2">
                          <span className="mt-0.5 font-bold">→</span>
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TEMAS DEL ESTUDIANTE */}
                {s.temas.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {s.temas
                      .sort((a: AnyRec, b: AnyRec) => String(a.tema).localeCompare(String(b.tema)))
                      .map((t: AnyRec, i: number) => (
                        <motion.button
                          key={i}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setTemaFilter(t.tema)
                            // cambiamos a overview para ver el tema destacado
                            // NOTE: aquí no tenemos setActiveView, eso está en el componente padre,
                            // así que esto sólo filtra; si quieres cambiar de vista desde aquí,
                            // pásale también setActiveView por props.
                          }}
                          className="text-left p-5 rounded-2xl bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 hover:border-indigo-300 hover:shadow-xl transition"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-bold text-gray-800 text-sm">{t.tema}</span>
                            <span className="text-2xl">{getNivelEmoji(t.nivel)}</span>
                          </div>
                          <div className="space-y-2">
                            <div
                              className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold border-2 ${getNivelColor(
                                t.nivel
                              )}`}
                            >
                              Nivel {t.nivel}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                             
                              <div>
                                <span className="text-gray-500">Racha:</span>
                                <span className="ml-1 font-bold text-gray-800">
                                  {t.streak || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📭</div>
                    <div className="font-semibold">Sin temas registrados aún</div>
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}

        {filteredStudents.length === 0 && (
          <div className="text-center py-16 bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-black text-gray-800 mb-2">
              No se encontraron estudiantes
            </h3>
            <p className="text-gray-600">Intenta ajustar los filtros de búsqueda</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function AnalyticsView(props: {
  periodos: AnyRec[]
  topicStats: AnyRec
  avgResponseTime: number
  completionRate: number
  studentsFull: AnyRec[]
}) {
  const { periodos, topicStats, avgResponseTime, completionRate, studentsFull } = props

  return (
    <motion.div
      key="analytics"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-6"
    >
      {/* ANÁLISIS GLOBAL */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50">
        <h3 className="text-3xl font-black text-gray-800 mb-6 flex items-center gap-3">
          <span>🔬</span>
          <span>Análisis Profundo de Rendimiento</span>
        </h3>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Distribución de niveles global */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
            <div className="font-bold text-purple-800 mb-4 text-lg">
              📊 Distribución de Niveles (Global)
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map(nivel => {
                const count = periodos.filter(p => p.nivel === nivel).length
                const percentage = periodos.length > 0 ? (count / periodos.length) * 100 : 0
                return (
                  <div key={nivel}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-700">
                        {getNivelEmoji(nivel)} Nivel {nivel}
                      </span>
                      <span className="text-sm font-bold text-purple-700">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-purple-100 rounded-full h-3 overflow-hidden border border-purple-300">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full bg-gradient-to-r ${
                          nivel === 3
                            ? 'from-green-400 to-emerald-600'
                            : nivel === 2
                            ? 'from-yellow-400 to-orange-500'
                            : 'from-orange-400 to-red-500'
                        }`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>


          {/* Tasa de éxito por tema */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
            <div className="font-bold text-green-800 mb-4 text-lg">✅ Tasa de Éxito por Tema</div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {Object.entries(topicStats)
                .sort((a: any, b: any) => {
                  const rateA = a[1].totalAciertos / (a[1].totalAciertos + a[1].totalErrores || 1)
                  const rateB = b[1].totalAciertos / (b[1].totalAciertos + b[1].totalErrores || 1)
                  return rateB - rateA
                })
                .map(([tema, stats]: any) => {
                  const rate =
                    stats.totalAciertos + stats.totalErrores > 0
                      ? (stats.totalAciertos / (stats.totalAciertos + stats.totalErrores)) * 100
                      : 0
                  return (
                    <div key={tema}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-700 truncate">
                          {tema}
                        </span>
                        <span className="text-sm font-bold text-green-700">
                          {rate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-green-100 rounded-full h-3 overflow-hidden border border-green-300">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${rate}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={`h-full bg-gradient-to-r ${
                            rate >= 75
                              ? 'from-green-400 to-emerald-600'
                              : rate >= 50
                              ? 'from-yellow-400 to-orange-500'
                              : 'from-orange-400 to-red-500'
                          }`}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Tendencias de tiempo */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200">
            <div className="font-bold text-orange-800 mb-4 text-lg">⏱️ Análisis de Tiempos</div>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">
                  Tiempo promedio por ejercicio
                </div>
                <div className="text-3xl font-black text-orange-700">
                  {avgResponseTime.toFixed(1)}s
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Tasa de completación</div>
                <div className="text-3xl font-black text-orange-700">
                  {completionRate.toFixed(1)}%
                </div>
              </div>
              <div className="pt-4 border-t border-orange-200">
                <div className="text-xs text-gray-600 mb-2">Estudiantes por velocidad:</div>
                <div className="space-y-1">
                  {[
                    { label: 'Rápidos (< 30s)', count: studentsFull.filter(s => s.avgTime < 30).length },
                    {
                      label: 'Moderados (30-60s)',
                      count: studentsFull.filter(s => s.avgTime >= 30 && s.avgTime < 60).length,
                    },
                    { label: 'Lentos (> 60s)', count: studentsFull.filter(s => s.avgTime >= 60).length },
                  ].map(({ label, count }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-gray-700">{label}</span>
                      <span className="font-bold text-orange-700">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOP ESTUDIANTES */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50">
        <h3 className="text-3xl font-black text-gray-800 mb-6 flex items-center gap-3">
          <span>🏆</span>
          <span>Top Estudiantes</span>
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          {studentsFull
            .slice()
            .sort((a, b) => b.successRate - a.successRate)
            .slice(0, 9)
            .map((s: AnyRec, index) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-5 rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 hover:shadow-xl transition"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-3xl font-black text-yellow-600">#{index + 1}</div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-800 text-sm truncate">
                      {s.nombres}
                    </div>
                    <div className="text-xs text-gray-600">
                      {s.successRate.toFixed(1)}% éxito
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white rounded-lg p-2 text-center">
                    <div className="font-bold text-green-600">{s.correctExercises}</div>
                    <div className="text-gray-500">Correctos</div>
                  </div>
                  <div className="bg-white rounded-lg p-2 text-center">
                    <div className="font-bold text-indigo-600">
                      {s.nivelProm.toFixed(1)}
                    </div>
                    <div className="text-gray-500">Nivel</div>
                  </div>
                </div>
              </motion.div>
            ))}
        </div>
      </div>
    </motion.div>
  )
}
