'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import toast from 'react-hot-toast'
import { createClient } from '@/utils/supabase/client'
import { insertStudentResponse } from '../insertStudentResponse'
import { updateNivelStudentPeriodo } from '../updateNivelStudentPeriodo'
import { getNivelStudentPeriodo } from '../getNivelStudent'
import { useQuestionTimer } from '@/app/hooks/useQuestionTimer'
import { fetchStudentSession } from '@/lib/student-session-client'

const supabase = createClient()
const temaPeriodoId = '1258053b-b9ef-49f8-86b5-e175e0445e36' // ⚡ Proyectiles

type Nivel = 1 | 2 | 3
type Resultado = 'sube' | 'mantiene' | 'baja'
type TipoProj = 'vertical' | 'horizontal' | 'oblicuo_R' | 'oblicuo_H' | 'oblicuo_T' | 'oblicuo_yx'

interface Pregunta {
  enunciado: string
  respuesta: number
  unidades: string
  explicacion: string
  meta: {
    nivel: Nivel
    tipo: TipoProj
    v0?: number
    theta?: number
    h0?: number
    g: number
    xTarget?: number
    canvas?: {
      v0: number
      theta: number
      h0: number
      g: number
      xTarget?: number
    }
  }
}

const MAX_TIME = 75
const TOL = 0.1
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const toRad = (deg: number) => (deg * Math.PI) / 180

const close = (a: number, b: number, tol = TOL) => Math.abs(a - b) <= tol
const r2 = (x: number) => Math.round(x * 100) / 100

// --- fórmulas
const range = (v0: number, thDeg: number, g: number) => (v0 * v0 * Math.sin(2 * toRad(thDeg))) / g
const hMax = (v0: number, thDeg: number, g: number, h0 = 0) =>
  h0 + (v0 * v0 * Math.sin(toRad(thDeg)) ** 2) / (2 * g)
const tFlight0 = (v0: number, thDeg: number, g: number) => (2 * v0 * Math.sin(toRad(thDeg))) / g
const yAtX = (x: number, v0: number, thDeg: number, g: number, h0 = 0) => {
  const th = toRad(thDeg)
  const c = Math.cos(th)
  if (Math.abs(c) < 1e-8) return h0
  return h0 + x * Math.tan(th) - (g * x * x) / (2 * v0 * v0 * c * c)
}
const tFlightGeneral = (v0: number, thDeg: number, g: number, h0 = 0) => {
  const vy0 = v0 * Math.sin(toRad(thDeg))
  const disc = vy0 * vy0 + 2 * g * Math.max(h0, 0)
  return (vy0 + Math.sqrt(disc)) / g
}

