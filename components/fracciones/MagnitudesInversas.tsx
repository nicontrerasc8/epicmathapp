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
import DecisionTree from 'decision-tree'

const supabase = createClient()
const temaPeriodoId = '08655b7e-e653-4dc4-8018-773c8061fd83'

type Nivel = 1 | 2 | 3

interface Pregunta {
    enunciado: string
    resultado: number
    tipo: 'inversa'
}

const enunciadosInversos: ((nivel: Nivel) => Pregunta)[] = [
    // NIVEL 1: Números pequeños y simples (1-10)
    () => {
        const trabajadores1 = Math.floor(Math.random() * 3) + 2; // 2-4
        const dias1 = Math.floor(Math.random() * 4) + 3; // 3-6
        const trabajadores2 = Math.floor(Math.random() * 3) + 2; // 2-4
        
        return {
            enunciado: `Si ${trabajadores1} trabajadores terminan un trabajo en ${dias1} días, ¿cuántos días tardarán ${trabajadores2} trabajadores?`,
            resultado: (trabajadores1 * dias1) / trabajadores2,
            tipo: 'inversa'
        }
    },
    () => {
        const personas1 = Math.floor(Math.random() * 3) + 2; // 2-4
        const horas1 = Math.floor(Math.random() * 4) + 4; // 4-7
        const personas2 = Math.floor(Math.random() * 4) + 3; // 3-6
        
        return {
            enunciado: `${personas1} personas pintan una cerca en ${horas1} horas. ¿Cuántas horas tardarán ${personas2} personas?`,
            resultado: (personas1 * horas1) / personas2,
            tipo: 'inversa'
        }
    },
    () => {
        const maquinas1 = Math.floor(Math.random() * 2) + 2; // 2-3
        const tiempo1 = Math.floor(Math.random() * 4) + 4; // 4-7
        const maquinas2 = Math.floor(Math.random() * 3) + 3; // 3-5
        
        return {
            enunciado: `${maquinas1} máquinas fabrican un producto en ${tiempo1} horas. ¿Cuántas horas necesitarán ${maquinas2} máquinas?`,
            resultado: (maquinas1 * tiempo1) / maquinas2,
            tipo: 'inversa'
        }
    },

    // NIVEL 2: Números medianos (10-50)
    () => {
        const velocidad1 = Math.floor(Math.random() * 20) + 20; // 20-39
        const tiempo1 = Math.floor(Math.random() * 5) + 3; // 3-7
        const velocidad2 = Math.floor(Math.random() * 20) + 15; // 15-34
        
        return {
            enunciado: `Un auto viaja a ${velocidad1} km/h y tarda ${tiempo1} horas en llegar. ¿Cuántas horas tardará a ${velocidad2} km/h?`,
            resultado: (velocidad1 * tiempo1) / velocidad2,
            tipo: 'inversa'
        }
    },
    () => {
        const obreros1 = Math.floor(Math.random() * 10) + 10; // 10-19
        const dias1 = Math.floor(Math.random() * 8) + 5; // 5-12
        const obreros2 = Math.floor(Math.random() * 15) + 8; // 8-22
        
        return {
            enunciado: `${obreros1} obreros construyen una casa en ${dias1} días. ¿Cuántos días necesitarán ${obreros2} obreros?`,
            resultado: (obreros1 * dias1) / obreros2,
            tipo: 'inversa'
        }
    },
    () => {
        const bombas1 = Math.floor(Math.random() * 5) + 5; // 5-9
        const horas1 = Math.floor(Math.random() * 6) + 6; // 6-11
        const bombas2 = Math.floor(Math.random() * 8) + 4; // 4-11
        
        return {
            enunciado: `${bombas1} bombas llenan un tanque en ${horas1} horas. ¿Cuántas horas tardarán ${bombas2} bombas?`,
            resultado: (bombas1 * horas1) / bombas2,
            tipo: 'inversa'
        }
    },

    // NIVEL 3: Números grandes (50+)
    () => {
        const velocidad1 = Math.floor(Math.random() * 50) + 60; // 60-109
        const tiempo1 = Math.floor(Math.random() * 5) + 4; // 4-8
        const velocidad2 = Math.floor(Math.random() * 40) + 50; // 50-89
        
        return {
            enunciado: `Un tren viaja a ${velocidad1} km/h y recorre una distancia en ${tiempo1} horas. ¿Cuántas horas tardará a ${velocidad2} km/h?`,
            resultado: (velocidad1 * tiempo1) / velocidad2,
            tipo: 'inversa'
        }
    },
    () => {
        const trabajadores1 = Math.floor(Math.random() * 30) + 50; // 50-79
        const dias1 = Math.floor(Math.random() * 10) + 8; // 8-17
        const trabajadores2 = Math.floor(Math.random() * 40) + 40; // 40-79
        
        return {
            enunciado: `${trabajadores1} trabajadores terminan un proyecto en ${dias1} días. ¿Cuántos días necesitarán ${trabajadores2} trabajadores?`,
            resultado: (trabajadores1 * dias1) / trabajadores2,
            tipo: 'inversa'
        }
    },
    () => {
        const maquinas1 = Math.floor(Math.random() * 15) + 25; // 25-39
        const horas1 = Math.floor(Math.random() * 8) + 10; // 10-17
        const maquinas2 = Math.floor(Math.random() * 20) + 20; // 20-39
        
        return {
            enunciado: `${maquinas1} máquinas producen cierta cantidad en ${horas1} horas. ¿Cuántas horas necesitarán ${maquinas2} máquinas?`,
            resultado: (maquinas1 * horas1) / maquinas2,
            tipo: 'inversa'
        }
    }
]

