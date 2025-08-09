'use client'

import { useEffect, useRef, useState } from 'react'
import { useStudent } from '@/lib/hooks/useStudent'
import { createClient } from '@/utils/supabase/client'
import { insertStudentResponse } from '../insertStudentResponse'
import { updateNivelStudentPeriodo } from '../updateNivelStudentPeriodo'
import { getNivelStudentPeriodo } from '../getNivelStudent'
import { useQuestionTimer } from '@/app/hooks/useQuestionTimer'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'

const supabase = createClient()
const temaPeriodoId = '2a91e993-4f9e-4766-aa8f-9497f87f1bf7'

type Nivel = 1 | 2 | 3

type TipoRegla = 'directa' | 'inversa' | 'compuesta'

interface Enunciado {
  tipo: TipoRegla
  plantilla: (params: number[]) => { texto: string; resultado: number }
}

interface Pregunta {
  enunciado: string
  resultado: number
  tipo: TipoRegla
  params: number[]
}


const enunciadosDisponibles = [
  { tipo: 'directa', plantilla: (params: number[]) => { const [a, b, c] = params; return { texto: `Si ${a} cuadernos cuestan ${b} soles, ¿cuánto costarán ${c} cuadernos?`, resultado: (b / a) * c } } },
  { tipo: 'directa', plantilla: (params: number[]) => { const [a, b, c] = params; return { texto: `Si ${a} entradas cuestan ${b} soles, ¿cuánto costarán ${c} entradas?`, resultado: (b / a) * c } } },
  { tipo: 'directa', plantilla: (params: number[]) => { const [a, b, c] = params; return { texto: `Si ${a} kilos de manzana cuestan ${b} soles, ¿cuánto costarán ${c} kilos?`, resultado: (b / a) * c } } },
  { tipo: 'directa', plantilla: (params: number[]) => { const [a, b, c] = params; return { texto: `Si ${a} metros de tela cuestan ${b} soles, ¿cuánto costarán ${c} metros?`, resultado: (b / a) * c } } },
  { tipo: 'directa', plantilla: (params: number[]) => { const [a, b, c] = params; return { texto: `Si ${a} libros cuestan ${b} soles, ¿cuánto costarán ${c} libros?`, resultado: (b / a) * c } } },

  { tipo: 'inversa', plantilla: (params: number[]) => { const [a, b, c] = params; return { texto: `Si ${a} personas limpian una casa en ${b} horas, ¿cuántas horas tomarán ${c} personas?`, resultado: (a * b) / c } } },
  { tipo: 'inversa', plantilla: (params: number[]) => { const [a, b, c] = params; return { texto: `Si ${a} obreros construyen una pared en ${b} días, ¿cuántos días tomarán ${c} obreros?`, resultado: (a * b) / c } } },
  { tipo: 'inversa', plantilla: (params: number[]) => { const [a, b, c] = params; return { texto: `Si ${a} cocineros preparan comida en ${b} horas, ¿cuánto tomarán ${c} cocineros?`, resultado: (a * b) / c } } },
  { tipo: 'inversa', plantilla: (params: number[]) => { const [a, b, c] = params; return { texto: `Si ${a} jardineros podan un parque en ${b} días, ¿cuántos días tomarán ${c} jardineros?`, resultado: (a * b) / c } } },
  { tipo: 'inversa', plantilla: (params: number[]) => { const [a, b, c] = params; return { texto: `Si ${a} estudiantes ordenan un salón en ${b} minutos, ¿cuántos minutos tomarán ${c} estudiantes?`, resultado: (a * b) / c } } },

  { tipo: 'compuesta', plantilla: (params: number[]) => { const [a, b, c, x, y] = params; return { texto: `Si ${a} obreros hacen ${b} mesas en ${c} días, ¿cuántos días necesitarán ${x} obreros para hacer ${y} mesas?`, resultado: (a * c * y) / (x * b) } } },
  { tipo: 'compuesta', plantilla: (params: number[]) => { const [a, b, c, x, y] = params; return { texto: `Si ${a} máquinas producen ${b} botellas en ${c} horas, ¿cuántas horas tomarán ${x} máquinas para producir ${y} botellas?`, resultado: (a * c * y) / (x * b) } } },
  { tipo: 'compuesta', plantilla: (params: number[]) => { const [a, b, c, x, y] = params; return { texto: `Si ${a} camiones transportan ${b} sacos en ${c} viajes, ¿cuántos viajes harán falta con ${x} camiones para ${y} sacos?`, resultado: (a * c * y) / (x * b) } } },
  { tipo: 'compuesta', plantilla: (params: number[]) => { const [a, b, c, x, y] = params; return { texto: `Si ${a} panaderos hacen ${b} panes en ${c} horas, ¿cuántas horas necesitarán ${x} panaderos para ${y} panes?`, resultado: (a * c * y) / (x * b) } } },
  { tipo: 'compuesta', plantilla: (params: number[]) => { const [a, b, c, x, y] = params; return { texto: `Si ${a} estudiantes resuelven ${b} ejercicios en ${c} minutos, ¿cuántos minutos necesitarán ${x} estudiantes para ${y} ejercicios?`, resultado: (a * c * y) / (x * b) } } },
]

