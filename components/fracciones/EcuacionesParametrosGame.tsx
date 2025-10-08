'use client'

import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import toast from 'react-hot-toast'
import DecisionTree from 'decision-tree'
import { createClient } from '@/utils/supabase/client'
import { insertStudentResponse } from '../insertStudentResponse'
import { updateNivelStudentPeriodo } from '../updateNivelStudentPeriodo'
import { getNivelStudentPeriodo } from '../getNivelStudent'
import { useQuestionTimer } from '@/app/hooks/useQuestionTimer'

const supabase = createClient()
const temaPeriodoId = '4a389b1d-22c6-4a1a-b786-ae4ccaa7899f' // ⚡ Ecuaciones

// ===== Tipos =====
type Nivel = 1 | 2 | 3
type Tiempo = 'rapido' | 'moderado' | 'lento'
type Mejora = 'mejora' | 'estable' | 'empeora'
type Resultado = 'sube' | 'mantiene' | 'baja'

interface Pregunta {
  enunciado: string
  respuesta: number
  explicacion: string
  meta: { nivel: Nivel; tipo: 'lineal' | 'sum-prod' | 'param-cuad'; S?: number; P?: number; k?: number }
}

// ===== Config =====
const MAX_TIME = 45 // segundos por pregunta
const CLASS_NAME = 'resultado'
const FEATURES = ['nivel', 'aciertos', 'errores', 'tiempo_promedio', 'mejora']

// Helpers de tiempo
const getTiempoCategoria = (s: number): Tiempo =>
  s <= 15 ? 'rapido' : s <= 30 ? 'moderado' : 'lento'

const getTendencia = (hist: boolean[]): Mejora => {
  if (hist.length < 3) return 'estable'
  const ult = hist.slice(-3).filter(Boolean).length
  if (ult === 3) return 'mejora'
  if (ult === 0) return 'empeora'
  return 'estable'
}

