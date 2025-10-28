'use client'

import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import toast from 'react-hot-toast'
import { createClient } from '@/utils/supabase/client'
import { insertStudentResponse } from '../insertStudentResponse'
import { updateNivelStudentPeriodo } from '../updateNivelStudentPeriodo'
import { getNivelStudentPeriodo } from '../getNivelStudent'
import { useQuestionTimer } from '@/app/hooks/useQuestionTimer'

const supabase = createClient()
const temaPeriodoId = '064afa72-0bcf-4b82-9f81-8f88e502f26f' // ⚡ Trabajo y Energía

// ===== Tipos =====
type Nivel = 1 | 2 | 3
type Resultado = 'sube' | 'mantiene' | 'baja'

interface Pregunta {
  enunciado: string
  respuesta: number
  unidades: string
  explicacion: string
  meta: {
    nivel: Nivel
    tipo: 'horizontal' | 'sin_friccion' | 'con_friccion'
    m?: number
    F?: number
    d?: number
    h?: number
    g?: number
    θ?: number
    μ?: number
    v?: number
    canvas?: {
      kind: 'rampa' | 'horizontal'
      θ?: number
      μ?: number
      m?: number
      d?: number
      g?: number
      F?: number
    }
  }
}

const MAX_TIME = 75
const TOL = 1e-4
const toRad = (deg: number) => (deg * Math.PI) / 180
const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min
const close = (a: number, b: number, tol = TOL) => Math.abs(a - b) <= tol
const round2 = (x: number) => Math.round(x * 100) / 100

// ===== Generadores =====
function genNivel1(): Pregunta {
  const F = randInt(10, 30)
  const d = randInt(2, 8)
  const W = F * d
  return {
    enunciado: `Un bloque en superficie horizontal es empujado con fuerza constante F = ${F} N a lo largo de d = ${d} m (sin fricción). Calcula el trabajo realizado.`,
    respuesta: W,
    unidades: 'J',
    explicacion: `W = F·d = ${F}·${d} = ${W} J. Este trabajo aumenta la energía cinética del bloque.`,
    meta: { 
      nivel: 1, 
      tipo: 'horizontal', 
      F, 
      d, 
      m: randInt(2, 5),
      g: 10,
      canvas: { kind: 'horizontal', F, d, m: randInt(2, 5), g: 10 }
    },
  }
}

function genNivel2(): Pregunta {
  const m = randInt(1, 5)
  const h = randInt(3, 10)
  const g = 10
  const v = Math.sqrt(2 * g * h)
  const θ = 30
  return {
    enunciado: `Un bloque de masa m = ${m} kg parte del reposo y desciende sin fricción una altura h = ${h} m. Calcula su velocidad al llegar abajo (g = ${g} m/s²).`,
    respuesta: v,
    unidades: 'm/s',
    explicacion: `Conservación: mgh = ½·m·v² ⇒ v = √(2gh) = √(2·${g}·${h}) = ${round2(v)} m/s.`,
    meta: {
      nivel: 2,
      tipo: 'sin_friccion',
      m,
      h,
      g,
      θ,
      v,
      d: h / Math.sin(toRad(θ)),
      canvas: { kind: 'rampa', θ, μ: 0, m, d: h / Math.sin(toRad(θ)), g },
    },
  }
}

function genNivel3(): Pregunta {
  const m = randInt(2, 6)
  const h = randInt(4, 8)
  const θ = randInt(20, 40)
  const μ = parseFloat((Math.random() * 0.4 + 0.1).toFixed(2))
  const g = 10
  const d = h / Math.sin(toRad(θ))
  const Wf = μ * m * g * Math.cos(toRad(θ)) * d
  const Ep = m * g * h
  const EmFinal = Ep - Wf
  return {
    enunciado: `Un bloque de ${m} kg desciende por un plano inclinado de ${θ}° desde una altura ${h} m con fricción μ = ${μ}. Calcula la energía mecánica final (g = ${g} m/s²).`,
    respuesta: EmFinal,
    unidades: 'J',
    explicacion: `Eₘf = mgh − W_fric = ${m}·${g}·${h} − ${μ}·${m}·${g}·cos(${θ}°)·${round2(d)} = ${round2(EmFinal)} J.`,
    meta: {
      nivel: 3,
      tipo: 'con_friccion',
      m,
      h,
      θ,
      μ,
      g,
      d,
      canvas: { kind: 'rampa', θ, μ, m, d, g },
    },
  }
}

