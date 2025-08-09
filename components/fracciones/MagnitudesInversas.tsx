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
const temaPeriodoId = '08655b7e-e653-4dc4-8018-773c8061fd83'

type Nivel = 1 | 2 | 3

interface Pregunta {
    enunciado: string
    resultado: number
    tipo: 'inversa'
}

const enunciadosInversos: ((nivel: Nivel) => Pregunta)[] = [
    // Nivel 1
    () => {
        const a = 4, b = 6, c = 2
        return {
            enunciado: `Si ${a} personas terminan un trabajo en ${b} días, ¿cuántos días tomarán ${c} personas?`,
            resultado: (a * b) / c,
            tipo: 'inversa'
        }
    },
    () => {
        const a = 3, b = 9, c = 6
        return {
            enunciado: `Si ${a} albañiles construyen un muro en ${b} días, ¿cuántos días necesitarán ${c} albañiles?`,
            resultado: (a * b) / c,
            tipo: 'inversa'
        }
    },
    () => {
        const a = 5, b = 10, c = 2
        return {
            enunciado: `Si ${a} estudiantes ordenan el aula en ${b} minutos, ¿cuántos minutos necesitarán ${c} estudiantes?`,
            resultado: (a * b) / c,
            tipo: 'inversa'
        }
    },
    // Nivel 2
    () => {
        const a = 4, b = 8, c = 2
        return {
            enunciado: `Si ${a} cocineros preparan 100 empanadas en ${b} horas, ¿cuánto demorarán ${c} cocineros?`,
            resultado: (a * b) / c,
            tipo: 'inversa'
        }
    },
    () => {
        const a = 6, b = 12, c = 3
        return {
            enunciado: `Si ${a} jardineros riegan el parque en ${b} horas, ¿cuántas horas tardarán ${c} jardineros?`,
            resultado: (a * b) / c,
            tipo: 'inversa'
        }
    },
    () => {
        const a = 2, b = 15, c = 5
        return {
            enunciado: `Si ${a} camionetas entregan todos los pedidos en ${b} horas, ¿cuántas horas tomarán ${c} camionetas?`,
            resultado: (a * b) / c,
            tipo: 'inversa'
        }
    },
    // Nivel 3
    () => {
        const a = 60, b = 2, c = 30
        return {
            enunciado: `Un auto que va a ${a} km/h tarda ${b} horas. ¿Cuánto tardará uno que va a ${c} km/h?`,
            resultado: (a * b) / c,
            tipo: 'inversa'
        }
    },
    () => {
        const a = 3, b = 12, c = 6
        return {
            enunciado: `Si ${a} operarios ensamblan juguetes en ${b} horas, ¿cuántas horas necesitarán ${c} operarios?`,
            resultado: (a * b) / c,
            tipo: 'inversa'
        }
    },
    () => {
        const a = 2, b = 6, c = 4
        return {
            enunciado: `Si ${a} grifos llenan un tanque en ${b} horas, ¿cuántas horas tardarán ${c} grifos?`,
            resultado: (a * b) / c,
            tipo: 'inversa'
        }
    }
]

const generarPregunta = (nivel: Nivel): Pregunta => {
    const opciones = enunciadosInversos.slice(0)
    const seleccion = opciones[Math.floor(Math.random() * opciones.length)]
    return seleccion(nivel)
}

export function MagnitudesInversasGame() {
    const [nivelActual, setNivelActual] = useState<Nivel>(1)
    const [pregunta, setPregunta] = useState<Pregunta | null>(null)
    const [respuestaUsuario, setRespuestaUsuario] = useState('')
    const [aciertos, setAciertos] = useState(0)
    const [errores, setErrores] = useState(0)
    const [fallosEjercicioActual, setFallosEjercicioActual] = useState(0)
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

        // Lógica específica para enunciados inversamente proporcionales
        const match = pregunta.enunciado.match(/(\d+).*?(\d+).*?(\d+)/)
        if (match) {
            const [_, a, b, c] = match.map(Number)
            ctx.fillText(`${a}`, 100, 60)
            ctx.fillText(`${b}`, 200, 60)
            drawArrow(100, 70, 200, 70)

            ctx.fillText(`${c}`, 100, 160)
            ctx.fillText('?', 200, 160)
            drawArrow(100, 170, 200, 170)
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

    const nuevaPregunta = (nivel: Nivel) => {
        setPregunta(generarPregunta(nivel))
        setRespuestaUsuario('')
        setFallosEjercicioActual(0)
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
                Tipo: Magnitudes inversamente proporcionales
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
                className="w-full text-center p-2 text-xl bg-white text-black border border-blue-300 rounded"
            />
            <button
                onClick={verificar}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-lg transition"
            >
                Verificar respuesta
            </button>
        </div>
    )
}
