'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

type AnyRec = Record<string, any>

export default function PerformancePage() {
  const supabase = createClient()
  const params = useParams() as any
  const classroomId = params?.id as string

  const [classroomInfo, setClassroomInfo] = useState<any>(null)

  // base
  const [students, setStudents] = useState<any[]>([])
  const [temas, setTemas] = useState<any[]>([]) // { id, name, ordering? }
  const [attempts, setAttempts] = useState<any[]>([]) // edu_student_exercises agregados simples
  const [loading, setLoading] = useState<boolean>(true)

  // UI
  const [showGraphs, setShowGraphs] = useState<boolean>(true)

  // filtros
  const [q, setQ] = useState<string>('')
  const [temaFilter, setTemaFilter] = useState<string>('__ALL__')
  const [nivelFilter, setNivelFilter] = useState<string | '__ALL__'>('__ALL__')

  useEffect(() => {
    if (!classroomId) return

    const fetchAll = async () => {
      setLoading(true)

      // 0) info del classroom + institución
      const { data: cls, error: e0 } = await supabase
        .from('edu_classrooms')
        .select(
          `
          id, grade, section, academic_year, institution_id,
          edu_institutions:institution_id ( name, type )
        `
        )
        .eq('id', classroomId)
        .maybeSingle()

      if (e0) console.error('Error edu_classrooms', e0)
      setClassroomInfo(cls ?? null)

      // 1) estudiantes del salón (membership role=student)
      const { data: mem, error: e1 } = await supabase
        .from('edu_institution_members')
        .select(
          `
          profile_id,
          edu_profiles:profile_id ( id, first_name, last_name )
        `
        )
        .eq('classroom_id', classroomId)
        .eq('role', 'student')
        .eq('active', true)

      if (e1 || !mem) {
        console.error('Error edu_institution_members', e1)
        setStudents([])
        setTemas([])
        setAttempts([])
        setLoading(false)
        return
      }

      const st = (mem ?? [])
        .map((r: AnyRec) => {
          const p = Array.isArray(r.edu_profiles) ? r.edu_profiles[0] : r.edu_profiles
          const full = `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim()
          return { id: r.profile_id, nombres: full.length ? full : 'Sin nombre' }
        })
        .sort((a: AnyRec, b: AnyRec) => String(a.nombres).localeCompare(String(b.nombres)))

      setStudents(st)

      const ids = st.map((s: AnyRec) => s.id)

      if (ids.length === 0) {
        setTemas([])
        setAttempts([])
        setLoading(false)
        return
      }

      // 2) temas asignados al classroom (si existen)
      const { data: temasRaw, error: e2 } = await supabase
        .from('edu_classroom_temas')
        .select(
          `
          ordering,
          edu_temas:tema_id ( id, name )
        `
        )
        .eq('classroom_id', classroomId)
        .eq('active', true)
        .order('ordering', { ascending: true })

      if (e2) console.error('Error edu_classroom_temas', e2)

      const temasFromClass = (temasRaw ?? [])
        .map((r: AnyRec) => {
          const t = Array.isArray(r.edu_temas) ? r.edu_temas[0] : r.edu_temas
          if (!t?.id) return null
          return { id: t.id, name: t.name ?? 'Desconocido', ordering: r.ordering ?? 9999 }
        })
        .filter(Boolean) as any[]

      // 3) traer intentos recientes del salón (edu_student_exercises)
      //    - 30 días: para niveles actuales por tema
      const since30 = new Date()
      since30.setDate(since30.getDate() - 30)

      const { data: ex30, error: e3 } = await supabase
        .from('edu_student_exercises')
        .select('student_id, tema_id, correct, time_seconds, created_at')
        .eq('classroom_id', classroomId)
        .in('student_id', ids)
        .gte('created_at', since30.toISOString())
        .order('created_at', { ascending: false })

      if (e3) console.error('Error edu_student_exercises (30d)', e3)

      setAttempts((ex30 ?? []) as any[])

      // Si no había temas por classroom, inferimos de los intentos
      if (temasFromClass.length > 0) {
        setTemas(temasFromClass)
      } else {
        const temaSet = new Set<string>()
        ;(ex30 ?? []).forEach((r: AnyRec) => {
          if (r.tema_id) temaSet.add(r.tema_id)
        })

        // buscamos nombres de esos temas
        const temaIds = Array.from(temaSet)
        if (temaIds.length) {
          const { data: temaNames, error: e4 } = await supabase
            .from('edu_temas')
            .select('id, name')
            .in('id', temaIds)

          if (e4) console.error('Error edu_temas', e4)

          setTemas((temaNames ?? []).map((t: AnyRec) => ({ id: t.id, name: t.name ?? 'Desconocido' })))
        } else {
          setTemas([])
        }
      }

      setLoading(false)
    }

    fetchAll()

    // realtime: cuando llegan nuevos intentos, refrescamos
    const ch = supabase
      .channel('edu-perf-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'edu_student_exercises' }, fetchAll)
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, [classroomId, supabase])

  /* =========================
     Helpers de UI (nivel)
  ========================= */
  const getNivelColor = (nivel: any) =>
    nivel === 3
      ? 'bg-green-100 text-green-800 border-green-200'
      : nivel === 2
        ? 'bg-accent text-accent-foreground border-accent/30'
        : nivel === 1
          ? 'bg-orange-100 text-orange-800 border-orange-200'
          : 'bg-muted text-muted-foreground border-muted'

  const getNivelEmoji = (nivel: any) => (nivel === 3 ? '🌟' : nivel === 2 ? '⭐' : nivel === 1 ? '💪' : '🧩')
  const getNivelLabel = (nivel: any) => (nivel === 3 ? 'Avanzado' : nivel === 2 ? 'Intermedio' : nivel === 1 ? 'Básico' : 'Sin datos')

  /* =========================
     Agregaciones
  ========================= */

  // map tema_id -> name
  const temaNameById = useMemo(() => {
    const m = new Map<string, string>()
    temas.forEach((t: AnyRec) => m.set(t.id, t.name ?? 'Desconocido'))
    return m
  }, [temas])

  // agg 7 días por estudiante (correctos/incorrectos/último)
  const respAgg7d = useMemo(() => {
    const seven = new Date()
    seven.setDate(seven.getDate() - 7)

    const map = new Map<string, any>()
    attempts.forEach((r: AnyRec) => {
      const dt = new Date(r.created_at)
      if (dt < seven) return
      const curr = map.get(r.student_id) ?? { student_id: r.student_id, correctos: 0, incorrectos: 0, ultimo: null }
      if (r.correct) curr.correctos++
      else curr.incorrectos++
      if (!curr.ultimo || new Date(r.created_at) > new Date(curr.ultimo)) curr.ultimo = r.created_at
      map.set(r.student_id, curr)
    })
    return Array.from(map.values()) as any[]
  }, [attempts])

  // nivel por estudiante/tema (derivado)
  const studentTemaMap = useMemo(() => {
    // (student_id|tema_id) -> { attempts, corrects, acc, nivel, avgTime }
    const map:any = new Map<string, any>()

    attempts.forEach((r: AnyRec) => {
      const key = `${r.student_id}||${r.tema_id}`
      const curr =
        map.get(key) ?? {
          student_id: r.student_id,
          tema_id: r.tema_id,
          attempts: 0,
          corrects: 0,
          timeSum: 0,
          last: null,
        }

      curr.attempts++
      if (r.correct) curr.corrects++
      if (typeof r.time_seconds === 'number') curr.timeSum += r.time_seconds
      if (!curr.last || new Date(r.created_at) > new Date(curr.last)) curr.last = r.created_at

      map.set(key, curr)
    })

    // convertir a mapa student_id -> temas[]
    const byStudent:any = new Map<string, any[]>()

    for (const v of map.values()) {
      const acc = v.attempts ? v.corrects / v.attempts : 0
      const avgTime = v.attempts ? v.timeSum / v.attempts : null

      // 👇 heurística de nivel (ajústala si quieres)
      let nivel = 0
      if (v.attempts >= 5 && acc >= 0.8) nivel = 3
      else if (v.attempts >= 3 && acc >= 0.55) nivel = 2
      else if (v.attempts >= 1) nivel = 1

      const temaName = temaNameById.get(v.tema_id) ?? 'Desconocido'

      const arr = byStudent.get(v.student_id) ?? []
      arr.push({
        tema_id: v.tema_id,
        tema: temaName,
        nivel,
        attempts: v.attempts,
        acc: Number(acc),
        avgTime,
        last: v.last,
      })
      byStudent.set(v.student_id, arr)
    }

    // asegurar que si el classroom tiene temas asignados, aparezcan aunque no haya intentos
    // (para que el profe vea “sin datos”)
    if (temas.length) {
      for (const st of students) {
        const arr = byStudent.get(st.id) ?? []
        const present = new Set(arr.map((x: AnyRec) => x.tema_id))
        for (const t of temas) {
          if (!present.has(t.id)) {
            arr.push({
              tema_id: t.id,
              tema: t.name ?? 'Desconocido',
              nivel: 0,
              attempts: 0,
              acc: 0,
              avgTime: null,
              last: null,
            })
          }
        }
        byStudent.set(st.id, arr)
      }
    }

    return byStudent
  }, [attempts, temaNameById, temas, students])

  // studentsFull: junta estudiantes + temas + agg7d + promedio
  const studentsFull = useMemo(() => {
    return students.map((s: AnyRec) => {
      const temasArr = (studentTemaMap.get(s.id) ?? []).slice()
      const agg = respAgg7d.find((r: AnyRec) => r.student_id === s.id) ?? { correctos: 0, incorrectos: 0, ultimo: null }

      // promedio: solo considera temas con nivel>0
      const valid = temasArr.filter((t: AnyRec) => (t.nivel ?? 0) > 0)
      const nivelProm = valid.length ? valid.reduce((a: number, t: AnyRec) => a + (t.nivel || 0), 0) / valid.length : 0

      return { ...s, temas: temasArr, ...agg, nivelProm }
    })
  }, [students, studentTemaMap, respAgg7d])

  const temasUnicos = useMemo(() => {
    const list = temas.map((t: AnyRec) => t.name ?? 'Desconocido')
    const uniq = Array.from(new Set(list))
    return ['__ALL__', ...uniq]
  }, [temas])

  // stats por tema: cuenta estudiantes por nivel (0..3)
  const topicStats = useMemo(() => {
    const stats: AnyRec = {}
    studentsFull.forEach((s: AnyRec) => {
      ;(s.temas ?? []).forEach((t: AnyRec) => {
        const tema = t.tema ?? 'Desconocido'
        if (!stats[tema]) stats[tema] = { n0: 0, n1: 0, n2: 0, n3: 0, total: 0 }

        if (t.nivel === 3) stats[tema].n3++
        else if (t.nivel === 2) stats[tema].n2++
        else if (t.nivel === 1) stats[tema].n1++
        else stats[tema].n0++

        stats[tema].total++
      })
    })
    return stats
  }, [studentsFull])

  const filteredStudents = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return studentsFull.filter((s: AnyRec) => {
      const matchQ = ql.length === 0 || (s.nombres ?? '').toLowerCase().includes(ql)

      const matchTema =
        temaFilter === '__ALL__' ||
        (s.temas ?? []).some((t: AnyRec) => String(t.tema) === String(temaFilter))

      const matchNivel =
        nivelFilter === '__ALL__' ||
        (s.temas ?? []).some((t: AnyRec) => String(t.nivel) === String(nivelFilter))

      return matchQ && matchTema && matchNivel
    })
  }, [studentsFull, q, temaFilter, nivelFilter])

  const exportCSV = () => {
    const rows = [
      [
        'student_id',
        'nombres',
        'tema',
        'nivel',
        'attempts_30d',
        'accuracy_30d',
        'avg_time_seconds',
        'correctos_7d',
        'incorrectos_7d',
        'ultimo_intento',
        'nivel_promedio',
      ],
      ...studentsFull.flatMap((s: AnyRec) =>
        (s.temas?.length ? s.temas : [{ tema: '', nivel: '', attempts: '', acc: '', avgTime: '' }]).map((t: AnyRec) => [
          s.id,
          s.nombres,
          t.tema ?? '',
          t.nivel ?? '',
          t.attempts ?? 0,
          typeof t.acc === 'number' ? (t.acc * 100).toFixed(1) + '%' : '',
          t.avgTime != null ? Number(t.avgTime).toFixed(1) : '',
          s.correctos ?? 0,
          s.incorrectos ?? 0,
          s.ultimo || '',
          Number(s.nivelProm || 0).toFixed(2),
        ])
      ),
    ]

    const csv: any = rows.map((r) => r.map((x: any) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'performance.csv'
    a.click()
    URL.revokeObjectURL(url)
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

  const topicsKeys = Object.keys(topicStats).sort((a, b) => a.localeCompare(b))

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 p-6">
      <div className="max-w-7xl mx-auto">
        {/* header + toolbar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-lg border border-white/20">
            <div className="text-4xl">📊</div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Rendimiento por Clase
              </h1>
              <p className="text-muted-foreground mt-1">
                {classroomInfo?.edu_institutions?.name ? (
                  <>
                    {classroomInfo.edu_institutions.name} • {classroomInfo.grade}
                    {classroomInfo.section ? ` - ${classroomInfo.section}` : ''} • Año {classroomInfo.academic_year}
                  </>
                ) : (
                  'Dashboard de progreso académico'
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowGraphs(true)}
              className={`px-4 py-2 rounded-xl border ${
                showGraphs ? 'bg-primary text-white' : 'bg-white/80 text-foreground hover:bg-white'
              } transition`}
            >
              📈 Estadísticas por Tema
            </button>
            <button
              onClick={() => setShowGraphs(false)}
              className={`px-4 py-2 rounded-xl border ${
                !showGraphs ? 'bg-primary text-white' : 'bg-white/80 text-foreground hover:bg-white'
              } transition`}
            >
              👥 Vista por Estudiante
            </button>
            <button
              onClick={exportCSV}
              className="px-4 py-2 rounded-xl border bg-accent text-accent-foreground hover:brightness-105 transition"
            >
              ⬇️ Exportar CSV
            </button>
          </div>
        </div>

        {!showGraphs && (
          <div className="mb-6 grid gap-3 md:grid-cols-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar estudiante..."
              className="w-full px-4 py-3 rounded-xl bg-white border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <select
              value={temaFilter}
              onChange={(e) => setTemaFilter(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {temasUnicos.map((t) => (
                <option key={t} value={t}>
                  {t === '__ALL__' ? 'Todos los temas' : t}
                </option>
              ))}
            </select>
            <select
              value={String(nivelFilter)}
              onChange={(e) => setNivelFilter(e.target.value === '__ALL__' ? '__ALL__' : e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="__ALL__">Todos los niveles</option>
              <option value="0">Nivel 0 - Sin datos</option>
              <option value="1">Nivel 1 - Básico</option>
              <option value="2">Nivel 2 - Intermedio</option>
              <option value="3">Nivel 3 - Avanzado</option>
            </select>
          </div>
        )}

        {/* contenido */}
        {students.length === 0 ? (
          <EmptyState title="No se encontraron estudiantes" icon="🔍" subtitle="No hay miembros (role=student) en este salón." />
        ) : showGraphs ? (
          topicsKeys.length === 0 ? (
            <EmptyState title="No hay temas con actividad" icon="📚" subtitle="Aún no hay intentos registrados en los últimos 30 días." />
          ) : (
            <div className="space-y-6">
              {topicsKeys.map((tema: string) => {
                const s: AnyRec = (topicStats as AnyRec)[tema]
                const total = Math.max(1, s.total)

                const p3 = Math.round((s.n3 / total) * 100)
                const p2 = Math.round((s.n2 / total) * 100)
                const p1 = Math.round((s.n1 / total) * 100)
                const p0 = Math.round((s.n0 / total) * 100)

                const prom = ((s.n1 * 1 + s.n2 * 2 + s.n3 * 3) / total).toFixed(1)

                return (
                  <div
                    key={tema}
                    className="bg-white/80 rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary text-white grid place-items-center text-xl">
                        📖
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-foreground">{tema}</h3>
                        <p className="text-muted-foreground">{s.total} {s.total === 1 ? 'estudiante' : 'estudiantes'} en el salón</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Nivel promedio</div>
                        <div className="text-2xl font-semibold text-primary">{prom}</div>
                      </div>
                    </div>

                    <BarRow label="Nivel 3 - Avanzado" emoji="🌟" color="from-green-400 to-green-600" bg="bg-green-50 border-green-200" value={p3} count={s.n3} />
                    <BarRow label="Nivel 2 - Intermedio" emoji="⭐" color="from-yellow-400 to-yellow-600" bg="bg-yellow-50 border-yellow-200" value={p2} count={s.n2} />
                    <BarRow label="Nivel 1 - Básico" emoji="💪" color="from-orange-400 to-orange-600" bg="bg-orange-50 border-orange-200" value={p1} count={s.n1} />
                    <BarRow label="Nivel 0 - Sin datos" emoji="🧩" color="from-slate-300 to-slate-500" bg="bg-slate-50 border-slate-200" value={p0} count={s.n0} />
                  </div>
                )
              })}
            </div>
          )
        ) : (
          <div className="grid gap-6">
            {filteredStudents.map((s: AnyRec) => (
              <div
                key={s.id}
                className="relative overflow-hidden rounded-2xl bg-white/80 border border-white/20 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition"
              >
                <div className="relative p-6">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white grid place-items-center text-xl font-bold">
                      {(s.nombres || '?').charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1">
                      <h2 className="text-2xl font-bold">{s.nombres}</h2>
                      <div className="text-sm text-muted-foreground flex gap-3 flex-wrap">
                        <span>
                          Temas: <b>{(s.temas ?? []).length}</b>
                        </span>
                        <span>
                          Promedio: <b className="text-primary">{Number(s.nivelProm || 0).toFixed(1)}</b>
                        </span>
                        <span>
                          7d ✅ <b className="text-green-600">{s.correctos || 0}</b> / ❌{' '}
                          <b className="text-red-600">{s.incorrectos || 0}</b>
                        </span>
                        {s.ultimo && <span>Último: {new Date(s.ultimo).toLocaleDateString()}</span>}
                      </div>
                    </div>

                    <Link
                      href={`/dashboard/teacher/classroom/${classroomId}/performance/${s.id}`}
                      className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90"
                    >
                      Ver detalle →
                    </Link>
                  </div>

                  {s.temas?.length ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {s.temas
                        .slice()
                        .sort((a: AnyRec, b: AnyRec) => String(a.tema).localeCompare(String(b.tema)))
                        .map((t: AnyRec, i: number) => (
                          <button
                            key={i}
                            onClick={() => {
                              setTemaFilter(t.tema)
                              setShowGraphs(false)
                            }}
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

                            <div className="mt-3 text-xs text-muted-foreground flex items-center justify-between">
                              <span>Intentos (30d): <b className="text-foreground">{t.attempts ?? 0}</b></span>
                              <span>Precisión: <b className="text-foreground">{typeof t.acc === 'number' ? `${Math.round(t.acc * 100)}%` : '—'}</b></span>
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

        {students.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPI icon="👥" label="Estudiantes" value={students.length} />
            <KPI icon="📚" label="Temas" value={temas.length} />
            <KPI
              icon="⭐"
              label="Nivel promedio (global)"
              value={
                studentsFull.length
                  ? (
                      studentsFull.reduce((a: number, s: AnyRec) => a + Number(s.nivelProm || 0), 0) / studentsFull.length
                    ).toFixed(1)
                  : '0'
              }
            />
            <KPI
              icon="⚡"
              label="Intentos 7 días"
              value={respAgg7d.reduce((a: number, r: AnyRec) => a + (r.correctos || 0) + (r.incorrectos || 0), 0)}
            />
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