// --- generadores
function genNivel1(): Pregunta {
  const g = 10
  if (randInt(1, 2) === 1) {
    const v0 = randInt(10, 20)
    const H = (v0 * v0) / (2 * g)
    return {
      enunciado: `Se lanza verticalmente hacia arriba con velocidad inicial ${v0} m/s. ¿Cuál es la altura máxima? (g = ${g} m/s²)`,
      respuesta: H,
      unidades: 'm',
      explicacion: `H = v₀²/(2g) = ${v0}²/(2·${g}) = ${r2(H)} m.`,
      meta: { nivel: 1, tipo: 'vertical', v0, g, h0: 0, canvas: { v0, theta: 90, h0: 0, g } },
    }
  }
  const v0 = randInt(8, 20)
  const h0 = randInt(10, 30)
  const t = Math.sqrt((2 * h0) / g)
  const R = v0 * t
  return {
    enunciado: `Desde una altura de ${h0} m se lanza horizontalmente con velocidad ${v0} m/s. ¿Cuál es el alcance horizontal? (g = ${g} m/s²)`,
    respuesta: R,
    unidades: 'm',
    explicacion: `t = √(2h/g) = √(2·${h0}/${g}); R = v₀·t = ${v0}·${r2(t)} = ${r2(R)} m.`,
    meta: { nivel: 1, tipo: 'horizontal', v0, g, h0, canvas: { v0, theta: 0, h0, g } },
  }
}
function genNivel2(): Pregunta {
  const g = 10
  const v0 = randInt(10, 25)
  const theta = [30, 35, 40, 45, 50, 55, 60][randInt(0, 6)]
  const which = randInt(1, 3)
  if (which === 1) {
    const R = range(v0, theta, g)
    return {
      enunciado: `Se lanza desde el suelo con ${v0} m/s a ${theta}°. ¿Cuál es el alcance? (g = ${g} m/s²)`,
      respuesta: R, unidades: 'm',
      explicacion: `R = v₀²·sin(2θ)/g = ${v0}²·sin(${2 * theta}°)/${g} = ${r2(R)} m.`,
      meta: { nivel: 2, tipo: 'oblicuo_R', v0, theta, g, h0: 0, canvas: { v0, theta, h0: 0, g } },
    }
  }
  if (which === 2) {
    const H = hMax(v0, theta, g, 0)
    return {
      enunciado: `Se lanza con ${v0} m/s a ${theta}°. Calcula la altura máxima (g = ${g} m/s²).`,
      respuesta: H, unidades: 'm',
      explicacion: `H = v₀²·sin²θ/(2g) = ${v0}²·sin²(${theta}°)/(2·${g}) = ${r2(H)} m.`,
      meta: { nivel: 2, tipo: 'oblicuo_H', v0, theta, g, h0: 0, canvas: { v0, theta, h0: 0, g } },
    }
  }
  const T = tFlight0(v0, theta, g)
  return {
    enunciado: `Se lanza con ${v0} m/s a ${theta}°. ¿Cuánto dura el vuelo? (g = ${g} m/s²)`,
    respuesta: T, unidades: 's',
    explicacion: `T = 2·v₀·sinθ/g = 2·${v0}·sin(${theta}°)/${g} = ${r2(T)} s.`,
    meta: { nivel: 2, tipo: 'oblicuo_T', v0, theta, g, h0: 0, canvas: { v0, theta, h0: 0, g } },
  }
}
function genNivel3(): Pregunta {
  const g = 10
  const v0 = randInt(14, 26)
  const theta = [25, 30, 35, 40, 45, 50][randInt(0, 5)]
  const xTarget = randInt(15, 40)
  const y = yAtX(xTarget, v0, theta, g, 0)
  return {
    enunciado: `Un proyectil se lanza con ${v0} m/s a ${theta}°. ¿Qué altura tiene a x = ${xTarget} m? (g = ${g} m/s²)`,
    respuesta: y, unidades: 'm',
    explicacion: `y(x) = x·tanθ − (g·x²)/(2·v₀²·cos²θ) ⇒ ${r2(y)} m.`,
    meta: { nivel: 3, tipo: 'oblicuo_yx', v0, theta, g, h0: 0, xTarget, canvas: { v0, theta, h0: 0, g, xTarget } },
  }
}
const generarPregunta = (nivel: Nivel) => (nivel === 1 ? genNivel1() : nivel === 2 ? genNivel2() : genNivel3())

