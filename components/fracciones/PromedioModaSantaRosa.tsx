'use client'

import { useState, useEffect } from 'react'
import { useStudent } from '@/lib/hooks/useStudent'
import { createClient } from '@/utils/supabase/client'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'
import { insertStudentResponse } from '../insertStudentResponse'
import { updateNivelStudentPeriodo } from '../updateNivelStudentPeriodo'
import { getNivelStudentPeriodo } from '../getNivelStudent'
import { useQuestionTimer } from '@/app/hooks/useQuestionTimer'

const supabase = createClient()
const temaPeriodoId = "11c72ff1-17aa-4e29-8882-04a686523b6c"

type Nivel = 1 | 2 | 3

const generarPregunta = (nivel: Nivel): number[] => {
  const longitudes = { 1: 8, 2: 15, 3: 25 }
  const cantidad = longitudes[nivel]
  const numeros = Array.from({ length: cantidad }, () => Math.floor(Math.random() * 10) + 1)
  return numeros
}

export function PromedioModaStGeorgeGame() {
  const [nivelActual, setNivelActual] = useState<Nivel>(1)
  const [numeros, setNumeros] = useState<number[]>([])
  const [promedioUsuario, setPromedioUsuario] = useState('')
  const [modaUsuario, setModaUsuario] = useState('')
  const [paso, setPaso] = useState<'promedio' | 'moda'>('promedio')
  const [aciertos, setAciertos] = useState(0)
  const [errores, setErrores] = useState(0)
  const [fallosEjercicioActual, setFallosEjercicioActual] = useState(0)
  const { student } = useStudent()
  const { elapsedSeconds, start, reset } = useQuestionTimer()

  const calcularPromedio = (nums: number[]) => {
    const suma = nums.reduce((a, b) => a + b, 0)
    return +(suma / nums.length).toFixed(2)
  }

  const calcularModa = (nums: number[]) => {
    const freqs: Record<number, number> = {}
    nums.forEach(n => freqs[n] = (freqs[n] || 0) + 1)
    const max = Math.max(...Object.values(freqs))
    const modas = Object.keys(freqs).filter(k => freqs[+k] === max).map(Number)
    return modas.sort((a, b) => a - b).join(',')
  }

  const registrarRespuesta = async (es_correcto: boolean) => {
    if (!student?.id) return
    await insertStudentResponse({
      student_id: student.id,
      tema_periodo_id: temaPeriodoId,
      nivel: nivelActual,
      es_correcto,
      ejercicio_data: { numeros },
      respuesta: {
        promedio: parseFloat(promedioUsuario),
        moda: modaUsuario
      },
      tiempo_segundos: elapsedSeconds,
    })
  }

  const nuevaPregunta = (nivel: Nivel) => {
    setNumeros(generarPregunta(nivel))
    setPromedioUsuario('')
    setModaUsuario('')
    setPaso('promedio')
    reset()
    start()
    setFallosEjercicioActual(0)
  }

  useEffect(() => {
    const cargarNivel = async () => {
      if (student?.id) {
        const nivelBD = await getNivelStudentPeriodo(student.id, temaPeriodoId)
        const nivelInicial = (nivelBD ?? 1) as Nivel
        setNivelActual(nivelInicial)
        nuevaPregunta(nivelInicial)
      }
    }
    cargarNivel()
  }, [student])

  const manejarError = async () => {
    const nuevosFallos = fallosEjercicioActual + 1
    setFallosEjercicioActual(nuevosFallos)

    if (nuevosFallos >= 2) {
      await registrarRespuesta(false)
      toast.error('Respuesta incorrecta. Intentaremos con otro conjunto de números.')
      setErrores(prev => prev + 1)
      setAciertos(0)

      let nuevoNivel = nivelActual
      if (errores + 1 >= 3 && nivelActual > 1) {
        nuevoNivel = (nivelActual - 1) as Nivel
        await updateNivelStudentPeriodo(student.id, temaPeriodoId, nuevoNivel)
        setNivelActual(nuevoNivel)
        setErrores(0)
      }

      setTimeout(() => nuevaPregunta(nuevoNivel), 1500)
    }
  }

  const verificarPromedio = () => {
    const correcto = calcularPromedio(numeros)
    if (Math.abs(parseFloat(promedioUsuario) - correcto) < 0.01) {
      toast.success('✅ Promedio correcto. Ahora encuentra la moda.')
      setPaso('moda')
    } else {
      toast.error('❌ Promedio incorrecto.')
      manejarError()
    }
  }

  const verificarModa = async () => {
    const esperado = calcularModa(numeros)
    const ingresado = modaUsuario.split(',').map(n => +n.trim()).sort((a, b) => a - b).join(',')
    const esCorrecto = esperado === ingresado

    if (esCorrecto) {
      await registrarRespuesta(true)
      toast.success('🎉 ¡Moda correcta!')
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
      setAciertos(prev => prev + 1)
      setErrores(0)

      let nuevoNivel = nivelActual
      if (aciertos + 1 >= 3 && nivelActual < 3) {
        nuevoNivel = (nivelActual + 1) as Nivel
        await updateNivelStudentPeriodo(student.id, temaPeriodoId, nuevoNivel)
        setNivelActual(nuevoNivel)
        setAciertos(0)
        setErrores(0)
      }

      setTimeout(() => nuevaPregunta(nuevoNivel), 2000)
    } else {
      toast.error('❌ Moda incorrecta.')
      manejarError()
    }
  }

  if (!numeros.length) return null

  const frecuencia = numeros.reduce((acc, n) => {
    acc[n] = (acc[n] || 0) + 1
    return acc
  }, {} as Record<number, number>)

  const maxFrecuencia = Math.max(...Object.values(frecuencia))

  return (
    <div className="mx-auto bg-white w-full max-w-xl flex flex-col items-center shadow-md p-6 rounded-lg space-y-6">
      <div className="text-sm text-gray-600 text-center">
        ✅ Aciertos: {aciertos} | ❌ Errores: {errores}
      </div>
      <h2 className="text-2xl font-bold text-blue-700">Nivel {nivelActual}</h2>
      <p className="text-lg text-center text-gray-800">
        Estos son los números: <strong>{numeros.join(', ')}</strong>
      </p>

      {/* Visualizaci\u00f3n bloques */}
      <div className="flex flex-wrap gap-2 justify-center">
        {numeros.map((num, i) => (
          <div
            key={i}
            className="bg-yellow-300 text-black font-bold w-10 h-10 flex items-center justify-center rounded shadow"
          >
            {num}
          </div>
        ))}
      </div>

      {/* Gr\u00e1fico de barras */}
      <div className="w-full max-w-md mt-4">
        <h3 className="text-md text-gray-600 mb-2 text-center">Frecuencia de cada número</h3>
        <div className="space-y-2">
          {Object.entries(frecuencia).sort((a, b) => Number(a[0]) - Number(b[0])).map(([num, count]) => (
            <div key={num} className="flex items-center space-x-2">
              <span className="w-6">{num}</span>
              <div
                className="bg-blue-400 h-4 rounded"
                style={{ width: `${(count / maxFrecuencia) * 100}%` }}
              />
              <span className="text-sm">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Interacci\u00f3n */}
      {paso === 'promedio' ? (
        <>
          <p className="text-center font-medium text-gray-700">
            Paso 1: Calcula el promedio de los números.
          </p>
          <input
            type="number"
            value={promedioUsuario}
            onChange={(e) => setPromedioUsuario(e.target.value)}
            placeholder="Promedio"
            className="w-full text-center p-2 text-xl bg-white text-black border border-blue-300 rounded"
          />
          <p className="text-sm text-gray-500 text-center">
            Puedes escribir el promedio con 0, 1 o 2 decimales. Recuerda redondear a <span className="font-semibold">dos decimales</span>.
          </p>
          <button
            onClick={verificarPromedio}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-lg transition"
          >
            Verificar promedio
          </button>
        </>
      ) : (
        <>
          <p className="text-center font-medium text-gray-700">
            Paso 2: Escribe la moda. Si hay m\u00e1s de una, sep\u00e1ralas con coma.
          </p>
          <input
            type="text"
            value={modaUsuario}
            onChange={(e) => setModaUsuario(e.target.value)}
            placeholder="Ej. 2,4"
            className="w-full text-center p-2 text-xl bg-white text-black border border-yellow-300 rounded"
          />
          <button
            onClick={verificarModa}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 rounded-lg transition"
          >
            Verificar moda
          </button>
        </>
      )}
    </div>
  )
}
