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

interface Pregunta {
  a: number
  b: number
  operador: string
  denominador1: number
  denominador2: number
  contexto: string
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

const simplificarFraccion = (numerador: number, denominador: number) => {
  const divisor = gcd(numerador, denominador)
  return {
    numerador: numerador / divisor,
    denominador: denominador / divisor,
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
    `María tiene ${a}/${denominador1} de una torta y come ${b}/${denominador2} de esa porción. ¿Cuánto comió en total?`,
    `Pedro pinta ${a}/${denominador1} de una pared y su amigo pinta ${b}/${denominador2} de lo que pintó Pedro. ¿Qué fracción de la pared pintó el amigo?`,
    `Ana bebe ${a}/${denominador1} de un jugo y su hermano bebe ${b}/${denominador2} de lo que Ana dejó. ¿Cuánto bebió el hermano del total?`,
    `Carlos tiene ${a}/${denominador1} de una colección y vende ${b}/${denominador2} de su parte. ¿Qué fracción de la colección vendió?`,
  ]

  return {
    a,
    b,
    operador: '*', // Changed operator to multiplication
    denominador1,
    denominador2,
    contexto: contextos[Math.floor(Math.random() * contextos.length)],
  }
}

const temaPeriodoId = '4f098735-8cea-416a-be52-12e91adbba23' // Consider changing this if it's specific to addition
export function FraccionesMultiplicacionStGeorgeGame() {
  const [nivelActual, setNivelActual] = useState<Nivel>(1)
  const [pregunta, setPregunta] = useState<Pregunta | null>(null)
  const [fallosEjercicioActual, setFallosEjercicioActual] = useState(0)
const { elapsedSeconds, start, reset } = useQuestionTimer()

  const [respuestaFinal, setRespuestaFinal] = useState({
    numerador: '',
    denominador: '',
  })

  const [aciertos, setAciertos] = useState(0)
  const [errores, setErrores] = useState(0)
  const [mostrarInputSimplificado, setMostrarInputSimplificado] =
    useState(false)
  const [respuestaSimplificada, setRespuestaSimplificada] = useState({
    numerador: '',
    denominador: '',
  })
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
      setErrores((prev) => prev + 1)
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
        setFallosEjercicioActual(0)
      }, 2000)
    }
  }

  const verificar = async () => {
    const { a, b, denominador1, denominador2 } = pregunta

    // Calculate the expected multiplication result
    const resultadoNumerador = a * b
    const resultadoDenominador = denominador1 * denominador2

    const userNumerador = parseInt(respuestaFinal.numerador)
    const userDenominador = parseInt(respuestaFinal.denominador)

    // Check if the user's answer, when simplified, matches the simplified expected result
    const simplifiedExpected = simplificarFraccion(
      resultadoNumerador,
      resultadoDenominador
    )
    const simplifiedUser = simplificarFraccion(userNumerador, userDenominador)

    if (
      simplifiedUser.numerador === simplifiedExpected.numerador &&
      simplifiedUser.denominador === simplifiedExpected.denominador
    ) {
   toast.success(' Bien hecho. Ahora simplifica la fracción.')
      setMostrarInputSimplificado(true)
    } else {
      toast.error(' Revisa tus cálculos.')
      manejarError()
    }
  }

  const verificarSimplificada = async () => {
    const { a, b, denominador1, denominador2 } = pregunta
    const resultado = simplificarFraccion(a * b, denominador1 * denominador2)

    const userNumerador = parseInt(respuestaSimplificada.numerador)
    const userDenominador = parseInt(respuestaSimplificada.denominador)
    const userFraccion = simplificarFraccion(userNumerador, userDenominador)

    const esCorrecto =
      resultado.numerador === userFraccion.numerador &&
      resultado.denominador === userFraccion.denominador

    if (esCorrecto) {
      await registrarRespuestaFinal(true)
      setAciertos((prev) => prev + 1)
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
        setRespuestaFinal({ numerador: '', denominador: '' })
        setRespuestaSimplificada({ numerador: '', denominador: '' })
   reset()
  start()
        setMostrarInputSimplificado(false)
      }, 2500)
    } else {
      toast.error('⚠️ Esa fracción no está bien simplificada.')
      manejarError()
    }
  }

  return (
    <div className="mx-auto bg-white flex flex-col items-center shadow-md p-6 rounded-lg space-y-6 ">
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
        <h2 className='text-5xl'>x</h2>
        <div className="flex flex-col items-center">
          <span className="text-sm text-gray-600 mb-2">Fracción 2</span>
          <FractionCanvas numerador={pregunta.b} denominador={pregunta.denominador2} />
        </div>
      </div>

      <>
        <div className="flex flex-col items-center gap-2">
          <input
            ref={finalNumeradorRef}
            type="number"
            value={respuestaFinal.numerador}
            onChange={(e) =>
              setRespuestaFinal((prev) => ({
                ...prev,
                numerador: e.target.value,
              }))
            }
            placeholder="?"
            className="w-20 text-center p-2 text-xl bg-white text-black border border-gray-300 rounded"
          />
          <div className="h-1 bg-purple-300 w-20 border-b border-gray-400" />
          <input
            ref={finalDenominadorRef}
            type="number"
            value={respuestaFinal.denominador}
            onChange={(e) =>
              setRespuestaFinal((prev) => ({
                ...prev,
                denominador: e.target.value,
              }))
            }
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

      {mostrarInputSimplificado && (
        <div className="w-full space-y-2">
          <h3 className="text-center text-sm text-gray-700 font-medium">
            Ahora simplifica la fracción:
          </h3>
          <div className="flex flex-col items-center gap-2">
            <input
              type="number"
              value={respuestaSimplificada.numerador}
              onChange={(e) =>
                setRespuestaSimplificada((prev) => ({
                  ...prev,
                  numerador: e.target.value,
                }))
              }
              placeholder="?"
              className="w-20 text-center p-2 text-xl bg-white text-black border border-gray-300 rounded"
            />
            <div className="h-1 bg-purple-300 w-20 border-b border-gray-400" />
            <input
              type="number"
              value={respuestaSimplificada.denominador}
              onChange={(e) =>
                setRespuestaSimplificada((prev) => ({
                  ...prev,
                  denominador: e.target.value,
                }))
              }
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