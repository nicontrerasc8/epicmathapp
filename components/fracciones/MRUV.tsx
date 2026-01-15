'use client'

import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import toast from 'react-hot-toast'
import { createClient } from '@/utils/supabase/client'
import { insertStudentResponse } from '../insertStudentResponse'
import { updateNivelStudentPeriodo } from '../updateNivelStudentPeriodo'
import { getNivelStudentPeriodo } from '../getNivelStudent'
import { useQuestionTimer } from '@/app/hooks/useQuestionTimer'
import { fetchStudentSession } from '@/lib/student-session-client'

const supabase = createClient()
const temaPeriodoId = 'eecf95a6-3b5c-4a3a-bd58-b5587dd86cdb' // ⚡ MRUV (tu UUID)

// ===== Tipos =====
type Nivel = 1 | 2 | 3
type Tiempo = 'rapido' | 'moderado' | 'lento'
type Mejora = 'mejora' | 'estable' | 'empeora'
type Resultado = 'sube' | 'mantiene' | 'baja'
type TipoMRUV =
  | 'vf_desde_at'
  | 'x_desde_at'
  | 'a_desde_v0vf_t'
  | 'x_desde_v0at'
  | 't_desde_xv0a'
  | 'v0_desde_xvfa'
  | 'area_vt'

interface Pregunta {
  enunciado: string
  respuesta: number
  unidades: string
  explicacion: string
  meta: {
    nivel: Nivel
    tipo: TipoMRUV
    v0?: number
    a?: number
    t?: number
    vf?: number
    x?: number
    canvas?: { kind: 'vt'; v0: number; a: number; t: number }
  }
}

// ===== Config =====
const MAX_TIME = 75
const TOL = 1e-6

// ===== Helpers =====
const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min
const almostEqual = (a: number, b: number, tol = TOL) => Math.abs(a - b) <= tol
const getTiempoCategoria = (s: number): Tiempo =>
  s <= 20 ? 'rapido' : s <= 45 ? 'moderado' : 'lento'
const getTendencia = (hist: boolean[]): Mejora => {
  if (hist.length < 3) return 'estable'
  const ult = hist.slice(-3).filter(Boolean).length
  if (ult === 3) return 'mejora'
  if (ult === 0) return 'empeora'
  return 'estable'
}

// ===== Generadores por nivel (plantillas controladas) =====
const genNivel1 = (): Pregunta => {
  const which = randInt(1, 3)

  if (which === 1) {
    const a = randInt(1, 4)
    const t = randInt(2, 9)
    const v0 = 0
    const vf = v0 + a * t
    return {
      enunciado: `Un cuerpo parte del reposo y acelera uniformemente con aceleración a = ${a} m/s² durante t = ${t} s. Calcula la velocidad final.`,
      respuesta: vf,
      unidades: 'm/s',
      explicacion: `velocidad final = velocidad inicial + a·t = 0 + ${a}·${t} = ${vf} m/s.`,
      meta: { nivel: 1, tipo: 'vf_desde_at', v0, a, t, vf },
    }
  }

  if (which === 2) {
    const a = randInt(1, 4)
    const t = randInt(2, 9)
    const x = 0.5 * a * t * t
    return {
      enunciado: `Un móvil parte del reposo con aceleración constante a = ${a} m/s² durante t = ${t} s. ¿Qué distancia recorre?`,
      respuesta: x,
      unidades: 'm',
      explicacion: `desplazamiento = ½·a·t² = 0.5·${a}·${t}² = ${x} m.`,
      meta: { nivel: 1, tipo: 'x_desde_at', v0: 0, a, t, x },
    }
  }

  const v0 = randInt(1, 6)
  const a = randInt(1, 4)
  const t = randInt(2, 8)
  const vf = v0 + a * t
  return {
    enunciado: `Un móvil pasa de velocidad inicial v0 = ${v0} m/s a velocidad final = ${vf} m/s en t = ${t} s con aceleración constante. Calcula la aceleración.`,
    respuesta: a,
    unidades: 'm/s²',
    explicacion: `aceleración = (velocidad final − velocidad inicial)/t = (${vf} − ${v0})/${t} = ${a} m/s².`,
    meta: { nivel: 1, tipo: 'a_desde_v0vf_t', v0, vf, t, a },
  }
}

