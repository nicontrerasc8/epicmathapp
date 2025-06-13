'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function PerformancePage() {
  const supabase = createClient()
  const params = useParams()
  const classroomId = params?.id as string

  const [students, setStudents] = useState<any>([])
  const [loading, setLoading] = useState<any>(true)
  const [showGraphs, setShowGraphs] = useState(true)

  useEffect(() => {
    if (!classroomId) return

    const fetchPerformance = async () => {
      const { data: studentList, error: studentError } = await supabase
        .from('students')
        .select('id, username')
        .eq('classroom_id', classroomId)

      if (studentError || !studentList) {
        console.error('Error al obtener estudiantes:', studentError)
        setLoading(false)
        return
      }

      const fullData = []

      for (const student of studentList) {
        const { data: registros, error } = await supabase
          .from('student_periodo')
          .select(`
            nivel,
            tema_periodo (
              tema
            )
          `)
          .eq('student_id', student.id)

        if (error) {
          console.error(`Error con estudiante ${student.id}:`, error)
          continue
        }

        const temas = (registros ?? []).map((r:any) => ({
          tema: r.tema_periodo?.tema || 'Desconocido',
          nivel: r.nivel,
        }))

        fullData.push({ ...student, temas })
      }

      setStudents(fullData)
      setLoading(false)
    }

    fetchPerformance()
  }, [classroomId, supabase])

  const getNivelColor = (nivel: number) => {
    switch (nivel) {
      case 3: return 'bg-green-100 text-green-800 border-green-200'
      case 2: return 'bg-accent text-accent-foreground border-accent/30'
      case 1: return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-muted text-muted-foreground border-muted'
    }
  }

  const getNivelEmoji = (nivel: number) => {
    switch (nivel) {
      case 3: return '🌟'
      case 2: return '⭐'
      case 1: return '💪'
      default: return '❓'
    }
  }

  const getNivelLabel = (nivel: number) => {
    switch (nivel) {
      case 3: return 'Avanzado'
      case 2: return 'Intermedio'
      case 1: return 'Básico'
      default: return 'N/A'
    }
  }

  // Calcular estadísticas por tema
  const getTopicStats = () => {
    const topicStats: { [key: string]: { nivel1: number, nivel2: number, nivel3: number, total: number } } = {}
    
    students.forEach((student: any) => {
      student.temas.forEach((tema: any) => {
        if (!topicStats[tema.tema]) {
          topicStats[tema.tema] = { nivel1: 0, nivel2: 0, nivel3: 0, total: 0 }
        }
        
        if (tema.nivel === 1) topicStats[tema.tema].nivel1++
        else if (tema.nivel === 2) topicStats[tema.tema].nivel2++
        else if (tema.nivel === 3) topicStats[tema.tema].nivel3++
        
        topicStats[tema.tema].total++
      })
    })
    
    return topicStats
  }

  const topicStats = getTopicStats()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-r-transparent mb-4"></div>
              <p className="text-lg font-medium text-muted-foreground">Cargando rendimientos...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-lg border border-white/20">
            <div className="text-4xl">📊</div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Rendimiento Estudiantil
              </h1>
              <p className="text-muted-foreground mt-1">Dashboard de progreso académico</p>
            </div>
          </div>
        </div>

        {/* Toggle Views */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 border border-white/20 shadow-lg">
            <button
              onClick={() => setShowGraphs(true)}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                showGraphs 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              📈 Estadísticas por Tema
            </button>
            <button
              onClick={() => setShowGraphs(false)}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                !showGraphs 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              👥 Vista por Estudiante
            </button>
          </div>
        </div>

        {students.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">No se encontraron estudiantes</h3>
            <p className="text-muted-foreground">Parece que no hay datos disponibles para este aula.</p>
          </div>
        ) : (
          <>
            {showGraphs ? (
              /* Vista de Gráficos por Tema */
              <div className="space-y-6">
                {Object.keys(topicStats).length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📚</div>
                    <h3 className="text-xl font-semibold text-muted-foreground mb-2">No hay temas registrados</h3>
                    <p className="text-muted-foreground">Los estudiantes aún no han completado ningún tema.</p>
                  </div>
                ) : (
                  Object.entries(topicStats).map(([tema, stats]) => {
                    const porcentajeNivel1 = Math.round((stats.nivel1 / stats.total) * 100)
                    const porcentajeNivel2 = Math.round((stats.nivel2 / stats.total) * 100)
                    const porcentajeNivel3 = Math.round((stats.nivel3 / stats.total) * 100)

                    return (
                      <div 
                        key={tema}
                        className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <div className="flex items-center gap-4 mb-6">
                          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xl">
                            📖
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-foreground">{tema}</h3>
                            <p className="text-muted-foreground">
                              {stats.total} {stats.total === 1 ? 'estudiante' : 'estudiantes'} evaluados
                            </p>
                          </div>
                        </div>

                        {/* Gráfico de Barras Horizontal */}
                        <div className="space-y-4">
                          {/* Nivel 3 - Avanzado */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">🌟</span>
                                <span className="font-medium text-green-800">Nivel 3 - Avanzado</span>
                              </div>
                              <span className="text-sm font-bold text-green-800">
                                {stats.nivel3} ({porcentajeNivel3}%)
                              </span>
                            </div>
                            <div className="w-full bg-green-50 rounded-full h-4 overflow-hidden border border-green-200">
                              <div 
                                className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-1000 ease-out rounded-full"
                                style={{ width: `${porcentajeNivel3}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Nivel 2 - Intermedio */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">⭐</span>
                                <span className="font-medium text-yellow-700">Nivel 2 - Intermedio</span>
                              </div>
                              <span className="text-sm font-bold text-yellow-700">
                                {stats.nivel2} ({porcentajeNivel2}%)
                              </span>
                            </div>
                            <div className="w-full bg-yellow-50 rounded-full h-4 overflow-hidden border border-yellow-200">
                              <div 
                                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all duration-1000 ease-out rounded-full"
                                style={{ width: `${porcentajeNivel2}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Nivel 1 - Básico */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">💪</span>
                                <span className="font-medium text-orange-800">Nivel 1 - Básico</span>
                              </div>
                              <span className="text-sm font-bold text-orange-800">
                                {stats.nivel1} ({porcentajeNivel1}%)
                              </span>
                            </div>
                            <div className="w-full bg-orange-50 rounded-full h-4 overflow-hidden border border-orange-200">
                              <div 
                                className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-1000 ease-out rounded-full"
                                style={{ width: `${porcentajeNivel1}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        {/* Resumen del tema */}
                        <div className="mt-6 p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border border-primary/10">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Distribución de niveles</span>
                            <span className="font-medium text-foreground">
                              Promedio: {((stats.nivel1 * 1 + stats.nivel2 * 2 + stats.nivel3 * 3) / stats.total).toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            ) : (
              /* Vista por Estudiante */
              <div className="grid gap-6">
                {students.map((student: any, index: number) => (
                  <div 
                    key={student.id} 
                    className="group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <div className="relative p-6">
                      {/* Student Header */}
                      <div className="flex items-center gap-4 mb-6">
                        <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xl font-bold shadow-lg">
                          {student.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                            {student.username}
                          </h2>
                          <p className="text-muted-foreground flex items-center gap-2">
                            <span className="text-lg">🎓</span>
                            {student.temas.length} {student.temas.length === 1 ? 'tema completado' : 'temas completados'}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Nivel Promedio</div>
                          <div className="text-2xl font-bold text-primary">
                            {student.temas.length > 0 
                              ? (student.temas.reduce((acc: number, tema: any) => acc + tema.nivel, 0) / student.temas.length).toFixed(1)
                              : 0
                            }
                          </div>
                        </div>
                      </div>

                      {/* Performance Grid */}
                      {student.temas.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {student.temas.map((tema: any, i: number) => (
                            <div 
                              key={i}
                              className="group/item p-4 rounded-xl border-2 bg-white/50 hover:bg-white/80 transition-all duration-200 hover:scale-105"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-foreground text-sm leading-tight">
                                  {tema.tema}
                                </h4>
                                <span className="text-lg flex-shrink-0 ml-2">
                                  {getNivelEmoji(tema.nivel)}
                                </span>
                              </div>
                              
                              <div className="flex justify-between items-center">
                                <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium border ${getNivelColor(tema.nivel)}`}>
                                  Nivel {tema.nivel}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {getNivelLabel(tema.nivel)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <div className="text-3xl mb-2">📚</div>
                          <p>Aún no hay temas registrados</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Stats Footer */}
        {students.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center">
              <div className="text-2xl mb-2">👥</div>
              <div className="text-2xl font-bold text-primary">{students.length}</div>
              <div className="text-sm text-muted-foreground">Estudiantes</div>
            </div>

            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center">
              <div className="text-2xl mb-2">📚</div>
              <div className="text-2xl font-bold text-accent-foreground">
                {Object.keys(topicStats).length}
              </div>
              <div className="text-sm text-muted-foreground">Temas Únicos</div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center">
              <div className="text-2xl mb-2">⭐</div>
              <div className="text-2xl font-bold text-green-600">
                {students.length > 0 && Object.keys(topicStats).length > 0
                  ? (
                      Object.values(topicStats).reduce((acc, stats) => 
                        acc + (stats.nivel1 * 1 + stats.nivel2 * 2 + stats.nivel3 * 3) / stats.total, 0
                      ) / Object.keys(topicStats).length
                    ).toFixed(1)
                  : '0'
                }
              </div>
              <div className="text-sm text-muted-foreground">Nivel Promedio</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}