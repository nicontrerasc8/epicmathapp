'use client'

import { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import DecisionTree from 'decision-tree'

import { useStudent } from '@/lib/hooks/useStudent'
import { createClient } from '@/utils/supabase/client'
import { useQuestionTimer } from '@/app/hooks/useQuestionTimer'
import { insertStudentResponse } from '../insertStudentResponse'
import { updateNivelStudentPeriodo } from '../updateNivelStudentPeriodo'
import { getNivelStudentPeriodo } from '../getNivelStudent'

const supabase = createClient()

// ------------------ Tipos ------------------
type Nivel = 1 | 2 | 3
type Operador = '+' | '-'

interface Pregunta {
  a: number
  b: number
  operador: Operador
  contexto: string
}

const temaPeriodoId = '37d918d2-7ab9-4b9b-b1c2-eb2712568135'

// ------------------ Overlay ------------------
const LoadingOverlay = () => (
  <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="h-12 w-12 rounded-full border-4 border-white/30 border-t-white animate-spin" />
      <p className="text-white font-semibold">Procesando…</p>
    </div>
  </div>
)

// ------------------ Utilidades ------------------
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

function generarSumaSinLlevar(min: number, max: number) {
  for (let i = 0; i < 200; i++) {
    const a = rand(min, max)
    const b = rand(min, max)
    if (a + b > 99) continue
    const aU = a % 10, bU = b % 10
    const aT = Math.floor(a / 10), bT = Math.floor(b / 10)
    if (aU + bU >= 10) continue
    if (a >= 10 || b >= 10) if (aT + bT >= 10) continue
    return { a, b }
  }
  return { a: 4, b: 3 }
}

function generarRestaSinPrestar(min: number, max: number) {
  for (let i = 0; i < 200; i++) {
    let a = rand(min, max), b = rand(min, max)
    if (a < b) [a, b] = [b, a]
    const aU = a % 10, bU = b % 10
    const aT = Math.floor(a / 10), bT = Math.floor(b / 10)
    if (aU < bU) continue
    if (a >= 10 || b >= 10) if (aT < bT) continue
    return { a, b }
  }
  return { a: 8, b: 5 }
}

function generarContexto(a: number, b: number, op: Operador) {
  const sujetos = ['María', 'Pedro', 'Ana', 'Lucho', 'Karla', 'Diego']
  const objetos = ['manzanas', 'pelotas', 'lápices', 'caramelos', 'figuritas', 'bloques']
  const s = sujetos[rand(0, sujetos.length - 1)]
  const o = objetos[rand(0, objetos.length - 1)]
  return op === '+' 
    ? `${s} tiene ${a} ${o} y recibe ${b} más. ¿Cuántas ${o} tiene ahora en total?`
    : `${s} tiene ${a} ${o} y regala ${b}. ¿Cuántas ${o} le quedan?`
}

function generarPregunta(nivel: Nivel): Pregunta {
  let a = 0, b = 0
  const op: Operador = Math.random() < 0.6 ? '+' : '-'

  // Nivel 1: valores más pequeños, pero con más variación
  if (nivel === 1) op === '+' ? ({ a, b } = generarSumaSinLlevar(1, 8)) : ({ a, b } = generarRestaSinPrestar(1, 8))

  // Nivel 2: valores medianos, mayor complejidad
  if (nivel === 2) op === '+' ? ({ a, b } = generarSumaSinLlevar(10, 20)) : ({ a, b } = generarRestaSinPrestar(10, 20))

  // Nivel 3: valores grandes y con mayor dificultad
  if (nivel === 3) op === '+' ? ({ a, b } = generarSumaSinLlevar(25, 50)) : ({ a, b } = generarRestaSinPrestar(25, 50))

  return { a, b, operador: op, contexto: generarContexto(a, b, op) }
}


// ------------------ Componente visual ------------------
function BigNumber({ value, accent = false }: { value: number | string; accent?: boolean }) {
  return (
    <div className={`px-4 py-2 rounded-xl border border-border bg-popover text-center`}>
      <span className={`text-5xl font-extrabold ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</span>
    </div>
  )
}

// ------------------ Juego ------------------
export default function SumasRestasJuego() {
  const [nivelActual, setNivelActual] = useState<Nivel>(1)
  const [pregunta, setPregunta] = useState<Pregunta | null>(null)
  const [respuesta, setRespuesta] = useState('')
  const [aciertos, setAciertos] = useState(0)
  const [errores, setErrores] = useState(0)
  const [decisionTree, setDecisionTree] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { elapsedSeconds, start, reset } = useQuestionTimer()
  const { student } = useStudent()
  const answerRef = useRef<HTMLInputElement>(null)

  // Candado
  const withLock = async (fn: () => Promise<void>) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try { await fn() } finally { setIsSubmitting(false) }
  }

  // Cargar modelo desde Supabase
  async function cargarModelo() {
    const { data, error } = await supabase
      .from('decision_trees')
      .select('modelo')
      .eq('tema_id', temaPeriodoId)
      .single()

    if (error) {
      console.error('Error cargando modelo:', error)
      return
    }

    if (data?.modelo) {
      const { trainingData, className, features } = data.modelo
      const dt = new DecisionTree(trainingData, className, features)
      setDecisionTree(dt)
    }
  }

  useEffect(() => {
    const init = async () => {
      if (student?.id) {
        const nivelBD = await getNivelStudentPeriodo(student.id, temaPeriodoId)
        const nivelInicial = (nivelBD ?? 1) as Nivel
        setNivelActual(nivelInicial)
        setPregunta(generarPregunta(nivelInicial))
        start()
        await cargarModelo()
      }
    }
    init()
  }, [student])

  if (!pregunta) return null

  // ------------------ Decisión de nivel ------------------
  const decidirNivel = async (nuevosAciertos: number, nuevosErrores: number) => {
    let nuevoNivel = nivelActual

    if (decisionTree) {
      const decision = decisionTree.predict({
        nivel: nivelActual,
        aciertos: nuevosAciertos,
        errores: nuevosErrores,
      })

      if (decision === 'sube' && nivelActual < 3) {
        nuevoNivel = (nivelActual + 1) as Nivel
        await updateNivelStudentPeriodo(student!.id, temaPeriodoId, nuevoNivel)

        setAciertos(0)
      }

      if (decision === 'baja' && nivelActual > 1) {
        nuevoNivel = (nivelActual - 1) as Nivel
        await updateNivelStudentPeriodo(student!.id, temaPeriodoId, nuevoNivel)

        setAciertos(0)
      }
    } else {
      // fallback clásico: 3 aciertos sube, 3 errores baja
      if (nuevosAciertos >= 3 && nivelActual < 3) {
        nuevoNivel = (nivelActual + 1) as Nivel
        await updateNivelStudentPeriodo(student!.id, temaPeriodoId, nuevoNivel)
        toast('¡Subiste de nivel! 🚀', { icon: '🚀' })

        setAciertos(0)
      }
      if (nuevosErrores >= 3 && nivelActual > 1) {
        nuevoNivel = (nivelActual - 1) as Nivel
        await updateNivelStudentPeriodo(student!.id, temaPeriodoId, nuevoNivel)
        toast('Bajaste de nivel 📉', { icon: '📉' })

        setAciertos(0)
      }
    }

    return nuevoNivel
  }

  // Registrar en BD
  const registrarRespuesta = async (es_correcto: boolean, respuestaNum: number) => {
    if (!student?.id || !temaPeriodoId || !pregunta) return
    await insertStudentResponse({
      student_id: student.id,
      tema_periodo_id: temaPeriodoId,
      nivel: nivelActual,
      es_correcto,
      ejercicio_data: pregunta,
      respuesta: { numerador: respuestaNum, denominador: 1 },
      tiempo_segundos: elapsedSeconds,
    })
  }

  const reiniciarEjercicio = (nuevoNivel: Nivel) => {
    setPregunta(generarPregunta(nuevoNivel))
    setRespuesta('')
    reset()
    start()
    answerRef.current?.focus()
  }

  const verificar = async () => {
    const userAns = parseInt(respuesta)
    if (Number.isNaN(userAns)) {
      toast.error('Escribe tu respuesta.')
      return
    }
    const esperado =
      pregunta!.operador === '+'
        ? pregunta!.a + pregunta!.b
        : pregunta!.operador === '-'
        ? pregunta!.a - pregunta!.b
        : pregunta!.a * pregunta!.b

    if (userAns === esperado) {
      await registrarRespuesta(true, userAns)
      toast.success('🎉 Correcto!')
      confetti()

      const nuevosAciertos = aciertos + 1
      setAciertos(nuevosAciertos)

      const nuevoNivel = await decidirNivel(nuevosAciertos, errores)
      setNivelActual(nuevoNivel)
      reiniciarEjercicio(nuevoNivel)
    } else {
      await registrarRespuesta(false, userAns)
      toast.error('❌ Incorrecto')

      const nuevosErrores = errores + 1
      setErrores(nuevosErrores)

      const nuevoNivel = await decidirNivel(0, nuevosErrores)
      setNivelActual(nuevoNivel)
      reiniciarEjercicio(nuevoNivel)
    }
  }

  return (
    <div className="mx-auto bg-card flex flex-col items-center shadow-md p-6 rounded-lg space-y-6">
      {isSubmitting && <LoadingOverlay />}

      {/* Barra superior */}
      <div className="w-full flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          ✅ Aciertos: <b>{aciertos}</b> &nbsp;|&nbsp; ❌ Errores: <b>{errores}</b>
        </div>
        <span className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs font-semibold">
          Nivel {nivelActual}
        </span>
      </div>

      {/* Contexto */}
      <p className="text-lg text-center text-foreground">{pregunta!.contexto}</p>

      {/* Visual */}
      <div className="w-full grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-6">
        <BigNumber value={pregunta!.a} accent />
        <div className="text-5xl font-bold text-foreground text-center">{pregunta!.operador}</div>
        <BigNumber value={pregunta!.b} accent />
        <div className="text-5xl font-bold text-foreground text-center">=</div>
        <input
          ref={answerRef}
          type="number"
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          placeholder="?"
          className="w-32 text-center p-3 text-3xl bg-white text-foreground border border-border rounded"
        />
      </div>

      {/* Botón */}
      <button
        onClick={() => withLock(verificar)}
        disabled={isSubmitting}
        className="w-full bg-primary hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed text-primary-foreground font-bold py-2 rounded-lg transition"
      >
        {isSubmitting ? 'Verificando…' : 'Verificar respuesta'}
      </button>
    </div>
  )
}