const genNivel2 = (): Pregunta => {
  const which = randInt(1, 3)

  if (which === 1) {
    const v0 = randInt(1, 7)
    const a = randInt(1, 4)
    const t = randInt(3, 9)
    const x = v0 * t + 0.5 * a * t * t
    return {
      enunciado: `Un móvil tiene velocidad inicial v0 = ${v0} m/s y acelera con a = ${a} m/s² durante t = ${t} s. Calcula el desplazamiento.`,
      respuesta: x,
      unidades: 'm',
      explicacion: `desplazamiento = v0·t + ½·a·t² = ${v0}·${t} + 0.5·${a}·${t}² = ${x} m.`,
      meta: { nivel: 2, tipo: 'x_desde_v0at', v0, a, t, x },
    }
  }

  if (which === 2) {
    const v0 = randInt(1, 7)
    const a = randInt(1, 4)
    const t = randInt(2, 9)
    const x = v0 * t + 0.5 * a * t * t
    return {
      enunciado: `Se sabe que un móvil con velocidad inicial v0 = ${v0} m/s y a = ${a} m/s² recorre x = ${x} m. Determina el tiempo de movimiento.`,
      respuesta: t,
      unidades: 's',
      explicacion: `x = v0·t + ½·a·t² ⇒ ${x} = ${v0}·t + 0.5·${a}·t². (Generado con t = ${t} s).`,
      meta: { nivel: 2, tipo: 't_desde_xv0a', v0, a, x, t },
    }
  }

  const a = randInt(1, 4)
  const t = randInt(3, 9)
  const v0 = randInt(1, 9)
  const vf = v0 + a * t
  const x = v0 * t + 0.5 * a * t * t
  return {
    enunciado: `Un móvil recorre x = ${x} m y alcanza velocidad final = ${vf} m/s con aceleración a = ${a} m/s² tras cierto tiempo t. Determina la velocidad inicial v0.`,
    respuesta: v0,
    unidades: 'm/s',
    explicacion: `Con MRUV: velocidad final = v0 + a·t y x = v0·t + ½·a·t² (datos consistentes con v0 = ${v0}).`,
    meta: { nivel: 2, tipo: 'v0_desde_xvfa', v0, a, t, vf, x },
  }
}

const genNivel3 = (): Pregunta => {
  const v0 = randInt(0, 6)
  const a = randInt(1, 4)
  const t = randInt(4, 10)
  const x = v0 * t + 0.5 * a * t * t
  return {
    enunciado: `En el gráfico velocidad–tiempo, un móvil parte con velocidad inicial v0 = ${v0} m/s y aceleración constante a = ${a} m/s² hasta t = ${t} s. Calcula el desplazamiento (área bajo la curva).`,
    respuesta: x,
    unidades: 'm',
    explicacion: `Área v–t = v0·t + ½·a·t² = ${v0}·${t} + 0.5·${a}·${t}² = ${x} m.`,
    meta: { nivel: 3, tipo: 'area_vt', v0, a, t, x, canvas: { kind: 'vt', v0, a, t } },
  }
}

const generarPregunta = (nivel: Nivel): Pregunta => {
  if (nivel === 1) return genNivel1()
  if (nivel === 2) return genNivel2()
  return genNivel3()
}

// ===== UI helpers =====
function DataBadge({ label, value, unit }: { label: string; value: number | string; unit: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm bg-input border border-border px-2 py-1 rounded-lg">
      <span className="text-foreground/90">{label}:</span>
      <span className="font-semibold">{value}</span>
      <span className="text-muted-foreground">{unit}</span>
    </span>
  )
}