// ===== Generador de preguntas tipo admisión =====
const generarPregunta = (nivel: Nivel): Pregunta => {
  if (nivel === 1) {
    // ax + c = b  →  x = (b - c)/a   (enteros)
    const a = Math.floor(Math.random() * 7) + 2       // 2..8
    const x = Math.floor(Math.random() * 11) - 5      // -5..5
    let c = Math.floor(Math.random() * 21) - 10       // -10..10
    if (c === 0) c = 1
    const b = a * x + c
    return {
      enunciado: `Si ${a}x ${c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`} = ${b}, halla x.`,
      respuesta: (b - c) / a,
      explicacion: `Despeja: x = (b − c)/a = (${b} − ${c})/${a} = ${(b - c) / a}.`,
      meta: { nivel, tipo: 'lineal' },
    }
  }

  if (nivel === 2) {
    // Dan S = x+y y P = xy → x² + y² = S² − 2P
    const x = Math.floor(Math.random() * 7) + 1      // 1..7
    const y = Math.floor(Math.random() * 7) + 2      // 2..8
    const S = x + y
    const P = x * y
    return {
      enunciado: `Si x + y = ${S} y xy = ${P}, halla x² + y².`,
      respuesta: S * S - 2 * P,
      explicacion: `Usa la identidad: (x + y)² = x² + y² + 2xy ⇒ x² + y² = ${S}² − 2·${P} = ${S * S - 2 * P}.`,
      meta: { nivel, tipo: 'sum-prod', S, P },
    }
  }

  // nivel === 3
  // Raíces de x² − Sx + k = 0. Dan E = a² + b². Identidad: E = S² − 2k ⇒ k = (S² − E)/2
  const S = Math.floor(Math.random() * 10) + 6       // 6..15
  const k = Math.floor(Math.random() * 20) + 6       // 6..25
  const E = S * S - 2 * k
  return {
    enunciado: `Si a y b son raíces de x² − ${S}x + k = 0 y a² + b² = ${E}, halla k.`,
    respuesta: k,
    explicacion: `a² + b² = (a + b)² − 2ab = ${S}² − 2k ⇒ ${E} = ${S * S} − 2k ⇒ k = (${S * S} − ${E})/2 = ${k}.`,
    meta: { nivel, tipo: 'param-cuad', S, k },
  }
}

// ===== Barra de tiempo =====
function TimeBar({ elapsed }: { elapsed: number }) {
  const remaining = Math.max(0, MAX_TIME - elapsed)
  const pct = Math.max(0, Math.min(100, (remaining / MAX_TIME) * 100))
  const color =
    pct > 60 ? 'bg-green-500' : pct > 30 ? 'bg-yellow-400' : 'bg-red-500'
  return (
    <div className="w-full">
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border">
        <div
          className={`h-2 ${color} transition-all duration-100`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-muted-foreground text-right">
        {remaining}s restantes
      </div>
    </div>
  )
}

// ===== Componente principal =====
export function EcuacionesParametrosGame() {
  const [nivel, setNivel] = useState<Nivel>(1)
  const [pregunta, setPregunta] = useState<Pregunta | null>(null)
  const [respuesta, setRespuesta] = useState('')
  const [historial, setHistorial] = useState<boolean[]>([])
  const [aciertos, setAciertos] = useState(0)
  const [errores, setErrores] = useState(0)
  const { elapsedSeconds, start, reset } = useQuestionTimer()
  const [student, setStudent] = useState<any>(null)
  const [decisionTree] = useState<any>(null) // si luego quieres cargar DT desde supabase, lo metemos aquí

  const supabase = createClient()

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
      reset()
      start()
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-fallo por tiempo
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

    const tiempoCat = getTiempoCategoria(elapsedSeconds)
    const tendencia = getTendencia([...historial, esCorrecto])

    let decision: Resultado = 'mantiene'
    const nuevosAciertos = esCorrecto ? aciertos + 1 : 0
    const nuevosErrores = esCorrecto ? 0 : errores + 1

    // Reglas simples (puedes reemplazar por decisionTree.predict(sample))
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
      ejercicio_data: pregunta, // ya nunca es null aquí
      respuesta: { valor: parseFloat(respuesta), tiempo: elapsedSeconds },
      tiempo_segundos: elapsedSeconds,
    })

    setHistorial(prev => [...prev, esCorrecto])
    setAciertos(nuevosAciertos)
    setErrores(nuevosErrores)

    const siguienteNivel =
      decision === 'sube' ? ((nivel + 1) as Nivel)
      : decision === 'baja' ? ((nivel - 1) as Nivel)
      : nivel

    // Pequeña pausa visual
    setTimeout(() => reiniciar(siguienteNivel), 600)
  }

  const verificar = async () => {
    if (!pregunta) return
    const user = Number(respuesta)
    if (!Number.isFinite(user)) {
      toast.error('Ingresa un número válido')
      return
    }
    const ok = Math.abs(user - pregunta.respuesta) < 1e-9
    if (ok) {
      toast.success('✅ Correcto')
      confetti({ particleCount: 90 })
    } else {
      toast.error(`❌ Incorrecto`)
    }
    await procesar(ok)
  }

  if (!pregunta) {
    return (
      <div className="mx-auto max-w-2xl bg-card rounded-2xl shadow-md p-6 text-center">
        Cargando…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl bg-card rounded-2xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold">Ecuaciones tipo admisión</h2>
          <span className="text-sm font-medium bg-white/20 px-2 py-1 rounded-lg">Nivel {nivel}</span>
        </div>
        <div className="mt-3">
          <TimeBar elapsed={elapsedSeconds} />
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-5">
        <p className="text-lg md:text-xl text-foreground text-center leading-relaxed">
          {pregunta.enunciado}
        </p>

        <details className="w-full mx-auto max-w-md bg-input rounded-lg border border-border p-3 open:shadow-sm">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">
            📘 Formulitas (ver pista)
          </summary>
          <div className="mt-2 text-sm text-foreground/80 space-y-1">
            <p>• Lineal: <b>ax + c = b ⇒ x = (b − c)/a</b></p>
            <p>• Suma-producto: <b>x² + y² = (x + y)² − 2xy</b></p>
            <p>• Parámetro: <b>a² + b² = (a + b)² − 2ab</b></p>
          </div>
        </details>

        <div className="flex items-center justify-center">
          <input
            type="number"
            inputMode="numeric"
            step="any"
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            placeholder="Tu respuesta"
            aria-label="Tu respuesta"
            className="w-48 text-center text-xl bg-white text-foreground border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={verificar}
            className="bg-primary text-primary-foreground font-semibold px-5 py-2 rounded-lg hover:opacity-95 transition"
          >
            Verificar
          </button>
          <button
            onClick={() => reiniciar(nivel)}
            className="bg-muted text-foreground font-semibold px-5 py-2 rounded-lg hover:bg-input transition border border-border"
          >
            Siguiente
          </button>
        </div>

      

        {/* Explicación (solo para demo a academias; podrías ocultarlo a estudiantes) */}
        <div className="mt-2 text-xs text-muted-foreground/90 text-center">
          <span className="inline-block px-2 py-1 bg-input rounded-md border border-border">
            {pregunta.explicacion}
          </span>
        </div>
      </div>
    </div>
  )
}
