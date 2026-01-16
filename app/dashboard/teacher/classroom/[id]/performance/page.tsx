'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import * as XLSX from 'xlsx'
import { AnimatePresence, motion } from 'framer-motion'
import { PageHeader } from '@/components/dashboard/core'

/* ============================================================
   TYPES
============================================================ */
type PerfRow = {
  classroom_id: string
  student_id: string
  nombres: string
  tema_id: string
  tema: string
  ordering: number

  attempts_30d: number
  correct_30d: number
  incorrect_30d: number
  accuracy_30d: number

  // opcionales (si tu view los expone, perfecto)
  avg_time_s?: number | null
  correct_7d?: number
  incorrect_7d?: number
  last_attempt_30d?: string | null
}

type StudentAgg = {
  student_id: string
  nombres: string
  attempts_30d: number
  correct_30d: number
  incorrect_30d: number
  accuracy_30d: number
  avg_time_s: number | null
  active_7d: boolean
  last_attempt_30d: string | null
  temas: PerfRow[]
  risk: {
    isRisk: boolean
    severity: 'low' | 'med' | 'high' | 'none'
    reasons: string[]
  }
}

type TopicAgg = {
  tema: string
  orderingMin: number
  attempts_30d: number
  correct_30d: number
  incorrect_30d: number
  accuracy_30d: number
  avg_time_s: number | null
  students: number
}

type ViewMode = 'overview' | 'students' | 'topics'
type SortKey =
  | 'accuracy_desc'
  | 'attempts_desc'
  | 'incorrect_desc'
  | 'last_desc'
  | 'name_asc'
  | 'name_desc'

/* ============================================================
   HELPERS
============================================================ */
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function pct01(x: number) {
  if (!Number.isFinite(x)) return 0
  return clamp(x, 0, 1)
}

function fmtPct(x01: number, digits = 0) {
  return `${(pct01(x01) * 100).toFixed(digits)}%`
}

function fmtNum(n: any) {
  const x = Number(n)
  if (!Number.isFinite(x)) return '—'
  return x.toLocaleString()
}

function fmtDate(s?: string | null) {
  if (!s) return '—'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString()
}

function fmtDateTime(s?: string | null) {
  if (!s) return '—'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

function getInitials(name: string) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase()
}