// ===== Barra de tiempo =====
function TimeBar({ elapsed }: { elapsed: number }) {
  const remaining = Math.max(0, MAX_TIME - elapsed)
  const pct = Math.max(0, Math.min(100, (remaining / MAX_TIME) * 100))
  const color = pct > 60 ? 'bg-green-500' : pct > 30 ? 'bg-yellow-400' : 'bg-red-500'
  return (
    <div className="w-full">
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border">
        <div className={`h-2 ${color} transition-all duration-100`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-xs text-white/90 text-right">{remaining}s restantes</div>
    </div>
  )
}

// ===== Canvas v–t =====
function VTGraph({ v0, a, t }: { v0: number; a: number; t: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const dims = { w: 540, h: 240, pad: 36 }
  const vmax = Math.max(v0 + a * t, v0) * 1.2 + 1
  const tmax = t * 1.1

  useEffect(() => {
  const init = async () => {
    const session = await fetchStudentSession()
    if (!session?.id) return
    const st = await supabase.from('students').select('*').eq('id', session.id).single()
    if (!st.data) return
    setStudent(st.data)
    const nivelDB = await getNivelStudentPeriodo(st.data.id, temaPeriodoId)
    const n = (nivelDB ?? 1) as Nivel
    setNivel(n)
    setPregunta(generarPregunta(n))
    reset()
    start()
  }
  init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])

  useEffect(() => {
    if (elapsedSeconds >= MAX_TIME && pregunta) {
      toast.error('⏳ Se acabó el tiempo')
      procesar(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds])

  const reiniciar = (nuevoNivel: Nivel) => {
    setPregunta(generarPregunta(nuevoNivel))
    setRespuesta('')
    reset()
    start()
  }

  const procesar = async (esCorrecto: boolean) => {
    if (!student || !pregunta) return

    const nuevosAciertos = esCorrecto ? aciertos + 1 : 0
    const nuevosErrores = esCorrecto ? 0 : errores + 1

    let decision: Resultado = 'mantiene'
    if (esCorrecto && nuevosAciertos >= 3 && nivel < 3) decision = 'sube'
    else if (!esCorrecto && nuevosErrores >= 3 && nivel > 1) decision = 'baja'

    if (decision === 'sube') {
      toast.success('¡Subiste de nivel! 🚀')
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } })
      await updateNivelStudentPeriodo(student.id, temaPeriodoId, (nivel + 1) as Nivel)
      setNivel((nivel + 1) as Nivel)
    } else if (decision === 'baja') {
      toast.error('Bajaste de nivel 📉')
      await updateNivelStudentPeriodo(student.id, temaPeriodoId, (nivel - 1) as Nivel)
      setNivel((nivel - 1) as Nivel)
    }

    await insertStudentResponse({
      student_id: student.id,
      tema_periodo_id: temaPeriodoId,
      nivel,
      es_correcto: esCorrecto,
      ejercicio_data: pregunta,
      respuesta: { valor: Number(respuesta), tiempo: elapsedSeconds, unidades: pregunta.unidades },
      tiempo_segundos: elapsedSeconds,
    })

    setHistorial((prev) => [...prev, esCorrecto])
    setAciertos(nuevosAciertos)
    setErrores(nuevosErrores)

    const siguienteNivel =
      decision === 'sube' ? ((nivel + 1) as Nivel) :
      decision === 'baja' ? ((nivel - 1) as Nivel) :
      nivel

    setTimeout(() => reiniciar(siguienteNivel), 600)
  }

  const verificar = async () => {
    if (!pregunta) return
    const val = Number(respuesta)
    if (!Number.isFinite(val)) {
      toast.error('Ingresa un número válido')
      return
    }
    const ok = almostEqual(val, pregunta.respuesta)
    if (ok) {
      toast.success('✅ Correcto')
      confetti({ particleCount: 90 })
    } else {
      toast.error('❌ Incorrecto')
    }
    await procesar(ok)
  }

  if (!pregunta) {
    return <div className="mx-auto max-w-2xl bg-card rounded-2xl shadow-md p-6 text-center">Cargando…</div>
  }

  const D = pregunta.meta

  return (
    <div className="mx-auto max-w-2xl bg-card rounded-2xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold">MRUV · Aceleración constante</h2>
          <span className="text-sm font-medium bg-white/20 px-2 py-1 rounded-lg">Nivel {nivel}</span>
        </div>
        <div className="mt-3"><TimeBar elapsed={elapsedSeconds} /></div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-5">
        <p className="text-lg md:text-xl text-foreground text-center leading-relaxed">{pregunta.enunciado}</p>

        {/* Chips de datos */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {typeof D.v0 === 'number' && <DataBadge label="velocidad inicial" value={D.v0} unit="m/s" />}
          {typeof D.vf === 'number' && <DataBadge label="velocidad final" value={D.vf} unit="m/s" />}
          {typeof D.a === 'number' && <DataBadge label="aceleración" value={D.a} unit="m/s²" />}
          {typeof D.t === 'number' && <DataBadge label="tiempo" value={D.t} unit="s" />}
        </div>

        {/* Canvas (nivel 3) */}
        {D.canvas?.kind === 'vt' && <VTGraph v0={D.canvas.v0} a={D.canvas.a} t={D.canvas.t} />}

        {/* Pistas */}
        <details className="w-full mx-auto max-w-md bg-input rounded-lg border border-border p-3 open:shadow-sm">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">📘 Formulitas (ver pista)</summary>
          <div className="mt-2 text-sm text-foreground/80 space-y-1">
            <p>• <b>velocidad final = velocidad inicial + a·t</b></p>
            <p>• <b>desplazamiento = v0·t + ½·a·t²</b></p>
            <p>• <b>área (v–t) = v0·t + ½·a·t²</b></p>
          </div>
        </details>

        {/* Input */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              step="any"
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              placeholder="Tu respuesta"
              aria-label="Tu respuesta"
              className="w-64 text-center text-xl bg-white text-foreground border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="absolute inset-y-0 right-2 flex items-center text-sm text-muted-foreground">
              {` ${pregunta.unidades}`}
            </span>
          </div>
        </div>

        {/* Botones */}
        <div className="flex items-center justify-center gap-3">
          <button onClick={verificar} className="bg-primary text-primary-foreground font-semibold px-5 py-2 rounded-lg hover:opacity-95 transition">Verificar</button>
          <button onClick={() => reiniciar(nivel)} className="bg-muted text-foreground font-semibold px-5 py-2 rounded-lg hover:bg-input transition border border-border">Siguiente</button>
        </div>

        <div className="text-center text-sm text-muted-foreground">⏱ {elapsedSeconds}s | ✅ {aciertos} | ❌ {errores}</div>

        {/* Explicación */}
        <div className="mt-2 text-xs text-muted-foreground/90 text-center">
          <span className="inline-block px-2 py-1 bg-input rounded-md border border-border">
            {pregunta.explicacion} <i>Respuesta en {pregunta.unidades}.</i>
          </span>
        </div>
      </div>
    </div>
  )
}