const generarPregunta = (nivel: Nivel): Pregunta => {
    let indicesDisponibles: number[] = []
    
    // Seleccionar preguntas según el nivel
    if (nivel === 1) {
        indicesDisponibles = [0, 1, 2] // Primeras 3 preguntas (números pequeños)
    } else if (nivel === 2) {
        indicesDisponibles = [3, 4, 5] // Siguientes 3 preguntas (números medianos)
    } else if (nivel === 3) {
        indicesDisponibles = [6, 7, 8] // Últimas 3 preguntas (números grandes)
    }
    
    const indiceSeleccionado = indicesDisponibles[Math.floor(Math.random() * indicesDisponibles.length)]
    const generador = enunciadosInversos[indiceSeleccionado]
    
    return generador(nivel)
}


export function MagnitudesInversasGame() {
    const [nivelActual, setNivelActual] = useState<Nivel>(1)
    const [pregunta, setPregunta] = useState<Pregunta | null>(null)
    const [respuestaUsuario, setRespuestaUsuario] = useState('')
    const [aciertos, setAciertos] = useState(0)
    const [errores, setErrores] = useState(0)
    const [fallosEjercicioActual, setFallosEjercicioActual] = useState(0)
    const [decisionTree, setDecisionTree] = useState<any>(null)
    const { student } = useStudent()
    const { elapsedSeconds, start, reset } = useQuestionTimer()
    const canvasRef = useRef<HTMLCanvasElement>(null)

   useEffect(() => {
    if (!pregunta || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const canvas = canvasRef.current
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // --- Estilos Generales ---
    ctx.font = 'bold 24px "Inter", sans-serif' // Fuente más moderna y en negrita
    ctx.fillStyle = '#2c3e50' // Color de texto oscuro y elegante
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle' // Alinear el texto verticalmente al centro

    // --- Función para dibujar flechas con estilo ---
    const drawStyledArrow = (fromX:any, fromY:any, toX:any, toY:any, color = '#3498db', lineWidth = 3) => {
        ctx.beginPath()
        ctx.moveTo(fromX, fromY)
        ctx.lineTo(toX, toY)
        ctx.strokeStyle = color
        ctx.lineWidth = lineWidth
        ctx.lineCap = 'round' // Extremos de línea redondeados
        ctx.stroke()

        // Dibujar cabeza de flecha
        const headlen = 12
        const angle = Math.atan2(toY - fromY, toX - fromX)
        ctx.beginPath()
        ctx.moveTo(toX, toY)
        ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 7), toY - headlen * Math.sin(angle - Math.PI / 7))
        ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 7), toY - headlen * Math.sin(angle + Math.PI / 7))
        ctx.closePath()
        ctx.fillStyle = color
        ctx.fill()
    }

    // --- Función para dibujar un "recuadro" con texto ---
    const drawTextBox = (text:any, x:any, y:any, width:any, height:any, bgColor:any, textColor:any, shadow = true) => {
        const cornerRadius = 8 // Esquinas redondeadas
        
        // Sombra
        if (shadow) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
            ctx.shadowBlur = 10
            ctx.shadowOffsetX = 3
            ctx.shadowOffsetY = 3
        }
        
        // Rectángulo con esquinas redondeadas
        ctx.beginPath()
        ctx.moveTo(x + cornerRadius, y)
        ctx.lineTo(x + width - cornerRadius, y)
        ctx.quadraticCurveTo(x + width, y, x + width, y + cornerRadius)
        ctx.lineTo(x + width, y + height - cornerRadius)
        ctx.quadraticCurveTo(x + width, y + height, x + width - cornerRadius, y + height)
        ctx.lineTo(x + cornerRadius, y + height)
        ctx.quadraticCurveTo(x, y + height, x, y + height - cornerRadius)
        ctx.lineTo(x, y + cornerRadius)
        ctx.quadraticCurveTo(x, y, x + cornerRadius, y)
        ctx.closePath()

        ctx.fillStyle = bgColor
        ctx.fill()

        // Resetear sombra antes de dibujar texto para que el texto no tenga sombra doble
        ctx.shadowColor = 'transparent' 
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0

        ctx.fillStyle = textColor
        ctx.font = 'bold 28px "Inter", sans-serif'
        ctx.fillText(text, x + width / 2, y + height / 2)
    }

    // --- Lógica específica para enunciados inversamente proporcionales ---
    const match = pregunta.enunciado.match(/(\d+).*?(\d+).*?(\d+)/)
    if (match) {
        const [_, a, b, c] = match.map(Number)

        const boxWidth = 80
        const boxHeight = 50
        const spacingX = 120 // Espacio entre las cajas horizontalmente
        const spacingY = 80 // Espacio entre las filas verticalmente
        const startX = canvas.width / 2 - (boxWidth + spacingX) / 2
        const startY = 50

        // Colores más vibrantes y modernos
        const boxColor1 = '#ecf0f1' // Gris claro de fondo para las cajas
        const boxColor2 = '#e0e6e8' // Ligeramente diferente para dar contraste si se quiere
        const textColor = '#34495e' // Azul oscuro para texto
        const arrowColor = '#2980b9' // Azul fuerte para las flechas

        // Dibujar cajas superiores
        drawTextBox(`${a}`, startX, startY, boxWidth, boxHeight, boxColor1, textColor)
        drawTextBox(`${b}`, startX + spacingX, startY, boxWidth, boxHeight, boxColor1, textColor)
        
        // Dibujar flecha superior
        drawStyledArrow(
            startX + boxWidth / 2, startY + boxHeight + 10,
            startX + spacingX + boxWidth / 2, startY + boxHeight + 10,
            arrowColor, 4
        )
        ctx.font = '16px "Inter", sans-serif'
        ctx.fillStyle = '#7f8c8d' // Color para el texto "Inverso"
        ctx.fillText('Relación Inversa', canvas.width / 2, startY + boxHeight + 30) // Texto en medio de la flecha

        // Dibujar cajas inferiores
        drawTextBox(`${c}`, startX, startY + boxHeight + spacingY, boxWidth, boxHeight, boxColor1, textColor)
        drawTextBox('?', startX + spacingX, startY + boxHeight + spacingY, boxWidth, boxHeight, '#f39c12', '#fff') // Caja de la interrogación con color diferente

        // Dibujar flecha inferior
        drawStyledArrow(
            startX + boxWidth / 2, startY + 2 * boxHeight + spacingY + 10,
            startX + spacingX + boxWidth / 2, startY + 2 * boxHeight + spacingY + 10,
            arrowColor, 4
        )
        ctx.font = '16px "Inter", sans-serif'
        ctx.fillStyle = '#7f8c8d'
        ctx.fillText('¿Cuál es el valor?', canvas.width / 2, startY + 2 * boxHeight + spacingY + 30)
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
                await cargarModelo()
            }
        }
        cargarNivel()
    }, [student])

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
                height={300}
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
