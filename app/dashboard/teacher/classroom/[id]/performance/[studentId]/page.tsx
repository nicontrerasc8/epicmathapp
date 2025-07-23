'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

const supabase = createClient()

export default function StudentPerformanceDetailPage() {
  const { classroomId, studentId } = useParams() as {
    classroomId: string
    studentId: string
  }

  const [resumen, setResumen] = useState({
    total: 0,
    correctos: 0,
    incorrectos: 0,
    tiempo_total: 0,
  })
  const [statsPorTema, setStatsPorTema] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId) return

    // Define a more specific type for the data coming directly from Supabase
    type StudentResponseData = {
      es_correcto: boolean
      tiempo_segundos: number
      // Supabase returns tema_periodo as an object with 'tema'
      tema_periodo: { tema: string } | null
    }

    const fetchData = async () => {
      const { data, error } = await supabase
        .from('student_responses')
        .select(`
          es_correcto,
          tiempo_segundos,
          tema_periodo:tema_periodo_id ( tema )
        `)
        .eq('student_id', studentId) as { data: StudentResponseData[] | null; error: any } // <--- Add this type assertion

      if (error) return console.error(error)
      if (!data) return // Handle case where data is null

      const total = data.length
      const correctos = data.filter(r => r.es_correcto).length
      const incorrectos = total - correctos
      const tiempo_total = data.reduce((acc, r) => acc + (r.tiempo_segundos || 0), 0)

      setResumen({ total, correctos, incorrectos, tiempo_total })

      const agrupado = {} as any // This 'any' is okay here for aggregation
      for (const r of data) {
        // Ensure tema_periodo and tema exist before accessing
        const tema = r.tema_periodo?.tema || 'Desconocido'

        if (!agrupado[tema]) {
          agrupado[tema] = {
            correctos: 0,
            incorrectos: 0,
            total: 0,
            tiempo_total: 0,
          }
        }
        agrupado[tema].total++
        agrupado[tema].tiempo_total += r.tiempo_segundos || 0
        if (r.es_correcto) agrupado[tema].correctos++
        else agrupado[tema].incorrectos++
      }

      setStatsPorTema(agrupado)
      setLoading(false)
    }

    fetchData()
  }, [studentId])

  const Card = ({
    icon,
    label,
    value,
    color = 'text-primary',
  }: {
    icon: string
    label: string
    value: number | string
    color?: string
  }) => (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center shadow">
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">
              📝 Detalle de Ejercicios
            </h1>
            <p className="text-muted-foreground text-sm">
              Rendimiento del estudiante por tema
            </p>
          </div>

        </div>

        {/* Resumen */}
        {loading ? (
          <div className="text-muted-foreground text-center py-12">Cargando datos...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <Card icon="📊" label="Ejercicios" value={resumen.total} />
              <Card icon="✅" label="Correctos" value={resumen.correctos} color="text-green-600" />
              <Card icon="❌" label="Incorrectos" value={resumen.incorrectos} color="text-red-500" />
              <Card icon="⏱️" label="Tiempo total (s)" value={resumen.tiempo_total} />
            </div>

            {/* Tabla por tema */}
            <div className="overflow-auto bg-white/70 backdrop-blur-sm rounded-xl border border-white/30 shadow-md">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">Tema</th>
                    <th className="px-6 py-4 text-center">Total</th>
                    <th className="px-6 py-4 text-center">Correctos</th>
                    <th className="px-6 py-4 text-center">Incorrectos</th>
                    <th className="px-6 py-4 text-center">Tiempo Promedio (s)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(statsPorTema).map(([tema, stats]: any, idx: number) => (
                    <tr
                      key={idx}
                      className="border-t hover:bg-accent/10 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-foreground">{tema}</td>
                      <td className="px-6 py-4 text-center">{stats.total}</td>
                      <td className="px-6 py-4 text-center text-green-700">{stats.correctos}</td>
                      <td className="px-6 py-4 text-center text-red-600">{stats.incorrectos}</td>
                      <td className="px-6 py-4 text-center">
                        {(stats.tiempo_total / stats.total).toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
