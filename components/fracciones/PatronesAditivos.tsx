'use client'

import { useEffect, useState } from 'react'
import { useStudent } from '@/lib/hooks/useStudent'
import { createClient } from '@/utils/supabase/client'
import { insertStudentResponse } from '../insertStudentResponse'
import { updateNivelStudentPeriodo } from '../updateNivelStudentPeriodo'
import { getNivelStudentPeriodo } from '../getNivelStudent'
import { useQuestionTimer } from '@/app/hooks/useQuestionTimer'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'
import { motion } from 'framer-motion'
import DecisionTree from 'decision-tree'

const supabase = createClient()
const temaPeriodoId = '74164d20-db6b-4401-94f1-ef4eb0887a86'

type Nivel = 1 | 2 | 3

interface Pregunta {
  secuencia: number[]
  posicionFaltante: number
  respuestaCorrecta: number
  tipo: 'aditivo' | 'multiplicativo' | 'mixto'
}

const generarPregunta = (nivel: Nivel): Pregunta => {
  if (nivel === 1) {
    const inicio = Math.floor(Math.random() * 10) + 1
    const paso = [2, 3, 5][Math.floor(Math.random() * 3)]
    const secuencia = Array.from({ length: 5 }, (_, i) => inicio + i * paso)
    const posicionFaltante = 2
    const respuestaCorrecta = secuencia[posicionFaltante]
    secuencia[posicionFaltante] = NaN
    return { secuencia, posicionFaltante, respuestaCorrecta, tipo: 'aditivo' }
  }

  if (nivel === 2) {
    const inicio = Math.floor(Math.random() * 5) + 1
    const factor = [2, 3, 5][Math.floor(Math.random() * 3)]
    const secuencia = Array.from({ length: 4 }, (_, i) => inicio * Math.pow(factor, i))
    const posicionFaltante = 2
    const respuestaCorrecta = secuencia[posicionFaltante]
    secuencia[posicionFaltante] = NaN
    return { secuencia, posicionFaltante, respuestaCorrecta, tipo: 'multiplicativo' }
  }

  const inicio = Math.floor(Math.random() * 5) + 1
  const paso = [2, 3][Math.floor(Math.random() * 2)]
  const factor = [2, 3][Math.floor(Math.random() * 2)]

  const a = inicio
  const b = a + paso
  const c = b * factor
  const d = c + paso

  const secuencia = [a, b, c, NaN]
  const posicionFaltante = 3
  const respuestaCorrecta = d
  secuencia[posicionFaltante] = NaN

  return { secuencia, posicionFaltante, respuestaCorrecta, tipo: 'mixto' }
}