const generarPregunta = (nivel: Nivel): Pregunta =>
  nivel === 1 ? genNivel1() : nivel === 2 ? genNivel2() : genNivel3()

// ===== Canvas mejorado =====
function DiagramaCanvas({ canvas }: { canvas: Pregunta['meta']['canvas'] }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const W = 540, H = 240, pad = 36

  useEffect(() => {
    if (!canvas) return
    const cvs = ref.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#F9FAFB'
    ctx.fillRect(0, 0, W, H)

    if (canvas.kind === 'horizontal') {
      // Dibujar plano horizontal
      const floorY = H - pad - 20
      
      // Suelo
      ctx.strokeStyle = '#64748B'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(pad, floorY)
      ctx.lineTo(W - pad, floorY)
      ctx.stroke()

      // Bloque
      const blockX = pad + 80
      const blockY = floorY - 40
      ctx.fillStyle = '#3B82F6'
      ctx.fillRect(blockX, blockY, 50, 40)
      ctx.strokeStyle = '#1E40AF'
      ctx.lineWidth = 2
      ctx.strokeRect(blockX, blockY, 50, 40)

      // Fuerza (flecha)
      ctx.strokeStyle = '#EF4444'
      ctx.fillStyle = '#EF4444'
      ctx.lineWidth = 3
      const arrowX = blockX + 50
      const arrowY = blockY + 20
      const arrowLen = 80
      
      // Línea
      ctx.beginPath()
      ctx.moveTo(arrowX, arrowY)
      ctx.lineTo(arrowX + arrowLen, arrowY)
      ctx.stroke()
      
      // Punta
      ctx.beginPath()
      ctx.moveTo(arrowX + arrowLen, arrowY)
      ctx.lineTo(arrowX + arrowLen - 10, arrowY - 6)
      ctx.lineTo(arrowX + arrowLen - 10, arrowY + 6)
      ctx.closePath()
      ctx.fill()

      // Etiquetas
      ctx.fillStyle = '#111827'
      ctx.font = 'bold 14px system-ui'
      ctx.fillText('F', arrowX + arrowLen + 10, arrowY + 5)
      
      ctx.font = '13px system-ui'
      ctx.fillText(`F = ${canvas.F} N`, W - 120, pad + 20)
      ctx.fillText(`d = ${canvas.d} m`, W - 120, pad + 40)
      ctx.fillText(`m = ${canvas.m} kg`, W - 120, pad + 60)

      // Flecha de distancia (abajo)
      ctx.strokeStyle = '#6B7280'
      ctx.fillStyle = '#6B7280'
      ctx.lineWidth = 1
      const distY = floorY + 25
      ctx.beginPath()
      ctx.moveTo(blockX, distY)
      ctx.lineTo(blockX + 200, distY)
      ctx.stroke()
      // Marcas
      ctx.beginPath()
      ctx.moveTo(blockX, distY - 5)
      ctx.lineTo(blockX, distY + 5)
      ctx.moveTo(blockX + 200, distY - 5)
      ctx.lineTo(blockX + 200, distY + 5)
      ctx.stroke()
      ctx.font = '12px system-ui'
      ctx.fillText('d', blockX + 95, distY - 8)

    } else if (canvas.kind === 'rampa') {
      // Dibujar rampa inclinada
      const θ = canvas.θ ?? 30
      const rad = toRad(θ)
      const rampLen = 280
      const startX = pad + 40
      const startY = H - pad - 20
      const endX = startX + rampLen * Math.cos(rad)
      const endY = startY - rampLen * Math.sin(rad)

      // Rampa
      ctx.strokeStyle = '#64748B'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.lineTo(endX, endY)
      ctx.stroke()

      // Suelo
      ctx.beginPath()
      ctx.moveTo(pad, startY)
      ctx.lineTo(W - pad, startY)
      ctx.stroke()

      // Bloque en la rampa
      const blockPos = 0.35
      const blockX = startX + rampLen * blockPos * Math.cos(rad)
      const blockY = startY - rampLen * blockPos * Math.sin(rad)
      
      ctx.save()
      ctx.translate(blockX, blockY)
      ctx.rotate(-rad)
      ctx.fillStyle = '#3B82F6'
      ctx.fillRect(-20, -20, 40, 40)
      ctx.strokeStyle = '#1E40AF'
      ctx.lineWidth = 2
      ctx.strokeRect(-20, -20, 40, 40)
      ctx.restore()

      // Peso (vector hacia abajo)
      ctx.strokeStyle = '#EF4444'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(blockX, blockY)
      ctx.lineTo(blockX, blockY + 45)
      ctx.stroke()
      // Punta
      ctx.fillStyle = '#EF4444'
      ctx.beginPath()
      ctx.moveTo(blockX, blockY + 45)
      ctx.lineTo(blockX - 4, blockY + 38)
      ctx.lineTo(blockX + 4, blockY + 38)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = '#111827'
      ctx.font = '12px system-ui'
      ctx.fillText('mg', blockX + 8, blockY + 35)

      // Fricción si aplica
      if ((canvas.μ ?? 0) > 0) {
        ctx.strokeStyle = '#F59E0B'
        ctx.lineWidth = 2
        ctx.save()
        ctx.translate(blockX, blockY)
        ctx.rotate(-rad)
        ctx.beginPath()
        ctx.moveTo(20, 0)
        ctx.lineTo(-20, 0)
        ctx.stroke()
        ctx.restore()
        
        ctx.fillStyle = '#92400E'
        ctx.font = '11px system-ui'
        ctx.fillText('f', blockX - 35, blockY - 8)
      }

      // Altura (línea vertical punteada)
      ctx.strokeStyle = '#9CA3AF'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(endX, endY)
      ctx.lineTo(endX, startY)
      ctx.stroke()
      ctx.setLineDash([])
      
      ctx.fillStyle = '#6B7280'
      ctx.font = '12px system-ui'
      ctx.fillText('h', endX + 5, (endY + startY) / 2)

      // Ángulo
      ctx.strokeStyle = '#6B7280'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(startX, startY, 30, -rad, 0)
      ctx.stroke()
      ctx.fillText(`${θ}°`, startX + 35, startY - 8)

      // Info
      ctx.fillStyle = '#111827'
      ctx.font = '13px system-ui'
      ctx.fillText(`θ = ${θ}°`, W - 110, pad + 20)
      if ((canvas.μ ?? 0) > 0) {
        ctx.fillText(`μ = ${canvas.μ}`, W - 110, pad + 40)
      }
      ctx.fillText(`m = ${canvas.m} kg`, W - 110, pad + 60)
      ctx.fillText(`g = ${canvas.g} m/s²`, W - 110, pad + 80)
    }
  }, [canvas])

  if (!canvas) return null
  return <canvas ref={ref} width={W} height={H} className="rounded-lg border border-border bg-gradient-to-br from-gray-50 to-gray-100 shadow-sm" />
}

