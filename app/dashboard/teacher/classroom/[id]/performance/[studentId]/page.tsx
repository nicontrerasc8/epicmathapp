'use client'

import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import * as XLSX from 'xlsx'


const supabase = createClient()

type AnyRec = Record<string, any>

export default function StudentPerformanceDetailPage() {
  const { classroomId, studentId } = useParams() as any

  // ---- estado base
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [rows, setRows] = useState<any[]>([]) // todas las respuestas crudas del rango

  // ---- filtros
  const todayISO = new Date().toISOString().slice(0, 10)
  const sevenDaysAgoISO = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const [dateFrom, setDateFrom] = useState<string>(sevenDaysAgoISO)
  const [dateTo, setDateTo] = useState<string>(todayISO)
  const [temaFilter, setTemaFilter] = useState<string>('__ALL__')
  const [resultFilter, setResultFilter] = useState<'__ALL__' | 'true' | 'false'>('__ALL__')
  const [search, setSearch] = useState('')

  // ---- paginación intentos
  const [page, setPage] = useState(1)
  const pageSize = 15

  // ---- resumen rápido
  const resumen = useMemo(() => {
    const total = rows.length
    const correctos = rows.filter((r: AnyRec) => !!r.es_correcto).length
    const incorrectos = total - correctos
    const tiempo_total = rows.reduce((a: number, r: AnyRec) => a + (r.tiempo_segundos || 0), 0)
    const tiempo_prom = total ? tiempo_total / total : 0
    return { total, correctos, incorrectos, tiempo_total, tiempo_prom }
  }, [rows])

  // ---- opciones de tema
  const temasUnicos = useMemo(() => {
    const s = new Set<string>()
    rows.forEach((r: AnyRec) => s.add(r.tema || 'Desconocido'))
    return ['__ALL__', ...Array.from(s)]
  }, [rows])

  // ---- agregado por tema
  const statsPorTema = useMemo(() => {
    const agg: AnyRec = {}
    rows.forEach((r: AnyRec) => {
      const tema = r.tema || 'Desconocido'
      if (!agg[tema]) agg[tema] = { correctos: 0, incorrectos: 0, total: 0, tiempo_total: 0 }
      agg[tema].total++
      agg[tema].tiempo_total += r.tiempo_segundos || 0
      if (r.es_correcto) agg[tema].correctos++
      else agg[tema].incorrectos++
    })
    return agg
  }, [rows])

  // ---- timeline diario (conteo y aciertos)
  const timeline = useMemo(() => {
    // armar dias del rango
    const start = new Date(dateFrom)
    const end = new Date(dateTo)
    const days: string[] = []
    const d = new Date(start)
    while (d <= end) {
      days.push(d.toISOString().slice(0, 10))
      d.setDate(d.getDate() + 1)
    }
    const map: AnyRec = {}
    days.forEach((iso) => (map[iso] = { total: 0, correctos: 0 }))
    rows.forEach((r: AnyRec) => {
      const day = (r.created_at || '').slice(0, 10)
      if (!map[day]) map[day] = { total: 0, correctos: 0 }
      map[day].total += 1
      if (r.es_correcto) map[day].correctos += 1
    })
    return days.map((d) => ({ date: d, ...map[d] }))
  }, [rows, dateFrom, dateTo])

  // ---- filtrado para tabla de intentos
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r: AnyRec) => {
      const okTema = temaFilter === '__ALL__' || (r.tema || 'Desconocido') === temaFilter
      const okRes =
        resultFilter === '__ALL__' ||
        (resultFilter === 'true' && !!r.es_correcto) ||
        (resultFilter === 'false' && !r.es_correcto)
      const okSearch =
        q.length === 0 ||
        String(r.contexto || '')
          .toLowerCase()
          .includes(q)
      return okTema && okRes && okSearch
    })
  }, [rows, temaFilter, resultFilter, search])

  // ---- orden y paginación simple para recientes
  const recentSorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a: AnyRec, b: AnyRec) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return arr
  }, [filtered])

  const totalPages = Math.max(1, Math.ceil(recentSorted.length / pageSize))
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return recentSorted.slice(start, start + pageSize)
  }, [recentSorted, page])

  // ---- fetch
  useEffect(() => {
    if (!studentId) return
    const fetchData = async () => {
      setLoading(true)
      setErrorMsg(null)
      try {
        const fromISO = new Date(dateFrom + 'T00:00:00.000Z').toISOString()
        const toISO = new Date(dateTo + 'T23:59:59.999Z').toISOString()

        const { data, error } = await supabase
          .from('student_responses')
          .select(`
            es_correcto,
            tiempo_segundos,
            created_at,
            ejercicio_data,
            tema_periodo:tema_periodo_id ( tema )
          `)
          .eq('student_id', studentId)
          .gte('created_at', fromISO)
          .lte('created_at', toISO)

        if (error) throw error

        const norm = (data ?? []).map((r: AnyRec) => {
          const tema = Array.isArray(r.tema_periodo) ? r.tema_periodo?.[0]?.tema : r.tema_periodo?.tema
          return {
            ...r,
            tema: tema || 'Desconocido',
            contexto: r.ejercicio_data?.contexto || '',
          }
        })
        setRows(norm as any[])
        setPage(1)
      } catch (e: any) {
        setErrorMsg('No se pudieron cargar los datos.')
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [studentId, dateFrom, dateTo])

  // ---- exportar excel (detalle + resumen)
  const exportExcel = () => {
    // 1) Detalle
    const detalle = filtered.map((r: any) => ({
      fecha: new Date(r.created_at).toLocaleString(),
      tema: r.tema,
      correcto: r.es_correcto ? 'Sí' : 'No',
      tiempo_segundos: r.tiempo_segundos || 0,
      contexto: r.contexto || '',
    }))

    // 2) Resumen por tema
    const resumenTema = Object.entries(statsPorTema).map(([tema, s]: any) => ({
      tema,
      total: s.total,
      correctos: s.correctos,
      incorrectos: s.incorrectos,
      tiempo_promedio: s.total ? Number(s.tiempo_total / s.total).toFixed(1) : '0.0',
    }))

    const wb = XLSX.utils.book_new()
    const ws1 = XLSX.utils.json_to_sheet(detalle)
    const ws2 = XLSX.utils.json_to_sheet(resumenTema)
    XLSX.utils.book_append_sheet(wb, ws1, 'Detalle')
    XLSX.utils.book_append_sheet(wb, ws2, 'Resumen_tema')

    // anchos básicos
    ws1['!cols'] = [{ wch: 19 }, { wch: 22 }, { wch: 10 }, { wch: 16 }, { wch: 60 }]
    ws2['!cols'] = [{ wch: 22 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 16 }]

    // ✅ descarga sin file-saver
    try {
      XLSX.writeFile(wb, `reporte_estudiante_${studentId}.xlsx`)
    } catch {
      // fallback por si algún navegador bloquea writeFile
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte_estudiante_${studentId}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    }
  }


  // ---- UI helpers
  const Card = ({ icon, label, value, color = 'text-primary' }: AnyRec) => (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center shadow">
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  )

  const Skeleton = () => (
    <div className="animate-pulse grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white/60 rounded-2xl p-6 h-28" />
      ))}
    </div>
  )

  // ---- colores / badges
  const badge = (ok: boolean) =>
    ok
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-red-100 text-red-700 border-red-200'

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">📝 Detalle de ejercicios</h1>
            <p className="text-muted-foreground text-sm">Rendimiento del estudiante por tema</p>
          </div>
          <div className="flex gap-2">
            
            <button
              onClick={exportExcel}
              className="px-4 py-2 rounded-xl border bg-accent text-accent-foreground hover:brightness-105"
            >
              ⬇️ Exportar Excel
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 p-4 mb-6">
          <div className="grid md:grid-cols-5 gap-3">
            <div className="col-span-2 flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Desde</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  max={dateTo}
                  className="w-full px-3 py-2 rounded-lg border bg-white"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Hasta</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  min={dateFrom}
                  className="w-full px-3 py-2 rounded-lg border bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Tema</label>
              <select
                className="w-full px-3 py-2 rounded-lg border bg-white"
                value={temaFilter}
                onChange={(e) => setTemaFilter(e.target.value)}
              >
                {temasUnicos.map((t) => (
                  <option key={t} value={t}>
                    {t === '__ALL__' ? 'Todos' : t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Resultado</label>
              <select
                className="w-full px-3 py-2 rounded-lg border bg-white"
                value={resultFilter}
                onChange={(e) => setResultFilter(e.target.value as any)}
              >
                <option value="__ALL__">Todos</option>
                <option value="true">Correctos</option>
                <option value="false">Incorrectos</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Buscar en contexto</label>
              <input
                placeholder="pizza, libro…"
                className="w-full px-3 py-2 rounded-lg border bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* accesos rápidos */}
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              { label: '7 días', d: 6 },
              { label: '14 días', d: 13 },
              { label: '30 días', d: 29 },
            ].map((q) => (
              <button
                key={q.label}
                onClick={() => {
                  const to = new Date()
                  const from = new Date(Date.now() - q.d * 24 * 60 * 60 * 1000)
                  setDateTo(to.toISOString().slice(0, 10))
                  setDateFrom(from.toISOString().slice(0, 10))
                }}
                className="px-3 py-1.5 rounded-lg border bg-white hover:bg-input text-sm"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resumen */}
        {loading ? (
          <Skeleton />
        ) : errorMsg ? (
          <div className="text-center py-12 text-red-600">{errorMsg}</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <Card icon="📊" label="Ejercicios" value={resumen.total} />
              <Card icon="✅" label="Correctos" value={resumen.correctos} color="text-green-600" />
              <Card icon="❌" label="Incorrectos" value={resumen.incorrectos} color="text-red-500" />
              <Card icon="⏱️" label="Tiempo total (s)" value={resumen.tiempo_total} />
              <Card icon="⚖️" label="Tiempo promedio (s)" value={resumen.tiempo_prom.toFixed(1)} />
            </div>


            {/* Tabla por tema */}
            <div className="overflow-auto bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow mb-8">
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
                  {Object.entries(statsPorTema)
                    .sort((a: any, b: any) => b[1].total - a[1].total)
                    .map(([tema, s]: any, idx: number) => (
                      <tr key={idx} className="border-t hover:bg-accent/10 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">{tema}</td>
                        <td className="px-6 py-4 text-center">{s.total}</td>
                        <td className="px-6 py-4 text-center text-green-700">{s.correctos}</td>
                        <td className="px-6 py-4 text-center text-red-600">{s.incorrectos}</td>
                        <td className="px-6 py-4 text-center">
                          {s.total ? (s.tiempo_total / s.total).toFixed(1) : '0.0'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Intentos recientes */}
            <div className="bg-white/80 rounded-xl border border-white/20 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">Intentos recientes</h3>
                <div className="text-xs text-muted-foreground">
                  {recentSorted.length} resultados • página {page} de {totalPages}
                </div>
              </div>

              {pageRows.length === 0 ? (
                <div className="text-center text-muted-foreground py-6">No hay intentos que coincidan con los filtros.</div>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Tema</th>
                        <th className="px-4 py-3">Resultado</th>
                        <th className="px-4 py-3">Tiempo (s)</th>
                        <th className="px-4 py-3">Contexto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((r: AnyRec, i: number) => (
                        <tr key={i} className="border-t">
                          <td className="px-4 py-3">{new Date(r.created_at).toLocaleString()}</td>
                          <td className="px-4 py-3">{r.tema}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-md border text-xs ${badge(!!r.es_correcto)}`}>
                              {r.es_correcto ? 'Correcto' : 'Incorrecto'}
                            </span>
                          </td>
                          <td className="px-4 py-3">{r.tiempo_segundos ?? 0}</td>
                          {/* Celdas de contexto modificada */}
                          <td className="px-4 py-3 max-w-[440px] whitespace-normal">
                            {r.contexto || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* paginación */}
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border bg-white hover:bg-input disabled:opacity-50"
                  disabled={page <= 1}
                >
                  ← Anterior
                </button>
                <div className="text-xs text-muted-foreground">
                  Mostrando {pageRows.length} de {recentSorted.length}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border bg-white hover:bg-input disabled:opacity-50"
                  disabled={page >= totalPages}
                >
                  Siguiente →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
