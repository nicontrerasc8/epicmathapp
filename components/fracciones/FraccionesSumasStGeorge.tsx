'use client'

import { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'
import { useStudent } from '@/lib/hooks/useStudent'
import { createClient } from '@/utils/supabase/client'
import FractionCanvas from './FractionCanvas'
import { insertStudentResponse } from '../insertStudentResponse'
import { updateNivelStudentPeriodo } from '../updateNivelStudentPeriodo'
import { getNivelStudentPeriodo } from '../getNivelStudent'
import toast from 'react-hot-toast'
import { useQuestionTimer } from '@/app/hooks/useQuestionTimer'
const supabase = createClient()

type Nivel = 1 | 2 | 3

interface EstadisticasNivel {
  aciertos: number
  errores: number
  totalPreguntas: number
  consecutiveAciertos: number
  consecutiveErrores: number
}

interface Pregunta {
  a: number
  b: number
  operador: string
  denominador1: number
  denominador2: number
  contexto: string
}

const mcm = (a: number, b: number): number => (a * b) / gcd(a, b)
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

const simplificarFraccion = (numerador: number, denominador: number) => {
  const divisor = gcd(numerador, denominador)
  return {
    numerador: numerador / divisor,
    denominador: denominador / divisor
  }
}

const generarPregunta = (nivel: Nivel): Pregunta => {
  let rango: number[] = []
  if (nivel === 1) rango = Array.from({ length: 8 }, (_, i) => i + 2) // 2-9
  if (nivel === 2) rango = Array.from({ length: 40 }, (_, i) => i + 10) // 10-49
  if (nivel === 3) rango = Array.from({ length: 50 }, (_, i) => i + 50) // 50-99

  const denominador1 = rango[Math.floor(Math.random() * rango.length)]
  let denominador2: number
  do {
    denominador2 = rango[Math.floor(Math.random() * rango.length)]
  } while (denominador2 === denominador1)

  const a = Math.floor(Math.random() * denominador1) + 1
  const b = Math.floor(Math.random() * denominador2) + 1

  const contextos = [
    `María tiene ${a}/${denominador1} de una torta y recibe ${b}/${denominador2} más. ¿Cuánto tiene ahora?`,
    `Pedro comió ${a}/${denominador1} de una pizza y luego ${b}/${denominador2} más. ¿Cuánto comió en total?`,
    `Ana coloreó ${a}/${denominador1} de un dibujo y después ${b}/${denominador2} más. ¿Cuánto coloreó en total?`,
    `Carlos lee ${a}/${denominador1} de un libro y luego ${b}/${denominador2} más. ¿Cuánto ha leído en total?`
  ]

  return {
    a,
    b,
    operador: '+',
    denominador1,
    denominador2,
    contexto: contextos[Math.floor(Math.random() * contextos.length)]
  }
}
const temaPeriodoId = "ea5de085-2e52-40ac-b975-8931d08b9e44"
export function FraccionesSumasStGeorgeGameGame() {
  const [nivelActual, setNivelActual] = useState<Nivel>(1)
  const [pregunta, setPregunta] = useState<Pregunta | null>(null)
  const [fallosEjercicioActual, setFallosEjercicioActual] = useState(0)
  const { elapsedSeconds, start, reset } = useQuestionTimer()


  const [respuestaFinal, setRespuestaFinal] = useState({ numerador: '', denominador: '' })

  const [aciertos, setAciertos] = useState(0)
  const [errores, setErrores] = useState(0)
  const [mostrarInputSimplificado, setMostrarInputSimplificado] = useState(false)
  const [respuestaSimplificada, setRespuestaSimplificada] = useState({ numerador: '', denominador: '' })
  const [mcmUsuario, setMcmUsuario] = useState('')
  const [mostrarPasoMCM, setMostrarPasoMCM] = useState(true)
  const finalNumeradorRef = useRef<HTMLInputElement>(null)
  const finalDenominadorRef = useRef<HTMLInputElement>(null)
  const { student } = useStudent()

  const registrarRespuestaFinal = async (es_correcto: boolean) => {
    if (!student?.id || !temaPeriodoId || !pregunta) return

    await insertStudentResponse({
      student_id: student.id,
      tema_periodo_id: temaPeriodoId,
      nivel: nivelActual,
      es_correcto,
      ejercicio_data: {
        a: pregunta.a,
        b: pregunta.b,
        operador: pregunta.operador,
        denominador1: pregunta.denominador1,
        denominador2: pregunta.denominador2,
        contexto: pregunta.contexto,
      },
      respuesta: {
        numerador: parseInt(respuestaFinal.numerador),
        denominador: parseInt(respuestaFinal.denominador),
        simplificado: mostrarInputSimplificado, // se simplificó si llegó a ese paso
      },
      tiempo_segundos: elapsedSeconds,
    })
  }


  useEffect(() => {
    const cargarNivel = async () => {
      if (student?.id) {
        const nivelBD = await getNivelStudentPeriodo(student.id, temaPeriodoId)
        console.log(nivelBD)
        const nivelInicial = (nivelBD ?? 1) as Nivel
        setNivelActual(nivelInicial)
        setPregunta(generarPregunta(nivelInicial))
        start()
      }
    }
    cargarNivel()
  }, [student])


  if (!pregunta) return null

  const manejarError = async () => {
    const nuevosFallos = fallosEjercicioActual + 1
    setFallosEjercicioActual(nuevosFallos)

    if (nuevosFallos >= 2) {
      // Fallo definitivo
      await registrarRespuestaFinal(false)
      setErrores(prev => prev + 1)
      setAciertos(0)

      let nuevoNivel = nivelActual
      if (errores + 1 >= 3 && nivelActual > 1) {
        nuevoNivel = (nivelActual - 1) as Nivel
        await updateNivelStudentPeriodo(student.id, temaPeriodoId, nuevoNivel)
        setNivelActual(nuevoNivel)
        setErrores(0)
      }

      // Reiniciar
      setTimeout(() => {
        setPregunta(generarPregunta(nuevoNivel))
        setRespuestaFinal({ numerador: '', denominador: '' })
        setRespuestaSimplificada({ numerador: '', denominador: '' })
        reset()
        start()
        setMostrarInputSimplificado(false)
        setMostrarPasoMCM(true)
        setMcmUsuario('')
        setFallosEjercicioActual(0)
      }, 2000)
    }
  }


  const verificar = async () => {
    const { a, b, denominador1, denominador2 } = pregunta
    const denComun = mcm(denominador1, denominador2)
    const nuevoA = a * (denComun / denominador1)
    const nuevoB = b * (denComun / denominador2)

    const userNumerador = parseInt(respuestaFinal.numerador)
    const userDenominador = parseInt(respuestaFinal.denominador)

    if (userNumerador === nuevoA + nuevoB && userDenominador === denComun) {
      toast.success(' Bien hecho. Ahora simplifica la fracción.')
      setMostrarInputSimplificado(true)
    } else {
      toast.error(' Revisa tus cálculos.')

      manejarError()
    }


  }

  const verificarSimplificada = async () => {
    const { a, b, denominador1, denominador2 } = pregunta
    const denComun = mcm(denominador1, denominador2)
    const nuevoA = a * (denComun / denominador1)
    const nuevoB = b * (denComun / denominador2)
    const resultado = simplificarFraccion(nuevoA + nuevoB, denComun)

    const userNumerador = parseInt(respuestaSimplificada.numerador)
    const userDenominador = parseInt(respuestaSimplificada.denominador)
    const userFraccion = simplificarFraccion(userNumerador, userDenominador)

    const esCorrecto = resultado.numerador === userFraccion.numerador && resultado.denominador === userFraccion.denominador

    if (esCorrecto) {
      await registrarRespuestaFinal(true)
      setAciertos(prev => prev + 1)
      setErrores(0)
      toast.success('🎉 ¡Muy bien! Fracción simplificada correcta.')

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
      let nuevoNivel = nivelActual
      if (aciertos + 1 >= 3 && nivelActual < 3) {
        nuevoNivel = (nivelActual + 1) as Nivel
        await updateNivelStudentPeriodo(student.id, temaPeriodoId, nuevoNivel)
        setNivelActual(nuevoNivel)
        setAciertos(0)
        setErrores(0)
      }
      setTimeout(() => {
        setPregunta(generarPregunta(nuevoNivel))
         reset()
  start()
        setRespuestaFinal({ numerador: '', denominador: '' })
        setRespuestaSimplificada({ numerador: '', denominador: '' })

        setMostrarInputSimplificado(false)
        setMostrarPasoMCM(true)
        setMcmUsuario('')
      }, 2500)
    } else {
      toast.error('⚠️ Esa fracción no está bien simplificada.')

      manejarError()
    }

  }

  return (
    <div className="mx-auto bg-white w-full flex flex-col items-center shadow-md p-6 rounded-lg space-y-6">
      <div className="text-sm text-gray-600 text-center">
        ✅ Aciertos: {aciertos} | ❌ Errores: {errores}
      </div>
      <h2 className="text-2xl font-bold text-purple-700">Nivel {nivelActual}</h2>
      <p className="text-lg text-center text-gray-800">{pregunta.contexto}</p>

      {/* Visualización de las fracciones */}
      <div className="flex flex-row w-full justify-center items-center gap-8 flex-nowrap">
        <div className="flex flex-col items-center">
          <span className="text-sm text-gray-600 mb-2">Fracción 1</span>
          <FractionCanvas numerador={pregunta.a} denominador={pregunta.denominador1} />
        </div>
        <h2 className='text-5xl'>+</h2>
        <div className="flex flex-col items-center">
          <span className="text-sm text-gray-600 mb-2">Fracción 2</span>
          <FractionCanvas numerador={pregunta.b} denominador={pregunta.denominador2} />
        </div>
      </div>



      {mostrarPasoMCM ? (
        <div className="w-full flex flex-col items-center space-y-2">
          <p className="text-center font-medium text-gray-700">
            Paso 1: Calcula el <span className="font-bold text-purple-700">mínimo común múltiplo</span> entre {pregunta.denominador1} y {pregunta.denominador2}
          </p>
          <input
            type="number"
            value={mcmUsuario}
            onChange={(e) => setMcmUsuario(e.target.value)}
            className="w-full text-center p-2 text-xl bg-white text-black border border-purple-300 rounded"
            placeholder="Mínimo común múltiplo"
          />
          <button
            onClick={() => {
              const esperado = mcm(pregunta.denominador1, pregunta.denominador2)
              if (parseInt(mcmUsuario) === esperado) {
                setMostrarPasoMCM(false)
                toast.success(' Correcto. Ahora resuelve la suma.')

              } else {
                manejarError()
                toast.error(' Ese no es el mínimo común múltiplo.')

              }
            }}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-lg transition"
          >
            Validar mínimo común múltiplo
          </button>
        </div>
      ) :
        <>
          <p className="text-center font-medium text-gray-700">
            Paso 2: Suma las fracciones usando el <span className="font-bold text-purple-700">denominador común</span>. No simplifiques aún.
          </p>
          <div className="flex flex-col items-center gap-2">
            <input
              ref={finalNumeradorRef}
              type="number"
              value={respuestaFinal.numerador}
              onChange={(e) => setRespuestaFinal(prev => ({ ...prev, numerador: e.target.value }))}
              placeholder="?"
              className="w-20 text-center p-2 text-xl bg-white text-black border border-gray-300 rounded"
            />
            <div className="h-1 bg-purple-300 w-20 border-b border-gray-400" />
            <input
              ref={finalDenominadorRef}
              type="number"
              value={respuestaFinal.denominador}
              onChange={(e) => setRespuestaFinal(prev => ({ ...prev, denominador: e.target.value }))}
              placeholder="?"
              className="w-20 text-center p-2 text-xl bg-white text-black border border-gray-300 rounded"
            />
          </div>

          <button
            onClick={verificar}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 rounded-lg transition"
          >
            Verificar respuesta
          </button>
        </>
      }




      {mostrarInputSimplificado && (
        <div className="w-full space-y-2">
          <p className="text-center font-medium text-gray-700">
            Paso 3: Simplifica la fracción que obtuviste. Divide el numerador y denominador entre su máximo común divisor.
          </p>

          <div className="flex flex-col items-center gap-2">
            <input
              type="number"
              value={respuestaSimplificada.numerador}
              onChange={(e) => setRespuestaSimplificada(prev => ({ ...prev, numerador: e.target.value }))}
              placeholder="?"
              className="w-20 text-center p-2 text-xl bg-white text-black border border-gray-300 rounded"
            />
            <div className="h-1 bg-purple-300 w-20 border-b border-gray-400" />
            <input
              type="number"
              value={respuestaSimplificada.denominador}
              onChange={(e) => setRespuestaSimplificada(prev => ({ ...prev, denominador: e.target.value }))}
              placeholder="?"
              className="w-20 text-center p-2 text-xl bg-white text-black border border-gray-300 rounded"
            />
          </div>
          <button
            onClick={verificarSimplificada}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 rounded-lg transition"
          >
            Verificar simplificación
          </button>
        </div>
      )}


    </div>
  )
}