// ===== Barras de energía mejoradas =====
type Energies = {
  Ep_i: number
  Ec_i: number
  Em_i: number
  Ep_f: number
  Ec_f: number
  Em_f: number
  W_f?: number
  W_aplicado?: number
}

function computeEnergies(meta: Pregunta['meta']): Energies {
  if (meta.tipo === 'horizontal') {
    const W = (meta.F ?? 0) * (meta.d ?? 0)
    return { 
      Ep_i: 0, 
      Ec_i: 0, 
      Em_i: 0, 
      Ep_f: 0, 
      Ec_f: W, 
      Em_f: W, 
      W_aplicado: W 
    }
  }
  if (meta.tipo === 'sin_friccion') {
    const m = meta.m ?? 0
    const h = meta.h ?? 0
    const g = meta.g ?? 10
    const Ep_i = m * g * h
    return { 
      Ep_i, 
      Ec_i: 0, 
      Em_i: Ep_i, 
      Ep_f: 0, 
      Ec_f: Ep_i, 
      Em_f: Ep_i 
    }
  }
  const m = meta.m ?? 0
  const h = meta.h ?? 0
  const g = meta.g ?? 10
  const θ = toRad(meta.θ ?? 0)
  const μ = meta.μ ?? 0
  const d = meta.d ?? 0
  const Ep_i = m * g * h
  const Wf = μ * m * g * Math.cos(θ) * d
  const Ec_f = Math.max(0, Ep_i - Wf)
  return { 
    Ep_i, 
    Ec_i: 0, 
    Em_i: Ep_i, 
    Ep_f: 0, 
    Ec_f, 
    Em_f: Ec_f, 
    W_f: Wf 
  }
}