// --- canvas robusto con guard anti-doble render
function TrajectoryCanvas({ v0, theta, h0, g, xTarget }:{
  v0: number; theta: number; h0: number; g: number; xTarget?: number
}) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const W = 560, H = 260, pad = 36

  useLayoutEffect(() => {
    const cvs = ref.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')
    if (!ctx) return

    const th = toRad(theta)
    const vx = v0 * Math.cos(th)
    const vy0 = v0 * Math.sin(th)
    
    // Manejar caso vertical (theta = 90°)
    const isVertical = Math.abs(theta - 90) < 1
    
    let T: number, R: number, Hpeak: number, Xpeak: number
    
    if (isVertical) {
      // Movimiento vertical puro
      T = (2 * v0) / g
      R = 0
      Hpeak = h0 + (v0 * v0) / (2 * g)
      Xpeak = 0
    } else {
      T = Math.max(1e-6, tFlightGeneral(v0, theta, g, h0))
      R = Math.max(1e-3, vx * T)
      Hpeak = hMax(v0, theta, g, h0)
      Xpeak = vx * Math.max(0, vy0 / g)
    }

    // Para vertical, centrar la línea en el canvas
    const xmax = isVertical ? 1 : Math.max(R, Xpeak, xTarget || 0, 5) * 1.15
    const ymax = Math.max(Hpeak, h0 + 5) * 1.15
    
    const X = (x: number) => {
      if (isVertical) {
        return W / 2
      }
      return pad + (x / xmax) * (W - 2 * pad)
    }
    const Y = (y: number) => H - pad - (y / ymax) * (H - 2 * pad)

    // Limpiar canvas completamente
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, W, H)
    
    // Grilla
    ctx.strokeStyle = '#E5E7EB'
    ctx.lineWidth = 1
    for (let i = 1; i <= 4; i++) {
      const gx = pad + ((W - 2 * pad) * i) / 5
      const gy = pad + ((H - 2 * pad) * i) / 5
      ctx.beginPath()
      ctx.moveTo(gx, pad)
      ctx.lineTo(gx, H - pad)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(pad, gy)
      ctx.lineTo(W - pad, gy)
      ctx.stroke()
    }
    
    // Ejes
    ctx.strokeStyle = '#94A3B8'
    ctx.lineWidth = 1.5
    
    if (isVertical) {
      // Eje Y en el centro
      ctx.beginPath()
      ctx.moveTo(W / 2, H - pad)
      ctx.lineTo(W / 2, pad)
      ctx.stroke()
      // Línea del suelo
      ctx.strokeStyle = '#CBD5E1'
      ctx.beginPath()
      ctx.moveTo(pad, Y(0))
      ctx.lineTo(W - pad, Y(0))
      ctx.stroke()
    } else {
      // Ejes normales
      ctx.beginPath()
      ctx.moveTo(pad, H - pad)
      ctx.lineTo(W - pad, H - pad)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(pad, H - pad)
      ctx.lineTo(pad, pad)
      ctx.stroke()
      // Línea del suelo
      ctx.strokeStyle = '#CBD5E1'
      ctx.beginPath()
      ctx.moveTo(pad, Y(0))
      ctx.lineTo(W - pad, Y(0))
      ctx.stroke()
    }
    
    // Labels
    ctx.fillStyle = '#111827'
    ctx.font = '12px system-ui'
    if (!isVertical) {
      ctx.fillText('x (m)', W - pad - 24, H - pad + 18)
    }
    ctx.save()
    ctx.translate(pad - 24, pad + 20)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('y (m)', 0, 0)
    ctx.restore()

    // Trayectoria paramétrica con más puntos para suavidad
    ctx.strokeStyle = '#3B82F6'
    ctx.lineWidth = 3
    ctx.beginPath()
    const N = 300
    let started = false
    
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * T
      const x = isVertical ? 0 : vx * t
      const y = h0 + vy0 * t - 0.5 * g * t * t
      
      // Solo dibujar mientras y >= 0
      if (y >= 0) {
        const cx = X(x)
        const cy = Y(y)
        if (!started) {
          ctx.moveTo(cx, cy)
          started = true
        } else {
          ctx.lineTo(cx, cy)
        }
      }
    }
    ctx.stroke()

    // Puntos clave
    // Inicio
    ctx.fillStyle = '#10B981'
    ctx.beginPath()
    ctx.arc(X(0), Y(h0), 6, 0, Math.PI * 2)
    ctx.fill()
    
    // Vértice (solo si hay componente vertical positiva)
    if (vy0 > 0.01) {
      ctx.fillStyle = '#0EA5E9'
      ctx.beginPath()
      ctx.arc(X(isVertical ? 0 : Xpeak), Y(Hpeak), 6, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // Punto final (donde toca el suelo)
    if (R > 0 || isVertical) {
      ctx.fillStyle = '#F43F5E'
      ctx.beginPath()
      ctx.arc(X(isVertical ? 0 : R), Y(0), 6, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // Punto objetivo (si existe)
    if (typeof xTarget === 'number' && !isVertical && xTarget > 0) {
      const tT = xTarget / Math.max(vx, 1e-6)
      const yT = h0 + vy0 * tT - 0.5 * g * tT * tT
      if (yT >= 0 && tT <= T) {
        ctx.fillStyle = '#FACC15'
        ctx.beginPath()
        ctx.arc(X(xTarget), Y(yT), 6, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }, [v0, theta, h0, g, xTarget]) // Dependencias correctas

  return (
    <canvas 
      ref={ref} 
      width={560} 
      height={260} 
      className="rounded-lg border border-border bg-white shadow-sm" 
    />
  )
}
// --- procedimiento (mostrado al fallar)
function buildProcedure(p: Pregunta): string[] {
  const m = p.meta, g = m.g, th = m.theta ?? 0, v0 = m.v0 ?? 0, h0 = m.h0 ?? 0
  const L: string[] = []
  switch (m.tipo) {
    case 'vertical': L.push(`H = v₀²/(2g) = ${v0}²/(2·${g}) = ${r2((v0*v0)/(2*g))} m`); break
    case 'horizontal': {
      const t = Math.sqrt((2*h0)/g), R = v0*t
      L.push(`t = √(2h/g) = ${r2(t)} s`, `R = v₀·t = ${v0}·${r2(t)} = ${r2(R)} m`); break
    }
    case 'oblicuo_R': L.push(`R = v₀²·sin(2θ)/g = ${v0}²·sin(${2*th}°)/${g} = ${r2(range(v0,th,g))} m`); break
    case 'oblicuo_H': L.push(`H = v₀²·sin²θ/(2g) = ${v0}²·sin²(${th}°)/(2·${g}) = ${r2(hMax(v0,th,g,0))} m`); break
    case 'oblicuo_T': L.push(`T = 2·v₀·sinθ/g = 2·${v0}·sin(${th}°)/${g} = ${r2(tFlight0(v0,th,g))} s`); break
    case 'oblicuo_yx': {
      const x = m.xTarget ?? 0, thR = toRad(th)
      const y = h0 + x*Math.tan(thR) - (g*x*x)/(2*v0*v0*Math.cos(thR)**2)
      L.push(`y(x) = h₀ + x·tanθ − (g·x²)/(2·v₀²·cos²θ) = ${r2(y)} m`); break
    }
  }
  L.push(`✅ Respuesta correcta: ${r2(p.respuesta)} ${p.unidades}`)
  return L
}

// --- componente principal
export function TiroParabolicoGame() {
  const [nivel, setNivel] = useState<Nivel>(1)
  const [pregunta, setPregunta] = useState<Pregunta | null>(null)
  const [respuesta, setRespuesta] = useState('')
  const [aciertos, setAciertos] = useState(0)
  const [errores, setErrores] = useState(0)
  const [showProc, setShowProc] = useState(false)
  const [procLines, setProcLines] = useState<string[]>([])
  const [pendingNextLevel, setPendingNextLevel] = useState<Nivel | null>(null) // para “Siguiente ejercicio” tras error
  const { elapsedSeconds, start, reset } = useQuestionTimer()
  const [student, setStudent] = useState<any>(null)

  useEffect(() => {
  const init = async () => {
    const session = await fetchStudentSession()
    if (!session?.id) return
    const st = await supabase.from('students').select('*').eq('id', session.id).single()
    if (!st.data) return
    setStudent(st.data)
    const nivelDB = await getNivelStudentPeriodo(st.data.id, temaPeriodoId)
    const n = (nivelDB ?? 1) as Nivel
    setNivel(n); setPregunta(generarPregunta(n))
    setShowProc(false); setPendingNextLevel(null)
    reset(); start()
  }
  init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])

  useEffect(() => {
    if (elapsedSeconds >= MAX_TIME && pregunta) {
      toast.error('⏳ Se acabó el tiempo')
      verificar(true) // marca como fallo, pero usando el mismo pipeline
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds])

  const reiniciar = (n: Nivel) => {
    setPregunta(generarPregunta(n))
    setRespuesta('')
    setShowProc(false)
    setPendingNextLevel(null)
    reset(); start()
  }

  // procesa y decide nivel; NO auto-avanza en fallo
  const procesar = async (ok: boolean) => {
    if (!student || !pregunta) return
    let decision: Resultado = 'mantiene'
    const nuevosA = ok ? aciertos + 1 : 0
    const nuevosE = ok ? 0 : errores + 1

    if (ok && nuevosA >= 3 && nivel < 3) decision = 'sube'
    else if (!ok && nuevosE >= 3 && nivel > 1) decision = 'baja'

    if (decision === 'sube') {
      toast.success('¡Subiste de nivel! 🚀'); confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } })
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
      es_correcto: ok,
      ejercicio_data: pregunta,
      respuesta: { valor: Number(respuesta), tiempo: elapsedSeconds, unidades: pregunta.unidades },
      tiempo_segundos: elapsedSeconds,
    })

    setAciertos(nuevosA); setErrores(nuevosE)
    const siguiente = decision === 'sube' ? ((nivel + 1) as Nivel) : decision === 'baja' ? ((nivel - 1) as Nivel) : nivel
    return siguiente
  }

  // wrap para reutilizar en timeout
  const verificar = async (wasTimeout = false) => {
    if (!pregunta) return
if (respuesta.trim() === '') {
  toast.error('Ingresa tu respuesta antes de verificar')
  return
}
const val = Number(respuesta)
if (!Number.isFinite(val)) {
  toast.error('Ingresa un número válido')
  return
}
const ok = !wasTimeout && close(val, pregunta.respuesta)


    if (ok) {
      toast.success('✅ Correcto'); confetti({ particleCount: 90 })
      const next = await procesar(true)
      // auto-avanza solo si es correcto
      setTimeout(() => reiniciar(next ?? nivel), 600)
    } else {
      if (!Number.isFinite(val) && !wasTimeout) toast.error('Ingresa un número válido')
      else toast.error('❌ Incorrecto')
      setProcLines(buildProcedure(pregunta)); setShowProc(true)
      const next = await procesar(false)
      // NO avanzar: el usuario decide
      setPendingNextLevel(next ?? nivel)
    }
  }

  if (!pregunta) {
    return <div className="mx-auto max-w-2xl bg-card rounded-2xl shadow-md p-6 text-center">Cargando…</div>
  }

  const D = pregunta.meta
  const remaining = Math.max(0, MAX_TIME - elapsedSeconds)
  const pct = (remaining / MAX_TIME) * 100
  const color = pct > 60 ? 'bg-green-500' : pct > 30 ? 'bg-yellow-400' : 'bg-red-500'

  return (
    <div className="mx-auto max-w-2xl bg-card rounded-2xl shadow-md overflow-hidden">
      {/* header */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold">Tiro Parabólico</h2>
          <span className="text-sm font-medium bg-white/20 px-2 py-1 rounded-lg">Nivel {nivel}</span>
        </div>
        <div className="mt-3">
          <div className="h-2 w-full bg-white/30 rounded-full overflow-hidden">
            <div className={`h-2 ${color}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 text-xs text-white/90 text-right">{Math.ceil(remaining)}s restantes</div>
        </div>
      </div>

      {/* body */}
      <div className="p-6 space-y-5">
        <p className="text-lg md:text-xl text-foreground text-center leading-relaxed">{pregunta.enunciado}</p>

        {/* retro arriba al fallar */}
        {showProc && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div className="text-destructive font-semibold mb-1">Solución paso a paso</div>
            <ul className="list-disc pl-5 text-sm text-foreground/90 space-y-1">
              {procLines.map((l, i) => (<li key={i}>{l}</li>))}
            </ul>
          </div>
        )}

        {/* canvas */}
        {D.canvas && (
          <div className="flex items-center justify-center">
            <TrajectoryCanvas
              v0={D.canvas.v0}
              theta={D.canvas.theta}
              h0={D.canvas.h0}
              g={D.canvas.g}
              xTarget={D.canvas.xTarget}
            />
          </div>
        )}

        {/* chips */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {'v0' in D && typeof D.v0 === 'number' && (
            <span className="inline-flex items-center gap-1 text-sm bg-input border border-border px-2 py-1 rounded-lg">
              velocidad inicial: <b>{D.v0}</b> <span className="text-muted-foreground">m/s</span>
            </span>
          )}
          {'theta' in D && typeof D.theta === 'number' && (
            <span className="inline-flex items-center gap-1 text-sm bg-input border border-border px-2 py-1 rounded-lg">
              ángulo: <b>{D.theta}°</b>
            </span>
          )}
          {'h0' in D && typeof D.h0 === 'number' && D.h0! > 0 && (
            <span className="inline-flex items-center gap-1 text-sm bg-input border border-border px-2 py-1 rounded-lg">
              altura inicial: <b>{D.h0}</b> <span className="text-muted-foreground">m</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-sm bg-input border border-border px-2 py-1 rounded-lg">
            g: <b>{D.g}</b> <span className="text-muted-foreground">m/s²</span>
          </span>
          {'xTarget' in D && typeof D.xTarget === 'number' && (
            <span className="inline-flex items-center gap-1 text-sm bg-input border border-border px-2 py-1 rounded-lg">
              x objetivo: <b>{D.xTarget}</b> <span className="text-muted-foreground">m</span>
            </span>
          )}
        </div>

        {/* input */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              step="any"
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              placeholder="Tu respuesta"
              className="w-64 text-center text-xl bg-white text-foreground border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="absolute inset-y-0 right-2 flex items-center text-sm text-muted-foreground">
              {' '}{pregunta.unidades}
            </span>
          </div>
        </div>

        {/* acciones: solo Verificar; si falló, aparece “Siguiente ejercicio” */}
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => verificar(false)} className="bg-primary text-primary-foreground font-semibold px-5 py-2 rounded-lg hover:opacity-95 transition">
            Verificar
          </button>

          {showProc && (
            <button
              onClick={() => reiniciar(pendingNextLevel ?? nivel)}
              className="bg-muted text-foreground font-semibold px-5 py-2 rounded-lg hover:bg-input transition border border-border"
            >
              Siguiente ejercicio
            </button>
          )}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          ⏱ {elapsedSeconds}s | ✅ {aciertos} | ❌ {errores}
        </div>
      </div>
    </div>
  )
}