export function PatronesAditivosMultiplicativosGame() {
  const [nivelActual, setNivelActual] = useState<Nivel>(1)
  const [pregunta, setPregunta] = useState<Pregunta | null>(null)
  const [respuestaUsuario, setRespuestaUsuario] = useState('') 
  const [aciertos, setAciertos] = useState(0)
  const [errores, setErrores] = useState(0)
  const [fallosEjercicioActual, setFallosEjercicioActual] = useState(0)
  const [decisionTree, setDecisionTree] = useState<any>(null)
  const [mostrarPista, setMostrarPista] = useState(false)
  const { student } = useStudent()
  const { elapsedSeconds, start, reset } = useQuestionTimer()

  useEffect(() => {
    const cargarModelo = async () => {
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

    const cargarNivel = async () => {
      if (student?.id) {
        const nivelBD = await getNivelStudentPeriodo(student.id, temaPeriodoId)
        const nivelInicial = (nivelBD ?? 1) as Nivel
        setNivelActual(nivelInicial)
        setPregunta(generarPregunta(nivelInicial))
        start()
        await cargarModelo()
      }
    }
    cargarNivel()
  }, [student])

  const nuevaPregunta = (nivel: Nivel) => {
    setPregunta(generarPregunta(nivel))
    setRespuestaUsuario('')
    setFallosEjercicioActual(0)
    setMostrarPista(false)
    reset()
    start()
  }

  const manejarError = async () => {
    const nuevosFallos = fallosEjercicioActual + 1
    setFallosEjercicioActual(nuevosFallos)

    if (nuevosFallos >= 2) {
      await registrarRespuesta(false)
      toast.error('❌ Fallaste. Cambiamos de secuencia.')
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

  const registrarRespuesta = async (es_correcto: boolean) => {
    if (!student?.id || !pregunta) return

    await insertStudentResponse({
      student_id: student.id,
      tema_periodo_id: temaPeriodoId,
      nivel: nivelActual,
      es_correcto,
      ejercicio_data: {
        secuencia: pregunta.secuencia.map((n, i) => i === pregunta.posicionFaltante ? '___' : n),
        tipo: pregunta.tipo
      },
      respuesta: { valor: parseInt(respuestaUsuario) },
      tiempo_segundos: elapsedSeconds,
    })
  }

  const verificar = async () => {
    if (!pregunta) return

    const respuesta = parseInt(respuestaUsuario)
    if (respuesta === pregunta.respuestaCorrecta) {
      await registrarRespuesta(true)
      toast.success('🎉 ¡Muy bien!')
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
      toast.error('❌ Ese número no completa el patrón.')
      manejarError()
    }
  }

  if (!pregunta) return null

  return (
    <div className="mx-auto bg-white w-full max-w-xl flex flex-col items-center shadow-md p-6 rounded-lg space-y-6">
      <div className="text-sm text-gray-600 text-center">
        ✅ Aciertos: {aciertos} | ❌ Errores: {errores}
      </div>
      <h2 className="text-2xl font-bold text-blue-700">Nivel {nivelActual}</h2>
      <p className="text-lg text-center text-gray-800">Completa la secuencia:</p>

      <div className="flex gap-4">
        {pregunta.secuencia.map((n, i) => (
          <div
            key={i}
            className={`w-16 h-16 flex items-center justify-center rounded-lg text-xl font-bold transition-all duration-300
              ${isNaN(n) ? 'bg-yellow-200 border-2 border-yellow-500' : 'bg-blue-100 text-blue-800'}`}
          >
            {isNaN(n) ? '❓' : n}
          </div>
        ))}
      </div>

      <input
        type="number"
        value={respuestaUsuario}
        onChange={(e) => setRespuestaUsuario(e.target.value)}
        placeholder="Número que falta"
        className="w-full text-center p-2 text-xl bg-white text-black border border-blue-300 rounded"
      />
      <button
        onClick={verificar}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-lg transition"
      >
        Verificar respuesta
      </button>

      <motion.p
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ delay: 0.5 }}
  className="text-sm italic text-gray-700 text-center"
>
  🧠 Profe Nico: "{pregunta.tipo === 'mixto' ? 'Suma y multiplica: Primero sumamos los dos primeros números y luego multiplicamos el resultado por el siguiente número. El patrón es una mezcla de ambos.' : pregunta.tipo === 'aditivo' ? 'Suma constante: Para completar la secuencia, solo debes sumar un número fijo a cada término.' : 'Multiplicación constante: Cada término es el resultado de multiplicar el anterior por un número fijo. Fíjate en el patrón de multiplicación.'}"
</motion.p>


      {!mostrarPista && (
        <button
          onClick={() => setMostrarPista(true)}
          className="text-sm text-blue-500 underline"
        >
          Dame una pista 🕵️‍♂️
        </button>
      )}

      {mostrarPista && (
        <p className="text-sm text-green-700 text-center">
          Pista: El patrón parece ser {pregunta.tipo === 'aditivo' ? 'sumar un número fijo' : pregunta.tipo === 'multiplicativo' ? 'multiplicar por un número' : 'una mezcla de suma y multiplicación'}.
        </p>
      )}
    </div>
  )
}