function EnergyBars({ Ep_i, Ec_i, Em_i, Ep_f, Ec_f, Em_f, W_f, W_aplicado }: Energies) {
  const [show, setShow] = useState(false)
  
  useEffect(() => {
    setShow(false)
    const t = setTimeout(() => setShow(true), 100)
    return () => clearTimeout(t)
  }, [Ep_i, Ec_i, Ep_f, Ec_f])

  const max = Math.max(Em_i, Em_f, 10)
  const pct = (v: number) => Math.max(2, Math.min(100, (v / max) * 100))

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Inicial */}
       

        {/* Final */}
       
      </div>
    </div>
  )
}

// ===== Componente principal =====
export function TrabajoEnergiaGame() {
  const [nivel, setNivel] = useState<Nivel>(1)
  const [pregunta, setPregunta] = useState<Pregunta | null>(null)
  const [respuesta, setRespuesta] = useState('')
  const [aciertos, setAciertos] = useState(0)
  const [errores, setErrores] = useState(0)
  const { elapsedSeconds, start, reset } = useQuestionTimer()
  const [student, setStudent] = useState<any>(null)

  useEffect(() => {
    const init = async () => {
      const { data: user } = await supabase.auth.getUser()
      if (!user?.user) return
      const st = await supabase.from('students').select('*').eq('id', user.user.id).single()
      if (!st.data) return
      setStudent(st.data)
      const nivelDB = await getNivelStudentPeriodo(st.data.id, temaPeriodoId)
      const n = (nivelDB ?? 1) as Nivel
      setNivel(n)
      setPregunta(generarPregunta(n))
      reset(); start()
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

  const reiniciar = (n: Nivel) => {
    setPregunta(generarPregunta(n))
    setRespuesta('')
    reset(); start()
  }

  const procesar = async (ok: boolean) => {
    if (!student || !pregunta) return
    let decision: Resultado = 'mantiene'
    const nuevosA = ok ? aciertos + 1 : 0
    const nuevosE = ok ? 0 : errores + 1

    if (ok && nuevosA >= 3 && nivel < 3) decision = 'sube'
    else if (!ok && nuevosE >= 3 && nivel > 1) decision = 'baja'

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
      es_correcto: ok,
      ejercicio_data: pregunta,
      respuesta: { valor: Number(respuesta), tiempo: elapsedSeconds, unidades: pregunta.unidades },
      tiempo_segundos: elapsedSeconds,
    })

    setAciertos(nuevosA)
    setErrores(nuevosE)

    const siguiente =
      decision === 'sube' ? ((nivel + 1) as Nivel)
      : decision === 'baja' ? ((nivel - 1) as Nivel)
      : nivel

    setTimeout(() => reiniciar(siguiente), 600)
  }

  const verificar = async () => {
    if (!pregunta) return
    const val = Number(respuesta)
    if (!Number.isFinite(val)) {
      toast.error('Ingresa un número válido')
      return
    }
    const ok = close(val, pregunta.respuesta)
    ok ? (toast.success('✅ Correcto'), confetti({ particleCount: 90 })) : toast.error('❌ Incorrecto')
    await procesar(ok)
  }

  if (!pregunta) {
    return <div className="mx-auto max-w-2xl bg-card rounded-2xl shadow-md p-6 text-center">Cargando…</div>
  }

  const D = pregunta.meta
  const energies = computeEnergies(D)
  const remaining = Math.max(0, MAX_TIME - elapsedSeconds)
  const pct = (remaining / MAX_TIME) * 100
  const barColor = pct > 60 ? 'bg-green-500' : pct > 30 ? 'bg-yellow-400' : 'bg-red-500'

  return (
    <div className="mx-auto max-w-4xl bg-card rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold">⚡ Trabajo y Energía</h2>
          <span className="text-sm font-semibold bg-white/25 backdrop-blur-sm px-3 py-1.5 rounded-full">
            Nivel {nivel}
          </span>
        </div>
        <div className="mt-3">
          <div className="h-2.5 w-full bg-white/20 rounded-full overflow-hidden">
            <div className={`h-full ${barColor} transition-all duration-300`} style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1.5 text-xs text-white/95 text-right font-medium">
            {Math.ceil(remaining)}s restantes
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-white">
        {/* Enunciado */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-lg md:text-xl text-gray-800 text-center leading-relaxed">
            {pregunta.enunciado}
          </p>
        </div>

        {/* Diagrama */}
        {D.canvas && <DiagramaCanvas canvas={D.canvas} />}

        {/* Barras de energía */}
        <EnergyBars {...energies} />

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
              className="w-72 text-center text-2xl font-semibold bg-white text-gray-900 border-2 border-gray-300 rounded-xl px-6 py-3 focus:outline-none focus:ring-2
              focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
            />
            <span className="absolute inset-y-0 right-4 flex items-center text-base font-medium text-gray-500">
              {pregunta.unidades}
            </span>
          </div>
        </div>

        {/* Botones */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={verificar}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold px-8 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
          >
            Verificar
          </button>
          <button
            onClick={() => reiniciar(nivel)}
            className="bg-white text-gray-700 font-semibold px-8 py-3 rounded-xl hover:bg-gray-50 transition-all border-2 border-gray-300 shadow-sm hover:shadow-md"
          >
            Siguiente
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 text-sm font-medium text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="text-lg">⏱</span> {elapsedSeconds}s
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-lg">✅</span> {aciertos}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-lg">❌</span> {errores}
          </span>
        </div>

        {/* Pistas desplegables */}
        <details className="w-full max-w-2xl mx-auto bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-4 shadow-sm">
          <summary className="cursor-pointer text-sm font-bold text-indigo-900 flex items-center gap-2 hover:text-indigo-700 transition-colors">
            <span className="text-lg">💡</span> Fórmulas clave (ver ayuda)
          </summary>
          <div className="mt-3 text-sm text-gray-700 space-y-2 pl-7">
            <p>• <b>Trabajo:</b> W = F·d·cos(θ)</p>
            <p>• <b>Energía cinética:</b> Ec = ½·m·v²</p>
            <p>• <b>Energía potencial:</b> Ep = m·g·h</p>
            <p>• <b>Conservación (sin fricción):</b> Ep₁ + Ec₁ = Ep₂ + Ec₂</p>
            <p>• <b>Con fricción:</b> Eₘ_final = Eₘ_inicial − W_fricción</p>
            <p>• <b>Trabajo de fricción:</b> W_f = μ·N·d = μ·m·g·cos(θ)·d</p>
          </div>
        </details>

        {/* Explicación */}
        <div className="text-center">
          <div className="inline-block bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-gray-700">
            <b className="text-amber-800">Pista:</b> {pregunta.explicacion}
          </div>
        </div>
      </div>
    </div>
  )
}