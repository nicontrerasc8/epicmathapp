'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import * as XLSX from 'xlsx'

type AnyRec = Record<string, any>

export default function PerformancePage() {
  const supabase = createClient()
  const params = useParams() as any
  const classroomId = params?.id as string

  // IMPORTANT: tipa los estados como any[]
  const [students, setStudents] = useState<any[]>([])
  const [periodos, setPeriodos] = useState<any[]>([])
  const [respAgg, setRespAgg] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [showGraphs, setShowGraphs] = useState<boolean>(true)

  // filtros
  const [q, setQ] = useState<string>('')
  const [temaFilter, setTemaFilter] = useState<string>('__ALL__')
  const [nivelFilter, setNivelFilter] = useState<string | '__ALL__'>('__ALL__')

  useEffect(() => {
    if (!classroomId) return

    const fetchAll = async () => {
      setLoading(true)

      const { data: st, error: e1 } = await supabase
        .from('students')
        .select('id, nombres')
        .eq('classroom_id', classroomId)
        .order('nombres', { ascending: true })

      if (e1 || !st) {
        console.error('Error students', e1)
        setStudents([])
        setPeriodos([])
        setRespAgg([])
        setLoading(false)
        return
      }

      const ids = (st as any[]).map((s: any) => s.id)
      setStudents(st as any[])

      if (ids.length === 0) {
        setPeriodos([])
        setRespAgg([])
        setLoading(false)
        return
      }

      const { data: perRaw, error: e2 } = await supabase
        .from('student_periodo')
        .select(`
          student_id,
          nivel,
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
          tema_periodo: tp ? { tema: tp.tema ?? 'Desconocido' } : null,
        }
      }) as any[]
      setPeriodos(per)

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: resp, error: e3 } = await supabase
        .from('student_responses')
        .select('student_id, es_correcto, created_at')
        .in('student_id', ids)
        .gte('created_at', sevenDaysAgo.toISOString())

      if (e3) console.error('Error student_responses', e3)

      const map = new Map<string, any>()
      ;(resp ?? []).forEach((r: AnyRec) => {
        const curr = map.get(r.student_id) ?? { student_id: r.student_id, correctos: 0, incorrectos: 0, ultimo: null }
        if (r.es_correcto) curr.correctos++
        else curr.incorrectos++
        if (!curr.ultimo || new Date(r.created_at) > new Date(curr.ultimo)) curr.ultimo = r.created_at
        map.set(r.student_id, curr)
      })

      setRespAgg(Array.from(map.values()) as any[])
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

  const getNivelColor = (nivel: any) =>
    nivel === 3 ? 'bg-green-100 text-green-800 border-green-200'
      : nivel === 2 ? 'bg-accent text-accent-foreground border-accent/30'
      : nivel === 1 ? 'bg-orange-100 text-orange-800 border-orange-200'
      : 'bg-muted text-muted-foreground border-muted'

  const getNivelEmoji = (nivel: any) => (nivel === 3 ? '🌟' : nivel === 2 ? '⭐' : nivel === 1 ? '💪' : '❓')
  const getNivelLabel = (nivel: any) => (nivel === 3 ? 'Avanzado' : nivel === 2 ? 'Intermedio' : nivel === 1 ? 'Básico' : 'N/A')

  const studentTemaMap = useMemo(() => {
    const map = new Map<string, any[]>()
    periodos.forEach((p: AnyRec) => {
      const arr = map.get(p.student_id) ?? []
      arr.push({ tema: p.tema_periodo?.tema ?? 'Desconocido', nivel: p.nivel })
      map.set(p.student_id, arr)
    })
    return map
  }, [periodos])

  const studentsFull = useMemo(() => {
    return students.map((s: AnyRec) => {
      const temas = studentTemaMap.get(s.id) ?? []
      const agg = respAgg.find((r: AnyRec) => r.student_id === s.id) ?? { correctos: 0, incorrectos: 0, ultimo: null }
      const nivelProm = temas.length ? (temas.reduce((a: number, t: AnyRec) => a + (t.nivel || 0), 0) / temas.length) : 0
      return { ...s, temas, ...agg, nivelProm }
    })
  }, [students, studentTemaMap, respAgg])

  const temasUnicos = useMemo(() => {
    const set = new Set<string>()
    periodos.forEach((p: AnyRec) => set.add(p.tema_periodo?.tema ?? 'Desconocido'))
    return ['__ALL__', ...Array.from(set)]
  }, [periodos])

  const topicStats = useMemo(() => {
    const stats: AnyRec = {}
    periodos.forEach((p: AnyRec) => {
      const tema = p.tema_periodo?.tema ?? 'Desconocido'
      if (!stats[tema]) stats[tema] = { n1: 0, n2: 0, n3: 0, total: 0 }
      if (p.nivel === 1) stats[tema].n1++
      if (p.nivel === 2) stats[tema].n2++
      if (p.nivel === 3) stats[tema].n3++
      stats[tema].total++
    })
    return stats
  }, [periodos])

  const filteredStudents = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return studentsFull.filter((s: AnyRec) => {
      const matchQ = ql.length === 0 || (s.nombres ?? '').toLowerCase().includes(ql)
      const matchTema = temaFilter === '__ALL__' || s.temas.some((t: AnyRec) => t.tema === temaFilter)
      const matchNivel = nivelFilter === '__ALL__' || s.temas.some((t: AnyRec) => String(t.nivel) === String(nivelFilter))
      return matchQ && matchTema && matchNivel
    })
  }, [studentsFull, q, temaFilter, nivelFilter])

  // ---------- Exportar a Excel (.xlsx) ----------
  const exportExcel = () => {
    const rows = studentsFull.flatMap((s: AnyRec) =>
      (s.temas.length ? s.temas : [{ tema: '', nivel: '' }]).map((t: AnyRec) => ({
        alumno: s.nombres,
        tema: t.tema,
        nivel: t.nivel,
        correctos_7d: s.correctos || 0,
        incorrectos_7d: s.incorrectos || 0,
        ultimo_intento: s.ultimo ? new Date(s.ultimo).toLocaleString() : '',
        nivel_promedio: Number(s.nivelProm || 0).toFixed(2),
      }))
    )

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Rendimiento')

    const header = Object.keys(rows[0] || { a: '' })
    ws['!cols'] = header.map(() => ({ wch: 18 }))

    // ✅ descarga sin file-saver
    try {
      XLSX.writeFile(wb, 'performance.xlsx')
    } catch {
      // Fallback manual
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'performance.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-r-transparent mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Cargando rendimientos...</p>
          </div>
        </div>
      </div>
    )
  }

  const topicsKeys = Object.keys(topicStats)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 p-6">
      <div className="max-w-7xl mx-auto">
        {/* header + toolbar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-lg border border-white/20">
            <div className="text-4xl">📊</div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Rendimiento Estudiantil
              </h1>
              <p className="text-muted-foreground mt-1">Dashboard de progreso académico</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowGraphs(true)} className={`px-4 py-2 rounded-xl border ${showGraphs ? 'bg-primary text-white' : 'bg-white/80 text-foreground hover:bg-white'} transition`}>📈 Estadísticas por Tema</button>
            <button onClick={() => setShowGraphs(false)} className={`px-4 py-2 rounded-xl border ${!showGraphs ? 'bg-primary text-white' : 'bg-white/80 text-foreground hover:bg-white'} transition`}>👥 Vista por Estudiante</button>
            <button onClick={exportExcel} className="px-4 py-2 rounded-xl border bg-accent text-accent-foreground hover:brightness-105 transition">⬇️ Exportar Excel</button>
          </div>
        </div>

        {!showGraphs && (
          <div className="mb-6 grid gap-3 md:grid-cols-3">
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar estudiante..." className="w-full px-4 py-3 rounded-xl bg-white border border-border focus:outline-none focus:ring-2 focus:ring-ring" />
            <select value={temaFilter} onChange={e => setTemaFilter(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border border-border focus:outline-none focus:ring-2 focus:ring-ring">
              {temasUnicos.map(t => <option key={t} value={t}>{t === '__ALL__' ? 'Todos los temas' : t}</option>)}
            </select>
            <select value={String(nivelFilter)} onChange={e => setNivelFilter(e.target.value === '__ALL__' ? '__ALL__' : e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border border-border focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="__ALL__">Todos los niveles</option>
              <option value="1">Nivel 1 - Básico</option>
              <option value="2">Nivel 2 - Intermedio</option>
              <option value="3">Nivel 3 - Avanzado</option>
            </select>
          </div>
        )}
          {students.length > 0 && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPI icon="👥" label="Estudiantes" value={students.length} />
            <KPI icon="📚" label="Temas únicos" value={topicsKeys.length} />
            <KPI
              icon="⭐"
              label="Nivel promedio (global)"
              value={
                topicsKeys.length
                  ? (
                      topicsKeys.reduce((acc: number, k: string) => {
                        const s: AnyRec = (topicStats as AnyRec)[k]
                        return acc + (s.n1 * 1 + s.n2 * 2 + s.n3 * 3) / s.total
                      }, 0) / topicsKeys.length
                    ).toFixed(1)
                  : '0'
              }
            />
            <KPI icon="⚡" label="Intentos 7 días" value={respAgg.reduce((a: number, r: AnyRec) => a + (r.correctos || 0) + (r.incorrectos || 0), 0)} />
          </div>
        )}

        {/* contenido */}
        {students.length === 0 ? (
          <EmptyState title="No se encontraron estudiantes" icon="🔍" subtitle="Parece que no hay datos disponibles para este aula." />
        ) : showGraphs ? (
          topicsKeys.length === 0 ? (
            <EmptyState title="No hay temas registrados" icon="📚" subtitle="Los estudiantes aún no han completado ningún tema." />
          ) : (
            <div className="space-y-6">
              {topicsKeys.map((tema: string) => {
                const s: AnyRec = (topicStats as AnyRec)[tema]
                const p1 = Math.round((s.n1 / s.total) * 100)
                const p2 = Math.round((s.n2 / s.total) * 100)
                const p3 = Math.round((s.n3 / s.total) * 100)
                const prom = ((s.n1 * 1 + s.n2 * 2 + s.n3 * 3) / s.total).toFixed(1)
                return (
                  <div key={tema} className="bg-white/80 rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary text-white grid place-items-center text-xl">📖</div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-foreground">{tema}</h3>
                        <p className="text-muted-foreground">{s.total} {s.total === 1 ? 'estudiante' : 'estudiantes'} evaluados</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Nivel promedio</div>
                        <div className="text-2xl font-semibold text-primary">{prom}</div>
                      </div>
                    </div>
                    <BarRow label="Nivel 3 - Avanzado" emoji="🌟" color="from-green-400 to-green-600" bg="bg-green-50 border-green-200" value={p3} count={s.n3} />
                    <BarRow label="Nivel 2 - Intermedio" emoji="⭐" color="from-yellow-400 to-yellow-600" bg="bg-yellow-50 border-yellow-200" value={p2} count={s.n2} />
                    <BarRow label="Nivel 1 - Básico" emoji="💪" color="from-orange-400 to-orange-600" bg="bg-orange-50 border-orange-200" value={p1} count={s.n1} />
                  </div>
                )
              })}
            </div>
          )
        ) : (
          <div className="grid gap-6">
            {filteredStudents.map((s: AnyRec) => (
              <div key={s.id} className="relative overflow-hidden rounded-2xl bg-white/80 border border-white/20 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition">
                <div className="relative p-6">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white grid place-items-center text-xl font-bold">
                      {(s.nombres || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold">{s.nombres}</h2>
                      <div className="text-sm text-muted-foreground flex gap-3 flex-wrap">
                        <span>Temas: <b>{s.temas.length}</b></span>
                        <span>Promedio: <b className="text-primary">{Number(s.nivelProm || 0).toFixed(1)}</b></span>
                        <span>7d ✅ <b className="text-green-600">{s.correctos || 0}</b> / ❌ <b className="text-red-600">{s.incorrectos || 0}</b></span>
                        {s.ultimo && <span>Último: {new Date(s.ultimo).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <Link href={`/dashboard/teacher/classroom/${classroomId}/performance/${s.id}`} className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90">
                      Ver detalle →
                    </Link>
                  </div>

                  {s.temas.length ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {s.temas.sort((a: AnyRec, b: AnyRec) => String(a.tema).localeCompare(String(b.tema))).map((t: AnyRec, i: number) => (
                        <button
                          key={i}
                          onClick={() => { setTemaFilter(t.tema); setShowGraphs(false) }}
                          className="text-left p-4 rounded-xl border-2 bg-white/60 hover:bg-white transition"
                          title="Filtrar por este tema"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm">{t.tema}</span>
                            <span className="text-lg">{getNivelEmoji(t.nivel)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium border ${getNivelColor(t.nivel)}`}>
                              Nivel {t.nivel}
                            </span>
                            <span className="text-xs text-muted-foreground">{getNivelLabel(t.nivel)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">Aún no hay temas registrados</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      
      </div>
    </div>
  )
}

/* ---------- Subcomponentes ---------- */

function EmptyState({ title, subtitle, icon }: AnyRec) {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-3">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-muted-foreground">{subtitle}</p>
    </div>
  )
}

function KPI({ icon, label, value }: AnyRec) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  )
}

function BarRow({ label, emoji, value, count, color, bg }: AnyRec) {
  return (
    <div className="space-y-2 mb-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <span className="font-medium text-foreground">{label}</span>
        </div>
        <span className="text-sm font-bold text-foreground">
          {count} ({value}%)
        </span>
      </div>
      <div className={`w-full ${bg} rounded-full h-4 overflow-hidden border`}>
        <div className={`h-full bg-gradient-to-r ${color} transition-all duration-700 ease-out rounded-full`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}