export function ReglaDeTresGame() {
  const [nivelActual, setNivelActual] = useState<Nivel>(1)
  const [pregunta, setPregunta] = useState<Pregunta | null>(null)
  const [respuestaUsuario, setRespuestaUsuario] = useState('')
  const [aciertos, setAciertos] = useState(0)
  const [errores, setErrores] = useState(0)
  const [fallosEjercicioActual, setFallosEjercicioActual] = useState(0)
  const [mostrarPista, setMostrarPista] = useState(false)
  const { student } = useStudent()
  const { elapsedSeconds, start, reset } = useQuestionTimer()
  const canvasRef = useRef<HTMLCanvasElement>(null)

useEffect(() => {
  if (!pregunta || !canvasRef.current) return
  const ctx = canvasRef.current.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

  ctx.font = '16px Arial'
  ctx.fillStyle = '#3B82F6'
  ctx.textAlign = 'center'

  const drawArrow = (fromX: number, fromY: number, toX: number, toY: number) => {
    ctx.beginPath()
    ctx.moveTo(fromX, fromY)
    ctx.lineTo(toX, toY)
    ctx.strokeStyle = '#000'
    ctx.stroke()
    // flecha
    const headlen = 10
    const angle = Math.atan2(toY - fromY, toX - fromX)
    ctx.lineTo(
      toX - headlen * Math.cos(angle - Math.PI / 6),
      toY - headlen * Math.sin(angle - Math.PI / 6)
    )
    ctx.moveTo(toX, toY)
    ctx.lineTo(
      toX - headlen * Math.cos(angle + Math.PI / 6),
      toY - headlen * Math.sin(angle + Math.PI / 6)
    )
    ctx.stroke()
  }

  if (pregunta.tipo === 'directa') {
    const [a, b, c] = pregunta.params
    ctx.fillText(`${a} uds`, 100, 60)
    ctx.fillText(`${b} soles`, 200, 60)
    drawArrow(100, 70, 200, 70)

    ctx.fillText(`${c} uds`, 100, 160)
    ctx.fillText('?', 200, 160)
    drawArrow(100, 170, 200, 170)
  } else if (pregunta.tipo === 'inversa') {
    const [a, b, c] = pregunta.params
    ctx.fillText(`${a} pers`, 100, 60)
    ctx.fillText(`${b} hrs`, 200, 60)
    drawArrow(100, 70, 200, 70)

    ctx.fillText(`${c} pers`, 100, 160)
    ctx.fillText('?', 200, 160)
    drawArrow(100, 170, 200, 170)
  } else if (pregunta.tipo === 'compuesta') {
    const [a, b, c, x, y] = pregunta.params
    ctx.fillText(`${a} obreros`, 80, 50)
    ctx.fillText(`${b} mesas`, 160, 50)
    ctx.fillText(`${c} días`, 240, 50)

    ctx.fillText(`${x} obreros`, 80, 150)
    ctx.fillText(`${y} mesas`, 160, 150)
    ctx.fillText('?', 240, 150)

    drawArrow(80, 60, 80, 140)
    drawArrow(160, 60, 160, 140)
    drawArrow(240, 60, 240, 140)
  }
}, [pregunta])

  useEffect(() => {
    const cargarNivel = async () => {
      if (student?.id) {
        const nivelBD = await getNivelStudentPeriodo(student.id, temaPeriodoId)
        const nivelInicial = (nivelBD ?? 1) as Nivel
        setNivelActual(nivelInicial)
        setPregunta(generarPregunta(nivelInicial))
        start()
      }
    }
    cargarNivel()
  }, [student])

  const generarPregunta = (nivel: any): any => {
    const opciones = enunciadosDisponibles.filter(e =>
      nivel === 1 ? e.tipo === 'directa' : nivel === 2 ? e.tipo === 'inversa' : e.tipo === 'compuesta'
    )
    const seleccion = opciones[Math.floor(Math.random() * opciones.length)]
    let params: number[] = []

    if (seleccion.tipo === 'directa') {
      const a = Math.floor(Math.random() * 5) + 2
      const b = a * (Math.floor(Math.random() * 3) + 2)
      const c = a * 2
      params = [a, b, c]
    } else if (seleccion.tipo === 'inversa') {
      const a = Math.floor(Math.random() * 3) + 2
      const b = Math.floor(Math.random() * 3) + 4
      const c = a + 1
      params = [a, b, c]
    } else {
      const a = Math.floor(Math.random() * 3) + 2
      const b = Math.floor(Math.random() * 10) + 5
      const c = Math.floor(Math.random() * 3) + 2
      const x = a - 1
      const y = b * 2
      params = [a, b, c, x, y]
    }

    const { texto, resultado } = seleccion.plantilla(params)
    return { enunciado: texto, resultado, tipo: seleccion.tipo, params }
  }

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
      toast.error('❌ Fallaste. Nueva pregunta.')
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
        enunciado: pregunta.enunciado,
        tipo: pregunta.tipo,
        valores: pregunta.params,
      },
      respuesta: { valor: parseFloat(respuestaUsuario) },
      tiempo_segundos: elapsedSeconds,
    })
  }

  const verificar = async () => {
    if (!pregunta) return
    const respuesta = parseFloat(respuestaUsuario)
    if (Math.abs(respuesta - pregunta.resultado) <= 0.1) {
      await registrarRespuesta(true)
      toast.success('🎉 ¡Correcto!')
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
      toast.error('❌ Esa no es la respuesta.')
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



      <p className="text-yellow-600 font-medium text-sm">
        Tipo: Regla de tres {pregunta.tipo}
      </p>
      <p className="text-lg text-center text-gray-800">{pregunta.enunciado}</p>
      <canvas
  ref={canvasRef}
  width={360}
  height={200}
  className="border border-gray-300 rounded-md shadow-md"
/>

      <input
        type="number"
        value={respuestaUsuario}
        onChange={(e) => setRespuestaUsuario(e.target.value)}
        placeholder="Tu respuesta"
        className="w-40 text-center p-2 text-xl bg-white text-black border border-blue-300 rounded"
      />
      <button
        onClick={verificar}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-lg transition"
      >
        Verificar respuesta
      </button>

      {!mostrarPista && (
        <button
          onClick={() => setMostrarPista(true)}
          className="text-sm text-blue-500 underline"
        >
          Dame una pista 🧠
        </button>
      )}

      {mostrarPista && (
        <p className="text-green-700 text-sm text-center">
          {pregunta.tipo === 'directa'
            ? 'Usa una regla de 3 directa: si A cuesta B, entonces C costará (B / A) × C.'
            : pregunta.tipo === 'inversa'
            ? 'Regla de 3 inversa: más personas, menos tiempo. Aplica (A × B) / C.'
            : 'Compuesta: usa dos pasos de regla de tres con más de una variable.'}
        </p>
      )}
    </div>
  )
}
