'use client'

import { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'
import { useStudent } from '@/lib/hooks/useStudent'
import { createClient } from '@/utils/supabase/client'
import FractionCanvas from './FractionCanvas' // ¡Añade esta línea!
const supabase = createClient()

// --- Tipos de nivel ---
type Nivel = 1 | 2 | 3

interface EstadisticasNivel {
  aciertos: number
  errores: number
  totalPreguntas: number
  consecutiveAciertos: number
  consecutiveErrores: number
}

interface Pregunta {
  operaciones: Array<{
    a: number
    b: number
    operador: string
    denominador: number
  }>
  denominador: number
  contexto: string
}

const frasesCorrecto = ['¡Genial!', '¡Eres un crack!', '🎯 ¡Perfecto!', '🔥 ¡Muy bien!']
const frasesIncorrecto = ['Siguiente pregunta', 'Sigue intentando', 'A la próxima', 'No te rindas 😊']

const obtenerFrase = (tipo: 'ok' | 'fail') => {
  const frases = tipo === 'ok' ? frasesCorrecto : frasesIncorrecto
  return frases[Math.floor(Math.random() * frases.length)]
}

const simplificarFraccion = (numerador: number, denominador: number) => {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
  const divisor = gcd(Math.abs(numerador), Math.abs(denominador))
  return {
    numerador: numerador / divisor,
    denominador: denominador / divisor
  }
}

// --- Generadores de preguntas por nivel ---
const generarPreguntaNivel1 = (): Pregunta => {
  const denominadores = [4, 5, 6, 8]
  const denominador = denominadores[Math.floor(Math.random() * denominadores.length)]

  const a = Math.floor(Math.random() * 9) + 1 // 1 al 9
  const b = Math.floor(Math.random() * 9) + 1 // 1 al 9

  const contextosNivel1 = [
    `María tiene ${a}/${denominador} de una torta y recibe ${b}/${denominador} más. ¿Cuánto tiene ahora?`,
    `Pedro comió ${a}/${denominador} de una pizza y luego ${b}/${denominador} más. ¿Cuánto comió en total?`,
    `Ana coloreó ${a}/${denominador} de un dibujo y después ${b}/${denominador} más. ¿Cuánto coloreó en total?`
  ]

  return {
    operaciones: [{ a, b, operador: '+', denominador }],
    denominador,
    contexto: contextosNivel1[Math.floor(Math.random() * contextosNivel1.length)]
  }
}

const generarPreguntaNivel2 = (): Pregunta => {
  const denominadores = [6, 8, 10, 12, 15, 20]
  const denominador = denominadores[Math.floor(Math.random() * denominadores.length)]

  const a = Math.floor(Math.random() * 40) + 10 // 10 al 49
  const b = Math.floor(Math.random() * 40) + 10
  const c = Math.floor(Math.random() * 40) + 10

  const contextosNivel2 = [
    `Luis tiene ${a}/${denominador} de chocolate, come ${b}/${denominador} y recibe ${c}/${denominador} más. ¿Cuánto chocolate tiene en total?`,
    `En la biblioteca hay ${a}/${denominador} libros, se prestan ${b}/${denominador} y llegan ${c}/${denominador} nuevos. ¿Cuántos libros hay ahora?`,
    `Un tanque tiene ${a}/${denominador} de agua, se usa ${b}/${denominador} y se añade ${c}/${denominador}. ¿Cuánta agua queda?`
  ]

  return {
    operaciones: [
      { a, b, operador: '+', denominador },
      { a: 0, b: c, operador: '+', denominador }
    ],
    denominador,
    contexto: contextosNivel2[Math.floor(Math.random() * contextosNivel2.length)]
  }
}

const generarPreguntaNivel3 = (): Pregunta => {
  const denominadores = [12, 15, 18, 20, 24, 30]
  const denominador = denominadores[Math.floor(Math.random() * denominadores.length)]

  const a = Math.floor(Math.random() * 151) + 50 // 50 al 200
  const b = Math.floor(Math.random() * 151) + 50
  const c = Math.floor(Math.random() * 151) + 50
  const d = Math.floor(Math.random() * 151) + 50

  const contextosNivel3 = [
    `Una empresa tiene ${a}/${denominador} de presupuesto, recibe ${b}/${denominador}, gasta ${c}/${denominador} y recibe ${d}/${denominador} más. ¿Cuánto dinero tiene ahora?`,
    `Un agricultor cosecha ${a}/${denominador} de su campo, planta ${b}/${denominador}, vende ${c}/${denominador} y cosecha ${d}/${denominador} adicional. ¿Cuánto tiene en total?`,
    `Un estudiante completa ${a}/${denominador} de tarea, añade ${b}/${denominador}, entrega ${c}/${denominador} y termina ${d}/${denominador} más. ¿Cuánto ha completado en total?`
  ]

  return {
    operaciones: [
      { a, b, operador: '+', denominador },
      { a: 0, b: c, operador: '+', denominador },
      { a: 0, b: d, operador: '+', denominador }
    ],
    denominador,
    contexto: contextosNivel3[Math.floor(Math.random() * contextosNivel3.length)]
  }
}

const generarPregunta = (nivel: Nivel): Pregunta => {
  switch (nivel) {
    case 1: return generarPreguntaNivel1()
    case 2: return generarPreguntaNivel2()
    case 3: return generarPreguntaNivel3()
  }
}

// --- Función para mostrar el proceso de resolución ---


export function FraccionesHomogeneasGame() {
  const [nivelActual, setNivelActual] = useState<Nivel>(1)
  const [pregunta, setPregunta] = useState<Pregunta | null>(null)
  const [pasoActual, setPasoActual] = useState(0)
  const { student } = useStudent()
  const [respuestas, setRespuestas] = useState<string[]>([])
  const [respuestaFinal, setRespuestaFinal] = useState({ numerador: '', denominador: '' })
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [mostrarAlerta, setMostrarAlerta] = useState(false)
  const [mensajeAlerta, setMensajeAlerta] = useState('')
  const [estadisticas, setEstadisticas] = useState<Record<Nivel, EstadisticasNivel>>({
    1: { aciertos: 0, errores: 0, totalPreguntas: 0, consecutiveAciertos: 0, consecutiveErrores: 0 },
    2: { aciertos: 0, errores: 0, totalPreguntas: 0, consecutiveAciertos: 0, consecutiveErrores: 0 },
    3: { aciertos: 0, errores: 0, totalPreguntas: 0, consecutiveAciertos: 0, consecutiveErrores: 0 }
  })
  const [mostrarRespuestaFinal, setMostrarRespuestaFinal] = useState(false)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const finalNumeradorRef = useRef<HTMLInputElement>(null)
  const finalDenominadorRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!student) return

    const checkOrCreateStudentPeriodo = async () => {
      const { data: existing, error } = await supabase
        .from('student_periodo')
        .select('id')
        .eq('student_id', student.id)
        .eq('tema_periodo_id', "ea5de085-2e52-40ac-b975-8931d08b9e44")
        .maybeSingle()

      if (error) {
        console.error('Error verificando student_periodo al montar:', error)
        return
      }

      if (!existing) {
        const { error: insertError } = await supabase.from('student_periodo').insert({
          student_id: student.id,
          tema_periodo_id: "ea5de085-2e52-40ac-b975-8931d08b9e44",
          nivel: 1
        })
        if (insertError) console.error('Error insertando student_periodo inicial:', insertError)
      }
    }

    checkOrCreateStudentPeriodo()
  }, [student, "ea5de085-2e52-40ac-b975-8931d08b9e44"])

  useEffect(() => {
    siguientePregunta()

    setEstadisticas(prev => {
      if (!prev[nivelActual]) {
        return {
          ...prev,
          [nivelActual]: { aciertos: 0, errores: 0, totalPreguntas: 0, consecutiveAciertos: 0, consecutiveErrores: 0 }
        };
      }
      return prev;
    });

    return () => {
      inputRefs.current = [];
    };
  }, [nivelActual]);

  const upsertStudentPeriodo = async (nivel: Nivel) => {
    if (!student) return

    const { data: existing, error } = await supabase
      .from('student_periodo')
      .select('id')
      .eq('student_id', student.id)
      .eq('tema_periodo_id', "ea5de085-2e52-40ac-b975-8931d08b9e44")
      .maybeSingle()

    if (error) {
      console.error('Error buscando student_periodo:', error)
      return
    }

    if (existing) {
      await supabase
        .from('student_periodo')
        .update({ nivel })
        .eq('id', existing.id)
    } else {
      await supabase.from('student_periodo').insert({
        student_id: student.id,
        tema_periodo_id: "ea5de085-2e52-40ac-b975-8931d08b9e44",
        nivel
      })
    }
  }

  const mostrarNotificacion = (mensaje: string) => {
    setMensajeAlerta(mensaje)
    setMostrarAlerta(true)
    const timer = setTimeout(() => setMostrarAlerta(false), 3000)
    return () => clearTimeout(timer)
  }

  const calcularResultadoPaso = (pasoIndex: number): number => {
    if (!pregunta) return 0

    let resultado = 0
    if (pasoIndex === 0) {
      resultado = pregunta.operaciones[0].a + pregunta.operaciones[0].b;
    } else {
      resultado = calcularResultadoPaso(pasoIndex - 1);
      const currentOperation = pregunta.operaciones[pasoIndex];
      if (currentOperation.operador === '+') {
        resultado += currentOperation.b;
      } else if (currentOperation.operador === '-') {
        resultado -= currentOperation.b;
      }
    }
    return resultado
  }

  const verificarPaso = (pasoIndex: number) => {
    if (!pregunta) return

    const respuestaUsuario = respuestas[pasoIndex]
    if (!respuestaUsuario) {
      mostrarNotificacion('¡Completa el numerador!')
      return
    }

    const resultadoEsperado = calcularResultadoPaso(pasoIndex)
    const userAnswer = parseInt(respuestaUsuario)

    if (userAnswer === resultadoEsperado) {
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } })

      if (pasoIndex < pregunta.operaciones.length - 1) {
        setPasoActual(pasoIndex + 1)
        setTimeout(() => {
          const nextInput = inputRefs.current[pasoIndex + 1]
          if (nextInput) nextInput.focus()
        }, 100)
      } else {
        setMostrarRespuestaFinal(true)
        setTimeout(() => finalNumeradorRef.current?.focus(), 100)
      }
    } else {
      // Retroalimentación pedagógica
      setMensaje("¡Recuerda! Para sumar fracciones con el mismo denominador, solo sumamos los numeradores y mantenemos el denominador.")
      actualizarEstadisticas(false, false) // Pass false for isLevelChange
      setTimeout(() => {
        siguientePregunta() // Generate next question without level change
      }, 2000)
    }
  }

  const verificarFinal = () => {
    if (!pregunta) return

    if (!respuestaFinal.numerador || !respuestaFinal.denominador) {
      mostrarNotificacion('¡Completa numerador y denominador!')
      return
    }

    const resultadoFinal = calcularResultadoPaso(pregunta.operaciones.length - 1)
    const fraccionSimplificada = simplificarFraccion(resultadoFinal, pregunta.denominador)

    const userNumerador = parseInt(respuestaFinal.numerador)
    const userDenominador = parseInt(respuestaFinal.denominador)
    const userSimplificada = simplificarFraccion(userNumerador, userDenominador)

    const esCorrecta = userSimplificada.numerador === fraccionSimplificada.numerador &&
      userSimplificada.denominador === fraccionSimplificada.denominador

    if (esCorrecta) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
      setMensaje("¡Excelente! Has simplificado correctamente la fracción.")
      actualizarEstadisticas(true, true) // Pass true for isLevelChange
    } else {
      setMensaje("Recuerda que al simplificar una fracción debes dividir el numerador y denominador por su máximo común divisor.")
      actualizarEstadisticas(false, true) // Pass true for isLevelChange
    }
  }

  const actualizarEstadisticas = (acierto: boolean, isFinalCheck: boolean) => {
    setEstadisticas(prev => {
      const currentLevelStats = prev[nivelActual] || { aciertos: 0, errores: 0, totalPreguntas: 0, consecutiveAciertos: 0, consecutiveErrores: 0 };

      // Calcular las nuevas estadísticas incluyendo los contadores consecutivos
      const nuevasEstadisticasNivelActual = {
        ...currentLevelStats,
        aciertos: currentLevelStats.aciertos + (acierto ? 1 : 0),
        errores: currentLevelStats.errores + (acierto ? 0 : 1),
        consecutiveAciertos: acierto ? currentLevelStats.consecutiveAciertos + 1 : 0,
        consecutiveErrores: acierto ? 0 : currentLevelStats.consecutiveErrores + 1
      };

      const nuevasEstadisticasGlobal = {
        ...prev,
        [nivelActual]: nuevasEstadisticasNivelActual
      };

      let levelChangeOccurred = false;
      let newLevel: Nivel | null = null;

      // Lógica de cambio de nivel (subir o bajar) - SOLO si es la verificación final

      if (acierto) {
        // Lógica para SUBIR de nivel
        if (nuevasEstadisticasNivelActual.consecutiveAciertos >= 3 && nivelActual < 3) {
          newLevel = (nivelActual + 1) as Nivel;
          mostrarNotificacion(`¡Felicidades! Subes al Nivel ${newLevel}.`);
          levelChangeOccurred = true;
        }
      } else {
        // Lógica para BAJAR de nivel
        if (nuevasEstadisticasNivelActual.consecutiveErrores >= 3 && nivelActual > 1) {
          newLevel = (nivelActual - 1) as Nivel;
          mostrarNotificacion(`¡A practicar! Bajas al Nivel ${newLevel}.`);
          levelChangeOccurred = true;
        }
      }

      if (levelChangeOccurred && newLevel !== null) {
        // MUY IMPORTANTE: SOLO LLAMAR setNivelActual AQUÍ.
        // El useEffect que depende de nivelActual se encargará del resto (nueva pregunta, reset de estado).
        setTimeout(() => {
          setNivelActual(newLevel as Nivel);
          upsertStudentPeriodo(newLevel as Nivel)
          // Reiniciar las estadísticas consecutivas del NUEVO nivel al que se pasó.
          // Esto se hace en un nuevo setEstadisticas para asegurar que el estado se actualice correctamente.
          setEstadisticas(prevStats => ({
            ...prevStats,
            [newLevel as Nivel]: {
              ...prevStats[newLevel as Nivel] || { aciertos: 0, errores: 0, totalPreguntas: 0 },
              consecutiveAciertos: 0,
              consecutiveErrores: 0
            }
          }));
        }, 1500); // Pequeño retraso para que la notificación sea visible

        // Reinicia las estadísticas consecutivas del nivel SALIENTE (el que acaba de dejar)
        return {
          ...nuevasEstadisticasGlobal,
          [nivelActual]: {
            ...nuevasEstadisticasNivelActual,
            consecutiveAciertos: 0,
            consecutiveErrores: 0
          }
        };
      } else if (isFinalCheck) {
        // Si no hubo cambio de nivel pero es la verificación final, solo pasa a la siguiente pregunta
        setTimeout(() => {
          siguientePregunta(); // Esta llamada es solo para cuando NO HAY CAMBIO DE NIVEL
        }, 2500);
      } else if (!acierto && !isFinalCheck) { // Si es un fallo en un paso intermedio
        // Si falló un paso intermedio, reinicia la pregunta actual SIN CAMBIAR DE NIVEL
        // y sin esperar un setTimeout largo.
        setTimeout(() => {
          siguientePregunta();
        }, 2000); // Dar tiempo para ver el mensaje de error
      }

      // En cualquier otro caso (paso intermedio correcto), simplemente devuelve las estadísticas actualizadas.
      // La lógica de verificarPaso se encarga de avanzar al siguiente paso o mostrar la respuesta final.
      return nuevasEstadisticasGlobal;
    });
  };
  const mostrarProceso = (operacion: any, pasoIndex: number) => {
  let proceso = '';

  if (pasoIndex === 0) {
    proceso = `Para resolver esta fracción, primero debes entender que estás sumando ${operacion.a}/${operacion.denominador} y ${operacion.b}/${operacion.denominador}. Ya que tienen el mismo denominador, solo sumas los numeradores.`;
  } else {
    const resultadoAnterior = calcularResultadoPaso(pasoIndex - 1);
    proceso = `Ahora que tienes ${resultadoAnterior}/${operacion.denominador}, sumamos ${operacion.b}/${operacion.denominador}. El denominador sigue siendo el mismo, así que solo sumamos los numeradores.`;
  }

  return proceso;
}

  const siguientePregunta = () => {
    // Esta función ahora será el punto central para reiniciar una pregunta
    // para el nivel actual.
    setMensaje(null);
    setPregunta(generarPregunta(nivelActual)); // Asegurarse de usar el nivelActual
    setPasoActual(0);
    setRespuestas([]);
    setRespuestaFinal({ numerador: '', denominador: '' });
    setMostrarRespuestaFinal(false);
  };

  const actualizarRespuesta = (pasoIndex: number, valor: string) => {
    const nuevasRespuestas = [...respuestas]
    nuevasRespuestas[pasoIndex] = valor
    setRespuestas(nuevasRespuestas)
  }

  if (!pregunta) return null

  const renderPaso = (pasoIndex: number) => {
    const operacion = pregunta.operaciones[pasoIndex]
    const esVisible = pasoIndex <= pasoActual
    const estaCompletado = pasoIndex < pasoActual

    if (!esVisible) return null

    let operacionTexto = ''
    let numeradorParaCanvas1 = 0;
    let numeradorParaCanvas2 = 0;

    if (pasoIndex === 0) {
      operacionTexto = `${operacion.a}/${pregunta.denominador} ${operacion.operador} ${operacion.b}/${pregunta.denominador} =`
      numeradorParaCanvas1 = operacion.a;
      numeradorParaCanvas2 = operacion.b;
    } else {
      const resultadoAnterior = calcularResultadoPaso(pasoIndex - 1)
      operacionTexto = `${resultadoAnterior}/${pregunta.denominador} ${operacion.operador} ${operacion.b}/${pregunta.denominador} =`
      numeradorParaCanvas1 = resultadoAnterior;
      numeradorParaCanvas2 = operacion.b;
    }

    return (
      <motion.div
        key={pasoIndex}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`bg-white rounded-lg p-4 border-2 ${estaCompletado ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
      >
        <h3 className={`text-sm font-bold mb-2 text-center rounded px-2 py-1 ${estaCompletado ? 'bg-green-200' : 'bg-yellow-200'}`}>
          {pasoIndex + 1}° operación
        </h3>

        {/* Mostrar proceso de resolución */}
        <div className="text-center mb-4 text-sm text-gray-600">
          {mostrarProceso(operacion, pasoIndex)}
        </div>

        {/* --- INICIO: Nuevo bloque para la visualización del Canvas --- */}
        <div className="flex flex-col items-center justify-center mb-4">
          <div className="flex items-center gap-4">
            {/* Primera fracción para el canvas */}
            <FractionCanvas numerador={numeradorParaCanvas1} denominador={pregunta.denominador} />
            {/* Operador */}
            <span className="text-3xl font-bold text-gray-800">{operacion.operador}</span>
            {/* Segunda fracción para el canvas */}
            <FractionCanvas numerador={numeradorParaCanvas2} denominador={pregunta.denominador} />
          </div>
        </div>
        {/* --- FIN: Nuevo bloque para la visualización del Canvas --- */}

        <div className="mb-4 text-center font-semibold text-gray-700 text-lg">
          {operacionTexto}
        </div>

        <div className="flex items-center justify-center mb-4">
          <div className="flex flex-col items-center">
            <input
              ref={el => { inputRefs.current[pasoIndex] = el }}
              value={respuestas[pasoIndex] || ''}
              onChange={(e) => actualizarRespuesta(pasoIndex, e.target.value)}
              className="border-b-2 border-gray-300 bg-gray-200 rounded-sm text-center p-1 w-16 text-xl focus:border-blue-500 focus:outline-none bg-white font-bold"
              maxLength={3}
              disabled={estaCompletado}
              placeholder="?"
              type="number" // Asegura que solo se ingresen números
            />
            {/* La línea de la fracción */}
            <div className="w-16 h-1 bg-gray-400 my-1"></div> {/* Ajustado my-1 para un espacio más natural */}
            <div className="text-xl font-bold text-gray-700">{pregunta.denominador}</div>
          </div>
        </div>

        {!estaCompletado && (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => verificarPaso(pasoIndex)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition text-sm"
            >
              Verificar
            </button>
          </div>
        )}

        {estaCompletado && (
          <div className="flex justify-center">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">✓</span>
            </div>
          </div>
        )}
      </motion.div>
    )
  }

  const currentStats = estadisticas[nivelActual] || { aciertos: 0, errores: 0, totalPreguntas: 0, consecutiveAciertos: 0, consecutiveErrores: 0 };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl shadow-xl max-w-4xl mx-auto space-y-6">
      <AnimatePresence>
        {mostrarAlerta && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="bg-yellow-500 text-white px-6 py-3 rounded-lg shadow-lg font-semibold flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              {mensajeAlerta}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-lg p-4 shadow-md">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <span className="font-bold text-lg text-purple-600">Nivel {nivelActual}</span>
          </div>
          <div className="text-sm text-gray-600">
            ✅ {currentStats.aciertos} | ❌ {currentStats.errores}
          </div>
        </div>

        <div className="text-center bg-gray-100 rounded p-2">
          <p className="text-sm font-medium">
            {nivelActual === 1 && "Operaciones simples - Números hasta 9"}
            {nivelActual === 2 && "Dos operaciones - Números hasta 50"}
            {nivelActual === 3 && "Tres operaciones - Números hasta 100"}
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center bg-white rounded-lg p-4 shadow-md"
      >
        <h2 className="text-lg font-bold text-gray-800">
          📝 {pregunta.contexto}. ¿Cuánto queda en total?
        </h2>
      </motion.div>

      <div className="grid gap-4">
        {pregunta.operaciones.map((_, index) => renderPaso(index))}
      </div>

      {mostrarRespuestaFinal && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg p-6 shadow-lg border-2 border-purple-200"
        >
          <h3 className="text-center font-bold mb-4 text-gray-700">
            Respuesta final (simplificada):
          </h3>

          {/* --- INICIO: Nuevo bloque para la visualización del Canvas de la respuesta final --- */}
          <div className="flex justify-center mb-4">
            <FractionCanvas
              numerador={parseInt(respuestaFinal.numerador) || 0} // Asegúrate de que sea un número
              denominador={parseInt(respuestaFinal.denominador) || pregunta.denominador} // Usar el denominador de la pregunta si no se ha ingresado
            />
          </div>
          {/* --- FIN: Nuevo bloque para la visualización del Canvas de la respuesta final --- */}

          <div className="flex items-center justify-center mb-4">
            <div className="flex flex-col items-center">
              {/* Numerador */}
              <input
                ref={finalNumeradorRef}
                type="number"
                value={respuestaFinal.numerador}
                onChange={(e) => setRespuestaFinal(prev => ({ ...prev, numerador: e.target.value }))}
                placeholder="?"
                className="w-20 p-2 border-b-2 border-purple-300 text-center font-bold text-2xl focus:border-purple-500 focus:outline-none bg-white"
              />
              {/* La línea de la fracción */}
              <div className="w-20 h-1 bg-purple-400 my-1.5"></div>
              {/* Denominador */}
              <input
                ref={finalDenominadorRef}
                type="number"
                value={respuestaFinal.denominador}
                onChange={(e) => setRespuestaFinal(prev => ({ ...prev, denominador: e.target.value }))}
                placeholder="?"
                className="w-20 p-2 border-t-2 border-purple-300 text-center font-bold text-2xl focus:border-purple-500 focus:outline-none bg-white"
              />
            </div>
          </div>

          <button
            onClick={verificarFinal}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg transform hover:scale-105"
          >
            ✨ Verificar Respuesta Final ✨
          </button>
        </motion.div>
      )}

      <AnimatePresence>
        {mensaje && (
          <motion.div
            key={mensaje}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className={`text-center p-6 rounded-xl font-bold text-xl shadow-lg ${mensaje.includes('¡')
              ? 'bg-gradient-to-r from-green-400 to-green-500 text-white'
              : 'bg-gradient-to-r from-red-400 to-red-500 text-white'
              }`}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5 }}
            >
              {mensaje}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