/* ============================================================
   PAGE
============================================================ */
export default function PerformancePage() {
  const params = useParams() as any
  const classroomId = params?.id as string

  // IMPORTANT: crea el client una sola vez
  const supabase = useMemo(() => createClient(), [])

  const [rows, setRows] = useState<PerfRow[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('overview')

  // filtros / controles
  const [q, setQ] = useState('')
  const [temaFilter, setTemaFilter] = useState('__ALL__')
  const [showOnlyRisk, setShowOnlyRisk] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('accuracy_desc')

  // UI (expand alumno)
  const [openStudentId, setOpenStudentId] = useState<string | null>(null)

  /* =========================
     FETCH
  ========================= */
  useEffect(() => {
    if (!classroomId) return

    const fetchData = async () => {
      setLoading(true)

      const { data, error } = await supabase
        .from('edu_classroom_performance_v')
        .select('*')
        .eq('classroom_id', classroomId)

      if (error) {
        console.error('edu_classroom_performance_v', error)
        setRows([])
      } else {
        setRows((data ?? []) as PerfRow[])
      }

      setLoading(false)
    }

    fetchData()

    const ch = supabase
      .channel(`perf-edu-${classroomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'edu_student_exercises' }, fetchData)
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, [classroomId, supabase])

  /* =========================
     DERIVED — TEMAS ÚNICOS
  ========================= */
  const temasUnicos = useMemo(() => {
    const set = new Set<string>()
    rows.forEach(r => set.add(r.tema || 'Sin tema'))
    return ['__ALL__', ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [rows])

  /* =========================
     DERIVED — AGREGADO POR ESTUDIANTE
  ========================= */
  const studentsAgg: StudentAgg[] = useMemo(() => {
    const map = new Map<string, StudentAgg>()

    for (const r of rows) {
      const curr =
        map.get(r.student_id) ??
        ({
          student_id: r.student_id,
          nombres: r.nombres,
          attempts_30d: 0,
          correct_30d: 0,
          incorrect_30d: 0,
          accuracy_30d: 0,
          avg_time_s: null,
          active_7d: false,
          last_attempt_30d: null,
          temas: [],
          risk: { isRisk: false, severity: 'none', reasons: [] },
        } as StudentAgg)

      curr.temas.push(r)
      curr.attempts_30d += r.attempts_30d || 0
      curr.correct_30d += r.correct_30d || 0
      curr.incorrect_30d += r.incorrect_30d || 0

      // last_attempt (máximo)
      if (r.last_attempt_30d) {
        if (!curr.last_attempt_30d) curr.last_attempt_30d = r.last_attempt_30d
        else if (new Date(r.last_attempt_30d) > new Date(curr.last_attempt_30d)) {
          curr.last_attempt_30d = r.last_attempt_30d
        }
      }

      // active_7d (si tu view lo trae)
      const c7 = r.correct_7d ?? 0
      const i7 = r.incorrect_7d ?? 0
      if (c7 + i7 > 0) curr.active_7d = true

      // avg_time_s: promedio ponderado por intentos (si existe)
      const t = r.avg_time_s
      if (typeof t === 'number' && !Number.isNaN(t)) {
        const w = Math.max(1, r.attempts_30d || 0)
        const prev = curr.avg_time_s ?? 0
        const prevW = (curr as any).__timeW ?? 0
        const nextW = prevW + w
        const next = (prev * prevW + t * w) / nextW
        curr.avg_time_s = next
          ; (curr as any).__timeW = nextW
      }

      map.set(r.student_id, curr)
    }

    const list = Array.from(map.values()).map(s => {
      s.accuracy_30d = s.attempts_30d ? s.correct_30d / s.attempts_30d : 0

      // Modelo de riesgo (simple pero útil)
      const reasons: string[] = []
      const lowAcc = s.attempts_30d >= 10 && s.accuracy_30d < 0.45
      const midAcc = s.attempts_30d >= 10 && s.accuracy_30d >= 0.45 && s.accuracy_30d < 0.55
      const manyWrong = s.incorrect_30d >= 12
      const inactive = !s.active_7d && s.attempts_30d > 0
      const noWork = s.attempts_30d === 0

      if (lowAcc) reasons.push('Precisión baja (últimos 30 días)')
      if (midAcc) reasons.push('Precisión moderada (recomendable reforzar)')
      if (manyWrong) reasons.push('Alto volumen de errores (últimos 30 días)')
      if (inactive) reasons.push('Sin actividad reciente (últimos 7 días)')
      if (noWork) reasons.push('Sin intentos registrados (últimos 30 días)')

      const isRisk = reasons.length > 0 && !noWork
      const severity: StudentAgg['risk']['severity'] =
        lowAcc && (manyWrong || inactive) ? 'high' : isRisk ? (lowAcc || manyWrong ? 'med' : 'low') : 'none'

      s.risk = { isRisk, severity, reasons }
      return s
    })

    return list
  }, [rows])

  /* =========================
     DERIVED — AGREGADO POR TEMA
  ========================= */
  const topicsAgg: TopicAgg[] = useMemo(() => {
    const map = new Map<string, TopicAgg>()

    for (const r of rows) {
      const key = r.tema || 'Sin tema'
      const curr =
        map.get(key) ??
        ({
          tema: key,
          orderingMin: Number.isFinite(r.ordering) ? r.ordering : 9999,
          attempts_30d: 0,
          correct_30d: 0,
          incorrect_30d: 0,
          accuracy_30d: 0,
          avg_time_s: null,
          students: 0,
        } as TopicAgg)

      curr.orderingMin = Math.min(curr.orderingMin, Number.isFinite(r.ordering) ? r.ordering : 9999)
      curr.attempts_30d += r.attempts_30d || 0
      curr.correct_30d += r.correct_30d || 0
      curr.incorrect_30d += r.incorrect_30d || 0

      // avg_time ponderado
      const t = r.avg_time_s
      if (typeof t === 'number' && !Number.isNaN(t)) {
        const w = Math.max(1, r.attempts_30d || 0)
        const prev = curr.avg_time_s ?? 0
        const prevW = (curr as any).__timeW ?? 0
        const nextW = prevW + w
        const next = (prev * prevW + t * w) / nextW
        curr.avg_time_s = next
          ; (curr as any).__timeW = nextW
      }

      map.set(key, curr)
    }

    // alumnos únicos por tema
    const temaStudentSet = new Map<string, Set<string>>()
    for (const r of rows) {
      const key = r.tema || 'Sin tema'
      const set = temaStudentSet.get(key) ?? new Set<string>()
      set.add(r.student_id)
      temaStudentSet.set(key, set)
    }

    const list = Array.from(map.values()).map(t => {
      t.accuracy_30d = t.attempts_30d ? t.correct_30d / t.attempts_30d : 0
      t.students = temaStudentSet.get(t.tema)?.size ?? 0
      return t
    })

    list.sort((a, b) => a.orderingMin - b.orderingMin || a.tema.localeCompare(b.tema))
    return list
  }, [rows])

  /* =========================
     GLOBAL KPIs
  ========================= */
  const kpis = useMemo(() => {
    const studentsCount = studentsAgg.length
    const topicsCount = topicsAgg.length
    const attempts = studentsAgg.reduce((a, s) => a + (s.attempts_30d || 0), 0)
    const correct = studentsAgg.reduce((a, s) => a + (s.correct_30d || 0), 0)
    const incorrect = studentsAgg.reduce((a, s) => a + (s.incorrect_30d || 0), 0)
    const accuracy = attempts ? correct / attempts : 0
    const active7d = studentsAgg.filter(s => s.active_7d).length
    const riskCount = studentsAgg.filter(s => s.risk.isRisk).length

    const times = studentsAgg.map(s => s.avg_time_s).filter((x): x is number => typeof x === 'number')
    const avgTime = times.length ? times.reduce((a, x) => a + x, 0) / times.length : null

    return { studentsCount, topicsCount, attempts, correct, incorrect, accuracy, active7d, riskCount, avgTime }
  }, [studentsAgg, topicsAgg])

  /* =========================
     FILTERED STUDENTS (incluye filtro interno de temas)
  ========================= */
  const filteredStudents = useMemo(() => {
    const ql = q.trim().toLowerCase()

    let list = studentsAgg.filter(s => {
      const matchName = !ql || (s.nombres || '').toLowerCase().includes(ql)
      const matchTema = temaFilter === '__ALL__' || s.temas.some(t => t.tema === temaFilter)
      const matchRisk = !showOnlyRisk || s.risk.isRisk
      return matchName && matchTema && matchRisk
    })

    // CLAVE: filtrar temas internos del alumno (para que el profe “vea” el filtro)
    list = list.map(s => ({
      ...s,
      temas: temaFilter === '__ALL__' ? s.temas : s.temas.filter(t => t.tema === temaFilter),
    }))

    list = list.slice().sort((a, b) => {
      if (sortKey === 'accuracy_desc') return b.accuracy_30d - a.accuracy_30d
      if (sortKey === 'attempts_desc') return b.attempts_30d - a.attempts_30d
      if (sortKey === 'incorrect_desc') return b.incorrect_30d - a.incorrect_30d
      if (sortKey === 'last_desc') {
        const da = a.last_attempt_30d ? new Date(a.last_attempt_30d).getTime() : 0
        const db = b.last_attempt_30d ? new Date(b.last_attempt_30d).getTime() : 0
        return db - da
      }
      if (sortKey === 'name_asc') return a.nombres.localeCompare(b.nombres)
      if (sortKey === 'name_desc') return b.nombres.localeCompare(a.nombres)
      return 0
    })

    return list
  }, [studentsAgg, q, temaFilter, showOnlyRisk, sortKey])

  // si cambio filtros, cierro el acordeón si ya no existe
  useEffect(() => {
    if (!openStudentId) return
    const exists = filteredStudents.some(s => s.student_id === openStudentId)
    if (!exists) setOpenStudentId(null)
  }, [filteredStudents, openStudentId])

  /* =========================
     EXPORT EXCEL (PRO, listo para demo)
  ========================= */
  const exportExcel = () => {
    const sheet1Header = [
      'ID Alumno',
      'Alumno',
      'Intentos (30d)',
      'Aciertos (30d)',
      'Errores (30d)',
      'Precisión (30d)',
      'Activo (7d)',
      'Último intento (30d)',
      'Tiempo prom. (s)',
      'En riesgo',
      'Motivos (si aplica)',
    ]

    const byStudentAoa = [
      sheet1Header,
      ...studentsAgg
        .slice()
        .sort((a, b) => b.accuracy_30d - a.accuracy_30d)
        .map(s => [
          s.student_id,
          s.nombres,
          s.attempts_30d,
          s.correct_30d,
          s.incorrect_30d,
          Number((s.accuracy_30d * 100).toFixed(2)),
          s.active_7d ? 'Sí' : 'No',
          s.last_attempt_30d ? fmtDateTime(s.last_attempt_30d) : '',
          s.avg_time_s != null ? Number(s.avg_time_s.toFixed(2)) : '',
          s.risk.isRisk ? 'Sí' : 'No',
          s.risk.reasons.join(' | '),
        ]),
    ]

    const sheet2Header = [
      'Tema',
      'Orden',
      'Alumnos',
      'Intentos (30d)',
      'Aciertos (30d)',
      'Errores (30d)',
      'Precisión (30d)',
      'Tiempo prom. (s)',
    ]

    const byTemaAoa = [
      sheet2Header,
      ...topicsAgg.map(t => [
        t.tema,
        t.orderingMin,
        t.students,
        t.attempts_30d,
        t.correct_30d,
        t.incorrect_30d,
        Number((t.accuracy_30d * 100).toFixed(2)),
        t.avg_time_s != null ? Number(t.avg_time_s.toFixed(2)) : '',
      ]),
    ]

    const sheet3Header = [
      'Classroom ID',
      'ID Alumno',
      'Alumno',
      'Tema ID',
      'Tema',
      'Orden',
      'Intentos (30d)',
      'Aciertos (30d)',
      'Errores (30d)',
      'Precisión (30d)',
      'Tiempo prom. (s)',
      'Último intento (30d)',
    ]

    const rawAoa = [
      sheet3Header,
      ...rows.map(r => [
        r.classroom_id,
        r.student_id,
        r.nombres,
        r.tema_id,
        r.tema,
        r.ordering,
        r.attempts_30d,
        r.correct_30d,
        r.incorrect_30d,
        Number((r.accuracy_30d * 100).toFixed(2)),
        r.avg_time_s ?? '',
        r.last_attempt_30d ? fmtDateTime(r.last_attempt_30d) : '',
      ]),
    ]

    const wb = XLSX.utils.book_new()
    wb.Props = {
      Title: `Rendimiento Aula ${classroomId}`,
      Subject: 'Reporte docente (últimos 30 días)',
      Author: 'Ludus / Plataforma Educativa',
      CreatedDate: new Date(),
    }

    const wsStudents = XLSX.utils.aoa_to_sheet(byStudentAoa)
    const wsTopics = XLSX.utils.aoa_to_sheet(byTemaAoa)
    const wsRaw = XLSX.utils.aoa_to_sheet(rawAoa)

    // widths + autofilter
    wsStudents['!cols'] = [
      { wch: 18 },
      { wch: 26 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 22 },
      { wch: 16 },
      { wch: 10 },
      { wch: 48 },
    ]
    wsTopics['!cols'] = [
      { wch: 34 },
      { wch: 8 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
    ]
    wsRaw['!cols'] = [
      { wch: 18 },
      { wch: 18 },
      { wch: 26 },
      { wch: 18 },
      { wch: 34 },
      { wch: 8 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 22 },
    ]

    wsStudents['!autofilter'] = { ref: `A1:K${byStudentAoa.length}` }
    wsTopics['!autofilter'] = { ref: `A1:H${byTemaAoa.length}` }
    wsRaw['!autofilter'] = { ref: `A1:L${rawAoa.length}` }

    XLSX.utils.book_append_sheet(wb, wsStudents, 'Resumen_Alumnos')
    XLSX.utils.book_append_sheet(wb, wsTopics, 'Resumen_Temas')
    XLSX.utils.book_append_sheet(wb, wsRaw, 'Detalle')

    const safeDate = new Date().toISOString().split('T')[0]
    XLSX.writeFile(wb, `Reporte_Rendimiento_Aula_${classroomId}_${safeDate}.xlsx`)
  }

  /* ============================================================
     UI
  ============================================================ */
  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-10 w-80 bg-muted rounded-2xl animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 bg-card border border-border rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="h-96 bg-card border border-border rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  const riskStudents = studentsAgg.filter(s => s.risk.isRisk)
  const topTopics = topicsAgg.slice().sort((a, b) => b.accuracy_30d - a.accuracy_30d).slice(0, 4)
  const lowTopics = topicsAgg.slice().sort((a, b) => a.accuracy_30d - b.accuracy_30d).slice(0, 4)

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_12%_-10%,rgba(56,189,248,0.18),transparent),radial-gradient(800px_420px_at_90%_-20%,rgba(244,114,182,0.18),transparent),linear-gradient(to_bottom,rgba(248,250,252,0.95),rgba(255,255,255,0.96),rgba(241,245,249,0.98))]" />
      <div className="relative space-y-6 text-foreground p-6 md:p-8">
      <PageHeader
        title="Rendimiento"
        breadcrumbs={[
          { label: "Mis Clases", href: "/dashboard/teacher" },
          { label: "Aula", href: `/dashboard/teacher/classroom/${classroomId}` },
          { label: "Rendimiento" },
        ]}
      />
      <div className="space-y-6">
        {/* HERO / HEADER */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_18px_45px_-30px_rgba(15,23,42,0.45)]">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(56,189,248,0.12),rgba(99,102,241,0.08),rgba(244,114,182,0.12))]" />
          <div className="relative p-6 md:p-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary text-white grid place-items-center text-xl shadow-md shadow-primary/20">
                📊
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                  Panel de Rendimiento del Aula
                </h1>
                <p className="text-sm md:text-base text-muted-foreground">
                  Reporte docente — ventana móvil de <b>30 días</b>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SegmentTab active={view === 'overview'} onClick={() => setView('overview')}>
                Overview
              </SegmentTab>
              <SegmentTab active={view === 'students'} onClick={() => setView('students')}>
                Estudiantes
              </SegmentTab>
              <SegmentTab active={view === 'topics'} onClick={() => setView('topics')}>
                Temas
              </SegmentTab>

              <button
                onClick={exportExcel}
                className="ml-0 lg:ml-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 text-slate-900 font-semibold hover:brightness-105 transition border border-amber-200 shadow-md shadow-amber-200/40"
              >
                Exportar Excel
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <KPICard title="Estudiantes" value={kpis.studentsCount} icon="👥" />
          <KPICard title="Temas" value={kpis.topicsCount} icon="📚" />
          <KPICard title="Intentos (30d)" value={fmtNum(kpis.attempts)} icon="⚡" />
          <KPICard title="Precisión global" value={fmtPct(kpis.accuracy, 1)} icon="🎯" />
          <KPICard title="Activos (7d)" value={fmtNum(kpis.active7d)} icon="🔥" />
          <KPICard
            title="Alertas"
            value={fmtNum(kpis.riskCount)}
            icon="🚨"
            tone={kpis.riskCount > 0 ? 'danger' : 'ok'}
            sub={kpis.avgTime != null ? `Tiempo prom.: ${kpis.avgTime.toFixed(1)}s` : 'Tiempo prom.: —'}
          />
        </div>

        {/* BODY */}
        <AnimatePresence mode="wait">
          {/* ======================================================
              OVERVIEW
          ======================================================= */}
          {view === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className=""
            >
       
              {/* Rendimiento por tema */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)] lg:col-span-2 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">Rendimiento por tema</h3>
                    <p className="text-sm text-muted-foreground">Comparativo de precisión (30 días)</p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Precisión global: <b className="text-foreground">{fmtPct(kpis.accuracy, 1)}</b>
                  </div>
                </div>

                {/* Top & Low */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold">Top temas</div>
                      <div className="text-xs text-muted-foreground">mejor precisión</div>
                    </div>
                    <div className="space-y-3">
                      {topTopics.map(t => (
                        <button
                          key={t.tema}
                          onClick={() => {
                            setTemaFilter(t.tema)
                            setView('students')
                          }}
                          className="w-full text-left rounded-xl border border-border p-3 hover:bg-muted/70 transition shadow-[0_10px_25px_-22px_rgba(15,23,42,0.5)]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{t.tema}</div>
                              <div className="text-xs text-muted-foreground">
                                {t.students} alumnos • {t.attempts_30d} intentos
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Precisión</div>
                              <div className="font-bold text-primary">{fmtPct(t.accuracy_30d, 0)}</div>
                            </div>
                          </div>
                          <div className="mt-2">
                            <ProgressBar value={t.accuracy_30d} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold">Temas a reforzar</div>
                      <div className="text-xs text-muted-foreground">prioridad docente</div>
                    </div>
                    <div className="space-y-3">
                      {lowTopics.map(t => (
                        <button
                          key={t.tema}
                          onClick={() => {
                            setTemaFilter(t.tema)
                            setView('students')
                          }}
                          className="w-full text-left rounded-xl border border-border p-3 hover:bg-muted/70 transition shadow-[0_10px_25px_-22px_rgba(15,23,42,0.5)]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{t.tema}</div>
                              <div className="text-xs text-muted-foreground">
                                {t.students} alumnos • {t.incorrect_30d} errores
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Precisión</div>
                              <div className="font-bold text-destructive">{fmtPct(t.accuracy_30d, 0)}</div>
                            </div>
                          </div>
                          <div className="mt-2">
                            <ProgressBar value={t.accuracy_30d} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tabla compacta */}
                <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <div className="font-semibold">Listado completo</div>
                    <div className="text-xs text-muted-foreground">click para filtrar alumnos por tema</div>
                  </div>
                  <div className="max-h-[360px] overflow-auto">
                    <div className="divide-y divide-border">
                      {topicsAgg.map(t => (
                        <button
                          key={t.tema}
                          onClick={() => {
                            setTemaFilter(t.tema)
                            setView('students')
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-muted/70 transition"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{t.tema}</div>
                              <div className="text-xs text-muted-foreground">
                                {t.students} alumnos • {t.correct_30d} ✅ / {t.incorrect_30d} ❌
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="hidden md:block w-40">
                                <ProgressBar value={t.accuracy_30d} />
                              </div>
                              <div className="text-right w-16 font-bold">
                                {fmtPct(t.accuracy_30d, 0)}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                      {topicsAgg.length === 0 && (
                        <div className="px-5 py-10 text-center text-muted-foreground">No hay datos aún.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ======================================================
              STUDENTS
          ======================================================= */}
          {view === 'students' && (
            <motion.div
              key="students"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="space-y-4"
            >
              {/* FILTER BAR */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-[0_14px_38px_-26px_rgba(15,23,42,0.45)]">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground">Buscar estudiante</label>
                    <input
                      value={q}
                      onChange={e => setQ(e.target.value)}
                      placeholder="Ej.: Ana, Pérez, Juan..."
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-white border border-border focus:outline-none focus:ring-2 focus:ring-ring shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Tema</label>
                    <select
                      value={temaFilter}
                      onChange={e => setTemaFilter(e.target.value)}
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-white border border-border focus:outline-none focus:ring-2 focus:ring-ring shadow-sm"
                    >
                      {temasUnicos.map(t => (
                        <option key={t} value={t}>
                          {t === '__ALL__' ? 'Todos los temas' : t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Ordenar por</label>
                    <select
                      value={sortKey}
                      onChange={e => setSortKey(e.target.value as SortKey)}
                      className="mt-1 w-full px-4 py-3 rounded-xl bg-white border border-border focus:outline-none focus:ring-2 focus:ring-ring shadow-sm"
                    >
                      <option value="accuracy_desc">Precisión (↓)</option>
                      <option value="attempts_desc">Intentos (↓)</option>
                      <option value="incorrect_desc">Errores (↓)</option>
                      <option value="last_desc">Último intento (↓)</option>
                      <option value="name_asc">Nombre (A–Z)</option>
                      <option value="name_desc">Nombre (Z–A)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showOnlyRisk}
                      onChange={e => setShowOnlyRisk(e.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                    Mostrar solo alumnos con alerta
                  </label>

                  <div className="text-sm text-muted-foreground">
                    Mostrando <b className="text-foreground">{filteredStudents.length}</b> estudiantes
                    {temaFilter !== '__ALL__' && (
                      <>
                        {' '}• Tema: <b className="text-foreground">{temaFilter}</b>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* LIST */}
              <div className="bg-card border border-border rounded-2xl shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)] overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <div className="font-bold">Listado de estudiantes</div>
                  <div className="text-xs text-muted-foreground">
                    Click en un estudiante para ver el desglose por tema
                  </div>
                </div>

                {filteredStudents.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground">
                    No se encontraron resultados con los filtros actuales.
                  </div>
                ) : (
                  <div className="divide-y divide-border bg-white">
                    {filteredStudents.map(s => {
                      const isOpen = openStudentId === s.student_id
                      const acc = s.accuracy_30d
                      const risk = s.risk.isRisk

                      return (
                        <div key={s.student_id} className="bg-white">
                          <button
                            onClick={() => setOpenStudentId(isOpen ? null : s.student_id)}
                            className="w-full text-left px-5 py-4 hover:bg-muted transition"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-2xl border border-border bg-muted grid place-items-center text-xs font-extrabold">
                                    {getInitials(s.nombres)}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <div className="font-semibold truncate">{s.nombres}</div>

                                      {risk && (
                                        <Badge tone={s.risk.severity === 'high' ? 'danger' : s.risk.severity === 'med' ? 'warn' : 'neutral'}>
                                          Alerta
                                        </Badge>
                                      )}

                                      {s.active_7d && <Badge tone="ok">Activo (7d)</Badge>}
                                    </div>

                                    <div className="mt-1 text-xs text-muted-foreground flex gap-3 flex-wrap">
                                      <span>
                                        Intentos (30d): <b className="text-foreground">{s.attempts_30d}</b>
                                      </span>
                                      <span>✅ {s.correct_30d}</span>
                                      <span>❌ {s.incorrect_30d}</span>
                                      <span>
                                        Último intento: <b className="text-foreground">{fmtDate(s.last_attempt_30d)}</b>
                                      </span>
                                      <span>
                                        Tiempo prom.: <b className="text-foreground">{s.avg_time_s != null ? `${s.avg_time_s.toFixed(1)}s` : '—'}</b>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="w-44 hidden md:block">
                                  <ProgressBar value={acc} />
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-muted-foreground">Precisión</div>
                                  <div
                                    className={`text-xl font-extrabold ${acc >= 0.7 ? 'text-primary' : acc >= 0.55 ? 'text-foreground' : 'text-destructive'
                                      }`}
                                  >
                                    {fmtPct(acc, 0)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </button>

                          <AnimatePresence>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="px-5 pb-5"
                              >
                                {risk && (
                                  <div className="mt-2 mb-4 bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                                    <div className="font-semibold text-destructive mb-1">
                                      Motivos de alerta
                                    </div>
                                    <div className="text-sm text-foreground">
                                      {s.risk.reasons.join(' • ')}
                                    </div>
                                  </div>
                                )}

                                <div className="bg-card border border-border rounded-xl overflow-hidden">
                                  <div className="px-4 py-3 border-b border-border font-semibold flex items-center justify-between">
                                    <span>Desglose por tema (30 días)</span>
                                    {temaFilter !== '__ALL__' && (
                                      <span className="text-xs text-muted-foreground">
                                        Filtrado: <b className="text-foreground">{temaFilter}</b>
                                      </span>
                                    )}
                                  </div>

                                  <div className="overflow-auto bg-white">
                                    <table className="min-w-full text-sm">
                                      <thead className="bg-muted">
                                        <tr>
                                          <th className="text-left px-4 py-2 font-semibold">Tema</th>
                                          <th className="text-right px-4 py-2 font-semibold">Intentos</th>
                                          <th className="text-right px-4 py-2 font-semibold">Aciertos</th>
                                          <th className="text-right px-4 py-2 font-semibold">Errores</th>
                                          <th className="text-right px-4 py-2 font-semibold">Precisión</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {s.temas
                                          .slice()
                                          .sort(
                                            (a, b) =>
                                              (a.ordering ?? 9999) - (b.ordering ?? 9999) ||
                                              a.tema.localeCompare(b.tema)
                                          )
                                          .map((t, idx) => (
                                            <tr key={`${t.tema_id}-${idx}`} className="border-t border-border">
                                              <td className="px-4 py-2">
                                                <div className="font-medium">{t.tema}</div>
                                                <div className="text-xs text-muted-foreground">
                                                  Orden: {Number.isFinite(t.ordering) ? t.ordering : '—'}
                                                </div>
                                              </td>
                                              <td className="px-4 py-2 text-right">{t.attempts_30d}</td>
                                              <td className="px-4 py-2 text-right text-primary font-semibold">
                                                {t.correct_30d}
                                              </td>
                                              <td className="px-4 py-2 text-right text-destructive font-semibold">
                                                {t.incorrect_30d}
                                              </td>
                                              <td className="px-4 py-2 text-right font-extrabold">
                                                {fmtPct(t.accuracy_30d, 0)}
                                              </td>
                                            </tr>
                                          ))}
                                        {s.temas.length === 0 && (
                                          <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                              Este estudiante no tiene registros en el periodo seleccionado.
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ======================================================
              TOPICS
          ======================================================= */}
          {view === 'topics' && (
            <motion.div
              key="topics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="space-y-4"
            >
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-lg font-bold">Temas del aula</h3>
                    <p className="text-sm text-muted-foreground">
                      Ordenados por <b>ordering</b> (plan / secuencia académica)
                    </p>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Intentos: <b className="text-foreground">{fmtNum(kpis.attempts)}</b> • Precisión global:{' '}
                    <b className="text-foreground">{fmtPct(kpis.accuracy, 1)}</b>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)] overflow-hidden">
                <div className="overflow-auto bg-white">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left px-5 py-3 font-semibold">Tema</th>
                        <th className="text-right px-5 py-3 font-semibold">Alumnos</th>
                        <th className="text-right px-5 py-3 font-semibold">Intentos</th>
                        <th className="text-right px-5 py-3 font-semibold">Aciertos</th>
                        <th className="text-right px-5 py-3 font-semibold">Errores</th>
                        <th className="text-right px-5 py-3 font-semibold">Precisión</th>
                        <th className="text-left px-5 py-3 font-semibold">Indicador</th>
                        <th className="text-right px-5 py-3 font-semibold">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topicsAgg.map(t => (
                        <tr key={t.tema} className="border-t border-border">
                          <td className="px-5 py-3">
                            <div className="font-semibold">{t.tema}</div>
                            <div className="text-xs text-muted-foreground">
                              Orden: {t.orderingMin === 9999 ? '—' : t.orderingMin}
                              {t.avg_time_s != null ? ` • Tiempo prom.: ${t.avg_time_s.toFixed(1)}s` : ''}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right">{t.students}</td>
                          <td className="px-5 py-3 text-right">{t.attempts_30d}</td>
                          <td className="px-5 py-3 text-right text-primary font-semibold">{t.correct_30d}</td>
                          <td className="px-5 py-3 text-right text-destructive font-semibold">{t.incorrect_30d}</td>
                          <td className="px-5 py-3 text-right font-extrabold">
                            {fmtPct(t.accuracy_30d, 0)}
                          </td>
                          <td className="px-5 py-3 w-[260px]">
                            <ProgressBar value={t.accuracy_30d} />
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              onClick={() => {
                                setTemaFilter(t.tema)
                                setView('students')
                              }}
                              className="px-3 py-2 rounded-xl bg-muted hover:bg-muted/70 border border-border text-sm font-semibold transition"
                            >
                              Ver estudiantes
                            </button>
                          </td>
                        </tr>
                      ))}
                      {topicsAgg.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">
                            No hay datos aún para este aula.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
    </div>
  )
}

/* ============================================================
   UI COMPONENTS
============================================================ */
function SegmentTab({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl font-semibold border transition shadow-sm ${active
          ? 'bg-gradient-to-r from-slate-900 to-slate-700 text-white border-slate-800 shadow-md shadow-slate-900/20'
          : 'bg-white text-foreground border-border hover:bg-muted/70'
        }`}
    >
      {children}
    </button>
  )
}

function KPICard({
  title,
  value,
  icon,
  tone,
  sub,
}: {
  title: string
  value: any
  icon: string
  tone?: 'danger' | 'ok'
  sub?: string
}) {
  const ring =
    tone === 'danger' ? 'ring-2 ring-destructive/20 border-destructive/30' : tone === 'ok' ? 'ring-2 ring-primary/10' : ''

  return (
    <div className={`bg-card border border-border rounded-2xl p-5 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.45)] ${ring}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground font-semibold">{title}</div>
          <div className="text-3xl font-extrabold text-foreground mt-1">{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  )
}

function Badge({ children, tone }: { children: any; tone: 'danger' | 'warn' | 'ok' | 'neutral' }) {
  const cls =
    tone === 'danger'
      ? 'bg-destructive/10 text-destructive border-destructive/20'
      : tone === 'warn'
        ? 'bg-amber-500/10 text-amber-700 border-amber-500/20'
        : tone === 'ok'
          ? 'bg-primary/10 text-primary border-primary/20'
          : 'bg-muted text-foreground border-border'

  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${cls}`}>
      {children}
    </span>
  )
}

function ProgressBar({ value }: { value: number }) {
  const pct = clamp((Number(value) || 0) * 100, 0, 100)
  const tone =
    pct >= 75 ? 'bg-primary'
      : pct >= 55 ? 'bg-accent'
        : 'bg-destructive'

  return (
    <div className="w-full h-3 rounded-full bg-muted overflow-hidden border border-border">
      <div className={`h-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}
